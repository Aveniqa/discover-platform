# Surfaced — agent instructions (canonical)

Single source of truth for AI agents (Claude Code, Codex, etc.). `CLAUDE.md` imports this file — edit HERE, never let the two drift.

## What this is
A hand-edited daily on useful software: **hidden web gems + daily tools**, one editor persona ("Alex Surfaced"), fully automated content pipeline. Goal: AdSense-approvable, trustworthy, luxury-feeling editorial site.

## Stack
Next.js App Router (Turbopack) · static export to `out/` (~3,100 pages) · Cloudflare Pages project `surfaced-x` (auto-deploys every push to `main`) · Tailwind v4 · three.js + @react-three/fiber + @react-three/postprocessing · TypeScript.

## Design language — do not regress these
- **One gold accent (`--accent: #E5B25D`) on near black. Dark theme is pinned** (init script hardcodes `data-theme="dark"`; toggle removed 2026-07-08). Do NOT reintroduce a light theme or violet/cyan accent gradients.
- **The world** (rebuilt 2026-08-15): `WorldCanvas.tsx` = a raymarched volumetric `Backdrop` + `SignalField.tsx`. SignalField is ~17k points on a curl-noise flow where **the cursor is a real force** (bends particles aside, carves a hotter trail) and clicks fire healing shockwaves; palette travels cyan → violet → rose → gold with scroll. It is **stateless** — position is a pure function of (seed, time, scroll, pointer, ripples) in the vertex shader, so it stays one draw call with no feedback buffers. The molten core / branching growth / embers / gold click-bursts were removed; don't reintroduce them.
- **Shader gotcha that costs hours**: a vertex stage defaults to `highp`. If a uniform is declared in both stages and the fragment says `mediump`, the program **fails to link silently** ("Precisions of uniform 'x' differ…") and *nothing renders* — the error appears only in a FULL console read, not the default error filter. Keep both stages `highp`.
- **Brightness bar**: the page lays readability scrims (~0.55 black) over the canvas, so a background must output near-HDR values to survive them — but keep the *resting* state quiet so text stays legible and let interaction drive the drama.
- **Scroll 3D conventions**: `SectionDepth` writes `--depth-t` (seeded synchronously before effects switch on) and sets `data-depth-active`; children opt in via `.plane-3d` + `.plane-rate-*`. **Content visibility must never depend on JS** — the entrance is a native `animation-timeline: view()` animation and `--depth-t` drives parallax drift only. (A rAF-driven opacity once left real cards at 0.3 on throttled tabs: an AdSense hidden-content hazard.) Everything must still render the finished layout for SSR/no-JS/`prefers-reduced-motion`.
- **Item visuals**: `ItemVisual` resolves screenshot → **the tool's own logo** (Google favicon CDN on a tinted card) → cached photo → gradient. Real screenshots are self-hosted at `public/screenshots/<slug>.webp`. The logo tier exists because ~75 sites block headless capture and an unrelated stock photo is not an accurate image of a product — **pass `websiteLink` at every call site** or that tier can't fire. Never hotlink third-party screenshot APIs (Microlink/mShots both failed us).
- **Perf bar**: ~120 fps during scroll with bloom active. Verify with the browser preview before shipping visual changes.

## Data files (`data/`)
| File | Type key | Status |
|------|----------|--------|
| `hidden-gems.json` | `hidden-gem` | **live** (~385 items — off-niche, linkless and duplicate items archived 2026-10-28/29) |
| `daily-tools.json` | `tool` | **live** (~405 items) |
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
Optional on live items: `everydayUse` (2-3 concrete "you'd reach for this when…" moments, rendered as the *In everyday life* panel; produced by the daily generator for new items, backfilled by `scripts/backfill-everyday-use.mjs`), `signals` (`{checkedAt, github?: {repo, stars, forks, archived, pushedAt?, license?}, video?: {id, title, channel, durationSec?}}` — written only by `scripts/enrich-signals.js`; renders as *Project signals* and *See it in action*), `screenshotUrl` (`/screenshots/<slug>.webp`, synced by capture script), `seoTitle` (≤65 chars), `badge`, `dateAdded` (YYYY-MM-DD), `editorial`, `takeaway`.
**archive.json** items keep their original fields + `archivedAt` (YYYY-MM-DD), and optionally `archiveReason` (`missing-source` | `off-niche` | `duplicate`). A `duplicate` also carries `duplicateOf: <live slug>`: its page canonicalises to that slug and it is left out of the sitemap.
Legacy schemas (discovery/product/future-tech) survive in `archive.json` — see `src/lib/data.ts` for authoritative types.

## Workflows (`.github/workflows/`)
| Workflow | Status | Notes |
|---|---|---|
| Daily Surfaced Edition | **active, low-credit Mon/Wed/Fri** (resumed 2026-10-28 after a 2026-09-20 → 10-28 pause) | the content pipeline (below). Cron `0 11 * * 1,3,5`: 2 new items per vertical per run; screenshots, stock images and the Buttondown newsletter run **only on Mondays**. Manual dispatch takes `content_budget` (low\|normal), `refresh_media`, `send_newsletter`. Rationale and knobs: `docs/automation-budget.md`. Do NOT restore the old daily cron unless the owner asks — it spent model/API/deploy credit every day on an untended site. |
| Daily Social Posts | **PAUSED 2026-07-10** at the owner's request (cron commented, workflow disabled, manual dispatch kept) | Pipeline is healthy — Bluesky + Pinterest publish fine; X returns 402 CreditsDepleted and is logged once as a clean skip. Resume = uncomment cron + `gh workflow enable social-posts.yml` |
| Build Validation / CodeQL / Data Backup / Pinterest Token Refresh | active | routine |
| AdSense Content Remediation | manual dispatch | archive source backfill **complete** (`unprocessed=0`, 2026-07-04); `docs/source-retrofit-attempted.json` ledgers ~330 confirmed-unverifiable slugs — do NOT retry them. Also runs the `everydayUse` backfill (250/run, idempotent — re-dispatch until 0 remain) |
| Trending Live Content, Daily Discovery Candidates | **RETIRED** | off-niche current-events automation; do not re-enable schedules |

## Daily pipeline (order matters; each step is a script in `scripts/`)
1. `daily-rotate.js --run` — archive the oldest `DAILY_ROTATE_COUNT` per live vertical (default 5; scheduled runs set 2; never deletes)
2. `generate-daily-content.js` — Gemini (flash-lite) generates `DAILY_TARGET_PER_CATEGORY`/vertical (default 5; scheduled runs set 2 with floor 1 and 3 attempts — the workflow's "Set automation budget" step owns these). Saturation-tuned defaults: floor `MIN_PER_CATEGORY=2` (lean days beat failed editions), 7 attempts, 150-title dedup window, rotating day-of-year sub-niche focus, API retries ×5 for 503 spikes. Seeds (Show HN only for gems; GitHub + Product Hunt for tools) are **grounded**: each seed's own page is read via Agent Reach and passed to Gemini as `Page title`/`Page excerpt`. Candidates with a headline-style name or a news/social link are dropped (`scripts/lib/item-guards.js`), and "Brand – tagline" names are cut to the brand
3. `normalize-affiliate-links.js`, `fetch-product-asins.js` — no-op on empty products, keep
4. `validate-data.js` → `audit-adsense-content.mjs --strict` — hard gates
5. `validate-urls.js --recent` (non-fatal) → `assign-badges.js` → `generate-todays-picks.js` → `populate-collections.js` → `enrich-signals.js --refresh 20` (non-fatal; GitHub stats + matched YouTube walkthrough for new items, re-checks 20 stalest >30 days)
6. `capture-screenshots.mjs` — Playwright screenshots for new items only (bot-wall detection built in; failures fall back to photos)
7. `fetch-images.ts` — Pexels→Unsplash→Pixabay cache
8. `npm run build` (must pass, 0 errors) → IndexNow ping → `send-newsletter.mjs` (Buttondown) → commit/push with 3× rebase-retry
Failures roll data back, open a GitHub issue, and optionally ping `SLACK_WEBHOOK_URL`.

## Agent Reach (added 2026-10-28)
[Agent Reach](https://github.com/Panniantong/Agent-Reach) is a CLI that reads the web for agents. Surfaced uses three channels through `scripts/lib/agent-reach.js`: **web read** (seed grounding), **github read** (repo stats), **youtube search** (walkthroughs).
- **Install from the GitHub release only** — the PyPI package named `agent-reach` is a different project. CI pins `releases/download/v1.6.0/agent-reach.zip` via `uv tool install`; bump the pin deliberately.
- **Everything is best-effort.** Each helper returns `null`/`[]` when the CLI is missing, a channel is down or a call times out, and the edition carries on as before. Never make a gate depend on it.
- **Precision over recall for videos.** A match must name the item in its title *and* mention the brand as one word or the domain (`mentionsBrand` in `enrich-signals.js`); one-word names also need a software cue, and the video must share topic words with the item's own description (two for one-word names) — that check is what separated "Swiftlet" the LLM runtime from swiftlet bird farming. Roundups ("GitHub Trending Weekly #46: a, b, c…") are skipped. Coverage on 2026-10-28: video on 58/399 gems and 123/430 tools; GitHub stats on 129 items. Do not loosen this — a wrong video on a product page is worse than none.
- Reddit was broken upstream on 2026-10-28 (its backend paused with `UPSTREAM_BROKEN`), and YouTube may refuse GitHub's datacenter IPs. Both fail soft.
- Local gotcha: Agent Reach refuses a config dir reached through a symlink, so `HOME=$(mktemp -d)` fails on macOS (`/var` → `/private/var`). Use a real path.

## GitHub secrets
Required: `GEMINI_API_KEY`, `PEXELS_API_KEY`, `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`, `PINTEREST_ACCESS_TOKEN`/`PINTEREST_BOARD_ID` (+ `PINTEREST_APP_SECRET`/`PINTEREST_REFRESH_TOKEN` for token refresh), `X_API_KEY`/`X_API_SECRET`/`X_ACCESS_TOKEN`/`X_ACCESS_SECRET`, `AMAZON_AFFILIATE_TAG`.
Optional: `UNSPLASH_ACCESS_KEY`, `PIXABAY_API_KEY` (image fallbacks) · `BUTTONDOWN_API_KEY` (newsletter) · `PRODUCT_HUNT_TOKEN` (generation seeds) · `SLACK_WEBHOOK_URL` (failure pings) · `PAT_TOKEN` (remediation PRs; lacks `workflow` scope — remediation rebases onto main before pushing for this reason) · `GNEWS_API_KEY`/`NEWSAPI_KEY`/`YOUTUBE_API_KEY` (retired workflows only).

## This repo is also an Obsidian vault
`.obsidian/` sits at the repo root and is gitignored, so workspace layout stays local while the notes stay versioned. Conventions that make it work:
- **`docs/Surfaced-HQ.md` is the control centre** — live counts, coverage, pipeline health, and links to every other doc. It is GENERATED by `scripts/generate-vault-dashboard.mjs` on every daily edition; never hand-edit it (changes are overwritten). Put your own thinking in a separate note.
- Every doc carries YAML frontmatter (`title`, `type`, `updated`, `tags`) — that's what powers Obsidian search/graph and what lets an agent tell docs apart when scanning.
- Use descriptive filenames (`seo-maintenance.md`, never `notes2.md`); Obsidian and agents both match on filename first.
- Cross-link docs with `[[wikilinks]]` so the graph view is actually navigable.
- Generated vs. authored: keep agent output in generated files (HQ dashboard, audit logs) and human thinking in hand-written notes, so neither overwrites the other.

## Dev environment gotchas
- **Service worker caches dev CSS/JS chunks across dev-server restarts.** If style/shader edits don't appear: DevTools → unregister SW + clear CacheStorage, then reload. Production is unaffected (network-first HTML, hashed assets).
- **`npm ci` on macOS arm64 may drop the `lightningcss` native binary** (npm optional-deps bug → "Cannot find module '../lightningcss.darwin-arm64.node'"). Fix: `npm i lightningcss-darwin-arm64 --no-save`, clear `.next`, restart.
- Git worktrees trigger a Turbopack multiple-lockfile root warning — harmless.
- Preview servers in `.claude/launch.json` (untracked): `surfaced` serves the static `out/` build; `surfaced-dev` runs `next dev`.
- `scripts/` are CommonJS Node by design and excluded from ESLint.

## Monetisation reality (read before "add affiliate links")
The live catalogue is **free web tools and apps**, not purchasable products — most have no affiliate programme, and `products.json` has been empty since the 2026-05 pivot. **0 affiliate links on live items is correct, not a gap.** Never fabricate affiliate URLs: that is an FTC disclosure problem and an AdSense-review risk. Real options if monetisation is wanted: per-vendor SaaS affiliate programmes (each needs a human signup) or reviving a product vertical. Keep `/affiliate-disclosure` consistent with whatever is actually true — it currently implies affiliate links are in use.

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
- Never publish the same product twice, **including across verticals** — 37 such duplicates (Logseq, Excalidraw, Typst, three Textuals…) were archived on 2026-10-29. The generator now dedupes names/URLs against the other live vertical (`alsoPublished` in `generateItems`).
- `imageIdea` must be a concrete visual noun ("espresso machine coffee"), never abstract.
- Content/automation sessions must NOT modify components, CSS, templates, or build config — design changes only when the user explicitly asks (last user-approved overhaul: 2026-07-08, gold alignment).
- Do NOT push if the build fails.
- `archive.json` entries are permanent — they keep `/item/<slug>` alive for search engines.
- New live items must have a working `https://` `websiteLink`; sourceless live items get archived by `archive-missing-sources.mjs`.
- A gem or tool is something a reader can open and use. News stories, essays, op-eds, GitHub issues and social posts are off-niche even when Show HN surfaces them — archive with `archiveReason: "off-niche"`, never delete.
