/**
 * Bulk content generator — generates items until each category reaches TARGET_PER_CATEGORY.
 * Produces RICH, fact-dense content: 5-7 sentence descriptions with use cases.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/bulk-generate-content.js [target-per-category]
 *   Default target: 500 per category
 *
 * Optional single-category run:
 *   GEMINI_API_KEY=xxx node scripts/bulk-generate-content.js 500 products
 */
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// gemini-2.5-flash confirmed working with this key
const MODEL = "gemini-2.5-flash";
const DATA_DIR = path.join(__dirname, "..", "data");
const today = new Date().toISOString().split("T")[0];

// --- CLI args ---
const TARGET_PER_CATEGORY = parseInt(process.argv[2] || "500", 10);
const ONLY_CATEGORY = process.argv[3] || null; // optional: "products", "discoveries", etc.
const BATCH_SIZE = 10; // smaller batches = less likely to hit payload/timeout limits

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

async function callWithRetry(fn, maxRetries = 6) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err) {
      const msg = (err.message || "") + (err.cause?.message || "");
      // 404 = wrong model name — never retry, fail immediately
      if (msg.includes("404") || msg.includes("not found") || msg.includes("no longer available")) throw err;
      // Catch both HTTP-level rate limits AND network-level fetch failures
      const retriable = msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE")
        || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("high demand") || msg.includes("overloaded")
        || msg.includes("fetch failed") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")
        || msg.includes("socket hang up") || msg.toLowerCase().includes("network");
      if (retriable && attempt < maxRetries) {
        const delay = attempt * 30000; // 30s, 60s, 90s, 120s, 150s
        console.log(`    ⏳ Retry ${attempt}/${maxRetries} in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

// ─── Rich schemas — 5-7 sentences per field, use-cases included ──────────────

const schemas = {
  discoveries: `{
  "id": <number — assign sequentially>,
  "slug": "<kebab-case from title, max 8 words>",
  "title": "<60-90 chars — specific, compelling, fact-forward — NOT clickbait>",
  "shortDescription": "<EXACTLY 4-5 sentences: (1) State the discovery clearly and name the research team or institution. (2) Describe what was found or measured, including a specific number or statistic. (3) Explain the methodology briefly (how they found it). (4) Give one surprising or counterintuitive implication. (5) Optionally name the journal or publication date.>",
  "category": "<Science | Nature | History | Technology | Psychology | Culture | Global | Statistics | Innovation | Space>",
  "whyItIsInteresting": "<EXACTLY 5-7 sentences: (1) Explain why experts were surprised or why this matters beyond the lab. (2) What prior understanding does it overturn or confirm? (3) Describe a concrete real-world application or consequence within 5-10 years. (4) Give an analogy that makes the concept click for a non-expert. (5) Mention who benefits most (patients, engineers, policymakers, everyday people). (6) Include one thought-provoking question this raises. (7) Optional: contrast with a related discovery or competing theory.>",
  "imageIdea": "<concrete visual noun phrase — e.g. 'deep sea bioluminescent jellyfish underwater'>",
  "sourceLink": "<real URL to the published study, university press release, or reputable science journalism article>",
  "type": "discovery"
}`,

  products: `{
  "id": <number — assign sequentially>,
  "slug": "<kebab-case from product name, max 8 words>",
  "title": "<exact brand + model name — e.g. 'Peak Design Everyday Backpack 30L V2'>",
  "shortDescription": "<EXACTLY 4-5 sentences: (1) Introduce the product by full name and brand, and what it is. (2) Describe its single most important feature with a specific spec or measurement. (3) Name a specific use case — who this is for and what problem it solves. (4) Mention one more differentiating feature (material, compatibility, certification, etc.). (5) Note the form factor or what's in the box.>",
  "category": "<Fitness | Kitchen | Tech | Home | Office | Travel | Outdoor | Wellness | Productivity | Fashion | Pet | Beauty | Gaming | Audio | Sleep | Photography | Sustainability | Education | Kids | Safety>",
  "whyItIsInteresting": "<EXACTLY 5-7 sentences: (1) Lead with the core problem this product eliminates better than competitors. (2) Cite at least one specific number — battery hours, weight savings, temperature range, lumens, etc. (3) Describe a vivid real-world scenario of someone using it (e.g. 'The freelancer who takes calls from coffee shops...'). (4) Compare it to the obvious alternative and explain what this does better. (5) Mention any awards, ratings, or professional endorsements (real, not invented). (6) Explain the value equation at its price point. (7) Note any recurring cost, subscription, or accessory ecosystem.>",
  "imageIdea": "<concrete visual — e.g. 'ergonomic office chair home desk setup'>",
  "sourceLink": "<real URL to product's official page or a reputable review>",
  "estimatedPriceRange": "<e.g. '$49–$79' — use real market price>",
  "availableOnAmazon": <true if this product is sold on amazon.com, else false>,
  "amazonAsin": "<10-character ASIN if you are confident this exact SKU is on amazon.com, e.g. 'B09G9FPHY6' — leave empty string '' if not certain>",
  "type": "product"
}`,

  "hidden-gems": `{
  "id": <number — assign sequentially>,
  "slug": "<kebab-case from tool name, max 8 words>",
  "name": "<official tool name as it appears on its homepage>",
  "whatItDoes": "<EXACTLY 4-5 sentences: (1) State what the tool is and who made it (individual, startup, open-source project). (2) Describe the core feature in plain English. (3) Explain the primary user it was built for. (4) Describe how it fits into a workflow — what triggers someone to open it? (5) Mention any integrations or platforms it works with.>",
  "category": "<Design | Productivity | Education | Finance | Developer | Writing | Health | Entertainment | Social | Reference | Research | Communication | AI | Data | Security>",
  "whyItIsUseful": "<EXACTLY 5-7 sentences: (1) Name the mainstream tool it replaces or complements, and why this is better for a specific use case. (2) Describe use case #1 with a specific persona (e.g. 'For the UX designer who...'). (3) Describe use case #2 with a different persona. (4) Mention what's free vs. paid (or if it's fully free/open-source). (5) Highlight a feature most people don't discover until month two. (6) Explain why it's not more popular despite being genuinely excellent. (7) Note any community, plugin ecosystem, or update cadence.>",
  "imageIdea": "<concrete visual representing the tool's purpose — e.g. 'minimalist text editor dark mode'>",
  "websiteLink": "<REAL, working URL — e.g. https://excalidraw.com — verify this is the correct domain>",
  "type": "hidden-gem"
}`,

  "future-radar": `{
  "id": <number — assign sequentially>,
  "slug": "<kebab-case from tech name, max 8 words>",
  "techName": "<specific technology name — not generic; e.g. 'Solid-State Lithium-Metal Batteries' not 'Better Batteries'>",
  "explanation": "<EXACTLY 4-5 sentences: (1) Define the technology in plain language and its underlying mechanism. (2) Name the key organizations or research labs actively working on it. (3) Describe where it currently stands in development (lab stage, clinical trials, early commercial pilots). (4) Give a specific milestone reached recently (date, measurement, publication). (5) Compare to the current incumbent technology it would replace.>",
  "industry": "<Energy | Healthcare | Transportation | Manufacturing | Agriculture | Computing | Finance | Construction | Defense | Retail | Food | Climate | Space | Education | Entertainment>",
  "whyItMatters": "<EXACTLY 5-7 sentences: (1) Describe the problem this technology solves at scale — use numbers (market size, lives affected, CO2 reduced). (2) Paint a specific scenario of what everyday life looks like when this is mainstream. (3) Identify who wins and who loses if this succeeds commercially. (4) Explain the main technical or regulatory barriers still standing in the way. (5) Give a realistic timeline based on current development velocity. (6) Note which companies or countries are racing to dominate this space. (7) Pose a second-order consequence most people haven't considered.>",
  "developmentStage": "<Early Research | Advanced Research | Prototype | Early Commercialization | Growth Phase>",
  "imageIdea": "<concrete visual representing the technology — e.g. 'solid state battery cross-section microscope'>",
  "type": "future-tech"
}`,

  "daily-tools": `{
  "id": <number — assign sequentially>,
  "slug": "<kebab-case from tool name, max 8 words>",
  "toolName": "<official tool name as it appears on its homepage>",
  "whatItDoes": "<EXACTLY 4-5 sentences: (1) State what the tool is, who made it, and its core function. (2) Describe the primary workflow it supports. (3) Name the platforms it works on (web, iOS, Android, Windows, Mac, browser extension, etc.). (4) Mention the most used feature in one concrete sentence. (5) Describe how it handles data — cloud sync, local, open-source, etc.>",
  "category": "<Productivity | Design | Developer | Writing | Finance | Health | Education | Entertainment | Social | Reference | AI | Communication | Research | Data | Automation>",
  "whyItIsUseful": "<EXACTLY 5-7 sentences: (1) Name the problem it eliminates — specifically and concretely. (2) Describe a specific daily use case for persona A (e.g. 'For the freelance writer who...'). (3) Describe a specific daily use case for persona B (a different role). (4) Explain the pricing — is the free tier genuinely useful, or is it a paywall tease? (5) Compare to the most obvious competitor and explain where this wins. (6) Mention any power feature that separates advanced users from beginners. (7) Note the learning curve — can a non-technical person set it up in under 5 minutes?>>",
  "imageIdea": "<concrete visual representing the tool — e.g. 'productivity app calendar dashboard interface'>",
  "websiteLink": "<REAL, working URL — e.g. https://notion.so — verify this is the correct domain>",
  "type": "tool"
}`,
};

// Category variety hints — injected into prompts to avoid topical clustering
const VARIETY_HINTS = {
  discoveries: [
    "marine biology, deep ocean", "materials science, metamaterials", "cognitive psychology, memory",
    "ancient civilizations, archaeology", "astrophysics, dark matter", "ecology, rewilding",
    "genetics, epigenetics", "climate science, ocean currents", "mathematics, topology",
    "virology, phage therapy", "neuroscience, neuroplasticity", "particle physics, quantum",
    "geology, plate tectonics", "evolutionary biology, convergent evolution", "acoustics, infrasound",
    "statistics, counterintuitive probability", "chemistry, catalysis", "animal cognition, social behavior",
  ],
  products: [
    "kitchen gadgets, sous vide, fermentation", "sleep optimization, light therapy, sleep tracking",
    "home gym, resistance training", "travel accessories, packing cubes, organizers",
    "outdoor survival, camping, hiking", "desk setup, ergonomics, cable management",
    "pet health and enrichment", "photography and videography", "sustainability, zero-waste",
    "personal care, skincare, grooming", "audio, speakers, headphones, earbuds",
    "smart home automation", "gaming peripherals", "kids learning and creativity",
    "wellness and recovery tools", "food and beverage, specialty coffee, tea",
    "office productivity, writing tools, notebooks", "vehicle accessories, car care",
  ],
  "hidden-gems": [
    "design and prototyping tools", "writing and note-taking apps", "data visualization",
    "developer productivity, CLI tools", "AI writing assistants", "research tools, literature review",
    "personal finance tracking", "habit and goal tracking", "open-source alternatives to paid tools",
    "browser extensions that save hours", "collaboration tools for remote teams",
    "learning and skill development platforms", "audio and podcast tools",
    "email productivity, inbox management", "project management for individuals",
  ],
  "future-radar": [
    "energy storage, grid-scale batteries", "synthetic biology, gene circuits",
    "quantum computing, error correction", "nuclear fusion, compact reactors",
    "brain-computer interfaces", "carbon capture, direct air capture",
    "autonomous vehicles, robotaxi", "advanced materials, 2D materials",
    "precision fermentation, cellular agriculture", "spatial computing, AR glasses",
    "longevity science, senolytics", "neuromorphic computing",
    "photonic chips, optical computing", "lab-grown organs, bioprinting",
    "thorium reactors, next-gen nuclear", "stratospheric aerosol injection, geoengineering",
  ],
  "daily-tools": [
    "AI writing assistants and editors", "personal knowledge management",
    "time tracking and invoicing", "password and security managers",
    "focus and pomodoro tools", "budget and expense tracking",
    "meal planning and nutrition", "habit tracking and streaks",
    "code snippet managers", "clipboard managers and launchers",
    "bookmark managers and read-later", "mind mapping and brainstorming",
    "screen recording and annotation", "font and design asset tools",
    "email templates and signatures",
  ],
};

async function generateBatch(category, existingItems, count, hintIndex) {
  const existingSlugs = getExistingSlugs(existingItems);

  // Use last 60 titles to avoid duplication, but sample from across the list for diversity
  const allTitles = existingItems.map(i => i.title || i.name || i.toolName || i.techName);
  const recentTitles = [
    ...allTitles.slice(-30),
    ...allTitles.slice(0, 10),
  ].filter(Boolean).join(", ");

  // Pick variety hint
  const hints = VARIETY_HINTS[category] || [];
  const hint = hints.length > 0 ? hints[hintIndex % hints.length] : "";
  const hintNote = hint ? `\nThematic focus for this batch: ${hint} (while still varying within the batch)` : "";

  const prompt = `You are a content curator writing for Surfaced — a daily discovery platform. Generate exactly ${count} unique, high-quality ${category.replace(/-/g, " ")} items as a JSON array. Each item must be genuinely interesting and specific — not generic filler.

Schema for each item:
${schemas[category]}

CONTENT RULES:
- RICH descriptions: follow the sentence counts in the schema exactly — no shorter.
- SPECIFIC and FACTUAL: include real names, real numbers, real URLs. Never make up statistics.
- ENGAGING: each item should make a curious person stop scrolling.
- VARIED: cover different subcategories and angles — don't cluster items on the same topic.${hintNote}

DEDUPLICATION RULES:
- NEVER duplicate any of these existing items (titles or slugs): ${recentTitles}
- Each slug must be unique kebab-case, max 8 words.

OUTPUT: Return ONLY the raw JSON array. No markdown code fences, no explanations, no trailing text.`;

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { temperature: 0.85 },
    })
  );

  let text = response.text.trim();
  // Strip markdown fences if model adds them anyway
  text = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();

  let items;
  try {
    items = JSON.parse(text);
  } catch {
    // Try to extract array from partial JSON
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      items = JSON.parse(match[0]);
    } else {
      throw new Error(`JSON parse failed. Response: ${text.slice(0, 200)}`);
    }
  }

  if (!Array.isArray(items)) throw new Error("Response was not a JSON array");

  let nextId = getNextId(existingItems);
  const valid = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    // Ensure required fields exist
    const required = {
      discoveries: ["slug", "title", "shortDescription", "whyItIsInteresting", "category", "type"],
      products: ["slug", "title", "shortDescription", "whyItIsInteresting", "category", "estimatedPriceRange", "type"],
      "hidden-gems": ["slug", "name", "whatItDoes", "whyItIsUseful", "category", "websiteLink", "type"],
      "future-radar": ["slug", "techName", "explanation", "whyItMatters", "industry", "developmentStage", "type"],
      "daily-tools": ["slug", "toolName", "whatItDoes", "whyItIsUseful", "category", "websiteLink", "type"],
    };
    const missing = (required[category] || []).filter(f => !item[f] || String(item[f]).trim() === "");
    if (missing.length > 0) {
      console.log(`    ⚠️  Skipping item missing fields: ${missing.join(", ")}`);
      continue;
    }

    // Enforce correct type
    const typeMap = { discoveries: "discovery", products: "product", "hidden-gems": "hidden-gem", "future-radar": "future-tech", "daily-tools": "tool" };
    item.type = typeMap[category];

    // Deduplicate slug
    if (existingSlugs.has(item.slug)) {
      let suffix = 2;
      const base = item.slug.replace(/-\d+$/, ""); // strip existing suffix
      while (existingSlugs.has(`${base}-${suffix}`)) suffix++;
      item.slug = `${base}-${suffix}`;
    }

    item.id = nextId++;
    item.dateAdded = today;

    // Remove placeholder id from schema (Gemini might set it to 0 or <num>)
    valid.push(item);
    existingSlugs.add(item.slug);
    existingItems.push(item); // keep in memory for next batch dedup
  }
  return valid;
}

async function applyAffiliateLinks() {
  const TAG = process.env.AMAZON_AFFILIATE_TAG || "vaultvibe-20";
  const products = readJSON("products.json");
  let affCount = 0;
  let bbCount = 0;

  for (const p of products) {
    // Amazon affiliate URL — use ASIN if we have it, else keyword search
    if (!p.directAmazonUrl || !p.directAmazonUrl.includes("amazon.com")) {
      const url = p.amazonAsin
        ? `https://www.amazon.com/dp/${p.amazonAsin}?tag=${TAG}&linkCode=ll1`
        : `https://www.amazon.com/s?k=${encodeURIComponent(p.title)}&tag=${TAG}`;
      p.directAmazonUrl = url;
    }
    if (!p.affiliate || !p.affiliate.enabled) {
      p.affiliate = {
        enabled: true,
        provider: "amazon",
        url: p.directAmazonUrl,
      };
      affCount++;
    }

    // Best Buy search for relevant categories
    const BB_KEYWORDS = [
      "audio", "speaker", "headphone", "earbud", "wearable", "smart home",
      "gaming", "camera", "drone", "photo", "electronics", "tech", "fitness",
      "home office", "productivity", "security", "monitor", "display",
      "kitchen", "appliance", "health", "wellness", "pet", "outdoor",
      "camping", "charger", "satellite", "entertainment", "personal care",
      "sustainability", "gift", "garden", "beauty", "sleep", "lighting",
    ];
    if (!p.bestBuyUrl) {
      const combined = `${p.category} ${p.title}`.toLowerCase();
      if (BB_KEYWORDS.some(kw => combined.includes(kw))) {
        p.bestBuyUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(p.title)}`;
        bbCount++;
      }
    }
  }

  writeJSON("products.json", products);
  console.log(`  🔗 Amazon affiliate links applied to ${affCount} new products`);
  if (bbCount > 0) console.log(`  🏬 Best Buy search URLs added to ${bbCount} products`);
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY environment variable is required.");
    process.exit(1);
  }

  const categoriesToRun = ONLY_CATEGORY
    ? Object.entries(FILES).filter(([k]) => k === ONLY_CATEGORY)
    : Object.entries(FILES);

  if (categoriesToRun.length === 0) {
    console.error(`❌ Unknown category: ${ONLY_CATEGORY}. Valid: ${Object.keys(FILES).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🚀 Bulk content generator — target: ${TARGET_PER_CATEGORY} items per category`);
  console.log(`   Batch size: ${BATCH_SIZE} | Model: ${MODEL}`);
  if (ONLY_CATEGORY) console.log(`   Category filter: ${ONLY_CATEGORY}`);
  console.log();

  let grandTotal = 0;

  for (const [category, filename] of categoriesToRun) {
    const items = readJSON(filename);
    const startCount = items.length;
    const needed = Math.max(0, TARGET_PER_CATEGORY - startCount);

    if (needed === 0) {
      console.log(`✅ [${category}] Already at ${startCount} items — skipping.\n`);
      continue;
    }

    const batches = Math.ceil(needed / BATCH_SIZE);
    console.log(`📦 [${category}] ${startCount} → ${TARGET_PER_CATEGORY} (+${needed} needed, ${batches} batches)\n`);

    let generated = 0;
    let hintIndex = 0;

    for (let b = 1; b <= batches && generated < needed; b++) {
      const batchCount = Math.min(BATCH_SIZE, needed - generated);
      process.stdout.write(`  Batch ${b}/${batches} (${batchCount} items)... `);

      try {
        const newItems = await generateBatch(category, items, batchCount, hintIndex++);
        generated += newItems.length;
        console.log(`✓ +${newItems.length}  (total in memory: ${items.length})`);
      } catch (err) {
        console.log(`FAILED: ${err.message.slice(0, 100)}`);
      }

      // Write after every batch to preserve progress
      writeJSON(filename, items);

      // Respectful pacing: 12s normally, 30s every 5 batches to let quota recover
      if (b < batches) {
        const delay = b % 5 === 0 ? 30000 : 12000;
        await new Promise(r => setTimeout(r, delay));
      }
    }

    writeJSON(filename, items);
    grandTotal += items.length - startCount;
    console.log(`\n  ✅ [${category}] Done: ${startCount} → ${items.length} items (+${items.length - startCount})\n`);

    // Pause between categories
    if (categoriesToRun.indexOf([category, filename]) < categoriesToRun.length - 1) {
      await new Promise(r => setTimeout(r, 8000));
    }
  }

  // Apply affiliate links to all products
  console.log("🔗 Applying affiliate links to products...");
  await applyAffiliateLinks();

  // Validate — remove any items still missing required fields
  console.log("\n🔍 Validating all files...");
  const requiredFields = {
    "discoveries.json":   ["type", "slug", "title", "shortDescription", "category", "whyItIsInteresting"],
    "products.json":      ["type", "slug", "title", "shortDescription", "category", "whyItIsInteresting", "estimatedPriceRange"],
    "hidden-gems.json":   ["type", "slug", "name", "whatItDoes", "category", "whyItIsUseful", "websiteLink"],
    "future-radar.json":  ["type", "slug", "techName", "explanation", "industry", "whyItMatters", "developmentStage"],
    "daily-tools.json":   ["type", "slug", "toolName", "whatItDoes", "category", "whyItIsUseful", "websiteLink"],
  };
  const typeMap = {
    "discoveries.json": "discovery", "products.json": "product",
    "hidden-gems.json": "hidden-gem", "future-radar.json": "future-tech", "daily-tools.json": "tool",
  };
  for (const [file, expectedType] of Object.entries(typeMap)) {
    const allItems = readJSON(file);
    const fields = requiredFields[file] || [];
    const valid = allItems.filter(item => {
      if (!item.type) item.type = expectedType;
      return fields.every(f => item[f] && String(item[f]).trim() !== "");
    });
    const removed = allItems.length - valid.length;
    if (removed > 0) {
      writeJSON(file, valid);
      console.log(`  ⚠️  [${file}] Removed ${removed} invalid items`);
    } else {
      console.log(`  ✅ [${file}] All ${valid.length} items valid`);
    }
  }

  console.log(`\n🎉 Bulk generation complete — ${grandTotal} new items added across all categories.\n`);
  console.log("Next steps:");
  console.log("  1. node scripts/fetch-images.ts     (fetch images for new items)");
  console.log("  2. node scripts/assign-badges.js     (apply editorial badges)");
  console.log("  3. npm run build                     (rebuild static site)");
  console.log();
}

main().catch(err => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
