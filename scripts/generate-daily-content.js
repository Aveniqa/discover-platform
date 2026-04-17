const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const { writeJsonSafe } = require("./lib/write-safe");
const { createLogger } = require("./lib/logger");

const log = createLogger({ script: 'generate-daily-content' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Flash-Lite has the highest free-tier limits (15 RPM, 1000 RPD)
// and is less likely to hit capacity issues than Flash or Pro
const MODEL = "gemini-2.5-flash-lite";

const DATA_DIR = path.join(__dirname, "..", "data");
const today = new Date().toISOString().split("T")[0];

const FILES = {
  discoveries: "discoveries.json",
  products: "products.json",
  "hidden-gems": "hidden-gems.json",
  "future-radar": "future-radar.json",
  "daily-tools": "daily-tools.json",
};

// Required fields per category that Gemini must return.
// id and dateAdded are assigned post-generation, so they're excluded here.
const REQUIRED_FIELDS = {
  discoveries: ["slug", "title", "shortDescription", "category", "whyItIsInteresting", "type"],
  products: ["slug", "title", "shortDescription", "category", "whyItIsInteresting", "type"],
  "hidden-gems": ["slug", "name", "whatItDoes", "category", "whyItIsUseful", "type"],
  "future-radar": ["slug", "techName", "explanation", "industry", "whyItMatters", "developmentStage", "type"],
  "daily-tools": ["slug", "toolName", "whatItDoes", "category", "whyItIsUseful", "type"],
};

function readJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf8"));
}

function writeJSON(filename, data) {
  writeJsonSafe(path.join(DATA_DIR, filename), data);
}

function getNextId(items) {
  return Math.max(...items.map((i) => i.id || 0), 0) + 1;
}

function getExistingSlugs(items) {
  return new Set(items.map((i) => i.slug));
}

async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err.message || "";
      const is503 = msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand");
      const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
      const isJsonErr = msg.includes("JSON parse failed");
      if ((is503 || is429 || isJsonErr) && attempt < maxRetries) {
        const delay = attempt * 15000; // 15s, 30s, 45s
        const reason = is503 ? "capacity" : is429 ? "rate limit" : "bad JSON";
        console.log(`  ⏳ Retry ${attempt}/${maxRetries} in ${delay / 1000}s (${reason})...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

async function generateItems(category, existingItems, count) {
  const existingSlugs = getExistingSlugs(existingItems);
  const existingTitles = existingItems
    .slice(-30)
    .map((i) => i.title || i.name || i.toolName || i.techName)
    .join(", ");

  const schemas = {
    discoveries: `{
  "id": <number>,
  "slug": "<kebab-case>",
  "title": "<50-80 chars>",
  "shortDescription": "<2-3 sentences>",
  "category": "<Science|Nature|History|Technology|Psychology|Culture|Global|Statistics|Innovation|Space>",
  "whyItIsInteresting": "<2-3 sentences>",
  "imageIdea": "<concrete visual noun like 'octopus underwater ocean'>",
  "sourceLink": "<real URL>",
  "type": "discovery"
}`,
    products: `{
  "id": <number>,
  "slug": "<kebab-case>",
  "title": "<product name>",
  "shortDescription": "<2-3 sentences>",
  "category": "<product category>",
  "whyItIsInteresting": "<2-3 sentences>",
  "imageIdea": "<concrete visual noun>",
  "sourceLink": "<real product URL>",
  "estimatedPriceRange": "<e.g. $299-$349>",
  "availableOnAmazon": <true|false — true if this exact product is sold on Amazon, false for DTC-only or niche brands not on Amazon>,
  "amazonAsin": "<10-char ASIN if you are confident this exact product is listed on amazon.com (e.g. 'B09G9FPHY6'), else empty string>",
  "type": "product"
}`,
    "hidden-gems": `{
  "id": <number>,
  "slug": "<kebab-case>",
  "name": "<tool/site name>",
  "whatItDoes": "<2-3 sentences>",
  "category": "<Design|Productivity|Education|Finance|Developer|Writing|Health|Entertainment|Social|Reference>",
  "whyItIsUseful": "<2-3 sentences>",
  "imageIdea": "<concrete visual noun>",
  "websiteLink": "<real working URL — e.g. https://obsidian.md>",
  "type": "hidden-gem"
}`,
    "future-radar": `{
  "id": <number>,
  "slug": "<kebab-case>",
  "techName": "<technology name>",
  "explanation": "<2-3 sentences>",
  "industry": "<industry>",
  "whyItMatters": "<2-3 sentences>",
  "developmentStage": "<Research|Prototype|Early Adoption|Early Commercialization|Growth|Mainstream>",
  "imageIdea": "<concrete visual noun like 'quantum computer circuit board'>",
  "type": "future-tech"
}`,
    "daily-tools": `{
  "id": <number>,
  "slug": "<kebab-case>",
  "toolName": "<tool name>",
  "whatItDoes": "<2-3 sentences>",
  "category": "<Productivity|Design|Developer|Writing|Finance|Health|Education|Entertainment|Social|Reference>",
  "whyItIsUseful": "<2-3 sentences>",
  "imageIdea": "<concrete visual noun like 'productivity app laptop workspace'>",
  "websiteLink": "<real working URL — e.g. https://notion.so>",
  "type": "tool"
}`,
  };

  const categoryPrompts = {
    discoveries:
      "Find 3 genuinely fascinating, surprising real-world facts, scientific discoveries, or historical revelations. Prioritize recent findings from the last month but timeless mind-blowing facts work too.",
    products:
      "Find 3 real, currently available consumer products that are trending or newly launched. They must be real products you can actually buy. Include accurate pricing.",
    "hidden-gems":
      "Find 3 real, lesser-known websites or web tools that are genuinely useful. They must have real, working URLs. Focus on tools most people haven't heard of. CRITICAL: The websiteLink field MUST be a real, working URL to the tool's actual website (e.g., 'https://obsidian.md'). Never use placeholder or example URLs.",
    "future-radar":
      "Find 3 real emerging technologies that have had recent milestones or breakthroughs. Focus on concrete developments, not speculation.",
    "daily-tools":
      "Find 3 real, useful everyday tools or apps with working URLs. Focus on well-regarded tools that help with productivity, creativity, or daily life. CRITICAL: The websiteLink field MUST be a real, working URL to the tool's actual website (e.g., 'https://notion.so'). Never use placeholder or example URLs.",
  };

  const prompt = `${categoryPrompts[category]}

EXISTING items to AVOID duplicating (these already exist): ${existingTitles}

Return EXACTLY ${count} items as a JSON array. Each item must match this exact schema:
${schemas[category]}

Rules:
- All URLs must be real, publicly accessible websites
- imageIdea must be a concrete visual noun (e.g. "espresso machine coffee barista"), NEVER abstract concepts
- slug must be kebab-case, unique, derived from the title/name
- Descriptions should be engaging and informative
- Today's date for reference: ${today}

Return ONLY the JSON array, no markdown fencing, no explanation.`;

  const items = await callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    const text = response.text.trim();
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    try {
      return JSON.parse(cleaned);
    } catch (parseErr) {
      throw new Error(`JSON parse failed: ${parseErr.message} — raw: ${cleaned.slice(0, 200)}`);
    }
  });

  // Assign IDs and reject true duplicates (same name as existing item)
  const existingNames = new Set(
    existingItems.map((i) => (i.title || i.name || i.toolName || i.techName || "").toLowerCase())
  );
  let nextId = getNextId(existingItems);
  const validItems = [];
  for (const item of items) {
    const itemName = (item.title || item.name || item.toolName || item.techName || "").toLowerCase();

    // Validate required fields — discard incomplete Gemini responses
    const requiredFields = REQUIRED_FIELDS[category];
    if (requiredFields) {
      const missing = requiredFields.filter(
        (f) => item[f] === undefined || item[f] === null || (typeof item[f] === "string" && item[f].trim() === "")
      );
      if (missing.length > 0) {
        console.warn(`  ⚠ Incomplete item discarded: "${itemName || item.slug || "unknown"}" — missing: ${missing.join(", ")}`);
        continue;
      }
    }

    // Skip exact name duplicates entirely
    if (existingNames.has(itemName)) {
      console.warn(`  ⚠ Duplicate name skipped: "${itemName}" (slug: ${item.slug})`);
      continue;
    }
    if (existingSlugs.has(item.slug)) {
      const base = item.slug;
      let suffix = 2;
      while (existingSlugs.has(`${base}-${suffix}`)) suffix++;
      item.slug = `${base}-${suffix}`;
      console.warn(`  ⚠ Slug collision: '${base}' → renamed to '${item.slug}'`);
    }
    item.id = nextId++;
    item.dateAdded = today;
    validItems.push(item);
    existingSlugs.add(item.slug);
    existingNames.add(itemName);
  }

  return validItems;
}

async function main() {
  console.log(`\n📰 Generating daily content for ${today}\n`);

  // Snapshot all data files before generation so we can restore on failure
  const backups = {};
  for (const [category, filename] of Object.entries(FILES)) {
    const fp = path.join(DATA_DIR, filename);
    backups[fp] = fs.readFileSync(fp, "utf8");
  }

  try {
    for (const [category, filename] of Object.entries(FILES)) {
      console.log(`[${category}] Generating 5 new items...`);
      const existing = readJSON(filename);
      const newItems = await generateItems(category, existing, 5);
      console.log(
        `[${category}] Generated: ${newItems.map((i) => i.slug).join(", ")}`
      );
      existing.push(...newItems);
      writeJSON(filename, existing);
      console.log(`[${category}] Total items: ${existing.length}\n`);

      // Rate limit pause between categories
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error(`\n❌ Generation failed: ${err.message}`);
    console.log("Restoring data files from backup...");
    for (const [fp, content] of Object.entries(backups)) {
      fs.writeFileSync(fp, content);
    }
    console.log("Data files restored to pre-generation state.");
    throw err;
  }

  console.log("✅ All categories updated.\n");

  // Cross-category slug deduplication — all 5 files share the /item/<slug> route
  const globalSlugs = new Map(); // slug → category name
  let totalRenames = 0;
  for (const [category, filename] of Object.entries(FILES)) {
    const items = readJSON(filename);
    let dirty = false;
    for (let idx = 0; idx < items.length; idx++) {
      const slug = items[idx].slug;
      if (globalSlugs.has(slug)) {
        const owner = globalSlugs.get(slug);
        const newSlug = `${category.replace(/s$/, "")}-${slug}`;
        console.warn(`  ⚠ Cross-category slug collision: "${slug}" (${category} vs ${owner}) → renamed to "${newSlug}"`);
        items[idx].slug = newSlug;
        dirty = true;
        totalRenames++;
      }
      globalSlugs.set(items[idx].slug, category);
    }
    if (dirty) {
      writeJSON(filename, items);
    }
  }
  if (totalRenames > 0) {
    console.log(`Fixed ${totalRenames} cross-category slug collision(s).`);
  }

  // Auto-apply Amazon affiliate links and directAmazonUrl to all products
  // Prefer direct /dp/ASIN URLs (valid ASINs land on the specific product page).
  // Fall back to search URLs when ASIN is missing or invalid.
  const AMAZON_TAG = process.env.AMAZON_AFFILIATE_TAG || "vaultvibe-20";
  const productsFile = path.join(DATA_DIR, "products.json");
  const allProducts = JSON.parse(fs.readFileSync(productsFile, "utf8"));

  const ASIN_REGEX = /^[A-Z0-9]{10}$/;
  const AMAZON_UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  async function asinIsValid(asin) {
    if (!ASIN_REGEX.test(asin)) return false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`https://www.amazon.com/dp/${asin}`, {
        method: "GET",
        signal: ctrl.signal,
        redirect: "follow",
        headers: { "User-Agent": AMAZON_UA },
      });
      clearTimeout(timer);
      if (res.status >= 400) return false;
      // Amazon returns 200 for both valid products and its "didn't find that page" screen.
      // Check the HTML for the not-found marker.
      const text = await res.text();
      if (/Looking for something\?|Page Not Found|dogsofamazon/i.test(text)) return false;
      return true;
    } catch {
      return false;
    }
  }

  let affiliateCount = 0;
  let skippedDtc = 0;
  let asinDirectCount = 0;
  for (const p of allProducts) {
    // Skip products explicitly flagged as not on Amazon
    if (p.availableOnAmazon === false) {
      skippedDtc++;
      continue;
    }
    const query = encodeURIComponent(p.title);
    const searchUrl = `https://www.amazon.com/s?k=${query}&tag=${AMAZON_TAG}`;

    // If Gemini returned an ASIN and it's a new product (no existing affiliate),
    // try to validate it and use a direct /dp/ URL.
    let directUrl = null;
    if (p.amazonAsin && (!p.affiliate || !p.affiliate.enabled)) {
      const valid = await asinIsValid(p.amazonAsin);
      if (valid) {
        directUrl = `https://www.amazon.com/dp/${p.amazonAsin}?tag=${AMAZON_TAG}&linkCode=ll1`;
        asinDirectCount++;
      } else {
        console.warn(`  ⚠ Invalid ASIN for "${p.title}": ${p.amazonAsin} — falling back to search`);
        delete p.amazonAsin;
      }
    }

    const amazonUrl = directUrl || searchUrl;
    // Always set directAmazonUrl (explicit field for rendering)
    if (!p.directAmazonUrl) {
      p.directAmazonUrl = amazonUrl;
    }
    if (!p.affiliate || !p.affiliate.enabled) {
      p.affiliate = {
        enabled: true,
        provider: "amazon",
        url: amazonUrl,
      };
      affiliateCount++;
    }
  }
  if (asinDirectCount > 0) {
    console.log(`🎯 Direct /dp/ASIN URLs applied to ${asinDirectCount} products.`);
  }
  if (skippedDtc > 0) {
    console.log(`⏭️  Skipped ${skippedDtc} DTC-only products (not on Amazon).`);
  }
  // Auto-apply Best Buy search URLs to electronics/appliance products
  const BESTBUY_CATEGORIES = [
    "audio", "speaker", "headphone", "earbuds", "wearable", "smart home",
    "gaming", "camera", "drone", "photo", "electronics", "tech", "fitness",
    "home office", "productivity", "security", "monitor", "display",
    "kitchen", "appliance", "health", "wellness", "pet", "outdoor",
    "camping", "charger", "satellite", "fashion tech", "entertainment",
    "personal care", "sustainability", "gift", "garden", "beauty"
  ];
  let bestBuyCount = 0;
  for (const p of allProducts) {
    if (p.bestBuyUrl) continue;
    const combined = `${p.category} ${p.title}`.toLowerCase();
    const isElectronics = BESTBUY_CATEGORIES.some((kw) => combined.includes(kw));
    if (isElectronics) {
      const query = encodeURIComponent(p.title);
      p.bestBuyUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`;
      bestBuyCount++;
    }
  }

  writeJsonSafe(productsFile, allProducts);
  if (affiliateCount > 0) {
    console.log(`🔗 Applied Amazon affiliate links to ${affiliateCount} products.`);
  }
  if (bestBuyCount > 0) {
    console.log(`🏬 Applied Best Buy search URLs to ${bestBuyCount} products.`);
  }
}

main().catch((err) => {
  log.error('Generation failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
