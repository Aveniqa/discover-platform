# Surfaced — SEO Maintenance Runbook

## Sitemap

Generated dynamically by `src/app/sitemap.ts` at build time.
- **Live:** https://surfaced-x.pages.dev/sitemap.xml
- **URLs:** ~2,699 (15 static + ~40 collections + all `/item/` pages)
- **lastmod:** `dateAdded` per item when available; otherwise the build date

---

## After a major update — reindex checklist

Run these steps after significant changes (design overhaul, bulk data refresh, new category).

### 1. Automated: notify Bing + IndexNow crawlers

```bash
npm run seo:ping
```

Calls the [IndexNow API](https://www.indexnow.org/) — accepted by Bing, Yandex, and other participating crawlers. Idempotent, safe to run anytime.

Key file: `public/b1c01c6f1a2744c0a10ec8f6cc9bc40c.txt`
Verification URL: https://surfaced-x.pages.dev/b1c01c6f1a2744c0a10ec8f6cc9bc40c.txt

### 2. Manual: Google Search Console sitemap resubmit

Google removed their automated ping endpoint in January 2024. Resubmit via the UI:

1. Open [Search Console → Sitemaps](https://search.google.com/search-console/sitemaps)
2. Enter: `https://surfaced-x.pages.dev/sitemap.xml`
3. Click **Submit**
4. Expected: "Success" status within 1–2 minutes; full re-crawl in 24–48 hours

---

## IndexNow key rotation

The IndexNow key is stored in two places:
- `scripts/ping-search-engines.mjs` — `INDEXNOW_KEY` constant
- `public/b1c01c6f1a2744c0a10ec8f6cc9bc40c.txt` — verification file

To rotate: generate a new hex key, update both files, redeploy, then run `npm run seo:ping`.

---

## robots.txt

`public/robots.txt` — currently allows all crawlers. Sitemap location declared there.

## Canonical + hreflang

All pages set `<link rel="canonical">` pointing to `https://surfaced-x.pages.dev{path}`.
No hreflang needed (English-only site).
