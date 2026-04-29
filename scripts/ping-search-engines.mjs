#!/usr/bin/env node
/**
 * Ping search engines that the sitemap has been updated.
 *
 * Idempotent: each engine returns 200 / 4xx without state change. Safe to run
 * after every deploy (though the user may prefer manual usage post-major-update).
 *
 * Usage:
 *   npm run seo:ping
 *   node scripts/ping-search-engines.mjs
 *
 * Engines:
 *   - Google: still accepts /ping?sitemap=… (officially "deprecated" 2023 but
 *     the endpoint continues to respond and many SEO tools still use it).
 *   - Bing/IndexNow: the modern way. Bing also still accepts /ping?sitemap=…
 *
 * Exit codes:
 *   0 if all engines acknowledged (≥1 success suffices)
 *   1 only on a fatal local error (e.g. cannot resolve hostname)
 */

const SITE_URL = "https://surfaced-x.pages.dev";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

/** Each engine: { name, url, method } */
const ENGINES = [
  {
    name: "Google",
    url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
    method: "GET",
  },
  {
    name: "Bing",
    url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
    method: "GET",
  },
];

async function pingOne(engine) {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(engine.url, {
      method: engine.method,
      headers: { "User-Agent": "Surfaced-Sitemap-Pinger/1.0 (+https://surfaced-x.pages.dev)" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    const dt = Date.now() - t0;
    const ok = res.status >= 200 && res.status < 400;
    return { name: engine.name, status: res.status, ok, ms: dt, error: null };
  } catch (err) {
    return { name: engine.name, status: 0, ok: false, ms: Date.now() - t0, error: err.message };
  }
}

async function main() {
  console.log(`\n📡 Pinging search engines\n   Sitemap: ${SITEMAP_URL}\n`);
  const results = await Promise.all(ENGINES.map(pingOne));

  let acknowledged = 0;
  for (const r of results) {
    const tag = r.ok ? "✅" : r.error ? "❌" : "⚠ ";
    const detail = r.error ? r.error.slice(0, 80) : `HTTP ${r.status}`;
    console.log(`  ${tag} ${r.name.padEnd(8)} ${detail.padEnd(28)} (${r.ms}ms)`);
    if (r.ok) acknowledged++;
  }

  console.log();
  if (acknowledged === 0) {
    console.error(`❌ No engine acknowledged the sitemap (network issue?). Verify ${SITEMAP_URL} is publicly reachable.`);
    process.exit(1);
  }
  console.log(`✅ ${acknowledged} of ${results.length} engine(s) acknowledged.`);
  console.log(
    `\nReminder: Google's /ping is deprecated but still responds. The`,
    `\nrecommended modern flow is Search Console → Sitemaps → resubmit.`
  );
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
