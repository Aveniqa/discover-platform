/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Pre-deploy validation for all JSON data files.
 * Checks: duplicate slugs, missing required fields, empty values, id gaps.
 * Exits with code 1 if any errors found (warnings don't block).
 *
 * Usage: node scripts/validate-data.js
 */

const fs = require("fs");
const net = require("net");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const ARCHIVE_FILE = "archive";
const URL_FIELDS = ["sourceLink", "websiteLink", "directAmazonUrl", "bestBuyUrl"];

// Required fields per category (field name → human label)
const SCHEMAS = {
  discoveries: {
    required: ["id", "slug", "title", "shortDescription", "category", "whyItIsInteresting", "type"],
    optional: ["seoTitle", "imageIdea", "sourceLink", "dateAdded"],
    typeField: "discovery",
  },
  products: {
    required: ["id", "slug", "title", "shortDescription", "category", "whyItIsInteresting", "type"],
    optional: ["seoTitle", "imageIdea", "sourceLink", "estimatedPriceRange", "dateAdded"],
    typeField: "product",
  },
  "hidden-gems": {
    required: ["id", "slug", "name", "whatItDoes", "category", "whyItIsUseful", "type"],
    optional: ["seoTitle", "imageIdea", "websiteLink", "dateAdded"],
    typeField: "hidden-gem",
  },
  "future-radar": {
    required: ["id", "slug", "techName", "explanation", "industry", "whyItMatters", "developmentStage", "type"],
    optional: ["seoTitle", "imageIdea", "dateAdded"],
    typeField: "future-tech",
  },
  "daily-tools": {
    required: ["id", "slug", "toolName", "whatItDoes", "category", "whyItIsUseful", "type"],
    optional: ["seoTitle", "websiteLink", "imageIdea", "dateAdded"],
    typeField: "tool",
  },
};

let totalErrors = 0;
let totalWarnings = 0;
const slugLocations = new Map();

function error(cat, msg) {
  console.error(`  ❌ [${cat}] ${msg}`);
  totalErrors++;
}

function warn(cat, msg) {
  console.warn(`  ⚠  [${cat}] ${msg}`);
  totalWarnings++;
}

function rememberSlug(cat, item) {
  if (!item.slug) return;
  const locations = slugLocations.get(item.slug) || [];
  locations.push(cat);
  slugLocations.set(item.slug, locations);
}

function isUnsafeHostname(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (ipVersion === 6) {
    return (
      host === "::1" ||
      host === "::" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80:")
    );
  }

  return false;
}

function validatePublicHttpsUrl(cat, label, field, value) {
  if (!value) return;
  let url;
  try {
    url = new URL(value);
  } catch {
    error(cat, `'${label}' has invalid URL in '${field}'`);
    return;
  }

  if (url.protocol !== "https:") {
    error(cat, `'${label}' URL '${field}' must use https`);
  }
  if (url.username || url.password) {
    error(cat, `'${label}' URL '${field}' must not include credentials`);
  }
  if (isUnsafeHostname(url.hostname)) {
    error(cat, `'${label}' URL '${field}' points to a private or reserved host`);
  }
}

console.log("\n🔍 Validating data files...\n");

for (const [cat, schema] of Object.entries(SCHEMAS)) {
  const fp = path.join(DATA_DIR, `${cat}.json`);

  // Check file exists and parses
  if (!fs.existsSync(fp)) {
    error(cat, `File missing: data/${cat}.json`);
    continue;
  }

  let items;
  try {
    items = JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch (e) {
    error(cat, `Invalid JSON: ${e.message}`);
    continue;
  }

  if (!Array.isArray(items)) {
    error(cat, "Root value is not an array");
    continue;
  }

  console.log(`[${cat}] ${items.length} items`);

  // --- Duplicate slug check ---
  const slugCounts = {};
  for (const item of items) {
    const s = item.slug || "(empty)";
    slugCounts[s] = (slugCounts[s] || 0) + 1;
  }
  for (const [slug, count] of Object.entries(slugCounts)) {
    if (count > 1) {
      error(cat, `Duplicate slug '${slug}' appears ${count} times`);
    }
  }

  // --- Duplicate name check ---
  const nameField = { discoveries: "title", products: "title", "hidden-gems": "name", "future-radar": "techName", "daily-tools": "toolName" }[cat];
  const nameCounts = {};
  for (const item of items) {
    const n = (item[nameField] || "").toLowerCase();
    if (n) nameCounts[n] = (nameCounts[n] || 0) + 1;
  }
  for (const [name, count] of Object.entries(nameCounts)) {
    if (count > 1) {
      error(cat, `Duplicate name '${name}' appears ${count} times`);
    }
  }

  // --- Duplicate id check ---
  const idCounts = {};
  for (const item of items) {
    const id = item.id;
    if (id !== undefined) {
      idCounts[id] = (idCounts[id] || 0) + 1;
    }
  }
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) {
      error(cat, `Duplicate id ${id} appears ${count} times`);
    }
  }

  // --- Per-item field checks ---
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = item.slug || `index ${i}`;
    rememberSlug(cat, item);

    // Required fields: must exist and be non-empty
    for (const field of schema.required) {
      if (item[field] === undefined || item[field] === null) {
        error(cat, `'${label}' missing required field '${field}'`);
      } else if (typeof item[field] === "string" && item[field].trim() === "") {
        error(cat, `'${label}' has empty required field '${field}'`);
      }
    }

    // Type field value check
    if (item.type && item.type !== schema.typeField) {
      warn(cat, `'${label}' has type '${item.type}', expected '${schema.typeField}'`);
    }

    // Slug format check (kebab-case)
    if (item.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug)) {
      warn(cat, `'${label}' slug is not valid kebab-case`);
    }

    // Missing dateAdded (warning only — original items don't have it)
    if (!item.dateAdded) {
      // Only warn for items with high ids (likely generated, should have dateAdded)
      if (item.id && item.id > 75) {
        warn(cat, `'${label}' (id=${item.id}) missing dateAdded`);
      }
    }

    for (const field of URL_FIELDS) {
      validatePublicHttpsUrl(cat, label, field, item[field]);
    }
    validatePublicHttpsUrl(cat, label, "affiliate.url", item.affiliate?.url);
  }
}

const archivePath = path.join(DATA_DIR, `${ARCHIVE_FILE}.json`);
if (fs.existsSync(archivePath)) {
  try {
    const archivedItems = JSON.parse(fs.readFileSync(archivePath, "utf8"));
    if (!Array.isArray(archivedItems)) {
      error(ARCHIVE_FILE, "Root value is not an array");
    } else {
      console.log(`[${ARCHIVE_FILE}] ${archivedItems.length} archived items`);
      for (let i = 0; i < archivedItems.length; i++) {
        const item = archivedItems[i];
        const label = item.slug || `index ${i}`;
        rememberSlug(ARCHIVE_FILE, item);
        for (const field of URL_FIELDS) {
          validatePublicHttpsUrl(ARCHIVE_FILE, label, field, item[field]);
        }
        validatePublicHttpsUrl(ARCHIVE_FILE, label, "affiliate.url", item.affiliate?.url);
      }
    }
  } catch (e) {
    error(ARCHIVE_FILE, `Invalid JSON: ${e.message}`);
  }
}

for (const [slug, locations] of slugLocations) {
  if (locations.length > 1) {
    error("slugs", `Slug '${slug}' appears across files: ${locations.join(", ")}`);
  }
}

// --- Summary ---
console.log("\n" + "─".repeat(50));
const total = Object.keys(SCHEMAS).length;
if (totalErrors === 0 && totalWarnings === 0) {
  console.log(`✅ All ${total} files passed validation with no issues.\n`);
} else if (totalErrors === 0) {
  console.log(`✅ Passed with ${totalWarnings} warning(s). No blocking errors.\n`);
} else {
  console.log(`\n❌ FAILED: ${totalErrors} error(s), ${totalWarnings} warning(s).\n`);
  process.exit(1);
}
