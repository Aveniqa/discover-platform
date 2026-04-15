const fs = require("fs");
const path = require("path");
const { writeJsonSafe } = require("./lib/write-safe");

const dataDir = path.join(__dirname, "..", "data");
const categories = [
  "discoveries",
  "products",
  "hidden-gems",
  "future-radar",
  "daily-tools",
];

const categoryLabels = {
  discoveries: "Discovery",
  products: "Trending Product",
  "hidden-gems": "Hidden Gem",
  "future-radar": "Future Tech",
  "daily-tools": "Daily Tool",
};

const picks = [];

for (const cat of categories) {
  const items = JSON.parse(
    fs.readFileSync(path.join(dataDir, cat + ".json"), "utf8")
  );
  if (items.length === 0) {
    console.warn(`  [${cat}] No items — skipping today's pick`);
    continue;
  }
  // Pick the newest item (highest id) from each category
  const newest = items.reduce((a, b) => (a.id > b.id ? a : b));
  console.log(`  [${cat}] Picked: ${newest.slug}`);
  picks.push({
    slug: newest.slug,
    title:
      newest.title || newest.name || newest.techName || newest.toolName || "",
    category: cat,
    categoryLabel: categoryLabels[cat],
    description: (
      newest.shortDescription ||
      newest.whatItDoes ||
      newest.explanation ||
      ""
    ).slice(0, 120),
    badge: newest.badge || null,
    type: newest.type,
  });
}

const picksPath = path.join(dataDir, "todays-picks.json");
writeJsonSafe(picksPath, picks);
console.log(`Generated ${picks.length} today's picks`);
