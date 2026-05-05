#!/usr/bin/env node
/**
 * Multi-source current-event discovery dry-run.
 *
 * This script intentionally does not write production data. It probes fixed,
 * allowlisted endpoints, normalizes candidates into the editorial event shape,
 * and prints review-ready JSON. Promotion into data/current-events.json remains
 * a human-reviewed step that must pass validate-current-events.mjs.
 */

const allowedHosts = new Set([
  "api.fda.gov",
  "api.gdeltproject.org",
  "api.weather.gov",
  "news.google.com",
  "www.saferproducts.gov",
]);
const maxPayloadBytes = 1_500_000;
const userAgent = "SurfacedCurrentEventDiscovery/2.0 (https://surfaced.com/contact)";

const today = new Date();
const startDate = formatDate(daysAgo(30));
const compactStartDate = compactDate(daysAgo(30));
const compactEndDate = compactDate(today);

const feeds = [
  {
    id: "nws-active-alerts",
    sourceName: "National Weather Service",
    sourceType: "official",
    role: "event-source",
    format: "json",
    url: "https://api.weather.gov/alerts/active?status=actual&message_type=alert",
    normalize: normalizeNwsAlerts,
  },
  {
    id: "cpsc-recent-recalls",
    sourceName: "CPSC Recalls API",
    sourceType: "official",
    role: "event-source",
    format: "json",
    url: `https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=${startDate}`,
    normalize: normalizeCpscRecalls,
  },
  {
    id: "openfda-food-enforcement",
    sourceName: "openFDA food enforcement",
    sourceType: "official",
    role: "event-source",
    format: "json",
    url: `https://api.fda.gov/food/enforcement.json?search=report_date:[${compactStartDate}+TO+${compactEndDate}]&limit=10`,
    normalize: normalizeOpenFdaEnforcement,
  },
  {
    id: "openfda-drug-enforcement",
    sourceName: "openFDA drug enforcement",
    sourceType: "official",
    role: "event-source",
    format: "json",
    url: `https://api.fda.gov/drug/enforcement.json?search=report_date:[${compactStartDate}+TO+${compactEndDate}]&limit=10`,
    normalize: normalizeOpenFdaEnforcement,
  },
  {
    id: "gdelt-us-safety-signals",
    sourceName: "GDELT DOC 2.0",
    sourceType: "discovery",
    role: "signal",
    format: "json",
    url: "https://api.gdeltproject.org/api/v2/doc/doc?query=(recall%20OR%20%22severe%20weather%22%20OR%20openFDA%20OR%20CPSC%20OR%20NWS)%20sourceCountry:US&mode=artlist&format=json&maxrecords=10&sort=hybridrel&timespan=1w",
    normalize: normalizeGdeltArticles,
  },
  {
    id: "google-news-safety-corroboration",
    sourceName: "Google News RSS",
    sourceType: "corroboration",
    role: "signal",
    format: "rss",
    url: "https://news.google.com/rss/search?q=(recall%20OR%20%22severe%20weather%22%20OR%20FDA%20OR%20CPSC%20OR%20NWS)%20when:7d&hl=en-US&gl=US&ceid=US:en",
    normalize: normalizeGoogleNewsRss,
  },
];

function daysAgo(days) {
  return new Date(today.getTime() - days * 86_400_000);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function compactDate(date) {
  return formatDate(date).replaceAll("-", "");
}

function parseAllowedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`Refusing non-HTTPS URL: ${value}`);
  if (!allowedHosts.has(url.hostname)) throw new Error(`Refusing non-allowlisted host: ${url.hostname}`);
  return url;
}

async function fetchPayload(feed) {
  const url = parseAllowedUrl(feed.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: {
        accept: feed.format === "rss" ? "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8" : "application/json",
        "user-agent": userAgent,
      },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const contentType = response.headers.get("content-type") || "";
    if (feed.format === "json" && !contentType.includes("json")) {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }
    if (feed.format === "rss" && !/(xml|rss)/i.test(contentType)) {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > maxPayloadBytes) throw new Error(`Payload too large: ${contentLength}`);
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxPayloadBytes) throw new Error("Payload exceeded size limit");
    return feed.format === "json" ? JSON.parse(text) : text;
  } finally {
    clearTimeout(timeout);
  }
}

function makeCandidate(feed, fields) {
  const publishedAt = normalizeDate(fields.publishedAt) || formatDate(today);
  const sourceUrl = fields.sourceUrl || feed.url;
  const sourceTrail = [
    {
      label: feed.sourceName,
      name: feed.sourceName,
      url: feed.url,
      role: feed.role,
      sourceType: feed.sourceType,
      publisher: feed.sourceName,
    },
    ...(fields.sourceTrail || []),
  ];

  return {
    id: fields.id,
    topic: fields.topic,
    title: fields.title,
    summary: fields.summary,
    sourceUrl,
    publisher: fields.publisher || feed.sourceName,
    sourceType: feed.sourceType,
    geography: fields.geography || "US",
    publishedAt,
    confidence: fields.confidence,
    legitimacyScore: fields.legitimacyScore,
    timelinessScore: fields.timelinessScore,
    safetyScore: fields.safetyScore,
    sourceQualityScore: fields.sourceQualityScore,
    editorialStrength: fields.editorialStrength,
    sourceTrail,
    matchingRationale: fields.matchingRationale,
    recommendations: [],
    reviewNote: fields.reviewNote,
  };
}

function normalizeDate(value) {
  if (!value) return "";
  if (/^\d{8}$/.test(String(value))) {
    const text = String(value);
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function slugify(value) {
  return String(value || "candidate")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function truncate(value, max = 260) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function normalizeNwsAlerts(payload, feed) {
  return (payload.features || []).slice(0, 15).map((feature) => {
    const properties = feature.properties || {};
    const severity = properties.severity || "";
    const title = properties.headline || properties.event || "Weather alert";
    return makeCandidate(feed, {
      id: `nws-${slugify(properties.id || properties.event || title)}`,
      topic: "weather.severe-alert",
      title,
      summary: truncate(properties.description || properties.instruction || title),
      sourceUrl: feature.id || properties.uri || properties["@id"] || feed.url,
      publisher: "weather.gov",
      geography: properties.areaDesc || "US",
      publishedAt: properties.sent || properties.effective,
      confidence: severity === "Extreme" || severity === "Severe" ? 92 : 84,
      legitimacyScore: 94,
      timelinessScore: 96,
      safetyScore: 92,
      sourceQualityScore: 95,
      editorialStrength: severity === "Extreme" || severity === "Severe" ? 90 : 84,
      matchingRationale: "Official NWS alert; commerce matching should be limited to preparedness basics and never storm-panic language.",
      reviewNote: "Official weather source. Promote only if geography and useful response steps are clear.",
    });
  });
}

function normalizeCpscRecalls(payload, feed) {
  return (Array.isArray(payload) ? payload : []).slice(0, 12).map((recall) => {
    const product = recall.Products?.[0]?.Name || "consumer product";
    const hazard = recall.Hazards?.[0]?.Name || recall.Description || "";
    return makeCandidate(feed, {
      id: `cpsc-${slugify(recall.RecallNumber || recall.Title)}`,
      topic: "consumer-safety.recall",
      title: truncate(recall.Title, 140),
      summary: truncate(`${product}: ${hazard}`, 300),
      sourceUrl: recall.URL || feed.url,
      publisher: "CPSC",
      geography: "US",
      publishedAt: recall.RecallDate || recall.LastPublishDate,
      confidence: 92,
      legitimacyScore: 94,
      timelinessScore: 86,
      safetyScore: 95,
      sourceQualityScore: 94,
      editorialStrength: 90,
      matchingRationale: "Official recall record; recommendations should point to recall remedies, manufacturer support, or safer replacement categories only after relevance review.",
      reviewNote: "Official CPSC recall. Avoid recommending the recalled item or unsafe substitutes.",
    });
  });
}

function normalizeOpenFdaEnforcement(payload, feed) {
  return (payload.results || []).slice(0, 10).map((record) => {
    const product = record.product_description || record.openfda?.brand_name?.[0] || "regulated product";
    const reason = record.reason_for_recall || record.product_quantity || "FDA enforcement record";
    return makeCandidate(feed, {
      id: `${feed.id}-${slugify(record.recall_number || product)}`,
      topic: feed.id.includes("food") ? "health-safety.food-enforcement" : "health-safety.drug-enforcement",
      title: truncate(`${record.recalling_firm || "FDA"} recall or enforcement update`, 140),
      summary: truncate(`${product}: ${reason}`, 300),
      sourceUrl: feed.url,
      publisher: "openFDA",
      geography: record.distribution_pattern || "US",
      publishedAt: record.report_date,
      confidence: 90,
      legitimacyScore: 92,
      timelinessScore: 84,
      safetyScore: 95,
      sourceQualityScore: 93,
      editorialStrength: 88,
      matchingRationale: "Official FDA data; recommendations should emphasize checking affected products, official recall steps, and non-commerce guidance first.",
      reviewNote: "Official openFDA layer. Confirm detail page/source wording before publishing a guide.",
    });
  });
}

function normalizeGdeltArticles(payload, feed) {
  return (payload.articles || []).slice(0, 10).map((article) =>
    makeCandidate(feed, {
      id: `gdelt-${slugify(article.url || article.title)}`,
      topic: "discovery-signal.publisher-coverage",
      title: truncate(article.title, 140),
      summary: "Publisher coverage discovered by GDELT. This is a signal only and must be verified against an official source before publication.",
      sourceUrl: article.url,
      publisher: article.domain || "publisher",
      geography: article.sourceCountry || "US",
      publishedAt: article.seendate,
      confidence: 62,
      legitimacyScore: 64,
      timelinessScore: 88,
      safetyScore: 78,
      sourceQualityScore: 76,
      editorialStrength: 64,
      matchingRationale: "Discovery-only signal; no commerce matching until an official source confirms the event.",
      sourceTrail: [
        {
          label: article.domain || "Publisher candidate",
          name: article.domain || "Publisher candidate",
          url: article.url,
          role: "signal",
          sourceType: "corroboration",
          publisher: article.domain || "publisher",
        },
      ],
      reviewNote: "Discovery signal only. Do not publish without official verification.",
    }),
  );
}

function normalizeGoogleNewsRss(xml, feed) {
  return parseRssItems(xml).slice(0, 10).map((item) =>
    makeCandidate(feed, {
      id: `google-news-${slugify(item.link || item.title)}`,
      topic: "corroboration-signal.publisher-coverage",
      title: truncate(item.title, 140),
      summary: "Publisher coverage found through Google News RSS. Use only as corroboration after resolving the publisher and finding an official source.",
      sourceUrl: item.link || feed.url,
      publisher: item.source || "Google News publisher",
      geography: "US",
      publishedAt: item.pubDate,
      confidence: 66,
      legitimacyScore: 68,
      timelinessScore: 86,
      safetyScore: 78,
      sourceQualityScore: 78,
      editorialStrength: 66,
      matchingRationale: "Corroboration signal; no commerce matching until the official source and source trail are complete.",
      reviewNote: "Google News RSS is not final truth. Resolve the publisher and verify against official sources.",
    }),
  );
}

function parseRssItems(xml) {
  const items = [];
  const itemMatches = String(xml || "").matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi);
  for (const match of itemMatches) {
    const raw = match[1];
    items.push({
      title: xmlText(raw, "title"),
      link: xmlText(raw, "link"),
      pubDate: xmlText(raw, "pubDate"),
      source: xmlText(raw, "source"),
    });
  }
  return items;
}

function xmlText(raw, tag) {
  const match = raw.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXml(match?.[1] || "");
}

function decodeXml(value) {
  return String(value)
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .trim();
}

async function main() {
  const results = [];
  for (const feed of feeds) {
    try {
      const payload = await fetchPayload(feed);
      results.push(...feed.normalize(payload, feed));
    } catch (error) {
      results.push({
        feedId: feed.id,
        sourceName: feed.sourceName,
        sourceType: feed.sourceType,
        role: feed.role,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    pipeline: "discover -> normalize -> verify -> score -> match -> filter -> publish",
    promotionRule: "Candidates are review inputs only; production items must pass scripts/validate-current-events.mjs.",
    candidates: results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
