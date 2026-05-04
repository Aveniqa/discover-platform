#!/usr/bin/env node
/**
 * Live AdSense readiness smoke audit.
 *
 * This intentionally checks only public, deterministic surfaces. Dashboard-only
 * state, such as AdSense review status or whether Privacy & messaging messages
 * are published, still has to be confirmed in AdSense.
 *
 * Usage:
 *   node scripts/audit-live-adsense.mjs
 *   node scripts/audit-live-adsense.mjs --base-url=https://example.com
 */

const DEFAULT_BASE_URL = "https://surfaced-x.pages.dev";
const PUBLISHER_ID = "pub-8054019783472830";
const ADS_TXT_LINE = `google.com, ${PUBLISHER_ID}, DIRECT, f08c47fec0942fa0`;
const CONTACT_EMAIL = "surfaced-x@protonmail.com";

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...value] = arg.slice(2).split("=");
      return [key, value.join("=")];
    })
);

const BASE_URL = (args.get("base-url") || DEFAULT_BASE_URL).replace(/\/$/, "");

const REQUIRED_CSP_TOKENS = [
  "pagead2.googlesyndication.com",
  "*.googlesyndication.com",
  "fundingchoicesmessages.google.com",
  "*.fundingchoicesmessages.google.com",
  "googleads.g.doubleclick.net",
];

const PAGE_CHECKS = [
  {
    path: "/privacy",
    label: "privacy policy",
    requiredText: [
      "Google AdSense",
      "Third-party vendors, including Google",
      "Google Ad Settings",
      "aboutads.info",
      "Privacy & Messaging",
      "New York, United States",
      CONTACT_EMAIL,
    ],
  },
  {
    path: "/terms",
    label: "terms",
    requiredText: ["State of New York", "United States", CONTACT_EMAIL],
  },
  {
    path: "/affiliate-disclosure",
    label: "affiliate disclosure",
    requiredText: [
      "affiliate links",
      "Amazon Services LLC Associates Program",
      "cover operating costs",
      CONTACT_EMAIL,
    ],
  },
  {
    path: "/contact",
    label: "contact",
    requiredText: ["Surfaced", CONTACT_EMAIL],
  },
];

function pass(message) {
  console.log(`  OK  ${message}`);
}

function fail(failures, message) {
  failures.push(message);
  console.log(`  ERR ${message}`);
}

async function fetchText(pathname, failures, { expectedStatus = 200 } = {}) {
  const url = `${BASE_URL}${pathname}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Surfaced-AdSense-Audit/1.0" },
    });
    const text = await res.text();
    if (res.status !== expectedStatus) {
      fail(failures, `${pathname} returned HTTP ${res.status}, expected ${expectedStatus}`);
    }
    return { res, text };
  } catch (err) {
    fail(failures, `${pathname} fetch failed: ${err.message}`);
    return { res: null, text: "" };
  } finally {
    clearTimeout(timer);
  }
}

function headerIncludes(res, headerName, requiredTokens, failures) {
  const value = res?.headers.get(headerName) || "";
  for (const token of requiredTokens) {
    if (!value.includes(token)) {
      fail(failures, `${headerName} missing ${token}`);
    }
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsRequiredText(html, snippet) {
  const escapedSnippet = snippet.replace(/&/g, "&amp;");
  return html.includes(snippet) || html.includes(escapedSnippet);
}

async function main() {
  const failures = [];
  console.log(`\nAdSense live audit: ${BASE_URL}\n`);

  const ads = await fetchText("/ads.txt", failures);
  if (ads.res?.ok) {
    const body = ads.text.trim();
    if (body === ADS_TXT_LINE) pass("ads.txt has the exact Google seller line");
    else fail(failures, `ads.txt body mismatch: ${JSON.stringify(body)}`);

    const type = ads.res.headers.get("content-type") || "";
    if (type.includes("text/plain")) pass("ads.txt is served as text/plain");
    else fail(failures, `ads.txt content-type is ${type || "missing"}`);
  }

  const robots = await fetchText("/robots.txt", failures);
  if (robots.res?.ok) {
    const sitemapPattern = new RegExp(`Sitemap:\\s*${escapeRegExp(BASE_URL)}/sitemap\\.xml`, "i");
    if (sitemapPattern.test(robots.text)) {
      pass("robots.txt advertises the sitemap");
    } else {
      fail(failures, "robots.txt does not advertise the expected sitemap");
    }
    if (/Disallow:\s*\/ads\.txt/i.test(robots.text) || /Disallow:\s*\/\s*$/im.test(robots.text)) {
      fail(failures, "robots.txt may block ads.txt or the whole site");
    } else {
      pass("robots.txt does not block ads.txt or site crawling");
    }
  }

  const sitemap = await fetchText("/sitemap.xml", failures);
  if (sitemap.res?.ok) {
    const locCount = (sitemap.text.match(/<loc>/g) || []).length;
    if (locCount >= 2500) pass(`sitemap exposes ${locCount} URLs`);
    else fail(failures, `sitemap only exposes ${locCount} URLs`);
    for (const path of ["/privacy", "/terms", "/affiliate-disclosure", "/contact"]) {
      if (sitemap.text.includes(`${BASE_URL}${path}`)) pass(`sitemap includes ${path}`);
      else fail(failures, `sitemap missing ${path}`);
    }
    if (sitemap.text.includes(`${BASE_URL}/saved`)) {
      fail(failures, "sitemap includes noindex utility page /saved");
    } else {
      pass("sitemap excludes noindex utility page /saved");
    }
  }

  for (const page of PAGE_CHECKS) {
    const { res, text } = await fetchText(page.path, failures);
    if (!res?.ok) continue;
    headerIncludes(res, "content-security-policy", REQUIRED_CSP_TOKENS, failures);
    for (const snippet of page.requiredText) {
      if (containsRequiredText(text, snippet)) pass(`${page.label} contains ${snippet}`);
      else fail(failures, `${page.label} missing ${snippet}`);
    }
  }

  if (failures.length > 0) {
    console.log(`\nLive audit failed: ${failures.length} issue(s)\n`);
    for (const failure of failures) console.log(`- ${failure}`);
    process.exit(1);
  }

  console.log("\nLive audit passed.\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
