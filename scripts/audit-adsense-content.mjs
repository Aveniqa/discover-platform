#!/usr/bin/env node
/**
 * Read-only content quality audit for AdSense review prep.
 *
 * Checks:
 *   - thin item bodies across active data files and archive.json
 *   - exact duplicate body copy
 *   - missing outbound/source URLs
 *   - low-quality source domains that should be replaced before review
 *
 * Usage:
 *   node scripts/audit-adsense-content.mjs
 *   node scripts/audit-adsense-content.mjs --strict
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const STRICT = process.argv.includes("--strict");

const FILES = [
  "discoveries.json",
  "products.json",
  "hidden-gems.json",
  "future-radar.json",
  "daily-tools.json",
  "archive.json",
];

const LOW_QUALITY_DOMAINS = ["wikipedia.org", "wikihow.com"];
const THIN_WORDS = 100;
const REVIEW_WORDS = 150;

function readJson(file) {
  return JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
}

function titleOf(item) {
  return item.title || item.name || item.techName || item.toolName || "";
}

function descriptionOf(item) {
  return item.shortDescription || item.whatItDoes || item.explanation || "";
}

function whyOf(item) {
  return item.whyItIsInteresting || item.whyItIsUseful || item.whyItMatters || "";
}

function sourceOf(item) {
  return item.sourceLink || item.websiteLink || item.directAmazonUrl || item.affiliate?.url || "";
}

function wordCount(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function bodyOf(item) {
  return [descriptionOf(item), whyOf(item)].filter(Boolean).join(" ");
}

function normalizedBody(item) {
  return bodyOf(item).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sourceHost(item) {
  const source = sourceOf(item);
  if (!source) return "";
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const rows = [];
for (const file of FILES) {
  const items = readJson(file);
  for (const item of items) {
    rows.push({
      file,
      type: item.type,
      slug: item.slug,
      title: titleOf(item),
      words: wordCount(bodyOf(item)),
      hasSource: Boolean(sourceOf(item)),
      sourceHost: sourceHost(item),
      bodyKey: normalizedBody(item),
    });
  }
}

const byFile = new Map();
for (const row of rows) {
  if (!byFile.has(row.file)) byFile.set(row.file, []);
  byFile.get(row.file).push(row);
}

console.log("\nAdSense content audit\n");
for (const [file, fileRows] of byFile) {
  const sorted = [...fileRows].sort((a, b) => a.words - b.words);
  const avg = sorted.reduce((sum, row) => sum + row.words, 0) / sorted.length;
  const pct = (n) => sorted[Math.floor((sorted.length - 1) * n)]?.words ?? 0;
  console.log(`${file}`);
  console.log(`  items: ${fileRows.length}`);
  console.log(`  words: min ${sorted[0]?.words ?? 0}, p25 ${pct(0.25)}, median ${pct(0.5)}, p75 ${pct(0.75)}, max ${sorted.at(-1)?.words ?? 0}, avg ${avg.toFixed(1)}`);
  console.log(`  under ${THIN_WORDS} words: ${fileRows.filter((row) => row.words < THIN_WORDS).length}`);
  console.log(`  under ${REVIEW_WORDS} words: ${fileRows.filter((row) => row.words < REVIEW_WORDS).length}`);
  console.log(`  missing outbound/source URL: ${fileRows.filter((row) => !row.hasSource).length}\n`);
}

const bodyGroups = new Map();
for (const row of rows) {
  if (!row.bodyKey) continue;
  if (!bodyGroups.has(row.bodyKey)) bodyGroups.set(row.bodyKey, []);
  bodyGroups.get(row.bodyKey).push(row);
}
const duplicateGroups = [...bodyGroups.values()].filter((group) => group.length > 1);
const lowQuality = rows.filter((row) =>
  LOW_QUALITY_DOMAINS.some((domain) => row.sourceHost.endsWith(domain))
);
const thin = rows.filter((row) => row.words < THIN_WORDS);
const needsReview = rows.filter((row) => row.words < REVIEW_WORDS);
const missingSource = rows.filter((row) => !row.hasSource);

console.log("Summary");
console.log(`  total item URLs: ${rows.length}`);
console.log(`  thin item bodies (<${THIN_WORDS} words): ${thin.length}`);
console.log(`  review item bodies (<${REVIEW_WORDS} words): ${needsReview.length}`);
console.log(`  exact duplicate body groups: ${duplicateGroups.length}`);
console.log(`  missing outbound/source URLs: ${missingSource.length}`);
console.log(`  low-quality source URLs: ${lowQuality.length}`);

if (thin.length > 0) {
  console.log("\nShortest items");
  for (const row of thin.sort((a, b) => a.words - b.words).slice(0, 15)) {
    console.log(`  ${row.words}w  ${row.file}  ${row.slug}  ${row.title}`);
  }
}

if (duplicateGroups.length > 0) {
  console.log("\nDuplicate body groups");
  for (const group of duplicateGroups.slice(0, 10)) {
    console.log(`  ${group.map((row) => `${row.file}:${row.slug}`).join(" | ")}`);
  }
}

if (lowQuality.length > 0) {
  console.log("\nLow-quality sources");
  for (const row of lowQuality.slice(0, 15)) {
    console.log(`  ${row.file}  ${row.slug}  ${row.sourceHost}`);
  }
}

if (STRICT && (needsReview.length > 0 || duplicateGroups.length > 0 || lowQuality.length > 0)) {
  console.log("\nStrict audit failed.");
  if (needsReview.length > 0) {
    console.log(`  ${needsReview.length} item page(s) are below the ${REVIEW_WORDS}-word review threshold.`);
  }
  if (duplicateGroups.length > 0) {
    console.log(`  ${duplicateGroups.length} exact duplicate body group(s) found.`);
  }
  if (lowQuality.length > 0) {
    console.log(`  ${lowQuality.length} low-quality source URL(s) found.`);
  }
  process.exit(1);
}

console.log("\nRecommended next steps:");
console.log("  1. Enrich all thin pages: GEMINI_API_KEY=... node scripts/enrich-existing-items.js");
console.log("  2. Replace weak sources: GEMINI_API_KEY=... node scripts/retrofit-sources.mjs --dry");
console.log("  3. Re-run this audit with --strict before requesting AdSense review.\n");
