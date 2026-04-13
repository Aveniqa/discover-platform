# Surfaced — Project Context

## Architecture
Next.js App Router, static export to `out/`. Deployed to Cloudflare Pages (surfaced-4in). Content lives in `data/*.json`. Images cached in `data/image-cache.json`, fetched via `scripts/fetch-images.ts` using Pexels API.

## JSON Schemas

**All items require:** `slug` (kebab-case, unique), `title`, `description` (2-3 sentences), `imageIdea` (concrete visual noun, NOT abstract), `dateAdded` (YYYY-MM-DD)

**discoveries.json** — adds: `subcategory` (Science|Nature|History|Technology|Psychology|Culture|Global|Statistics|Innovation|Space), `funFact`, `source`
**products.json** — adds: `price` (string), `productCategory`, `brand`, `rating` (number)
**hidden-gems.json** — adds: `url` (real, working), `gemCategory` (Design|Productivity|Education|Finance|Developer|Writing|Health|Entertainment|Social|Reference)
**future-tech.json** — adds: `industry`, `technology`, `developmentStage` (Research|Prototype|Early Adoption|Growth|Mainstream)
**tools.json** — adds: `url` (real, working), `toolCategory`, `pricing` (Free|Freemium|Paid), `platforms` (array)

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
2. `generate-daily-content.js` calls the Anthropic API to create 15 fresh items
3. `fetch-images.ts` gets Pexels photos for new items
4. `npm run build` rebuilds the static site
5. Push to main triggers Cloudflare Pages auto-deploy

To trigger manually: GitHub repo → Actions tab → "Daily Surfaced Edition" → Run workflow

Required GitHub Secrets: ANTHROPIC_API_KEY, PEXELS_API_KEY, UNSPLASH_ACCESS_KEY
