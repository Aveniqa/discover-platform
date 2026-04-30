#!/usr/bin/env node
/**
 * Strip Next.js 16 RSC tree-payload sidecars from `out/` after build.
 *
 * Next 16 emits 7 `__next.*.txt` files per static-exported route — used by
 * Cache Components / Partial Prerendering for instant client-side route
 * transitions. For a fully-static Cloudflare Pages export with 2,700+ pages,
 * this multiplies into ~19,000 sidecar files and pushes us past the CF Pages
 * 20,000-files-per-deployment hard cap.
 *
 * The flat `<slug>.txt` RSC payloads (one per route, ~2,700 files) are kept —
 * those still power same-tab Link navigations. The `__next.*.txt` payloads
 * inside per-route subdirectories are redundant for our case (no PPR, no SSR,
 * no streaming) and safe to remove.
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
const PATTERN = /^__next\..*\.txt$/;

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
    } else if (entry.isFile() && PATTERN.test(entry.name)) {
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
  `${DRY ? "[dry] would remove" : "Removed"} ${removed} __next.*.txt sidecar(s) (${mb} MB), ${dirsCleaned} now-empty dir(s)`
);
