const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

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

function readJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf8"));
}

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
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
      const is503 = err.message && (err.message.includes("503") || err.message.includes("UNAVAILABLE") || err.message.includes("high demand"));
      const is429 = err.message && (err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED"));
      if ((is503 || is429) && attempt < maxRetries) {
        const delay = attempt * 15000; // 15s, 30s, 45s
        console.log(`  ⏳ Retry ${attempt}/${maxRetries} in ${delay / 1000}s (${is503 ? "capacity" : "rate limit"})...`);
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
  "websiteLink": "<real working URL>",
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
  "websiteLink": "<real working URL>",
  "type": "tool"
}`,
  };

  const categoryPrompts = {
    discoveries:
      "Find 3 genuinely fascinating, surprising real-world facts, scientific discoveries, or historical revelations. Prioritize recent findings from the last month but timeless mind-blowing facts work too.",
    products:
      "Find 3 real, currently available consumer products that are trending or newly launched. They must be real products you can actually buy. Include accurate pricing.",
    "hidden-gems":
      "Find 3 real, lesser-known websites or web tools that are genuinely useful. They must have real, working URLs. Focus on tools most people haven't heard of.",
    "future-radar":
      "Find 3 real emerging technologies that have had recent milestones or breakthroughs. Focus on concrete developments, not speculation.",
    "daily-tools":
      "Find 3 real, useful everyday tools or apps with working URLs. Focus on well-regarded tools that help with productivity, creativity, or daily life.",
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

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })
  );

  const text = response.text.trim();
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  const items = JSON.parse(cleaned);

  // Assign IDs and de-duplicate slugs (append suffix instead of skipping)
  let nextId = getNextId(existingItems);
  const validItems = [];
  for (const item of items) {
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
  }

  return validItems;
}

async function main() {
  console.log(`\n📰 Generating daily content for ${today}\n`);

  for (const [category, filename] of Object.entries(FILES)) {
    console.log(`[${category}] Generating 3 new items...`);
    const existing = readJSON(filename);
    const newItems = await generateItems(category, existing, 3);
    console.log(
      `[${category}] Generated: ${newItems.map((i) => i.slug).join(", ")}`
    );
    existing.push(...newItems);
    writeJSON(filename, existing);
    console.log(`[${category}] Total items: ${existing.length}\n`);

    // Rate limit pause between categories
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("✅ All categories updated.\n");
}

main().catch((err) => {
  console.error("❌ Generation failed:", err.message);
  process.exit(1);
});
