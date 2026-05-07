#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeJsonSafe } from "./lib/write-safe.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const AUTOMATED_DIR = join(ROOT, "automated-content");
const EVENTS_FILE = join(AUTOMATED_DIR, "current-events.json");
const TRENDING_FILE = join(AUTOMATED_DIR, "trending-live.json");
const DRAFTS_FILE = join(AUTOMATED_DIR, "newsletter-drafts.json");
const API_KEY = process.env.BUTTONDOWN_API_KEY;
const BASE_URL = "https://surfaced-x.pages.dev";
const MAJOR_STORY_THRESHOLD = Number(process.env.BREAKING_NEWS_THRESHOLD || 92);
// NWS weather alerts routinely score >=92 (Tornado / Flash Flood / Severe
// Thunderstorm / Red Flag / Extreme Heat / etc.) and were creating multiple
// breaking-news drafts per day for events that don't fit Surfaced's
// discovery/products/gems editorial voice. Filtered out by default; set
// BREAKING_NEWS_ALLOW_WEATHER=true to re-enable.
const ALLOW_WEATHER_DRAFTS = process.env.BREAKING_NEWS_ALLOW_WEATHER === "true";
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_BASE_DELAY_MS = 1500;
const API_RETRY_MAX_DELAY_MS = 12000;

/**
 * Hostname-bounded URL match. Avoids the substring-sanitization pitfall where
 * `https://attacker.com/?fake=weather.gov`.includes("weather.gov") would be
 * true. We require an exact hostname match or a proper subdomain (suffix
 * preceded by a dot).
 */
function urlHostMatches(url, hostSuffix) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const target = hostSuffix.toLowerCase();
    return host === target || host.endsWith("." + target);
  } catch {
    return false;
  }
}

/**
 * Weather alert detection — matches NWS-issued alerts based on source identity.
 * Source URL is the most reliable signal (api.weather.gov / weather.gov), with
 * sourceName heuristics as belt-and-braces.
 */
function isWeatherAlert(item) {
  if (urlHostMatches(item.sourceUrl, "weather.gov")) return true;
  const sourceName = String(item.sourceName || "").toLowerCase();
  if (sourceName.includes("national weather service") || sourceName === "nws") return true;
  // Source-trail entries can also identify NWS even if the primary source
  // was rewritten by enrichment.
  for (const entry of item.sourceTrail || []) {
    if (urlHostMatches(entry?.url, "weather.gov")) return true;
    const name = String(entry?.name || entry?.label || "").toLowerCase();
    if (name.includes("national weather service")) return true;
  }
  return false;
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpError(status, statusText = "") {
  const error = new Error(`Buttondown API error ${status}${statusText ? ` ${statusText}` : ""}`);
  error.status = status;
  return error;
}

function isRetryableStatus(status) {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(Number(status));
}

function isRetryableError(error) {
  const message = error?.message || "";
  return (
    error?.name === "AbortError" ||
    isRetryableStatus(error?.status) ||
    /ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|network/i.test(message)
  );
}

function retryDelayMs(attempt) {
  const exponential = API_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
  return Math.min(exponential, API_RETRY_MAX_DELAY_MS) + Math.floor(Math.random() * 500);
}

async function withRetry(fn, { label = "API request", retries = API_RETRY_ATTEMPTS } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error) || attempt >= retries) throw error;
      const delay = retryDelayMs(attempt);
      console.warn(`${label} failed (${error.message}); retry ${attempt}/${retries} in ${Math.round(delay / 1000)}s`);
      await sleep(delay);
    }
  }
}

function pickMajorStory() {
  const events = readJson(EVENTS_FILE, [])
    .filter((event) => event.status === "active")
    .map((event) => ({
      kind: "current-event",
      id: event.id,
      title: event.title,
      summary: event.summary,
      score: event.editorialStrength || 0,
      url: `${BASE_URL}/live/${event.id}`,
      sourceName: event.sourceName,
      sourceUrl: event.sourceUrl,
      sourceTrail: event.sourceTrail || [],
    }));
  const trending = readJson(TRENDING_FILE, { items: [] }).items
    .map((item) => ({
      kind: item.type,
      id: item.id,
      title: item.title,
      summary: item.summary,
      score: item.score || 0,
      url: item.url || item.sourceUrl,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      sourceTrail: item.sourceTrail || [],
    }));
  const candidates = [...events, ...trending].filter(
    (item) => item.score >= MAJOR_STORY_THRESHOLD,
  );
  const filtered = ALLOW_WEATHER_DRAFTS
    ? candidates
    : candidates.filter((item) => !isWeatherAlert(item));
  const skipped = candidates.length - filtered.length;
  if (skipped > 0) {
    console.log(`Filtered ${skipped} weather alert(s) from breaking-news draft pool. Set BREAKING_NEWS_ALLOW_WEATHER=true to allow.`);
  }
  return filtered.sort((a, b) => b.score - a.score)[0] || null;
}

function buildDraftHtml(story) {
  const sources = [
    { name: story.sourceName, url: story.sourceUrl },
    ...story.sourceTrail,
  ];
  const uniqueSources = Array.from(new Map(sources.filter((source) => source?.url).map((source) => [source.url, source])).values()).slice(0, 5);
  const sourceLinks = uniqueSources
    .map((source) => `<li><a href="${escapeHtml(source.url)}" style="color:#7dd3fc;">${escapeHtml(source.name || source.label || source.url)}</a></li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<body style="margin:0;background:#08080c;color:#f2f2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:36px 20px;">
    <p style="margin:0 0 10px;color:#34d399;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">Breaking Surfaced draft</p>
    <h1 style="margin:0 0 14px;font-size:30px;line-height:1.08;color:#fff;">${escapeHtml(story.title)}</h1>
    <p style="margin:0 0 22px;color:#b6b6c8;font-size:16px;line-height:1.65;">${escapeHtml(story.summary)}</p>
    <p style="margin:0 0 28px;">
      <a href="${escapeHtml(story.url)}" style="display:inline-block;background:#a855f7;color:#fff;text-decoration:none;border-radius:10px;padding:12px 16px;font-weight:800;">Review the live brief</a>
    </p>
    <div style="border-top:1px solid #22222e;padding-top:18px;">
      <p style="margin:0 0 8px;color:#8e8ea0;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Source trail</p>
      <ul style="margin:0;padding-left:18px;color:#b6b6c8;font-size:14px;line-height:1.7;">${sourceLinks}</ul>
    </div>
    <p style="margin:26px 0 0;color:#6e6e82;font-size:12px;line-height:1.6;">Draft generated by the Surfaced automated content brain. Review source wording and recommendations before sending.</p>
  </div>
</body>
</html>`;
}

async function main() {
  const story = pickMajorStory();
  if (!story) {
    console.log("No major story crossed the breaking-news draft threshold.");
    return;
  }

  const drafts = readJson(DRAFTS_FILE, { version: 1, drafts: [] });
  if (drafts.drafts.some((draft) => draft.storyId === story.id)) {
    console.log(`Draft already exists for ${story.id}; skipping.`);
    return;
  }

  if (!API_KEY) {
    console.log("BUTTONDOWN_API_KEY is not set; breaking-news draft was not sent.");
    return;
  }

  const subject = `Surfaced breaking draft: ${story.title}`;
  const body = buildDraftHtml(story);
  const response = await withRetry(async () => {
    const result = await fetch("https://api.buttondown.email/v1/emails", {
      method: "POST",
      headers: {
        Authorization: `Token ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subject, body, status: "draft" }),
    });
    if (!result.ok && isRetryableStatus(result.status)) throw httpError(result.status, result.statusText);
    return result;
  }, { label: "Buttondown draft" });

  if (!response.ok) {
    throw new Error(`Buttondown API error ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  drafts.drafts.push({
    storyId: story.id,
    buttondownId: payload.id,
    draftedAt: new Date().toISOString(),
    score: story.score,
    subject,
  });
  writeJsonSafe(DRAFTS_FILE, drafts);
  console.log(`Buttondown draft created for ${story.id}: ${payload.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
