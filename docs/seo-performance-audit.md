# Surfaced — SEO + Performance Audit

**Date:** 2026-04-29
**Site:** https://surfaced-x.pages.dev/
**Stack:** Next.js 16 App Router · static export · Cloudflare Pages
**Catalog:** 2,467 items + 9 collections + ~14 static pages → ~2,500 indexable URLs

---

## 1. Route Inventory

| Route | Type | Server/Client | Has metadata? | Canonical? | OG image? | Twitter card? |
|---|---|---|---|---|---|---|
| `/` | static | client | inherited (root) | inherited (`/`) | ❌ | inherited |
| `/discover` | static | client (layout has meta) | ✅ | ✅ | ❌ | ✅ |
| `/trending` | static | client (layout has meta) | ✅ | ✅ | ❌ | ✅ |
| `/hidden-gems` | static | client (layout has meta) | ✅ | ✅ | ❌ | ✅ |
| `/future-radar` | static | client (layout has meta) | ✅ | ✅ | ❌ | ✅ |
| `/tools` | static | client (layout has meta) | ✅ | ✅ | ❌ | ✅ |
| `/categories` | static | server | ✅ | ✅ | ❌ | ❌ |
| `/collections` | static | server | ✅ | ✅ | ❌ | ❌ |
| `/collections/[slug]` × 9 | static | server | ✅ | ✅ | ❌ | ❌ |
| `/item/[slug]` × ~2,500 | static | server | ✅ | ✅ | ✅ | ✅ |
| `/about` | static | server | ✅ | **❌ MISSING** | ❌ | ❌ |
| `/newsletter` | static | server | ✅ | **❌ MISSING** | ❌ | ❌ |
| `/premium` | static | server | ✅ | **❌ MISSING** | ❌ | ❌ |
| `/privacy` | static | server | ✅ | **❌ MISSING** | ❌ | ❌ |
| `/terms` | static | server | ✅ | **❌ MISSING** | ❌ | ❌ |
| `/affiliate-disclosure` | static | server | ✅ | **❌ MISSING** | ❌ | ❌ |
| `/contact` | static | client (layout) | ✅ | **❌ MISSING** | ❌ | ❌ |
| `/saved` | static | client | ✅ noindex | n/a | n/a | n/a |
| `/sitemap.xml` | static | — | n/a | n/a | n/a | n/a |
| `/robots.txt` | static | — | n/a | n/a | n/a | n/a |
| `/feed.xml` | prebuild | — | n/a | n/a | n/a | n/a |

---

## 2. Metadata — Findings

### 2.1 Critical

- **7 static pages have no `alternates.canonical`** — without explicit override they fall back to the root layout's `canonical: "/"`, so Google sees `/about`, `/privacy`, `/terms` etc. as **duplicates of the homepage**. This is the highest-impact SEO bug in the audit.
- **Homepage has no explicit metadata override** — relies entirely on root layout. That's mostly fine for title/description, but means no homepage-specific OG image and no `og:url` tied to the canonical.
- **All 5 category page descriptions have stale item counts**:
  - `/discover` says "120+", actual is **500**
  - `/trending` says "135", actual is **490**
  - `/hidden-gems` says "134", actual is **490**
  - `/future-radar` says "110", actual is **500**
  - `/tools` says "114", actual is **487**
  These counts are baked into both the title and description — they need to be generated dynamically from `data/*.json`.

### 2.2 Moderate

- **No global default OG image.** Items provide one from cached imagery; everything else falls back to no image at all on social shares. A branded fallback would help.
- **Twitter card missing on 9 pages** (every page that's not a category or item).
- **Title template inconsistency.** Most pages use the root template `%s — Surfaced` automatically. But a few hardcode the suffix in their OG title (`"Newsletter — Surfaced"`) which is fine but creates an inconsistent pattern.

### 2.3 Low

- `metadataBase` set correctly on root layout ✓
- `description` lengths reviewed — all between 80–180 chars (good)
- No detected weak fallbacks like `description: "..."` placeholder text
- Single `<h1>` per page (verified by inspection)
- `robots: { index: false }` correctly applied to `/saved` page (user-specific bookmark store)

---

## 3. JSON-LD — Findings

### 3.1 Critical

- **`dateModified: new Date().toISOString().slice(0, 10)`** in `src/app/item/[slug]/page.tsx` — this changes on **every build**, which means every item's `dateModified` updates daily even if the content didn't change. Google may treat this as suspicious "fake freshness" and discount it. Should use a stable build date or, better, a per-item content hash.

### 3.2 Moderate

- **No `ItemList` JSON-LD** on category pages. With ~500 items per category, ItemList would help Google understand the relationship between category roots and item pages.
- **No `CollectionPage` JSON-LD** on `/collections/[slug]` pages.
- **Product schema's `extractBrand()` is fragile** — hardcoded list of 6 brands plus `title.split(/\s+/)[0]` fallback. Most products get an arbitrary first word as brand. Better to parse from the product title with a smarter heuristic or store brand explicitly.
- **No `Organization` schema** on root layout (only `WebSite` + `SearchAction`). Adding Organization helps with knowledge graph signals.
- **AggregateOffer is emitted with `lowPrice: undefined, highPrice: undefined`** when `estimatedPriceRange` lacks numbers. Schema.org allows this but Google's structured-data validator flags it. Should omit the offer entirely when no price is parseable.

### 3.3 Low

- Breadcrumb schema is correct on item pages ✓
- Article schema applied to non-product items ✓
- WebSite + SearchAction on root layout ✓
- No invented fields detected in the schema

---

## 4. Internal Linking

### 4.1 Findings

- **Generic anchor text everywhere**: "Explore →", "See All →", "Browse →", "Read the full story →", "Continue exploring →". These are present in carousels, footer, related sections, and homepage CTAs. Google treats anchor text as a relevance signal — repeating "Explore →" 100+ times across the site provides almost no signal.
- **Footer shows 4 items per category.** With 490+ items per category, surfacing 4 sets a low ratio of internal links to content.
- **No automatic orphan detection.** Items not in `todays-picks.json` and not in any collection are findable only via category pages and direct slug navigation.
- **Cross-category recommendations (`getCrossCategoryItems`)** uses a keyword-overlap heuristic — solid but not visible to crawlers because it only renders for items, not in any category index.
- **Collections list (`/collections`)** uses generic "Browse →" — should reference the collection name in anchor.
- **Carousel** renders all items in DOM (good for indexing), but with `display: scroll` may not all be visible on first paint.

### 4.2 Affiliate / sponsored hints

- `<a rel="sponsored noopener">` correctly added on item-page CTA when `affiliate.enabled === true`
- **But:** many products have `directAmazonUrl` without an `affiliate` object, so their CTAs render with `rel="noopener"` only (no `sponsored`). Per Google's affiliate disclosure best practices, **all monetized outbound links need `rel="sponsored"`**, regardless of the schema flag.
- "Best Buy" alternate link correctly rels `sponsored noopener` ✓
- Source link uses `rel="noopener"` only — correct since it's editorial, not monetized

---

## 5. Performance

### 5.1 Critical

- **Homepage is `"use client"`.** Every visitor downloads ~6–8 MB of JSON data files (discoveries.json, products.json, hidden-gems.json, future-radar.json, daily-tools.json, plus archive) bundled into the client JS. Brotli compresses this to ~1 MB but it still inflates LCP and TTI.
- **All 5 category pages are `"use client"`** for the same reason — sort/filter UI requires it, but the entire dataset ships.
- **Item pages are server components** ✓ — but they import `getAllItems()` which loads everything from the bundled JSON to look up a single slug. Build-time only, so no runtime cost; just larger function bundle.

### 5.2 Image sizing / LCP

- `<ItemImage>` uses native `<img>` (correct, since `images.unoptimized: true` for static export)
- `width`, `height`, `loading`, `decoding`, `fetchPriority` all correctly set ✓
- **Missing `srcset` / `sizes`** — every breakpoint downloads the same `?h=…&w=…` query-param-sized image. Mobile loads a 940×650 image into a ~360px-wide container. Easy win to add Pexels/Unsplash size variants per breakpoint.
- LCP candidate on item pages is the hero image at `1200×686` with `priority`. Correct strategy, but the image request URL only requests one size.

### 5.3 Hydration cost

- Multiple animation/effect libraries on the homepage:
  - `BlurText` (per-word reveal animation)
  - `AuroraBackground` (CSS gradient orbs)
  - `TiltCard` (mousemove tilt — listens on every card)
  - `SpotlightCard` (mousemove spotlight — listens on every card)
  - `ScrollReveal`, `ScrollProgress`, `BackToTop` (IntersectionObserver / scroll listeners)
  - `MarqueeStrip` (CSS animation)
  - `CountUp` (rAF on intersect)
  - `HeroShowcase` (carousel)
  - `Carousel` (multiple instances, one per category section)
- Each is independently fine, but the homepage instantiates **dozens of mousemove + scroll + IntersectionObserver listeners** simultaneously. Hydration time is the hidden cost.
- **`handleHeroMouseMove`** (page.tsx:114) is unthrottled — fires on every mousemove and writes inline CSS variables.

### 5.4 Build/runtime fetches

- All data loaded at build time from JSON ✓
- Image cache baked in ✓
- No runtime API fetches detected ✓

### 5.5 Caching

- `_headers` correctly configured:
  - HTML: `no-cache` (allows daily content updates)
  - `_next/static/*`: 1y immutable ✓
  - SVG, fonts: long TTL ✓
  - Service worker: max-age=0 ✓
- **Dead reference:** `/og-image.png` cache rule but no such file exists in `public/`
- **Dead reference:** CSP `report-uri /api/csp-report` and `Reporting-Endpoints` — there's no API route (static export). CSP violations get sent to a non-existent endpoint and silently 404. Either remove the directives or accept the cost.

---

## 6. Sitemap / Robots / Feed

### 6.1 Sitemap

- Includes all items (active + archive) + collections + static pages ✓
- Correct base URL ✓
- **`lastModified: dateAdded ? new Date(dateAdded) : new Date()`** — items without `dateAdded` get the build timestamp, which means **every build's sitemap shows recent dates** for old items. Not a critical issue but it's a noisy signal to Google.
- Static pages all use `new Date()` for lastModified — same noise issue.
- `changeFrequency` and `priority` set sensibly ✓
- Archived items included ✓ (correct — they remain indexed)

### 6.2 Robots

- Permissive `allow: /` ✓
- Sitemap reference included ✓

### 6.3 RSS Feed

- Prebuilds correctly via `npm run prebuild` → `scripts/generate-rss.mjs` ✓
- Latest 50 items, sorted by id descending ✓
- Includes proper `<atom:link rel="self">` ✓
- `pubDate` falls back to `new Date()` if no `dateAdded` — same noise issue as sitemap

---

## 7. CF / Bot Hints

- `Strict-Transport-Security` with HSTS preload ✓
- `X-Content-Type-Options: nosniff` ✓
- `Referrer-Policy: strict-origin-when-cross-origin` ✓
- `Permissions-Policy` locks down sensors ✓
- CSP allows `'unsafe-inline' 'unsafe-eval'` for scripts (necessary for Next.js + Google Analytics + AdSense)
- Preconnect to Pexels, Unsplash, Google ✓
- DNS prefetch to Amazon ✓

---

## 8. Regression Gaps (no validators today)

- No build-time check that every page has `<title>`, `<meta description>`, `<link rel="canonical">`, `<h1>`, `og:image`
- No JSON-LD validation
- No check that sitemap URLs all resolve to a built HTML file
- `lighthouserc.json` runs against only the home URL — no item, category, or collection page assertions
- No build-time assertion on bundle size

---

## 9. Implementation Priorities

### P0 — Ship first
1. **Fix missing canonicals** on 7 static pages (currently dupe of `/`)
2. **Fix `dateModified: new Date()`** on item pages (kills schema trust signal)
3. **Dynamic counts** on 5 category-layout titles + descriptions
4. **`rel="sponsored"`** on all Amazon outbound links (not just `affiliate.enabled` ones)
5. **Build-time SEO validator** — fail build on missing meta/canonical/H1/JSON-LD

### P1 — High value, low risk
6. Shared `src/lib/seo.ts` + `src/lib/jsonld.ts` to consolidate per-page metadata
7. `ItemList` JSON-LD on category pages (via layout, won't hydrate)
8. `CollectionPage` JSON-LD on collection pages
9. `Organization` JSON-LD on root layout
10. Stable `lastModified` in sitemap
11. Default OG image and homepage-specific metadata override
12. Add `srcset`/`sizes` to `<ItemImage>` for responsive loading
13. Improve product brand extraction; omit `AggregateOffer` if no price
14. Remove dead CSP report-uri or stub it; remove dead `og-image.png` cache rule
15. Expand `lighthouserc.json` to test multiple URLs
16. Twitter cards on the 9 missing pages
17. Strengthen anchor text where trivial (collection links, "See All" → category-named)

### P2 — Defer
18. Convert homepage + category pages from client → server-shell + client-island (large refactor; stays in CLAUDE.md "do not redesign UI" territory)
19. Throttle mousemove handlers on hero / TiltCard / SpotlightCard
20. Bundle-size budget assertions in CI

---

## 10. Build/Deploy Constraints (read before changing anything)

- Next.js `output: "export"` — no server runtime, no API routes, no ISR
- Cloudflare Pages — `_headers` is authoritative; do not duplicate in `next.config.ts`
- Archived `/item/<slug>` URLs are permanent SEO assets — never delete from `archive.json`
- RSS is prebuilt by `scripts/generate-rss.mjs` — do not replace
- Build must pass before any push (`Do NOT push if build fails` per CLAUDE.md)
- This audit will not redesign UI; only swap implementations behind existing components
