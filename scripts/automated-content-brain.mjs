#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeJsonSafe } from "./lib/write-safe.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const AUTOMATED_DIR = join(ROOT, "automated-content");
const PUBLIC_AUTOMATED_DIR = join(ROOT, "public", "automated-content");
const TRENDING_FILE = join(AUTOMATED_DIR, "trending-live.json");
const PUBLIC_TRENDING_FILE = join(PUBLIC_AUTOMATED_DIR, "trending-live.json");
const EDITORIAL_THRESHOLD = Number(process.env.TRENDING_EDITORIAL_THRESHOLD || 82);
const MAX_ITEMS = 8;
const MAX_MONITORED = 8;
const USER_AGENT = "SurfacedAutomatedContentBrain/1.0 (https://surfaced-x.pages.dev/contact)";
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_BASE_DELAY_MS = 1500;
const API_RETRY_MAX_DELAY_MS = 12000;
const dryRun = process.argv.includes("--dry-run");

const now = process.env.AUTOMATED_CONTENT_NOW
  ? new Date(process.env.AUTOMATED_CONTENT_NOW)
  : new Date();

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days) {
  return new Date(now.getTime() - days * 86_400_000);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function slugify(value) {
  return String(value || "signal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function trimText(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}...`;
}

function trimWords(value, maxWords) {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function stableHash(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function setGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

function hostLabel(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpError(status, statusText = "") {
  const error = new Error(`${status} ${statusText}`.trim());
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

function scoreGithubRepo(repo) {
  const stars = Number(repo.stargazers_count || 0);
  const forks = Number(repo.forks_count || 0);
  const watchers = Number(repo.watchers_count || 0);
  const pushedAt = new Date(repo.pushed_at || repo.updated_at || 0);
  const pushedAgeHours = Number.isFinite(pushedAt.getTime())
    ? Math.max(0, (now.getTime() - pushedAt.getTime()) / 3_600_000)
    : 999;
  const freshness = pushedAgeHours <= 24 ? 20 : pushedAgeHours <= 72 ? 14 : pushedAgeHours <= 168 ? 8 : 0;
  const velocity = Math.log10(Math.max(stars, 1)) * 18 + Math.log10(Math.max(forks + watchers, 1)) * 7;
  return clampScore(34 + velocity + freshness);
}

async function fetchJson(url, headers = {}) {
  return withRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": USER_AGENT,
          ...headers,
        },
        redirect: "error",
        signal: controller.signal,
      });
      if (!response.ok) throw httpError(response.status, response.statusText);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }, { label: new URL(url).hostname });
}

async function fetchGithubTrending() {
  const since = formatDate(daysAgo(7));
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", `pushed:>${since} stars:>250 archived:false mirror:false`);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "12");
  const headers = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const payload = await fetchJson(url, headers);
  return (payload.items || []).map((repo) => {
    const score = scoreGithubRepo(repo);
    const language = repo.language || "software";
    const description = trimText(
      repo.description || `${repo.full_name} is gaining attention from developers this week.`,
      210,
    );
    return {
      id: `github-${slugify(repo.full_name)}`,
      type: "github-trending",
      title: `${repo.full_name} is trending on GitHub`,
      summary: `${description} The repository is active this week, with ${repo.stargazers_count.toLocaleString("en-US")} stars and recent pushes visible through the GitHub API.`,
      topic: `github.${language.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      sourceName: "GitHub API",
      sourceUrl: repo.html_url,
      detectedAt: now.toISOString(),
      publishedAt: repo.created_at?.slice(0, 10),
      score,
      velocityLabel: `${repo.stargazers_count.toLocaleString("en-US")} stars`,
      ctaLabel: "Open repository",
      url: repo.html_url,
      sourceTrail: [
        { name: "GitHub repository", url: repo.html_url, role: "signal" },
        { name: "GitHub API search", url: "https://api.github.com/search/repositories", role: "signal" },
      ],
    };
  });
}

function scoreNewsArticle(article, provider) {
  const published = new Date(article.publishedAt || article.published_at || now);
  const ageHours = Number.isFinite(published.getTime())
    ? Math.max(0, (now.getTime() - published.getTime()) / 3_600_000)
    : 48;
  const freshness = ageHours <= 6 ? 24 : ageHours <= 24 ? 18 : ageHours <= 72 ? 9 : 0;
  const title = `${article.title || ""} ${article.description || ""}`.toLowerCase();
  const actionability = /(recall|safety|launch|release|breakthrough|weather|security|privacy|ai|science|health|space)/.test(title) ? 14 : 4;
  const providerScore = provider === "gnews" ? 52 : 50;
  return clampScore(providerScore + freshness + actionability);
}

async function fetchGNewsSignals() {
  if (!process.env.GNEWS_API_KEY) return [];
  const url = new URL("https://gnews.io/api/v4/top-headlines");
  url.searchParams.set("category", "technology");
  url.searchParams.set("lang", "en");
  url.searchParams.set("country", "us");
  url.searchParams.set("max", "10");
  url.searchParams.set("apikey", process.env.GNEWS_API_KEY);
  const payload = await fetchJson(url);
  return (payload.articles || []).map((article) => articleToSignal(article, "gnews"));
}

async function fetchNewsApiSignals() {
  if (!process.env.NEWSAPI_KEY) return [];
  const url = new URL("https://newsapi.org/v2/top-headlines");
  url.searchParams.set("category", "technology");
  url.searchParams.set("language", "en");
  url.searchParams.set("country", "us");
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("apiKey", process.env.NEWSAPI_KEY);
  const payload = await fetchJson(url);
  return (payload.articles || []).map((article) => articleToSignal(article, "newsapi"));
}

function articleToSignal(article, provider) {
  const sourceName = article.source?.name || article.source?.title || hostLabel(article.url);
  const score = scoreNewsArticle(article, provider);
  const summary = trimText(
    `${article.description || article.content || "A technology story is drawing fresh publisher attention."} Surfaced treats this as a live signal until stronger source context is available.`,
    260,
  );
  return {
    id: `${provider}-${slugify(article.url || article.title)}`,
    type: "news-trending",
    title: trimText(article.title, 110),
    summary,
    topic: "news.technology",
    sourceName,
    sourceUrl: article.url,
    detectedAt: now.toISOString(),
    publishedAt: String(article.publishedAt || article.published_at || "").slice(0, 10),
    score,
    velocityLabel: `${provider.toUpperCase()} top headline`,
    ctaLabel: "Read source",
    url: article.url,
    sourceTrail: [
      { name: sourceName, url: article.url, role: "publisher" },
      { name: provider === "gnews" ? "GNews API" : "NewsAPI", url: provider === "gnews" ? "https://gnews.io/" : "https://newsapi.org/", role: "signal" },
    ],
  };
}

function runCurrentEventDiscovery() {
  const result = spawnSync(process.execPath, ["scripts/daily-discovery.mjs", "--dry-run"], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    return {
      ok: false,
      error: (result.stderr || result.stdout || "daily discovery failed").trim().slice(0, 500),
      candidates: [],
    };
  }
  try {
    const payload = JSON.parse(result.stdout);
    return {
      ok: true,
      candidates: payload.candidates || [],
      rejected: payload.rejected || [],
      apiStatus: payload.apiStatus || {},
    };
  } catch (error) {
    // Spawned script exited 0 but stdout is not valid JSON. Surface stderr
    // and a stdout snippet so the trending-live decisionLog is self-diagnosing.
    const stderrTail = (result.stderr || "").trim().slice(-300);
    const stdoutHead = (result.stdout || "").trim().slice(0, 200);
    const detail = [
      `daily discovery JSON parse failed: ${error.message}`,
      stderrTail && `stderr: ${stderrTail}`,
      stdoutHead && `stdout[0..200]: ${stdoutHead}`,
    ].filter(Boolean).join(" | ").slice(0, 500);
    return { ok: false, error: detail, candidates: [] };
  }
}

function normalizeCurrentEventCandidate(record) {
  const event = record.eventDraft;
  if (!event) return null;
  return {
    id: `candidate-${slugify(event.id)}`,
    type: "current-event",
    title: event.title,
    summary: event.summary,
    topic: event.topic,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
    detectedAt: now.toISOString(),
    publishedAt: event.sourcePublishedAt,
    score: clampScore(record.candidateScore || event.editorialStrength || 0),
    velocityLabel: `${record.candidateScore}/100 review score`,
    ctaLabel: "Review candidate",
    sourceTrail: (event.sourceTrail || []).slice(0, 5).map((entry) => ({
      name: entry.name || entry.label || hostLabel(entry.url),
      url: entry.url,
      role: entry.role === "event-source" ? "event-source" : "official",
    })),
  };
}

async function collectSignals() {
  const decisionLog = [];
  const sourceResults = [];
  const discovery = runCurrentEventDiscovery();
  if (discovery.ok) {
    sourceResults.push(...discovery.candidates.map(normalizeCurrentEventCandidate).filter(Boolean));
    decisionLog.push(`current-event discovery returned ${discovery.candidates.length} review-ready candidate(s).`);
  } else {
    decisionLog.push(`current-event discovery skipped: ${discovery.error}`);
  }

  const sources = [
    ["github", fetchGithubTrending],
    ["gnews", fetchGNewsSignals],
    ["newsapi", fetchNewsApiSignals],
  ];

  for (const [name, fetcher] of sources) {
    try {
      const signals = await fetcher();
      sourceResults.push(...signals);
      decisionLog.push(`${name} returned ${signals.length} signal(s).`);
    } catch (error) {
      decisionLog.push(`${name} failed closed: ${error.message}`);
    }
  }

  return { signals: sourceResults.filter((item) => item?.sourceUrl), decisionLog };
}

function uniqueSignals(signals) {
  return Array.from(new Map(signals.map((item) => [item.sourceUrl || item.id, item])).values());
}

function cleanForValidation(item) {
  return {
    ...item,
    title: trimWords(trimText(item.title, 120), 18),
    summary: trimText(item.summary, 320),
    sourceTrail: (item.sourceTrail || []).filter((entry) => /^https:\/\//.test(entry.url)).slice(0, 6),
  };
}

async function main() {
  mkdirSync(AUTOMATED_DIR, { recursive: true });
  mkdirSync(PUBLIC_AUTOMATED_DIR, { recursive: true });

  const previous = readJson(TRENDING_FILE, {
    version: 1,
    generatedAt: "2026-05-05T00:00:00.000Z",
    refreshCadence: "every 3 hours",
    editorialThreshold: EDITORIAL_THRESHOLD,
    mode: "fail-closed",
    items: [],
    monitoredSignals: [],
    decisionLog: [],
  });

  const { signals, decisionLog } = await collectSignals();
  const ranked = uniqueSignals(signals)
    .map(cleanForValidation)
    .filter((item) => item.sourceTrail.length > 0)
    .sort((a, b) => b.score - a.score);

  const items = ranked.filter((item) => item.score >= EDITORIAL_THRESHOLD).slice(0, MAX_ITEMS);
  const monitoredSignals = ranked.filter((item) => item.score < EDITORIAL_THRESHOLD).slice(0, MAX_MONITORED);

  const next = {
    version: 1,
    generatedAt: now.toISOString(),
    refreshCadence: "every 3 hours",
    editorialThreshold: EDITORIAL_THRESHOLD,
    mode: "fail-closed",
    items,
    monitoredSignals,
    decisionLog: [
      ...decisionLog,
      `${items.length} signal(s) cleared the editorial threshold.`,
      `${monitoredSignals.length} near-threshold signal(s) kept as monitors.`,
    ],
  };

  const changed =
    stableHash({ items: previous.items || [], monitoredSignals: previous.monitoredSignals || [] }) !==
    stableHash({ items: next.items, monitoredSignals: next.monitoredSignals });

  if (changed && !dryRun) {
    writeJsonSafe(TRENDING_FILE, next);
    writeJsonSafe(PUBLIC_TRENDING_FILE, next);
  }

  const majorStory = items.some((item) => item.score >= 92);
  setGithubOutput({
    changed: changed ? "true" : "false",
    major_story: majorStory ? "true" : "false",
    published_count: String(items.length),
  });

  console.log(JSON.stringify({
    changed,
    majorStory,
    dryRun,
    publishedCount: items.length,
    monitoredCount: monitoredSignals.length,
    decisionLog: next.decisionLog,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
