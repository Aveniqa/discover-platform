#!/usr/bin/env node
/**
 * One-shot backfill: turn Amazon search URLs into direct /dp/<ASIN> URLs
 * for products generated before ASIN support shipped.
 *
 * We ask Gemini (in batches of 15) for the ASIN of each product and trust
 * its answer when it comes back as a valid 10-character ASIN. Gemini is
 * instructed to return an empty string when not confident, and we check
 * the regex format — but we do NOT hit amazon.com/dp/<ASIN> to verify,
 * because Amazon uniformly serves a 404 "dogs of Amazon" page to any
 * script-originated request regardless of UA/headers, so live validation
 * would reject 100% of candidates (valid and bogus alike).
 *
 * Net effect: some fraction of backfilled ASINs may be slightly wrong
 * (wrong variant, discontinued listing). But today 100% of these URLs
 * point to a search page that bypasses the product entirely — any
 * correctly-linked product is a strict improvement, and spot-checking
 * a --sample before applying catches Gemini's obvious misses.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/backfill-asins.js --sample    # preview only
 *   GEMINI_API_KEY=... node scripts/backfill-asins.js --dry-run   # no writes
 *   GEMINI_API_KEY=... node scripts/backfill-asins.js             # apply
 *   GEMINI_API_KEY=... node scripts/backfill-asins.js --limit 20
 *
 * Safe to re-run — products that already have a valid ASIN are skipped.
 */
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const { writeJsonSafe } = require("./lib/write-safe");

const DATA_DIR = path.join(__dirname, "..", "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const isSample = args.has("--sample");
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;

const AMAZON_TAG = process.env.AMAZON_AFFILIATE_TAG || "vaultvibe-20";
const ASIN_REGEX = /^[A-Z0-9]{10}$/;

const BATCH_SIZE = 15;

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is required");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash-lite";

async function askGeminiForAsins(batch) {
  const itemsStr = batch
    .map(
      (p, i) =>
        `${i + 1}. Title: ${p.title}\n   Category: ${p.category || "n/a"}\n   Price range: ${p.estimatedPriceRange || "n/a"}`
    )
    .join("\n\n");

  const prompt = `For each product below, return the 10-character Amazon ASIN you are highly confident corresponds to that EXACT product listing on amazon.com.

Rules:
- Only return an ASIN if you are confident the product is sold on amazon.com under that exact name.
- If the product is clearly DTC-only (Allbirds, Peloton, Vitruvi, Vollebak, etc.) or you are not confident, return an empty string.
- Prefer the primary/canonical variant when multiple exist (most popular size/color).
- Never guess or fabricate — an incorrect ASIN is worse than an empty string.

Products:
${itemsStr}

Return ONLY a JSON array of ${batch.length} objects in the same order, matching this schema:
[{"index": 1, "asin": "B0XXXXXXXX"}, {"index": 2, "asin": ""}, ...]

No markdown fencing, no explanation.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  const text = response.text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  const arr = JSON.parse(text);
  if (!Array.isArray(arr) || arr.length !== batch.length) {
    throw new Error(`Gemini returned ${arr?.length} items, expected ${batch.length}`);
  }
  return arr;
}

async function main() {
  const mode = isSample ? "[SAMPLE]" : isDryRun ? "[DRY RUN]" : "";
  console.log(`\n🎯 ASIN backfill ${mode}\n`);

  const allProducts = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));

  const candidates = allProducts
    .filter(
      (p) =>
        p.availableOnAmazon !== false &&
        !p.amazonAsin &&
        p.affiliate?.enabled &&
        typeof p.affiliate.url === "string" &&
        p.affiliate.url.includes("/s?k=")
    )
    .slice(0, isSample ? Math.min(15, LIMIT) : LIMIT);

  console.log(`Found ${candidates.length} products needing ASIN backfill`);
  if (candidates.length === 0) {
    console.log("✓ Nothing to do.");
    return;
  }

  const answers = new Map(); // slug → asin
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    process.stdout.write(
      `  Gemini batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(candidates.length / BATCH_SIZE)} (${batch.length} items)... `
    );
    try {
      const result = await askGeminiForAsins(batch);
      let got = 0;
      for (let j = 0; j < batch.length; j++) {
        const asin = (result[j]?.asin || "").trim().toUpperCase();
        if (asin && ASIN_REGEX.test(asin)) {
          answers.set(batch[j].slug, asin);
          got++;
        }
      }
      console.log(`got ${got} valid-format ASINs`);
    } catch (e) {
      console.log(`error: ${e.message}`);
    }
  }

  console.log(`\n${answers.size}/${candidates.length} products will get direct /dp/ URLs\n`);

  if (isSample || isDryRun) {
    console.log("Proposed ASIN mappings:");
    for (const p of candidates) {
      const asin = answers.get(p.slug);
      if (!asin) continue;
      console.log(`  ${asin}  ${p.title}`);
      console.log(`          https://www.amazon.com/dp/${asin}`);
    }
    const skipped = candidates.filter((p) => !answers.has(p.slug));
    if (skipped.length) {
      console.log(`\nGemini returned empty for ${skipped.length} (DTC-only or low confidence):`);
      skipped.slice(0, 10).forEach((p) => console.log(`  — ${p.title}`));
      if (skipped.length > 10) console.log(`  ... and ${skipped.length - 10} more`);
    }
    console.log(
      `\n${isSample ? "(Sample preview — rerun without --sample to see all, or without flags to apply.)" : "(Dry run — no files modified.)"}`
    );
    return;
  }

  let applied = 0;
  for (const p of allProducts) {
    const asin = answers.get(p.slug);
    if (!asin) continue;
    const directUrl = `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}&linkCode=ll1`;
    p.amazonAsin = asin;
    p.directAmazonUrl = directUrl;
    if (p.affiliate) p.affiliate.url = directUrl;
    applied++;
  }

  writeJsonSafe(PRODUCTS_FILE, allProducts);
  console.log(`✅ Applied ${applied} direct /dp/ASIN URLs to products.json`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
