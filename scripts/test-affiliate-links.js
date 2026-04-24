#!/usr/bin/env node
/**
 * test-affiliate-links.js
 *
 * End-to-end affiliate link audit:
 *   1. Data integrity   — every eligible product has the required fields
 *   2. Tag correctness  — all URLs carry the expected AMAZON_AFFILIATE_TAG
 *   3. URL resolution   — sampled live fetch of Amazon URLs (HTTP status check)
 *   4. Rendering check  — confirms getItemOutboundUrl() returns the affiliate URL
 *
 * Usage:
 *   node scripts/test-affiliate-links.js
 *   AMAZON_AFFILIATE_TAG=vaultvibe-20 node scripts/test-affiliate-links.js
 *
 * Exit 0 = all checks passed (warnings are non-fatal).
 * Exit 1 = at least one ERROR-level finding.
 */

"use strict";

const fs   = require("fs");
const path = require("path");

const EXPECTED_TAG = process.env.AMAZON_AFFILIATE_TAG || "vaultvibe-20";
const SAMPLE_SIZE  = 8;   // number of URLs to live-fetch
const TIMEOUT_MS   = 8000;

const productsPath = path.join(__dirname, "..", "data", "products.json");
const products     = JSON.parse(fs.readFileSync(productsPath, "utf8"));

// ── Counters ─────────────────────────────────────────────────────────────────
let errors   = 0;
let warnings = 0;

function err(msg)  { console.error(`  ❌ ERROR:   ${msg}`); errors++; }
function warn(msg) { console.warn (`  ⚠️  WARN:    ${msg}`); warnings++; }
function ok(msg)   { console.log  (`  ✅ OK:      ${msg}`); }

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractTag(url) {
  const m = url && url.match(/[?&]tag=([^&]+)/);
  return m ? m[1] : null;
}

/** Mirrors getItemOutboundUrl() from src/lib/data.ts */
function getItemOutboundUrl(item) {
  if (item.affiliate?.enabled && item.affiliate.url) return item.affiliate.url;
  if (item.directAmazonUrl) return item.directAmazonUrl;
  return null;
}

async function checkUrl(url) {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
    });
    clearTimeout(timer);
    // Hard HTTP failures
    if (res.status >= 400 && ![401,403,405,429].includes(res.status)) {
      return { ok: false, status: res.status };
    }
    // For /dp/ ASIN pages: Amazon returns 200 for its own "not found" page —
    // scan the body for the same markers generate-daily-content.js uses.
    if (url.includes("/dp/")) {
      const text = await res.text();
      if (/Looking for something\?|Page Not Found|dogsofamazon/i.test(text)) {
        return { ok: false, status: `${res.status} (Amazon not-found page)` };
      }
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: e.name === "AbortError" ? "timeout" : "fetch-error" };
  }
}

// ── 1. Data integrity check ────────────────────────────────────────────────
console.log("\n━━━━ 1. DATA INTEGRITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const eligible   = products.filter(p => p.availableOnAmazon !== false);
const dtc        = products.filter(p => p.availableOnAmazon === false);
const noUrl      = eligible.filter(p => !p.directAmazonUrl);
const noAffiliate= eligible.filter(p => !p.affiliate?.enabled || !p.affiliate?.url);

console.log(`  Total products:  ${products.length}`);
console.log(`  Eligible (Amazon): ${eligible.length}`);
console.log(`  DTC / software:    ${dtc.length}`);

if (noUrl.length === 0) {
  ok(`All ${eligible.length} eligible products have directAmazonUrl`);
} else {
  err(`${noUrl.length} eligible product(s) missing directAmazonUrl:`);
  noUrl.forEach(p => console.error(`     - ${p.slug}`));
}

if (noAffiliate.length === 0) {
  ok(`All ${eligible.length} eligible products have affiliate.enabled=true`);
} else {
  err(`${noAffiliate.length} eligible product(s) missing/disabled affiliate object:`);
  noAffiliate.forEach(p => console.error(`     - ${p.slug}`));
}

const dpCount     = eligible.filter(p => p.directAmazonUrl?.includes("/dp/")).length;
const searchCount = eligible.filter(p => p.directAmazonUrl?.includes("/s?")).length;
console.log(`\n  URL types:  ${dpCount} direct /dp/ASIN  |  ${searchCount} search /s?k=`);

// ── 2. Tag correctness ─────────────────────────────────────────────────────
console.log("\n━━━━ 2. TAG CORRECTNESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log(`  Expected tag: ${EXPECTED_TAG}\n`);

const wrongTagUrl = eligible.filter(p => {
  const tag = extractTag(p.directAmazonUrl);
  return tag && tag !== EXPECTED_TAG;
});
const wrongTagAff = eligible.filter(p => {
  const tag = extractTag(p.affiliate?.url);
  return tag && tag !== EXPECTED_TAG;
});
const missingTag  = eligible.filter(p => p.directAmazonUrl && !extractTag(p.directAmazonUrl));

if (wrongTagUrl.length === 0) {
  ok(`All directAmazonUrl values carry tag=${EXPECTED_TAG}`);
} else {
  err(`${wrongTagUrl.length} product(s) have wrong tag in directAmazonUrl:`);
  wrongTagUrl.forEach(p => {
    const tag = extractTag(p.directAmazonUrl);
    console.error(`     - ${p.slug}  (found: ${tag})`);
  });
}

if (wrongTagAff.length === 0) {
  ok(`All affiliate.url values carry tag=${EXPECTED_TAG}`);
} else {
  err(`${wrongTagAff.length} product(s) have wrong tag in affiliate.url:`);
  wrongTagAff.forEach(p => {
    const tag = extractTag(p.affiliate.url);
    console.error(`     - ${p.slug}  (found: ${tag})`);
  });
}

if (missingTag.length > 0) {
  warn(`${missingTag.length} directAmazonUrl(s) have no tag= param at all:`);
  missingTag.forEach(p => console.warn(`     - ${p.slug}`));
}

// ── 3. Rendering logic check ───────────────────────────────────────────────
console.log("\n━━━━ 3. RENDERING LOGIC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

let renderErrors = 0;
for (const p of eligible) {
  const rendered = getItemOutboundUrl(p);
  if (!rendered) {
    err(`${p.slug} — getItemOutboundUrl() returns null (CTA button will be hidden!)`);
    renderErrors++;
  } else {
    const tag = extractTag(rendered);
    if (tag !== EXPECTED_TAG) {
      err(`${p.slug} — rendered URL has wrong tag (${tag}), expected ${EXPECTED_TAG}`);
      renderErrors++;
    }
  }
}
if (renderErrors === 0) {
  ok(`All ${eligible.length} product CTA buttons will render with correct tag`);
}

// ── 4. Live URL spot-check ─────────────────────────────────────────────────

// Prefer ASIN direct URLs for the sample since they're most predictable
const dpProducts     = eligible.filter(p => p.directAmazonUrl?.includes("/dp/"));
const searchProducts = eligible.filter(p => p.directAmazonUrl?.includes("/s?"));

// Shuffle helper
function sample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const toTest = [
  ...sample(dpProducts, Math.min(3, dpProducts.length)),
  ...sample(searchProducts, SAMPLE_SIZE - Math.min(3, dpProducts.length)),
].slice(0, SAMPLE_SIZE);

async function runLiveCheck() {
  console.log("\n━━━━ 4. LIVE URL SPOT-CHECK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`  Testing ${toTest.length} URLs (Amazon may throttle bots — 4xx is usually "alive")...\n`);

  let liveErrors = 0;
  for (const p of toTest) {
    const url    = p.directAmazonUrl;
    const result = await checkUrl(url);
    const tag    = extractTag(url);
    const label  = url.includes("/dp/") ? "ASIN" : "search";
    if (result.ok) {
      console.log(`  ✅ ${result.status}  [${label}]  ${p.slug}`);
      console.log(`          ${url.slice(0, 85)}`);
    } else {
      console.error(`  ❌ ${result.status}  [${label}]  ${p.slug}`);
      console.error(`          ${url}`);
      liveErrors++;
    }
    if (tag !== EXPECTED_TAG) {
      console.error(`          ↳ TAG MISMATCH: found=${tag}, expected=${EXPECTED_TAG}`);
    }
    console.log();
  }

  if (liveErrors > 0) {
    warn(`${liveErrors}/${toTest.length} sampled URLs returned error responses from Amazon`);
  } else {
    ok(`${toTest.length}/${toTest.length} sampled URLs responded OK`);
  }
}

runLiveCheck().then(() => {
  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  if (errors === 0 && warnings === 0) {
    console.log("✅  All checks passed — affiliate links are correctly configured.\n");
  } else {
    if (errors > 0)   console.error(`❌  ${errors} error(s) found — run normalize-affiliate-links.js to fix.\n`);
    if (warnings > 0) console.warn (`⚠️   ${warnings} warning(s) — review above.\n`);
  }
  process.exit(errors > 0 ? 1 : 0);
}).catch(e => {
  console.error("Live check failed:", e.message);
  process.exit(1);
});
