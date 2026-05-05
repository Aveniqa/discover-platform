#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const AUTOMATED_DIR = join(ROOT, "automated-content");
const PUBLIC_DIR = join(ROOT, "public", "automated-content");
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${path} is not readable JSON: ${error.message}`);
    return null;
  }
}

function isHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateText(value, label, minWords, maxWords) {
  const text = String(value || "").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!text) fail(`${label} is required`);
  if (text && words < minWords) fail(`${label} is too thin (${words} words)`);
  if (words > maxWords) fail(`${label} is too long (${words} words)`);
}

function validateSourceTrail(entries, label) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 6) {
    fail(`${label} must contain 1 to 6 source entries`);
    return;
  }
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    const entryLabel = `${label}[${index}]`;
    validateText(entry.name, `${entryLabel}.name`, 1, 8);
    if (!isHttps(entry.url)) fail(`${entryLabel}.url must be HTTPS`);
    if (!["signal", "event-source", "publisher", "official"].includes(entry.role)) {
      fail(`${entryLabel}.role is invalid`);
    }
    if (seen.has(entry.url)) fail(`${entryLabel}.url is duplicated`);
    seen.add(entry.url);
  }
}

const currentEvents = readJson(join(AUTOMATED_DIR, "current-events.json"));
if (!Array.isArray(currentEvents) || currentEvents.length < 1) {
  fail("automated-content/current-events.json must contain at least one current event");
}

const feed = readJson(join(AUTOMATED_DIR, "trending-live.json"));
const publicFeed = readJson(join(PUBLIC_DIR, "trending-live.json"));

if (feed) {
  if (feed.version !== 1) fail("trending-live.version must be 1");
  if (feed.mode !== "fail-closed") fail("trending-live.mode must be fail-closed");
  if (!Number.isInteger(feed.editorialThreshold) || feed.editorialThreshold < 80) {
    fail("trending-live.editorialThreshold must be an integer >= 80");
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(String(feed.generatedAt || ""))) {
    fail("trending-live.generatedAt must be an ISO timestamp");
  }
  for (const collectionName of ["items", "monitoredSignals"]) {
    const items = feed[collectionName];
    if (!Array.isArray(items) || items.length > 12) {
      fail(`trending-live.${collectionName} must be an array with at most 12 entries`);
      continue;
    }
    for (const [index, item] of items.entries()) {
      const label = `trending-live.${collectionName}[${index}]`;
      if (!item.id || !/^[a-z0-9._-]+$/.test(item.id)) fail(`${label}.id is missing or unsafe`);
      if (!["github-trending", "news-trending", "current-event"].includes(item.type)) fail(`${label}.type is invalid`);
      validateText(item.title, `${label}.title`, 3, 18);
      validateText(item.summary, `${label}.summary`, 14, 55);
      validateText(item.topic, `${label}.topic`, 1, 8);
      validateText(item.sourceName, `${label}.sourceName`, 1, 8);
      if (!isHttps(item.sourceUrl)) fail(`${label}.sourceUrl must be HTTPS`);
      if (!Number.isInteger(item.score) || item.score < 0 || item.score > 100) fail(`${label}.score must be 0-100`);
      if (collectionName === "items" && item.score < feed.editorialThreshold) {
        fail(`${label}.score is below editorial threshold`);
      }
      validateSourceTrail(item.sourceTrail, `${label}.sourceTrail`);
    }
  }
}

if (feed && publicFeed && JSON.stringify(feed) !== JSON.stringify(publicFeed)) {
  fail("public/automated-content/trending-live.json must mirror automated-content/trending-live.json");
}

if (failures.length) {
  console.error("Automated content validation failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("Automated content validation passed.");
