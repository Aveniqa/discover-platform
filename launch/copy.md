# Surfaced — Launch Campaign Copy

Draft copy for the initial launch round. Each section is a standalone post —
copy-paste into the target platform, tweak voice if needed.

Site: https://surfaced-x.pages.dev
Tagline: *Discover something remarkable — every morning.*

---

## 1. Product Hunt

**Name:** Surfaced

**Tagline (60 chars max):**
> A fresh drop of internet finds — every morning, free.

**Description (260 chars max):**
> Surfaced is a daily discovery engine. Every morning we surface 25 fresh
> picks across 5 tracks: fascinating discoveries, trending products, hidden
> web gems, future tech, and daily-use tools. 500+ curated, free, no signup.

**First comment (Maker comment):**
> Hey PH 👋
>
> I built Surfaced because my RSS reader kept filling up with 20 variants
> of the same tech headline — and none of the actually interesting stuff.
>
> What you get:
> • **5 daily tracks** — discoveries, products, hidden gems, future tech, daily tools
> • **25 new picks every morning** — generated and vetted by a pipeline that
>   sources signals from HN, Product Hunt, and GitHub, then runs them through
>   an editorial filter
> • **Per-category RSS** — point Feedly at `/feeds/daily-tools.xml` (etc.) and
>   it just works
> • **Daily editions archive** — every morning's drop is permanent and
>   browsable at `/editions/YYYY-MM-DD`
> • **Zero signup to browse.** Free newsletter if you want it in your inbox.
>
> Built on Next.js + static export → 549 pages, deploys to Cloudflare in
> ~45 seconds. Every item has its own OG card, Schema.org markup, and
> canonical URL preserved in the archive even after it rotates off the
> front page.
>
> Would love to know what you'd want us to surface next. 🌊

**Topics:** #Productivity #NewsletterTools #ArtificialIntelligence
#DeveloperTools #Curation

**Gallery shots to prepare (in order):**
1. Homepage hero with the kinetic "Discover something remarkable" headline
2. Category carousel showing "🔥 New" ribbons
3. An item page with the branded OG card and rich schema
4. The /editions archive index

---

## 2. Show HN

**Title (80 chars max):**
> Show HN: Surfaced – A daily discovery engine (500+ pages, AI-curated)

**Body:**
> Surfaced is a small side project I've been working on: a static Next.js
> site that publishes 25 fresh items every morning across five tracks —
> discoveries, products, hidden gems, future tech, daily tools.
>
> The pieces I found interesting to build:
>
> - **Daily pipeline as a GitHub Action.** 7am ET cron: rotate 5 oldest per
>   category to an archive (keeping their URLs alive for SEO), generate 25
>   new items via Gemini with structured-output seeded from HN/PH/GitHub
>   signals, validate, assign badges, fetch images (Pexels → Unsplash →
>   Pixabay fallback chain), rebuild, deploy. End-to-end ~6 minutes.
> - **Branded OG images composited at build time.** Sharp + SVG overlay
>   per slug → 1200x630 PNG with title wrapping. 517 PNGs, 74MB, regenerated
>   on each build (gitignored; only the manifest is committed).
> - **Static-first Schema.org.** Every item page emits JSON-LD
>   (SoftwareApplication / TechArticle / Product / Article) server-side;
>   category pages emit CollectionPage + ItemList; editions emit
>   NewsArticle + ItemList. No runtime needed.
> - **Per-category RSS feeds** with `<link rel="alternate">` auto-discovery,
>   so Feedly grabs the right one when pointed at any category page.
>
> Stack: Next.js 16 (static export), React 19, Tailwind 4, sharp, Cloudflare
> Pages. 549 static pages, deploys in ~45 seconds.
>
> Source URL: https://surfaced-x.pages.dev
>
> Happy to answer anything about the pipeline, the cost (free tier: Gemini
> free, Pexels free, Cloudflare Pages free), or why I'm not using a CMS.

---

## 3. IndieHackers

**Title:**
> I built a daily discovery engine that publishes itself — 500+ pages, $0/month

**Body:**
> ## What it is
>
> Surfaced drops 25 curated items every morning across 5 categories:
> discoveries, trending products, hidden web gems, future tech, and daily
> tools. 500+ items live, one permanent URL per item, completely free to
> browse.
>
> ## Why I built it
>
> I kept bookmarking the same kinds of things from Twitter, Reddit, HN, and
> Product Hunt — but no single feed pulled them together. I wanted a single
> morning page with *interesting* over *new*.
>
> ## How it pays for itself (spoiler: it doesn't have to yet)
>
> Running cost is $0/month:
> - **Cloudflare Pages** (free tier) — static export, 549 pages
> - **Gemini API** (free tier) — daily content generation
> - **Pexels + Unsplash + Pixabay** (free tiers) — image fetch with fallback
> - **GitHub Actions** — daily cron + auto-deploy
>
> Revenue path is Amazon affiliate tags on product items + an upcoming
> premium tier with deeper dives and an early-access newsletter.
>
> ## What's working
>
> - **Fully autonomous publishing.** The daily cron does: rotate, generate,
>   validate, badge, image-fetch, build, deploy. I don't touch it.
> - **SEO-first from day one.** Every item has rich schema, canonical URL,
>   branded OG card. The archive keeps old items indexable even after
>   rotation.
> - **Per-category RSS feeds.** Feedly/Reeder auto-discover them. Low-effort
>   distribution channel I didn't have to build.
>
> ## What I'd still like to fix
>
> - Signal-source badges ("⭐ 347 GitHub", "🟠 892 HN") are wired up but won't
>   populate until the pipeline runs with the new code this week.
> - Need a real on-site comment/save flow (today: bookmark + subscribe only).
> - Haven't done any paid acquisition yet — this launch is the first push.
>
> Would love feedback from anyone who's shipped a content-y static site
> before: what did you wish you'd built into your pipeline on day one?
>
> Link: https://surfaced-x.pages.dev

---

## 4. r/SideProject

**Title:**
> I built a daily discovery engine that auto-publishes every morning — roast my launch 🫠

**Body (Reddit-flavoured, lighter):**
> So I finally shipped the thing: **Surfaced**, a daily drop of 25 curated
> picks across 5 tracks (discoveries, products, hidden gems, future tech,
> daily tools). It runs itself — a GitHub Action at 7am ET rotates, generates,
> validates, images, builds, deploys.
>
> Stack:
> - Next.js static export → Cloudflare Pages (free)
> - Gemini (free tier) for content generation, with seeds from HN/PH/GitHub
> - `sharp` + SVG for per-item OG images baked at build time
> - JSON-LD on every page (Product/SoftwareApplication/NewsArticle)
> - Per-category RSS feeds + daily editions archive
>
> 500+ items, 549 static pages, $0/month.
>
> Link: https://surfaced-x.pages.dev
>
> **Things I'm worried about:**
> - Will Google actually crawl & index the archived items fast enough?
> - The "25 fresh picks a day" is aggressive — am I going to run out of
>   fresh *and interesting*?
> - Is the homepage doing too much? (5 tracks × previews + lead story)
>
> Would genuinely appreciate a brutal read of the homepage and one item
> page. Rip me apart.

---

## Cross-platform timing

| Day     | Platform                  | Post                       |
| ------- | ------------------------- | -------------------------- |
| Tue     | Product Hunt (12:01am PT) | Main launch                |
| Tue 9am | Show HN                   | Link to site, not PH       |
| Wed     | IndieHackers              | Longer "how I built it"    |
| Thu     | r/SideProject             | Casual, ask for roasts     |
| Ongoing | X/Bluesky/Pinterest       | Already publishing via SDK |

**Do not** cross-link the Show HN post to the Product Hunt page — HN
moderators deprioritize promo-stack posts. The HN post should stand on
its own technical merit.

---

## Reusable one-liners

Pick 3–5 for tweet/bsky/pin variants:

- *"Your morning feed has 14 AI hot-takes. Ours has a biologically
  immortal jellyfish, a hidden screenshot tool, and a $19 pocket
  notebook. Free, daily, no signup."*
- *"500+ hand-curated items. 5 tracks. 25 fresh picks each morning.
  Zero login walls."*
- *"RSS still works. We ship a per-category feed for every track. Point
  Feedly at surfaced-x.pages.dev/tools and it finds the right one."*
- *"Every item page has its own branded OG card, full Schema.org markup,
  and a permanent URL that never rots — even after rotation."*
- *"Surfaced is a static site with 549 pages that republishes itself
  every morning. $0/month. Free to read."*
