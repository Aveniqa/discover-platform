# Current-Event Intelligence Layer

Surfaced should treat current events as an editorial commerce system, not a news scraper or affiliate feed. The production-safe V1 is static-build friendly:

1. Discovery signals identify candidate topics.
2. Verification sources decide whether a topic is real, timely, and safe.
3. Product/service matching proposes practical responses.
4. Scoring gates decide whether a guide can appear on the homepage.
5. The UI shows source trails, editorial safeguards, and affiliate disclosure near recommendations.

## Recommended Source Architecture

| Layer | Best V1 choice | Why | Failure mode |
|---|---|---|---|
| Discovery signals | GDELT DOC/GKG, Google News RSS, major publisher RSS | Fast topic surfacing across categories | Media-volume bias, duplicates, syndication, and licensing limits |
| Verification | CDC, NOAA/NWS, FDA/openFDA, FTC, FEMA/Ready.gov, CPSC, USDA, EPA/AirNow, SEC, FCC, state/local agencies | Official source of record for safety, weather, recalls, enforcement, and public guidance | Scope gaps, delayed updates, regional context |
| Corroboration | Trusted publishers and agency-linked state/local pages | Useful when official source is broad or local | Publisher paywalls/licensing, summary limits |
| Product matching | Curated product/service taxonomy, Amazon PA-API, Best Buy Products API, retailer feeds where terms allow | Direct URLs, pricing/availability, affiliate compatibility | API access limits, availability drift, overfitting to one retailer |
| Fallback | Render no commerce guide when event or recommendations fail gates | Protects trust and AdSense quality | Less monetization on weak-news days |

## Candidate Source Scores

Scores are 0-100 directional ratings for Surfaced automation, not claims about institutional quality.

| Source/API | Trust | Timeliness | Geo relevance | Topic relevance | Reproducibility | Licensing/usage | Automation | Recommended use |
|---|---:|---:|---:|---:|---:|---|---:|---|
| CDC feeds/pages | 96 | 88 | 96 | 96 | 92 | Public guidance; cite directly | 78 | Verify public-health events |
| NOAA/NWS/CAP/API | 95 | 94 | 96 | 95 | 90 | Public weather data | 86 | Verify weather/readiness events |
| EPA/AirNow | 93 | 88 | 92 | 92 | 88 | Public environmental guidance | 82 | Verify AQI, wildfire smoke, indoor air |
| Ready.gov/FEMA | 92 | 78 | 94 | 90 | 86 | Public preparedness guidance | 80 | Corroborate response kits |
| CPSC Recalls API | 94 | 86 | 90 | 88 | 92 | Public recall data | 88 | Verify product-safety events |
| openFDA/FDA | 93 | 82 | 90 | 90 | 91 | Public FDA datasets | 86 | Verify recalls/enforcement |
| GDELT | 76 | 94 | 86 | 78 | 80 | Use as signal, not authority | 84 | Discover trends to verify elsewhere |
| NewsAPI | 78 | 88 | 82 | 82 | 78 | Production requires paid licensing | 82 | Discover/corroborate publisher coverage |
| Reddit | 42 | 90 | 65 | 70 | 35 | API and content-use restrictions | 62 | Weak signal only, never authority |
| Google Trends | 55 | 88 | 78 | 62 | 48 | Signal only; unofficial APIs are brittle | 46 | Topic prioritization only |

## Product/Service Scoring

Every recommendation is scored before it can render:

- Direct usefulness for the event.
- Buyer-intent match without panic framing.
- Safety and appropriateness.
- Destination transparency and direct URL quality.
- Affiliate compatibility and disclosure.
- Brand/price neutrality.
- Misleading-risk score.

Direct product URLs are preferred. Category/search URLs are allowed only when the recommendation is intentionally category-level, such as "EPA-registered tick repellent," and the source trail makes the evidence clear. Non-affiliate official/service links should remain available when the best user action is not a purchase.

## Homepage Gate

A current-event guide appears only when:

- `status` is `active`.
- `editorialStrength >= 82`.
- `sourceQualityScore >= 80`.
- `legitimacyScore >= 78`.
- `safetyScore >= 82`.
- At least 3 recommendations pass the relevance gate.

If no event clears the gate, the homepage uses the existing fallback state: no verified current-event product guide is live.

## Security And Compliance Notes

- Feed/API ingestion must use fixed allowlists, not user-supplied URLs.
- Remote fetches should reject non-HTTPS URLs, redirects to non-allowlisted hosts, oversized payloads, and unsupported content types.
- RSS/XML parsing should use a maintained parser with external entities disabled; avoid parsing arbitrary feeds inside request-time code.
- API keys belong in GitHub Secrets only and should never be exposed to the browser.
- Ad units stay separate from editorial cards and continue to use clear advertisement labeling.
- Current-event copy must avoid "official page," cure, guarantee, panic, and source-overclaim language.

## Next Integrations

1. Add a scheduled `discover-current-events` workflow that writes candidate JSON for editorial review, not directly to production.
2. Add GDELT as a discovery-only source for topic velocity and duplicate-source counts.
3. Add CPSC/openFDA JSON endpoints for high-trust recall/event categories.
4. Add Amazon PA-API and Best Buy Product API only after credentials and terms are confirmed.
5. Add a small topic classifier that maps verified event tags to product/service categories before any LLM expands copy.

The repository now includes `npm run discover:current-events` as a dry-run scaffold. It fetches only fixed allowlisted JSON endpoints, rejects redirects and oversized payloads, and prints candidate signals for review rather than editing production data.
