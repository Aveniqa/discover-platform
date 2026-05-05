/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Validates all outbound URLs in data files and removes broken ones.
 *
 * A URL is considered "broken" only if the server responds 404/410 or similar
 * permanent-not-found codes. Codes like 403/405/429/5xx are treated as "alive"
 * — 5xx are transient server errors (Amazon frequently returns 503 for bot
 * traffic) and must never trigger URL deletion.
 *
 * Usage:
 *   node scripts/validate-urls.js               # check all items
 *   node scripts/validate-urls.js --recent      # only items added in last 7 days
 *   node scripts/validate-urls.js --dry-run     # report without modifying files
 *
 * Effect: removes the sourceLink/websiteLink field from any item whose URL
 * is truly broken. Items stay in the data (content is still valuable),
 * but the CTA/Source block won't render.
 */
const fs = require("fs");
const dns = require("dns").promises;
const net = require("net");
const path = require("path");
const { writeJsonSafe } = require("./lib/write-safe");

const DATA_DIR = path.join(__dirname, "..", "data");

const FILES = {
  discoveries: "sourceLink",
  products: "sourceLink",
  "hidden-gems": "websiteLink",
  "future-radar": "sourceLink",
  "daily-tools": "websiteLink",
};

const RECENT_DAYS = 7;
const CONCURRENCY = 10;
const TIMEOUT_MS = 10000;

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const isRecent = args.has("--recent");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function isPrivateIp(address) {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (ipVersion === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return false;
}

function parsePublicHttpsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:") return { ok: false, reason: "non-https-url" };
  if (url.username || url.password) return { ok: false, reason: "credentialed-url" };
  if (host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal") {
    return { ok: false, reason: "reserved-host" };
  }
  if (net.isIP(host) && isPrivateIp(host)) return { ok: false, reason: "private-ip" };

  return { ok: true, url };
}

async function assertPublicDestination(value) {
  const parsed = parsePublicHttpsUrl(value);
  if (!parsed.ok) return parsed;

  try {
    const addresses = await dns.lookup(parsed.url.hostname, { all: true, verbatim: true });
    if (addresses.some(({ address }) => isPrivateIp(address))) {
      return { ok: false, reason: "private-dns" };
    }
  } catch {
    // DNS failures are handled by fetch below as inconclusive network failures.
  }

  return parsed;
}

async function checkUrl(url) {
  try {
    let currentUrl = url;
    let safety = await assertPublicDestination(currentUrl);
    if (!safety.ok) return { ok: false, status: safety.reason };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    for (let redirects = 0; redirects <= 5; redirects++) {
      res = await fetch(currentUrl, {
        method: "GET",
        signal: ctrl.signal,
        redirect: "manual",
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (![301, 302, 303, 307, 308].includes(res.status)) break;
      const location = res.headers.get("location");
      if (!location) break;
      currentUrl = new URL(location, currentUrl).toString();
      safety = await assertPublicDestination(currentUrl);
      if (!safety.ok) {
        clearTimeout(timer);
        return { ok: false, status: `redirect-${safety.reason}` };
      }
    }
    clearTimeout(timer);

    if (!res) return { ok: true, status: "fetch-error" };
    if ([301, 302, 303, 307, 308].includes(res.status)) return { ok: true, status: "redirect-loop" };
    // 200-399: definitely ok
    if (res.status < 400) return { ok: true, status: res.status };
    // 401/403/405/429: site blocks bots but the page exists
    if ([401, 403, 405, 429].includes(res.status)) return { ok: true, status: res.status };
    // 5xx: transient server errors (Amazon commonly returns 503 for bot traffic).
    // Never treat these as broken — the resource almost certainly still exists.
    if (res.status >= 500) return { ok: true, status: res.status };
    // 404 / 410 and other 4xx: genuinely gone
    return { ok: false, status: res.status };
  } catch (e) {
    // Network failures are inconclusive, not proof that a URL is gone. The
    // daily workflow may run during DNS, TLS, bot-blocking, or transient origin
    // failures; deleting sources in that case weakens content trust signals.
    return { ok: true, status: e.name === "AbortError" ? "timeout" : "fetch-error" };
  }
}

function isRecentItem(item) {
  if (!item.dateAdded) return false;
  const added = new Date(item.dateAdded);
  const cutoff = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  return added >= cutoff;
}

async function main() {
  console.log(
    `\n🔍 URL validation${isRecent ? " (recent items only)" : ""}${isDryRun ? " [DRY RUN]" : ""}\n`
  );

  const allBroken = [];
  let totalRemoved = 0;

  for (const [category, urlField] of Object.entries(FILES)) {
    const fp = path.join(DATA_DIR, `${category}.json`);
    if (!fs.existsSync(fp)) continue;
    const items = JSON.parse(fs.readFileSync(fp, "utf8"));

    const candidates = items.filter(
      (i) => i[urlField] && (!isRecent || isRecentItem(i))
    );
    if (candidates.length === 0) {
      console.log(`[${category}] no URLs to check`);
      continue;
    }

    process.stdout.write(`[${category}] checking ${candidates.length} URLs...`);

    // Batched parallel requests
    const results = [];
    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
      const batch = candidates.slice(i, i + CONCURRENCY);
      const r = await Promise.all(
        batch.map(async (item) => {
          const res = await checkUrl(item[urlField]);
          return { slug: item.slug, url: item[urlField], ...res };
        })
      );
      results.push(...r);
    }

    const broken = results.filter((r) => !r.ok);
    console.log(` ${results.length - broken.length} ok, ${broken.length} broken`);
    broken.forEach((b) =>
      console.log(`   ❌ ${b.status} | ${b.slug} → ${b.url.slice(0, 80)}`)
    );
    allBroken.push(...broken.map((b) => ({ ...b, category, urlField })));

    if (broken.length > 0 && !isDryRun) {
      const brokenSlugs = new Set(broken.map((b) => b.slug));
      for (const item of items) {
        if (brokenSlugs.has(item.slug) && item[urlField]) {
          delete item[urlField];
          totalRemoved++;
        }
      }
      writeJsonSafe(fp, items);
    }
  }

  // Soft warning for low-quality sources (never blocks, never removes URLs)
  const LOW_QUALITY_DOMAINS = ["wikipedia.org", "wikihow.com"];
  let wikiCount = 0;
  for (const [category, urlField] of Object.entries(FILES)) {
    const fp = path.join(DATA_DIR, `${category}.json`);
    if (!fs.existsSync(fp)) continue;
    const items = JSON.parse(fs.readFileSync(fp, "utf8"));
    for (const item of items) {
      const url = item[urlField] || "";
      if (LOW_QUALITY_DOMAINS.some((d) => url.includes(d))) {
        wikiCount++;
      }
    }
  }
  if (wikiCount > 0) {
    console.log(`\n⚠️  LOW-QUALITY SOURCE WARNING: ${wikiCount} item(s) still link to wikipedia.org or wikihow.com.`);
    console.log("   Run: node scripts/retrofit-sources.mjs --dry  (then --run to replace)");
  }

  console.log("\n─────────");
  console.log(`Total broken URLs: ${allBroken.length}`);
  if (isDryRun) {
    console.log("(Dry run — no files modified. Re-run without --dry-run to clean.)");
  } else {
    console.log(`Removed ${totalRemoved} broken URL field(s) from data files.`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
