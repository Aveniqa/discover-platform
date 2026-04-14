#!/usr/bin/env node
/**
 * Generate social media posts from Surfaced product data.
 * Picks 2 items per day (rotating categories), calls Gemini to generate
 * platform-specific copy for Pinterest, Bluesky, and X/Twitter.
 * Output: data/social-queue.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DATA_DIR = join(root, "data");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not set");
  process.exit(1);
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
const SITE_URL = "https://surfaced-x.pages.dev";

// Category rotation by day of week (0=Sun … 6=Sat)
const CATEGORY_ROTATION = {
  0: ["products", "hidden-gems"],
  1: ["products"],
  2: ["discoveries"],
  3: ["hidden-gems"],
  4: ["future-radar"],
  5: ["daily-tools"],
  6: ["discoveries", "future-radar"],
};

const CATEGORY_FILES = {
  products: "products.json",
  discoveries: "discoveries.json",
  "hidden-gems": "hidden-gems.json",
  "future-radar": "future-radar.json",
  "daily-tools": "daily-tools.json",
};

// URL path segments for each category
const CATEGORY_PATHS = {
  products: "products",
  discoveries: "discoveries",
  "hidden-gems": "hidden-gems",
  "future-radar": "future-radar",
  "daily-tools": "daily-tools",
};

// Pinterest board name mapping
const BOARD_MAP = {
  products: "Tech Products",
  discoveries: "New Discoveries",
  "hidden-gems": "Hidden Gems",
  "future-radar": "Future Tech",
  "daily-tools": "Daily Tools",
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

  // 3. Determine today's categories
  const dayOfWeek = new Date().getDay();
  const categories = CATEGORY_ROTATION[dayOfWeek];

  // 4. Pick 2 items
  const selected = [];

  for (const cat of categories) {
    if (selected.length >= 2) break;
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

  // If only 1 picked and single-category day, get a second
  if (selected.length < 2) {
    const cat = categories[0];
    const items = JSON.parse(
      readFileSync(join(DATA_DIR, CATEGORY_FILES[cat]), "utf-8")
    );
    const alreadyPicked = selected.map((s) => s.slug);
    const postedSlugs = posted[cat] || [];
    const available = items.filter(
      (item) =>
        !postedSlugs.includes(item.slug) && !alreadyPicked.includes(item.slug)
    );
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      selected.push({ ...pick, _category: cat });
    }
  }

  // 5. Generate social posts for each item
  const posts = [];
  for (const item of selected) {
    const imageUrl = imageCache[item.slug] || "";
    const catPath = CATEGORY_PATHS[item._category];
    const productUrl = `${SITE_URL}/${catPath}/${item.slug}`;
    const affiliateUrl = item.directAmazonUrl || productUrl;

    console.log(`  Generating posts for: ${item.title}`);
    const socialContent = await generateSocialContent(item, affiliateUrl, productUrl);

    if (socialContent) {
      posts.push({
        id: item.slug,
        title: item.title,
        category: item._category,
        imageUrl,
        productUrl,
        affiliateUrl,
        platforms: {
          pinterest: {
            ...socialContent.pinterest,
            boardName: BOARD_MAP[item._category],
          },
          bluesky: socialContent.bluesky,
          twitter: socialContent.twitter,
        },
        status: "pending",
        generatedAt: new Date().toISOString(),
      });

      // Track posted
      if (!posted[item._category]) posted[item._category] = [];
      posted[item._category].push(item.slug);
    }
  }

  // 6. Write queue (append to existing)
  const queuePath = join(DATA_DIR, "social-queue.json");
  const existingQueue = existsSync(queuePath)
    ? JSON.parse(readFileSync(queuePath, "utf-8"))
    : { posts: [] };

  existingQueue.lastGenerated = new Date().toISOString();
  existingQueue.posts.push(...posts);

  // Keep only last 60 entries
  if (existingQueue.posts.length > 60) {
    existingQueue.posts = existingQueue.posts.slice(-60);
  }

  writeFileSync(queuePath, JSON.stringify(existingQueue, null, 2));
  writeFileSync(postedPath, JSON.stringify(posted, null, 2));

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
      const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
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

Generate exactly 3 outputs in valid JSON (no trailing commas):
1. "pinterest": { "title": string (max 100 chars), "description": string (max 500 chars, include #affiliate if affiliate link, plus 3-4 hashtags) }
2. "bluesky": { "text": string (max 280 chars, include link at end) }
3. "twitter": { "text": string (max 280 chars, include link at end) }

${affiliateNote}

Product:
- Title: ${item.title}
- Category: ${item.category || item._category}
- Description: ${item.shortDescription || ""}
- Why interesting: ${item.whyItIsInteresting || ""}
- Price: ${item.estimatedPriceRange || "See link"}
- Link: ${hasAffiliate ? affiliateUrl : productUrl}

Respond ONLY with valid JSON.`;

  try {
    return await callGeminiWithRetry(prompt);
  } catch (err) {
    console.error(`   ❌ Failed for ${item.title}: ${err.message}`);
    return null;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
