#!/usr/bin/env node
/**
 * fetch-product-asins.js
 *
 * For every product that currently has a search URL (/s?k=...) instead of a
 * direct /dp/ASIN link, this script:
 *   1. Searches Amazon for the product title
 *   2. Extracts the first organic ASIN from the search-result HTML
 *   3. Validates that ASIN by fetching the product page (body-scan, not just status)
 *   4. Updates products.json with the ASIN + direct affiliate URL
 *
 * Safe to re-run: already-updated products (with /dp/ URLs) are skipped.
 * Progress is saved to disk after every product so partial runs aren't lost.
 *
 * Usage:
 *   AMAZON_AFFILIATE_TAG=vaultvibe-20 node scripts/fetch-product-asins.js
 *   AMAZON_AFFILIATE_TAG=vaultvibe-20 node scripts/fetch-product-asins.js --dry-run
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ── Config ───────────────────────────────────────────────────────────────────

const AFFILIATE_TAG  = process.env.AMAZON_AFFILIATE_TAG || "vaultvibe-20";
const DRY_RUN        = process.argv.includes("--dry-run");
const PRODUCTS_PATH  = path.join(__dirname, "..", "data", "products.json");

const SEARCH_DELAY_MS   = 2200;  // between each Amazon search request
const VALIDATE_DELAY_MS = 900;   // between search → validate
const TIMEOUT_MS        = 12000;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent":      UA,
  "Accept":          "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "identity",
  "Cache-Control":   "no-cache",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms + Math.random() * 400));
}

async function fetchHtml(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res  = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: HEADERS });
    const text = await res.text();
    clearTimeout(timer);
    return { status: res.status, text };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

/** Extract ASINs (10-char alphanumeric starting with B) from data-asin attrs. */
function extractAsins(html) {
  const seen = new Set();
  const out  = [];
  for (const m of html.matchAll(/data-asin="(B[A-Z0-9]{9})"/g)) {
    const asin = m[1];
    if (asin && !seen.has(asin)) { seen.add(asin); out.push(asin); }
  }
  return out;
}

const NOT_FOUND_RE = /Looking for something\?|Page Not Found|dogsofamazon|Sorry, we just need to make sure/i;
const CAPTCHA_RE   = /Enter the characters you see below|Type the characters|api-services-support@amazon/i;

/** Returns true if the ASIN page is a real live product. */
async function validateAsin(asin) {
  try {
    const { status, text } = await fetchHtml(`https://www.amazon.com/dp/${asin}`);
    if (CAPTCHA_RE.test(text))    return "captcha";
    if (status >= 400)            return false;
    if (NOT_FOUND_RE.test(text))  return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Strict brand-first title match.
 *
 * Products are almost always "BrandName ModelName...", so the first word is
 * the brand — the most unique identifier. We require it to appear in the
 * Amazon page's <title> tag. This correctly rejects false positives like
 * "Philips SmartSleep" → Hatch Restore 2 (Hatch's title won't contain "philips")
 * or "Dodow Sleep Aid" → Hatch Restore 2 (won't contain "dodow").
 *
 * Fallback: if the brand is very short or generic (≤3 chars) we do a stricter
 * 3-keyword match in the first 6 kB of the page body instead.
 */
function titleMatchesPage(productTitle, pageHtml) {
  // Extract the Amazon page <title> tag — definitive product identifier
  const pageTitle = (pageHtml.match(/<title[^>]*>([^<]{4,})<\/title>/i)?.[1] || "").toLowerCase();

  // Primary check: brand name (first word) must appear in the page title
  const brandWord = productTitle.split(/\s+/)[0].toLowerCase();
  if (brandWord.length > 3 && pageTitle.includes(brandWord)) return true;

  // Fallback for short/generic brand words: require 3 unique keywords in
  // the top 6 kB of the page (headline + bullet points, before reviews)
  const stopWords = new Set([
    "the","a","an","and","or","for","of","with","in","on","at","to",
    "pro","plus","gen","new","set","kit","pack","series","smart","size",
  ]);
  const keywords = productTitle.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  const topBody = pageHtml.slice(0, 6000).toLowerCase();
  const hits    = keywords.filter(w => topBody.includes(w));
  return hits.length >= Math.min(3, keywords.length);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const toProcess = products.filter(p =>
    p.availableOnAmazon !== false &&
    p.directAmazonUrl &&
    p.directAmazonUrl.includes("/s?")
  );

  console.log(`\n🔍 ASIN lookup for ${toProcess.length} products  [tag=${AFFILIATE_TAG}]${DRY_RUN ? "  [DRY RUN]" : ""}\n`);

  let found = 0, invalid = 0, blocked = 0, noResults = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const product = toProcess[i];
    const prefix  = `[${String(i + 1).padStart(2)}/${toProcess.length}]`;

    process.stdout.write(`${prefix} ${product.title.slice(0, 55).padEnd(55)} → `);

    // ── Step 1: search Amazon ──────────────────────────────────────────────
    let searchHtml, searchStatus;
    try {
      const r = await fetchHtml(
        `https://www.amazon.com/s?k=${encodeURIComponent(product.title)}&ref=nb_sb_noss`
      );
      searchHtml   = r.text;
      searchStatus = r.status;
    } catch (e) {
      console.log(`⏱  timeout/network error — skipped`);
      noResults++;
      await sleep(SEARCH_DELAY_MS);
      continue;
    }

    if (CAPTCHA_RE.test(searchHtml)) {
      console.log(`🚫 CAPTCHA — Amazon is rate-limiting, stopping`);
      blocked++;
      break;  // No point continuing — save what we have
    }

    if (searchStatus >= 400) {
      console.log(`❌ HTTP ${searchStatus} on search`);
      noResults++;
      await sleep(SEARCH_DELAY_MS);
      continue;
    }

    // ── Step 2: extract ASINs ──────────────────────────────────────────────
    const asins = extractAsins(searchHtml);
    if (asins.length === 0) {
      console.log(`⚠️  no ASINs in search HTML`);
      noResults++;
      await sleep(SEARCH_DELAY_MS);
      continue;
    }

    // ── Step 3: validate first ASIN (try up to 3) ─────────────────────────
    await sleep(VALIDATE_DELAY_MS);

    let chosenAsin = null;
    let chosenHtml = null;

    for (const asin of asins.slice(0, 3)) {
      let result, html;
      try {
        const r = await fetchHtml(`https://www.amazon.com/dp/${asin}`);
        result   = CAPTCHA_RE.test(r.text)   ? "captcha"
                 : NOT_FOUND_RE.test(r.text)  ? false
                 : r.status >= 400            ? false
                 : true;
        html = r.text;
      } catch {
        result = false;
      }

      if (result === "captcha") { blocked++; console.log(`🚫 CAPTCHA on validation`); break; }
      if (!result) { await sleep(400); continue; }
      if (!titleMatchesPage(product.title, html)) { await sleep(400); continue; }

      chosenAsin = asin;
      chosenHtml = html;
      break;
    }

    if (!chosenAsin) {
      console.log(`❌ no valid ASIN found (tried ${Math.min(asins.length, 3)})`);
      invalid++;
      await sleep(SEARCH_DELAY_MS);
      continue;
    }

    // ── Step 4: update product record ──────────────────────────────────────
    const directUrl = `https://www.amazon.com/dp/${chosenAsin}?tag=${AFFILIATE_TAG}&linkCode=ll1`;

    if (!DRY_RUN) {
      // Find in the master array and update
      const master = products.find(p => p.slug === product.slug);
      master.amazonAsin     = chosenAsin;
      master.directAmazonUrl = directUrl;
      master.affiliate      = { enabled: true, provider: "amazon", url: directUrl };

      // Save immediately after each success so partial runs aren't lost
      fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));
    }

    console.log(`✅ ${chosenAsin}`);
    found++;

    await sleep(SEARCH_DELAY_MS);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(70)}`);
  console.log(`✅ Found:      ${found}`);
  console.log(`❌ No match:   ${invalid}`);
  console.log(`⚠️  No results: ${noResults}`);
  if (blocked) console.log(`🚫 Blocked:    ${blocked} (rate-limited by Amazon)`);
  console.log(`\nRemaining search URLs: ${
    JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"))
      .filter(p => p.directAmazonUrl?.includes("/s?")).length
  }`);
}

main().catch(e => { console.error(e); process.exit(1); });
