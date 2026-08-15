#!/usr/bin/env node
/**
 * Backfills `everydayUse` on live items — two or three concrete moments when
 * a normal person would actually reach for the tool.
 *
 * The catalogue already explains what each tool *is*; what readers act on is
 * recognising their own situation ("the third time you retype the same
 * address this week"). This writes that, and nothing else.
 *
 * Requires GEMINI_API_KEY. Rate-limit safe (1 req/sec, retry on 429/503).
 * Idempotent: skips items that already have the field.
 *
 * Usage:
 *   GEMINI_API_KEY=… node scripts/backfill-everyday-use.mjs --dry --limit=5
 *   GEMINI_API_KEY=… node scripts/backfill-everyday-use.mjs --run --limit=200
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeJsonSafe } from "./lib/write-safe.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");

const args = new Set(process.argv.slice(2));
const isDry = !args.has("--run");
const limitArg = process.argv.slice(2).find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Math.max(1, parseInt(limitArg.split("=")[1], 10) || 0) : Infinity;

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY is required.");
  process.exit(1);
}
const MODEL = "gemini-2.5-flash-lite";
const URL_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const FILES = [
  { file: "hidden-gems.json", nameKey: "name" },
  { file: "daily-tools.json", nameKey: "toolName" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(prompt, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(URL_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 300 },
      }),
    });
    if (res.status === 429 || res.status === 503) {
      await sleep(Math.pow(2, attempt) * 2500);
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 140)}`);
    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  }
  throw new Error("max retries exceeded");
}

function buildPrompt(name, category, whatItDoes) {
  return `Write the "In everyday life" note for a tool directory entry.

Tool: ${name}
Category: ${category}
What it does: ${String(whatItDoes).slice(0, 400)}

Write 2-3 sentences (45-70 words total) describing concrete moments a real
person would reach for this. Rules:
- Name specific, ordinary situations (a Sunday budget, a group trip, a
  hand-off before annual leave, tabs you swore you'd read).
- Second person ("you"), plain language, no hype, no exclamation marks.
- Do NOT restate what the tool is or list features. Situations only.
- No preamble, no markdown, no quotes. Return the sentences only.`;
}

function cleanup(text) {
  return text
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(In everyday life[:,]?\s*)/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log(`\n🧩 everydayUse backfill — ${isDry ? "DRY RUN (pass --run to apply)" : "LIVE"}\n`);
  let done = 0;
  let processed = 0;

  for (const { file, nameKey } of FILES) {
    const path = join(DATA, file);
    const items = JSON.parse(readFileSync(path, "utf8"));
    const targets = items.filter((i) => !i.everydayUse);
    const batch = targets.slice(0, Math.max(0, LIMIT - processed));
    console.log(`[${file}] ${targets.length} missing; doing ${batch.length} this run`);

    for (const item of batch) {
      processed++;
      const name = item[nameKey] || item.slug;
      try {
        const text = cleanup(await callGemini(buildPrompt(name, item.category, item.whatItDoes)));
        const words = text.split(/\s+/).filter(Boolean).length;
        if (words < 25 || words > 110) {
          console.log(`  ⚠ ${item.slug}: rejected (${words} words)`);
        } else {
          if (!isDry) item.everydayUse = text;
          done++;
          console.log(`  ✅ ${item.slug}: ${text.slice(0, 78)}…`);
        }
      } catch (err) {
        console.log(`  ❌ ${item.slug}: ${err.message}`);
      }
      // Persist progress periodically so a crash keeps completed work
      if (!isDry && done % 25 === 0) writeJsonSafe(path, items);
      await sleep(1100);
    }
    if (!isDry) writeJsonSafe(path, items);
  }

  console.log(`\nDone. written=${done} ${isDry ? "(dry run — nothing saved)" : ""}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
