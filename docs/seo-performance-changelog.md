# SEO + Performance Pass — Changelog

**Date:** 2026-04-29
**Build verified:** 2,665 HTML pages, validator 0 errors
**Companion:** [`seo-performance-audit.md`](./seo-performance-audit.md)

---

## Follow-up pass — 2026-04-29 (post-92c123f redesign + UX)

**Build verified:** 2,685 HTML pages, validator 0 errors, 237 warnings (all
pre-existing title-length on long editorial titles — see "Skipped" below).

### Phases shipped

| Commit | Phase | Summary |
|---|---|---|
| `a38fddb` | P1 | `src/lib/stats.ts` as the single source of truth for site counts. `categories.count` now derived live from data files (was drifting from `categories.json`). `scripts/backfill-date-added.mjs` (manual-trigger only, `--dry` default). |
| `b412148` | P2 | Listing routes (5 category indexes, /collections/[slug], homepage carousels + editorial picks) ship a ≤160-char word-boundary excerpt instead of the full body. /item/<slug> still renders the full description. New `getItemExcerpt(item, max)` in `lib/data`. |
| `cfcd3e6` | P3 | Homepage redesign: editorial cover hero with date eyebrow + single primary CTA + secondary search; drops the inline newsletter and 3-stat row. Removes the redundant "Today's Picks" 5-card grid (the editorial "What Surfaced Today" — now `id="today"` — becomes the canonical daily cover, 1 lead + 3 supporting). Drops one of the two duplicated marquee strips. |
| `7c0c3bd` | P4 | Listing pages: first card per page now spans 2 cols on sm/lg/xl — feature-card rhythm without changing the card component. |
| `0addbf2` | P5 | Item detail rails dedupe: was 3 overlapping sections (More Like This, Explore Related, You Might Also Like). Now 2 distinct rails — "Related" (6 items, cross-category) + "More from {Category}" (6 items, same-type) — with descriptive `aria-label`s on each card anchor. |
| `811be94` | P6 | Footer: 4 → 8 items per category column + new "Recently Archived" column linking the 5 most-recently-archived /item/<slug> URLs (preserved for SEO, were drifting toward orphaned-but-indexed). Listing-page card anchors get `aria-label="Read {title}"`. |
| `40002cd` | P7 | Newsletter dedupe: homepage was rendering 4 forms (today, mid-page inline, big bottom CTA, footer) → now 2 (today's edition inline + footer). `NewsletterForm` takes `formId` + `ariaLabel` so each surface gets unique `<form id>`, `<input id>`, `<label for>`, accessible name. Buttondown action URL preserved. |
| `0a07986` | P8 | `src/lib/analytics.ts` — Tinybird events with no-op fallback when env missing or DNT enabled. Events: `page_view`, `bookmark_toggle`, `surprise_me_click`, `newsletter_submit`, `quick_view_open`, `outbound_click {host, kind: amazon\|bestbuy\|source\|other}`. Outbound clicks delegated through Analytics.tsx — no per-element wiring. README documents env vars. |
| `c8ab29b` | P9 | Streak milestones rebalanced to 7/30/100 (was 3/7/14/30). Streak badge gains role + aria-label. /saved empty state offers 3 of today's editorial picks as jumping-off points. Surprise Me scopes to current category route (from /trending → product, from /discover → discovery, etc.) and falls back to the full catalog elsewhere. |

### Files added in this pass

| Path | Purpose |
|---|---|
| `src/lib/stats.ts` | `getSiteStats()` — total/per-category/archive counts derived live |
| `src/lib/analytics.ts` | `track()` / `trackPageView()` / `classifyOutbound()` |
| `scripts/backfill-date-added.mjs` | Manual-trigger backfill of missing `dateAdded` fields |

### Verification

```bash
npm run build        # 2,685 pages, validator 0 errors
npm run validate:seo # strict mode — 0 errors, 237 warnings
```

Spot-checks via the local static server: /, /discover, /trending,
/collections, /saved, /newsletter, /item/<sample> — all 200 OK, no
console errors.

### Skipped / deferred

| Skipped | Reason |
|---|---|
| Bento variant on /categories index page | Only 5 cards — breaking the rhythm there is more risky than valuable. Kept the existing 3-col grid. |
| Hero image enlarge on /item/<slug> | Already 16:7 full-bleed — visually larger would mean cropping or distortion. Left alone. |
| 237 long-title validator warnings | Same as previous pass — content-side, addressed by `seoTitle` backfill (manual trigger). |
| Plausible / Tinybird co-existence | Both ship; Plausible only renders when its env var is set, Tinybird only fires when its env vars are set, so they don't conflict. |
| `npx lhci autorun` | Not executed in this pass; lighthouserc.json is unchanged so previous run's targets still apply. |

### Manual triggers still available

```bash
# Backfill missing `dateAdded` fields (preview, then apply)
node scripts/backfill-date-added.mjs           # dry-run
node scripts/backfill-date-added.mjs --run     # apply

# Backfill `seoTitle` for long-titled items (existing script)
GEMINI_API_KEY=xxx node scripts/backfill-seo-titles.mjs --dry
```

---

## Files added

| Path | Purpose |
|---|---|
| `src/lib/seo.ts` | Shared metadata builder (`buildMetadata`), absolute URL helper, build-date bucketer. All page metadata now flows through this. |
| `src/lib/jsonld.ts` | Shared JSON-LD builders: `articleLd`, `productLd`, `breadcrumbLd`, `itemListLd`, `collectionPageLd`, `organizationLd`, `websiteLd`. Each helper omits unknown fields rather than emitting `undefined` (Google validator-clean). |
| `scripts/validate-seo.mjs` | Post-build validator. Walks `out/`, checks every HTML page for required SEO surface (`<title>`, description, canonical, single H1, valid JSON-LD) plus warnings (OG/Twitter coverage, length targets). Cross-checks sitemap entries against built HTML. |
| `docs/seo-performance-audit.md` | Audit document. |
| `docs/seo-performance-changelog.md` | This file. |

## Files modified

### Metadata & JSON-LD

| File | Change |
|---|---|
| `src/app/layout.tsx` | Switched WebSite + new Organization JSON-LD into shared helpers. Added explicit `og:url`, `og:image` defaults, Twitter `site`, and absolute-URL `metadataBase`. |
| `src/app/item/[slug]/page.tsx` | Migrated to `buildMetadata` + `articleLd`/`productLd`/`breadcrumbLd`. Critical fix: **`dateModified` no longer churns per build** — uses `dateAdded` if available, else the bucketed build date. Brand extractor moved to `lib/jsonld` with a 30-prefix known-brand list. `AggregateOffer` now omitted when no parseable price (was emitting `lowPrice: undefined`). |
| `src/app/sitemap.ts` | `lastModified` now uses build-date bucket instead of `new Date()` per entry — stops the per-build URL churn that diluted Google's freshness signal. |
| `src/app/discover/layout.tsx` | Dynamic count from `discoveries.length` (was hardcoded "120+"; actual is **500**). |
| `src/app/trending/layout.tsx` | Dynamic count + dynamic year (was "135 / 2026"; actual is **490**). |
| `src/app/hidden-gems/layout.tsx` | Dynamic count (was "134"; actual is **490**). |
| `src/app/future-radar/layout.tsx` | Dynamic count (was "110"; actual is **500**). |
| `src/app/tools/layout.tsx` | Dynamic count (was "114"; actual is **487**). |
| `src/app/categories/page.tsx` | Migrated to `buildMetadata` (added Twitter card). |
| `src/app/collections/page.tsx` | Added `ItemList` JSON-LD listing all collections. Migrated to `buildMetadata`. |
| `src/app/collections/[slug]/page.tsx` | Added `CollectionPage` JSON-LD with `mainEntity` ItemList of all items, plus `BreadcrumbList`. Migrated to `buildMetadata`. |
| `src/app/about/page.tsx` | **Added missing canonical** (was inheriting `/`). |
| `src/app/newsletter/page.tsx` | **Added missing canonical**. |
| `src/app/premium/page.tsx` | **Added missing canonical**. |
| `src/app/privacy/page.tsx` | **Added missing canonical**. |
| `src/app/terms/page.tsx` | **Added missing canonical**. |
| `src/app/affiliate-disclosure/page.tsx` | **Added missing canonical**. |
| `src/app/contact/layout.tsx` | **Added missing canonical**. |
| `src/app/page.tsx` | Added `ItemList` JSON-LD for "Today's Picks" — surfaces the homepage's featured items as a navigable schema entity. |

### Outbound link hygiene

| File | Change |
|---|---|
| `src/app/item/[slug]/page.tsx` | All Amazon outbound URLs now get `rel="sponsored noopener nofollow"` even when `affiliate.enabled` is unset on the item — Google affiliate-disclosure best practice + Amazon Associates ToS compliance. Disclosure block now also fires for items with bare `directAmazonUrl`. |

### Performance

| File | Change |
|---|---|
| `src/lib/images.ts` | Added `getItemImageSrcSet(slug)` that derives multi-resolution variants from a single cached URL via Pexels/Unsplash query-param sizing (no new fetches needed). |
| `src/components/ui/ItemImage.tsx` | Now emits `srcSet` + `sizes` for non-OG sizes. Mobile devices download a 400w variant instead of the desktop 940w — smaller images, faster LCP, less bandwidth. |

### Headers / CSP

| File | Change |
|---|---|
| `public/_headers` | Removed dead `report-uri /api/csp-report` + `Report-To` directives (no API routes on static export). Removed dead `/og-image.png` cache rule (file doesn't exist). Expanded CSP to allow Pixabay, Wikimedia (added in audit pass), AdSense frames, and YouTube nocookie embeds (already used on product pages, was implicitly blocked). |

### Build pipeline

| File | Change |
|---|---|
| `package.json` | Added `postbuild` script running `validate-seo.mjs --warn` (non-blocking) and `validate:seo` script for strict CI usage. |
| `lighthouserc.json` | Expanded from 1 URL → 8 URLs (home, 5 category roots, /collections, /categories). Tightened `categories:seo` minimum from 0.85 → 0.95. Added explicit assertions for `meta-description`, `document-title`, `canonical`, `is-crawlable`. |

---

## Verified after build

| Check | Result |
|---|---|
| `npm run build` | 2,666 pages compiled, 0 errors |
| RSS prebuild (`scripts/generate-rss.mjs`) | 50-item feed at `out/feed.xml` (59 KB) |
| Sitemap | `out/sitemap.xml` — 2,662 entries |
| Robots | `out/robots.txt` — sitemap reference present |
| `npm run validate:seo` strict | **0 errors**, 503 warnings (all title-length on long content) |
| Category page canonical | `https://surfaced-x.pages.dev/discover` ✓ (was `/`) |
| `/about` canonical | Now self-canonical ✓ (was inheriting `/`) |
| Discovery item Article schema | `dateModified: "2026-04-13"` (item dateAdded) ✓ — not today's date |
| Product item CTA | `rel="sponsored noopener nofollow"` ✓ |
| Collection page schema | `CollectionPage` + `BreadcrumbList` both emit ✓ |
| Trending description | `"490 curated products …"` ✓ (was hardcoded 135) |

---

## Skipped (and why)

| Skipped item | Reason |
|---|---|
| Convert homepage / category pages from `"use client"` → server component | Large refactor; would split each page into server-shell + client-island. CLAUDE.md says "Do NOT modify components, CSS, templates" — and a client→server flip is structural enough to count. Documented as P2 in the audit. |
| Throttle homepage `mousemove` handlers | Same risk class — touches behaviour of TiltCard / SpotlightCard and the hero. Documented as P2. |
| Fix item titles >70 chars (503 validator warnings) | These are **content-side** — long, descriptive titles like "Acoustic metamaterial absorbs 94 percent of sound waves with thin metasurface" are intentional editorial choices. A future enrichment script could shorten titles for the `<title>` tag while keeping the long version on-page. |
| Add `Organization.sameAs` social profile URLs | Filled in with Twitter, Bluesky, Pinterest URLs from the existing footer/social CTA. Verify these are still the canonical handles before next deploy. |
| Bundle-size budget assertion in CI | Out of scope for this pass; documented as P2. |
| Stale 67 missing source links + 22 missing images | Tracked separately; will keep getting retried by the daily automation pipeline. |

---

## Manual Cloudflare steps (after deploy)

None required for this pass. All changes ship as part of the static export.

If the user later wants CSP violation reporting:
1. Spin up a Cloudflare Worker at `api.surfaced.com/csp-report`
2. Add the `report-uri` and `Report-To` directives back to `public/_headers`

---

## Local verify commands

```bash
# Full pipeline (RSS → build → SEO validator runs automatically as postbuild)
npm run build

# SEO validator standalone (strict mode — fails CI on errors)
npm run validate:seo

# Lighthouse against an 8-URL set (requires `npx lhci autorun`)
npx lhci autorun

# Inspect a specific item's structured data
grep "application/ld+json" out/item/<slug>.html

# Verify a page's canonical
grep -oE 'rel="canonical" href="[^"]*"' out/<route>.html
```

---

## 2026-04-30 — post-redesign chore pass

| SHA | Change |
|---|---|
| `602c02b` | `.gitignore`: PDFs, `.claude/`, `docs/*-backfill.log`, `docs/design-refs/`. |
| `2f12054` | `dateAdded` backfill: 174 legacy items now carry a stable `YYYY-MM-DD` (12 in products.json from file mtime, 162 in archive.json reusing each item's `archivedAt`). Sitemap + Article schema `datePublished`/`dateModified` are now load-bearing across the full catalogue. Build: 2,702 pages, 0 errors. |

Manual trigger: `node scripts/backfill-date-added.mjs --run`. Default
(no flag) is dry-run. Audit log written to `docs/date-added-backfill.log`
(gitignored).

### Known issue (deploy infra)

After pushing the P1–P10 redesign + UX bundle (commits `a38fddb` →
`900b5ff`), `surfaced-x.pages.dev` continues to serve the pre-P3 hero
("Discover something remarkable") rather than the new editorial cover
("What the internet surfaced today."). The GitHub `Daily Surfaced
Edition` workflow ran successfully at 16:09 UTC against the new HEAD,
so the source of truth is correct on `origin/main` — but Cloudflare
Pages has not picked the deployment up. Requires CF dashboard access
to inspect the project's branch/build config and trigger a redeploy.
