/**
 * Bulk content generator — adds items WITHOUT removing any.
 * Usage: GEMINI_API_KEY=xxx AMAZON_AFFILIATE_TAG=xxx node scripts/bulk-generate-content.js <items-per-category>
 * Default: 60 items per category (in batches of 3)
 */
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Use gemini-2.5-flash (separate quota pool from flash-lite used by daily workflow)
const MODEL = "gemini-2.5-flash";
const DATA_DIR = path.join(__dirname, "..", "data");
const today = new Date().toISOString().split("T")[0];

const TARGET = parseInt(process.argv[2] || "12", 10);
const BATCH_SIZE = 3;
const BATCHES = Math.ceil(TARGET / BATCH_SIZE);

const FILES = {
  discoveries: "discoveries.json",
  products: "products.json",
  "hidden-gems": "hidden-gems.json",
  "future-radar": "future-radar.json",
  "daily-tools": "daily-tools.json",
};

function readJSON(f) { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")); }
function writeJSON(f, d) { fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2)); }
function getNextId(items) { return Math.max(...items.map(i => i.id || 0), 0) + 1; }
function getExistingSlugs(items) { return new Set(items.map(i => i.slug)); }

async function callWithRetry(fn, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err) {
      const retriable = err.message && (err.message.includes("503") || err.message.includes("429") || err.message.includes("UNAVAILABLE") || err.message.includes("RESOURCE_EXHAUSTED") || err.message.includes("high demand"));
      if (retriable && attempt < maxRetries) {
        // Longer delays to respect rate limits: 30s, 60s, 90s, 120s
        const delay = attempt * 30000;
        console.log(`    ⏳ Retry ${attempt}/${maxRetries} in ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else throw err;
    }
  }
}

const schemas = {
  discoveries: `{"id":<num>,"slug":"<kebab>","title":"<50-80 chars>","shortDescription":"<2-3 sentences>","category":"<Science|Nature|History|Technology|Psychology|Culture|Global|Statistics|Innovation|Space>","whyItIsInteresting":"<2-3 sentences>","imageIdea":"<concrete visual>","sourceLink":"<real URL to a real article or Wikipedia page about this topic>","type":"discovery"}`,
  products: `{"id":<num>,"slug":"<kebab>","title":"<product name>","shortDescription":"<2-3 sentences>","category":"<category>","whyItIsInteresting":"<2-3 sentences>","imageIdea":"<visual>","sourceLink":"<real product page URL>","estimatedPriceRange":"<e.g. $299-$349>","type":"product"}`,
  "hidden-gems": `{"id":<num>,"slug":"<kebab>","name":"<tool name>","whatItDoes":"<2-3 sentences>","category":"<Design|Productivity|Education|Finance|Developer|Writing|Health|Entertainment|Social|Reference>","whyItIsUseful":"<2-3 sentences>","imageIdea":"<visual>","websiteLink":"<REAL working URL e.g. https://obsidian.md>","type":"hidden-gem"}`,
  "future-radar": `{"id":<num>,"slug":"<kebab>","techName":"<name>","explanation":"<2-3 sentences>","industry":"<industry>","whyItMatters":"<2-3 sentences>","developmentStage":"<Research|Prototype|Early Adoption|Early Commercialization|Growth|Mainstream>","imageIdea":"<visual>","type":"future-tech"}`,
  "daily-tools": `{"id":<num>,"slug":"<kebab>","toolName":"<tool name>","whatItDoes":"<2-3 sentences>","category":"<Productivity|Design|Developer|Writing|Finance|Health|Education|Entertainment|Social|Reference>","whyItIsUseful":"<2-3 sentences>","imageIdea":"<visual>","websiteLink":"<REAL working URL>","type":"tool"}`,
};

async function generateBatch(category, existingItems, count) {
  const existingSlugs = getExistingSlugs(existingItems);
  const recentTitles = existingItems.slice(-50).map(i => i.title || i.name || i.toolName || i.techName).join(", ");

  const prompt = `Generate exactly ${count} unique ${category.replace("-", " ")} items as a JSON array.
Each item must follow this schema: ${schemas[category]}

CRITICAL RULES:
- Every item MUST be unique — different from these existing items: ${recentTitles}
- sourceLink/websiteLink MUST be real, working URLs (Wikipedia, official sites, product pages)
- For hidden-gems and daily-tools: websiteLink must be the REAL website URL of the actual tool
- For products: sourceLink should be a real product review or official product page URL
- Vary categories/industries widely — don't cluster in one topic
- slug must be kebab-case, derived from the title/name
- Return ONLY the JSON array, no markdown fences`;

  const response = await callWithRetry(() =>
    ai.models.generateContent({ model: MODEL, contents: prompt })
  );

  const text = response.text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  const items = JSON.parse(text);

  let nextId = getNextId(existingItems);
  const valid = [];
  for (const item of items) {
    if (existingSlugs.has(item.slug)) {
      let suffix = 2;
      const base = item.slug;
      while (existingSlugs.has(`${base}-${suffix}`)) suffix++;
      item.slug = `${base}-${suffix}`;
    }
    item.id = nextId++;
    item.dateAdded = today;
    valid.push(item);
    existingSlugs.add(item.slug);
    existingItems.push(item); // keep in memory for next batch dedup
  }
  return valid;
}

async function main() {
  console.log(`\n📦 Bulk generating ${TARGET} items per category (${BATCHES} batches of ${BATCH_SIZE})\n`);

  for (const [category, filename] of Object.entries(FILES)) {
    const items = readJSON(filename);
    const startCount = items.length;
    let generated = 0;

    for (let b = 1; b <= BATCHES && generated < TARGET; b++) {
      const remaining = Math.min(BATCH_SIZE, TARGET - generated);
      process.stdout.write(`  [${category}] Batch ${b}/${BATCHES}... `);
      try {
        const newItems = await generateBatch(category, items, remaining);
        generated += newItems.length;
        console.log(`+${newItems.length} (total: ${items.length})`);
      } catch (err) {
        console.log(`FAILED: ${err.message}`);
      }
      // Rate limit: 8s between batches within a category
      if (b < BATCHES) await new Promise(r => setTimeout(r, 8000));
    }

    writeJSON(filename, items);
    console.log(`  [${category}] ${startCount} → ${items.length} items ✓\n`);

    // 6s pause between categories
    await new Promise(r => setTimeout(r, 6000));
  }

  // Fix any missing fields (Gemini sometimes omits them)
  const typeMap = {
    "discoveries.json": "discovery",
    "products.json": "product",
    "hidden-gems.json": "hidden-gem",
    "future-radar.json": "future-tech",
    "daily-tools.json": "tool",
  };
  const requiredFields = {
    "discoveries.json": ["type", "slug", "title", "shortDescription", "category", "whyItIsInteresting"],
    "products.json": ["type", "slug", "title", "shortDescription", "category", "whyItIsInteresting", "estimatedPriceRange"],
    "hidden-gems.json": ["type", "slug", "name", "whatItDoes", "category", "whyItIsUseful"],
    "future-radar.json": ["type", "slug", "techName", "explanation", "industry", "whyItMatters", "developmentStage"],
    "daily-tools.json": ["type", "slug", "toolName", "whatItDoes", "category", "whyItIsUseful"],
  };
  let totalFixed = 0;
  for (const [file, expectedType] of Object.entries(typeMap)) {
    const items = readJSON(file);
    const fields = requiredFields[file] || [];
    const validItems = items.filter(item => {
      if (!item.type) { item.type = expectedType; totalFixed++; }
      // Remove items missing critical fields that can't be auto-filled
      for (const f of fields) {
        if (!item[f] || (typeof item[f] === 'string' && item[f].trim() === '')) {
          if (f === 'type') continue; // already fixed above
          console.log(`    ⚠️ Removing ${item.slug || item.id} — missing '${f}'`);
          return false;
        }
      }
      return true;
    });
    writeJSON(file, validItems);
    if (validItems.length < items.length) {
      console.log(`  [${file}] Removed ${items.length - validItems.length} invalid items`);
    }
  }
  if (totalFixed > 0) console.log(`🔧 Fixed ${totalFixed} items missing 'type' field`);

  // Apply Amazon affiliate links to all products
  const TAG = process.env.AMAZON_AFFILIATE_TAG || "vaultvibe-20";
  const products = readJSON("products.json");
  let affCount = 0;
  for (const p of products) {
    const q = encodeURIComponent(p.title);
    const url = `https://www.amazon.com/s?k=${q}&tag=${TAG}`;
    if (!p.directAmazonUrl) { p.directAmazonUrl = url; }
    if (!p.affiliate || !p.affiliate.enabled) {
      p.affiliate = { enabled: true, provider: "amazon", url };
      affCount++;
    }
  }
  writeJSON("products.json", products);
  console.log(`🔗 Applied affiliate links to ${affCount} new products`);
  console.log(`\n✅ Bulk generation complete.\n`);
}

main().catch(err => { console.error("❌ Failed:", err.message); process.exit(1); });
