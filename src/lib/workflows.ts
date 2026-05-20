/**
 * Workflow recipes — Surfaced's novel feature. Each workflow stitches 3-5 real
 * tools from the catalog into a recipe for a specific goal. Stored statically
 * so they ship with the build and earn their own /workflows#anchor URL.
 *
 * Tool refs match daily-tools and hidden-gems slugs. If a referenced slug isn't
 * in the catalog yet, the renderer skips it gracefully and shows the remaining
 * steps — better than 404'ing or hiding the whole recipe.
 */

export interface WorkflowStep {
  /** slug of an existing hidden-gem or daily-tool (we look it up at render) */
  toolSlug?: string;
  /** Free-form name if no slug matches yet — still renders as a step */
  fallback?: string;
  /** Short editorial action verb for this step */
  action: string;
  /** Optional one-liner explaining the role */
  note?: string;
}

export interface Workflow {
  slug: string;
  goal: string;
  /** Persona / context this workflow is for */
  audience: string;
  /** Editorial one-liner — appears under the title */
  blurb: string;
  /** Hex tint for the workflow card / scene */
  tint: string;
  /** alcove kind to background this with */
  alcove: "writing" | "design" | "developer" | "ai" | "productivity" | "audio" | "data" | "marketing" | "social";
  steps: WorkflowStep[];
}

export const WORKFLOWS: Workflow[] = [
  {
    slug: "write-a-newsletter",
    goal: "Write a newsletter",
    audience: "Solo creators sending under 10k subscribers",
    blurb: "Draft, format, send, and grow — without a Substack overhead tax.",
    tint: "#f59e0b",
    alcove: "writing",
    steps: [
      { action: "Capture ideas", fallback: "Notion or Apple Notes", note: "Keep a running idea backlog. Anything works as long as you actually return to it." },
      { action: "Draft", fallback: "iA Writer or Bear", note: "Distraction-free markdown — your draft shouldn't fight you for attention." },
      { action: "Edit + tighten", fallback: "Hemingway Editor", note: "Free, browser-based, ruthless about sentence length." },
      { action: "Send", fallback: "Buttondown", note: "Markdown-native, no growth-hack UI, $9/mo for under 1k subs." },
      { action: "Track + iterate", fallback: "Plausible or Tinybird", note: "Light analytics — what got opened, what got clicked, no creep." },
    ],
  },
  {
    slug: "build-a-landing-page",
    goal: "Build a landing page",
    audience: "Builders who hate dragging boxes around",
    blurb: "Static, fast, and shipped before the kettle boils.",
    tint: "#22d3ee",
    alcove: "developer",
    steps: [
      { action: "Scaffold", fallback: "Astro or Next.js", note: "Astro for marketing, Next for anything dynamic." },
      { action: "Style", fallback: "Tailwind CSS", note: "Skip the design system debate — utility-first wins on speed." },
      { action: "Components", fallback: "shadcn/ui", note: "Copy/paste components you actually own and can edit." },
      { action: "Host", fallback: "Cloudflare Pages or Vercel", note: "Free tier covers anything under serious traffic." },
      { action: "Capture leads", fallback: "Buttondown or Formspree", note: "One POST handler, no third-party CRM lock-in." },
    ],
  },
  {
    slug: "edit-a-podcast",
    goal: "Edit a podcast",
    audience: "Hosts who want broadcast-grade without an engineer",
    blurb: "From raw track to publish-ready in an afternoon.",
    tint: "#fb7185",
    alcove: "audio",
    steps: [
      { action: "Record", fallback: "Riverside or Zencastr", note: "Local-track recording — internet glitches don't ruin the take." },
      { action: "Transcribe", fallback: "Whisper or AssemblyAI", note: "Edit by deleting text — best invention in podcasting since the popfilter." },
      { action: "Edit on text", fallback: "Descript", note: "Wraps Whisper transcription + word-level edits + filler removal." },
      { action: "Master", fallback: "Auphonic", note: "Free for 2hrs/mo. Loudness normalization, noise gate, EQ — all automatic." },
      { action: "Publish", fallback: "Transistor or Pinecast", note: "Flat rate, no per-episode revenue cut." },
    ],
  },
  {
    slug: "analyze-a-spreadsheet",
    goal: "Analyze a spreadsheet",
    audience: "PMs, ops, and analysts who think in rows and columns",
    blurb: "From messy CSV to chart you can actually defend.",
    tint: "#06b6d4",
    alcove: "data",
    steps: [
      { action: "Clean", fallback: "OpenRefine", note: "Open source. Fixes the duplicate-row, typo-in-column-7 problems that pivot tables can't." },
      { action: "Query", fallback: "DuckDB", note: "SQL on a single file. Runs anywhere, including in your browser." },
      { action: "Explore", fallback: "Rill or Observable", note: "Notebook-style — every chart shows the query that built it." },
      { action: "Chart", fallback: "Datawrapper", note: "Free, fast, and ships responsive embeds your team can drop into Slack." },
      { action: "Share", fallback: "A Notion page or static HTML", note: "Don't email a PDF — a link beats an attachment every time." },
    ],
  },
  {
    slug: "design-a-logo",
    goal: "Design a logo",
    audience: "Founders who want a real logo, not a Fiverr cliché",
    blurb: "Five steps from sketch to vector file your printer will accept.",
    tint: "#a855f7",
    alcove: "design",
    steps: [
      { action: "Mood-board", fallback: "Pinterest or Mymind", note: "Collect 15-20 references before drawing anything. Skip this and you'll converge to a generic answer." },
      { action: "Sketch", fallback: "Procreate or paper", note: "Cheap, fast, and the only way to find the idea." },
      { action: "Vectorize", fallback: "Figma or Affinity Designer", note: "Free for solo use. Stay in vector — your logo needs to print at billboard size." },
      { action: "Type pairing", fallback: "Use Modern Font Stacks", note: "Don't pay for a typeface for v1. System fonts look great when chosen well." },
      { action: "Hand off", fallback: "Export SVG + PNG@2x + favicon set", note: "Three files cover 95% of real-world uses." },
    ],
  },
  {
    slug: "ship-an-indie-saas",
    goal: "Ship an indie SaaS",
    audience: "Solo builders with one paying customer in mind",
    blurb: "Auth, payments, email, deploy — minimal stack that won't lock you in.",
    tint: "#34d399",
    alcove: "developer",
    steps: [
      { action: "Auth", fallback: "Clerk or Auth.js", note: "Don't roll your own. Use a managed provider until you have 1000 users." },
      { action: "DB + ORM", fallback: "Postgres + Drizzle", note: "Drizzle stays SQL-shaped. Easier to migrate off than Prisma when you outgrow it." },
      { action: "Payments", fallback: "Stripe", note: "Use Stripe Checkout, not Elements, until you need custom flows. One link = done." },
      { action: "Transactional email", fallback: "Resend or Postmark", note: "Resend's React Email templates make this 1 hr instead of 1 day." },
      { action: "Deploy", fallback: "Fly.io or Railway", note: "Postgres + app on the same provider — fewer moving parts than splitting hosts." },
    ],
  },
  {
    slug: "research-a-topic-deeply",
    goal: "Research a topic deeply",
    audience: "Anyone going past the first page of Google",
    blurb: "From shallow question to defensible position in a few hours.",
    tint: "#6366f1",
    alcove: "ai",
    steps: [
      { action: "Map the question", fallback: "Mymind or Heptabase", note: "Start with what you actually don't know. Three questions usually expand into 12." },
      { action: "Search smartly", fallback: "Perplexity, Kagi, or scholar.google.com", note: "Kagi's filters cut SEO chaff. Scholar surfaces primary sources." },
      { action: "Capture sources", fallback: "Zotero", note: "Free, syncs, and exports citations in any format." },
      { action: "Synthesize", fallback: "Heptabase or Notion", note: "Cards / pages with one claim each. Connect them to find the argument." },
      { action: "Pressure-test", fallback: "Claude or ChatGPT", note: "Paste your draft, ask for the strongest counter-argument. Often catches the thing you skipped." },
    ],
  },
  {
    slug: "track-personal-finance",
    goal: "Track personal finance",
    audience: "People tired of Mint shutting down",
    blurb: "A privacy-respecting money stack that doesn't sell your transactions.",
    tint: "#10b981",
    alcove: "ai",
    steps: [
      { action: "Aggregate accounts", fallback: "Monarch or Copilot Money", note: "Both are paid but neither sells data. Worth the $15/mo over free trackers." },
      { action: "Budget by envelope", fallback: "YNAB or Actual Budget", note: "Actual is open-source and self-hostable if you want to fully own the data." },
      { action: "Tax track", fallback: "Wave or Quickbooks Self-Employed", note: "If freelance — categorize once a month, not once a year." },
      { action: "Investing", fallback: "Wealthfront or Vanguard", note: "Set it and ignore. Stop checking. Compound interest needs boredom." },
      { action: "Net worth ledger", fallback: "Kubera or a Google Sheet", note: "Monthly snapshot. The graph alone changes behavior." },
    ],
  },
  {
    slug: "learn-something-hard",
    goal: "Learn something hard",
    audience: "Adults teaching themselves a new domain",
    blurb: "How to actually retain it — not just feel productive.",
    tint: "#22d3ee",
    alcove: "developer",
    steps: [
      { action: "Pick a project", fallback: "Anything that scares you a little", note: "Don't pick a course. Pick a thing you want to build or write. The course finds you." },
      { action: "Foundation lecture", fallback: "MIT OCW, 3Blue1Brown, fast.ai", note: "Free, taught by people who actually do the work. Two hours of these beats a $200 Udemy." },
      { action: "Active recall", fallback: "Anki", note: "Twenty minutes a day. The unsexy answer that actually works." },
      { action: "Office hours", fallback: "Discord communities, indie hackers Slack", note: "When you're stuck, ask a human. Reading more articles is procrastination dressed up as study." },
      { action: "Ship something", fallback: "Public GitHub repo or blog post", note: "Teaching forces understanding. Even a half-finished writeup is a forcing function." },
    ],
  },
  {
    slug: "make-a-short-film",
    goal: "Make a short film",
    audience: "Solo creators with a phone and a vision",
    blurb: "Pre-pro to final cut without a production budget.",
    tint: "#fb7185",
    alcove: "design",
    steps: [
      { action: "Storyboard", fallback: "Boords or pen and paper", note: "Six panels for a three-minute film is enough. Don't over-plan." },
      { action: "Shot list", fallback: "Shot Lister or a Google Sheet", note: "Group by location, not by scene. Saves hours on set." },
      { action: "Color grade", fallback: "DaVinci Resolve", note: "Free, used on Hollywood films. Resolve's color tools are best in class at any price." },
      { action: "Edit", fallback: "DaVinci Resolve (same app) or CapCut", note: "Resolve if you want pro. CapCut if you want fast. Both are free." },
      { action: "Distribute", fallback: "YouTube + Vimeo + a personal page", note: "YouTube for reach. Vimeo for portfolio. Your own page so you control the URL forever." },
    ],
  },
  {
    slug: "run-a-discord-community",
    goal: "Run a Discord community",
    audience: "Hosts who want a real space, not just a chat",
    blurb: "Setup that scales from 50 to 5,000 without becoming a janitorial job.",
    tint: "#8b5cf6",
    alcove: "social",
    steps: [
      { action: "Server scaffold", fallback: "Discord Templates by Common Room", note: "Don't design your channels from scratch. Use a battle-tested template, then prune." },
      { action: "Onboarding", fallback: "Wick or MEE6", note: "Verified roles + welcome DM. Cuts spam by 90% and makes new members feel seen." },
      { action: "Threaded discussion", fallback: "Discord's built-in Forum channels", note: "Skip if your community is under 200. Use it once activity gets messy." },
      { action: "Light moderation", fallback: "Carl-bot or Wick", note: "Auto-mod on slurs, repeated message spam, and link suspicious patterns. Don't try to catch everything manually." },
      { action: "Rituals", fallback: "Show-and-tell channel + weekly recap", note: "Communities die without rituals. Two recurring activities = enough." },
    ],
  },
  {
    slug: "build-a-portfolio-site",
    goal: "Build a portfolio site",
    audience: "Designers, writers, devs who hate the standard template",
    blurb: "Personal site that feels like you, not like Squarespace.",
    tint: "#fbbf24",
    alcove: "writing",
    steps: [
      { action: "Strip to one page", fallback: "Index card with three sections", note: "Most portfolios fail by trying to be everything. One page, three sections, done." },
      { action: "Pick a template you can edit", fallback: "Astro Paper or Nextra", note: "Markdown-first, easy to fork, deploys free. Squarespace traps you in their editor." },
      { action: "Real type choices", fallback: "Use a Modern Font Stack", note: "Spend a Saturday on type. System font + one accent face beats a $99 premium font you never customize." },
      { action: "Three case studies", fallback: "One paragraph each", note: "Problem + your move + outcome. Skip the process diagrams. Hiring managers skim." },
      { action: "Personal domain", fallback: "Hover or Cloudflare Registrar", note: "Avoid GoDaddy. $12/year for your name dot com is the cheapest career investment." },
    ],
  },
];

export function getWorkflow(slug: string): Workflow | undefined {
  return WORKFLOWS.find((w) => w.slug === slug);
}
