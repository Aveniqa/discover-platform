/**
 * Replaces low-quality sourceLinks (wikipedia.org, wikihow.com) with trusted
 * primary sources using the Gemini API.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/retrofit-sources.mjs --dry   # preview only
 *   GEMINI_API_KEY=xxx node scripts/retrofit-sources.mjs --run   # apply changes
 *
 *   # Fill in MISSING source URLs on archived items (the residual AdSense
 *   # audit gap). Every candidate URL is fetched and must resolve before it
 *   # is written. Slugs with no verifiable source are recorded in
 *   # docs/source-retrofit-attempted.json and skipped on later runs.
 *   GEMINI_API_KEY=xxx node scripts/retrofit-sources.mjs --run --archive-missing --limit=250
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
const doArchiveMissing = args.has("--archive-missing");
const limitArg = process.argv.slice(2).find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Math.max(1, parseInt(limitArg.split("=")[1], 10) || 0) : Infinity;

// Domains the daily-generation prompt already bans — never write these.
const BANNED_DOMAINS = ["wikipedia.org", "wikihow.com", "blogspot.com", "wordpress.com", "medium.com"];

// Ledger of archive slugs we already tried and found no verifiable source
// for. Prevents re-burning Gemini calls on the same hopeless items each run.
const ATTEMPTED_PATH = path.join(__dirname, "..", "docs", "source-retrofit-attempted.json");

// Field that holds the outbound URL for each archived item's `type`.
const TYPE_TO_URL_FIELD = {
  discovery: "sourceLink",
  product: "sourceLink",
  "future-tech": "sourceLink",
  "hidden-gem": "websiteLink",
  tool: "websiteLink",
};

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}

const MODEL = "gemini-2.5-flash";

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

function isBannedOrInvalid(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  if (parsed.protocol !== "https:") return true;
  if (parsed.username || parsed.password) return true;
  const host = parsed.hostname.toLowerCase();
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
  return BANNED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Gemini can hallucinate URLs, so nothing gets written unless the page
 * actually responds. 403/405/429 count as alive (bot-blocked but real, same
 * philosophy as scripts/validate-urls.js); anything else >= 400, network
 * errors, and timeouts are rejected.
 */
async function urlResolves(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timer);
    if (res.status < 400) return true;
    return [403, 405, 429].includes(res.status);
  } catch {
    return false;
  }
}

function loadAttempted() {
  try {
    return JSON.parse(fs.readFileSync(ATTEMPTED_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function findMissingSourceUrl(item) {
  const title = item.title || item.name || item.techName || item.toolName || item.slug;
  const description = (item.shortDescription || item.whatItDoes || item.explanation || "").slice(0, 300);
  const isToolLike = item.type === "hidden-gem" || item.type === "tool" || item.type === "product";

  const ask = isToolLike
    ? `Find the official website or official product page URL for this tool/product. Only the vendor's own site or official repository — not a review, listicle, or store search page.`
    : `Find the single best authoritative source URL covering this specific topic (journal article, university/government page, or major science/tech outlet).
Preferred domains: ${PREFERRED_DOMAINS.join(", ")}`;

  const prompt = `You are a fact-checker locating a primary source for a published article that has none.

Item: "${title}"
Type: ${item.type}
Description: "${description}"

${ask}

Rules:
- Return ONLY the URL, nothing else — no explanation, no markdown
- Must be a real, publicly accessible https:// page about this specific item
- If you are not confident a real page exists, return the string: NO_SOURCE
- Never return: ${BANNED_DOMAINS.join(", ")}`;

  const result = await callGemini(prompt);
  const cleaned = result.replace(/[`'"]/g, "").trim().split(/\s+/)[0];
  if (!cleaned || cleaned === "NO_SOURCE" || !cleaned.startsWith("https://")) return null;
  return cleaned;
}

/**
 * Fill in missing outbound URLs on archive.json items — the residual gap the
 * AdSense audit reports. Verified-only writes; hopeless slugs are remembered
 * in the attempted ledger so later runs skip them.
 */
async function retrofitArchiveMissing(logLines) {
  const fp = path.join(DATA_DIR, "archive.json");
  const items = JSON.parse(fs.readFileSync(fp, "utf8"));
  const attempted = loadAttempted();

  const targets = items.filter((item) => {
    const field = TYPE_TO_URL_FIELD[item.type];
    if (!field) return false;
    const value = item[field];
    const missing = !value || typeof value !== "string" || !/^https?:\/\//.test(value.trim());
    return missing && !attempted[item.slug];
  });

  const batch = targets.slice(0, LIMIT);
  console.log(`[archive] ${targets.length} item(s) missing a source URL; processing ${batch.length} this run`);
  logLines.push(`## archive missing-source backfill (${batch.length}/${targets.length} items)`);

  let added = 0;
  let skipped = 0;
  let processed = 0;

  for (const item of batch) {
    const field = TYPE_TO_URL_FIELD[item.type];
    processed++;
    process.stdout.write(`  [${processed}/${batch.length}] ${item.slug} `);
    try {
      const candidate = await findMissingSourceUrl(item);
      if (candidate && !isBannedOrInvalid(candidate) && (await urlResolves(candidate))) {
        console.log(`→ ${candidate}`);
        logLines.push(`ADDED     ${item.slug}`);
        logLines.push(`  new: ${candidate}`);
        if (!isDry) item[field] = candidate;
        added++;
      } else {
        console.log(`→ NO_SOURCE${candidate ? ` (unverifiable: ${candidate.slice(0, 60)})` : ""}`);
        logLines.push(`NO_SOURCE ${item.slug}${candidate ? `  (rejected: ${candidate})` : ""}`);
        attempted[item.slug] = new Date().toISOString().slice(0, 10);
        skipped++;
      }
    } catch (err) {
      // Errors are NOT added to the ledger — transient failures deserve a retry.
      console.log(`→ ERROR: ${err.message}`);
      logLines.push(`ERROR     ${item.slug}  ${err.message}`);
    }

    // Persist progress every 25 items so a crash doesn't lose the batch.
    if (!isDry && processed % 25 === 0) {
      writeJsonSafe(fp, items);
      writeJsonSafe(ATTEMPTED_PATH, attempted);
    }
    await sleep(1100);
  }

  if (!isDry) {
    writeJsonSafe(fp, items);
    writeJsonSafe(ATTEMPTED_PATH, attempted);
  }
  logLines.push("");
  logLines.push(`archive summary: added=${added} no_source=${skipped} remaining=${targets.length - batch.length}`);
  logLines.push("");
  console.log(`[archive] added=${added} no_source=${skipped} unprocessed=${targets.length - batch.length}`);
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

  if (doArchiveMissing) {
    await retrofitArchiveMissing(logLines);
  }

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
        let newUrl = await findReplacementUrl(item, urlField);
        // Verified-only writes: Gemini URLs must resolve and be off the
        // banned-domain list, otherwise keep the original.
        if (newUrl && (isBannedOrInvalid(newUrl) || !(await urlResolves(newUrl)))) {
          logLines.push(`REJECTED  ${item.slug}  (unverifiable: ${newUrl})`);
          newUrl = null;
        }
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
