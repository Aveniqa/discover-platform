#!/usr/bin/env node
/**
 * Product image accuracy audit.
 *
 * Replaces generic stock images for product pages with images discovered from
 * authoritative product/source pages. It does not call AI services.
 *
 * Usage:
 *   node scripts/audit-product-images.mjs
 *   node scripts/audit-product-images.mjs --fix
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const productsPath = path.join(ROOT, "data", "products.json");
const archivePath = path.join(ROOT, "data", "archive.json");
const imageCachePath = path.join(ROOT, "data", "image-cache.json");
const shouldFix = process.argv.includes("--fix");
const CONCURRENCY = Number(process.env.IMAGE_AUDIT_CONCURRENCY || 4);
const ASIN_REGEX = /^[A-Z0-9]{10}$/;

const GENERIC_IMAGE_HOSTS = new Set([
  "images.pexels.com",
  "images.unsplash.com",
  "cdn.pixabay.com",
]);

const BLOCKED_CANDIDATE_WORDS = [
  "favicon",
  "apple-touch-icon",
  "logo",
  "icon",
  "sprite",
  "regionflag",
  "flag",
  "klarna",
  "placeholder",
  "default-image",
  "default-thumbnail",
  "notify-btn",
  "back-in-stock",
  "blockify",
  "synctrack",
  "question_mark",
  "image_backgrounds",
  "gallery-thumb-main",
  "standard_icon",
  "configurator",
  "@sku@",
  "{{videoid}}",
  "%7b%7bvideoid%7d%7d",
  "prize1",
  "noun-photo",
  "incart",
  "not_a_",
  "og_image",
  "ogp-image",
  "og-updated",
  "default-og-image",
  "carrybag",
  "carry-bag",
  "collectioncarousel",
  "floorplan",
  "interstitial",
  "app-teaser",
  "phone-frame",
  "patient-monitoring",
  "mqdefault",
  "hqdefault",
  "sddefault",
  "maxresdefault",
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "plus",
  "pro",
  "smart",
  "portable",
  "wireless",
  "set",
  "kit",
  "series",
  "collection",
  "product",
  "products",
  "buy",
  "shop",
  "official",
  "store",
  "new",
  "mini",
  "gen",
  "black",
  "white",
  "gray",
  "grey",
]);

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const activeProducts = JSON.parse(fs.readFileSync(productsPath, "utf8"));
const archivedProducts = JSON.parse(fs.readFileSync(archivePath, "utf8"))
  .filter((item) => item.type === "product");
const products = [...activeProducts, ...archivedProducts];
const imageCache = JSON.parse(fs.readFileSync(imageCachePath, "utf8"));

function decodeEntities(value) {
  return String(value || "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x2F;", "/")
    .replaceAll("\\u0026", "&")
    .replaceAll("\\/", "/");
}

function hostOf(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function safePublicUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return "";
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal" ||
    host === "169.254.169.254" ||
    host === "0.0.0.0" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return "";
  }

  return parsed.toString();
}

function isAmazonUrl(url) {
  const host = hostOf(url);
  return host === "amazon.com" || host.endsWith(".amazon.com");
}

function isAmazonProductUrl(url) {
  return isAmazonUrl(url) && /\/dp\/[A-Z0-9]{10}/i.test(url);
}

function isGenericImage(url) {
  return GENERIC_IMAGE_HOSTS.has(hostOf(url));
}

function isLocalImage(url) {
  return typeof url === "string" && url.startsWith("/");
}

function isExactImage(url) {
  const host = hostOf(url);
  return isLocalImage(url) || host === "m.media-amazon.com" || (!GENERIC_IMAGE_HOSTS.has(host) && Boolean(host));
}

function isSearchUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.toLowerCase();
    if (host === "amazon.com" || host.endsWith(".amazon.com")) {
      return path === "/s" || path.startsWith("/s/");
    }
    if (host === "bestbuy.com" || host.endsWith(".bestbuy.com")) {
      return path.includes("/site/searchpage.jsp");
    }
    if (host === "ebay.com" || host.endsWith(".ebay.com")) {
      return parsed.searchParams.has("_nkw");
    }
    return path.includes("/search");
  } catch {
    return false;
  }
}

function isHomepageUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.pathname === "" || parsed.pathname === "/";
  } catch {
    return false;
  }
}

function titleTokens(product) {
  return [...new Set(`${product.title || ""} ${product.slug || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token) && !/^\d+$/.test(token)))];
}

function hasSmallFixedDimensions(url) {
  const lowered = String(url || "").toLowerCase();
  for (const match of lowered.matchAll(/(?:^|[^\d])(\d{2,4})x(\d{2,4})(?:[^\d]|$)/g)) {
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width < 300 || height < 300) return true;
  }
  const width = lowered.match(/[?&](?:w|width|sw)=(\d{2,4})/);
  const height = lowered.match(/[?&](?:h|height|sh)=(\d{2,4})/);
  return Boolean((width && Number(width[1]) < 300) || (height && Number(height[1]) < 300));
}

function isBlockedImageUrl(url) {
  const lowered = String(url || "").replaceAll("&amp;", "&").toLowerCase();
  try {
    const parsed = new URL(url);
    if (/\/i\.png$/i.test(parsed.pathname)) return true;
    if (parsed.hostname.toLowerCase() === "i.ytimg.com") return true;
  } catch {
    // Fall through to string heuristics.
  }
  return BLOCKED_CANDIDATE_WORDS.some((word) => lowered.includes(word)) || hasSmallFixedDimensions(url);
}

function safeDecodeUri(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function tokenMatches(product, ...values) {
  const haystack = values.map((value) => safeDecodeUri(String(value || "").toLowerCase())).join(" ");
  return titleTokens(product).filter((token) => haystack.includes(token));
}

function hasSpecificProductMatch(product, ...values) {
  const tokens = titleTokens(product);
  const matches = tokenMatches(product, ...values);
  if (matches.length >= 2) return true;
  if (matches.length !== 1) return false;
  return matches[0] !== tokens[0] && matches[0].length >= 5;
}

function pageCandidates(product) {
  const urls = [
    product.sourceLink && !isSearchUrl(product.sourceLink) && !isHomepageUrl(product.sourceLink)
      ? product.sourceLink
      : "",
    isAmazonProductUrl(product.directAmazonUrl) ? product.directAmazonUrl : "",
    product.bestBuyUrl && !isSearchUrl(product.bestBuyUrl) ? product.bestBuyUrl : "",
  ].filter(Boolean);
  return [...new Set(urls)];
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function toAbsolute(candidate, baseUrl) {
  if (!candidate) return "";
  try {
    const cleaned = decodeEntities(candidate).trim().replace(/\\+$/, "");
    const url = new URL(cleaned, baseUrl);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.toString();
  } catch {
    return "";
  }
}

function viableImageUrl(url) {
  if (!url) return false;
  const lowered = url.toLowerCase();
  if (!/^https?:\/\//i.test(url)) return false;
  if (isBlockedImageUrl(lowered)) return false;
  return /\.(avif|gif|jpe?g|png|webp|svg)(?:[?#]|$)/i.test(lowered) || lowered.includes("/images/");
}

function addCandidate(candidates, url, source, baseUrl, extra = {}) {
  const absolute = toAbsolute(url, baseUrl);
  if (viableImageUrl(absolute)) candidates.push({ url: absolute, source, ...extra });
}

function extractImages(html, pageUrl, product) {
  const candidates = [];
  const decoded = decodeEntities(html);

  for (const tag of decoded.matchAll(/<meta\b[^>]+>/gi)) {
    const raw = tag[0];
    const key = `${attr(raw, "property")} ${attr(raw, "name")}`.toLowerCase();
    if (/\bog:image\b|\btwitter:image(?::src)?\b/.test(key)) {
      addCandidate(candidates, attr(raw, "content"), key.includes("twitter") ? "twitter" : "og", pageUrl);
    }
  }

  for (const tag of decoded.matchAll(/<link\b[^>]+>/gi)) {
    const raw = tag[0];
    if (attr(raw, "rel").toLowerCase().includes("image_src")) {
      addCandidate(candidates, attr(raw, "href"), "image_src", pageUrl);
    }
  }

  const amazonHiRes = decoded.match(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/i);
  if (amazonHiRes) addCandidate(candidates, amazonHiRes[1], "amazon-hires", pageUrl);

  for (const match of decoded.matchAll(/https:\/\/m\.media-amazon\.com\/images\/I\/[^"'\s<>]+?\.(?:jpg|png|webp)/gi)) {
    addCandidate(candidates, match[0], "amazon-media", pageUrl);
  }

  for (const match of decoded.matchAll(/"image"\s*:\s*"([^"]+)"/gi)) {
    addCandidate(candidates, match[1], "jsonld", pageUrl);
  }

  for (const match of decoded.matchAll(/"image"\s*:\s*\[\s*"([^"]+)"/gi)) {
    addCandidate(candidates, match[1], "jsonld", pageUrl);
  }

  for (const tag of decoded.matchAll(/<img\b[^>]+>/gi)) {
    const raw = tag[0];
    const alt = attr(raw, "alt");
    const src = attr(raw, "src") || attr(raw, "data-src") || attr(raw, "data-original");
    const srcset = attr(raw, "srcset");
    const relevantAlt = hasSpecificProductMatch(product, alt);
    if (relevantAlt) addCandidate(candidates, src, "img-alt", pageUrl, { alt });
    if (relevantAlt && srcset) {
      const srcsetFirst = srcset.split(",").map((part) => part.trim().split(/\s+/)[0]).find(Boolean);
      addCandidate(candidates, srcsetFirst, "img-alt", pageUrl, { alt });
    }
  }

  for (const match of decoded.matchAll(/https?:\/\/[^"'\s<>]+?\.(?:avif|jpe?g|png|webp)(?:[?#][^"'\s<>]*)?/gi)) {
    if (hasSpecificProductMatch(product, match[0])) {
      addCandidate(candidates, match[0], "html-image", pageUrl);
    }
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

function rankCandidate(candidate, product, pageUrl = "") {
  const host = hostOf(candidate.url);
  let score = 0;
  const matches = tokenMatches(product, candidate.url, candidate.alt);
  if (candidate.source === "amazon-asin-image") score += 120;
  if (candidate.source === "amazon-hires") score += 110;
  if (candidate.source === "amazon-media") score += 95;
  if (candidate.source === "og") score += 75;
  if (candidate.source === "twitter") score += 70;
  if (candidate.source === "jsonld") score += 80;
  if (candidate.source === "img-alt") score += 85;
  if (candidate.source === "html-image") score += 35;
  if (host === "m.media-amazon.com") score += 40;
  if (host === "images-na.ssl-images-amazon.com") score += 35;
  score += Math.min(matches.length * 8, 32);
  if (candidate.source === "html-image" && matches.length === 0) score -= 100;
  if (candidate.url.includes("SL1500") || candidate.url.includes("SX1200") || candidate.url.includes("1200")) score += 10;
  if (/logo|icon|brand/i.test(candidate.url)) score -= 40;
  return score;
}

async function fetchHtml(url) {
  const safeUrl = safePublicUrl(url);
  if (!safeUrl) return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(safeUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timer);
    if (response.status >= 400) return "";
    return await response.text();
  } catch {
    clearTimeout(timer);
    return "";
  }
}

async function validImageResource(url) {
  const safeUrl = safePublicUrl(url);
  if (!safeUrl) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(safeUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    clearTimeout(timer);
    const type = response.headers.get("content-type") || "";
    const length = Number(response.headers.get("content-length") || 0);
    return response.status < 400 && type.startsWith("image/") && type !== "image/gif" && length > 5000;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

async function amazonAsinImage(product) {
  if (!ASIN_REGEX.test(product.amazonAsin || "")) return null;
  const legacyAmazonImage = `https://images-na.ssl-images-amazon.com/images/P/${product.amazonAsin}.01._SCLZZZZZZZ_.jpg`;
  if (await validImageResource(legacyAmazonImage)) {
    return {
      url: legacyAmazonImage,
      source: "amazon-asin-image",
      pageUrl: product.directAmazonUrl || `https://www.amazon.com/dp/${product.amazonAsin}`,
    };
  }
  return null;
}

async function findProductImage(product) {
  const found = [];
  const asinImage = await amazonAsinImage(product);
  if (asinImage) found.push(asinImage);

  for (const pageUrl of pageCandidates(product)) {
    const html = await fetchHtml(pageUrl);
    if (!html) continue;
    found.push(...extractImages(html, pageUrl, product).map((candidate) => ({ ...candidate, pageUrl })));
  }

  const ranked = found
    .filter((candidate) => !isBlockedImageUrl(candidate.url))
    .sort((a, b) => rankCandidate(b, product, b.pageUrl) - rankCandidate(a, product, a.pageUrl));

  for (const candidate of ranked) {
    if (candidate.source === "amazon-asin-image" || await validImageResource(candidate.url)) {
      return candidate;
    }
  }

  return null;
}

async function mapLimit(items, limit, worker) {
  const results = [];
  let index = 0;
  async function next() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

const rows = await mapLimit(products, CONCURRENCY, async (product) => {
  const currentImage = imageCache[product.slug] || "";
  const currentGeneric = isGenericImage(currentImage);
  const currentBlocked = isBlockedImageUrl(currentImage);
  const currentExact = isExactImage(currentImage) && !currentGeneric;
  const shouldReplace = !currentImage || currentGeneric || currentBlocked;
  const found = shouldReplace ? await findProductImage(product) : null;

  if (shouldFix && shouldReplace && found?.url) {
    imageCache[product.slug] = found.url;
  }

  return {
    slug: product.slug,
    title: product.title,
    currentImage,
    currentGeneric,
    currentBlocked,
    currentExact,
    candidate: found?.url || "",
    candidateSource: found?.source || "",
    candidatePage: found?.pageUrl || "",
    fixed: Boolean(shouldFix && shouldReplace && found?.url),
  };
});

if (shouldFix) {
  fs.writeFileSync(imageCachePath, JSON.stringify(imageCache, null, 2) + "\n");
}

const generic = rows.filter((row) => row.currentGeneric);
const fixed = rows.filter((row) => row.fixed);
const unresolvedGeneric = rows.filter((row) => row.currentGeneric && !row.fixed);
const unresolvedBlocked = rows.filter((row) => row.currentBlocked && !row.fixed);
const missing = rows.filter((row) => !row.currentImage);
const exactAfter = products.filter((product) => {
  const image = imageCache[product.slug];
  return image && !isGenericImage(image);
});

console.log("\nProduct image audit");
console.log("=".repeat(24));
console.log(`Products:               ${products.length}`);
console.log(`Generic stock images:   ${generic.length}`);
console.log(`Exact/non-stock images: ${exactAfter.length}`);
console.log(`Missing images:         ${missing.length}`);
console.log(`Fixed this run:         ${fixed.length}`);
console.log(`Still generic:          ${unresolvedGeneric.length}`);
console.log(`Still blocked:          ${unresolvedBlocked.length}`);

if (fixed.length > 0) {
  console.log("\nUpdated images:");
  for (const row of fixed.slice(0, 80)) {
    console.log(`  - ${row.slug}: ${row.candidateSource} from ${hostOf(row.candidatePage)}`);
  }
  if (fixed.length > 80) console.log(`  ...and ${fixed.length - 80} more`);
}

if (unresolvedGeneric.length > 0) {
  console.log("\nNeeds manual image/source review:");
  for (const row of unresolvedGeneric.slice(0, 80)) {
    console.log(`  - ${row.slug}: ${hostOf(row.currentImage) || "(missing)"}`);
  }
  if (unresolvedGeneric.length > 80) console.log(`  ...and ${unresolvedGeneric.length - 80} more`);
}

process.exit(missing.length > 0 ? 1 : 0);
