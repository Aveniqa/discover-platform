const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const collectionsPath = path.join(dataDir, "collections.json");
const collections = JSON.parse(fs.readFileSync(collectionsPath, "utf8"));

const dataFiles = [
  "discoveries.json",
  "products.json",
  "hidden-gems.json",
  "future-radar.json",
  "daily-tools.json",
];

// Load all items
const allItems = [];
for (const file of dataFiles) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
  allItems.push(...items);
}

// Get the text content of an item for keyword matching
function getItemText(item) {
  return [
    item.title,
    item.name,
    item.techName,
    item.toolName,
    item.shortDescription,
    item.whatItDoes,
    item.explanation,
    item.whyItIsInteresting,
    item.whyItIsUseful,
    item.whyItMatters,
    item.category,
    item.industry,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const collectionKeywords = {
  "work-from-home-essentials": [
    "desk",
    "office",
    "keyboard",
    "monitor",
    "webcam",
    "productivity",
    "ergonomic",
    "home office",
    "workspace",
    "chair",
    "laptop",
    "stand",
  ],
  "under-50-dollars": [], // special: filter products with price < 50
  "ai-powered-tools": [
    "ai",
    "artificial intelligence",
    "machine learning",
    "gpt",
    "llm",
    "copilot",
    "assistant",
    "neural",
    "chatbot",
    "generative",
    "deep learning",
  ],
  "gift-guide": [], // special: items with badge === "great-gift" + popular picks
  "health-and-wellness": [
    "health",
    "fitness",
    "wellness",
    "meditation",
    "sleep",
    "exercise",
    "yoga",
    "mental health",
    "nutrition",
    "workout",
    "diet",
    "mindfulness",
  ],
};

const MAX_PER_COLLECTION = 12;

for (const collection of collections) {
  let matches = [];

  if (collection.slug === "under-50-dollars") {
    // Products with lower bound < 50
    matches = allItems.filter((item) => {
      if (item.type !== "product") return false;
      const match = (item.estimatedPriceRange || "").match(/\$(\d+(?:,\d+)?)/);
      const lower = match ? parseInt(match[1].replace(",", "")) : Infinity;
      return lower < 50;
    });
    // Also add tools/gems (they're free)
    const freeItems = allItems.filter(
      (i) => (i.type === "hidden-gem" || i.type === "tool")
    );
    // Combine and deduplicate
    const combined = [...matches, ...freeItems];
    const seen = new Set();
    matches = combined.filter((i) => {
      if (seen.has(i.slug)) return false;
      seen.add(i.slug);
      return true;
    });
  } else if (collection.slug === "gift-guide") {
    // Items with great-gift badge first, then products with gift-related keywords
    const badged = allItems.filter((i) => i.badge === "great-gift");
    const keywords = ["gift", "luxury", "premium", "special", "present", "holiday"];
    const keywordMatch = allItems
      .filter((i) => !i.badge || i.badge !== "great-gift")
      .filter((i) => {
        const text = getItemText(i);
        return keywords.some((kw) => text.includes(kw));
      });
    matches = [...badged, ...keywordMatch];
  } else {
    const keywords = collectionKeywords[collection.slug] || [];
    if (keywords.length > 0) {
      matches = allItems.filter((item) => {
        const text = getItemText(item);
        return keywords.some((kw) => text.includes(kw));
      });
    }
  }

  // Cap and deduplicate
  const seen = new Set();
  const deduped = matches.filter((i) => {
    if (seen.has(i.slug)) return false;
    seen.add(i.slug);
    return true;
  });

  collection.itemSlugs = deduped.slice(0, MAX_PER_COLLECTION).map((i) => i.slug);
  console.log(
    `[${collection.slug}] → ${collection.itemSlugs.length} items`
  );
}

fs.writeFileSync(collectionsPath, JSON.stringify(collections, null, 2));
console.log("Collections populated.");
