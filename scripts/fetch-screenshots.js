const fs = require("fs");
const path = require("path");

const gemsPath = path.join(__dirname, "..", "data", "hidden-gems.json");
const gems = JSON.parse(fs.readFileSync(gemsPath, "utf8"));
let updated = 0;

for (const gem of gems) {
  if (gem.websiteLink && !gem.screenshotUrl) {
    // Microlink embed redirect returns the screenshot image directly
    gem.screenshotUrl = `https://api.microlink.io?url=${encodeURIComponent(gem.websiteLink)}&screenshot=true&meta=false&embed=screenshot.url`;
    updated++;
  }
}

fs.writeFileSync(gemsPath, JSON.stringify(gems, null, 2));
console.log(`Added ${updated} screenshot URLs to hidden gems`);
