const fs = require('fs');
const path = require('path');

if (!process.argv.includes('--run')) {
  console.log('Usage: node scripts/daily-rotate.js --run');
  console.log('Removes the 3 oldest items from each category. Add --run to execute.');
  process.exit(0);
}

const CATS = ['discoveries', 'products', 'hidden-gems', 'future-radar', 'daily-tools'];

for (const cat of CATS) {
  const fp = path.join(__dirname, '..', 'data', `${cat}.json`);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  items.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
  const cut = items.splice(0, 3);
  console.log(`[${cat}] Removed: ${cut.map(i => i.slug).join(', ')}`);
  fs.writeFileSync(fp, JSON.stringify(items, null, 2));
}

console.log('\nDone. 15 items removed. Add 15 fresh ones.');
