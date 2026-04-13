# SURFACED PLATFORM — COMPLETE UPGRADE PROMPT

## STEP 1: Load the Data

Run the setup script that was placed in your project root. It creates a `data/` directory with 6 JSON files containing 320 structured content items:

```bash
bash setup-data.sh
```

This creates:
- `data/discoveries.json` — 60 fascinating discoveries
- `data/products.json` — 75 trending products with price ranges
- `data/hidden-gems.json` — 75 lesser-known websites/tools
- `data/future-radar.json` — 50 emerging technologies
- `data/daily-tools.json` — 60 useful online tools
- `data/categories.json` — section metadata with colors and icons

---

## STEP 2: Replace Placeholder/Dummy Data with Real Data

The current Surfaced build uses placeholder or minimal data. Replace ALL data sources across the entire app with imports from the JSON files in `data/`. Every page, every card grid, every listing, every filter must pull from these real datasets.

### Data Schema Reference

**discoveries.json** items:
```json
{ "id": 1, "slug": "octopuses-have-three-hearts-and-blue-blood", "title": "...", "shortDescription": "...", "category": "Science", "whyItIsInteresting": "...", "imageIdea": "...", "sourceLink": "...", "type": "discovery" }
```

**products.json** items:
```json
{ "id": 1, "slug": "oura-ring-4-smart-health-ring", "title": "...", "shortDescription": "...", "category": "Wearables", "whyItIsInteresting": "...", "imageIdea": "...", "sourceLink": "...", "estimatedPriceRange": "$299–$349", "type": "product" }
```

**hidden-gems.json** items:
```json
{ "id": 1, "slug": "excalidraw", "name": "...", "whatItDoes": "...", "category": "Design", "whyItIsUseful": "...", "websiteLink": "https://excalidraw.com", "type": "hidden-gem" }
```

**future-radar.json** items:
```json
{ "id": 1, "slug": "solid-state-batteries", "techName": "...", "explanation": "...", "industry": "Energy", "whyItMatters": "...", "developmentStage": "Early Commercialization", "type": "future-tech" }
```

**daily-tools.json** items:
```json
{ "id": 1, "slug": "notion", "toolName": "...", "whatItDoes": "...", "category": "Productivity", "whyItIsUseful": "...", "websiteLink": "https://www.notion.so", "type": "tool" }
```

---

## STEP 3: Upgrade the Homepage

The homepage should be the most engaging page on the site. Implement this exact section layout:

### 3A. Hero Section
- Headline: "Discover What's Worth Knowing Today"
- Subtitle: "Fascinating discoveries, trending products, hidden internet gems, future technology, and useful tools — curated daily."
- Animated counter that counts up to "320+ Discoveries" on page load
- Today's date formatted nicely (e.g., "Sunday, April 5, 2026")
- Search bar with placeholder: "Search 320+ discoveries, products, tools..."
- Background: subtle gradient or mesh pattern, not a solid color

### 3B. Category Navigation Strip
- Horizontal scrollable row of category pills/chips
- 5 categories with icons and item counts:
  - 🔮 Discoveries (60)
  - 📈 Trending Products (75)
  - 💎 Hidden Gems (75)
  - 🔭 Future Radar (50)
  - 🛠 Daily Tools (60)
- Each pill links to its section page
- Sticky behavior: pins to top on scroll (below header)
- Color-coded: Indigo, Emerald, Amber, Cyan, Rose

### 3C. "Today's Top Picks" Featured Row
- 5 handpicked items (1 from each category) in large featured cards
- Each card shows category badge, title, 2-line description, and a CTA
- Horizontally scrollable on mobile, grid on desktop
- Pick items that are particularly compelling (e.g., "Octopuses Have Three Hearts", "Oura Ring 4", "Excalidraw", "Solid-State Batteries", "Notion")

### 3D. Mixed Discovery Feed (Main Content Grid)
- Pinterest-style masonry grid mixing items from ALL categories
- Show 24 items initially, load 12 more on "Load More" click or infinite scroll
- Each card: category color badge, title, 1-line description, "Explore →" link
- Hover: card lifts (translateY -4px), shadow deepens, full description fades in
- Cards link to individual item detail pages at `/item/[slug]`

### 3E. Category Preview Sections
After the mixed feed, show 5 horizontal scroll rows — one per category:
- Section header: "[Category Name]" with "See All →" link
- 8 cards per row, horizontally scrollable
- Cards match the style for that category type

### 3F. Newsletter CTA (Mid-page)
- Full-width banner with dark/gradient background
- "Get the best discoveries in your inbox every morning"
- Email input + "Subscribe" button
- "Join 10,000+ curious minds" social proof text

### 3G. Discovery Streak Widget
- Small persistent element in the header or hero
- Shows: "🔥 Day [N] streak — [X] new discoveries since your last visit"
- Uses localStorage to track daily visits and streak count
- Resets at midnight local time

### 3H. Footer
- 5 columns: one for each category with top 5 item links
- Newsletter signup (compact)
- "About · Privacy · Terms · Affiliate Disclosure"
- "Built for the endlessly curious" tagline

---

## STEP 4: Build Individual Item Detail Pages

Create a dynamic route at `/item/[slug]` that renders full detail pages for every item across all 5 datasets (320 total pages).

### Detail Page Layout:
- Back button: "← Back to [Category]"
- Category badge (color-coded)
- Large title (h1)
- Full description (shortDescription or whatItDoes)
- "Why It's Interesting/Useful/Important" section (whyItIsInteresting, whyItIsUseful, or whyItMatters)
- For products: price range badge
- For hidden gems & tools: "Visit Website →" button linking to websiteLink
- For future tech: development stage progress indicator (Early Research → Advanced Research → Prototype → Early Commercialization → Growth Phase)
- For products: "Check Price →" button with `rel="sponsored noopener"` and `data-affiliate="true"`
- Image placeholder area using the imageIdea text as alt text
- "Related Discoveries" section showing 4 items from the same category
- Social share buttons (Twitter, Facebook, LinkedIn, Copy Link)
- SEO: unique title tag, meta description, Open Graph tags per item

### URL examples:
- `/item/octopuses-have-three-hearts-and-blue-blood`
- `/item/oura-ring-4-smart-health-ring`
- `/item/excalidraw`
- `/item/solid-state-batteries`
- `/item/notion`

---

## STEP 5: Upgrade Category Listing Pages

Each category page (/discover, /trending, /hidden-gems, /future-radar, /tools) should:

1. Pull ALL items from the corresponding JSON file
2. Show a header with category name, icon, description, and item count
3. Display a filterable grid of all items
4. Add sub-category filter chips (e.g., for Discoveries: Science, Innovation, Culture, Global, Statistics, Nature, Space, History, Psychology, Technology)
5. Add sort options: Default, A-Z, Category
6. Include a search/filter bar that filters items in real-time as user types

---

## STEP 6: Implement Global Search

- Cmd/Ctrl+K shortcut opens a search modal
- Search bar in the header also triggers the modal
- Searches across ALL 320 items from all 5 datasets
- Shows results grouped by category
- Real-time filtering as user types (client-side, no API needed)
- Each result shows: category badge, title, 1-line description
- Click result → navigate to `/item/[slug]`
- Show "No results" state with suggestion: "Try searching for AI, gadgets, tools, science..."

---

## STEP 7: Implement Engagement Features

### 7A. Bookmark/Save System
- Heart or bookmark icon on every card
- Click to save; saved state persists in localStorage
- Create a `/saved` page that shows all bookmarked items
- Show saved count in the header: "♡ 12"
- "Export Saved" button that generates a shareable URL or copies a text list

### 7B. "Surprise Me" Random Discovery
- Button in the header or as a floating action button
- Clicking it picks a random item from all 320 and navigates to its detail page
- Add a fun micro-animation (dice roll, sparkle, etc.)

### 7C. Discovery Streak (localStorage)
```javascript
// Pseudocode for streak tracking
const today = new Date().toDateString();
const lastVisit = localStorage.getItem('lastVisitDate');
let streak = parseInt(localStorage.getItem('streak') || '0');

if (lastVisit === today) {
  // Same day, do nothing
} else if (lastVisit === yesterday(today)) {
  streak += 1;
} else {
  streak = 1; // Reset
}
localStorage.setItem('lastVisitDate', today);
localStorage.setItem('streak', streak.toString());
```

### 7D. Share Cards
- Every card and detail page has a share button
- Pre-populated share text: "Just discovered [title] on Surfaced — [shortDescription] → [URL]"
- Share targets: Twitter/X, Facebook, LinkedIn, Copy Link
- Copy Link shows a brief "Copied!" toast notification

---

## STEP 8: SEO Optimization

- Every page: unique `<title>` and `<meta name="description">`
- Every item detail page: Open Graph tags (og:title, og:description, og:type, og:url)
- Twitter Card meta tags (twitter:card, twitter:title, twitter:description)
- JSON-LD structured data (Article schema) on each detail page
- Generate a `sitemap.xml` at build time listing all 320+ item pages plus category pages
- Clean `robots.txt` allowing full crawling
- Semantic HTML: `<article>`, `<nav>`, `<main>`, `<section>`, proper heading hierarchy

---

## STEP 9: Monetization Pre-wiring

- **Product cards**: All "Check Price" or "Shop" CTAs use `<a rel="sponsored noopener" data-affiliate="true" target="_blank">`
- **Tool/gem cards**: "Visit" links use `<a rel="noopener" data-outbound="true" target="_blank">`
- **Ad zones**: Place commented placeholder divs in these locations:
  - `<!-- AD_ZONE: homepage-between-sections -->` between homepage sections 3D and 3E
  - `<!-- AD_ZONE: sidebar -->` on category listing pages (desktop only)
  - `<!-- AD_ZONE: detail-page-bottom -->` below related items on detail pages
  - `<!-- AD_ZONE: footer-banner -->` above the footer
- **Newsletter capture**: Email input on homepage (section 3F), on every category page header, in the footer, and on `/newsletter`
- **Sponsored card style**: Create a card variant with a subtle "Sponsored" badge — not used yet, but ready in the component library

---

## STEP 10: Visual Polish

### Color System (already dark-first from V1, enhance):
- Category color coding on ALL cards and badges:
  - Discoveries: Indigo (#6366F1)
  - Products: Emerald (#10B981)
  - Hidden Gems: Amber (#F59E0B)
  - Future Radar: Cyan (#06B6D4)
  - Daily Tools: Rose (#F43F5E)

### Card Hover Effects:
```css
.card {
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}
```

### Scroll Animations:
- Cards fade in + slide up when they enter the viewport (IntersectionObserver)
- Stagger the animation so cards appear in sequence, not all at once
- Keep animations subtle: 300ms duration, ease-out timing

### Loading States:
- Skeleton card placeholders while data loads
- Skeleton matches the card dimensions and layout

### Responsive Breakpoints:
- Mobile (< 640px): 1 column grid, horizontal scroll for category preview rows
- Tablet (640-1024px): 2 column grid
- Desktop (1024-1280px): 3 column grid
- Wide (> 1280px): 4 column grid

---

## STEP 11: Quality Verification

After all changes, verify:
- [ ] All 320 items render correctly on their respective category pages
- [ ] All 320 items have working detail pages at `/item/[slug]`
- [ ] Homepage shows mixed content from all 5 categories
- [ ] Category filtering works on each listing page
- [ ] Sub-category chips filter correctly
- [ ] Global search (Cmd+K) finds items from all categories
- [ ] Bookmark system saves and retrieves correctly
- [ ] "Surprise Me" navigates to a random item
- [ ] Streak counter increments on daily visits
- [ ] Share buttons generate correct pre-populated text
- [ ] Mobile layout looks clean at 375px width
- [ ] All external links open in new tabs
- [ ] Product links have rel="sponsored noopener"
- [ ] Newsletter email inputs are functional (capture to localStorage minimum)
- [ ] No console errors
- [ ] Build succeeds without errors (`npm run build`)

---

## SUMMARY OF CHANGES

| What | Before | After |
|------|--------|-------|
| Content items | Placeholder/minimal | 320 real structured items |
| Data source | Hardcoded | JSON files in data/ |
| Item detail pages | None or limited | 320 unique pages with SEO |
| Search | None | Global Cmd+K search across all items |
| Bookmarks | None | Save/unsave with localStorage |
| Random discovery | None | "Surprise Me" button |
| Streak tracking | None | Daily visit streak counter |
| Social sharing | None | Per-card and per-page share buttons |
| SEO | Basic | Full meta tags, OG, JSON-LD, sitemap |
| Affiliate pre-wiring | None | rel="sponsored", data attributes, ad zones |
| Homepage sections | Basic | 8 distinct sections with real data |
| Filtering | Basic | Sub-category chips + real-time search |

Begin with Step 1 (run setup-data.sh), then work through each step in order. The JSON data files are self-contained — no API calls needed.
