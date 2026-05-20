#!/usr/bin/env node
/**
 * AdSense compliance fix: move every live-niche item that lacks a verifiable
 * outbound source into archive.json. Archived items keep their /item/<slug>
 * URLs for SEO but stop appearing in nav, listing pages, search results, the
 * homepage, and the AdSense-eligible surfaces.
 *
 * Rationale: Google AdSense reviewers downgrade sites whose featured items
 * link to nowhere — it reads as "thin affiliate / scraped content." Keeping
 * unverified items in the live catalog is a higher risk than shrinking the
 * catalog by ~50 entries.
 *
 * Idempotent — safe to re-run after re-enriching items.
 *
 * Usage:
 *   node scripts/archive-missing-sources.mjs --dry
 *   node scripts/archive-missing-sources.mjs --apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DATA = join(__dirname, "..", "data");
const APPLY = process.argv.includes("--apply");
const TODAY = new Date().toISOString().slice(0, 10);

const FILES = [
  { path: "hidden-gems.json", linkField: "websiteLink" },
  { path: "daily-tools.json", linkField: "websiteLink" },
];

const read = (f) => JSON.parse(readFileSync(join(DATA, f), "utf8"));
const write = (f, v) => writeFileSync(join(DATA, f), JSON.stringify(v, null, 2) + "\n");

function isMissingLink(value) {
  if (value == null) return true;
  if (typeof value !== "string") return true;
  if (value.trim().length === 0) return true;
  if (!/^https?:\/\//.test(value.trim())) return true;
  return false;
}

const archive = read("archive.json");
const archiveSlugs = new Set(archive.map((i) => i.slug));

let moved = 0;
const movedSlugs = [];

for (const file of FILES) {
  const items = read(file.path);
  const live = [];
  for (const item of items) {
    if (isMissingLink(item[file.linkField])) {
      if (!archiveSlugs.has(item.slug)) {
        archive.push({ ...item, archivedAt: TODAY, archiveReason: "missing-source" });
        archiveSlugs.add(item.slug);
      }
      movedSlugs.push(item.slug);
      moved += 1;
      continue;
    }
    live.push(item);
  }
  console.log(`${file.path}: ${items.length} → ${live.length}  (archived ${items.length - live.length})`);
  if (APPLY) write(file.path, live);
}

if (APPLY) {
  write("archive.json", archive);
  console.log(`\narchive.json now has ${archive.length} items (+${moved} from this pass)`);
} else {
  console.log(`\n[dry] would archive ${moved} items:`);
  movedSlugs.slice(0, 10).forEach((s) => console.log(`  - ${s}`));
  if (movedSlugs.length > 10) console.log(`  ... and ${movedSlugs.length - 10} more`);
}
