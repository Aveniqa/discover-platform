#!/usr/bin/env node
/**
 * Swap all Best Buy search URLs to Impact-tracked affiliate URLs.
 *
 * Usage:
 *   node scripts/activate-bestbuy-affiliate.js \
 *     --tracking-id=123456 \
 *     --program-id=1234567890 \
 *     [--format=standard|impact]
 *
 * What it does:
 *   1. Reads data/products.json
 *   2. Replaces every bestBuyUrl with an Impact-tracked version
 *   3. Writes the updated file
 *   4. Updates generate-daily-content.js and bulk-generate-content.js
 *      so future products also get tracked URLs
 *
 * Impact Best Buy link format (standard):
 *   https://goto.bestbuy.com/c/<TRACKING_ID>/?u=<encoded_bestbuy_url>
 *
 * Impact redirect format:
 *   https://bestbuy.evyy.net/c/<TRACKING_ID>/<PROGRAM_ID>?u=<encoded_bestbuy_url>
 */

const fs = require("fs");
const path = require("path");

// ── Parse CLI args ──────────────────────────────────────
function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [key, ...val] = arg.replace(/^--/, "").split("=");
    args[key] = val.join("=") || true;
  }
  return args;
}

const args = parseArgs();
const TRACKING_ID = args["tracking-id"];
const PROGRAM_ID = args["program-id"];
const FORMAT = args["format"] || "standard";

if (!TRACKING_ID || !PROGRAM_ID) {
  console.error("❌ Missing required args: --tracking-id and --program-id");
  console.error("Usage: node scripts/activate-bestbuy-affiliate.js --tracking-id=123456 --program-id=1234567890");
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, "..", "data");
const SCRIPTS_DIR = __dirname;

// ── Build tracked URL ───────────────────────────────────
function buildTrackedUrl(originalUrl) {
  const encoded = encodeURIComponent(originalUrl);
  if (FORMAT === "impact") {
    return `https://bestbuy.evyy.net/c/${TRACKING_ID}/${PROGRAM_ID}?u=${encoded}`;
  }
  // Standard goto.bestbuy.com format
  return `https://goto.bestbuy.com/c/${TRACKING_ID}/${PROGRAM_ID}?u=${encoded}`;
}

// ── 1. Update products.json ─────────────────────────────
console.log("\n🏬 Activating Best Buy Impact affiliate tracking\n");
console.log(`  Tracking ID:  ${TRACKING_ID}`);
console.log(`  Program ID:   ${PROGRAM_ID}`);
console.log(`  Link format:  ${FORMAT}\n`);

const productsFile = path.join(DATA_DIR, "products.json");
const products = JSON.parse(fs.readFileSync(productsFile, "utf8"));

let swapped = 0;
let alreadyTracked = 0;

for (const p of products) {
  if (!p.bestBuyUrl) continue;

  // Skip if already an Impact-tracked URL
  if (p.bestBuyUrl.includes("evyy.net") || p.bestBuyUrl.includes("goto.bestbuy.com")) {
    alreadyTracked++;
    continue;
  }

  p.bestBuyUrl = buildTrackedUrl(p.bestBuyUrl);
  swapped++;
}

fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
console.log(`✅ Products updated: ${swapped} swapped, ${alreadyTracked} already tracked`);

// ── 2. Update daily generation script ───────────────────
const dailyScript = path.join(SCRIPTS_DIR, "generate-daily-content.js");
let dailyCode = fs.readFileSync(dailyScript, "utf8");

// Add BESTBUY_TRACKING env vars and swap the URL builder
const oldBBUrl = "p.bestBuyUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`;";
const newBBUrl = `{
      const rawUrl = \`https://www.bestbuy.com/site/searchpage.jsp?st=\${query}\`;
      const bbTrackingId = process.env.BESTBUY_TRACKING_ID || "${TRACKING_ID}";
      const bbProgramId = process.env.BESTBUY_PROGRAM_ID || "${PROGRAM_ID}";
      p.bestBuyUrl = \`https://goto.bestbuy.com/c/\${bbTrackingId}/\${bbProgramId}?u=\${encodeURIComponent(rawUrl)}\`;
    }`;

if (dailyCode.includes(oldBBUrl)) {
  dailyCode = dailyCode.replace(oldBBUrl, newBBUrl);
  fs.writeFileSync(dailyScript, dailyCode);
  console.log("✅ generate-daily-content.js updated with tracked URLs");
} else {
  console.log("⚠️  generate-daily-content.js: Best Buy URL pattern not found (may already be updated)");
}

// ── 3. Update bulk generation script ────────────────────
const bulkScript = path.join(SCRIPTS_DIR, "bulk-generate-content.js");
let bulkCode = fs.readFileSync(bulkScript, "utf8");

const oldBulkBBUrl = 'p.bestBuyUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(p.title)}`;';
const newBulkBBUrl = `{
      const rawUrl = \`https://www.bestbuy.com/site/searchpage.jsp?st=\${encodeURIComponent(p.title)}\`;
      const bbTrackingId = process.env.BESTBUY_TRACKING_ID || "${TRACKING_ID}";
      const bbProgramId = process.env.BESTBUY_PROGRAM_ID || "${PROGRAM_ID}";
      p.bestBuyUrl = \`https://goto.bestbuy.com/c/\${bbTrackingId}/\${bbProgramId}?u=\${encodeURIComponent(rawUrl)}\`;
    }`;

if (bulkCode.includes(oldBulkBBUrl)) {
  bulkCode = bulkCode.replace(oldBulkBBUrl, newBulkBBUrl);
  fs.writeFileSync(bulkScript, bulkCode);
  console.log("✅ bulk-generate-content.js updated with tracked URLs");
} else {
  console.log("⚠️  bulk-generate-content.js: Best Buy URL pattern not found (may already be updated)");
}

// ── Summary ─────────────────────────────────────────────
const totalBB = products.filter((p) => p.bestBuyUrl).length;
console.log(`\n🎉 Done! ${totalBB} products now have Impact-tracked Best Buy URLs.`);
console.log("   Commit and push to deploy.\n");
