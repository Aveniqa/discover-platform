#!/usr/bin/env node
/**
 * Build-time OG image generator.
 *
 * For each item with a cached Pexels/Unsplash image, composites:
 *   - 1200×630 source image (darkened gradient overlay)
 *   - Surfaced wordmark + category label (top)
 *   - Item title (bottom, wrapped, bold)
 *
 * Writes PNG files to public/og/<slug>.png, reusable directly in metadata
 * openGraph.images. Idempotent — skips slugs that already have a PNG newer
 * than the source URL change. Deletes orphaned PNGs whose slugs no longer
 * exist in data.
 *
 * Running time: ~10s for ~500 items on CI (sharp is fast).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "og");
const CACHE_FILE = path.join(ROOT, "data", "image-cache.json");
const FILES = [
  "data/discoveries.json",
  "data/products.json",
  "data/hidden-gems.json",
  "data/future-radar.json",
  "data/daily-tools.json",
];

const BRAND_PURPLE = "#A855F7";

// Category-level OG image definitions
const CATEGORY_OGS = [
  {
    slug: "category-home",
    label: "Daily Discovery Engine",
    sub: "Curated finds — refreshed every morning",
    color1: "#A855F7",
    color2: "#22D3EE",
  },
  {
    slug: "category-discover",
    label: "Today's Discoveries",
    sub: "Breakthroughs, science & things you didn't know",
    color1: "#6366F1",
    color2: "#A855F7",
  },
  {
    slug: "category-trending",
    label: "Trending Products",
    sub: "The best gear, gadgets & products worth buying",
    color1: "#10B981",
    color2: "#06B6D4",
  },
  {
    slug: "category-hidden-gems",
    label: "Hidden Gems",
    sub: "Under-the-radar tools most people don't know",
    color1: "#FBBF24",
    color2: "#F59E0B",
  },
  {
    slug: "category-future-radar",
    label: "Future Radar",
    sub: "Emerging tech that will change everything",
    color1: "#22D3EE",
    color2: "#6366F1",
  },
  {
    slug: "category-tools",
    label: "Daily Tools",
    sub: "Apps & utilities for everyday use",
    color1: "#FB7185",
    color2: "#F43F5E",
  },
];

function loadAllItems() {
  const out = [];
  for (const f of FILES) {
    const arr = require(path.join(ROOT, f));
    const type =
      f.includes("discoveries") ? "Discovery" :
      f.includes("products") ? "Product" :
      f.includes("hidden-gems") ? "Hidden Gem" :
      f.includes("future-radar") ? "Future Tech" :
      "Daily Tool";
    for (const item of arr) {
      out.push({
        slug: item.slug,
        title: item.title || item.name || item.toolName || item.techName,
        category: type,
      });
    }
  }
  return out;
}

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3); // max 3 lines
}

function makeOverlaySvg({ title, category }) {
  const titleLines = wrapText(title, 32);
  const titleY = 630 - 60 - (titleLines.length - 1) * 74;
  const titleTspans = titleLines
    .map((l, i) => `<tspan x="60" dy="${i === 0 ? 0 : 74}">${escapeXml(l)}</tspan>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#08080C" stop-opacity="0.45"/>
      <stop offset="55%" stop-color="#08080C" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#08080C" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#shade)"/>
  <rect x="0" y="0" width="1200" height="6" fill="${BRAND_PURPLE}"/>
  <g font-family="Inter, system-ui, -apple-system, sans-serif">
    <text x="60" y="70" font-size="26" font-weight="700" fill="${BRAND_PURPLE}" letter-spacing="6">SURFACED</text>
    <text x="60" y="108" font-size="18" font-weight="500" fill="#A1A1AA" letter-spacing="3">${escapeXml(category.toUpperCase())}</text>
    <text x="60" y="${titleY}" font-size="62" font-weight="800" fill="#F2F2F7">${titleTspans}</text>
  </g>
</svg>`;
}

async function loadBaseImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return sharp(buf).resize(1200, 630, { fit: "cover", position: "attention" });
}

async function generate(slug, title, category, imageUrl, force = false) {
  const outPath = path.join(OUT_DIR, `${slug}.png`);
  if (!force) {
    try {
      await fs.access(outPath);
      return { slug, status: "skip" };
    } catch { /* not exists — proceed */ }
  }

  try {
    const base = await loadBaseImage(imageUrl);
    const overlay = Buffer.from(makeOverlaySvg({ title, category }));
    const png = await base.composite([{ input: overlay, top: 0, left: 0 }]).png({ quality: 82 }).toBuffer();
    await fs.writeFile(outPath, png);
    return { slug, status: "ok" };
  } catch (err) {
    return { slug, status: "fail", err: err.message };
  }
}

function makeCategoryOgSvg({ label, sub, color1, color2 }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="blob1" cx="25%" cy="30%" r="55%">
      <stop offset="0%" stop-color="${color1}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${color1}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blob2" cx="80%" cy="70%" r="50%">
      <stop offset="0%" stop-color="${color2}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${color2}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="stripe" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${color1}"/>
      <stop offset="100%" stop-color="${color2}"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1200" height="630" fill="#08080C"/>
  <!-- Gradient blobs -->
  <rect width="1200" height="630" fill="url(#blob1)"/>
  <rect width="1200" height="630" fill="url(#blob2)"/>
  <!-- Top accent line -->
  <rect x="0" y="0" width="1200" height="5" fill="url(#stripe)"/>
  <!-- Subtle grid dots -->
  <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
    <circle cx="20" cy="20" r="1" fill="#ffffff" fill-opacity="0.04"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <!-- Decorative accent: three gradient bars -->
  <rect x="60" y="180" width="80" height="12" rx="6" fill="url(#stripe)" fill-opacity="0.9"/>
  <rect x="60" y="202" width="52" height="12" rx="6" fill="url(#stripe)" fill-opacity="0.6"/>
  <rect x="60" y="224" width="28" height="12" rx="6" fill="url(#stripe)" fill-opacity="0.35"/>
  <!-- Content -->
  <g font-family="Inter, system-ui, -apple-system, sans-serif">
    <!-- Surfaced wordmark -->
    <text x="60" y="72" font-size="22" font-weight="700" fill="${color1}" letter-spacing="5">SURFACED</text>
    <!-- Divider -->
    <rect x="60" y="88" width="48" height="2" fill="${color1}" fill-opacity="0.5" rx="1"/>
    <!-- Category label -->
    <text x="60" y="340" font-size="64" font-weight="800" fill="#F2F2F7" letter-spacing="-1">${escapeXml(label)}</text>
    <!-- Sub-label -->
    <text x="60" y="400" font-size="26" font-weight="400" fill="#8E8EA0">${escapeXml(sub)}</text>
    <!-- Bottom tag -->
    <text x="60" y="575" font-size="16" font-weight="600" fill="${color1}" fill-opacity="0.8" letter-spacing="3">SURFACED.DAILY — UPDATED EVERY MORNING</text>
  </g>
</svg>`;
}

async function generateCategoryOgs(force = false) {
  const CATEGORY_SLUGS = new Set(CATEGORY_OGS.map((c) => c.slug));
  let generated = 0;
  for (const cat of CATEGORY_OGS) {
    const outPath = path.join(OUT_DIR, `${cat.slug}.png`);
    if (!force) {
      try { await fs.access(outPath); continue; } catch { /* generate */ }
    }
    const svg = Buffer.from(makeCategoryOgSvg(cat));
    await sharp(svg).png({ quality: 85 }).toFile(outPath);
    generated++;
    console.log(`  🎨 category OG: ${cat.slug}`);
  }
  if (generated === 0) console.log("  ↪ all category OGs cached");
  return CATEGORY_SLUGS;
}

async function main() {
  const force = process.argv.includes("--force");
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Generate category-level OG images first
  console.log("📐 Generating category OG images...");
  const categorySlugs = await generateCategoryOgs(force);

  const cache = JSON.parse(await fs.readFile(CACHE_FILE, "utf8"));
  const items = loadAllItems();
  // Protect both item slugs and category slugs from orphan cleanup
  const activeSlugs = new Set([...items.map((i) => i.slug), ...categorySlugs]);

  const pending = items.filter((i) => cache[i.slug] && i.title);
  console.log(`🎨 OG images — ${pending.length} candidates (force=${force})`);

  // Small parallelism (4) to avoid thrashing sharp + network
  const concurrency = 4;
  const results = { ok: 0, skip: 0, fail: 0 };
  let idx = 0;

  async function worker() {
    while (idx < pending.length) {
      const i = pending[idx++];
      // Resize Pexels image to 1200x widhtin the fetched URL for faster download
      const srcUrl = cache[i.slug].replace(/h=\d+&w=\d+/, "h=630&w=1200");
      const r = await generate(i.slug, i.title, i.category, srcUrl, force);
      results[r.status]++;
      if (r.status === "fail") console.warn(`  ✗ ${i.slug}: ${r.err}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  // Clean up orphaned PNGs
  const existing = await fs.readdir(OUT_DIR);
  let orphans = 0;
  for (const f of existing) {
    if (!f.endsWith(".png")) continue;
    const slug = f.slice(0, -4);
    if (!activeSlugs.has(slug)) {
      await fs.unlink(path.join(OUT_DIR, f));
      orphans++;
    }
  }

  // Write manifest of slugs that actually have a PNG on disk,
  // so generateMetadata can reference only real files.
  const finalPngs = (await fs.readdir(OUT_DIR))
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4))
    .sort();
  const manifestPath = path.join(ROOT, "data", "og-manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(finalPngs, null, 2) + "\n");

  console.log(`  ✓ generated: ${results.ok}`);
  console.log(`  ↪ skipped (cached): ${results.skip}`);
  console.log(`  ✗ failed: ${results.fail}`);
  if (orphans) console.log(`  🗑 cleaned ${orphans} orphaned PNG(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
