#!/usr/bin/env node
/**
 * Build-time SEO validator. Runs after `next build` (via `postbuild`)
 * and inspects every HTML file in `out/` for the basics:
 *
 *   ❌ Errors (build-blocking)
 *     - missing <title>
 *     - missing <meta name="description">
 *     - missing <link rel="canonical">
 *     - canonical not absolute or wrong host
 *     - <h1> count != 1
 *     - any <script type="application/ld+json"> that fails JSON.parse
 *     - canonical "/" outside the homepage (sign of forgotten override)
 *
 *   ⚠ Warnings (non-blocking)
 *     - missing og:image / og:title / og:description / og:url
 *     - missing twitter:card
 *     - title length outside 10–70
 *     - description length outside 50–180
 *
 * Run:
 *   node scripts/validate-seo.mjs           (strict: errors fail with exit 1)
 *   node scripts/validate-seo.mjs --warn    (treat errors as warnings; never exits non-zero)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "out");
const HOST = "https://surfaced-x.pages.dev";
const STRICT = !process.argv.includes("--warn");

const TITLE_MIN = 10;
const TITLE_MAX = 70;
const DESC_MIN = 50;
const DESC_MAX = 200; // 180 ideal, but Google often shows 200 — be lenient

let totalErrors = 0;
let totalWarnings = 0;
const failedPages = [];

/* ─── helpers ────────────────────────────────────────────────────────── */

/** HTML files that aren't real pages and should be skipped by the validator. */
function shouldSkip(filename) {
  // Google Search Console / Bing / Pinterest etc. verification stubs
  if (/^google[a-f0-9]+\.html$/i.test(filename)) return true;
  if (/^BingSiteAuth\.xml\.html$/i.test(filename)) return true;
  if (/^pinterest-[a-f0-9]+\.html$/i.test(filename)) return true;
  return false;
}

function listHtmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (shouldSkip(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...listHtmlFiles(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function pathToRoute(file) {
  const rel = relative(OUT_DIR, file).split(sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"/index.html".length);
  return "/" + rel.replace(/\.html$/, "");
}

function meta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
    "i"
  );
  const m = html.match(re);
  return m ? (m[1] || m[2] || "") : null;
}

function canonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function title(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return m[1].trim().replace(/\s+/g, " ");
}

function h1Count(html) {
  // Strip <noscript>…</noscript> and HTML comments to avoid false positives.
  const cleaned = html
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const matches = cleaned.match(/<h1[\s>]/gi);
  return matches ? matches.length : 0;
}

function jsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[1]);
  return blocks;
}

/* ─── per-file checks ────────────────────────────────────────────────── */

function checkPage(file) {
  const html = readFileSync(file, "utf8");
  const route = pathToRoute(file);
  const errs = [];
  const warns = [];

  /* Title */
  const t = title(html);
  if (!t) errs.push("missing <title>");
  else if (t.length < TITLE_MIN) warns.push(`title length ${t.length} (under ${TITLE_MIN})`);
  else if (t.length > TITLE_MAX) {
    // If buildMetadata had a `seoTitle` ≤65, the rendered <title> would already
    // be ≤65 (modulo the " — Surfaced" suffix, ~12 chars). When it's still over,
    // the page either has no seoTitle or its seoTitle is itself too long.
    warns.push(`title length ${t.length} (target ≤${TITLE_MAX} — set seoTitle on the item)`);
  }

  /* Description */
  const desc = meta(html, "description");
  if (!desc) errs.push("missing meta description");
  else if (desc.length < DESC_MIN || desc.length > DESC_MAX)
    warns.push(`description length ${desc.length} (target ${DESC_MIN}–${DESC_MAX})`);

  /* Canonical */
  const can = canonical(html);
  if (!can) errs.push("missing canonical");
  else if (!can.startsWith(HOST))
    errs.push(`canonical not on ${HOST}: ${can}`);
  else if (can === `${HOST}/` && route !== "/")
    errs.push(`canonical points to "/" but route is ${route} (forgotten override?)`);

  /* H1 */
  const h1s = h1Count(html);
  // 404 page has its own pattern; allow 0 for /404.html and /not-found.html
  const allowZeroH1 = /\b(404|not-found)\.html$/.test(file);
  if (h1s === 0 && !allowZeroH1) errs.push("missing <h1>");
  else if (h1s > 1) errs.push(`${h1s} <h1> elements (must be 1)`);

  /* JSON-LD */
  for (const block of jsonLdBlocks(html)) {
    try {
      JSON.parse(block);
    } catch (e) {
      errs.push(`invalid JSON-LD: ${e.message.slice(0, 80)}`);
    }
  }

  /* OG / Twitter */
  if (!meta(html, "og:title")) warns.push("missing og:title");
  if (!meta(html, "og:description")) warns.push("missing og:description");
  if (!meta(html, "og:url")) warns.push("missing og:url");
  if (!meta(html, "og:image")) warns.push("missing og:image");
  if (!meta(html, "twitter:card")) warns.push("missing twitter:card");

  return { route, errs, warns };
}

/* ─── cross-page checks ──────────────────────────────────────────────── */

function checkSitemapVsPages(htmlFiles) {
  const sitemapPath = join(OUT_DIR, "sitemap.xml");
  let sitemapXml;
  try { sitemapXml = readFileSync(sitemapPath, "utf8"); }
  catch { return { errs: ["sitemap.xml not found in out/"], warns: [] }; }

  const sitemapUrls = new Set(
    Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1])
  );
  const pageRoutes = new Set(htmlFiles.map(pathToRoute));

  const errs = [];
  const warns = [];

  // Missing pages
  for (const u of sitemapUrls) {
    if (!u.startsWith(HOST)) continue;
    const path = u.slice(HOST.length) || "/";
    if (!pageRoutes.has(path)) {
      warns.push(`sitemap entry has no built page: ${path}`);
    }
  }
  return { errs, warns };
}

/* ─── main ───────────────────────────────────────────────────────────── */

function fmt(n) { return n.toLocaleString(); }

function main() {
  let files;
  try { files = listHtmlFiles(OUT_DIR); }
  catch {
    console.error("❌ out/ directory not found — run `next build` first.");
    process.exit(1);
  }

  console.log(`\n🔍 SEO validator — scanning ${fmt(files.length)} HTML files\n`);

  for (const f of files) {
    const { route, errs, warns } = checkPage(f);
    if (errs.length > 0) {
      console.log(`❌ ${route}`);
      for (const e of errs) console.log(`     ${e}`);
      failedPages.push(route);
      totalErrors += errs.length;
    }
    // Warnings — only print first 5 pages worth to avoid noise
    if (warns.length > 0 && totalWarnings < 30) {
      if (errs.length === 0) console.log(`⚠  ${route}`);
      for (const w of warns) console.log(`     ${w}`);
    }
    totalWarnings += warns.length;
  }

  // Cross-page checks
  console.log();
  const cross = checkSitemapVsPages(files);
  for (const e of cross.errs) {
    console.log(`❌ sitemap: ${e}`);
    totalErrors++;
  }
  // Truncate warnings about missing pages — there are usually a handful from
  // archive items that no longer have built HTML. Show a count summary instead.
  if (cross.warns.length > 0) {
    console.log(`⚠  sitemap: ${cross.warns.length} entries reference URLs without built HTML`);
    for (const w of cross.warns.slice(0, 5)) console.log(`     ${w}`);
    if (cross.warns.length > 5) console.log(`     … and ${cross.warns.length - 5} more`);
  }

  console.log();
  console.log(`──────────────────────────────────────────────────`);
  console.log(`  Pages scanned: ${fmt(files.length)}`);
  console.log(`  Errors:        ${fmt(totalErrors)} ${totalErrors === 0 ? "✅" : "(across " + fmt(failedPages.length) + " pages)"}`);
  console.log(`  Warnings:      ${fmt(totalWarnings)}`);
  console.log(`──────────────────────────────────────────────────`);

  if (totalErrors > 0 && STRICT) {
    console.log(`\n❌ SEO validation FAILED — fix errors above (or pass --warn to bypass).\n`);
    process.exit(1);
  }
  console.log(`\n✅ SEO validation passed${STRICT ? "" : " (warn mode)"}.\n`);
}

main();
