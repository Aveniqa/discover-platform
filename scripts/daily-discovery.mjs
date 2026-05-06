#!/usr/bin/env node
/**
 * Daily platform discovery.
 *
 * Fetches allowlisted current-event sources and writes review-only candidates to
 * data/current-events-candidates.json. This script never promotes candidates to
 * data/current-events.json; homepage publication remains a manual editorial step.
 */

import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeJsonSafe } from "./lib/write-safe.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const DEFAULT_OUTPUT = join(ROOT, "data", "current-events-candidates.json");
const USER_AGENT = "SurfacedDailyDiscovery/3.0 (https://surfaced-x.pages.dev/contact)";
const MAX_PAYLOAD_BYTES = 1_800_000;
const MAX_REVIEW_CANDIDATES = 14;
const MAX_REJECTED_CANDIDATES = 30;
const REVIEW_THRESHOLD = 82;
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_BASE_DELAY_MS = 1500;
const API_RETRY_MAX_DELAY_MS = 12000;

const args = new Set(process.argv.slice(2));
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? resolve(outputArg.slice("--output=".length)) : DEFAULT_OUTPUT;
const dryRun = args.has("--dry-run");
const now = process.env.DISCOVERY_NOW ? new Date(process.env.DISCOVERY_NOW) : new Date();
const today = formatDate(now);
const startDate = formatDate(daysAgo(30, now));
const compactStartDate = compactDate(daysAgo(45, now));

const allowedFetchHosts = new Set([
  "api.fda.gov",
  "api.gdeltproject.org",
  "api.producthunt.com",
  "api.weather.gov",
  "hacker-news.firebaseio.com",
  "www.saferproducts.gov",
]);

const officialHosts = new Set([
  "api.fda.gov",
  "api.weather.gov",
  "cdc.gov",
  "cpsc.gov",
  "fda.gov",
  "noaa.gov",
  "open.fda.gov",
  "saferproducts.gov",
  "weather.gov",
]);

const sourceFeeds = [
  {
    id: "nws-active-alerts",
    sourceName: "National Weather Service",
    sourceType: "official",
    topic: "weather.severe-alert",
    role: "event-source",
    format: "json",
    url: "https://api.weather.gov/alerts/active?status=actual&message_type=alert",
    normalize: normalizeNwsAlerts,
  },
  {
    id: "cpsc-recent-recalls",
    sourceName: "CPSC Recalls API",
    sourceType: "official",
    topic: "consumer-safety.recall",
    role: "event-source",
    format: "json",
    url: `https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=${startDate}`,
    normalize: normalizeCpscRecalls,
  },
  {
    id: "openfda-food-enforcement",
    sourceName: "openFDA food enforcement",
    sourceType: "official",
    topic: "health-safety.food-enforcement",
    role: "event-source",
    format: "json",
    url: "https://api.fda.gov/food/enforcement.json?limit=15&sort=report_date:desc",
    normalize: normalizeOpenFdaEnforcement,
  },
  {
    id: "openfda-drug-enforcement",
    sourceName: "openFDA drug enforcement",
    sourceType: "official",
    topic: "health-safety.drug-enforcement",
    role: "event-source",
    format: "json",
    url: "https://api.fda.gov/drug/enforcement.json?limit=15&sort=report_date:desc",
    normalize: normalizeOpenFdaEnforcement,
  },
  {
    id: "openfda-device-enforcement",
    sourceName: "openFDA device enforcement",
    sourceType: "official",
    topic: "health-safety.device-enforcement",
    role: "event-source",
    format: "json",
    url: "https://api.fda.gov/device/enforcement.json?limit=15&sort=report_date:desc",
    normalize: normalizeOpenFdaEnforcement,
  },
  {
    id: "gdelt-us-safety-signals",
    sourceName: "GDELT DOC 2.0",
    sourceType: "discovery",
    topic: "discovery-signal.publisher-coverage",
    role: "signal",
    format: "json",
    url: "https://api.gdeltproject.org/api/v2/doc/doc?query=(recall%20OR%20%22severe%20weather%22%20OR%20openFDA%20OR%20CPSC%20OR%20NWS)%20sourceCountry:US&mode=artlist&format=json&maxrecords=12&sort=hybridrel&timespan=1w",
    normalize: normalizeGdeltArticles,
  },
];

function daysAgo(days, base = new Date()) {
  return new Date(base.getTime() - days * 86_400_000);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function compactDate(date) {
  return formatDate(date).replaceAll("-", "");
}

function dateFromCompact(value) {
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return "";
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function parseDate(value) {
  if (!value) return null;
  const normalized = /^\d{8}$/.test(String(value)) ? `${dateFromCompact(value)}T00:00:00.000Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDate(value, fallback = today) {
  return formatDate(parseDate(value) ?? new Date(`${fallback}T00:00:00.000Z`));
}

function ageDays(value) {
  const date = parseDate(value);
  if (!date) return Infinity;
  return Math.max(0, (now.getTime() - date.getTime()) / 86_400_000);
}

function freshnessScore(value) {
  const age = ageDays(value);
  if (age <= 2) return 98;
  if (age <= 7) return 94;
  if (age <= 21) return 86;
  if (age <= 45) return 72;
  if (age <= 90) return 58;
  return 30;
}

function slugify(value) {
  return String(value || "candidate")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function truncate(value, max = 260) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}...` : text;
}

function hostOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hostAllowed(host, hosts) {
  return [...hosts].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function parseAllowedFetchUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`Refusing non-HTTPS URL: ${value}`);
  if (!allowedFetchHosts.has(url.hostname)) throw new Error(`Refusing non-allowlisted fetch host: ${url.hostname}`);
  return url;
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

async function fetchPayload(feed) {
  const url = parseAllowedFetchUrl(feed.url);
  return withRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, {
        headers: {
          accept: feed.format === "json" ? "application/json" : "application/rss+xml, application/xml;q=0.9",
          "user-agent": USER_AGENT,
        },
        redirect: "error",
        signal: controller.signal,
      });
      if (!response.ok) throw httpError(response.status, response.statusText);
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > MAX_PAYLOAD_BYTES) throw new Error(`Payload too large: ${contentLength}`);
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > MAX_PAYLOAD_BYTES) throw new Error("Payload exceeded size limit");
      return feed.format === "json" ? JSON.parse(text) : text;
    } finally {
      clearTimeout(timeout);
    }
  }, { label: feed.id });
}

function sourceTrailEntry(feed, url = feed.url, role = feed.role, sourceType = feed.sourceType) {
  return {
    name: feed.sourceName,
    label: feed.sourceName,
    url,
    role,
    sourceType,
    publisher: feed.sourceName,
  };
}

function makeCandidate(feed, fields) {
  const sourceUrl = fields.sourceUrl || feed.url;
  const sourcePublishedAt = normalizeDate(fields.publishedAt);
  return {
    id: fields.id || `${feed.id}-${slugify(fields.title)}`,
    feedId: feed.id,
    topic: fields.topic || feed.topic,
    title: truncate(fields.title, 140),
    summary: truncate(fields.summary, 360),
    whyNow: fields.whyNow || "This candidate appeared in an allowlisted daily discovery feed and needs editorial review.",
    sourceName: fields.sourceName || feed.sourceName,
    sourceUrl,
    sourceType: fields.sourceType || feed.sourceType,
    publisher: fields.publisher || feed.sourceName,
    sourcePublishedAt,
    lastVerifiedAt: today,
    geography: Array.isArray(fields.geography) ? fields.geography : [fields.geography || "US"],
    sourceQualityScore: fields.sourceQualityScore ?? sourceScoreForUrl(sourceUrl, fields.sourceType || feed.sourceType),
    legitimacyScore: fields.legitimacyScore ?? 80,
    timelinessScore: fields.timelinessScore ?? freshnessScore(sourcePublishedAt),
    safetyScore: fields.safetyScore ?? 82,
    confidence: fields.confidence ?? 80,
    commerceRelevanceScore: fields.commerceRelevanceScore ?? commerceRelevance(fields.topic || feed.topic, fields.title),
    weatherState: fields.weatherState,
    responseTags: fields.responseTags || inferResponseTags(fields.topic || feed.topic, fields.title, fields.summary),
    sourceTrail: [
      sourceTrailEntry(feed),
      ...(fields.sourceTrail || []),
      ...(sourceUrl !== feed.url ? [sourceTrailEntry(feed, sourceUrl, "event-source", fields.sourceType || feed.sourceType)] : []),
    ],
    reviewNote: fields.reviewNote || "Review source details, recommendations, affiliate labels, and visible-page consistency before promotion.",
  };
}

function sourceScoreForUrl(url, sourceType) {
  const host = hostOf(url);
  if (sourceType === "official" && hostAllowed(host, officialHosts)) return 94;
  if (host === "api.gdeltproject.org" || host === "gdeltproject.org") return 72;
  return 64;
}

function commerceRelevance(topic, title) {
  const text = `${topic} ${title}`.toLowerCase();
  if (/weather|hurricane|tornado|flood|storm|heat|air-quality/.test(text)) return 88;
  if (/recall|cpsc|device|food|drug|enforcement/.test(text)) return 74;
  if (/cdc|fda|health|safety/.test(text)) return 70;
  return 55;
}

function inferResponseTags(topic, title, summary = "") {
  const text = `${topic} ${title} ${summary}`.toLowerCase();
  if (/tornado/.test(text)) return ["weather", "tornado", "preparedness"];
  if (/hurricane|tropical storm/.test(text)) return ["weather", "hurricane", "preparedness"];
  if (/flood|heavy rain/.test(text)) return ["weather", "flooding", "preparedness"];
  if (/heat/.test(text)) return ["weather", "heat", "cooling"];
  if (/air quality|smoke|aqi/.test(text)) return ["air-quality", "mask", "indoor-air"];
  if (/recall|cpsc/.test(text)) return ["recall", "safety", "manufacturer-remedy"];
  if (/food/.test(text)) return ["food-recall", "safety", "official-guidance"];
  if (/drug|device/.test(text)) return ["health-recall", "safety", "official-guidance"];
  return ["current-event", "source-check"];
}

export function mapWeatherStateFromText(topic, title, summary = "") {
  const text = `${topic} ${title} ${summary}`.toLowerCase();
  if (/\b(hurricane|tropical storm|cyclone)\b/.test(text)) return "hurricanes";
  if (/\btornado\b/.test(text)) return "tornado";
  if (/\bflash flood|flooding|heavy rain|atmospheric river\b/.test(text)) return "heavy rain";
  if (/\bdrizzle\b/.test(text)) return "drizzle";
  if (/\brain|showers\b/.test(text)) return "rain";
  if (/\bheat|excessive heat\b/.test(text)) return "sunny";
  if (/\bcloud|overcast\b/.test(text)) return "cloudy";
  return "neutral";
}

export function scoreCandidate(candidate) {
  const officialBonus = candidate.sourceType === "official" ? 8 : -18;
  const trailBonus = candidate.sourceTrail.some((entry) => hostAllowed(hostOf(entry.url), officialHosts)) ? 6 : -12;
  const stalePenalty = ageDays(candidate.sourcePublishedAt) > 45 ? 18 : 0;
  const unsafePenalty = /\bmiracle|cure|panic|guarantee|urgent buy\b/i.test(`${candidate.title} ${candidate.summary}`) ? 30 : 0;
  const thresholdPenalty =
    (candidate.confidence < 82 ? 14 : 0) +
    (candidate.safetyScore < 82 ? 14 : 0) +
    (candidate.sourceQualityScore < 80 ? 12 : 0);
  return clampScore(
    candidate.sourceQualityScore * 0.25 +
      candidate.legitimacyScore * 0.18 +
      candidate.timelinessScore * 0.2 +
      candidate.safetyScore * 0.18 +
      candidate.confidence * 0.12 +
      candidate.commerceRelevanceScore * 0.07 +
      officialBonus +
      trailBonus -
      stalePenalty -
      unsafePenalty -
      thresholdPenalty,
  );
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function rejectionReasons(candidate, score) {
  const reasons = [];
  if (candidate.sourceType !== "official") reasons.push("Discovery or corroboration signal only; official source required.");
  if (!candidate.sourceTrail.some((entry) => hostAllowed(hostOf(entry.url), officialHosts))) {
    reasons.push("No official source in source trail.");
  }
  if (candidate.sourceQualityScore < 80) reasons.push("Source quality is below the editorial gate.");
  if (candidate.confidence < 82) reasons.push("Confidence is below homepage threshold.");
  if (candidate.safetyScore < 82) reasons.push("Safety score is below homepage threshold.");
  if (candidate.timelinessScore < 60 || ageDays(candidate.sourcePublishedAt) > 90) reasons.push("Event is stale.");
  if (score < REVIEW_THRESHOLD) reasons.push("Composite score is below review-ready threshold.");
  return reasons;
}

function recommendationKeywords(candidate) {
  const text = `${candidate.topic} ${candidate.title} ${candidate.summary}`.toLowerCase();
  if (/weather|hurricane|tornado|flood|storm/.test(text)) {
    return [
      "NOAA weather radio",
      "portable power bank",
      "emergency flashlight",
      "waterproof document pouch",
    ];
  }
  if (/heat/.test(text)) return ["cooling towel", "insulated water bottle", "portable fan"];
  if (/air quality|smoke/.test(text)) return ["N95 respirator", "HEPA air purifier", "air quality monitor"];
  if (/recall|cpsc/.test(text)) return ["manufacturer recall remedy", "safer replacement checklist"];
  if (/food|drug|device/.test(text)) return ["FDA recall lookup", "lot number check", "official recall instructions"];
  return ["official guidance", "preparedness checklist"];
}

function commerceResolutionStatus(candidate) {
  return {
    status: "manual-match-required",
    directMatchPolicy: "Use PA-API or Best Buy direct product URLs only when title/brand/SKU confidence is 82+.",
    apiAvailability: {
      amazonPaApi: Boolean(process.env.AMAZON_PAAPI_ACCESS_KEY && process.env.AMAZON_PAAPI_SECRET_KEY),
      bestBuy: Boolean(process.env.BEST_BUY_API_KEY),
    },
    recommendationKeywords: recommendationKeywords(candidate),
  };
}

function toReviewRecord(candidate) {
  const score = scoreCandidate(candidate);
  const rejections = rejectionReasons(candidate, score);
  const reviewReady = rejections.length === 0;
  const sourceTrail = uniqueByUrl(candidate.sourceTrail).filter((entry) => isHttpsUrl(entry.url));
  return {
    id: candidate.id,
    status: reviewReady ? "review-ready" : "rejected",
    candidateScore: score,
    decision: reviewReady ? "Candidate can be manually drafted for data/current-events.json." : "Fail-closed; do not publish without fixes.",
    rejectionReasons: rejections,
    eventDraft: {
      id: candidate.id,
      status: "paused",
      priority: 99,
      label: labelForTopic(candidate.topic),
      topic: candidate.topic,
      sourceType: candidate.sourceType,
      publisher: candidate.publisher,
      geography: candidate.geography,
      confidence: candidate.confidence,
      editorialStrength: score,
      sourceQualityScore: candidate.sourceQualityScore,
      legitimacyScore: candidate.legitimacyScore,
      timelinessScore: candidate.timelinessScore,
      safetyScore: candidate.safetyScore,
      matchingRationale: "Generated by daily discovery; editor must verify recommendations and source consistency before publication.",
      title: candidate.title,
      summary: candidate.summary,
      whyNow: candidate.whyNow,
      sourceName: candidate.sourceName,
      sourceUrl: candidate.sourceUrl,
      sourcePublishedAt: candidate.sourcePublishedAt,
      publishedAt: candidate.sourcePublishedAt,
      lastVerifiedAt: candidate.lastVerifiedAt,
      responseTags: candidate.responseTags,
      weatherState: candidate.weatherState,
      sourceTrail,
      editorialSafeguards: [
        "Manual promotion required; this candidate is not published by automation.",
        "Recommendations must cite official guidance and keep commerce secondary.",
        "Direct product links require high-confidence ASIN/SKU matching before use.",
      ],
    },
    commerce: commerceResolutionStatus(candidate),
    reviewNote: candidate.reviewNote,
  };
}

function labelForTopic(topic) {
  if (topic.startsWith("weather")) return "Weather preparedness";
  if (topic.includes("recall")) return "Product safety";
  if (topic.includes("health")) return "Health safety";
  return "Current signal";
}

function uniqueByUrl(entries) {
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}

export function rankReviewRecords(records) {
  return [...records].sort((a, b) => {
    if (a.status !== b.status) return a.status === "review-ready" ? -1 : 1;
    if (a.candidateScore !== b.candidateScore) return b.candidateScore - a.candidateScore;
    return a.eventDraft.sourcePublishedAt < b.eventDraft.sourcePublishedAt ? 1 : -1;
  });
}

function normalizeNwsAlerts(payload, feed) {
  return (payload.features || []).slice(0, 20).map((feature) => {
    const properties = feature.properties || {};
    const title = properties.headline || properties.event || "Weather alert";
    const severity = properties.severity || "";
    const certainty = properties.certainty || "";
    const eventName = properties.event || title;
    const summary = properties.description || properties.instruction || title;
    const highImpact = /(tornado|flash flood|hurricane|tropical storm|storm surge|severe thunderstorm|extreme heat|excessive heat|red flag|winter storm|blizzard|ice storm|air quality)/i.test(eventName);
    const strongAlert = highImpact || ["Extreme", "Severe"].includes(severity);
    const confidence = strongAlert ? 92 : certainty === "Observed" ? 80 : 74;
    return makeCandidate(feed, {
      id: `nws-${slugify(properties.id || properties.event || title)}`,
      title,
      summary,
      whyNow: "NWS has an active alert; promote only when the affected geography and useful preparedness steps are clear.",
      sourceUrl: feature.id || properties.uri || properties["@id"] || feed.url,
      publisher: "weather.gov",
      geography: properties.areaDesc || "US",
      publishedAt: properties.sent || properties.effective,
      confidence,
      legitimacyScore: highImpact ? 94 : 88,
      timelinessScore: 98,
      safetyScore: highImpact ? 93 : 78,
      sourceQualityScore: 95,
      commerceRelevanceScore: highImpact ? 88 : 55,
      weatherState: mapWeatherStateFromText(feed.topic, title, summary),
      reviewNote: highImpact
        ? "Regional high-impact alert. Keep copy local, calm, and preparedness-first."
        : "Lower-impact or highly local advisory. Keep as a monitor signal unless it escalates.",
    });
  });
}

function normalizeCpscRecalls(payload, feed) {
  return (Array.isArray(payload) ? payload : []).slice(0, 16).map((recall) => {
    const product = recall.Products?.[0]?.Name || "consumer product";
    const hazard = recall.Hazards?.[0]?.Name || recall.Description || "";
    return makeCandidate(feed, {
      id: `cpsc-${slugify(recall.RecallNumber || recall.Title)}`,
      title: truncate(recall.Title, 140),
      summary: truncate(`${product}: ${hazard}`, 320),
      whyNow: "CPSC posted or updated this recall recently; promote only with remedy-first guidance and no recommendation for the recalled item.",
      sourceUrl: recall.URL || feed.url,
      publisher: "CPSC",
      geography: "US",
      publishedAt: recall.RecallDate || recall.LastPublishDate,
      confidence: 92,
      legitimacyScore: 94,
      timelinessScore: freshnessScore(recall.RecallDate || recall.LastPublishDate),
      safetyScore: 96,
      sourceQualityScore: 94,
      commerceRelevanceScore: 72,
      reviewNote: "Recall candidate. Do not monetize the recalled product; only remedies or verified safer replacement categories after review.",
    });
  });
}

function normalizeOpenFdaEnforcement(payload, feed) {
  return (payload.results || []).slice(0, 16).map((record) => {
    const product = record.product_description || record.openfda?.brand_name?.[0] || "regulated product";
    const reason = record.reason_for_recall || record.product_quantity || "FDA enforcement record";
    return makeCandidate(feed, {
      id: `${feed.id}-${slugify(record.recall_number || product)}`,
      title: truncate(`${record.recalling_firm || "FDA"} recall or enforcement update`, 140),
      summary: truncate(`${product}: ${reason}`, 320),
      whyNow: "openFDA has a recent enforcement record; promote only after checking the official details and affected product scope.",
      sourceUrl: feed.url,
      publisher: "openFDA",
      geography: record.distribution_pattern || "US",
      publishedAt: dateFromCompact(record.report_date) || record.report_date,
      confidence: 90,
      legitimacyScore: 92,
      timelinessScore: freshnessScore(dateFromCompact(record.report_date) || record.report_date),
      safetyScore: 96,
      sourceQualityScore: 93,
      commerceRelevanceScore: 68,
      reviewNote: "FDA candidate. Emphasize product checks, lots, official instructions, and non-commerce guidance first.",
    });
  });
}

function normalizeGdeltArticles(payload, feed) {
  return (payload.articles || []).slice(0, 12).map((article) =>
    makeCandidate(feed, {
      id: `gdelt-${slugify(article.url || article.title)}`,
      title: truncate(article.title, 140),
      summary: "Publisher coverage discovered by GDELT. Treat as a trend signal only until an official source confirms the event.",
      sourceUrl: feed.url,
      publisher: "GDELT",
      geography: article.sourceCountry || "US",
      publishedAt: article.seendate,
      confidence: 62,
      legitimacyScore: 64,
      timelinessScore: 88,
      safetyScore: 78,
      sourceQualityScore: 72,
      commerceRelevanceScore: 55,
      sourceTrail: article.url && isHttpsUrl(article.url)
        ? [{ name: article.domain || "Publisher signal", label: article.domain || "Publisher signal", url: article.url, role: "signal", sourceType: "corroboration", publisher: article.domain || "publisher" }]
        : [],
      reviewNote: "Discovery signal only. Resolve to official source before any homepage consideration.",
    }),
  );
}

async function fetchHackerNewsSignals(limit = 10) {
  const ids = await fetchPayload({
    id: "hn-showstories",
    format: "json",
    url: "https://hacker-news.firebaseio.com/v0/showstories.json",
  });
  const items = await Promise.all(
    ids.slice(0, 50).map(async (id) => {
      try {
        return await fetchPayload({ id: `hn-${id}`, format: "json", url: `https://hacker-news.firebaseio.com/v0/item/${id}.json` });
      } catch {
        return null;
      }
    }),
  );
  return items
    .filter((item) => item && item.type === "story" && item.url && item.title && (item.score || 0) >= 30)
    .slice(0, limit)
    .map((item) => ({
      provider: "hacker-news",
      title: item.title.replace(/^Show HN:\s*/i, ""),
      url: item.url,
      score: item.score,
      sourceTrail: [{ name: "Hacker News discussion", url: `https://news.ycombinator.com/item?id=${item.id}`, role: "signal" }],
      editorialNote: "Use as tech discovery signal only; verify product/site before adding to daily-tools or hidden-gems.",
    }));
}

async function fetchProductHuntSignals(limit = 10) {
  if (!process.env.PRODUCT_HUNT_TOKEN) return [];
  const query = `
    query SurfacedProductHuntSignals {
      posts(order: VOTES, first: ${limit}) {
        edges { node { name tagline description url website votesCount createdAt } }
      }
    }`;
  const response = await withRetry(async () => {
    const result = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.PRODUCT_HUNT_TOKEN}`,
        "content-type": "application/json",
        "user-agent": USER_AGENT,
      },
      body: JSON.stringify({ query }),
    });
    if (!result.ok) throw httpError(result.status, result.statusText || "Product Hunt");
    return result;
  }, { label: "product-hunt" });
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(`Product Hunt GraphQL error: ${payload.errors.map((error) => error.message).join("; ")}`);
  return (payload.data?.posts?.edges || [])
    .map((edge) => edge.node)
    .filter((post) => post?.name && post?.url && (post.votesCount || 0) >= 25)
    .map((post) => ({
      provider: "product-hunt",
      title: post.name,
      tagline: post.tagline || post.description,
      url: post.website || post.url,
      score: post.votesCount,
      sourceTrail: [{ name: "Product Hunt post", url: post.url, role: "signal" }],
      editorialNote: "Use as launch signal only; Product Hunt requires attribution and commercial-use approval.",
    }));
}

async function main() {
  const decisionLog = [];
  const feedResults = [];
  const rawCandidates = [];

  for (const feed of sourceFeeds) {
    try {
      const payload = await fetchPayload(feed);
      const normalized = feed.normalize(payload, feed);
      rawCandidates.push(...normalized);
      feedResults.push({ id: feed.id, ok: true, normalized: normalized.length });
      decisionLog.push(`${feed.id}: normalized ${normalized.length} candidate(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      feedResults.push({ id: feed.id, ok: false, error: message });
      decisionLog.push(`${feed.id}: fetch rejected (${message}).`);
    }
  }

  const records = rankReviewRecords(rawCandidates.map(toReviewRecord));
  const candidates = records.filter((record) => record.status === "review-ready").slice(0, MAX_REVIEW_CANDIDATES);
  const rejected = records.filter((record) => record.status !== "review-ready").slice(0, MAX_REJECTED_CANDIDATES);

  const [hackerNews, productHunt] = await Promise.all([
    fetchHackerNewsSignals().catch((error) => [{ error: error instanceof Error ? error.message : String(error) }]),
    fetchProductHuntSignals().catch((error) => [{ error: error instanceof Error ? error.message : String(error) }]),
  ]);

  const output = {
    version: 1,
    generatedAt: now.toISOString(),
    mode: "manual-promotion-required",
    promotionTarget: "data/current-events.json",
    sourceWindow: {
      since: startDate,
      openFdaSince: compactStartDate,
    },
    rotationPolicy: {
      leadSelection: "homepageEligible first, then daily lead-rank score from editorial strength, confidence, freshness, recommendation coverage, and priority.",
      manualGate: "Only data/current-events.json publishes to the homepage. This file is candidates only.",
    },
    apiStatus: {
      nws: "enabled-no-key",
      cpsc: "enabled-no-key",
      openFda: "enabled-no-key",
      gdelt: "enabled-no-key",
      hackerNews: "enabled-no-key",
      productHunt: process.env.PRODUCT_HUNT_TOKEN ? "enabled-token-present" : "disabled-missing-token",
      amazonPaApi: process.env.AMAZON_PAAPI_ACCESS_KEY && process.env.AMAZON_PAAPI_SECRET_KEY ? "available-for-commerce-resolution" : "disabled-missing-credentials",
      bestBuy: process.env.BEST_BUY_API_KEY ? "available-for-commerce-resolution" : "disabled-missing-key",
    },
    feeds: feedResults,
    candidates,
    rejected,
    discoverySignals: {
      hackerNews,
      productHunt,
    },
    decisionLog,
  };

  if (dryRun) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeJsonSafe(outputPath, output);
    console.log(`Wrote ${candidates.length} review candidate(s), ${rejected.length} rejected candidate(s) to ${outputPath}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
