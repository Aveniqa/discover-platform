const fs = require("fs");
const path = require("path");

const AMAZON_TAG = "vaultvibe-20";

const productsPath = path.join(__dirname, "..", "data", "products.json");
const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));

let updated = 0;
for (const product of products) {
  if (!product.affiliate || !product.affiliate.enabled) {
    const query = encodeURIComponent(product.title);
    product.affiliate = {
      enabled: true,
      provider: "amazon",
      url: `https://www.amazon.com/s?k=${query}&tag=${AMAZON_TAG}`,
    };
    updated++;
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
console.log(`Updated ${updated} of ${products.length} products with Amazon affiliate links.`);
