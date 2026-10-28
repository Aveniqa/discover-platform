# Surfaced Automation Budget

Surfaced is in low-credit maintenance mode while the project is not being actively edited.

## Default Schedule

`Daily Surfaced Edition` runs automatically on Monday, Wednesday, and Friday mornings ET.

Each scheduled run:

- archives 2 old `hidden-gems` and 2 old `daily-tools` into `data/archive.json`
- generates 2 fresh items for each live vertical
- accepts a 1-item partial category if the catalog is saturated
- limits generation to 3 attempts per category
- validates data, AdSense quality, product commerce, and the static build
- refreshes search/feed/dashboard files
- pings IndexNow after a successful build
- commits and pushes to `main`, which lets Cloudflare Pages deploy

The Monday scheduled run also captures screenshots, fetches stock images, and sends the Buttondown newsletter. Wednesday and Friday skip those credit/API-heavy garnish steps.

## Manual Refresh

Use GitHub Actions -> `Daily Surfaced Edition` -> `Run workflow` when you want a bigger refresh.

Options:

- `content_budget=low`: 2 new items per live category, 3 generation attempts
- `content_budget=normal`: 5 new items per live category, 7 generation attempts
- `refresh_media=true`: install Playwright, capture screenshots, and call image APIs
- `send_newsletter=true`: send the Buttondown newsletter after validation/build

## Retired Lanes

These workflows should stay disabled unless the product direction changes:

- `Daily Discovery Candidates`
- `Trending Live Content`
- `Daily Social Posts`

The active site niche is hidden gems plus daily tools. Current-event and social posting workflows are off-niche or intentionally paused to avoid unnecessary API/model spend.

