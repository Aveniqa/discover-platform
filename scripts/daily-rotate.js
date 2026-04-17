const fs = require('fs');
const path = require('path');
const { writeJsonSafe } = require('./lib/write-safe');

if (!process.argv.includes('--run')) {
  console.log('Usage: node scripts/daily-rotate.js --run');
  console.log('Rotates the 5 oldest items from each category into the archive. Add --run to execute.');
  process.exit(0);
}

const CATS = ['discoveries', 'products', 'hidden-gems', 'future-radar', 'daily-tools'];

// Load existing archive (items keep their URLs forever for SEO)
const archiveFile = path.join(__dirname, '..', 'data', 'archive.json');
const archive = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
const archivedSlugs = new Set(archive.map(i => i.slug));

for (const cat of CATS) {
  const fp = path.join(__dirname, '..', 'data', `${cat}.json`);
  const items = JSON.parse(fs.readFileSync(fp, 'utf8'));
  // Items without dateAdded are treated as the oldest (epoch 0)
  items.sort((a, b) => {
    const da = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
    const db = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
    return da - db;
  });
  const rotated = items.splice(0, 5);
  // Move to archive instead of deleting — keeps /item/<slug> URLs alive for Google
  for (const item of rotated) {
    if (!archivedSlugs.has(item.slug)) {
      archive.push({ ...item, archivedAt: new Date().toISOString().slice(0, 10) });
      archivedSlugs.add(item.slug);
    }
  }
  console.log(`[${cat}] Archived: ${rotated.map(i => i.slug).join(', ')}`);
  writeJsonSafe(fp, items);
}

writeJsonSafe(archiveFile, archive);
console.log(`Archive now holds ${archive.length} items.`);

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
