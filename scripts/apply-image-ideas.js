/**
 * Apply hand-crafted imageIdea values to hidden-gems and daily-tools
 * that are missing them, then clear duplicate image cache entries.
 * 
 * Usage: node scripts/apply-image-ideas.js
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Concrete, photographable image search queries for each item
const imageIdeas = {
  // === Hidden Gems ===
  "rive": "interactive animation motion graphics colorful",
  "anytype": "interconnected notes graph knowledge base",
  "tana": "structured database tags organized",
  "reclaim-ai": "calendar scheduling time blocks",
  "espanso": "keyboard typing fast text shortcut",
  "capacities": "linked notes objects database",
  "hoppscotch": "api request response json browser",
  "httpie": "terminal command line http colorful",
  "railway": "cloud deployment server dashboard",
  "zed": "code editor pair programming collaboration",
  "devtoys": "developer utilities swiss army knife tools",
  "perplexity": "ai search engine answer citation",
  "elevenlabs": "voice waveform audio synthesis microphone",
  "phind": "developer coding search ai assistant",
  "tldraw-make-real": "whiteboard wireframe sketch drawing",
  "notebooklm": "research documents ai notebook highlights",
  "languagetool": "grammar spelling correction multilingual text",
  "ghost": "blog publishing platform newsletter",
  "bibguru": "academic citation bibliography reference books",
  "markdoc": "markdown documentation technical writing",
  "brilliant": "interactive math puzzle visual learning",
  "exercism": "programming exercises code mentoring",
  "scrimba": "interactive coding tutorial screencast",
  "explained-visually": "mathematical visualization interactive diagram",
  "roadmap-sh": "developer roadmap flowchart career path",
  "evidence": "business intelligence dashboard charts code",
  "datasette": "database explorer table data browser",
  "rawgraphs": "data visualization custom chart colorful",
  "quadratic": "spreadsheet python formula data grid",
  "observable": "interactive data notebook visualization",
  "cal-com": "calendar booking appointment scheduling",
  "zulip": "threaded chat conversation organized topics",
  "daily-dev": "developer news feed articles browser",
  "whereby": "video call browser meeting room",
  "funkwhale": "music streaming decentralized audio player",
  "stremio": "streaming media center movies popcorn",
  "descript": "video editing transcript waveform",
  "pocket-casts": "podcast player headphones episodes",
  "radiooooo": "vintage radio world map music globe",
  "maybe-finance": "personal finance dashboard wealth tracking",
  "actual-budget": "budget envelope categories expenses",
  "wise": "international money transfer currency exchange",
  "portfolio-visualizer": "investment portfolio charts allocation",
  "stockanalysis": "stock market chart candlestick analysis",
  "cryptpad": "encrypted collaborative document padlock",
  "have-i-been-pwned": "data breach email security alert",
  "insight-timer": "meditation timer singing bowl peaceful",
  "woebot": "mental health chatbot therapy conversation",
  "wger": "workout tracker exercise log fitness gym",
  "sleeptown": "sleep tracking bedtime building night",
  "lobsters": "tech news discussion forum upvote",
  "are-na": "visual bookmarks mood board research",
  "lemmy": "community forum discussion federated",
  "polywork": "professional portfolio creative collaboration",
  "meetup": "local event gathering community people",
  "spacedrive": "file manager cross platform organized folders",
  "cloudconvert": "file conversion format transform document",
  "syncthing": "file sync peer to peer devices",
  "filestash": "web file browser cloud storage",
  "send-tresorit": "encrypted file sharing secure transfer",
  "omni-calculator": "scientific calculator math formulas",
  "temp-mail": "temporary email disposable inbox",
  "tinyurl": "url shortener link clipboard",
  "carbon": "source code screenshot syntax highlight",
  "jqplay": "json data parser terminal query",
  "etsy-handmade-marketplace": "handmade crafts artisan marketplace",

  // === Daily Tools ===
  "google-fonts": "typography font specimens letterforms",
  "figma": "ui design mockup interface wireframe",
  "the-noun-project": "icon collection symbols black white",
  "remove-bg": "photo background removal transparent",
  "canva-design-platform": "graphic design template social media",
  "grammarly": "proofreading red underline text correction",
  "jasper": "ai content marketing blog writing",
  "substack": "newsletter email inbox subscription",
  "surfer-seo": "seo content optimization ranking",
  "obsidian": "markdown notes linked graph vault",
  "visual-studio-code": "code editor syntax highlighting extensions",
  "vercel": "web deployment serverless cloud preview",
  "postman": "api testing request response collection",
  "playwright": "browser automation testing selenium",
  "github-actions": "ci cd pipeline workflow automation",
  "ynab": "budget planning zero based money jars",
  "turbotax": "tax filing forms calculator refund",
  "wave": "invoice accounting small business receipt",
  "wealthfront": "robo advisor investment portfolio automated",
  "numbeo": "cost of living comparison city data",
  "strava": "running cycling gps fitness route map",
  "cronometer": "nutrition tracker food diary macro chart",
  "headspace": "meditation mindfulness breathing calm zen",
  "sleep-cycle": "sleep tracking alarm phases graph",
  "betterhelp": "online therapy counseling conversation",
  "duolingo": "language learning owl lesson gamified",
  "coursera": "online course lecture university diploma",
  "anki": "flashcard spaced repetition study cards",
  "codecademy": "interactive coding lesson terminal browser",
  "zotero": "reference manager citation library papers",
  "davinci-resolve": "video editing color grading timeline",
  "audacity": "audio waveform recording editing mixer",
  "photopea": "photo editing layers tools browser",
  "obs-studio": "live streaming screen recording broadcast",
  "riverside-fm": "podcast recording studio remote microphone",
  "hey-email": "email inbox organized screener",
  "zoom": "video conference call meeting grid",
  "loom": "screen recording video message async",
  "slack": "team chat channels messaging threads",
  "calendly": "meeting scheduling calendar availability",
  "mullvad-vpn": "vpn encrypted tunnel privacy shield",
  "bitwarden": "password manager vault encrypted logins",
  "veracrypt": "disk encryption volume secure padlock",
  "ublock-origin": "ad blocker browser clean webpage",
  "simplelogin": "email alias privacy forwarding",
  "buffer": "social media scheduler queue calendar",
  "sprout-social": "social analytics engagement dashboard",
  "canva": "social media template design post",
  "hashtagify": "hashtag research trending cloud",
  "later": "instagram visual planner grid preview",
  "claude": "ai assistant conversation thoughtful analysis",
  "midjourney": "ai generated artwork fantasy illustration",
  "github-copilot": "ai code suggestion autocomplete programming",
  "otter-ai": "meeting transcription notes ai recording",
  "elicit": "research paper search academic ai",
  "evernote-notes-organizer": "digital notebook clipping organized green",
  "notion-all-in-one-workspace": "workspace wiki database kanban board",
  "google-calendar-schedule-planner": "calendar events schedule planner colorful",
  "notion-workspace": "workspace wiki database kanban board",
  "shopify-ecommerce-platform": "online store ecommerce shopping cart",
  "shopify-pos-retail": "point of sale retail checkout terminal",
  "skillshare-learning": "creative class workshop project hands",
  "fiverr-freelance-marketplace": "freelancer gig marketplace creative services",
};

// Load data files
const gemsPath = path.join(dataDir, 'hidden-gems.json');
const toolsPath = path.join(dataDir, 'daily-tools.json');
const gems = JSON.parse(fs.readFileSync(gemsPath, 'utf8'));
const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));

// Apply to hidden-gems
let gemsUpdated = 0;
for (const gem of gems) {
  if (!gem.imageIdea && imageIdeas[gem.slug]) {
    gem.imageIdea = imageIdeas[gem.slug];
    gemsUpdated++;
  }
}
fs.writeFileSync(gemsPath, JSON.stringify(gems, null, 2));
console.log(`✅ Updated ${gemsUpdated} hidden gems with imageIdea`);

// Apply to daily-tools
let toolsUpdated = 0;
for (const tool of tools) {
  if (!tool.imageIdea && imageIdeas[tool.slug]) {
    tool.imageIdea = imageIdeas[tool.slug];
    toolsUpdated++;
  }
}
fs.writeFileSync(toolsPath, JSON.stringify(tools, null, 2));
console.log(`✅ Updated ${toolsUpdated} daily tools with imageIdea`);

// Check for any still missing
const gemsStillMissing = gems.filter(g => !g.imageIdea);
const toolsStillMissing = tools.filter(t => !t.imageIdea);
if (gemsStillMissing.length > 0) {
  console.log(`\n⚠️  ${gemsStillMissing.length} hidden gems still missing imageIdea:`);
  gemsStillMissing.forEach(g => console.log(`  - ${g.slug}`));
}
if (toolsStillMissing.length > 0) {
  console.log(`\n⚠️  ${toolsStillMissing.length} daily tools still missing imageIdea:`);
  toolsStillMissing.forEach(t => console.log(`  - ${t.slug}`));
}

// Clear duplicate image cache entries
const cachePath = path.join(dataDir, 'image-cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

const urlCounts = {};
for (const url of Object.values(cache)) {
  if (url) urlCounts[url] = (urlCounts[url] || 0) + 1;
}
const duplicateUrls = new Set(Object.keys(urlCounts).filter(url => urlCounts[url] > 1));

let cleared = 0;
for (const slug of Object.keys(cache)) {
  if (duplicateUrls.has(cache[slug])) {
    cache[slug] = '';
    cleared++;
  }
}
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
console.log(`\n✅ Cleared ${cleared} duplicate image cache entries for re-fetch`);

console.log('\nDone! These items will get fresh unique images on next fetch-images run.');
