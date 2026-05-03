/**
 * Enrich existing items with richer, fact-dense descriptions.
 * Targets items where shortDescription/whatItDoes is thin (< 220 chars).
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/enrich-existing-items.js [category]
 *   Default: enriches all categories
 *   Optional: pass "products", "discoveries", "hidden-gems", "future-radar", "daily-tools", "archive"
 *
 * Safe to re-run — only updates items below the character threshold.
 */
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.0-flash";
const DATA_DIR = path.join(__dirname, "..", "data");

const ONLY_CATEGORY = process.argv[2] || null;

// Items with a primary description field shorter than this get enriched
const THIN_THRESHOLD = 220; // chars
const BATCH_SIZE = 10; // items per Gemini call

const FILES = {
  discoveries: "discoveries.json",
  products: "products.json",
  "hidden-gems": "hidden-gems.json",
  "future-radar": "future-radar.json",
  "daily-tools": "daily-tools.json",
  archive: "archive.json",
};

const ARCHIVE_TYPE_TO_CATEGORY = {
  discovery: "discoveries",
  product: "products",
  "hidden-gem": "hidden-gems",
  "future-tech": "future-radar",
  tool: "daily-tools",
};

function readJSON(f) { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")); }
function writeJSON(f, d) { fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2)); }

// Get the primary description length for an item
function descLength(item) {
  const d = item.shortDescription || item.whatItDoes || item.explanation || "";
  return d.length;
}

// Get the "why" text length
function whyLength(item) {
  const w = item.whyItIsInteresting || item.whyItIsUseful || item.whyItMatters || "";
  return w.length;
}

// Is this item thin enough to need enrichment?
function isThin(item) {
  return descLength(item) < THIN_THRESHOLD || whyLength(item) < THIN_THRESHOLD;
}

async function callWithRetry(fn, maxRetries = 6) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err) {
      const msg = (err.message || "") + (err.cause?.message || "");
      const retriable = msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE")
        || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("high demand")
        || msg.includes("fetch failed") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")
        || msg.toLowerCase().includes("network");
      if (retriable && attempt < maxRetries) {
        const delay = attempt * 30000;
        console.log(`    ⏳ Retry ${attempt}/${maxRetries} in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else throw err;
    }
  }
}

// ─── Enrichment prompts per category ─────────────────────────────────────────

function buildPrompt(category, items) {
  const itemList = items.map((item, idx) => {
    let title, currentDesc, currentWhy;
    if (category === "discoveries") {
      title = item.title;
      currentDesc = item.shortDescription;
      currentWhy = item.whyItIsInteresting;
    } else if (category === "products") {
      title = item.title;
      currentDesc = item.shortDescription;
      currentWhy = item.whyItIsInteresting;
    } else if (category === "hidden-gems") {
      title = item.name;
      currentDesc = item.whatItDoes;
      currentWhy = item.whyItIsUseful;
    } else if (category === "future-radar") {
      title = item.techName;
      currentDesc = item.explanation;
      currentWhy = item.whyItMatters;
    } else {
      title = item.toolName;
      currentDesc = item.whatItDoes;
      currentWhy = item.whyItIsUseful;
    }
    return `[${idx}] "${title}" — current desc: "${currentDesc}" | current why: "${currentWhy}"`;
  }).join("\n");

  const fieldInstructions = {
    discoveries: {
      descField: "shortDescription",
      whyField: "whyItIsInteresting",
      descInstruction: "4-5 sentences: (1) State the discovery clearly, name the research team or institution. (2) Include a specific number or measurement. (3) Describe the methodology briefly. (4) Give one surprising implication. (5) Optionally cite the journal or date.",
      whyInstruction: "5-7 sentences: (1) Why experts were surprised. (2) What prior understanding it overturns. (3) A real-world application in 5-10 years. (4) An analogy for a non-expert. (5) Who benefits most. (6) A thought-provoking question it raises. (7) Optional contrast with a related theory.",
    },
    products: {
      descField: "shortDescription",
      whyField: "whyItIsInteresting",
      descInstruction: "4-5 sentences: (1) Introduce the product name and brand. (2) Its single most important feature with a specific spec. (3) A specific use case and who it's for. (4) One more differentiating feature. (5) Form factor or what's in the box.",
      whyInstruction: "5-7 sentences: (1) The core problem it eliminates. (2) At least one specific number (weight, hours, temp, etc.). (3) A vivid real-world user scenario. (4) How it compares to the obvious alternative. (5) Awards or professional endorsements if real. (6) The value at its price point. (7) Any recurring cost or accessory ecosystem.",
    },
    "hidden-gems": {
      descField: "whatItDoes",
      whyField: "whyItIsUseful",
      descInstruction: "4-5 sentences: (1) What the tool is and who made it. (2) The core feature in plain English. (3) The primary user it was built for. (4) How it fits into a workflow. (5) Any integrations or platforms.",
      whyInstruction: "5-7 sentences: (1) The mainstream tool it replaces and why this wins. (2) Use case with persona A. (3) Use case with persona B. (4) What's free vs. paid. (5) A feature most people discover late. (6) Why it's not more popular despite being excellent. (7) Community or update cadence.",
    },
    "future-radar": {
      descField: "explanation",
      whyField: "whyItMatters",
      descInstruction: "4-5 sentences: (1) Define the technology and its underlying mechanism. (2) Key organizations or labs working on it. (3) Current development stage. (4) A specific recent milestone (date, measurement). (5) What incumbent technology it would replace.",
      whyInstruction: "5-7 sentences: (1) The problem it solves at scale with numbers. (2) What everyday life looks like when mainstream. (3) Who wins and who loses commercially. (4) Main technical or regulatory barriers. (5) Realistic timeline. (6) Companies or countries racing to dominate. (7) A second-order consequence most haven't considered.",
    },
    "daily-tools": {
      descField: "whatItDoes",
      whyField: "whyItIsUseful",
      descInstruction: "4-5 sentences: (1) What the tool is, who made it, and its core function. (2) The primary workflow it supports. (3) Platforms (web, iOS, Android, etc.). (4) The most-used feature concretely. (5) How it handles data.",
      whyInstruction: "5-7 sentences: (1) The specific problem it eliminates. (2) Daily use case for persona A. (3) Daily use case for persona B. (4) The pricing model honestly. (5) Where it beats the obvious competitor. (6) A power feature for advanced users. (7) Learning curve assessment.",
    },
  };

  const fi = fieldInstructions[category];

  return `You are enriching content for Surfaced, a discovery platform. Below are ${items.length} existing items with thin descriptions. Rewrite ONLY their description fields — richer, more specific, more compelling. Preserve the item's topic and existing facts; ADD more detail, statistics, and concrete use cases.

Items to enrich:
${itemList}

For each item, return a JSON object with:
- "index": <the [idx] number from above>
- "${fi.descField}": "<${fi.descInstruction}>"
- "${fi.whyField}": "<${fi.whyInstruction}>"

Return a JSON array of ${items.length} objects (one per item). No markdown fences.`;
}

async function enrichBatch(category, items) {
  const prompt = buildPrompt(category, items);

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { temperature: 0.7 },
    })
  );

  let text = response.text.trim();
  text = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();

  let results;
  try {
    results = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) results = JSON.parse(match[0]);
    else throw new Error(`JSON parse failed. Preview: ${text.slice(0, 200)}`);
  }

  return results;
}

async function enrichCategory(category, filename) {
  const items = readJSON(filename);
  const thinItems = items.filter(isThin);

  if (thinItems.length === 0) {
    console.log(`  ✅ [${category}] All items already rich — nothing to enrich.\n`);
    return;
  }

  // Build a slug → index map for fast lookup
  const slugToIdx = new Map(items.map((item, i) => [item.slug, i]));
  let enriched = 0;

  const groups = category === "archive"
    ? Object.fromEntries(
        Object.entries(ARCHIVE_TYPE_TO_CATEGORY).map(([type, promptCategory]) => [
          promptCategory,
          thinItems.filter((item) => item.type === type),
        ])
      )
    : { [category]: thinItems };

  console.log(`\n📝 [${category}] ${thinItems.length} thin items to enrich\n`);

  for (const [promptCategory, groupItems] of Object.entries(groups)) {
    if (groupItems.length === 0) continue;
    const batches = Math.ceil(groupItems.length / BATCH_SIZE);
    const label = category === "archive" ? `${category}:${promptCategory}` : category;
    console.log(`  ${label}: ${groupItems.length} item(s), ${batches} batch(es)`);

    for (let b = 0; b < batches; b++) {
      const batch = groupItems.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      process.stdout.write(`    Batch ${b + 1}/${batches} (${batch.length} items)... `);

      try {
        const results = await enrichBatch(promptCategory, batch);

        for (const result of results) {
          if (typeof result.index !== "number" || result.index < 0 || result.index >= batch.length) continue;
          const original = batch[result.index];
          const idx = slugToIdx.get(original.slug);
          if (idx === undefined) continue;

          // Apply the enriched fields
          if (promptCategory === "discoveries" || promptCategory === "products") {
            if (result.shortDescription && result.shortDescription.length > descLength(original))
              items[idx].shortDescription = result.shortDescription;
            if (result.whyItIsInteresting && result.whyItIsInteresting.length > whyLength(original))
              items[idx].whyItIsInteresting = result.whyItIsInteresting;
          } else if (promptCategory === "hidden-gems") {
            if (result.whatItDoes && result.whatItDoes.length > descLength(original))
              items[idx].whatItDoes = result.whatItDoes;
            if (result.whyItIsUseful && result.whyItIsUseful.length > whyLength(original))
              items[idx].whyItIsUseful = result.whyItIsUseful;
          } else if (promptCategory === "future-radar") {
            if (result.explanation && result.explanation.length > descLength(original))
              items[idx].explanation = result.explanation;
            if (result.whyItMatters && result.whyItMatters.length > whyLength(original))
              items[idx].whyItMatters = result.whyItMatters;
          } else if (promptCategory === "daily-tools") {
            if (result.whatItDoes && result.whatItDoes.length > descLength(original))
              items[idx].whatItDoes = result.whatItDoes;
            if (result.whyItIsUseful && result.whyItIsUseful.length > whyLength(original))
              items[idx].whyItIsUseful = result.whyItIsUseful;
          }
          enriched++;
        }

        // Write after every batch
        writeJSON(filename, items);
        console.log(`✓ +${results.length} enriched`);
      } catch (err) {
        console.log(`FAILED: ${err.message.slice(0, 100)}`);
      }

      if (b < batches - 1) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  console.log(`\n  ✅ [${category}] Enriched ${enriched} items.\n`);
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
    console.error(`❌ Unknown category: ${ONLY_CATEGORY}`);
    process.exit(1);
  }

  console.log(`\n✨ Enriching thin items — threshold: ${THIN_THRESHOLD} chars`);
  if (ONLY_CATEGORY) console.log(`   Category: ${ONLY_CATEGORY}`);
  console.log();

  for (const [category, filename] of categoriesToRun) {
    await enrichCategory(category, filename);
    if (categoriesToRun.indexOf([category, filename]) < categoriesToRun.length - 1) {
      await new Promise(r => setTimeout(r, 6000));
    }
  }

  console.log("🎉 Enrichment complete.\n");
  console.log("Next: npm run build\n");
}

main().catch(err => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
