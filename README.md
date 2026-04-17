# Surfaced

**Your daily discovery engine.** Fascinating finds, trending products, hidden internet gems, and future technology — curated and refreshed every day.

Live site: https://surfaced-x.pages.dev

## Stack

- Next.js App Router, static export
- Deployed to Cloudflare Pages
- Content in `data/*.json`, images cached in `data/image-cache.json`
- Daily automation via GitHub Actions (`.github/workflows/daily-edition.yml`)

## Local development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # static export to out/
```

## Daily automation

Runs at 7am ET automatically (GitHub Actions). To trigger manually:
GitHub → Actions → "Daily Surfaced Edition" → Run workflow

See `CLAUDE.md` for the full pipeline, data schemas, and secrets reference.
