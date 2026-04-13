"use client";

import {
  discoveries,
  products,
  hiddenGems,
  futureRadar,
  dailyTools,
  categories,
  getItemTitle,
  getItemDescription,
  getCategoryColor,
  getCategoryLabel,
  type AnyItem,
} from "@/lib/data";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { StreakWidget } from "@/components/ui/StreakWidget";
import { SurpriseMe } from "@/components/ui/SurpriseMe";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { ItemImage } from "@/components/ui/ItemImage";
import { SocialCTA } from "@/components/SocialCTA";
import { ShareTodaysPicks } from "@/components/ui/ShareTodaysPicks";
import { TodayDate } from "@/components/ui/TodayDate";
import Link from "next/link";

/* ---- Helpers ---- */

const shortCategoryNames: Record<string, string> = {
  "Trending Products": "Trending",
  "Future Radar": "Future",
  "Daily Tools": "Tools",
};

function getItemsForCategory(key: string): AnyItem[] {
  switch (key) {
    case "discoveries":
      return discoveries;
    case "products":
      return products;
    case "hidden-gems":
      return hiddenGems;
    case "future-radar":
      return futureRadar;
    case "daily-tools":
      return dailyTools;
    default:
      return [];
  }
}

const categoryPillColors: Record<string, string> = {
  indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30 hover:bg-indigo-500/30",
  emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/30",
  amber: "bg-amber-500/20 text-amber-300 border-amber-400/30 hover:bg-amber-500/30",
  cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30 hover:bg-cyan-500/30",
  rose: "bg-rose-500/20 text-rose-300 border-rose-400/30 hover:bg-rose-500/30",
};

function accentBar(type: string): string {
  const c = getCategoryColor(type);
  const m: Record<string, string> = {
    emerald: "from-emerald-500/60 to-emerald-500/0",
    cyan: "from-cyan-500/60 to-cyan-500/0",
    amber: "from-amber-500/60 to-amber-500/0",
    rose: "from-rose-500/60 to-rose-500/0",
    indigo: "from-indigo-500/60 to-indigo-500/0",
  };
  return `bg-gradient-to-r ${m[c] || m.indigo}`;
}

/* ---- Page Component ---- */

export default function HomePage() {
  const totalItems = discoveries.length + products.length + hiddenGems.length + futureRadar.length + dailyTools.length;

  /* Cmd+K trigger */
  const openSearch = () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true })
    );
  };

  /* What Surfaced Today — 5 standout daily picks */
  const editorsPick = discoveries[0];
  const topPicksRest: AnyItem[] = [
    products[0],
    hiddenGems[0],
    futureRadar[0],
    dailyTools[0],
  ];

  /* Slugs already shown — exclude from category sections */
  const shownSlugs = new Set([editorsPick.slug, ...topPicksRest.map(i => i.slug)]);

  return (
    <>
      {/* ============================================
          HERO
          ============================================ */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/[0.09] blur-[120px] pointer-events-none" />
        <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan/[0.07] blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-amber/[0.06] blur-[100px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Breathing rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
          <div className="w-[600px] h-[600px] rounded-full border border-accent/[0.06] animate-breathe" />
          <div className="absolute inset-8 rounded-full border border-cyan/[0.05] animate-breathe" style={{ animationDelay: "1s" }} />
          <div className="absolute inset-16 rounded-full border border-accent/[0.04] animate-breathe" style={{ animationDelay: "2s" }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Date + Streak row */}
          <div className="flex items-center justify-center gap-4 mb-6 animate-fade-in">
            <span className="text-xs sm:text-sm text-muted tracking-wide">
              {<TodayDate />}
            </span>
            <StreakWidget />
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in-up">
            <span className="text-foreground">Discover What&rsquo;s </span>
            <span className="gradient-text">Worth Knowing</span>
            <span className="text-foreground"> Today</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            The internet is infinite. We read all of it so you don&apos;t have
            to — five categories, zero noise, updated every morning.
          </p>

          {/* Counter + Search row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            {/* Counter badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-sm gradient-border">
              <span className="font-mono font-bold text-accent tabular-nums">
                {totalItems}+
              </span>
              <span className="text-muted">Discoveries</span>
            </div>

            {/* Search trigger */}
            <button
              onClick={openSearch}
              className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-surface border border-border text-sm text-muted hover:border-accent/30 hover:text-foreground transition-all cursor-pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-muted-foreground group-hover:text-accent transition-colors"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Search discoveries...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-[10px] font-mono text-muted-foreground">
                <span className="text-xs">&#8984;</span>K
              </kbd>
            </button>
          </div>

          {/* Live status indicator */}
          <div className="flex items-center justify-center gap-2 mt-6 animate-fade-in" style={{ animationDelay: "0.35s" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald" />
            </span>
            <span className="text-xs text-muted-foreground">Updated today &middot; Next edition tomorrow at 8am</span>
          </div>
        </div>
      </section>

      {/* ============================================
          CATEGORY NAVIGATION STRIP
          ============================================ */}
      <section className="pb-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center sm:flex-wrap">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                href={cat.path}
                className={`snap-start shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-[13px] font-semibold transition-all ${
                  categoryPillColors[cat.color] || categoryPillColors.indigo
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span>
                  <span className="sm:hidden">{shortCategoryNames[cat.name] || cat.name}</span>
                  <span className="hidden sm:inline">{cat.name}</span>
                  {" "}
                  <span className="opacity-60">({cat.count})</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          WHAT SURFACED TODAY — Daily Editorial Roundup
          ============================================ */}
      <section className="relative pb-20 px-4 sm:px-6">
        {/* Subtle editorial backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.03] via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-[90rem] mx-auto">
          <div className="glow-line mb-10" />

          {/* Edition header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                  </span>
                  Today&rsquo;s Edition
                </span>
                <span className="text-xs text-muted-foreground">{<TodayDate />}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                What Surfaced Today
              </h2>
              <p className="text-sm text-muted mt-1 hidden sm:block">
                5 standout finds from across the internet
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 shrink-0">
              <ShareTodaysPicks />
              <Link
                href="/newsletter"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
              >
                Get tomorrow&rsquo;s picks <span>&rarr;</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
            {/* Lead story — large card */}
            <div className="sm:col-span-2 xl:row-span-2 gradient-border relative group flex flex-col bg-surface border border-border rounded-2xl card-hover-glow overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-[3px] z-10 ${accentBar(editorsPick.type)}`} />
              <div className="overflow-hidden">
                <ItemImage slug={editorsPick.slug} alt={getItemTitle(editorsPick)} size="lg" className="group-hover:scale-[1.03] transition-transform duration-500" />
              </div>
              <div className="p-7 sm:p-8 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-accent bg-accent/15 border border-accent/20 px-2.5 py-1 rounded-full">
                    &#9733; Lead
                  </span>
                  <CategoryBadge
                    label={getCategoryLabel(editorsPick.type)}
                    color={getCategoryColor(editorsPick.type)}
                  />
                </div>
                <BookmarkButton slug={editorsPick.slug} />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-snug mb-3 group-hover:text-accent transition-colors">
                {getItemTitle(editorsPick)}
              </h3>

              <p className="text-sm sm:text-base text-muted leading-relaxed mb-6 line-clamp-4 flex-1">
                {getItemDescription(editorsPick)}
              </p>

              <Link
                href={`/item/${editorsPick.slug}`}
                className="inline-flex items-center gap-2.5 text-sm font-semibold text-accent hover:text-accent-hover transition-colors mt-auto"
              >
                Read the full story
                <span className="transition-transform group-hover:translate-x-1 text-base">
                  &rarr;
                </span>
              </Link>
              </div>
            </div>

            {/* 4 supporting picks */}
            {topPicksRest.map((item, i) => (
              <div
                key={item.slug}
                className="relative group flex flex-col bg-surface border border-border rounded-2xl card-hover-glow overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                <div className="overflow-hidden">
                  <ItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="md" className="group-hover:scale-[1.03] transition-transform duration-500" />
                </div>
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-accent/50 tabular-nums">0{i + 2}</span>
                    <CategoryBadge
                      label={getCategoryLabel(item.type)}
                      color={getCategoryColor(item.type)}
                    />
                  </div>
                  <BookmarkButton slug={item.slug} />
                </div>

                <h3 className="text-base font-semibold text-foreground leading-snug mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                  {getItemTitle(item)}
                </h3>

                <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2 flex-1">
                  {getItemDescription(item)}
                </p>

                <Link
                  href={`/item/${item.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors mt-auto"
                >
                  Explore
                  <span className="transition-transform group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Inline newsletter nudge */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-surface-elevated/50 border border-border/60">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">Tomorrow&rsquo;s edition</span>{" "}
              &mdash; 5 new finds delivered free every morning
            </p>
            <div className="shrink-0 w-full sm:w-auto">
              <NewsletterForm variant="minimal" data-capture-location="homepage" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          CATEGORY PREVIEW SECTIONS
          ============================================ */}
      {categories.map((cat) => {
        const items = getItemsForCategory(cat.key).filter(i => !shownSlugs.has(i.slug)).slice(0, 6);
        return (
          <section key={cat.key} className="pb-18 px-4 sm:px-6">
            <div className="max-w-[90rem] mx-auto">
              {/* Section header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {cat.name}
                  </h2>
                </div>
                <Link
                  href={cat.path}
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-accent transition-colors link-underline"
                >
                  See All <span>&rarr;</span>
                </Link>
              </div>

              {/* Horizontal scroll row */}
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                {items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/item/${item.slug}`}
                    className="snap-start shrink-0 w-[300px] sm:w-[320px] group"
                  >
                    <div className="flex flex-col bg-surface border border-border rounded-xl card-hover-glow h-full overflow-hidden relative">
                      <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                      <div className="overflow-hidden">
                        <ItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                      <CategoryBadge
                        label={getCategoryLabel(item.type)}
                        color={getCategoryColor(item.type)}
                        className="mb-3 self-start"
                      />
                      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-accent transition-colors">
                        {getItemTitle(item)}
                      </h3>
                      <p className="text-xs text-muted leading-relaxed line-clamp-1">
                        {getItemDescription(item)}
                      </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* ============================================
          NEWSLETTER CTA
          ============================================ */}
      <section className="section-divider relative py-24 sm:py-32 px-4 sm:px-6 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.04] via-surface to-background pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-accent/[0.06] blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4">
            Get the best discoveries in your inbox every morning
          </h2>
          <p className="text-muted text-sm sm:text-base mb-8">
            Join thousands of curious readers — free, every weekday
          </p>
          <div className="flex justify-center">
            <NewsletterForm />
          </div>
          <p className="mt-3 text-xs text-muted-foreground/60">No spam, ever. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* ============================================
          SOCIAL CTA
          ============================================ */}
      <section className="pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <SocialCTA />
        </div>
      </section>

      {/* ============================================
          SURPRISE ME FAB
          ============================================ */}
      <SurpriseMe variant="fab" />
    </>
  );
}
