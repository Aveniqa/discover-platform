/**
 * Replaces low-quality sourceLinks (wikipedia.org, wikihow.com) with trusted
 * primary sources using the Gemini API.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/retrofit-sources.mjs --dry   # preview only
 *   GEMINI_API_KEY=xxx node scripts/retrofit-sources.mjs --run   # apply changes
 *
 * Requires: GEMINI_API_KEY env var
 * Rate-limit safe: 1 req/sec, exponential backoff on 429
 * Log: docs/source-retrofit.log
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const LOG_PATH = path.join(__dirname, "..", "docs", "source-retrofit.log");

const LOW_QUALITY = ["wikipedia.org", "wikihow.com"];

const FILES = {
  discoveries: "sourceLink",
  products: "sourceLink",
  "hidden-gems": "websiteLink",
  "future-radar": "sourceLink",
  "daily-tools": "websiteLink",
};

const PREFERRED_DOMAINS = [
  "nytimes.com", "wsj.com", "reuters.com", "apnews.com", "bloomberg.com",
  "ft.com", "bbc.com", "theverge.com", "wired.com", "arstechnica.com",
  "technologyreview.com", "scientificamerican.com", "nature.com", "science.org",
  "theatlantic.com", "newyorker.com", "economist.com", "nationalgeographic.com",
  "smithsonianmag.com", "nasa.gov", "noaa.gov", "nih.gov", "arxiv.org",
  "mit.edu", "stanford.edu",
];

const args = new Set(process.argv.slice(2));
const isDry = !args.has("--run");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}

const MODEL = "gemini-2.0-flash";

async function callGemini(prompt, retries = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (res.status === 429) {
      const wait = Math.pow(2, attempt) * 2000;
      console.log(`  [429] Rate limited — waiting ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  }
  throw new Error("Gemini: max retries exceeded");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isLowQuality(url) {
  return LOW_QUALITY.some((d) => url.includes(d));
}

function writeJsonSafe(fp, data) {
  const tmp = fp + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, fp);
}

async function findReplacementUrl(item, urlField) {
  const title = item.title || item.name || item.techName || item.toolName || item.slug;
  const description = item.shortDescription || item.whatItDoes || item.explanation || item.whatItDoes || "";
  const currentUrl = item[urlField];

  const prompt = `You are a fact-checker finding trusted primary sources.

Item: "${title}"
Description: "${description.slice(0, 300)}"
Current source (low quality): ${currentUrl}

Find the single best replacement URL from a trusted, authoritative source.
Preferred domains: ${PREFERRED_DOMAINS.join(", ")}

Rules:
- Return ONLY the URL, nothing else — no explanation, no markdown
- Must be a real, publicly accessible page about this specific topic
- Prefer journal articles, government/university sites, major news outlets
- If no trusted source exists, return the string: KEEP_ORIGINAL
- Never return wikipedia.org or wikihow.com`;

  const result = await callGemini(prompt);
  // Extract URL from response (strip any accidental whitespace/punctuation)
  const cleaned = result.replace(/[`'"]/g, "").trim().split(/\s+/)[0];
  return cleaned === "KEEP_ORIGINAL" || !cleaned.startsWith("http") ? null : cleaned;
}

async function main() {
  console.log(`\n🔍 retrofit-sources — ${isDry ? "DRY RUN (pass --run to apply)" : "LIVE RUN"}\n`);

  const logLines = [`# Source retrofit log — ${new Date().toISOString()}`, `# Mode: ${isDry ? "dry" : "live"}`, ""];
  let total = 0;
  let replaced = 0;
  let kept = 0;

  for (const [category, urlField] of Object.entries(FILES)) {
    const fp = path.join(DATA_DIR, `${category}.json`);
    if (!fs.existsSync(fp)) continue;
    const items = JSON.parse(fs.readFileSync(fp, "utf8"));

    const targets = items.filter((i) => i[urlField] && isLowQuality(i[urlField]));
    if (targets.length === 0) {
      console.log(`[${category}] no low-quality sources`);
      continue;
    }

    console.log(`[${category}] ${targets.length} item(s) to retrofit`);
    logLines.push(`## ${category} (${targets.length} items)`);

    for (const item of targets) {
      total++;
      const oldUrl = item[urlField];
      process.stdout.write(`  ${item.slug}: ${oldUrl.slice(0, 60)}... `);

      try {
        const newUrl = await findReplacementUrl(item, urlField);
        if (newUrl) {
          console.log(`→ ${newUrl}`);
          logLines.push(`REPLACED  ${item.slug}`);
          logLines.push(`  old: ${oldUrl}`);
          logLines.push(`  new: ${newUrl}`);
          if (!isDry) item[urlField] = newUrl;
          replaced++;
        } else {
          console.log("→ KEPT (no trusted source found)");
          logLines.push(`KEPT      ${item.slug}  (${oldUrl})`);
          kept++;
        }
      } catch (err) {
        console.log(`→ ERROR: ${err.message}`);
        logLines.push(`ERROR     ${item.slug}  ${err.message}`);
        kept++;
      }

      // 1 req/sec rate limit
      await sleep(1100);
    }

    if (!isDry) writeJsonSafe(fp, items);
    logLines.push("");
  }

  logLines.push(`## Summary`);
  logLines.push(`total=${total} replaced=${replaced} kept=${kept} mode=${isDry ? "dry" : "live"}`);

  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, logLines.join("\n") + "\n", "utf8");

  console.log(`\n─────────`);
  console.log(`Scanned: ${total}  Replaced: ${replaced}  Kept: ${kept}`);
  console.log(`Log: ${LOG_PATH}`);
  if (isDry) {
    console.log("\n(Dry run complete — no files modified. Re-run with --run to apply.)");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
