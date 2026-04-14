#!/usr/bin/env node
/**
 * Generate a static RSS feed (feed.xml) from all items.
 * Run before `next build` so the file is included in the static export.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Load all data files
const discoveries = JSON.parse(readFileSync(join(root, "data/discoveries.json"), "utf-8"));
const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf-8"));
const hiddenGems = JSON.parse(readFileSync(join(root, "data/hidden-gems.json"), "utf-8"));
const futureRadar = JSON.parse(readFileSync(join(root, "data/future-radar.json"), "utf-8"));
const dailyTools = JSON.parse(readFileSync(join(root, "data/daily-tools.json"), "utf-8"));

const SITE_URL = "https://surfaced-x.pages.dev";

function getTitle(item) {
  return item.title || item.name || "Untitled";
}

function getDescription(item) {
  return item.shortDescription || item.description || "";
}

function getCategoryLabel(type) {
  const map = {
    discovery: "Discoveries",
    product: "Trending Products",
    "hidden-gem": "Hidden Gems",
    "future-tech": "Future Radar",
    tool: "Daily Tools",
  };
  return map[type] || "Surfaced";
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Tag each item with its type
const allItems = [
  ...discoveries.map((i) => ({ ...i, type: "discovery" })),
  ...products.map((i) => ({ ...i, type: "product" })),
  ...hiddenGems.map((i) => ({ ...i, type: "hidden-gem" })),
  ...futureRadar.map((i) => ({ ...i, type: "future-tech" })),
  ...dailyTools.map((i) => ({ ...i, type: "tool" })),
];

// Sort by id descending (newest first), take latest 50
const sorted = allItems.sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 50);

const now = new Date().toUTCString();

const rssItems = sorted
  .map((item) => {
    const title = escapeXml(getTitle(item));
    const desc = escapeXml(getDescription(item));
    const link = `${SITE_URL}/item/${item.slug}`;
    const category = escapeXml(getCategoryLabel(item.type));
    return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${desc}</description>
      <category>${category}</category>
    </item>`;
  })
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Surfaced — Discover What's Next</title>
    <link>${SITE_URL}</link>
    <description>Fresh discoveries, trending products, hidden gems, future tech, and daily tools — curated every day.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;

// Write to public/ so Next.js static export includes it
const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, "feed.xml"), rss, "utf-8");

console.log(`✅ Generated feed.xml with ${sorted.length} items`);
