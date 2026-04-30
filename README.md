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

## Client analytics (optional)

Tinybird events ship from `src/lib/analytics.ts` when these env vars are
set at build time. All vars are optional — when any are missing the
client fires no events (no errors, no warnings).

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_TINYBIRD_TOKEN` | Append-only API token for the events datasource |
| `NEXT_PUBLIC_TINYBIRD_DATASOURCE` | Datasource name (e.g. `surfaced_events`) |
| `NEXT_PUBLIC_TINYBIRD_HOST` | Region host. Defaults to `api.us-east.tinybird.co` |

`navigator.doNotTrack` is honoured. No PII leaves the browser; events
carry only `slug`, `host`, `kind`, `location`, `path`, `action`.
Events: `page_view`, `bookmark_toggle`, `surprise_me_click`,
`newsletter_submit`, `outbound_click`, `quick_view_open`.
