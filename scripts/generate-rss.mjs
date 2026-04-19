#!/usr/bin/env node
/**
 * Generate static RSS feeds from all items.
 * Produces:
 *   public/feed.xml                  — combined (latest 50 across all types)
 *   public/feeds/discoveries.xml     — 50 latest discoveries
 *   public/feeds/products.xml        — 50 latest products
 *   public/feeds/hidden-gems.xml     — 50 latest hidden gems
 *   public/feeds/future-radar.xml    — 50 latest future-tech items
 *   public/feeds/daily-tools.xml     — 50 latest tools
 *
 * Run before `next build` so files are included in the static export.
 */
import { readFileSync, mkdirSync } from "fs";
import { writeFileSafe } from "./lib/write-safe.mjs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const discoveries = JSON.parse(readFileSync(join(root, "data/discoveries.json"), "utf-8"));
const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf-8"));
const hiddenGems = JSON.parse(readFileSync(join(root, "data/hidden-gems.json"), "utf-8"));
const futureRadar = JSON.parse(readFileSync(join(root, "data/future-radar.json"), "utf-8"));
const dailyTools = JSON.parse(readFileSync(join(root, "data/daily-tools.json"), "utf-8"));

const SITE_URL = "https://surfaced-x.pages.dev";

function getTitle(item) {
  return item.title || item.name || item.techName || item.toolName || "Untitled";
}

function getDescription(item) {
  return item.shortDescription || item.description ||
         item.explanation || item.whatItDoes || item.whyItMatters || "";
}

function getCategoryLabel(type) {
  return {
    discovery: "Discoveries",
    product: "Trending Products",
    "hidden-gem": "Hidden Gems",
    "future-tech": "Future Radar",
    tool: "Daily Tools",
  }[type] || "Surfaced";
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderItem(item) {
  const title = escapeXml(getTitle(item));
  const desc = escapeXml(getDescription(item));
  const link = `${SITE_URL}/item/${item.slug}`;
  const category = escapeXml(getCategoryLabel(item.type));
  const pubDate = item.dateAdded
    ? new Date(item.dateAdded).toUTCString()
    : new Date().toUTCString();
  return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${desc}</description>
      <category>${category}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
}

function buildFeed({ title, description, selfPath, items }) {
  const now = new Date().toUTCString();
  const body = items.map(renderItem).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}${selfPath}" rel="self" type="application/rss+xml" />
${body}
  </channel>
</rss>`;
}

function sortByIdDesc(arr) {
  return arr.slice().sort((a, b) => (b.id || 0) - (a.id || 0));
}

const publicDir = join(root, "public");
const feedsDir = join(publicDir, "feeds");
mkdirSync(feedsDir, { recursive: true });

// Per-category feeds
const categoryFeeds = [
  {
    type: "discovery",
    items: discoveries,
    file: "discoveries.xml",
    title: "Surfaced — Discoveries",
    description: "Fascinating facts, science, and curious findings — updated daily.",
  },
  {
    type: "product",
    items: products,
    file: "products.xml",
    title: "Surfaced — Trending Products",
    description: "Consumer products worth knowing about — updated daily.",
  },
  {
    type: "hidden-gem",
    items: hiddenGems,
    file: "hidden-gems.xml",
    title: "Surfaced — Hidden Gems",
    description: "Lesser-known web tools and sites — updated daily.",
  },
  {
    type: "future-tech",
    items: futureRadar,
    file: "future-radar.xml",
    title: "Surfaced — Future Radar",
    description: "Emerging technologies shaping what's next — updated daily.",
  },
  {
    type: "tool",
    items: dailyTools,
    file: "daily-tools.xml",
    title: "Surfaced — Daily Tools",
    description: "Everyday apps and tools that make life better — updated daily.",
  },
];

for (const f of categoryFeeds) {
  const sorted = sortByIdDesc(f.items.map((i) => ({ ...i, type: f.type }))).slice(0, 50);
  const xml = buildFeed({
    title: f.title,
    description: f.description,
    selfPath: `/feeds/${f.file}`,
    items: sorted,
  });
  writeFileSafe(join(feedsDir, f.file), xml);
  console.log(`✅ feeds/${f.file} (${sorted.length} items)`);
}

// Combined feed (unchanged location for back-compat)
const allItems = [
  ...discoveries.map((i) => ({ ...i, type: "discovery" })),
  ...products.map((i) => ({ ...i, type: "product" })),
  ...hiddenGems.map((i) => ({ ...i, type: "hidden-gem" })),
  ...futureRadar.map((i) => ({ ...i, type: "future-tech" })),
  ...dailyTools.map((i) => ({ ...i, type: "tool" })),
];
const combined = sortByIdDesc(allItems).slice(0, 50);
const combinedXml = buildFeed({
  title: "Surfaced — Discover What's Next",
  description: "Fresh discoveries, trending products, hidden gems, future tech, and daily tools — curated every day.",
  selfPath: "/feed.xml",
  items: combined,
});
writeFileSafe(join(publicDir, "feed.xml"), combinedXml);
console.log(`✅ feed.xml (${combined.length} items)`);
