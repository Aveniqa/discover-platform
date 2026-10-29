#!/usr/bin/env node
/**
 * Attach verifiable outside signals to live items via Agent Reach:
 *   signals.github → stars / last push / licence / archived (github-hosted items)
 *   signals.video  → a YouTube walkthrough whose title names the item
 *
 * Rendered on /item/<slug> as "Project signals" and "See it in action".
 * Precision beats recall: a wrong video is worse than none, so a match must
 * name the item in its title and carry the brand (host or repo name).
 *
 * Non-fatal by design — without the CLI, or with a channel down, items keep
 * whatever signals they already had and the run exits 0.
 *
 * Usage:
 *   node scripts/enrich-signals.js                 # new + unchecked items, refresh 20 stale
 *   node scripts/enrich-signals.js --all           # backfill every unchecked live item
 *   node scripts/enrich-signals.js --refresh 50    # also re-check the 50 stalest (>30 days)
 *   node scripts/enrich-signals.js --recheck       # re-run every live item (after a matcher change)
 *   node scripts/enrich-signals.js --limit 10 --dry
 */
const fs = require("fs");
const path = require("path");
const { writeJsonSafe } = require("./lib/write-safe");
const {
  agentReachAvailable,
  githubRepoFromUrl,
  githubRepoStats,
  youtubeSearch,
  mapLimit,
} = require("./lib/agent-reach");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILES = [
  { file: "hidden-gems.json", nameField: "name" },
  { file: "daily-tools.json", nameField: "toolName" },
];
const RECENT_DAYS = 7;
const STALE_DAYS = 30;
const CONCURRENCY = 3;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const value = Number.parseInt(process.argv[i + 1], 10);
  return Number.isFinite(value) ? value : fallback;
}
const ALL = process.argv.includes("--all");
const RECHECK = process.argv.includes("--recheck"); // re-run every live item, e.g. after a matcher change
const RECHECK_VIDEOS = process.argv.includes("--recheck-videos"); // only items that have a video (after tightening)
const DRY = process.argv.includes("--dry");
const VERBOSE = process.argv.includes("--verbose") || DRY;
const REFRESH = arg("--refresh", 20);
const LIMIT = arg("--limit", Infinity);

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (date) => (Date.now() - new Date(date).getTime()) / 86400000;

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const squash = (value) => norm(value).replace(/ /g, "");
const hasPhrase = (haystack, needle) => ` ${norm(haystack)} `.includes(` ${norm(needle)} `);

/** "TitleArt – Make text like it's 1997" → "TitleArt" */
function shortName(name) {
  return String(name || "")
    .split(/\s+[–—|·-]\s+|:\s+|\s+\(/)[0]
    .trim();
}

/** The brand as it appears in a URL: repo name, or the host's main label. */
function brandToken(item) {
  const repo = githubRepoFromUrl(item.websiteLink);
  if (repo) return repo.split("/")[1];
  try {
    const labels = new URL(item.websiteLink).hostname.replace(/^(www|app|get|try|use)\./, "").split(".");
    return labels.length > 1 ? labels[labels.length - 2] : labels[0];
  } catch {
    return "";
  }
}

const SOFTWARE_CUE = /\b(app|apps|tool|tools|software|extension|plugin|tutorial|review|demo|walkthrough|open source|github|chrome|macos|windows|ios|android|linux|website|browser|ai|cli|api)\b/;

/**
 * The brand as one word ("PaletteInspiration") or the item's own domain.
 * "Colour Palette Inspiration For Artists" names the words, not the site.
 */
function mentionsBrand(haystack, item, brand) {
  const lower = haystack.toLowerCase();
  try {
    const host = new URL(item.websiteLink).hostname.replace(/^www\./, "");
    if (host !== "github.com" && lower.includes(host)) return true;
  } catch {
    /* fall through to the token check */
  }
  const target = squash(brand);
  return target.length >= 3 && lower.split(/[^a-z0-9]+/).includes(target);
}

// Words too generic to show a video is about the same thing as the item.
const FILLER = new Set(
  ("about also allows based been best built create designed each easy every features free from have help helps " +
    "into just like make many more most online only other over platform provides offers really simple some such " +
    "than that their them then these they this those tool tools users using very video what when where which " +
    "while will with your youre review tutorial guide software website apps " +
    // marketing filler that matched "Swiftlet" the LLM runtime to swiftlet bird farming
    "amazing better complete daily discover everyday great incredible latest modern people perfect power powered " +
    "powerful quick quickly smart technology technologies transform transforming ultimate unique world").split(" "),
);

/** Topic stems (first 5 letters of 4+ letter words), minus the item's own name. */
function topicStems(text, exclude) {
  const stems = new Set();
  for (const word of norm(text).split(" ")) {
    if (word.length < 4 || FILLER.has(word) || exclude.has(word)) continue;
    stems.add(word.slice(0, 5));
  }
  return stems;
}

// "GitHub Trending Weekly #46: latticedb, Gradient, buzz, …" names many things, explains none.
const ROUNDUP = /\b(trending|weekly|roundup|top \d+|\d+ (best|free|ai|open source) )|(,[^,]*){3,}/i;
const WALKTHROUGH = /\b(tutorial|walkthrough|getting started|how to|demo|introduction|intro to|crash course|first look|explained|overview|review)\b/i;

function pickVideo(item, name, results) {
  const brand = brandToken(item);
  const singleWord = !/\s/.test(name);
  const own = new Set([...norm(name).split(" "), norm(brand)]);
  const itemTopics = topicStems(`${item.whatItDoes} ${item.whyItIsUseful} ${item.category}`, own);
  const candidates = [];
  for (const video of results) {
    if (video.views === null || video.views < 1000) continue;
    if (video.durationSec !== null && (video.durationSec < 45 || video.durationSec > 45 * 60)) continue;
    if (!hasPhrase(video.title, name) || ROUNDUP.test(video.title)) continue;
    const haystack = `${video.title} ${video.text} ${video.channel}`;
    if (!mentionsBrand(haystack, item, brand)) continue;
    // A one-word name ("Anatomy", "Filee") also has to be talked about as software.
    if (singleWord && !SOFTWARE_CUE.test(norm(haystack))) continue;
    // Same subject, not just the same word: "Swiftlet" the LLM runtime vs swiftlet bird farming.
    const shared = [...topicStems(haystack, own)].filter((stem) => itemTopics.has(stem));
    if (shared.length < (singleWord ? 2 : 1)) continue;
    candidates.push({ video, score: shared.length + (WALKTHROUGH.test(video.title) ? 2 : 0) });
  }
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best) return null;
  const { video } = best;
  return {
    id: video.id,
    title: video.title.slice(0, 140),
    channel: video.channel.slice(0, 80),
    ...(video.durationSec ? { durationSec: video.durationSec } : {}),
  };
}

async function enrich(item, nameField) {
  const name = shortName(item[nameField]);
  const previous = item.signals || {};
  const signals = { checkedAt: today };

  const github = await githubRepoStats(item.websiteLink);
  if (github) signals.github = github;
  else if (previous.github) signals.github = previous.github;

  if (norm(name).length >= 3) {
    const brand = brandToken(item);
    const query = brand && !squash(name).includes(squash(brand)) ? `${name} ${brand}` : name;
    const results = await youtubeSearch(query, { limit: 6 });
    const video = pickVideo(item, name, results);
    if (video) signals.video = video;
    // No results at all usually means YouTube refused the call — keep the old pick.
    // Results with no acceptable match mean the old pick no longer passes: drop it.
    else if (!results.length && previous.video) signals.video = previous.video;
  }

  if (VERBOSE) {
    const gh = signals.github ? `★${signals.github.stars}${signals.github.archived ? " (archived)" : ""}` : "-";
    const vid = signals.video ? `"${signals.video.title}" — ${signals.video.channel}` : "-";
    console.log(`  ${item.slug}: github ${gh} | video ${vid}`);
  }
  return signals;
}

async function main() {
  if (!(await agentReachAvailable())) {
    console.log("Agent Reach CLI not available — skipping signal enrichment.");
    return;
  }

  const datasets = FILES.map(({ file, nameField }) => ({
    file,
    nameField,
    items: JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")),
  }));

  const unchecked = [];
  const stale = [];
  for (const ds of datasets) {
    for (const item of ds.items) {
      const checkedAt = item.signals && item.signals.checkedAt;
      const recent = item.dateAdded && daysAgo(item.dateAdded) <= RECENT_DAYS;
      if (RECHECK || (RECHECK_VIDEOS && item.signals?.video) || (!checkedAt && (ALL || recent))) unchecked.push({ ds, item });
      else if (checkedAt && daysAgo(checkedAt) > STALE_DAYS) stale.push({ ds, item });
    }
  }
  stale.sort((a, b) => a.item.signals.checkedAt.localeCompare(b.item.signals.checkedAt));
  const targets = [...unchecked, ...stale.slice(0, REFRESH)].slice(0, LIMIT);
  console.log(`Enriching ${targets.length} item(s): ${Math.min(unchecked.length, targets.length)} unchecked, rest stale refreshes.`);
  if (!targets.length) return;

  let done = 0;
  let withGithub = 0;
  let withVideo = 0;
  const save = () => {
    if (DRY) return;
    for (const ds of datasets) writeJsonSafe(path.join(DATA_DIR, ds.file), ds.items);
  };

  await mapLimit(targets, CONCURRENCY, async ({ ds, item }) => {
    item.signals = await enrich(item, ds.nameField);
    if (item.signals.github) withGithub++;
    if (item.signals.video) withVideo++;
    if (++done % 25 === 0) {
      save();
      console.log(`  …${done}/${targets.length}`);
    }
  });
  save();
  console.log(`Done: ${done} checked, ${withGithub} with GitHub stats, ${withVideo} with a video.${DRY ? " (dry run — nothing written)" : ""}`);
}

main().catch((err) => {
  // Enrichment is garnish: never fail the edition over it.
  console.error(`Signal enrichment failed: ${err.message}`);
});
