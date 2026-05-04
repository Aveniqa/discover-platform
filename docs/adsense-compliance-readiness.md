# AdSense Compliance Readiness

Last updated: 2026-05-04

## Current publisher setup

- Review URL: `https://surfaced-x.pages.dev`
- Public publisher name on site: Surfaced
- Contact email: `surfaced-x@protonmail.com`
- Operating location disclosed on privacy page: New York, United States
- AdSense publisher ID: `pub-8054019783472830`
- AdSense client ID in code: `ca-pub-8054019783472830`
- `ads.txt`: `google.com, pub-8054019783472830, DIRECT, f08c47fec0942fa0`

Do not publish a personal legal name on site surfaces. Until an LLC or DBA is
formed, public-facing policy pages should use Surfaced or the Surfaced Team and
`surfaced-x@protonmail.com` as the contact address.

## Ad serving guardrails

AdSense Auto Ads are loaded by `src/components/AdSenseLoader.tsx`, not directly
from the root layout. Item detail pages are eligible for Auto Ads because the
strict content audit now requires every active and archived item URL to clear the
review threshold. The loader intentionally skips:

- `/about`
- `/privacy`
- `/terms`
- `/affiliate-disclosure`
- `/contact`
- `/newsletter`
- `/premium`
- `/saved`

This keeps Google-served ads away from utility, legal, account-like, and
site-information pages that are weaker monetization surfaces. The loader also
removes the Auto Ads script if a client-side navigation lands on an excluded
path.

## Google Privacy & messaging

US state and European regulations messages are configured in the AdSense
dashboard. The CSP in `public/_headers` allows Google AdSense and Funding
Choices / Privacy & messaging endpoints used by those messages.

## Required validation before AdSense review

Run:

```bash
npm run audit:adsense
npm run audit:adsense:live
npm run build
```

The strict AdSense audit must report:

- `thin item bodies (<100 words): 0`
- `review item bodies (<150 words): 0`
- `exact duplicate body groups: 0`
- `low-quality source URLs: 0`

The daily workflow and build-validation workflow both run the strict content
audit, so newly generated AI pages cannot deploy if they fall below the review
threshold or reintroduce duplicate/weak-source signals.

The workflow `.github/workflows/adsense-remediation.yml` can be run manually in
`remediate` mode to enrich thin pages and replace weak sources with the
configured `GEMINI_API_KEY` secret.

## Official references

- Google Publisher Policies: https://support.google.com/adsense/answer/10502938
- Required privacy policy content: https://support.google.com/adsense/answer/1348695
- EU user consent policy: https://support.google.com/adsense/answer/7670013
- Privacy & messaging: https://support.google.com/adsense/answer/10961068
- ads.txt crawlability: https://support.google.com/adsense/answer/7679060
