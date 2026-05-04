#!/usr/bin/env node
/**
 * Product commerce and image audit.
 *
 * Checks the product dataset for the issues that can mislead users or
 * compromise affiliate disclosure:
 * - products marked non-Amazon while their CTA still routes to Amazon
 * - Amazon affiliate URLs with missing/wrong tags
 * - ASIN metadata that does not match the rendered Amazon URL
 * - missing product images
 * - known bad image assignments for brand-specific products
 *
 * Usage:
 *   node scripts/audit-product-commerce.mjs
 *   node scripts/audit-product-commerce.mjs --fix
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const productsPath = path.join(rootDir, "data", "products.json");
const imageCachePath = path.join(rootDir, "data", "image-cache.json");

const args = new Set(process.argv.slice(2));
const shouldFix = args.has("--fix");
const expectedAmazonTag = process.env.AMAZON_AFFILIATE_TAG || "vaultvibe-20";

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
const imageCache = JSON.parse(fs.readFileSync(imageCachePath, "utf8"));

const officialSourceOverrides = new Map([
  ["apple-vision-pro", "https://www.apple.com/shop/buy-vision/apple-vision-pro"],
]);

const productCopyOverrides = new Map([
  [
    "apple-vision-pro",
    {
      shortDescription:
        "Apple Vision Pro is Apple's spatial computing headset, built to blend apps, media, and communication into the physical room around you. The current model pairs Apple's M5 chip with the dedicated R1 sensor-processing chip, a custom micro-OLED display system, eye and hand input, spatial audio, Optic ID, and an external battery pack for immersive work, entertainment, and creative workflows.",
      whyItIsInteresting:
        "Vision Pro stands out because it treats mixed reality as a full computing environment rather than a controller-led VR accessory. Apple's current hardware uses M5 for app, graphics, and visionOS performance while R1 processes camera, sensor, and microphone input for a low-latency view of the real world. It supports natural eye, hand, and voice input, high-resolution displays, spatial video, immersive environments, Mac Virtual Display, Apple Intelligence features, and up to 3 hours of video playback. The tradeoff remains clear: it is a premium Apple device for early adopters, developers, and professionals, so the most accurate purchase path is Apple's own Vision store rather than an unrelated marketplace search.",
      imageIdea: "Apple Vision Pro headset with external battery pack",
      estimatedPriceRange: "$3499+",
    },
  ],
]);

const imageOverrides = new Map([
  ["apple-vision-pro", "/images/apple-vision-pro.svg"],
]);

const knownBadImageUrls = new Map([
  [
    "apple-vision-pro",
    "https://images.pexels.com/photos/7864614/pexels-photo-7864614.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  ],
]);

const errors = [];
const warnings = [];
const fixLog = [];

function isAmazonUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "amazon.com" || host.endsWith(".amazon.com");
  } catch {
    return /amazon\./i.test(url);
  }
}

function hostOf(url) {
  if (!url || typeof url !== "string") return "(missing)";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "(invalid)";
  }
}

function extractAmazonTag(url) {
  if (!url || typeof url !== "string") return null;
  try {
    return new URL(url).searchParams.get("tag");
  } catch {
    const match = url.match(/[?&]tag=([^&]+)/);
    return match ? match[1] : null;
  }
}

function hasAmazonSearchUrl(url) {
  return isAmazonUrl(url) && /\/s\?/i.test(url);
}

function hasAmazonProductUrl(url) {
  return isAmazonUrl(url) && /\/dp\/[A-Z0-9]{10}/i.test(url);
}

function resellerSearchUrl(product) {
  const query = encodeURIComponent(product.title || product.slug);
  return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
}

function renderedOutboundUrl(product) {
  if (product.affiliate?.enabled && product.affiliate.url) return product.affiliate.url;
  if (product.directAmazonUrl) return product.directAmazonUrl;
  return product.sourceLink || null;
}

function issue(list, product, message) {
  list.push({
    slug: product.slug,
    title: product.title,
    message,
  });
}

function ensureAmazonAffiliateShape(product) {
  if (!isAmazonUrl(product.directAmazonUrl)) return;
  if (!product.affiliate?.enabled || product.affiliate.provider !== "amazon" || product.affiliate.url !== product.directAmazonUrl) {
    product.affiliate = {
      enabled: true,
      provider: "amazon",
      url: product.directAmazonUrl,
    };
    fixLog.push(`${product.slug}: normalized affiliate.url to directAmazonUrl`);
  }
}

function removeAmazonMonetization(product) {
  let changed = false;
  if (isAmazonUrl(product.directAmazonUrl)) {
    delete product.directAmazonUrl;
    changed = true;
  }
  if (isAmazonUrl(product.affiliate?.url) || product.affiliate?.provider === "amazon") {
    delete product.affiliate;
    changed = true;
  }
  if (product.amazonAsin && !isAmazonUrl(product.directAmazonUrl)) {
    delete product.amazonAsin;
    changed = true;
  }
  return changed;
}

for (const product of products) {
  const sourceIsAmazon = isAmazonUrl(product.sourceLink);
  const sourceIsExternalNonAmazon = Boolean(product.sourceLink) && !sourceIsAmazon;
  const directIsAmazon = isAmazonUrl(product.directAmazonUrl);
  const affiliateIsAmazon = isAmazonUrl(product.affiliate?.url) || product.affiliate?.provider === "amazon";

  if (shouldFix) {
    if (officialSourceOverrides.has(product.slug)) {
      const nextSource = officialSourceOverrides.get(product.slug);
      if (product.sourceLink !== nextSource) {
        product.sourceLink = nextSource;
        fixLog.push(`${product.slug}: set official product source`);
      }
    }

    if (productCopyOverrides.has(product.slug)) {
      Object.assign(product, productCopyOverrides.get(product.slug));
      fixLog.push(`${product.slug}: refreshed current product copy`);
    }

    if (imageOverrides.has(product.slug) && imageCache[product.slug] !== imageOverrides.get(product.slug)) {
      imageCache[product.slug] = imageOverrides.get(product.slug);
      fixLog.push(`${product.slug}: replaced cached image`);
    }

    if (product.availableOnAmazon === false && sourceIsExternalNonAmazon && (directIsAmazon || affiliateIsAmazon)) {
      if (removeAmazonMonetization(product)) {
        fixLog.push(`${product.slug}: removed Amazon CTA from non-Amazon product`);
      }
    }

    if (product.availableOnAmazon === false && !sourceIsExternalNonAmazon && (directIsAmazon || affiliateIsAmazon || sourceIsAmazon)) {
      product.availableOnAmazon = true;
      if (!product.directAmazonUrl && isAmazonUrl(product.sourceLink)) product.directAmazonUrl = product.sourceLink;
      ensureAmazonAffiliateShape(product);
      fixLog.push(`${product.slug}: marked Amazon-eligible because Amazon is the only commerce path`);
    }

    if (sourceIsAmazon && hasAmazonSearchUrl(product.sourceLink)) {
      delete product.sourceLink;
      fixLog.push(`${product.slug}: removed Amazon search page from sourceLink`);
    }

    if (hasAmazonSearchUrl(product.directAmazonUrl) && !product.amazonAsin) {
      if (!product.sourceLink) {
        product.sourceLink = product.bestBuyUrl || resellerSearchUrl(product);
      }
      product.availableOnAmazon = false;
      if (removeAmazonMonetization(product)) {
        fixLog.push(`${product.slug}: removed unverified Amazon search CTA`);
      }
    }

    ensureAmazonAffiliateShape(product);
  }
}

for (const product of products) {
  const sourceIsAmazon = isAmazonUrl(product.sourceLink);
  const sourceIsExternalNonAmazon = Boolean(product.sourceLink) && !sourceIsAmazon;
  const directIsAmazon = isAmazonUrl(product.directAmazonUrl);
  const affiliateIsAmazon = isAmazonUrl(product.affiliate?.url) || product.affiliate?.provider === "amazon";
  const outbound = renderedOutboundUrl(product);

  if (product.availableOnAmazon === false && sourceIsExternalNonAmazon && (directIsAmazon || affiliateIsAmazon)) {
    issue(
      errors,
      product,
      `marked non-Amazon with source ${hostOf(product.sourceLink)}, but rendered CTA can still route to Amazon`
    );
  }

  if (product.availableOnAmazon === false && !product.sourceLink && !product.bestBuyUrl && !product.directAmazonUrl) {
    issue(errors, product, "marked non-Amazon but has no official source or reseller link");
  }

  if (product.availableOnAmazon !== false && !directIsAmazon) {
    issue(errors, product, "Amazon-eligible product is missing directAmazonUrl");
  }

  if (product.availableOnAmazon !== false && (!product.affiliate?.enabled || !product.affiliate?.url)) {
    issue(errors, product, "Amazon-eligible product is missing an enabled affiliate URL");
  }

  if (directIsAmazon) {
    const tag = extractAmazonTag(product.directAmazonUrl);
    if (tag !== expectedAmazonTag) {
      issue(errors, product, `directAmazonUrl tag is ${tag || "(missing)"}, expected ${expectedAmazonTag}`);
    }
  }

  if (affiliateIsAmazon) {
    const tag = extractAmazonTag(product.affiliate?.url);
    if (tag !== expectedAmazonTag) {
      issue(errors, product, `affiliate.url tag is ${tag || "(missing)"}, expected ${expectedAmazonTag}`);
    }
  }

  if (product.amazonAsin && directIsAmazon && !new RegExp(`/dp/${product.amazonAsin}(?:[/?]|$)`, "i").test(product.directAmazonUrl)) {
    issue(errors, product, `amazonAsin ${product.amazonAsin} does not match directAmazonUrl`);
  }

  if (hasAmazonSearchUrl(product.directAmazonUrl) && product.amazonAsin) {
    issue(errors, product, "has amazonAsin but still renders an Amazon search URL instead of the ASIN product URL");
  }

  if (hasAmazonSearchUrl(product.directAmazonUrl) && !product.amazonAsin) {
    issue(errors, product, "uses an unverified Amazon search URL; set an exact /dp/ASIN URL or remove Amazon monetization");
  }

  if (sourceIsAmazon && hasAmazonSearchUrl(product.sourceLink)) {
    issue(warnings, product, "sourceLink is an Amazon search page; prefer an official manufacturer page or exact reseller page");
  }

  if (hostOf(product.sourceLink) === "producthunt.com") {
    issue(warnings, product, "sourceLink points to Product Hunt; prefer the product's official website when available");
  }

  if (!imageCache[product.slug]) {
    issue(errors, product, "missing image-cache entry");
  }

  if (knownBadImageUrls.get(product.slug) && imageCache[product.slug] === knownBadImageUrls.get(product.slug)) {
    issue(errors, product, "known incorrect image assignment");
  }

  if (product.availableOnAmazon === false && outbound && isAmazonUrl(outbound)) {
    issue(errors, product, "rendered outbound URL still resolves to Amazon despite availableOnAmazon=false");
  }
}

if (shouldFix) {
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + "\n");
  fs.writeFileSync(imageCachePath, JSON.stringify(imageCache, null, 2) + "\n");
}

const totals = {
  products: products.length,
  amazonEligible: products.filter((p) => p.availableOnAmazon !== false).length,
  nonAmazon: products.filter((p) => p.availableOnAmazon === false).length,
  amazonSearchUrls: products.filter((p) => hasAmazonSearchUrl(p.directAmazonUrl)).length,
  amazonAsinUrls: products.filter((p) => hasAmazonProductUrl(p.directAmazonUrl)).length,
  productImages: products.filter((p) => Boolean(imageCache[p.slug])).length,
};

console.log("\nProduct commerce audit");
console.log("=".repeat(24));
console.log(`Products:          ${totals.products}`);
console.log(`Amazon-eligible:   ${totals.amazonEligible}`);
console.log(`Non-Amazon/DTC:    ${totals.nonAmazon}`);
console.log(`Amazon /dp/ URLs:  ${totals.amazonAsinUrls}`);
console.log(`Amazon search URLs:${String(totals.amazonSearchUrls).padStart(4)}`);
console.log(`Product images:    ${totals.productImages}/${totals.products}`);

if (fixLog.length > 0) {
  console.log("\nFixes applied:");
  for (const line of fixLog) console.log(`  - ${line}`);
}

if (errors.length > 0) {
  console.error("\nErrors:");
  for (const entry of errors.slice(0, 80)) {
    console.error(`  - ${entry.slug}: ${entry.message}`);
  }
  if (errors.length > 80) console.error(`  ...and ${errors.length - 80} more`);
}

if (warnings.length > 0) {
  console.warn("\nWarnings:");
  for (const entry of warnings.slice(0, 80)) {
    console.warn(`  - ${entry.slug}: ${entry.message}`);
  }
  if (warnings.length > 80) console.warn(`  ...and ${warnings.length - 80} more`);
}

console.log("\nSummary:");
console.log(`  ${errors.length} error(s), ${warnings.length} warning(s)`);

process.exit(errors.length > 0 ? 1 : 0);
