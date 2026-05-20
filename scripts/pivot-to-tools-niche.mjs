#!/usr/bin/env node
/**
 * ONE-TIME PIVOT: Surfaced becomes a tools/gems publication.
 *
 * Moves every item in discoveries.json, products.json, and future-radar.json
 * into archive.json with archivedAt = today. Empties the source files. Per
 * project rule, archived items keep their /item/<slug> URLs alive — they just
 * leave navigation and listing pages.
 *
 * Idempotent: re-running it is a no-op once the three files are empty.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DATA = join(__dirname, "..", "data");
const TODAY = new Date().toISOString().slice(0, 10);

const SOURCES = ["discoveries.json", "products.json", "future-radar.json"];

const read = (f) => JSON.parse(readFileSync(join(DATA, f), "utf8"));
const write = (f, v) => writeFileSync(join(DATA, f), JSON.stringify(v, null, 2) + "\n");

const archive = read("archive.json");
const archiveSlugs = new Set(archive.map((i) => i.slug));

let moved = 0;
for (const file of SOURCES) {
  const items = read(file);
  for (const item of items) {
    if (archiveSlugs.has(item.slug)) continue;
    archive.push({ ...item, archivedAt: TODAY });
    archiveSlugs.add(item.slug);
    moved += 1;
  }
  write(file, []);
  console.log(`emptied ${file} (${items.length} items)`);
}

write("archive.json", archive);
console.log(`\narchive.json now contains ${archive.length} items (+${moved} from pivot)`);

// Trim categories.json down to the live niche
const categories = read("categories.json").filter(
  (c) => c.key === "hidden-gems" || c.key === "daily-tools"
);
write("categories.json", categories);
console.log(`categories.json trimmed to ${categories.map((c) => c.key).join(", ")}`);
