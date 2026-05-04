#!/usr/bin/env node
/**
 * normalize-affiliate-links.js
 *
 * Ensures every product in data/products.json has a correct, up-to-date
 * Amazon affiliate URL using the current AMAZON_AFFILIATE_TAG secret.
 *
 * Runs automatically in the daily pipeline (after generate-daily-content.js)
 * so every new product and every tag change is covered without manual work.
 *
 * URL priority:
 *   1. /dp/ASIN  — when amazonAsin is present and passes the ASIN regex
 *
 * Products without a verified ASIN are treated as non-Amazon until an exact
 * listing is confirmed. This avoids vague Amazon search affiliate links.
 *
 * Manual usage:
 *   AMAZON_AFFILIATE_TAG=surfacedx-20 node scripts/normalize-affiliate-links.js
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────────────────

const AMAZON_TAG = process.env.AMAZON_AFFILIATE_TAG;

if (!AMAZON_TAG) {
  console.error(
    "❌  AMAZON_AFFILIATE_TAG env var is not set.\n" +
    "    Add it to GitHub Secrets or run:\n" +
    "    AMAZON_AFFILIATE_TAG=<your-tag> node scripts/normalize-affiliate-links.js"
  );
  process.exit(1);
}

const ASIN_REGEX     = /^[A-Z0-9]{10}$/;
const TAG_IN_URL_RE  = /([?&]tag=)[^&]+/;

const productsPath = path.join(__dirname, "..", "data", "products.json");

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildAsinUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}&linkCode=ll1`;
}

/** Replace the tag= param in an existing URL, preserving everything else. */
function retagUrl(url, newTag) {
  if (TAG_IN_URL_RE.test(url)) {
    return url.replace(TAG_IN_URL_RE, `$1${newTag}`);
  }
  // No tag present — append one
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}tag=${newTag}`;
}

function extractTag(url) {
  const m = url && url.match(/[?&]tag=([^&]+)/);
  return m ? m[1] : null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

let updatedTag    = 0;   // tag corrected in existing URL
let upgradedAsin  = 0;   // search URL → /dp/ASIN
let addedNew      = 0;   // product had no URL at all
let skipped       = 0;   // availableOnAmazon === false
let removedSearch = 0;   // no verified ASIN, so search monetization was removed

for (const p of products) {
  // DTC / software products — no Amazon URL expected
  if (p.availableOnAmazon === false) {
    skipped++;
    continue;
  }

  const hasValidAsin = p.amazonAsin && ASIN_REGEX.test(p.amazonAsin);

  if (!hasValidAsin) {
    if (p.directAmazonUrl?.includes("amazon.com/s?") || p.affiliate?.url?.includes("amazon.com/s?")) {
      delete p.directAmazonUrl;
      delete p.affiliate;
      removedSearch++;
    }
    p.availableOnAmazon = false;
    skipped++;
    continue;
  }

  const correctUrl = buildAsinUrl(p.amazonAsin);

  let changed = false;

  // ── directAmazonUrl ──────────────────────────────────────────────────────
  if (!p.directAmazonUrl) {
    p.directAmazonUrl = correctUrl;
    addedNew++;
    changed = true;
  } else {
    const currentTag = extractTag(p.directAmazonUrl);
    const isSearchUrl = p.directAmazonUrl.includes("/s?");
    const canUpgrade  = hasValidAsin && isSearchUrl;

    if (canUpgrade) {
      // Upgrade search URL to direct product page
      p.directAmazonUrl = correctUrl;
      upgradedAsin++;
      changed = true;
    } else if (currentTag !== AMAZON_TAG) {
      // Wrong tag — retag in-place so the URL structure is preserved
      p.directAmazonUrl = retagUrl(p.directAmazonUrl, AMAZON_TAG);
      updatedTag++;
      changed = true;
    }
  }

  // ── affiliate object ─────────────────────────────────────────────────────
  if (changed || !p.affiliate?.enabled || extractTag(p.affiliate?.url) !== AMAZON_TAG) {
    p.affiliate = {
      enabled:  true,
      provider: "amazon",
      url:      p.directAmazonUrl,
    };
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

console.log(
  `✅  Affiliate links normalized — tag: ${AMAZON_TAG}\n` +
  `   🏷️  Tag corrected:    ${updatedTag}\n` +
  `   🎯  Upgraded to ASIN: ${upgradedAsin}\n` +
  `   ➕  Added (new):      ${addedNew}\n` +
  `   🧹  Removed search:   ${removedSearch}\n` +
  `   ⏭️  Skipped (DTC):    ${skipped}`
);
