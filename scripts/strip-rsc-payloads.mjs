#!/usr/bin/env node
/**
 * Strip only bulky or legacy Next.js 16 RSC payloads from `out/` after build.
 *
 * Next 16 emits 7 `__next.*.txt` files per static-exported route — used by
 * Cache Components / Partial Prerendering for instant client-side route
 * transitions. For a fully-static Cloudflare Pages export with 2,700+ pages,
 * this multiplies into ~19,000 sidecar files and pushes us past the CF Pages
 * 20,000-files-per-deployment hard cap.
 *
 * Keep:
 *   - every `__next.*.txt` sidecar except `__next._full.txt`
 *   - this preserves `_tree`, `_index`, `_head`, route, and `__PAGE__`
 *     payloads that the Next client requests during hover/intersection
 * Remove:
 *   - `__next._full.txt` sidecars, which are not requested in observed traces
 *   - legacy flat `/item/<slug>.txt` payloads
 *
 * 404ing the kept sidecars logs browser console errors and drags Lighthouse
 * Best Practices. Removing the denied payloads keeps the Cloudflare Pages
 * deploy under the 20,000-file cap.
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
const FULL_SIDECAR = "__next._full.txt";
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
      // Remove the directory if it's now empty
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
      (entry.name === FULL_SIDECAR || ITEM_FLAT_PAYLOAD.test(full))
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
  `${DRY ? "[dry] would remove" : "Removed"} ${removed} static-export payload file(s) (${mb} MB), ${dirsCleaned} now-empty dir(s)`
);
