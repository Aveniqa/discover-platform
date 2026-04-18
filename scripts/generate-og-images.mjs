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

async function main() {
  const force = process.argv.includes("--force");
  await fs.mkdir(OUT_DIR, { recursive: true });

  const cache = JSON.parse(await fs.readFile(CACHE_FILE, "utf8"));
  const items = loadAllItems();
  const activeSlugs = new Set(items.map((i) => i.slug));

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
