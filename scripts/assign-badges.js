const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const files = [
  "products.json",
  "discoveries.json",
  "hidden-gems.json",
  "future-radar.json",
  "daily-tools.json",
];

// Clear all existing badges first
files.forEach((file) => {
  const fp = path.join(dataDir, file);
  const items = JSON.parse(fs.readFileSync(fp, "utf8"));
  items.forEach((item) => delete item.badge);
  fs.writeFileSync(fp, JSON.stringify(items, null, 2));
});

// Assign "great-gift" to 3 products with highest price
const products = JSON.parse(
  fs.readFileSync(path.join(dataDir, "products.json"), "utf8")
);
const byPrice = [...products]
  .map((p) => {
    const match = (p.estimatedPriceRange || "").match(/\$([0-9,]+)/g);
    const upper = match
      ? parseInt(match[match.length - 1].replace(/[$,]/g, ""))
      : 0;
    return { ...p, _upper: upper };
  })
  .filter((p) => p._upper > 100)
  .sort((a, b) => b._upper - a._upper);

byPrice.slice(0, 3).forEach((p) => {
  const item = products.find((i) => i.id === p.id);
  if (item) item.badge = "great-gift";
});

// Assign "best-value" to 3 products with lowest price (no badge yet)
const byLow = [...products]
  .filter((p) => !p.badge)
  .map((p) => {
    const match = (p.estimatedPriceRange || "").match(/\$([0-9,]+)/);
    const lower = match ? parseInt(match[1].replace(/[$,]/g, "")) : Infinity;
    return { ...p, _lower: lower };
  })
  .sort((a, b) => a._lower - b._lower);

byLow.slice(0, 3).forEach((p) => {
  const item = products.find((i) => i.id === p.id);
  if (item) item.badge = "best-value";
});

fs.writeFileSync(
  path.join(dataDir, "products.json"),
  JSON.stringify(products, null, 2)
);

// Assign "editors-pick" to 5 items across ALL categories (longest descriptions, no existing badge)
const allItems = [];
files.forEach((file) => {
  const fp = path.join(dataDir, file);
  const items = JSON.parse(fs.readFileSync(fp, "utf8"));
  items.forEach((item) => {
    if (!item.badge) {
      const descLen = (
        item.whyItIsInteresting ||
        item.whyItIsUseful ||
        item.whyItMatters ||
        item.explanation ||
        ""
      ).length;
      allItems.push({ file, id: item.id, descLen });
    }
  });
});

allItems.sort((a, b) => b.descLen - a.descLen);
allItems.slice(0, 5).forEach((pick) => {
  const fp = path.join(dataDir, pick.file);
  const items = JSON.parse(fs.readFileSync(fp, "utf8"));
  const item = items.find((i) => i.id === pick.id);
  if (item) item.badge = "editors-pick";
  fs.writeFileSync(fp, JSON.stringify(items, null, 2));
});

console.log("Badges assigned: 3 great-gift, 3 best-value, 5 editors-pick");
