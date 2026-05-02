#!/usr/bin/env node
/**
 * Notifies search engines that the sitemap has been updated.
 *
 * Google's /ping?sitemap= was permanently removed in Jan 2024. Google
 * no longer offers an automated HTTP endpoint — manual resubmission via
 * Google Search Console is the only supported mechanism.
 *
 * Bing (and Yandex, IndexNow-supporting crawlers) use IndexNow:
 *   https://www.indexnow.org/
 *
 * Usage:
 *   npm run seo:ping
 *   node scripts/ping-search-engines.mjs
 *
 * Exit codes:
 *   0 — IndexNow acknowledged
 *   1 — Fatal (network error, bad key)
 */

const SITE_URL = "https://surfaced-x.pages.dev";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

// IndexNow key — matches public/b1c01c6f1a2744c0a10ec8f6cc9bc40c.txt
const INDEXNOW_KEY = "b1c01c6f1a2744c0a10ec8f6cc9bc40c";
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

async function pingIndexNow() {
  const url = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(SITE_URL)}&key=${INDEXNOW_KEY}&keyLocation=${encodeURIComponent(KEY_LOCATION)}`;
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Surfaced-Sitemap-Pinger/1.0 (+https://surfaced-x.pages.dev)" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    const ok = res.status === 200 || res.status === 202;
    return { name: "Bing / IndexNow", status: res.status, ok, ms: Date.now() - t0, error: null };
  } catch (err) {
    return { name: "Bing / IndexNow", status: 0, ok: false, ms: Date.now() - t0, error: err.message };
  }
}

async function main() {
  console.log(`\n📡 Notifying search engines`);
  console.log(`   Sitemap : ${SITEMAP_URL}`);
  console.log(`   IndexNow: key ${INDEXNOW_KEY.slice(0, 8)}…\n`);

  const bing = await pingIndexNow();
  const tag = bing.ok ? "✅" : bing.error ? "❌" : "⚠ ";
  const detail = bing.error ? bing.error.slice(0, 80) : `HTTP ${bing.status}`;
  console.log(`  ${tag} ${bing.name.padEnd(18)} ${detail.padEnd(28)} (${bing.ms}ms)`);

  console.log();
  console.log(`  ℹ  Google: automated ping was removed Jan 2024. Resubmit manually:`);
  console.log(`     1. https://search.google.com/search-console/sitemaps`);
  console.log(`     2. Submit: ${SITEMAP_URL}`);
  console.log(`     3. Expect: Success within 1-2 min, full crawl in 24-48 hrs`);
  console.log();

  if (!bing.ok) {
    console.error(`❌ IndexNow failed. Check that ${KEY_LOCATION} is publicly accessible.`);
    process.exit(1);
  }
  console.log(`✅ IndexNow acknowledged — Bing + other IndexNow crawlers notified.`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
