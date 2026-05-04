# Product Image Audit

Last run: 2026-05-04

Command:

```bash
IMAGE_AUDIT_CONCURRENCY=12 npm run audit:product-images -- --fix
```

Notes:

- The audit uses HTTP metadata, source pages, structured data, product gallery images, and Amazon ASIN image fallbacks. It does not call Gemini, Claude, OpenAI, or other model APIs.
- The 2026-05-04 passes checked 531 active and archived product records and brought 185 product pages to validated non-stock product images.
- The script rejects known placeholder, logo, tiny thumbnail, malformed CDN, and generic social-card patterns before writing to `data/image-cache.json`.
- 346 active or archived product records still use generic stock images because the script could not find a high-confidence product image without risk of an incorrect replacement. Those are listed by the audit as `Needs manual image/source review`.
- Article, discovery, hidden-gem, future-tech, and daily-tool images are not strict product-photo targets; topic-relevant real, generated, screenshot, or story-subject media remains acceptable for those item types.

Use this audit before major AdSense or product-commerce review work, and prefer leaving a generic image in place over publishing an incorrect product image.
