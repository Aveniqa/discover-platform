#!/usr/bin/env node
/**
 * One-shot backfill: ask Gemini to generate `seoTitle` (≤65 chars,
 * keyword-forward, no ellipsis, no clickbait) for every catalog item whose
 * visible title is too long for SEO and that doesn't already have one.
 *
 * Targets:
 *   data/discoveries.json
 *   data/products.json
 *   data/hidden-gems.json
 *   data/future-radar.json
 *   data/daily-tools.json
 *   data/archive.json   ← yes, archived items too — they remain indexed
 *
 * Guarantees:
 *   - Only writes when the existing visible title is > 65 chars
 *   - Never overwrites an existing seoTitle
 *   - Never mutates `id`, `slug`, or any other field
 *   - Logs every before/after to docs/seo-title-backfill.log
 *   - Per-batch safe-write — survives mid-run crashes
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/backfill-seo-titles.mjs --dry   # preview
 *   GEMINI_API_KEY=xxx node scripts/backfill-seo-titles.mjs         # execute
 *
 * Cost guardrail: skip the run if there are >1000 items to backfill, prompt
 * the user with `--force` to confirm.
 */
import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const LOG_PATH = join(ROOT, "docs", "seo-title-backfill.log");

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");
const MAX_LEN = 65;
const BATCH = 10;
const MODEL = "gemini-2.5-flash";

/** Each entry: [filename, titleField] */
const FILES = [
  ["discoveries.json", "title"],
  ["products.json", "title"],
  ["hidden-gems.json", "name"],
  ["future-radar.json", "techName"],
  ["daily-tools.json", "toolName"],
  ["archive.json", null], // mixed types — resolve per item
];

const log = (line) => {
  console.log(line);
  if (!DRY) appendFileSync(LOG_PATH, line + "\n");
};

function readJson(fn) {
  return JSON.parse(readFileSync(join(DATA_DIR, fn), "utf8"));
}
function writeJson(fn, data) {
  writeFileSync(join(DATA_DIR, fn), JSON.stringify(data, null, 2));
}

function getTitle(item, fallbackField) {
  if (fallbackField) return item[fallbackField] || "";
  return item.title || item.name || item.techName || item.toolName || "";
}

function setSeoTitle(item, value) {
  // Insert seoTitle right after the title field for readability in JSON output
  const out = {};
  let inserted = false;
  for (const [k, v] of Object.entries(item)) {
    out[k] = v;
    if (!inserted && (k === "title" || k === "name" || k === "techName" || k === "toolName")) {
      out.seoTitle = value;
      inserted = true;
    }
  }
  // Fallback: just set it if no title-like field existed
  if (!inserted) out.seoTitle = value;
  return out;
}

async function callGemini(ai, items) {
  const list = items
    .map((it, i) => `[${i}] "${getTitle(it, null)}" — ${(it.shortDescription || it.whatItDoes || it.explanation || "").slice(0, 180)}`)
    .join("\n");

  const prompt = `For each item below, write an SEO-optimized <title> tag — concise, keyword-forward, ≤${MAX_LEN} characters, no ellipsis, no clickbait, no quotes inside. Preserve the item's intent. If the item is a product, keep the brand+model. If a discovery, lead with the noun being discovered. If a tool, lead with the tool name then a 2-4 word value prop.

Items:
${list}

Return a JSON array of ${items.length} objects: { "index": <number>, "seoTitle": "<≤${MAX_LEN} chars>" }
No markdown fences. No prose. Just the array.`;

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.2 },
  });
  let text = res.text.trim().replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch {
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) throw new Error(`bad JSON from Gemini: ${text.slice(0, 200)}`);
    parsed = JSON.parse(m[0]);
  }
  return parsed;
}

async function callWithRetry(fn, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err) {
      const msg = (err.message || "") + (err.cause?.message || "");
      const retriable = /(?:503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|fetch failed|ECONNRESET|ETIMEDOUT|network)/i.test(msg);
      if (retriable && attempt < maxRetries) {
        const delay = attempt * 30000;
        console.log(`    ⏳ Retry ${attempt}/${maxRetries} in ${delay / 1000}s — ${msg.slice(0, 60)}`);
        await new Promise((r) => setTimeout(r, delay));
      } else throw err;
    }
  }
}

async function processFile(ai, fn, titleField) {
  const items = readJson(fn);
  // Build (idx, item) pairs that need backfill
  const targets = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.seoTitle) continue; // never overwrite
    const t = getTitle(it, titleField);
    if (!t || t.length <= MAX_LEN) continue;
    targets.push({ idx: i, item: it });
  }
  if (targets.length === 0) {
    log(`[${fn}] nothing to backfill`);
    return { fn, written: 0, total: items.length, considered: 0 };
  }

  log(`\n[${fn}] ${targets.length} items need seoTitle (of ${items.length} total)`);

  let written = 0;
  for (let b = 0; b < targets.length; b += BATCH) {
    const slice = targets.slice(b, b + BATCH);
    const inputs = slice.map((s) => s.item);
    const batchNo = `batch ${Math.floor(b / BATCH) + 1}/${Math.ceil(targets.length / BATCH)}`;
    process.stdout.write(`  ${batchNo} (${slice.length})... `);

    let results;
    try { results = await callWithRetry(() => callGemini(ai, inputs)); }
    catch (e) { console.log(`FAILED: ${e.message.slice(0, 80)}`); continue; }

    let batchWritten = 0;
    for (const r of results) {
      if (typeof r.index !== "number" || r.index < 0 || r.index >= slice.length) continue;
      const seo = (r.seoTitle || "").trim();
      if (!seo || seo.length > MAX_LEN) {
        log(`    ⚠ rejected length ${seo.length}: "${seo.slice(0, 80)}"`);
        continue;
      }
      const target = slice[r.index];
      const before = getTitle(target.item, titleField);
      log(`    ${target.item.slug || target.idx}`);
      log(`      ${before.length}→${seo.length}: ${seo}`);
      if (!DRY) {
        items[target.idx] = setSeoTitle(target.item, seo);
      }
      batchWritten++;
    }

    if (!DRY && batchWritten > 0) writeJson(fn, items);
    written += batchWritten;
    console.log(`✓ ${batchWritten}`);

    // Inter-batch pacing — 6s mirrors enrich-source-links behaviour
    if (b + BATCH < targets.length) await new Promise((r) => setTimeout(r, 6000));
  }

  return { fn, written, total: items.length, considered: targets.length };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY required");
    process.exit(1);
  }

  // Make sure docs/ exists for the log
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  if (!DRY) {
    appendFileSync(LOG_PATH, `\n=== Backfill run ${new Date().toISOString()} ===\n`);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Pre-scan to catch large runs
  let totalNeeded = 0;
  for (const [fn, titleField] of FILES) {
    const items = readJson(fn);
    for (const it of items) {
      const t = getTitle(it, titleField);
      if (!it.seoTitle && t.length > MAX_LEN) totalNeeded++;
    }
  }

  log(`\n🔄 SEO-title backfill — mode: ${DRY ? "DRY RUN (no writes)" : "EXECUTE (writes JSON in place)"}`);
  log(`   Threshold: titles > ${MAX_LEN} chars`);
  log(`   Total items needing backfill: ${totalNeeded}`);

  if (totalNeeded > 1000 && !FORCE && !DRY) {
    console.error(`\n⚠ Large run (${totalNeeded} items). Re-run with --force to proceed, or --dry to preview.`);
    process.exit(1);
  }

  const summary = [];
  for (const [fn, titleField] of FILES) {
    summary.push(await processFile(ai, fn, titleField));
  }

  log(`\n──────── Summary ────────`);
  for (const s of summary) {
    log(`  ${s.fn.padEnd(22)} considered=${s.considered.toString().padStart(4)}  written=${s.written}`);
  }
  log(`────────────────────────────`);
  log(DRY ? `\n(dry run — no files modified)` : `\n✅ Backfill complete.`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
