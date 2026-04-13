# Surfaced — Project Context

## Architecture
Next.js App Router, static export to `out/`. Deployed to Cloudflare Pages (surfaced-x). Content lives in `data/*.json`. Images cached in `data/image-cache.json`, fetched via `scripts/fetch-images.ts` using Pexels API.

## JSON Schemas (actual field names)

**discoveries.json**: `id`, `slug`, `title`, `shortDescription`, `category`, `whyItIsInteresting`, `imageIdea`, `sourceLink`, `type:"discovery"`
**products.json**: `id`, `slug`, `title`, `shortDescription`, `category`, `whyItIsInteresting`, `imageIdea`, `sourceLink`, `estimatedPriceRange`, `type:"product"`
**hidden-gems.json**: `id`, `slug`, `name`, `whatItDoes`, `category`, `whyItIsUseful`, `imageIdea`, `websiteLink`, `type:"hidden-gem"`
**future-radar.json**: `id`, `slug`, `techName`, `explanation`, `industry`, `whyItMatters`, `developmentStage`, `imageIdea`, `type:"future-tech"`
**daily-tools.json**: `id`, `slug`, `toolName`, `whatItDoes`, `category`, `whyItIsUseful`, `imageIdea`, `websiteLink`, `type:"tool"`

New AI-generated items also get `dateAdded` (YYYY-MM-DD). Original items may lack this field.

## Daily Rotation
- Run `node scripts/daily-rotate.js` to remove 3 oldest per category
- Replace with 3 fresh, REAL items per category (15 total)
- Verify URLs work for hidden-gems and tools
- `npm run fetch-images` then `npm run build` (expect ~333 pages, 0 errors)
- Commit and push to main

## Rules
- Never duplicate an existing slug
- imageIdea must be concrete ("espresso machine coffee") not abstract ("illustration of productivity")
- Do NOT modify components, CSS, templates, or build config
- Do NOT push if build fails

## Automation

Daily updates run via GitHub Actions (.github/workflows/daily-edition.yml):
1. `daily-rotate.js --run` removes 3 oldest items per category
2. `generate-daily-content.js` calls the free Google Gemini API to create 15 fresh items
3. `fetch-images.ts` gets Pexels photos for new items
4. `npm run build` rebuilds the static site
5. Push to main triggers Cloudflare Pages auto-deploy

To trigger manually: GitHub repo → Actions tab → "Daily Surfaced Edition" → Run workflow

Required GitHub Secrets: GEMINI_API_KEY, PEXELS_API_KEY, UNSPLASH_ACCESS_KEY
