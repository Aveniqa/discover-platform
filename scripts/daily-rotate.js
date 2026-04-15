const fs = require('fs');
const path = require('path');
const { writeJsonSafe } = require('./lib/write-safe');

if (!process.argv.includes('--run')) {
  console.log('Usage: node scripts/daily-rotate.js --run');
  console.log('Removes the 3 oldest items from each category. Add --run to execute.');
  process.exit(0);
}

const CATS = ['discoveries', 'products', 'hidden-gems', 'future-radar', 'daily-tools'];

for (const cat of CATS) {
  const fp = path.join(__dirname, '..', 'data', `${cat}.json`);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  // Items without dateAdded are treated as the oldest (epoch 0)
  items.sort((a, b) => {
    const da = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
    const db = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
    return da - db;
  });
  const cut = items.splice(0, 5);
  console.log(`[${cat}] Removed: ${cut.map(i => i.slug).join(', ')}`);
  writeJsonSafe(fp, items);
}

// Update category counts in categories.json
const catFile = path.join(__dirname, '..', 'data', 'categories.json');
const catData = JSON.parse(fs.readFileSync(catFile, 'utf8'));
for (const cat of catData) {
  const dataFile = path.join(__dirname, '..', 'data', `${cat.key}.json`);
  const items = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  cat.count = items.length;
}
writeJsonSafe(catFile, catData);
console.log('Category counts updated.');

console.log('\nDone. 25 items removed. Add 25 fresh ones.');
