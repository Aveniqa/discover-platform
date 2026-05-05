#!/usr/bin/env node
/**
 * Dry-run current-event discovery scaffold.
 *
 * This intentionally does not write production data. It probes fixed,
 * allowlisted JSON endpoints and prints candidate signals for editorial review.
 * Keep it dry-run until a human-reviewed workflow promotes candidates into
 * data/current-events.json and validate-current-events.mjs passes.
 */

const allowedHosts = new Set(["api.gdeltproject.org", "api.weather.gov"]);
const maxPayloadBytes = 1_500_000;

const feeds = [
  {
    id: "gdelt-us-public-health",
    sourceName: "GDELT DOC 2.0",
    role: "signal",
    url: "https://api.gdeltproject.org/api/v2/doc/doc?query=(public%20health%20OR%20CDC%20OR%20FDA)%20sourceCountry:US&mode=artlist&format=json&maxrecords=10&sort=hybridrel",
    normalize: normalizeGdeltArticles,
  },
  {
    id: "gdelt-us-preparedness",
    sourceName: "GDELT DOC 2.0",
    role: "signal",
    url: "https://api.gdeltproject.org/api/v2/doc/doc?query=(NOAA%20OR%20FEMA%20OR%20Ready.gov%20OR%20preparedness)%20sourceCountry:US&mode=artlist&format=json&maxrecords=10&sort=hybridrel",
    normalize: normalizeGdeltArticles,
  },
  {
    id: "nws-active-alerts",
    sourceName: "National Weather Service",
    role: "official",
    url: "https://api.weather.gov/alerts/active?status=actual&message_type=alert",
    normalize: normalizeNwsAlerts,
  },
];

function parseAllowedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`Refusing non-HTTPS URL: ${value}`);
  if (!allowedHosts.has(url.hostname)) throw new Error(`Refusing non-allowlisted host: ${url.hostname}`);
  return url;
}

async function fetchJson(feed) {
  const url = parseAllowedUrl(feed.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "user-agent": "SurfacedCurrentEventDiscovery/1.0",
      },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) throw new Error(`Unsupported content-type: ${contentType}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > maxPayloadBytes) throw new Error(`Payload too large: ${contentLength}`);
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxPayloadBytes) throw new Error("Payload exceeded size limit");
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeGdeltArticles(payload, feed) {
  return (payload.articles || []).slice(0, 10).map((article) => ({
    feedId: feed.id,
    sourceName: feed.sourceName,
    role: feed.role,
    title: article.title,
    url: article.url,
    publishedAt: article.seendate || article.domain || null,
    publisher: article.domain || "unknown",
    signalStrength: article.socialimage ? 72 : 66,
    reviewNote: "Discovery signal only; verify against an official or high-trust primary source before featuring.",
  }));
}

function normalizeNwsAlerts(payload, feed) {
  return (payload.features || []).slice(0, 15).map((feature) => {
    const properties = feature.properties || {};
    return {
      feedId: feed.id,
      sourceName: feed.sourceName,
      role: feed.role,
      title: properties.headline || properties.event || "Weather alert",
      url: feature.id || properties.uri || properties["@id"] || "https://api.weather.gov/alerts/active",
      publishedAt: properties.sent || properties.effective || null,
      publisher: "weather.gov",
      signalStrength: properties.severity === "Extreme" || properties.severity === "Severe" ? 90 : 78,
      reviewNote: "Official weather signal; match products only to preparedness guidance, never to alarmist storm language.",
    };
  });
}

async function main() {
  const results = [];
  for (const feed of feeds) {
    try {
      const payload = await fetchJson(feed);
      results.push(...feed.normalize(payload, feed));
    } catch (error) {
      results.push({
        feedId: feed.id,
        sourceName: feed.sourceName,
        role: feed.role,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    candidates: results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
