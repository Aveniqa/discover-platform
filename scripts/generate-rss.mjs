#!/usr/bin/env node
/**
 * Generate a static RSS feed (feed.xml) from all items.
 * Run before `next build` so the file is included in the static export.
 */
import { readFileSync, mkdirSync } from "fs";
import { writeFileSafe } from "./lib/write-safe.mjs";
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

// Image cache is optional — feed still generates without thumbnails if the
// file is missing, but ~all live items have an entry so this is the common path.
let imageCache = {};
try {
  imageCache = JSON.parse(readFileSync(join(root, "data/image-cache.json"), "utf-8"));
} catch {
  // Leave imageCache as {}; the feed will be image-less.
}

const SITE_URL = "https://surfaced-x.pages.dev";
const FALLBACK_PUB_DATE = "2025-01-01";

function getTitle(item) {
  return item.title || item.name || item.techName || item.toolName || "Untitled";
}

function getDescription(item) {
  return item.shortDescription || item.description ||
         item.explanation || item.whatItDoes || item.whyItMatters || "";
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

/**
 * Pick an item's image from the cache. Returns null when no cached URL exists
 * or the URL isn't an https resource we can safely reference in the feed.
 * Pexels/Unsplash/Pixabay (the three configured providers) are all https.
 */
function getImage(item) {
  const url = imageCache[item.slug];
  if (typeof url !== "string" || !url.startsWith("https://")) return null;
  return url;
}

/**
 * Best-effort MIME type from URL extension. Falls back to image/jpeg, which
 * matches Pexels' default-quality output and most CDN-served stock photos.
 */
function imageMimeType(url) {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

function parseItemDate(item) {
  const value = item.dateAdded || item.archivedAt || FALLBACK_PUB_DATE;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? new Date(`${FALLBACK_PUB_DATE}T00:00:00.000Z`) : date;
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

const lastBuildDate = sorted
  .map(parseItemDate)
  .reduce((latest, date) => (date > latest ? date : latest), new Date(`${FALLBACK_PUB_DATE}T00:00:00.000Z`))
  .toUTCString();

let itemsWithImages = 0;
const rssItems = sorted
  .map((item) => {
    const title = escapeXml(getTitle(item));
    const desc = escapeXml(getDescription(item));
    const link = `${SITE_URL}/item/${item.slug}`;
    const category = escapeXml(getCategoryLabel(item.type));
    const pubDate = parseItemDate(item).toUTCString();
    const image = getImage(item);

    // When an image is cached, attach it three ways for max reader compatibility:
    //   - <enclosure>          : RSS 2.0 standard, used by older readers (length=0
    //                            because we don't fetch byte sizes; tolerated in practice)
    //   - <media:content>      : Media RSS, used by Feedly / Inoreader
    //   - <media:thumbnail>    : Media RSS, used by Reeder / NetNewsWire as the card preview
    let mediaBlock = "";
    if (image) {
      itemsWithImages++;
      const safeImage = escapeXml(image);
      const mime = imageMimeType(image);
      mediaBlock = `
      <enclosure url="${safeImage}" type="${mime}" length="0" />
      <media:content url="${safeImage}" medium="image" type="${mime}" />
      <media:thumbnail url="${safeImage}" />`;
    }

    return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${desc}</description>
      <category>${category}</category>
      <pubDate>${pubDate}</pubDate>${mediaBlock}
    </item>`;
  })
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Surfaced — Discover What's Next</title>
    <link>${SITE_URL}</link>
    <description>Fresh discoveries, trending products, hidden gems, future tech, and daily tools — curated every day.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;

// Write to public/ so Next.js static export includes it
const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });
writeFileSafe(join(publicDir, "feed.xml"), rss);

console.log(`✅ Generated feed.xml with ${sorted.length} items (${itemsWithImages} with thumbnails)`);
