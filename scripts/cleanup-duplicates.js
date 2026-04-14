/**
 * Remove duplicate entries from all data files.
 * Keeps the FIRST occurrence (by index), removes later duplicates.
 * Also updates categories.json counts.
 *
 * Usage: node scripts/cleanup-duplicates.js
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

function deduplicate(filePath, nameField) {
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const seen = new Set();
  const kept = [];
  const removed = [];

  for (const item of items) {
    const name = item[nameField] || item.name || item.title;
    if (seen.has(name)) {
      removed.push({ slug: item.slug, name });
    } else {
      seen.add(name);
      kept.push(item);
    }
  }

  if (removed.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify(kept, null, 2));
    console.log(`${path.basename(filePath)}: removed ${removed.length} duplicates:`);
    removed.forEach(r => console.log(`  - ${r.slug} ("${r.name}")`));
  } else {
    console.log(`${path.basename(filePath)}: no duplicates`);
  }

  return { kept: kept.length, removed: removed.length };
}

console.log('=== Removing duplicates ===\n');

deduplicate(path.join(dataDir, 'discoveries.json'), 'title');
deduplicate(path.join(dataDir, 'products.json'), 'title');
deduplicate(path.join(dataDir, 'hidden-gems.json'), 'name');
deduplicate(path.join(dataDir, 'future-radar.json'), 'techName');
deduplicate(path.join(dataDir, 'daily-tools.json'), 'toolName');

// Update category counts
console.log('\n=== Updating category counts ===\n');
const catFile = path.join(dataDir, 'categories.json');
const cats = JSON.parse(fs.readFileSync(catFile, 'utf8'));
for (const cat of cats) {
  const dataFile = path.join(dataDir, `${cat.key}.json`);
  const items = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const oldCount = cat.count;
  cat.count = items.length;
  console.log(`${cat.key}: ${oldCount} → ${items.length}`);
}
fs.writeFileSync(catFile, JSON.stringify(cats, null, 2));

// Also clean up image-cache: remove entries for slugs that no longer exist
console.log('\n=== Cleaning orphaned image cache entries ===\n');
const cachePath = path.join(dataDir, 'image-cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const allSlugs = new Set();
const files = ['discoveries.json', 'products.json', 'hidden-gems.json', 'future-radar.json', 'daily-tools.json'];
for (const file of files) {
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  items.forEach(i => allSlugs.add(i.slug));
}

let orphaned = 0;
for (const slug of Object.keys(cache)) {
  if (!allSlugs.has(slug)) {
    delete cache[slug];
    orphaned++;
  }
}
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
console.log(`Removed ${orphaned} orphaned image cache entries`);

// Clean up collections and todays-picks to only reference existing slugs
console.log('\n=== Cleaning collections ===\n');
const collectionsPath = path.join(dataDir, 'collections.json');
const collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf8'));
let collectionsFixed = 0;
for (const col of collections) {
  if (col.items) {
    const before = col.items.length;
    col.items = col.items.filter(slug => allSlugs.has(slug));
    const removed = before - col.items.length;
    if (removed > 0) {
      console.log(`  ${col.name || col.title}: removed ${removed} orphaned items`);
      collectionsFixed += removed;
    }
  }
}
fs.writeFileSync(collectionsPath, JSON.stringify(collections, null, 2));
console.log(`Total orphaned collection items removed: ${collectionsFixed}`);

const picksPath = path.join(dataDir, 'todays-picks.json');
const picks = JSON.parse(fs.readFileSync(picksPath, 'utf8'));
const picksBefore = picks.length;
const validPicks = picks.filter(p => allSlugs.has(p.slug));
if (validPicks.length < picksBefore) {
  fs.writeFileSync(picksPath, JSON.stringify(validPicks, null, 2));
  console.log(`Removed ${picksBefore - validPicks.length} orphaned today's picks`);
} else {
  console.log('Today\'s picks: all valid');
}

console.log('\n✅ Cleanup complete!');
