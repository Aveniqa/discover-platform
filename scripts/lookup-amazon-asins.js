const fs = require("fs");
const path = require("path");

const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || (() => {
  console.error("⚠️  AMAZON_AFFILIATE_TAG env var not set — falling back to placeholder tag.");
  return "YOUR-AFFILIATE-TAG-HERE";
})();
const productsPath = path.join(__dirname, "..", "data", "products.json");
const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

let updated = 0;

for (const product of products) {
  if (!product.directAmazonUrl) {
    const searchQuery = encodeURIComponent(product.title);
    product.directAmazonUrl = `https://www.amazon.com/s?k=${searchQuery}&tag=${AFFILIATE_TAG}`;
    updated++;
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
console.log(`Updated ${updated} products with directAmazonUrl`);
