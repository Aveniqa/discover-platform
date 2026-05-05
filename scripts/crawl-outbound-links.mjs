#!/usr/bin/env node
/**
 * Crawls Surfaced pages from sitemap.xml, extracts outbound links, and writes
 * confirmed permanent failures to broken-links.txt.
 *
 * Bot-blocking, rate limits, and 5xx responses are treated as inconclusive
 * instead of broken. Amazon /dp/ pages get an extra body check because Amazon
 * can return HTTP 200 for a not-found product page.
 */
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const BASE_URL = args.get("--base") || "https://surfaced-x.pages.dev";
const SITEMAP_URL = args.get("--sitemap") || `${BASE_URL}/sitemap.xml`;
const OUT_PATH = args.get("--output") || "broken-links.txt";
const DEAD_LINKS_PATH =
  args.get("--dead-links-output") === "false"
    ? ""
    : args.get("--dead-links-output") || (args.has("--max-pages") ? "" : "data/dead-outbound-links.json");
const SHARED_CONCURRENCY = Number(args.get("--concurrency") || 0);
const PAGE_CONCURRENCY = Number(args.get("--page-concurrency") || SHARED_CONCURRENCY || 16);
const OUTBOUND_CONCURRENCY = Number(args.get("--outbound-concurrency") || SHARED_CONCURRENCY || 24);
const MAX_PAGES = Number(args.get("--max-pages") || 0);
const TIMEOUT_MS = Number(args.get("--timeout-ms") || 8_000);
const AMAZON_BODY_LIMIT = Number(args.get("--amazon-body-limit") || 900_000);
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Surfaced-LinkAudit/1.0)";

const base = new URL(BASE_URL);

function decodeHtml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalizeUrl(value, pageUrl) {
  try {
    const url = new URL(decodeHtml(value), pageUrl);
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function isPrivateIp(host) {
  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    const [a, b] = host.split(".").map(Number);
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
    const normalized = host.toLowerCase();
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

function isHttpUrl(url) {
  return url.protocol === "http:" || url.protocol === "https:";
}

function isSameOrigin(url) {
  return url.origin === base.origin;
}

function isAuditSafe(url) {
  const host = url.hostname.toLowerCase();
  if (!isHttpUrl(url)) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (net.isIP(host) && isPrivateIp(host)) return false;
  if (isShareIntentUrl(url)) return false;
  return true;
}

function isShareIntentUrl(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.toLowerCase();
  if (host === "facebook.com" && path.startsWith("/sharer")) return true;
  if ((host === "twitter.com" || host === "x.com") && path.startsWith("/intent/")) return true;
  if (host === "pinterest.com" && path.startsWith("/pin/create")) return true;
  if (host === "bsky.app" && path.startsWith("/intent/compose")) return true;
  return false;
}

function isAffiliateUrl(url) {
  const host = url.hostname.toLowerCase();
  return (
    url.searchParams.has("tag") ||
    url.searchParams.has("ascsubtag") ||
    host === "amazon.com" ||
    host.endsWith(".amazon.com")
  );
}

function isAmazonProductUrl(url) {
  const host = url.hostname.toLowerCase();
  return (host === "amazon.com" || host.endsWith(".amazon.com")) && /\/dp\/[A-Z0-9]{10}/i.test(url.pathname);
}

async function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(options.headers || {}),
      },
      ...options,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function discardBody(res) {
  try {
    await res.body?.cancel();
  } catch {
    // Best-effort cleanup; the link verdict should not depend on stream teardown.
  }
}

async function readTextLimit(res, limitBytes) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (bytes < limitBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    if (bytes >= limitBytes) await reader.cancel();
    return text;
  } finally {
    reader.releaseLock();
  }
}

async function mapLimit(items, limit, worker) {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

async function getSitemapPages() {
  const res = await fetchWithTimeout(SITEMAP_URL);
  if (!res.ok) throw new Error(`Could not fetch sitemap ${SITEMAP_URL}: HTTP ${res.status}`);
  const xml = await res.text();
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((match) => normalizeUrl(match[1], SITEMAP_URL))
    .filter((url) => url && isSameOrigin(url))
    .map((url) => url.toString());
  return [...new Set(urls)].slice(0, MAX_PAGES > 0 ? MAX_PAGES : undefined);
}

function extractLinks(html, pageUrl) {
  return Array.from(html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi))
    .map((match) => normalizeUrl(match[1], pageUrl))
    .filter((url) => url && isAuditSafe(url));
}

async function crawlPage(pageUrl) {
  try {
    const res = await fetchWithTimeout(pageUrl);
    if (!res.ok) return { pageUrl, links: [], status: res.status };
    const html = await res.text();
    return { pageUrl, links: extractLinks(html, pageUrl), status: res.status };
  } catch (error) {
    return { pageUrl, links: [], status: error.name === "AbortError" ? "timeout" : "fetch-error" };
  }
}

function hardFailure(status) {
  return status === 400 || status === 404 || status === 410 || status === 414 || status === 451;
}

function inconclusiveStatus(status) {
  return (
    status === 401 ||
    status === 403 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status === 999 ||
    status >= 500
  );
}

function shouldRetryWithGet(status) {
  return hardFailure(status) || status === 403 || status === 405 || status === 406;
}

function inconclusive(urlText, affiliate, status, sources, note = "inconclusive") {
  return { url: urlText, affiliate, ok: true, status, sources, note };
}

function ok(urlText, affiliate, status, sources) {
  return { url: urlText, affiliate, ok: true, status, sources };
}

function broken(urlText, affiliate, status, sources) {
  return { url: urlText, affiliate, ok: false, status, sources };
}

async function checkOutbound(urlText, sources) {
  const url = new URL(urlText);
  const affiliate = isAffiliateUrl(url);
  try {
    const head = await fetchWithTimeout(url, { method: "HEAD" });

    if (inconclusiveStatus(head.status) && !shouldRetryWithGet(head.status)) {
      return inconclusive(urlText, affiliate, head.status, sources);
    }

    if (shouldRetryWithGet(head.status) || isAmazonProductUrl(url)) {
      const get = await fetchWithTimeout(url, { method: "GET" });
      const status = head.status === get.status ? get.status : `${head.status} head, ${get.status} get`;

      if (inconclusiveStatus(get.status)) {
        await discardBody(get);
        return inconclusive(urlText, affiliate, status, sources);
      }

      if (hardFailure(get.status)) {
        await discardBody(get);
        if (isAmazonProductUrl(url) && !hardFailure(head.status)) {
          return inconclusive(urlText, affiliate, status, sources);
        }
        return broken(urlText, affiliate, status, sources);
      }

      if (isAmazonProductUrl(url)) {
        const text = await readTextLimit(get, AMAZON_BODY_LIMIT);
        if (/Looking for something\?|Page Not Found|dogsofamazon/i.test(text)) {
          return broken(urlText, affiliate, `${get.status} amazon-not-found`, sources);
        }
        return ok(urlText, affiliate, status, sources);
      }

      await discardBody(get);
      return ok(urlText, affiliate, status, sources);
    }

    return ok(urlText, affiliate, head.status, sources);
  } catch (error) {
    return inconclusive(
      urlText,
      affiliate,
      error.name === "AbortError" ? "timeout" : "fetch-error",
      sources,
    );
  }
}

function countByStatus(items) {
  const counts = new Map();
  for (const item of items) {
    const key = String(item.status);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

async function writeReport({ pages, crawled, outbound, checked, broken }) {
  const inconclusive = checked.filter((item) => item.note === "inconclusive");
  const pageIssues = crawled.filter((page) => page.status !== 200);
  const lines = [
    "# Surfaced Broken Link Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    `Page concurrency: ${PAGE_CONCURRENCY}`,
    `Outbound concurrency: ${OUTBOUND_CONCURRENCY}`,
    `Timeout: ${TIMEOUT_MS}ms`,
    "Failure policy: 401/403/429/5xx/timeouts/fetch errors are inconclusive, not broken.",
    `Pages from sitemap: ${pages.length}`,
    `Pages crawled: ${crawled.length}`,
    `Page fetch issues: ${pageIssues.length}`,
    `Unique outbound links checked: ${outbound.size}`,
    `Inconclusive links (not counted broken): ${inconclusive.length}`,
    `Confirmed broken links: ${broken.length}`,
    ...(DEAD_LINKS_PATH ? [`Dead-link suppression file: ${DEAD_LINKS_PATH}`] : []),
    "",
  ];

  if (inconclusive.length > 0) {
    lines.push("## Inconclusive Status Summary", "");
    for (const [status, count] of countByStatus(inconclusive)) {
      lines.push(`- ${status}: ${count}`);
    }
    lines.push("");
  }

  if (broken.length === 0) {
    lines.push("No confirmed broken outbound links found.");
  } else {
    lines.push("## Confirmed Broken Links", "");
    for (const item of broken) {
      lines.push(`- ${item.status} ${item.affiliate ? "[affiliate]" : "[source]"} ${item.url}`);
      for (const source of item.sources.slice(0, 5)) lines.push(`  source: ${source}`);
    }
  }

  await fs.writeFile(OUT_PATH, `${lines.join("\n")}\n`);
}

async function writeDeadLinks(broken) {
  if (!DEAD_LINKS_PATH) return;
  const urls = [...new Set(broken.map((item) => item.url))].sort();
  await fs.mkdir(path.dirname(DEAD_LINKS_PATH), { recursive: true });
  await fs.writeFile(DEAD_LINKS_PATH, `${JSON.stringify(urls, null, 2)}\n`);
}

async function main() {
  console.log(`Crawling outbound links from ${SITEMAP_URL}`);
  console.log(`Page concurrency: ${PAGE_CONCURRENCY}; outbound concurrency: ${OUTBOUND_CONCURRENCY}; timeout: ${TIMEOUT_MS}ms`);
  const pages = await getSitemapPages();
  console.log(`Pages queued: ${pages.length}`);

  const crawled = await mapLimit(pages, PAGE_CONCURRENCY, crawlPage);
  const outbound = new Map();
  for (const page of crawled) {
    for (const link of page.links) {
      if (isSameOrigin(link)) continue;
      const key = link.toString();
      if (!outbound.has(key)) outbound.set(key, new Set());
      outbound.get(key).add(page.pageUrl);
    }
  }

  console.log(`Unique outbound links: ${outbound.size}`);
  let checkedCount = 0;
  const outboundEntries = Array.from(outbound.entries());
  const checked = await mapLimit(
    outboundEntries,
    OUTBOUND_CONCURRENCY,
    async ([url, sources]) => {
      const result = await checkOutbound(url, Array.from(sources));
      checkedCount++;
      if (checkedCount % 500 === 0 || checkedCount === outboundEntries.length) {
        console.log(`Checked ${checkedCount}/${outboundEntries.length} outbound links`);
      }
      return result;
    },
  );
  const broken = checked.filter((item) => !item.ok);
  await writeDeadLinks(broken);
  await writeReport({ pages, crawled, outbound, checked, broken });

  console.log(`Inconclusive links: ${checked.filter((item) => item.note === "inconclusive").length}`);
  console.log(`Confirmed broken links: ${broken.length}`);
  console.log(`Report: ${OUT_PATH}`);
  if (DEAD_LINKS_PATH) console.log(`Dead-link suppression file: ${DEAD_LINKS_PATH}`);
  if (broken.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
