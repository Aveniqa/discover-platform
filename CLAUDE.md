# Surfaced

## Stack
Next.js App Router · static export (`out/`) · Cloudflare Pages (`surfaced-x`) · ~544 static pages

## Data files (`data/`)
| File | Type key | Content |
|------|----------|---------|
| `discoveries.json` | `discovery` | Facts/science discoveries |
| `products.json` | `product` | Consumer products |
| `hidden-gems.json` | `hidden-gem` | Lesser-known web tools |
| `future-radar.json` | `future-tech` | Emerging technologies |
| `daily-tools.json` | `tool` | Everyday apps/tools |
| `archive.json` | any | Rotated-out items (kept for SEO) |
| `image-cache.json` | — | slug → Pexels/Unsplash URL |
| `todays-picks.json` | — | Homepage featured items |
| `collections.json` | — | Curated item collections |
| `categories.json` | — | Category metadata + counts |
| `social-queue.json` | — | Pending social posts |
| `social-posted.json` | — | Published post history |

## JSON schemas (exact field names)

**discoveries.json** `id` `slug` `title` `shortDescription` `category` `whyItIsInteresting` `imageIdea` `sourceLink` `type:"discovery"`

**products.json** `id` `slug` `title` `shortDescription` `category` `whyItIsInteresting` `imageIdea` `sourceLink` `estimatedPriceRange` `availableOnAmazon` `amazonAsin` `directAmazonUrl` `affiliate` `type:"product"`

**hidden-gems.json** `id` `slug` `name` `whatItDoes` `category` `whyItIsUseful` `imageIdea` `websiteLink` `type:"hidden-gem"`

**future-radar.json** `id` `slug` `techName` `explanation` `industry` `whyItMatters` `developmentStage` `imageIdea` `type:"future-tech"`

**daily-tools.json** `id` `slug` `toolName` `whatItDoes` `category` `whyItIsUseful` `imageIdea` `websiteLink` `type:"tool"`

**archive.json** same fields as source type + `archivedAt` (YYYY-MM-DD)

AI-generated items also get `dateAdded` (YYYY-MM-DD). Original items may lack it.

## Daily automation pipeline
Runs at 7am ET via `.github/workflows/daily-edition.yml`. Steps in order:
1. `daily-rotate.js --run` — archives 5 oldest per category into `data/archive.json` (never deletes — archived items keep their URLs for SEO)
2. `generate-daily-content.js` — Gemini API generates 5 fresh items per category (25 total)
3. `validate-data.js` — checks JSON integrity
4. `validate-urls.js --recent` — spot-checks outbound URLs (non-fatal)
5. `assign-badges.js` — applies editorial badges
6. `generate-todays-picks.js` — selects homepage featured items
7. `populate-collections.js` — updates curated collections
8. `fetch-screenshots.js` — grabs hidden-gem screenshots
9. `fetch-images.ts` — Pexels → Unsplash → Pixabay image cache for new items
10. `npm run build` — rebuilds all static pages (must pass, 0 errors)
11. Push to main → Cloudflare Pages auto-deploys

**Manual trigger:** GitHub → Actions → "Daily Surfaced Edition" → Run workflow

**Social posting** (separate workflow): `generate-social-posts.mjs` → `publish-social-posts.mjs`
Publishes 3 posts/weekday, 2/weekend to Bluesky + Pinterest + X (text + OG card, no media upload).

## Required GitHub Secrets
| Secret | Used by |
|--------|---------|
| `GEMINI_API_KEY` | content generation |
| `PEXELS_API_KEY` | image fetch (primary) |
| `UNSPLASH_ACCESS_KEY` | image fetch (fallback) |
| `PIXABAY_API_KEY` | image fetch (fallback) |
| `AMAZON_AFFILIATE_TAG` | product affiliate URLs |
| `BLUESKY_HANDLE` | social publishing |
| `BLUESKY_APP_PASSWORD` | social publishing |
| `PINTEREST_ACCESS_TOKEN` | social publishing |
| `PINTEREST_BOARD_ID` | social publishing |
| `X_API_KEY` | social publishing |
| `X_API_SECRET` | social publishing |
| `X_ACCESS_TOKEN` | social publishing |
| `X_ACCESS_SECRET` | social publishing |

## Next.js agent note
This version may have breaking changes vs. your training data. Read `node_modules/next/dist/docs/` before writing Next.js-specific code.

## Rules
- Never duplicate an existing slug (check all 5 category files + archive)
- `imageIdea` must be concrete ("espresso machine coffee"), never abstract ("illustration of productivity")
- Do NOT modify components, CSS, templates, or build config
- Do NOT push if build fails
- Archived items in `archive.json` must never be deleted — they keep `/item/<slug>` alive for Google
