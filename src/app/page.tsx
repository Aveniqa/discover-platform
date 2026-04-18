"use client";

import { useState, useEffect } from "react";
import {
  discoveries,
  products,
  hiddenGems,
  futureRadar,
  dailyTools,
  categories,
  getAllItems,
  getItemTitle,
  getItemDescription,
  getCategoryColor,
  getCategoryLabel,
  type AnyItem,
} from "@/lib/data";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { getStreakMilestone } from "@/components/ui/StreakWidget";
import { SurpriseMe } from "@/components/ui/SurpriseMe";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { ItemImage } from "@/components/ui/ItemImage";
import { Carousel } from "@/components/ui/Carousel";
import { SocialCTA } from "@/components/SocialCTA";
import { ShareTodaysPicks } from "@/components/ui/ShareTodaysPicks";
import { TodayDate } from "@/components/ui/TodayDate";
import { HeroShowcase } from "@/components/ui/HeroShowcase";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { AnimatedHeroBackground } from "@/components/ui/AnimatedHeroBackground";
import { NewTodayRibbon, SignalScore, getItemSignals } from "@/components/ui/ItemSignals";
import { getStreak } from "@/lib/engagement";
import { todaysPicks } from "@/lib/data";
import Link from "next/link";

/* ---- Helpers ---- */

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

/** Returns true if the item's id is among the 3 highest in its category array */
function isNewToday(item: AnyItem, categoryItems: AnyItem[]): boolean {
  const sorted = [...categoryItems].sort((a, b) => (b.id || 0) - (a.id || 0));
  const top3 = sorted.slice(0, 3).map((i) => i.id);
  return top3.includes(item.id);
}

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
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [streakEmoji, setStreakEmoji] = useState("");

  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  useEffect(() => {
    const days = getStreak();
    setStreakDays(days);
    const milestone = getStreakMilestone(days);
    if (milestone) setStreakEmoji(milestone.emoji);
    if (!milestone) return;
    const lastShown = localStorage.getItem("surfaced-streak-milestone-shown");
    if (lastShown === String(milestone.days)) return;
    localStorage.setItem("surfaced-streak-milestone-shown", String(milestone.days));
    setMilestoneToast(`${milestone.emoji} ${milestone.label} — ${days}-day streak!`);
    const t = setTimeout(() => setMilestoneToast(null), 4000);
    return () => clearTimeout(t);
  }, []);

  /* Trending This Week — badged items, newest first (12 for carousel) */
  const trendingItems = [...getAllItems()]
    .filter((i) => !!(i as { badge?: string }).badge)
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 12);

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
      {/* ── Streak milestone toast ──────────────────────── */}
      {milestoneToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-sm font-semibold shadow-xl backdrop-blur animate-fade-in-up whitespace-nowrap">
          {milestoneToast}
        </div>
      )}

      {/* ============================================
          HERO — Visual showcase + compact headline
          ============================================ */}
      <section className="relative pt-6 sm:pt-10 pb-8 sm:pb-12 overflow-hidden">
        <AnimatedHeroBackground />

        {/* Streak badge */}
        {streakDays > 0 && (
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm">
              {streakEmoji || "🔥"} Day {streakDays} streak
            </span>
          </div>
        )}

        {/* Compact headline above the showcase — kinetic typography */}
        <div className="relative text-center mb-6 sm:mb-8 px-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-2">
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: "40ms", animationFillMode: "both" }}>
              Discover
            </span>{" "}
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: "180ms", animationFillMode: "both" }}>
              something
            </span>{" "}
            <span
              className="inline-block gradient-text animate-fade-in-up"
              style={{
                animationDelay: "320ms",
                animationFillMode: "both",
                backgroundSize: "200% 200%",
                animation: "fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 320ms both, gradient-shift 6s ease-in-out 1.2s infinite",
              }}
            >
              remarkable
            </span>
          </h1>
          <p
            className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto animate-fade-in-up"
            style={{ animationDelay: "480ms", animationFillMode: "both" }}
          >
            Products, hidden gems, future tech, and discoveries — refreshed daily
          </p>
        </div>

        {/* Image showcase carousel — hover to enlarge */}
        <HeroShowcase />

        {/* Newsletter + Stats — below the showcase */}
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 mt-8">
          <div className="max-w-md mx-auto mb-4">
            <NewsletterForm />
          </div>
          <p className="text-xs text-muted-foreground text-center mb-6">Join free — no spam, unsubscribe anytime</p>

          <div className="flex items-center justify-center gap-6 sm:gap-10 pt-5 border-t border-border/50">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">
                <AnimatedCounter value={totalItems} suffix="+" />
              </p>
              <p className="text-xs text-muted-foreground">Curated items</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">
                <AnimatedCounter value={5} />
              </p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">
                <AnimatedCounter value={25} />
              </p>
              <p className="text-xs text-muted-foreground">New daily</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search strip */}
      <section className="pb-6 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <button
            onClick={openSearch}
            className="group w-full inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-surface border border-border text-sm text-muted hover:border-accent/30 hover:text-foreground transition-all cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground group-hover:text-accent transition-colors shrink-0">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="flex-1 text-left">Search {totalItems}+ discoveries...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-[10px] font-mono text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>
      </section>

      {/* ============================================
          TRENDING THIS WEEK — badged items
          ============================================ */}
      {trendingItems.length > 0 && (
        <ScrollReveal>
        <section className="pb-6 sm:pb-10 px-4 sm:px-6 border-b border-border/50">
          <div className="max-w-[90rem] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Trending This Week</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Editor&rsquo;s picks and top finds</p>
              </div>
              <Link href="/trending" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-accent transition-colors link-underline">See all <span>&rarr;</span></Link>
            </div>
            <Carousel
              items={trendingItems}
              renderCard={(item, idx) => {
                const { source, score, fresh } = getItemSignals(item);
                const badge = (item as { badge?: string }).badge;
                return (
                <Link href={`/item/${item.slug}`} className="group block w-full">
                  <div className="flex flex-col bg-surface border border-border rounded-xl card-hover-glow h-full overflow-hidden relative">
                    <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                    <div className="overflow-hidden relative">
                      <ItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="sm" priority={idx < 4} className="group-hover:scale-[1.03] transition-transform duration-500" />
                      <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
                        {fresh && <NewTodayRibbon />}
                        {!!badge && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded-full">
                            {badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <CategoryBadge label={getCategoryLabel(item.type)} color={getCategoryColor(item.type)} />
                        <SignalScore source={source} score={score} />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-accent transition-colors">
                        {getItemTitle(item)}
                      </h3>
                      <p className="text-xs text-muted leading-relaxed line-clamp-1">
                        {getItemDescription(item)}
                      </p>
                    </div>
                  </div>
                </Link>
                );
              }}
            />
          </div>
        </section>
        </ScrollReveal>
      )}

      {/* ============================================
          CATEGORY QUICK-ACCESS CARDS
          ============================================ */}
      <ScrollReveal>
      <section className="py-4 sm:py-8 px-4 sm:px-6">
        <div className="max-w-[90rem] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Discoveries", href: "/discover", emoji: "🔮", count: discoveries.length, color: "from-purple-500/20 to-transparent" },
              { label: "Products", href: "/trending", emoji: "📈", count: products.length, color: "from-green-500/20 to-transparent" },
              { label: "Hidden Gems", href: "/hidden-gems", emoji: "💎", count: hiddenGems.length, color: "from-amber-500/20 to-transparent" },
              { label: "Future Tech", href: "/future-radar", emoji: "🔭", count: futureRadar.length, color: "from-blue-500/20 to-transparent" },
              { label: "Daily Tools", href: "/tools", emoji: "🛠️", count: dailyTools.length, color: "from-rose-500/20 to-transparent" },
            ].map((cat, i) => (
              <Link key={cat.href} href={cat.href}
                className={`p-4 rounded-xl bg-gradient-to-br ${cat.color} border border-border/50 hover:border-accent/30 hover:-translate-y-0.5 transition-all group animate-fade-in-up`}
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}>
                <span className="text-2xl inline-block transition-transform group-hover:scale-110">{cat.emoji}</span>
                <p className="font-semibold mt-2 text-sm group-hover:text-accent transition-colors">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.count} items</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ============================================
          TODAY'S PICKS — Newest from each category
          ============================================ */}
      <ScrollReveal>
      <section className="pb-6 sm:pb-10 px-4 sm:px-6">
        <div className="max-w-[90rem] mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Today&rsquo;s Picks</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Freshest from each category</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {todaysPicks.map((pick) => {
              const colorMap: Record<string, string> = {
                discovery: "indigo",
                product: "emerald",
                "hidden-gem": "amber",
                "future-tech": "cyan",
                tool: "rose",
              };
              const badgeColors: Record<string, string> = {
                indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-400/25",
                emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
                amber: "bg-amber-500/15 text-amber-300 border-amber-400/25",
                cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-400/25",
                rose: "bg-rose-500/15 text-rose-300 border-rose-400/25",
              };
              const color = colorMap[pick.type] || "indigo";
              const fullItem = getAllItems().find(i => i.slug === pick.slug);
              return (
                <Link
                  key={pick.slug}
                  href={`/item/${pick.slug}`}
                  className="group relative rounded-2xl border border-border/60 bg-surface overflow-hidden hover:border-border card-hover-glow transition-all flex flex-col"
                >
                  {fullItem && (
                    <div className="overflow-hidden">
                      <ItemImage slug={pick.slug} alt={pick.title} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <span className={`self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColors[color]}`}>
                      {pick.categoryLabel}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-accent-hover transition-colors line-clamp-3 leading-snug">
                      {pick.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-auto">
                      {pick.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ============================================
          WHAT SURFACED TODAY — Daily Editorial Roundup
          ============================================ */}
      <ScrollReveal>
      <section className="relative pb-10 sm:pb-20 px-4 sm:px-6">
        {/* Subtle editorial backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.03] via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-[90rem] mx-auto">
          <div className="glow-line mb-4 sm:mb-10" />

          {/* Edition header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4 sm:mb-8">
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
            {(() => {
              const lead = getItemSignals(editorsPick);
              return (
            <div className="sm:col-span-2 xl:row-span-2 gradient-border relative group flex flex-col bg-surface border border-border rounded-2xl card-hover-glow overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-[3px] z-10 ${accentBar(editorsPick.type)}`} />
              <div className="overflow-hidden relative">
                <ItemImage slug={editorsPick.slug} alt={getItemTitle(editorsPick)} size="lg" priority className="group-hover:scale-[1.03] transition-transform duration-500" />
                {lead.fresh && <NewTodayRibbon className="absolute top-3 right-3 z-10" />}
              </div>
              <div className="p-7 sm:p-8 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-5 gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-accent bg-accent/15 border border-accent/20 px-2.5 py-1 rounded-full">
                    &#9733; Lead
                  </span>
                  <CategoryBadge
                    label={getCategoryLabel(editorsPick.type)}
                    color={getCategoryColor(editorsPick.type)}
                  />
                  <SignalScore source={lead.source} score={lead.score} />
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
              );
            })()}

            {/* 4 supporting picks */}
            {topPicksRest.map((item, i) => {
              const { source, score, fresh } = getItemSignals(item);
              return (
              <div
                key={item.slug}
                className="relative group flex flex-col bg-surface border border-border rounded-2xl card-hover-glow overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                <div className="overflow-hidden relative">
                  <ItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="md" className="group-hover:scale-[1.03] transition-transform duration-500" />
                  {fresh && <NewTodayRibbon className="absolute top-2 right-2 z-10" />}
                </div>
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-accent/50 tabular-nums">0{i + 2}</span>
                    <CategoryBadge
                      label={getCategoryLabel(item.type)}
                      color={getCategoryColor(item.type)}
                    />
                    <SignalScore source={source} score={score} />
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
              );
            })}
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
      </ScrollReveal>

      {/* ============================================
          CATEGORY PREVIEW SECTIONS
          ============================================ */}
      {categories.slice(0, 3).map((cat) => {
        const allInCategory = getItemsForCategory(cat.key);
        const items = [...allInCategory]
          .filter((i) => !shownSlugs.has(i.slug))
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, 36);
        return (
          <ScrollReveal key={cat.key}>
          <section className="pb-8 sm:pb-18 px-4 sm:px-6">
            <div className="max-w-[90rem] mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {cat.name}
                    <span className="text-sm text-muted-foreground font-normal ml-2">{cat.count} items</span>
                  </h2>
                </div>
                <Link href={cat.path} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-accent transition-colors link-underline">
                  See All <span>&rarr;</span>
                </Link>
              </div>
              <Carousel
                items={items}
                renderCard={(item) => {
                  const { source, score, fresh } = getItemSignals(item);
                  const isNew = fresh || isNewToday(item, allInCategory);
                  return (
                    <Link href={`/item/${item.slug}`} className="group block w-full">
                      <div className="flex flex-col bg-surface border border-border rounded-xl card-hover-glow h-full overflow-hidden relative">
                        <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                        <div className="overflow-hidden relative">
                          <ItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                          {isNew && <NewTodayRibbon className="absolute top-2 right-2 z-10" />}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <CategoryBadge label={getCategoryLabel(item.type)} color={getCategoryColor(item.type)} />
                            <SignalScore source={source} score={score} />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-accent transition-colors">
                            {getItemTitle(item)}
                          </h3>
                          <p className="text-xs text-muted leading-relaxed line-clamp-1">
                            {getItemDescription(item)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                }}
              />
            </div>
          </section>
          </ScrollReveal>
        );
      })}

      {/* ============================================
          INLINE NEWSLETTER CTA (between carousels 3 & 4)
          ============================================ */}
      <ScrollReveal>
      <section className="py-8 my-2 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg font-medium mb-1">Enjoying the discoveries?</p>
          <p className="text-sm text-muted-foreground mb-4">Get the best 5 picks delivered to your inbox every morning.</p>
          <NewsletterForm variant="minimal" />
        </div>
      </section>
      </ScrollReveal>

      {categories.slice(3).map((cat) => {
        const allInCategory = getItemsForCategory(cat.key);
        const items = [...allInCategory]
          .filter((i) => !shownSlugs.has(i.slug))
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, 36);
        return (
          <ScrollReveal key={cat.key}>
          <section className="pb-8 sm:pb-18 px-4 sm:px-6">
            <div className="max-w-[90rem] mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {cat.name}
                    <span className="text-sm text-muted-foreground font-normal ml-2">{cat.count} items</span>
                  </h2>
                </div>
                <Link href={cat.path} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-accent transition-colors link-underline">
                  See All <span>&rarr;</span>
                </Link>
              </div>
              <Carousel
                items={items}
                renderCard={(item) => {
                  const { source, score, fresh } = getItemSignals(item);
                  const isNew = fresh || isNewToday(item, allInCategory);
                  return (
                    <Link href={`/item/${item.slug}`} className="group block w-full">
                      <div className="flex flex-col bg-surface border border-border rounded-xl card-hover-glow h-full overflow-hidden relative">
                        <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                        <div className="overflow-hidden relative">
                          <ItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                          {isNew && <NewTodayRibbon className="absolute top-2 right-2 z-10" />}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <CategoryBadge label={getCategoryLabel(item.type)} color={getCategoryColor(item.type)} />
                            <SignalScore source={source} score={score} />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-accent transition-colors">
                            {getItemTitle(item)}
                          </h3>
                          <p className="text-xs text-muted leading-relaxed line-clamp-1">
                            {getItemDescription(item)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                }}
              />
            </div>
          </section>
          </ScrollReveal>
        );
      })}

      {/* ============================================
          NEWSLETTER CTA
          ============================================ */}
      <ScrollReveal>
      <section className="section-divider relative py-12 sm:py-32 px-4 sm:px-6 overflow-hidden">
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
      </ScrollReveal>

      {/* ============================================
          SOCIAL CTA
          ============================================ */}
      <ScrollReveal>
      <section className="pb-10 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <SocialCTA />
        </div>
      </section>
      </ScrollReveal>

      {/* ============================================
          SURPRISE ME FAB
          ============================================ */}
      <SurpriseMe variant="fab" />
    </>
  );
}
