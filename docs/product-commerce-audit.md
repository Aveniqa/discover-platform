# Product Commerce Audit

Last updated: 2026-05-03

## What The Gate Checks

Run with:

```bash
npm run audit:products
```

The audit blocks deploys when a product can mislead users or create affiliate-disclosure risk:

- `availableOnAmazon: false` products cannot render an Amazon CTA.
- Amazon affiliate URLs must carry the configured `AMAZON_AFFILIATE_TAG`.
- Products with an `amazonAsin` must render that exact `/dp/ASIN` URL.
- Every product must have an image-cache entry.
- Known bad product images, starting with the Apple Vision Pro mismatch, are blocked.

Warnings are non-blocking but should be worked down over time. They mostly identify Amazon search URLs that should eventually be replaced with exact ASIN URLs or official manufacturer/reseller pages.

## Current Remediation

- Removed Amazon affiliate/search CTAs from non-Amazon official-source products.
- Marked products as Amazon-eligible only when Amazon is the only commerce path currently in the dataset.
- Removed Amazon search result pages from `sourceLink` so source links are not vague marketplace searches.
- Removed unverified Amazon search CTAs entirely; Amazon monetization now requires a verified ASIN.
- Updated the daily and bulk content scripts so future products cannot recreate Amazon search affiliate fallbacks.
- Replaced stale or blocked source links for products such as Loftie Clock, Wynd Plus, Canon PowerShot V10, EPOS GSX 1000, HigherDOSE Sauna Blanket, Anker 737, Instant Pot Pro, Roomba 694, Ninja DualBrew Pro, Echo Show 8, eufy Indoor Cam, Logitech Brio, Hatch Restore 2, Kindle Paperwhite, and Mortier Pilon.
- Replaced the Apple Vision Pro Pexels stock image with a local, attributed image of the actual Vision Pro headset and battery pack.
- Updated the Apple Vision Pro source URL to Apple's exact buy page and refreshed the copy for the current M5 model.
- Added the product commerce audit to the daily GitHub Actions pipeline after image fetching and before the build.

## Remaining Cleanup Queue

Current audit snapshot:

- 476 total product pages
- 266 Amazon-eligible product pages with exact `/dp/ASIN` links
- 210 non-Amazon/DTC, reseller, generic, or discontinued product pages
- 266 exact Amazon `/dp/ASIN` URLs
- 0 Amazon search CTA URLs
- 0 Amazon search URLs left in `sourceLink`

The remaining warnings are Product Hunt source URLs for software/service entries. Those pages still have outbound sources and do not create affiliate risk, but they should be improved in later passes:

- Replace Product Hunt source URLs with official product websites for software/service entries.
- Add exact `/dp/ASIN` links only when a current product listing is verified.
