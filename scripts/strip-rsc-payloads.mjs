#!/usr/bin/env node
/**
 * Aggressively strip Next.js 16 RSC payload sidecars from `out/` after build.
 *
 * Background: Next 16 emits ~6 `__next.*.txt` files per static-exported route
 * (Cache Components / Partial Prerendering hydration payloads). At our catalog
 * size — 3,038 item pages + ~30 listing/static pages — those sidecars multiply
 * into ~20,000+ files. Cloudflare Pages has a hard 20,000-files-per-deployment
 * cap, so left untouched the deploy fails with no useful error.
 *
 * Strategy: strip every `__next.*.txt` sidecar and the legacy flat
 * `/item/<slug>.txt` payloads. The static-exported `.html` files still serve
 * every route correctly via full-page navigation. The visible trade-off is
 * that client-side route prefetch falls back to full reload — which is fine
 * for Surfaced because our `Link` usage already opts out of prefetch on
 * heavy-list pages (`prefetch={false}`) and full-page nav is acceptable for
 * the magazine reading model.
 *
 * Console errors from Next trying to fetch the sidecars are suppressed by
 * the `404` mapping in `public/_redirects` (the missing payloads return 200
 * empty bodies during dev, 404 in production — both are non-fatal).
 *
 * Keep:
 *   - All `.html` files (the actual pages crawlers and users hit)
 *   - All `_next/static/*` chunks (JS/CSS, content-hashed)
 *   - All `images/*`, `_headers`, `_redirects`, `ads.txt`, `robots.txt`,
 *     `sitemap.xml`, `feed.xml`, `search-index.json`, etc.
 * Remove:
 *   - Every `__next.*.txt` RSC sidecar in any directory
 *   - Legacy flat `/item/<slug>.txt` payloads
 *
 * Idempotent. Runs as the second half of `npm run postbuild`.
 *
 * Usage:
 *   node scripts/strip-rsc-payloads.mjs        # apply
 *   node scripts/strip-rsc-payloads.mjs --dry  # report only
 */
import { readdirSync, statSync, rmSync, rmdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "out";
const DRY = process.argv.includes("--dry");
const RSC_SIDECAR = /^__next\..*\.txt$/;
const ITEM_FLAT_PAYLOAD = /^out\/item\/[^/]+\.txt$/;

let removed = 0;
let removedBytes = 0;
let dirsCleaned = 0;

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      try {
        if (readdirSync(full).length === 0) {
          if (DRY) {
            console.log(`  rmdir ${full}`);
          } else {
            rmdirSync(full);
          }
          dirsCleaned++;
        }
      } catch {
        /* ignore */
      }
    } else if (
      entry.isFile() &&
      (RSC_SIDECAR.test(entry.name) || ITEM_FLAT_PAYLOAD.test(full))
    ) {
      try {
        const size = statSync(full).size;
        if (DRY) {
          console.log(`  rm ${full} (${size} bytes)`);
        } else {
          rmSync(full);
        }
        removed++;
        removedBytes += size;
      } catch {
        /* ignore */
      }
    }
  }
}

walk(ROOT);

const mb = (removedBytes / 1024 / 1024).toFixed(1);
console.log(
  `${DRY ? "[dry] would remove" : "Removed"} ${removed} RSC-sidecar file(s) (${mb} MB), ${dirsCleaned} now-empty dir(s)`
);
