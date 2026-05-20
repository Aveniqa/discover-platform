#!/usr/bin/env node
/**
 * Editorial rewrite — drops the boilerplate "Why It Is Useful" structure for
 * every kept item and produces a single editorial blurb in Alex Surfaced's
 * voice. Targets only the live niche (hidden-gems + daily-tools) — the legacy
 * verticals are archived and don't get touched.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/editorial-rewrite.mjs            # dry-run
 *   GEMINI_API_KEY=... node scripts/editorial-rewrite.mjs --apply    # writes
 *   GEMINI_API_KEY=... node scripts/editorial-rewrite.mjs --apply --limit=10
 *   GEMINI_API_KEY=... node scripts/editorial-rewrite.mjs --apply --only=tool
 *
 * Output shape per item (in addition to existing fields):
 *   editorial   — 110-180 word single paragraph, Alex's voice, no template
 *   takeaway    — 12-22 word one-liner ("the take")
 *   rewrittenAt — YYYY-MM-DD
 *
 * Why we keep the original whatItDoes/whyItIsUseful fields: backwards-compat
 * for older renderers + audit scripts that still read them. The item-page
 * renderer reads `editorial` first and only falls back if it's missing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DATA = join(__dirname, "..", "data");
const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const flag = (name) => {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : null;
};
const LIMIT = parseInt(flag("limit") || "9999", 10);
const ONLY = flag("only"); // "tool" | "hidden-gem" | null
const TODAY = new Date().toISOString().slice(0, 10);

const FILES = [
  { path: "hidden-gems.json", type: "hidden-gem", nameField: "name", whatField: "whatItDoes", whyField: "whyItIsUseful" },
  { path: "daily-tools.json", type: "tool", nameField: "toolName", whatField: "whatItDoes", whyField: "whyItIsUseful" },
];

const KEY = process.env.GEMINI_API_KEY;
if (!KEY && APPLY) {
  console.error("GEMINI_API_KEY required for --apply. Re-run with the secret set.");
  process.exit(1);
}

const PROMPT_SYSTEM = `You are Alex Surfaced, the editor of Surfaced — a one-person daily on
the most useful software and corners of the internet. Your voice is direct,
opinionated, and dry. You hate filler. You write like the best newsletter
editors: every sentence earns its slot. You never use the words
"unleash", "leverage", "seamless", "delve", "robust", "navigate the landscape",
"in today's fast-paced world", "game-changer", "revolutionary",
or any other LLM tells. You don't say "this tool". You say what it is.

You're rewriting catalog entries that were originally drafted by a generic AI
content engine. Cut the boilerplate. Keep the facts. Add a real take.

Output JSON only, no markdown, exactly this shape:

{
  "editorial": "<single paragraph, 110-180 words, no headers, no lists, written in your voice>",
  "takeaway": "<one sentence, 12-22 words, no period required, the most useful thing a reader needs to know>"
}

Rules for the editorial paragraph:
- Open by saying what the tool actually is in plain English — not its category
- Mention the specific thing it's best at (one concrete capability, not a feature list)
- Mention the obvious alternative and why this is the pick (or isn't)
- If there's a free tier or pricing tell, include it briefly
- End with a sentence on who specifically should bother and who shouldn't
- Do not start with "If you", "Looking for", "Tired of", or any clickbait opener
- Do not end with a question or a call to action

The takeaway should read like a sentence a friend would text you, not marketing copy.
`;

function buildUserPrompt(item, file) {
  const name = item[file.nameField] || item.slug;
  const cat = item.category || "";
  const what = item[file.whatField] || "";
  const why = item[file.whyField] || "";
  const link = item.websiteLink || item.sourceLink || "";
  return `Item to rewrite:

Name: ${name}
Category: ${cat}
Official URL: ${link}

Original "what it does" copy (rewrite, don't preserve):
${what}

Original "why it's useful" copy (extract the real claim, drop the boilerplate):
${why}

Rewrite the entry now.`;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: PROMPT_SYSTEM }] },
    generationConfig: {
      temperature: 0.75,
      response_mime_type: "application/json",
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty content");
  return JSON.parse(text);
}

async function rewriteOne(item, file) {
  const prompt = buildUserPrompt(item, file);
  const out = await callGemini(prompt);
  if (!out.editorial || !out.takeaway) {
    throw new Error("Missing editorial/takeaway in response");
  }
  return {
    ...item,
    editorial: out.editorial.trim(),
    takeaway: out.takeaway.trim().replace(/\.$/, ""),
    rewrittenAt: TODAY,
  };
}

function loadList(file) {
  return JSON.parse(readFileSync(join(DATA, file.path), "utf8"));
}

function saveList(file, items) {
  writeFileSync(join(DATA, file.path), JSON.stringify(items, null, 2) + "\n");
}

async function main() {
  for (const file of FILES) {
    if (ONLY && ONLY !== file.type) continue;
    const items = loadList(file);
    const pending = items.filter((i) => !i.editorial);
    const total = items.length;
    console.log(`\n=== ${file.path} ===`);
    console.log(`  total: ${total}    pending: ${pending.length}    apply: ${APPLY}`);
    if (!APPLY) {
      console.log(`  (dry-run) Would rewrite up to ${Math.min(LIMIT, pending.length)} items`);
      continue;
    }
    let done = 0;
    let failed = 0;
    for (const item of pending) {
      if (done >= LIMIT) break;
      try {
        const updated = await rewriteOne(item, file);
        const idx = items.findIndex((i) => i.slug === item.slug);
        items[idx] = updated;
        done += 1;
        if (done % 10 === 0) {
          // Persist progress every 10 so a crash doesn't lose everything
          saveList(file, items);
          console.log(`  saved checkpoint at ${done} items`);
        }
        await new Promise((r) => setTimeout(r, 4500)); // Stay under 15 RPM
      } catch (e) {
        failed += 1;
        console.error(`  ! ${item.slug}: ${e.message}`);
        if (failed >= 5) {
          console.error(`  too many failures — saving and bailing`);
          break;
        }
        await new Promise((r) => setTimeout(r, 10000));
      }
    }
    saveList(file, items);
    console.log(`  saved ${done} rewrites (${failed} failed)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
