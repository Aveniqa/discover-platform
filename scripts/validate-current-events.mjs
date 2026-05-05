#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const file = join(ROOT, "data", "current-events.json");

const allowedSourceHosts = new Set([
  "airnow.gov",
  "cdc.gov",
  "epa.gov",
  "health.hawaii.gov",
  "ready.gov",
  "weather.gov",
]);

const allowedImageHosts = new Set(["images.unsplash.com", "images.pexels.com"]);
const weakClaims = ["panic", "miracle", "guarantee", "cure", "urgent buy", "secret"];
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
  validateText(event.title, `${label}.title`, 4, 14);
  validateText(event.summary, `${label}.summary`, 28, 85);
  validateText(event.whyNow, `${label}.whyNow`, 12, 45);
  validateDate(event.sourcePublishedAt, `${label}.sourcePublishedAt`);
  validateDate(event.lastVerifiedAt, `${label}.lastVerifiedAt`);

  const sourceUrl = parseHttpsUrl(event.sourceUrl, `${label}.sourceUrl`);
  if (sourceUrl && !allowedSourceHosts.has(host(sourceUrl))) fail(`${label}.sourceUrl host is not allowlisted: ${host(sourceUrl)}`);

  const imageUrl = parseHttpsUrl(event.imageUrl, `${label}.imageUrl`);
  if (imageUrl && !allowedImageHosts.has(host(imageUrl))) fail(`${label}.imageUrl host is not allowlisted: ${host(imageUrl)}`);
  validateText(event.imageAlt, `${label}.imageAlt`, 5, 22);

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
        if (stepSource && !allowedSourceHosts.has(host(stepSource))) fail(`${stepLabel}.sourceUrl host is not allowlisted: ${host(stepSource)}`);
      }
    }
  }

  if (!Array.isArray(event.recommendations) || event.recommendations.length < 3 || event.recommendations.length > 5) {
    fail(`${label}.recommendations must contain 3 to 5 items`);
    continue;
  }

  const recIds = new Set();
  for (const [recIndex, rec] of event.recommendations.entries()) {
    const recLabel = `${label}.recommendations[${recIndex}]`;
    if (!rec.id || recIds.has(rec.id)) fail(`${recLabel}.id is missing or duplicated`);
    recIds.add(rec.id);
    if (!["product", "service"].includes(rec.kind)) fail(`${recLabel}.kind is invalid`);
    validateText(rec.title, `${recLabel}.title`, 2, 10);
    validateText(rec.matchReason, `${recLabel}.matchReason`, 12, 35);

    const recSource = parseHttpsUrl(rec.sourceUrl, `${recLabel}.sourceUrl`);
    if (recSource && !allowedSourceHosts.has(host(recSource))) fail(`${recLabel}.sourceUrl host is not allowlisted: ${host(recSource)}`);

    const shoppingUrl = parseHttpsUrl(rec.shoppingUrl, `${recLabel}.shoppingUrl`);
    if (shoppingUrl) {
      const shoppingHost = host(shoppingUrl);
      if (rec.affiliate) {
        if (shoppingHost !== "amazon.com") fail(`${recLabel}.affiliate shoppingUrl must point to amazon.com`);
        if (!shoppingUrl.searchParams.get("tag")) fail(`${recLabel}.affiliate shoppingUrl must include an Amazon tag`);
      } else if (!allowedSourceHosts.has(shoppingHost)) {
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
