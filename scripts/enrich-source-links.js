/**
 * Enrich items with missing source/manufacturer links via Gemini.
 *
 * Targets:
 *   - future-radar: lead organization or company developing the technology
 *   - discoveries: research source or news article URL
 *   - products: manufacturer's official product page
 *
 * Skips items that already have a sourceLink.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/enrich-source-links.js [category]
 */
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash";
const DATA_DIR = path.join(__dirname, "..", "data");

const ONLY_CATEGORY = process.argv[2] || null;
const BATCH_SIZE = 10;

const CATEGORIES = {
  "future-radar": {
    file: "future-radar.json",
    titleField: "techName",
    descField: "explanation",
    linkField: "sourceLink",
    instruction: "Find the official website of the LEAD organization, lab, or company developing this technology. Prefer the actual research project page or company homepage. Return a SINGLE valid HTTPS URL only. If multiple companies are racing on this, pick the most prominent. If you cannot find a real, specific source, return 'NONE'.",
  },
  "discoveries": {
    file: "discoveries.json",
    titleField: "title",
    descField: "shortDescription",
    linkField: "sourceLink",
    instruction: "Find the URL of an authoritative source for this discovery: the original research paper, the institution's news release, a major science publication (Nature, Science, NASA, Smithsonian, etc.), or Wikipedia. Return a SINGLE valid HTTPS URL only. If you cannot find a real, specific source, return 'NONE'.",
  },
  "products": {
    file: "products.json",
    titleField: "title",
    descField: "shortDescription",
    linkField: "sourceLink",
    instruction: "Find the URL of the MANUFACTURER's official product page for this exact product. Avoid retail sites (Amazon, Best Buy etc.). Return the brand's own .com page for the product. Return a SINGLE valid HTTPS URL only. If you cannot find a real, specific manufacturer page, return 'NONE'.",
  },
};

function readJSON(f) { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")); }
function writeJSON(f, d) { fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2)); }

async function callWithRetry(fn, maxRetries = 6) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err) {
      const msg = (err.message || "") + (err.cause?.message || "");
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) throw err;
      const retriable = msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE")
        || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("fetch failed")
        || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")
        || msg.toLowerCase().includes("network");
      if (retriable && attempt < maxRetries) {
        const delay = attempt * 30000;
        console.log(`    ⏳ Retry ${attempt}/${maxRetries} in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else throw err;
    }
  }
}

function buildPrompt(items, config) {
  const itemList = items.map((item, idx) => {
    const title = item[config.titleField];
    const desc = (item[config.descField] || "").slice(0, 300);
    return `[${idx}] "${title}" — ${desc}`;
  }).join("\n\n");

  return `For each item below, ${config.instruction}

Items:
${itemList}

Return a JSON array of ${items.length} objects, each with:
{ "index": <number>, "url": "<https URL or 'NONE'>" }

No markdown fences. No prose. Just the array.`;
}

function isValidUrl(s) {
  if (!s || typeof s !== "string") return false;
  if (s === "NONE" || s.toUpperCase() === "NONE") return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch { return false; }
}

async function enrichBatch(items, config) {
  const prompt = buildPrompt(items, config);
  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { temperature: 0.3 },
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

async function enrichCategory(catKey) {
  const config = CATEGORIES[catKey];
  const items = readJSON(config.file);

  // Items that are missing the link field
  const missing = items.filter(item => !item[config.linkField]);
  if (missing.length === 0) {
    console.log(`  ✅ [${catKey}] All items already have ${config.linkField}.\n`);
    return;
  }

  const batches = Math.ceil(missing.length / BATCH_SIZE);
  console.log(`\n📝 [${catKey}] ${missing.length} items missing ${config.linkField} (${batches} batches)\n`);

  // slug → idx in items array for fast write-back
  const slugToIdx = new Map(items.map((it, i) => [it.slug, i]));
  let added = 0;

  for (let b = 0; b < batches; b++) {
    const batch = missing.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    process.stdout.write(`  Batch ${b + 1}/${batches} (${batch.length}) ... `);

    try {
      const results = await enrichBatch(batch, config);
      let batchAdded = 0;
      for (const r of results) {
        if (typeof r.index !== "number" || r.index < 0 || r.index >= batch.length) continue;
        const original = batch[r.index];
        const idx = slugToIdx.get(original.slug);
        if (idx === undefined) continue;
        if (!isValidUrl(r.url)) continue;
        items[idx][config.linkField] = r.url;
        batchAdded++;
      }
      writeJSON(config.file, items);
      added += batchAdded;
      console.log(`✓ +${batchAdded} links`);
    } catch (err) {
      console.log(`FAILED: ${err.message.slice(0, 80)}`);
    }

    if (b < batches - 1) await new Promise(r => setTimeout(r, 8000));
  }

  console.log(`\n  ✅ [${catKey}] Added ${added} links of ${missing.length} possible.\n`);
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY required.");
    process.exit(1);
  }

  const cats = ONLY_CATEGORY ? [ONLY_CATEGORY] : Object.keys(CATEGORIES);
  console.log(`\n🔗 Enriching missing source links\n   Categories: ${cats.join(", ")}\n`);

  for (const cat of cats) {
    if (!CATEGORIES[cat]) {
      console.error(`❌ Unknown category: ${cat}`);
      continue;
    }
    await enrichCategory(cat);
  }

  console.log("🎉 Source-link enrichment complete.\n");
}

main().catch(err => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
