/**
 * Send daily digest newsletter to Buttondown subscribers.
 * Reads today's generated items, builds an HTML email, and posts via Buttondown API.
 *
 * Required env: BUTTONDOWN_API_KEY
 * Usage: node scripts/send-newsletter.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const BASE_URL = "https://surfaced-x.pages.dev";
const BUTTONDOWN_EMAILS_URL = "https://api.buttondown.email/v1/emails";
const API_KEY = process.env.BUTTONDOWN_API_KEY;
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_BASE_DELAY_MS = 1500;
const API_RETRY_MAX_DELAY_MS = 12000;

const today = new Date().toISOString().slice(0, 10);
const formattedDate = new Date().toLocaleDateString("en-US", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

const CATEGORIES = [
  { file: "discoveries.json",  label: "Discoveries",   emoji: "🔬", color: "#6366f1" },
  { file: "products.json",     label: "Products",      emoji: "🛍️", color: "#8b5cf6" },
  { file: "hidden-gems.json",  label: "Hidden Gems",   emoji: "💎", color: "#06b6d4" },
  { file: "future-radar.json", label: "Future Radar",  emoji: "🚀", color: "#f59e0b" },
  { file: "daily-tools.json",  label: "Daily Tools",   emoji: "🛠️", color: "#10b981" },
];

function getTitle(item) {
  return item.title || item.name || item.toolName || item.techName || "Untitled";
}

function getDescription(item) {
  return item.shortDescription || item.whatItDoes || item.explanation || "";
}

function getWhy(item) {
  return item.whyItIsInteresting || item.whyItIsUseful || item.whyItMatters || "";
}

function getUrl(item) {
  return `${BASE_URL}/item/${item.slug}`;
}

function buildItemHtml(item, color) {
  const title = getTitle(item);
  const desc = getDescription(item);
  const why = getWhy(item);
  const url = getUrl(item);

  return `
    <div style="margin-bottom:28px; padding:20px 24px; background:#1a1a2e; border-radius:12px; border-left:3px solid ${color};">
      <a href="${url}" style="text-decoration:none;">
        <h3 style="margin:0 0 8px 0; font-size:16px; font-weight:600; color:#e2e8f0; line-height:1.4;">${title}</h3>
      </a>
      <p style="margin:0 0 10px 0; font-size:14px; color:#94a3b8; line-height:1.6;">${desc}</p>
      ${why ? `<p style="margin:0 0 12px 0; font-size:13px; color:#64748b; line-height:1.6; font-style:italic;">${why}</p>` : ""}
      <a href="${url}" style="font-size:13px; font-weight:500; color:${color}; text-decoration:none;">Read more →</a>
    </div>`;
}

function buildEmailHtml(sections) {
  const sectionsHtml = sections
    .filter((s) => s.items.length > 0)
    .map(({ label, emoji, color, items }) => `
      <div style="margin-bottom:40px;">
        <h2 style="margin:0 0 16px 0; font-size:13px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:${color};">
          ${emoji} ${label}
        </h2>
        ${items.map((item) => buildItemHtml(item, color)).join("")}
      </div>`)
    .join("");

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Surfaced — ${formattedDate}</title>
</head>
<body style="margin:0; padding:0; background:#0f0f1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center; margin-bottom:40px; padding-bottom:32px; border-bottom:1px solid #1e2038;">
      <h1 style="margin:0 0 6px 0; font-size:28px; font-weight:800; color:#e2e8f0; letter-spacing:-0.02em;">Surfaced</h1>
      <p style="margin:0; font-size:13px; color:#64748b; text-transform:uppercase; letter-spacing:0.08em;">${formattedDate}</p>
      <p style="margin:12px 0 0 0; font-size:14px; color:#94a3b8;">${totalItems} fresh discoveries across ${sections.filter(s => s.items.length > 0).length} categories</p>
    </div>

    <!-- Content -->
    ${sectionsHtml}

    <!-- Footer -->
    <div style="margin-top:48px; padding-top:24px; border-top:1px solid #1e2038; text-align:center;">
      <p style="margin:0 0 12px 0; font-size:13px; color:#64748b;">
        <a href="${BASE_URL}" style="color:#6366f1; text-decoration:none; font-weight:500;">Visit Surfaced</a>
        &nbsp;·&nbsp;
        <a href="${BASE_URL}/hidden-gems" style="color:#6366f1; text-decoration:none;">Hidden Gems</a>
        &nbsp;·&nbsp;
        <a href="${BASE_URL}/future-radar" style="color:#6366f1; text-decoration:none;">Future Radar</a>
      </p>
      <p style="margin:0; font-size:12px; color:#475569;">
        You're receiving this because you subscribed to Surfaced.<br/>
        No spam, ever. Unsubscribe anytime.
      </p>
    </div>

  </div>
</body>
</html>`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(Number(status));
}

function isRetryableError(error) {
  const message = error?.message || "";
  return error?.name === "AbortError" || /ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|network/i.test(message);
}

function retryDelayMs(attempt, response) {
  const retryAfter = response?.headers?.get?.("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 60000);
  }
  const exponential = API_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
  return Math.min(exponential, API_RETRY_MAX_DELAY_MS) + Math.floor(Math.random() * 500);
}

async function fetchWithRetry(label, fetchImpl, url, options) {
  for (let attempt = 1; attempt <= API_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetchImpl(url, options);
      if (isRetryableStatus(response.status) && attempt < API_RETRY_ATTEMPTS) {
        const delay = retryDelayMs(attempt, response);
        console.warn(`${label} returned ${response.status}; retry ${attempt}/${API_RETRY_ATTEMPTS} in ${Math.round(delay / 1000)}s`);
        await sleep(delay);
        continue;
      }
      return response;
    } catch (error) {
      if (!isRetryableError(error) || attempt >= API_RETRY_ATTEMPTS) throw error;
      const delay = retryDelayMs(attempt);
      console.warn(`${label} failed (${error.message}); retry ${attempt}/${API_RETRY_ATTEMPTS} in ${Math.round(delay / 1000)}s`);
      await sleep(delay);
    }
  }
}

export async function postButtondownEmail({ subject, body, status, apiKey, live = false, fetchImpl = fetch }) {
  const headers = {
    Authorization: `Token ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (live) headers["X-Buttondown-Live-Dangerously"] = "true";

  let response;
  try {
    response = await fetchWithRetry(`Buttondown ${status}`, fetchImpl, BUTTONDOWN_EMAILS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ subject, body, status }),
    });
  } catch (error) {
    return { ok: false, status: 0, text: error.message, payload: null };
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }
  return { ok: response.ok, status: response.status, text, payload };
}

export async function sendNewsletterToButtondown({ subject, body, apiKey, fetchImpl = fetch }) {
  const liveResult = await postButtondownEmail({
    subject,
    body,
    status: "about_to_send",
    apiKey,
    live: true,
    fetchImpl,
  });
  if (liveResult.ok) return { mode: "live", payload: liveResult.payload };

  console.error(`❌ Buttondown live-send failed (${liveResult.status}): ${liveResult.text}`);
  console.log("📝 Falling back to a Buttondown draft...");

  const draftResult = await postButtondownEmail({
    subject,
    body,
    status: "draft",
    apiKey,
    live: false,
    fetchImpl,
  });
  if (draftResult.ok) {
    return { mode: "draft", payload: draftResult.payload, liveError: liveResult };
  }

  throw new Error(`Buttondown live-send failed (${liveResult.status}); draft fallback failed (${draftResult.status}): ${draftResult.text}`);
}

async function main() {
  if (!API_KEY) {
    console.error("❌ BUTTONDOWN_API_KEY is not set");
    process.exit(1);
  }

  console.log(`\n📧 Building newsletter for ${today}\n`);

  const sections = [];
  let totalItems = 0;

  for (const { file, label, emoji, color } of CATEGORIES) {
    const all = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
    const items = all.filter((i) => i.dateAdded === today);
    sections.push({ label, emoji, color, items });
    console.log(`  ${emoji} ${label}: ${items.length} items`);
    totalItems += items.length;
  }

  if (totalItems === 0) {
    console.log("⚠️  No items with today's date found — skipping newsletter.");
    process.exit(0);
  }

  const subject = `Surfaced — ${formattedDate}`;
  const body = buildEmailHtml(sections);

  console.log(`\n📨 Sending "${subject}" to Buttondown...`);

  const result = await sendNewsletterToButtondown({ subject, body, apiKey: API_KEY });
  const data = result.payload || {};
  if (result.mode === "live") {
    console.log(`✅ Newsletter sent! ID: ${data.id}`);
  } else {
    console.log(`✅ Newsletter draft created after live-send fallback. ID: ${data.id}`);
  }
  console.log(`   Subject: ${subject}`);
  console.log(`   Items: ${totalItems}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error("❌ Unexpected error:", err.message);
    process.exit(1);
  });
}
