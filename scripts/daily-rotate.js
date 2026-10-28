const fs = require('fs');
const path = require('path');
const { writeJsonSafe } = require('./lib/write-safe');

if (!process.argv.includes('--run')) {
  console.log('Usage: node scripts/daily-rotate.js --run');
  console.log('Rotates the oldest items from each category into the archive. Add --run to execute.');
  process.exit(0);
}

function envInt(name, fallback, min = 1) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`${name} must be an integer >= ${min}; received ${JSON.stringify(raw)}`);
  }
  return value;
}

// Pivoted 2026-05-19: only hidden-gems + daily-tools receive new content.
// The legacy verticals (discoveries, products, future-radar) are empty and
// fully archived — rotating them would be a no-op.
const CATS = ['hidden-gems', 'daily-tools'];
const ROTATE_PER_CATEGORY = envInt('DAILY_ROTATE_COUNT', 5);

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
  const rotated = items.splice(0, ROTATE_PER_CATEGORY);
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

console.log(`\nDone. ${CATS.length * ROTATE_PER_CATEGORY} items rotated to archive. Generation should add the same count back.`);
