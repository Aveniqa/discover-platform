#!/usr/bin/env node
/**
 * Captures real website screenshots for every live item with a websiteLink
 * (hidden gems + daily tools) and stores them as self-hosted WebP files in
 * public/screenshots/<slug>.webp.
 *
 * Why self-hosted: the previous approaches hotlinked third-party screenshot
 * APIs (Microlink: 50 req/day cap; WordPress mShots: now 403s). Both meant
 * visitors mostly saw gradient placeholders. Local files ship with the static
 * export on Cloudflare's CDN — zero runtime dependencies, zero rate limits.
 *
 * Output: ~800×500 WebP q72, ≈30–60 KB each.
 * Data: sets item.screenshotUrl = "/screenshots/<slug>.webp" on success and
 * removes stale third-party screenshotUrl values on items with no capture.
 *
 * Usage:
 *   node scripts/capture-screenshots.mjs             # capture missing only
 *   node scripts/capture-screenshots.mjs --force     # recapture everything
 *   node scripts/capture-screenshots.mjs --limit=25  # cap this run
 *
 * Failures are non-fatal: a site that blocks headless browsers or times out
 * simply keeps no screenshotUrl, and the UI falls back to the cached photo.
 */
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeJsonSafe } from "./lib/write-safe.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const SHOT_DIR = path.join(ROOT, "public", "screenshots");

const FORCE = process.argv.includes("--force");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Math.max(1, parseInt(limitArg.split("=")[1], 10) || 0) : Infinity;

const FILES = ["hidden-gems.json", "daily-tools.json"];
const CONCURRENCY = 6;
const NAV_TIMEOUT_MS = 20000;
const SETTLE_MS = 2500;

fs.mkdirSync(SHOT_DIR, { recursive: true });

function shotPath(slug) {
  return path.join(SHOT_DIR, `${slug}.webp`);
}

async function captureOne(browser, item) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  try {
    await page.goto(item.websiteLink, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
    // Let fonts/hero images/animations settle; dismissing nothing — cookie
    // banners are part of the honest screenshot.
    await page.waitForTimeout(SETTLE_MS);
    // A bot-check interstitial is worse than no screenshot — the UI would
    // proudly display "Verifying you are human" as the product image.
    const pageTitle = (await page.title().catch(() => "")).toLowerCase();
    const bodyStart = ((await page.textContent("body").catch(() => "")) || "").slice(0, 400).toLowerCase();
    const BOT_WALL = ["just a moment", "security verification", "attention required", "verify you are human", "checking your browser", "access denied", "cloudflare"];
    if (BOT_WALL.some((m) => pageTitle.includes(m) || bodyStart.includes(m))) {
      return { slug: item.slug, ok: false, error: `bot wall detected ("${pageTitle.slice(0, 60)}")` };
    }
    const png = await page.screenshot({ type: "png" });
    const webp = await sharp(png).resize(800, 500, { fit: "cover", position: "top" }).webp({ quality: 72 }).toBuffer();
    fs.writeFileSync(shotPath(item.slug), webp);
    return { slug: item.slug, ok: true, bytes: webp.length };
  } catch (err) {
    return { slug: item.slug, ok: false, error: String(err?.message || err).split("\n")[0].slice(0, 120) };
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  const datasets = FILES.map((f) => ({
    file: f,
    items: JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")),
  }));

  const queue = [];
  for (const { items } of datasets) {
    for (const item of items) {
      if (!item.websiteLink) continue;
      if (!FORCE && fs.existsSync(shotPath(item.slug))) continue;
      queue.push(item);
    }
  }
  const batch = queue.slice(0, LIMIT);
  console.log(`📸 ${batch.length} site(s) to capture (${queue.length} pending total, concurrency ${CONCURRENCY})`);

  let ok = 0;
  let failed = 0;
  if (batch.length > 0) {
    const browser = await chromium.launch({ args: ["--disable-gpu"] });
    let cursor = 0;
    const worker = async () => {
      while (cursor < batch.length) {
        const item = batch[cursor++];
        const res = await captureOne(browser, item);
        if (res.ok) {
          ok++;
          console.log(`  ✅ ${res.slug} (${Math.round(res.bytes / 1024)} KB)`);
        } else {
          failed++;
          console.log(`  ⚠ ${res.slug}: ${res.error}`);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    await browser.close();
  }

  // Sync screenshotUrl fields with what actually exists on disk.
  for (const { file, items } of datasets) {
    let dirty = 0;
    for (const item of items) {
      const local = `/screenshots/${item.slug}.webp`;
      if (fs.existsSync(shotPath(item.slug))) {
        if (item.screenshotUrl !== local) {
          item.screenshotUrl = local;
          dirty++;
        }
      } else if (item.screenshotUrl) {
        // No file on disk — whether it's a stale third-party URL
        // (Microlink/mShots) or a dangling local path whose capture was
        // later rejected (bot wall), remove it so the UI falls back to the
        // cached photo instead of requesting a 403/404.
        delete item.screenshotUrl;
        dirty++;
      }
    }
    if (dirty > 0) writeJsonSafe(path.join(DATA_DIR, file), items);
    console.log(`[${file}] ${dirty} screenshotUrl field(s) synced`);
  }

  console.log(`\nDone. captured=${ok} failed=${failed} remaining=${Math.max(0, queue.length - batch.length)}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
