/**
 * Pre-deploy validation for all JSON data files.
 * Checks: duplicate slugs, missing required fields, empty values, id gaps.
 * Exits with code 1 if any errors found (warnings don't block).
 *
 * Usage: node scripts/validate-data.js
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

// Required fields per category (field name → human label)
const SCHEMAS = {
  discoveries: {
    required: ["id", "slug", "title", "shortDescription", "category", "whyItIsInteresting", "type"],
    optional: ["imageIdea", "sourceLink", "dateAdded"],
    typeField: "discovery",
  },
  products: {
    required: ["id", "slug", "title", "shortDescription", "category", "whyItIsInteresting", "type"],
    optional: ["imageIdea", "sourceLink", "estimatedPriceRange", "dateAdded"],
    typeField: "product",
  },
  "hidden-gems": {
    required: ["id", "slug", "name", "whatItDoes", "category", "whyItIsUseful", "type"],
    optional: ["imageIdea", "websiteLink", "dateAdded"],
    typeField: "hidden-gem",
  },
  "future-radar": {
    required: ["id", "slug", "techName", "explanation", "industry", "whyItMatters", "developmentStage", "type"],
    optional: ["imageIdea", "dateAdded"],
    typeField: "future-tech",
  },
  "daily-tools": {
    required: ["id", "slug", "toolName", "whatItDoes", "category", "whyItIsUseful", "type"],
    optional: ["websiteLink", "imageIdea", "dateAdded"],
    typeField: "tool",
  },
};

let totalErrors = 0;
let totalWarnings = 0;

function error(cat, msg) {
  console.error(`  ❌ [${cat}] ${msg}`);
  totalErrors++;
}

function warn(cat, msg) {
  console.warn(`  ⚠  [${cat}] ${msg}`);
  totalWarnings++;
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
