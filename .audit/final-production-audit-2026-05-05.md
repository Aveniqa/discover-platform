# Final Production Audit - 2026-05-05

## Local Verification

- `npm run build`: passed.
- Static routes generated: 2,747.
- SEO validator: 2,744 HTML files scanned, 0 errors, 0 warnings.
- Static-export payload cleanup: 5,461 payload files removed from `out/`.
- `npm run audit:all`: passed.
- Data validation: 5 live data files plus archive passed.
- Automated content validation: passed.
- Current event validation: 3 events passed.
- Product commerce audit: 0 errors, 0 warnings.
- Product image audit: 0 missing images, 0 fixed this run, 343 generic stock images still listed for manual review.

## Live Performance

Target thresholds are from `lighthouserc.json`: LCP <= 4,000 ms and TBT <= 500 ms.

- URL: `https://surfaced-x.pages.dev/`
- Tool: Lighthouse desktop, performance category only.
- Performance score: 97.
- FCP: 364 ms.
- LCP: 1,256 ms.
- TBT: 39 ms.
- CLS: 0.0027.
- Speed Index: 865 ms.

## Artifact State

- `logs/` contains only `logs/broken-links-2026-05-05.txt`.
- Broken link report is tracked and preserved for review.
- No root `broken-links.txt` files were present.
- No stale `.lighthouseci/`, `test-results/`, or stray `.audit` artifacts were present before this final report.

## Notes

- Known residual content work remains the older non-product missing-source backlog reported by the AdSense audit; it is non-fatal under the current strict audit because page bodies are not thin and product commerce is clean.
- Known product-image backlog remains manual review for generic Pexels-backed images; the audit exits cleanly with no missing images.
