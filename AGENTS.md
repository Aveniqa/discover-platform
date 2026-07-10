# Surfaced — agent instructions (canonical)

Single source of truth for AI agents (Claude Code, Codex, etc.). `CLAUDE.md` imports this file — edit HERE, never let the two drift.

## What this is
A hand-edited daily on useful software: **hidden web gems + daily tools**, one editor persona ("Alex Surfaced"), fully automated content pipeline. Goal: AdSense-approvable, trustworthy, luxury-feeling editorial site.

## Stack
Next.js App Router (Turbopack) · static export to `out/` (~3,100 pages) · Cloudflare Pages project `surfaced-x` (auto-deploys every push to `main`) · Tailwind v4 · three.js + @react-three/fiber + @react-three/postprocessing · TypeScript.

## Design language — do not regress these
- **One gold accent (`--accent: #E5B25D`) on near black. Dark theme is pinned** (init script hardcodes `data-theme="dark"`; toggle removed 2026-07-08). Do NOT reintroduce a light theme or violet/cyan accent gradients.
- **The world**: `src/components/3d/WorldCanvas.tsx` renders the molten-gold WebGL backdrop — a scroll-morphing structure (knot → helix → halo → orb, dissolving to embers in the last 20% of scroll), rising ember particles, click bursts, bloom pass. Scroll position is the timeline; palette constants live in that file.
- **Scroll 3D conventions**: `SectionDepth` writes `--depth-t` (smoothstep + lerp) and sets `data-depth-active`; children opt in via `.plane-3d` + `.plane-rate-*`. All effects are transform/opacity-only and MUST render the finished layout for SSR/no-JS/`prefers-reduced-motion` (gate effects behind `data-depth-active`).
- **Item visuals**: `ItemVisual` resolves screenshot → cached photo → gradient. Real screenshots are self-hosted at `public/screenshots/<slug>.webp` (~25 KB each). Never hotlink third-party screenshot APIs (Microlink/mShots both failed us).
- **Perf bar**: ~120 fps during scroll with bloom active. Verify with the browser preview before shipping visual changes.

## Data files (`data/`)
| File | Type key | Status |
|------|----------|--------|
| `hidden-gems.json` | `hidden-gem` | **live** (~465 items) |
| `daily-tools.json` | `tool` | **live** (~450 items) |
| `discoveries.json` | `discovery` | archived — empty `[]`, do not add |
| `products.json` | `product` | archived — empty `[]`, do not add |
| `future-radar.json` | `future-tech` | archived — empty `[]`, do not add |
| `archive.json` | any | all rotated-out + pivoted items (~2,150); never delete entries |
| `image-cache.json` | — | slug → Pexels/Unsplash URL |
| `todays-picks.json` / `collections.json` / `categories.json` | — | derived by pipeline scripts |
| `social-queue.json` / `social-posted.json` | — | social pipeline state |

## JSON schemas (exact field names)
**hidden-gems** `id` `slug` `name` `whatItDoes` `category` `whyItIsUseful` `imageIdea` `websiteLink` `type:"hidden-gem"`
**daily-tools** `id` `slug` `toolName` `whatItDoes` `category` `whyItIsUseful` `imageIdea` `websiteLink` `type:"tool"`
Optional on live items: `screenshotUrl` (`/screenshots/<slug>.webp`, synced by capture script), `seoTitle` (≤65 chars), `badge`, `dateAdded` (YYYY-MM-DD), `editorial`, `takeaway`.
**archive.json** items keep their original fields + `archivedAt` (YYYY-MM-DD).
Legacy schemas (discovery/product/future-tech) survive in `archive.json` — see `src/lib/data.ts` for authoritative types.

## Workflows (`.github/workflows/`)
| Workflow | Status | Notes |
|---|---|---|
| Daily Surfaced Edition | **active**, 7am ET cron | the content pipeline (below) |
| Daily Social Posts | **active**, 3×/weekday 2×/weekend | Bluesky + Pinterest OK; X fails 402 until credits topped up |
| Build Validation / CodeQL / Data Backup / Pinterest Token Refresh | active | routine |
| AdSense Content Remediation | manual dispatch | archive source backfill **complete** (`unprocessed=0`, 2026-07-04); `docs/source-retrofit-attempted.json` ledgers ~330 confirmed-unverifiable slugs — do NOT retry them |
| Trending Live Content, Daily Discovery Candidates | **RETIRED** | off-niche current-events automation; do not re-enable schedules |

## Daily pipeline (order matters; each step is a script in `scripts/`)
1. `daily-rotate.js --run` — archive 5 oldest per live vertical (never deletes)
2. `generate-daily-content.js` — Gemini (flash-lite) generates 5/vertical. Saturation-tuned: floor `MIN_PER_CATEGORY=2` (lean days beat failed editions), 7 attempts, 150-title dedup window, rotating day-of-year sub-niche focus, API retries ×5 for 503 spikes
3. `normalize-affiliate-links.js`, `fetch-product-asins.js` — no-op on empty products, keep
4. `validate-data.js` → `audit-adsense-content.mjs --strict` — hard gates
5. `validate-urls.js --recent` (non-fatal) → `assign-badges.js` → `generate-todays-picks.js` → `populate-collections.js`
6. `capture-screenshots.mjs` — Playwright screenshots for new items only (bot-wall detection built in; failures fall back to photos)
7. `fetch-images.ts` — Pexels→Unsplash→Pixabay cache
8. `npm run build` (must pass, 0 errors) → IndexNow ping → `send-newsletter.mjs` (Buttondown) → commit/push with 3× rebase-retry
Failures roll data back, open a GitHub issue, and optionally ping `SLACK_WEBHOOK_URL`.

## GitHub secrets
Required: `GEMINI_API_KEY`, `PEXELS_API_KEY`, `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`, `PINTEREST_ACCESS_TOKEN`/`PINTEREST_BOARD_ID` (+ `PINTEREST_APP_SECRET`/`PINTEREST_REFRESH_TOKEN` for token refresh), `X_API_KEY`/`X_API_SECRET`/`X_ACCESS_TOKEN`/`X_ACCESS_SECRET`, `AMAZON_AFFILIATE_TAG`.
Optional: `UNSPLASH_ACCESS_KEY`, `PIXABAY_API_KEY` (image fallbacks) · `BUTTONDOWN_API_KEY` (newsletter) · `PRODUCT_HUNT_TOKEN` (generation seeds) · `SLACK_WEBHOOK_URL` (failure pings) · `PAT_TOKEN` (remediation PRs; lacks `workflow` scope — remediation rebases onto main before pushing for this reason) · `GNEWS_API_KEY`/`NEWSAPI_KEY`/`YOUTUBE_API_KEY` (retired workflows only).

## Dev environment gotchas
- **Service worker caches dev CSS/JS chunks across dev-server restarts.** If style/shader edits don't appear: DevTools → unregister SW + clear CacheStorage, then reload. Production is unaffected (network-first HTML, hashed assets).
- **`npm ci` on macOS arm64 may drop the `lightningcss` native binary** (npm optional-deps bug → "Cannot find module '../lightningcss.darwin-arm64.node'"). Fix: `npm i lightningcss-darwin-arm64 --no-save`, clear `.next`, restart.
- Git worktrees trigger a Turbopack multiple-lockfile root warning — harmless.
- Preview servers in `.claude/launch.json` (untracked): `surfaced` serves the static `out/` build; `surfaced-dev` runs `next dev`.
- `scripts/` are CommonJS Node by design and excluded from ESLint.

## Editorial trust & AdSense (still binding)
- Use `SourceTrailLink`, `EditorialTrustBar`, `src/lib/trust.ts` for source/trust UI — don't duplicate URL-host parsing in pages.
- Ads: never encourage clicks, never style ads as navigation/content, keep containers labeled "Advertisement", keep commerce links visually distinct from editorial text.
- Affiliate policy: direct product URLs preferred; Amazon links use `/dp/{ASIN}` when an ASIN is known; search pages only as last resort.
- Current-events module (`data/current-events.json`, `src/lib/current-event-intelligence.ts`) is gated + allowlisted (`scripts/validate-current-events.mjs`); its feeder workflows are retired — treat it as frozen unless the user revives it.
- CSP is strict (`object-src 'none'`, `upgrade-insecure-requests`, report-uri); keep it that way.

## Next.js note
Installed Next may be newer than your training data. Read `node_modules/next/dist/docs/` before writing Next-specific code.

## Rules
- Never duplicate an existing slug (check both live files + `archive.json`).
- `imageIdea` must be a concrete visual noun ("espresso machine coffee"), never abstract.
- Content/automation sessions must NOT modify components, CSS, templates, or build config — design changes only when the user explicitly asks (last user-approved overhaul: 2026-07-08, gold alignment).
- Do NOT push if the build fails.
- `archive.json` entries are permanent — they keep `/item/<slug>` alive for search engines.
- New live items must have a working `https://` `websiteLink`; sourceless live items get archived by `archive-missing-sources.mjs`.
