#!/usr/bin/env node
/**
 * Generate social media posts from Surfaced product data.
 * Picks items per day (3 weekdays, 2 weekends — rotating categories),
 * calls Gemini to generate platform-specific copy for Pinterest, Bluesky,
 * and X/Twitter.
 * Output: data/social-queue.json
 */
import { readFileSync, existsSync } from "fs";
import { writeJsonSafe } from "./lib/write-safe.mjs";
import { pooledFetch } from "./lib/fetch-pool.mjs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DATA_DIR = join(root, "data");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not set");
  process.exit(1);
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
const SITE_URL = "https://surfaced-x.pages.dev";

// Category rotation by day of week (0=Sun … 6=Sat)
// Weekdays: 3 posts from 2 categories; Weekends: 2 posts from 2 categories
const CATEGORY_ROTATION = {
  0: ["products", "hidden-gems"],          // Sun: 2 posts
  1: ["products", "discoveries"],           // Mon: 3 posts
  2: ["discoveries", "hidden-gems"],        // Tue: 3 posts
  3: ["hidden-gems", "future-radar"],       // Wed: 3 posts
  4: ["future-radar", "daily-tools"],       // Thu: 3 posts
  5: ["daily-tools", "products"],           // Fri: 3 posts
  6: ["discoveries", "future-radar"],       // Sat: 2 posts
};

const CATEGORY_FILES = {
  products: "products.json",
  discoveries: "discoveries.json",
  "hidden-gems": "hidden-gems.json",
  "future-radar": "future-radar.json",
  "daily-tools": "daily-tools.json",
};

// Pinterest board name mapping
const BOARD_MAP = {
  products: "Tech Products",
  discoveries: "New Discoveries",
  "hidden-gems": "Hidden Gems",
  "future-radar": "Future Tech",
  "daily-tools": "Daily Tools",
};

// Category-specific hashtags for Bluesky
const CATEGORY_HASHTAGS = {
  products: ["#tech", "#gadgets", "#innovation"],
  discoveries: ["#science", "#discovery", "#TIL"],
  "hidden-gems": ["#hiddenGem", "#apps", "#underrated"],
  "future-radar": ["#futuretech", "#innovation", "#emerging"],
  "daily-tools": ["#productivity", "#tools", "#apps"],
};

async function main() {
  // 1. Load posted history
  const postedPath = join(DATA_DIR, "social-posted.json");
  const posted = existsSync(postedPath)
    ? JSON.parse(readFileSync(postedPath, "utf-8"))
    : {};

  // 2. Load image cache
  const imageCache = JSON.parse(
    readFileSync(join(DATA_DIR, "image-cache.json"), "utf-8")
  );

  // 3. Determine today's categories and post count
  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const targetCount = isWeekend ? 2 : 3;
  const categories = CATEGORY_ROTATION[dayOfWeek];

  // 4. Pick items — distribute across categories
  const selected = [];

  for (const cat of categories) {
    if (selected.length >= targetCount) break;
    const items = JSON.parse(
      readFileSync(join(DATA_DIR, CATEGORY_FILES[cat]), "utf-8")
    );
    const postedSlugs = posted[cat] || [];
    let available = items.filter((item) => !postedSlugs.includes(item.slug));

    // Reset if exhausted
    if (available.length === 0) {
      posted[cat] = [];
      available = items;
    }

    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      selected.push({ ...pick, _category: cat });
    }
  }

  // Fill remaining slots from primary category
  while (selected.length < targetCount) {
    const cat = categories[0];
    const items = JSON.parse(
      readFileSync(join(DATA_DIR, CATEGORY_FILES[cat]), "utf-8")
    );
    const alreadyPicked = selected.map((s) => s.slug);
    const postedSlugs = posted[cat] || [];
    let available = items.filter(
      (item) =>
        !postedSlugs.includes(item.slug) && !alreadyPicked.includes(item.slug)
    );

    if (available.length === 0) {
      // Reset and retry
      posted[cat] = [];
      available = items.filter((item) => !alreadyPicked.includes(item.slug));
    }

    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      selected.push({ ...pick, _category: cat });
    } else {
      break; // Can't find more items
    }
  }

  // 5. Generate social posts for all items in parallel
  const posts = [];

  // Step A: Compute all derived fields synchronously
  const preparedItems = selected.map((item) => {
    const fallbackImageUrl = imageCache[item.slug] || "";
    const productUrl = `${SITE_URL}/item/${item.slug}`;
    const affiliateUrl = item.directAmazonUrl || productUrl;
    const utmParams = `?utm_source=social&utm_medium=${item._category}&utm_campaign=daily_post`;
    const trackedProductUrl = `${productUrl}${utmParams}`;
    const trackedAffiliateUrl = item.directAmazonUrl ? affiliateUrl : trackedProductUrl;
    const itemTitle = item.title || item.name || item.slug;
    const itemDesc = item.shortDescription || item.whatItDoes || item.description || "";
    const itemWhy = item.whyItIsInteresting || item.whyItIsUseful || "";
    const itemSource = item.sourceLink || item.websiteLink || "";
    const itemPrice = item.estimatedPriceRange || item.pricingModel || "See link";
    const normalizedItem = { ...item, title: itemTitle, shortDescription: itemDesc, whyItIsInteresting: itemWhy, sourceLink: itemSource, estimatedPriceRange: itemPrice };
    return { item, fallbackImageUrl, trackedProductUrl, trackedAffiliateUrl, normalizedItem, itemTitle, itemDesc };
  });

  // Step B: Call Gemini for all items in parallel
  console.log(`  Generating posts for: ${preparedItems.map((p) => p.itemTitle).join(", ")}`);
  const socialContents = await Promise.all(
    preparedItems.map(({ normalizedItem, trackedAffiliateUrl, trackedProductUrl }) =>
      generateSocialContent(normalizedItem, trackedAffiliateUrl, trackedProductUrl)
    )
  );

  // Step C: Fetch images for all items in parallel (Gemini fallback + Pexels)
  const imageUrls = await Promise.all(
    preparedItems.map(async ({ item, fallbackImageUrl }, i) => {
      const socialContent = socialContents[i];
      if (!PEXELS_API_KEY || !socialContent) return fallbackImageUrl;
      let searchQuery = socialContent.imageSearchQuery;
      if (!searchQuery) searchQuery = await getImageSearchQuery(item);
      if (!searchQuery) return fallbackImageUrl;
      const searchedImage = await searchPexelsImage(searchQuery);
      if (searchedImage) {
        console.log(`   📷 Found relevant image for: "${searchQuery}"`);
        return searchedImage;
      }
      console.log(`   ⚠️ No Pexels result for "${searchQuery}", using cached image`);
      return fallbackImageUrl;
    })
  );

  // Step D: Build post objects from results
  for (let i = 0; i < preparedItems.length; i++) {
    const { item, trackedProductUrl, trackedAffiliateUrl, itemTitle, itemDesc } = preparedItems[i];
    const socialContent = socialContents[i];
    const imageUrl = imageUrls[i];

    if (socialContent) {
      const pin = socialContent.pinterest || {};
      const bsky = socialContent.bluesky || {};
      const tw = socialContent.twitter || {};
      const catHashtags = CATEGORY_HASHTAGS[item._category] || ["#surfaced"];
      const bskyHashtags = catHashtags.slice(0, 2).join(" ");
      const hasAffLink = !!item.directAmazonUrl;
      const link = hasAffLink ? trackedAffiliateUrl : trackedProductUrl;
      const fallbackText = `${item.title} — ${(item.shortDescription || "").slice(0, 150)} ${link}`;
      const altText = socialContent.imageAltText || `Image related to: ${itemTitle}`;

      posts.push({
        id: item.slug,
        title: itemTitle,
        category: item._category,
        imageUrl,
        imageAltText: altText,
        productUrl: trackedProductUrl,
        affiliateUrl: trackedAffiliateUrl,
        sourceLink: item.sourceLink || "",
        platforms: {
          pinterest: {
            title: pin.title || itemTitle.slice(0, 100),
            description: pin.description || `${(item.shortDescription || "").slice(0, 400)} ${link} #surfaced #${item._category}`,
            boardName: BOARD_MAP[item._category],
          },
          bluesky: {
            text: bsky.text
              ? `${bsky.text}\n\n${bskyHashtags}`
              : `${itemTitle} — ${itemDesc.slice(0, 200)}\n\n${bskyHashtags}`.slice(0, 290),
          },
          twitter: {
            text: tw.text || fallbackText.slice(0, 280),
          },
        },
        status: "pending",
        generatedAt: new Date().toISOString(),
      });
      // Note: posted tracking is in publish-social-posts.mjs — only marked when a platform succeeds.
    }
  }

  // 6. Write queue (append to existing)
  const queuePath = join(DATA_DIR, "social-queue.json");
  const existingQueue = existsSync(queuePath)
    ? JSON.parse(readFileSync(queuePath, "utf-8"))
    : { posts: [] };

  existingQueue.lastGenerated = new Date().toISOString();
  existingQueue.posts.push(...posts);

  // Keep only last 90 entries (increased for 3/day)
  if (existingQueue.posts.length > 90) {
    existingQueue.posts = existingQueue.posts.slice(-90);
  }

  writeJsonSafe(queuePath, existingQueue);

  console.log(
    `\n✅ Generated ${posts.length} social posts for ${new Date().toLocaleDateString()}`
  );
  posts.forEach((p) => console.log(`   • ${p.title} (${p.category})`));
}

function cleanJson(text) {
  // Strip markdown fences if present
  let cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  return cleaned;
}

async function callGeminiWithRetry(prompt, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await pooledFetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            responseMimeType: "application/json",
          },
        }),
      });

      if (response.status === 503 || response.status === 429) {
        if (attempt < maxRetries) {
          const wait = (attempt + 1) * 3000;
          console.log(`   ⏳ Rate limited, retrying in ${wait / 1000}s...`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty Gemini response");

      return JSON.parse(cleanJson(text));
    } catch (err) {
      if (attempt < maxRetries && err.message.includes("JSON")) {
        console.log(`   ⏳ JSON parse error, retrying...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

async function generateSocialContent(item, affiliateUrl, productUrl) {
  const hasAffiliate = item.directAmazonUrl ? true : false;
  const affiliateNote = hasAffiliate
    ? `Include affiliate disclosure: "Affiliate link — I earn a commission on purchases."`
    : `No affiliate link for this item. Link to: ${productUrl}`;

  const prompt = `You write social media posts for "Surfaced," a product discovery site (surfaced-x.pages.dev).
Tone: curious, opinionated, concise. Not corporate. Mention honest limitations when relevant.

Generate exactly 5 outputs in valid JSON (no trailing commas):
1. "pinterest": { "title": string (max 100 chars), "description": string (max 500 chars, include #affiliate if affiliate link, plus 3-4 hashtags) }
2. "bluesky": { "text": string (max 250 chars, do NOT include any URL or hashtags — those are added automatically. Write engaging copy only.) }
3. "twitter": { "text": string (max 280 chars, include link at end) }
4. "imageSearchQuery": string (REQUIRED — 2-4 word Pexels search query for a photo that directly illustrates this specific item. Be literal and specific, not abstract. Example: for penicillin discovery use "petri dish mold", for tardigrades use "tardigrade microscope")
5. "imageAltText": string (REQUIRED — concise alt text describing what the ideal image would show, for accessibility. Max 100 chars.)

${affiliateNote}

Product:
- Title: ${item.title}
- Category: ${item.category || item._category}
- Description: ${item.shortDescription || ""}
- Why interesting: ${item.whyItIsInteresting || ""}
- Price: ${item.estimatedPriceRange || "See link"}
- Link: ${hasAffiliate ? affiliateUrl : productUrl}
${item.sourceLink ? `- Source: ${item.sourceLink}` : ""}

Respond ONLY with valid JSON.`;

  try {
    return await callGeminiWithRetry(prompt);
  } catch (err) {
    console.error(`   ❌ Failed for ${item.title}: ${err.message}`);
    return null;
  }
}

async function getImageSearchQuery(item) {
  const prompt = `Return a 2-4 word Pexels image search query for a photo that literally depicts this subject. Be concrete and visual, not abstract.

Subject: ${item.title}
Description: ${(item.shortDescription || "").slice(0, 150)}

Examples:
- "CRISPR Gene Editing" → "dna double helix laboratory"
- "Ancient Babylonian Astronomy" → "cuneiform clay tablet"
- "Tardigrades" → "tardigrade microscope"
- "Rogue Planets" → "dark planet deep space"
- "Roman Concrete" → "roman pantheon dome"

Respond with ONLY the search query string in JSON: {"query": "your search terms"}`;

  try {
    const result = await callGeminiWithRetry(prompt);
    const q = result?.query;
    if (q && typeof q === "string" && q.length > 2) {
      console.log(`   🔍 Gemini image query fallback: "${q}"`);
      return q;
    }
  } catch (err) {
    console.log(`   ⚠️ Image query fallback failed: ${err.message}`);
  }
  return null;
}

async function searchPexelsImage(query) {
  try {
    const res = await pooledFetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.photos && data.photos.length > 0) {
      // Return the large size (good quality, reasonable file size)
      return data.photos[0].src.large;
    }
    return null;
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
