/**
 * Fill missing images using:
 *   1. OpenGraph image scrape from item's own websiteLink/sourceLink (best match)
 *   2. Wikimedia Commons (great for science / discovery topics, no API key)
 *   3. Existing Pexels/Unsplash/Pixabay providers (fallback)
 *
 * Only processes items NOT already in image-cache.json.
 * Safe to re-run.
 *
 * Usage:
 *   PEXELS_API_KEY=xxx UNSPLASH_ACCESS_KEY=xxx node scripts/fill-missing-images.js
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const PEXELS_KEY = process.env.PEXELS_API_KEY || "";
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || "";
const PIXABAY_KEY = process.env.PIXABAY_API_KEY || "";

const DATA_DIR = path.join(__dirname, "..", "data");
const CACHE_PATH = path.join(DATA_DIR, "image-cache.json");

const FILES = {
  discoveries: "discoveries.json",
  products: "products.json",
  "hidden-gems": "hidden-gems.json",
  "future-radar": "future-radar.json",
  "daily-tools": "daily-tools.json",
};

const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};

// ─── helpers ────────────────────────────────────────────────────

async function fetchWithTimeout(url, opts = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

// 1. OpenGraph image scrape ─────────────────────────────────────
async function fetchOgImage(pageUrl) {
  if (!pageUrl || !pageUrl.startsWith("http")) return null;
  try {
    const res = await fetchWithTimeout(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SurfacedBot/1.0)" },
    }, 6000);
    if (!res.ok) return null;
    const html = await res.text();
    // Try multiple meta patterns
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]) {
        let url = m[1].trim();
        // Resolve relative URLs
        if (url.startsWith("//")) url = "https:" + url;
        else if (url.startsWith("/")) {
          const u = new URL(pageUrl);
          url = `${u.protocol}//${u.host}${url}`;
        }
        if (url.startsWith("http")) return url;
      }
    }
  } catch {}
  return null;
}

// 2. Wikimedia Commons ──────────────────────────────────────────
async function fetchWikimediaImage(query) {
  try {
    // Step 1: search Commons for matching media
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=3&origin=*`;
    const res = await fetchWithTimeout(searchUrl, {}, 6000);
    if (!res.ok) return null;
    const data = await res.json();
    const hits = data.query?.search || [];
    for (const hit of hits) {
      const filename = hit.title; // e.g. "File:Foo.jpg"
      // Step 2: get the actual image URL via imageinfo
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|mime&origin=*`;
      const infoRes = await fetchWithTimeout(infoUrl, {}, 6000);
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();
      const pages = infoData.query?.pages || {};
      const page = Object.values(pages)[0];
      const info = page?.imageinfo?.[0];
      if (info?.url && /\.(jpe?g|png|webp)$/i.test(info.url)) {
        return info.url;
      }
    }
  } catch {}
  return null;
}

// 3. Pexels ─────────────────────────────────────────────────────
async function fetchPexelsImage(query, page = 1) {
  if (!PEXELS_KEY) return null;
  try {
    const res = await fetchWithTimeout(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&page=${page}&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 60000));
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    return data.photos?.[0]?.src?.large || null;
  } catch { return null; }
}

// 4. Unsplash ───────────────────────────────────────────────────
async function fetchUnsplashImage(query) {
  if (!UNSPLASH_KEY) return null;
  try {
    const res = await fetchWithTimeout(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 60000));
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    return data.urls?.regular || null;
  } catch { return null; }
}

// 5. Pixabay ────────────────────────────────────────────────────
async function fetchPixabayImage(query) {
  if (!PIXABAY_KEY) return null;
  try {
    const res = await fetchWithTimeout(
      `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.hits?.[0]?.largeImageURL || null;
  } catch { return null; }
}

// ─── main flow ──────────────────────────────────────────────────

function getItemSearchQuery(item, category) {
  // Build a strong search query from the item
  const title = item.title || item.name || item.techName || item.toolName || "";
  const idea = item.imageIdea || "";
  // For science topics, prefer the title (more specific to find on Wikimedia)
  if (category === "discoveries" || category === "future-radar") return title;
  // For tools/products, prefer the title + product context
  return idea && idea.length > 5 ? idea : title;
}

function getPageUrl(item) {
  return item.websiteLink || item.sourceLink || item.directAmazonUrl || null;
}

function isScienceCategory(cat) {
  return cat === "discoveries" || cat === "future-radar";
}

async function fillImage(item, category, idx, total) {
  const slug = item.slug;
  const query = getItemSearchQuery(item, category);
  const pageUrl = getPageUrl(item);

  process.stdout.write(`[${idx}/${total}] ${slug.slice(0, 50).padEnd(50)} `);

  // Strategy varies by category
  let url = null;
  let source = "";

  // 1. OG image first if we have a website (perfect for tools)
  if (pageUrl && !pageUrl.includes("amazon.")) {
    url = await fetchOgImage(pageUrl);
    if (url) source = "og";
  }

  // 2. Wikimedia for science topics
  if (!url && isScienceCategory(category)) {
    url = await fetchWikimediaImage(query);
    if (url) source = "wikimedia";
  }

  // 3. Pexels
  if (!url) {
    url = await fetchPexelsImage(query);
    if (url) source = "pexels";
  }

  // 4. Unsplash
  if (!url) {
    url = await fetchUnsplashImage(query);
    if (url) source = "unsplash";
  }

  // 5. Pixabay (if key set)
  if (!url) {
    url = await fetchPixabayImage(query);
    if (url) source = "pixabay";
  }

  if (url) {
    cache[slug] = url;
    console.log(`✓ ${source}`);
    return true;
  }
  console.log("✗");
  return false;
}

async function main() {
  // Build list of all items missing from cache
  const missing = [];
  for (const [cat, fn] of Object.entries(FILES)) {
    const items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, fn), "utf8"));
    for (const item of items) {
      if (item.slug && !cache[item.slug]) {
        missing.push({ item, category: cat });
      }
    }
  }

  console.log(`\n🔍 Found ${missing.length} items missing images.`);
  console.log(`   Providers: OG-scrape → Wikimedia${isScienceCategory ? "" : ""} → Pexels → Unsplash${PIXABAY_KEY ? " → Pixabay" : ""}\n`);

  let filled = 0, failed = 0, saveCounter = 0;
  for (let i = 0; i < missing.length; i++) {
    const ok = await fillImage(missing[i].item, missing[i].category, i + 1, missing.length);
    if (ok) filled++; else failed++;

    // Save every 25 items
    if (++saveCounter >= 25) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
      saveCounter = 0;
    }
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  console.log(`\n✅ Done. Filled ${filled} / ${missing.length}, ${failed} still missing.`);
  console.log(`   Cache size: ${Object.keys(cache).length}\n`);
}

main().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
