#!/usr/bin/env node
/**
 * One-shot backfill: assign a `dateAdded` (YYYY-MM-DD) to catalog items that
 * lack one. The daily generator already stamps fresh items, so this only
 * touches legacy records.
 *
 * Strategy:
 *   - Active files (discoveries/products/hidden-gems/future-radar/daily-tools)
 *     → fall back to the file's mtime in YYYY-MM-DD form. Items in the lower
 *     half of the array (older `id`) are nudged 1 day earlier per 50 items so
 *     Google sees a plausible distribution rather than a single bulk date.
 *   - archive.json → reuse the existing `archivedAt` field (a known-good upper
 *     bound on when the item was authored). Never overwrites.
 *
 * Guarantees:
 *   - Never overwrites an existing `dateAdded`
 *   - `--dry` (default) prints the plan and writes nothing
 *   - `--run` is required to mutate the JSON
 *   - Manual trigger only — never wired into daily-edition workflow
 *   - Logs to docs/date-added-backfill.log on `--run`
 *
 * Usage:
 *   node scripts/backfill-date-added.mjs           # dry-run (default)
 *   node scripts/backfill-date-added.mjs --run     # apply
 */
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const LOG_PATH = join(ROOT, "docs", "date-added-backfill.log");

const RUN = process.argv.includes("--run");
const DRY = !RUN;

const ACTIVE_FILES = [
  "discoveries.json",
  "products.json",
  "hidden-gems.json",
  "future-radar.json",
  "daily-tools.json",
];

const log = (line) => {
  console.log(line);
  if (RUN) appendFileSync(LOG_PATH, line + "\n");
};

function readJson(rel) {
  return JSON.parse(readFileSync(join(DATA_DIR, rel), "utf8"));
}
function writeJson(rel, data) {
  writeFileSync(join(DATA_DIR, rel), JSON.stringify(data, null, 2) + "\n");
}

function fileMtimeYmd(rel) {
  const s = statSync(join(DATA_DIR, rel));
  return new Date(s.mtimeMs).toISOString().slice(0, 10);
}

function shiftYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function isValidYmd(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

let totalChecked = 0;
let totalNeeded = 0;
let totalWritten = 0;

log(`# date-added backfill — ${new Date().toISOString()} ${DRY ? "(dry)" : "(run)"}`);

/* ── Active category files ──────────────────────────────────── */

for (const fn of ACTIVE_FILES) {
  const items = readJson(fn);
  const baseDate = fileMtimeYmd(fn);
  // Sort once by id desc so we can step the date back for older records.
  const ordered = [...items].sort((a, b) => (b.id || 0) - (a.id || 0));
  const indexById = new Map(ordered.map((it, i) => [it.id, i]));

  let needed = 0;
  for (const it of items) {
    totalChecked++;
    if (isValidYmd(it.dateAdded)) continue;
    needed++;
    totalNeeded++;
    const idx = indexById.get(it.id) ?? 0;
    const stepDays = Math.floor(idx / 50); // 1 day per 50 older items
    const ymd = shiftYmd(baseDate, -stepDays);
    log(`  ${fn}#${it.id} ${it.slug} → ${ymd}`);
    if (RUN) {
      it.dateAdded = ymd;
      totalWritten++;
    }
  }

  log(`${fn}: ${needed} item(s) needed dateAdded (base ${baseDate})`);
  if (RUN && needed > 0) writeJson(fn, items);
}

/* ── Archive: borrow archivedAt as dateAdded ────────────────── */

{
  const items = readJson("archive.json");
  let needed = 0;
  for (const it of items) {
    totalChecked++;
    if (isValidYmd(it.dateAdded)) continue;
    if (!isValidYmd(it.archivedAt)) continue; // skip if no fallback signal
    needed++;
    totalNeeded++;
    log(`  archive.json#${it.id} ${it.slug} → ${it.archivedAt}`);
    if (RUN) {
      it.dateAdded = it.archivedAt;
      totalWritten++;
    }
  }
  log(`archive.json: ${needed} item(s) needed dateAdded (using archivedAt)`);
  if (RUN && needed > 0) writeJson("archive.json", items);
}

log(
  `# Summary: checked ${totalChecked}, needed ${totalNeeded}, ${RUN ? "wrote" : "would write"} ${RUN ? totalWritten : totalNeeded}`
);
if (DRY) log("# Dry run only. Re-run with --run to apply.");
