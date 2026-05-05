#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const fileArg = process.argv.find((arg) => arg.startsWith("--file="));
const file = fileArg
  ? join(ROOT, fileArg.slice("--file=".length))
  : join(ROOT, "automated-content", "current-events.json");

const allowedSourceHosts = new Set([
  "airnow.gov",
  "api.fda.gov",
  "api.gdeltproject.org",
  "api.weather.gov",
  "cdc.gov",
  "cpsc.gov",
  "epa.gov",
  "fema.gov",
  "fda.gov",
  "gdeltproject.org",
  "health.hawaii.gov",
  "news.google.com",
  "nhc.noaa.gov",
  "noaa.gov",
  "open.fda.gov",
  "ready.gov",
  "saferproducts.gov",
  "weather.gov",
]);

const allowedCommerceHosts = new Set([
  "amazon.com",
  "bestbuy.com",
  "homedepot.com",
  "rei.com",
  "target.com",
  "walmart.com",
]);
const redirectHosts = new Set(["amzn.to", "bit.ly", "cutt.ly", "go.redirectingat.com", "rstyle.me", "t.co"]);
const allowedImageHosts = new Set(["images.unsplash.com", "images.pexels.com"]);
const weakClaims = ["panic", "miracle", "guarantee", "cure", "urgent buy", "secret"];
const validSourceTypes = new Set(["discovery", "official", "corroboration"]);
const validTrailRoles = new Set([
  "event-source",
  "guidance",
  "product-evidence",
  "service-destination",
  "signal",
]);
const validWeatherStates = new Set([
  "sunny",
  "cloudy",
  "drizzle",
  "light rain",
  "rain",
  "heavy rain",
  "monsoon",
  "tornado",
  "hurricanes",
  "neutral",
]);
const validDestinationTypes = new Set([
  "direct-product",
  "affiliate-search",
  "official-guide",
  "service-page",
]);
const minimumHomepageScore = 82;
const minimumConfidenceScore = 82;
const minimumSourceQualityScore = 80;
const minimumLegitimacyScore = 78;
const minimumTimelinessScore = 60;
const minimumSafetyScore = 82;
const minimumRecommendationScore = 72;
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`  - ${message}`);
}

function parseHttpsUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") fail(`${label} must use https`);
    return url;
  } catch {
    fail(`${label} is not a valid URL`);
    return null;
  }
}

function host(url) {
  return url?.hostname.replace(/^www\./, "");
}

function hostAllowed(hostname, allowedHosts) {
  return [...allowedHosts].some((allowedHost) => hostname === allowedHost || hostname.endsWith(`.${allowedHost}`));
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function validateText(value, label, min, max) {
  const text = String(value || "").trim();
  if (!text) return fail(`${label} is required`);
  const words = wordCount(text);
  if (words < min) fail(`${label} is too thin (${words} words)`);
  if (words > max) fail(`${label} is too long (${words} words)`);
  const lower = text.toLowerCase();
  for (const claim of weakClaims) {
    if (lower.includes(claim)) fail(`${label} contains unsafe promotional language: ${claim}`);
  }
}

function validateDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) fail(`${label} must be YYYY-MM-DD`);
}

function dateAgeDays(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return Infinity;
  return Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
}

function validateScore(value, label, min = 0) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    fail(`${label} must be an integer from 0 to 100`);
    return;
  }
  if (value < min) fail(`${label} is below the publication threshold (${value} < ${min})`);
}

function validateSourceTrail(entries, label) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 8) {
    fail(`${label} must contain 1 to 8 source entries`);
    return;
  }

  const seen = new Set();
  for (const [entryIndex, entry] of entries.entries()) {
    const entryLabel = `${label}[${entryIndex}]`;
    validateText(entry.label || entry.name, `${entryLabel}.label`, 2, 10);
    const url = parseHttpsUrl(entry.url, `${entryLabel}.url`);
    if (url && !hostAllowed(host(url), allowedSourceHosts)) fail(`${entryLabel}.url host is not allowlisted: ${host(url)}`);
    if (url && redirectHosts.has(host(url))) fail(`${entryLabel}.url uses a redirect host: ${host(url)}`);
    if (!validTrailRoles.has(entry.role)) fail(`${entryLabel}.role is invalid`);
    if (entry.sourceType !== undefined && !validSourceTypes.has(entry.sourceType)) fail(`${entryLabel}.sourceType is invalid`);
    if (seen.has(entry.url)) fail(`${entryLabel}.url is duplicated in the same source trail`);
    seen.add(entry.url);
  }
}

function trailHasOfficialSource(event) {
  return [event.sourceUrl, ...(event.sourceTrail || []).map((entry) => entry.url)].some((urlValue) => {
    const hostname = host(parseHttpsUrlNoFail(urlValue));
    return hostname && hostAllowed(hostname, allowedSourceHosts) && !["api.gdeltproject.org", "gdeltproject.org", "news.google.com"].some((signalHost) => hostname === signalHost || hostname.endsWith(`.${signalHost}`));
  });
}

function parseHttpsUrlNoFail(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function recommendationScore(rec) {
  const sourceScore = 90;
  const usefulnessScore = rec.usefulnessScore ?? 0;
  const buyerIntentScore = rec.buyerIntentScore ?? 0;
  const safetyScore = rec.safetyScore ?? 0;
  const availabilityScore = rec.availabilityScore ?? 0;
  const neutralityScore = rec.neutralityScore ?? 0;
  const misleadingRiskScore = rec.misleadingRiskScore ?? 0;
  const destinationPenalty = rec.destinationType === "affiliate-search" ? 6 : 0;
  return Math.round(
    sourceScore * 0.16 +
      usefulnessScore * 0.24 +
      buyerIntentScore * 0.12 +
      safetyScore * 0.22 +
      availabilityScore * 0.08 +
      neutralityScore * 0.1 +
      misleadingRiskScore * 0.08 -
      destinationPenalty
  );
}

const events = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(events)) {
  console.error("data/current-events.json must be an array");
  process.exit(1);
}

const ids = new Set();
const active = events.filter((event) => event.status === "active");
if (active.length < 3) fail("At least three active current events are required for the homepage");

for (const [index, event] of events.entries()) {
  const label = `events[${index}]`;
  if (!event.id || ids.has(event.id)) fail(`${label}.id is missing or duplicated`);
  ids.add(event.id);
  if (!["active", "paused", "expired"].includes(event.status)) fail(`${label}.status is invalid`);
  validateText(event.topic, `${label}.topic`, 1, 6);
  if (!validSourceTypes.has(event.sourceType)) fail(`${label}.sourceType is invalid or missing`);
  validateText(event.publisher, `${label}.publisher`, 1, 8);
  if (!Array.isArray(event.geography) || event.geography.length < 1 || event.geography.length > 5) {
    fail(`${label}.geography must contain 1 to 5 regions`);
  }
  validateScore(event.confidence, `${label}.confidence`, minimumConfidenceScore);
  validateScore(event.editorialStrength, `${label}.editorialStrength`, minimumHomepageScore);
  validateScore(event.sourceQualityScore, `${label}.sourceQualityScore`, minimumSourceQualityScore);
  validateScore(event.legitimacyScore, `${label}.legitimacyScore`, minimumLegitimacyScore);
  validateScore(event.timelinessScore, `${label}.timelinessScore`, minimumTimelinessScore);
  validateScore(event.safetyScore, `${label}.safetyScore`, minimumSafetyScore);
  validateText(event.matchingRationale, `${label}.matchingRationale`, 12, 40);
  validateText(event.title, `${label}.title`, 4, 14);
  validateText(event.summary, `${label}.summary`, 28, 85);
  validateText(event.whyNow, `${label}.whyNow`, 12, 45);
  validateDate(event.sourcePublishedAt, `${label}.sourcePublishedAt`);
  validateDate(event.publishedAt, `${label}.publishedAt`);
  validateDate(event.lastVerifiedAt, `${label}.lastVerifiedAt`);
  if (event.publishedAt !== event.sourcePublishedAt) fail(`${label}.publishedAt must match sourcePublishedAt until a separate normalized feed date is needed`);
  if (dateAgeDays(event.sourcePublishedAt) > 90) fail(`${label}.sourcePublishedAt is stale for a current-event guide`);

  const sourceUrl = parseHttpsUrl(event.sourceUrl, `${label}.sourceUrl`);
  if (sourceUrl && !hostAllowed(host(sourceUrl), allowedSourceHosts)) fail(`${label}.sourceUrl host is not allowlisted: ${host(sourceUrl)}`);
  if (sourceUrl && redirectHosts.has(host(sourceUrl))) fail(`${label}.sourceUrl uses a redirect host: ${host(sourceUrl)}`);
  if (event.sourceType === "discovery" && event.status === "active") fail(`${label}.sourceType discovery cannot be active on the homepage`);

  const imageUrl = parseHttpsUrl(event.imageUrl, `${label}.imageUrl`);
  if (imageUrl && !allowedImageHosts.has(host(imageUrl))) fail(`${label}.imageUrl host is not allowlisted: ${host(imageUrl)}`);
  validateText(event.imageAlt, `${label}.imageAlt`, 5, 22);

  validateSourceTrail(event.sourceTrail, `${label}.sourceTrail`);
  if (!trailHasOfficialSource(event)) fail(`${label}.sourceTrail must include at least one official source`);
  if ((event.corroborationRequired || event.sourceType !== "official") && event.sourceTrail.length < 2) {
    fail(`${label}.sourceTrail must include corroboration when the primary source is not official`);
  }
  if (event.weatherState !== undefined) {
    if (!validWeatherStates.has(event.weatherState)) fail(`${label}.weatherState is invalid`);
    const weatherText = `${event.topic} ${event.title} ${event.summary} ${event.responseTags?.join(" ") || ""}`.toLowerCase();
    const weatherSource = [event.sourceUrl, ...event.sourceTrail.map((entry) => entry.url)].some((urlValue) => {
      const parsed = parseHttpsUrlNoFail(urlValue);
      const hostname = parsed ? host(parsed) : "";
      return hostname && (hostname.endsWith("weather.gov") || hostname.endsWith("noaa.gov"));
    });
    if (event.weatherState !== "neutral" && !weatherSource && !weatherText.includes("weather")) {
      fail(`${label}.weatherState needs NWS/NOAA proof or explicit weather topic text`);
    }
  }
  if (!Array.isArray(event.editorialSafeguards) || event.editorialSafeguards.length < 2 || event.editorialSafeguards.length > 5) {
    fail(`${label}.editorialSafeguards must contain 2 to 5 items`);
  } else {
    for (const [guardIndex, guard] of event.editorialSafeguards.entries()) {
      validateText(guard, `${label}.editorialSafeguards[${guardIndex}]`, 7, 24);
    }
  }

  if (event.storySignals !== undefined) {
    if (!Array.isArray(event.storySignals) || event.storySignals.length < 2 || event.storySignals.length > 4) {
      fail(`${label}.storySignals must contain 2 to 4 items when present`);
    } else {
      for (const [signalIndex, signal] of event.storySignals.entries()) {
        const signalLabel = `${label}.storySignals[${signalIndex}]`;
        validateText(signal.value, `${signalLabel}.value`, 1, 5);
        validateText(signal.label, `${signalLabel}.label`, 5, 16);
      }
    }
  }

  if (event.nextSteps !== undefined) {
    if (!Array.isArray(event.nextSteps) || event.nextSteps.length < 2 || event.nextSteps.length > 4) {
      fail(`${label}.nextSteps must contain 2 to 4 items when present`);
    } else {
      for (const [stepIndex, step] of event.nextSteps.entries()) {
        const stepLabel = `${label}.nextSteps[${stepIndex}]`;
        validateText(step.title, `${stepLabel}.title`, 2, 7);
        validateText(step.body, `${stepLabel}.body`, 13, 35);
        const stepSource = parseHttpsUrl(step.sourceUrl, `${stepLabel}.sourceUrl`);
        if (stepSource && !hostAllowed(host(stepSource), allowedSourceHosts)) fail(`${stepLabel}.sourceUrl host is not allowlisted: ${host(stepSource)}`);
      }
    }
  }

  if (!Array.isArray(event.recommendations) || event.recommendations.length < 3 || event.recommendations.length > 6) {
    fail(`${label}.recommendations must contain 3 to 6 items`);
    continue;
  }

  const recIds = new Set();
  for (const [recIndex, rec] of event.recommendations.entries()) {
    const recLabel = `${label}.recommendations[${recIndex}]`;
    if (!rec.id || recIds.has(rec.id)) fail(`${recLabel}.id is missing or duplicated`);
    recIds.add(rec.id);
    if (!["product", "service"].includes(rec.kind)) fail(`${recLabel}.kind is invalid`);
    validateText(rec.category, `${recLabel}.category`, 2, 6);
    validateText(rec.title, `${recLabel}.title`, 2, 10);
    validateText(rec.matchReason, `${recLabel}.matchReason`, 12, 35);
    validateText(rec.whyItHelps, `${recLabel}.whyItHelps`, 11, 28);
    if (!validDestinationTypes.has(rec.destinationType)) fail(`${recLabel}.destinationType is invalid`);
    if (rec.destinationUrl !== undefined) {
      const destinationUrl = parseHttpsUrl(rec.destinationUrl, `${recLabel}.destinationUrl`);
      if (destinationUrl && redirectHosts.has(host(destinationUrl))) fail(`${recLabel}.destinationUrl uses a redirect host: ${host(destinationUrl)}`);
    }
    if (rec.affiliateLabel !== undefined) validateText(rec.affiliateLabel, `${recLabel}.affiliateLabel`, 2, 6);
    if (rec.destinationType === "affiliate-search") {
      validateText(rec.destinationJustification, `${recLabel}.destinationJustification`, 8, 28);
    }
    validateScore(rec.usefulnessScore, `${recLabel}.usefulnessScore`, 60);
    validateScore(rec.buyerIntentScore, `${recLabel}.buyerIntentScore`, rec.kind === "product" ? 55 : 0);
    validateScore(rec.safetyScore, `${recLabel}.safetyScore`, 80);
    validateScore(rec.availabilityScore, `${recLabel}.availabilityScore`, 40);
    validateScore(rec.neutralityScore, `${recLabel}.neutralityScore`, 70);
    validateScore(rec.misleadingRiskScore, `${recLabel}.misleadingRiskScore`, 80);
    const recScore = recommendationScore(rec);
    if (recScore < minimumRecommendationScore) fail(`${recLabel} relevance score is too low (${recScore} < ${minimumRecommendationScore})`);
    validateSourceTrail(rec.sourceTrail, `${recLabel}.sourceTrail`);

    const recSource = parseHttpsUrl(rec.sourceUrl, `${recLabel}.sourceUrl`);
    if (recSource && !hostAllowed(host(recSource), allowedSourceHosts)) fail(`${recLabel}.sourceUrl host is not allowlisted: ${host(recSource)}`);
    if (recSource && redirectHosts.has(host(recSource))) fail(`${recLabel}.sourceUrl uses a redirect host: ${host(recSource)}`);

    const shoppingUrl = parseHttpsUrl(rec.shoppingUrl, `${recLabel}.shoppingUrl`);
    if (shoppingUrl) {
      const shoppingHost = host(shoppingUrl);
      if (redirectHosts.has(shoppingHost)) fail(`${recLabel}.shoppingUrl uses a redirect host: ${shoppingHost}`);
      if (rec.affiliate) {
        if (!hostAllowed(shoppingHost, allowedCommerceHosts)) fail(`${recLabel}.affiliate shoppingUrl must point to an allowlisted commerce host`);
        if (shoppingHost === "amazon.com" && !shoppingUrl.searchParams.get("tag")) fail(`${recLabel}.affiliate shoppingUrl must include an Amazon tag`);
        if (shoppingHost === "amazon.com" && rec.destinationType === "direct-product" && !/^\/(dp|gp\/product)\//.test(shoppingUrl.pathname)) {
          fail(`${recLabel}.direct-product Amazon links must use /dp/{ASIN} or /gp/product/{ASIN}`);
        }
        if (rec.destinationType === "official-guide" || rec.destinationType === "service-page") {
          fail(`${recLabel}.affiliate recommendation cannot use an official/service destination type`);
        }
      } else if (!hostAllowed(shoppingHost, allowedSourceHosts) && !hostAllowed(shoppingHost, allowedCommerceHosts)) {
        fail(`${recLabel}.non-affiliate shoppingUrl must use a trusted source host`);
      }
    }
  }
}

if (failures > 0) {
  console.error(`\nCurrent event validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`Current event validation passed for ${events.length} event(s).`);
