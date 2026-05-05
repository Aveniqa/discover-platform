import {
  discoveries,
  products,
  hiddenGems,
  futureRadar,
  dailyTools,
  categories,
  getAllItems,
  getItemTitle,
  getItemExcerpt,
  getItemWhyText,
  getCategoryColor,
  getCategoryLabel,
  type AnyItem,
} from "@/lib/data";
import type { CSSProperties, ReactNode } from "react";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { SocialCTA } from "@/components/SocialCTA";
import { ShareTodaysPicks } from "@/components/ui/ShareTodaysPicks";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { todaysPicks } from "@/lib/data";
import Link from "next/link";
import { CurrentEventsEngine } from "@/components/home/CurrentEventsEngine";
import { HomeStreakStatus, SearchSurfacedButton } from "@/components/home/HomeHeroActions";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { itemListLd, ldScript } from "@/lib/jsonld";
import { getItemImageSrcSet, getItemImageUrl } from "@/lib/images";

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

function trimText(s: string, max: number): string {
  const cleaned = s.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max - 40 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\s]+$/, "")}…`;
}

function formatEditionDate(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function StaticItemImage({
  slug,
  alt,
  width = 600,
  height = 400,
  aspectRatio = "16/10",
  className = "",
  size = "md",
  priority = false,
  sizes,
}: {
  slug: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "og";
  priority?: boolean;
  sizes?: string;
}) {
  const imageUrl = getItemImageUrl(slug, width, height, size);
  const srcSet = size === "og" ? null : getItemImageSrcSet(slug);
  const defaultSizes =
    sizes ||
    (size === "lg"
      ? "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 940px"
      : "(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 400px");

  return (
    <div
      className={`relative overflow-hidden bg-white/[0.03] ${className}`}
      style={{ aspectRatio }}
    >
      {!imageUrl ? (
        <div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 flex items-center justify-center"
          style={{ aspectRatio }}
        >
          <span className="text-xs text-white/50 uppercase tracking-widest font-medium select-none">
            Surfaced
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          {...(srcSet ? { srcSet: srcSet.srcSet, sizes: defaultSizes } : {})}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}

function StaticCarousel({
  items,
  renderCard,
  cardWidthClass = "w-[300px] sm:w-[320px]",
}: {
  items: AnyItem[];
  renderCard: (item: AnyItem, index: number) => ReactNode;
  cardWidthClass?: string;
}) {
  return (
    <div className="relative">
      <div
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as CSSProperties}
      >
        {items.map((item, index) => (
          <div key={item.slug} className={`snap-start shrink-0 ${cardWidthClass}`}>
            {renderCard(item, index)}
          </div>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}

function getShowcaseItems(): AnyItem[] {
  const all = getAllItems();
  const byType: Record<string, AnyItem[]> = {};
  for (const item of all) {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  }

  const result: AnyItem[] = [];
  const seen = new Set<string>();
  const types = Object.keys(byType);

  for (const type of types) {
    const badged = byType[type]
      .filter((i) => !!(i as { badge?: string }).badge)
      .sort((a, b) => (b.id || 0) - (a.id || 0));
    for (const item of badged) {
      if (seen.has(item.slug)) continue;
      seen.add(item.slug);
      result.push(item);
      if (result.length >= 30) return result;
    }
  }

  let round = 0;
  while (result.length < 30 && round < 20) {
    for (const type of types) {
      const newest = [...byType[type]].sort((a, b) => (b.id || 0) - (a.id || 0));
      const pick = newest.filter((i) => !seen.has(i.slug))[round];
      if (pick) {
        seen.add(pick.slug);
        result.push(pick);
        if (result.length >= 30) return result;
      }
    }
    round++;
  }
  return result;
}

const colorAccent: Record<string, string> = {
  emerald: "bg-emerald-500/80",
  cyan: "bg-cyan-500/80",
  amber: "bg-amber-500/80",
  rose: "bg-rose-500/80",
  indigo: "bg-indigo-500/80",
};

function StaticHeroShowcase() {
  const items = getShowcaseItems();
  return (
    <div className="relative">
      <div
        className="flex gap-2 sm:gap-3 h-[220px] sm:h-[340px] lg:h-[400px] overflow-x-auto px-2 sm:px-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as CSSProperties}
      >
        {items.map((item, idx) => {
          const title = getItemTitle(item);
          const desc = getItemExcerpt(item, 180);
          const label = getCategoryLabel(item.type);
          const color = getCategoryColor(item.type);

          return (
            <Link
              key={item.slug}
              href={`/item/${item.slug}`}
              className="relative block rounded-xl overflow-hidden cursor-pointer group w-[160px] sm:w-[220px] lg:w-[260px] shrink-0 snap-start"
            >
              <StaticItemImage
                slug={item.slug}
                alt={title}
                width={520}
                height={400}
                size="md"
                priority={idx < 4}
                className="h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
              <div className={`absolute top-3 left-3 h-1.5 w-10 rounded-full ${colorAccent[color] || colorAccent.indigo}`} />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                  {label}
                </p>
                <h3 className="mt-1 text-sm sm:text-base font-bold leading-snug text-white line-clamp-2">
                  {title}
                </h3>
                <p className="mt-2 hidden sm:block text-xs leading-relaxed text-white/70 line-clamp-2">
                  {desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}

function StaticMarqueeStrip({ items, speed = 40 }: { items: string[]; speed?: number }) {
  const doubled = [...items, ...items];
  return (
    <>
      <style>{`
        @keyframes marquee-ltr {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div className="overflow-hidden">
        <div
          className="flex gap-2.5 whitespace-nowrap"
          style={{
            animation: `marquee-ltr ${speed}s linear infinite`,
            width: "max-content",
          }}
        >
          {doubled.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-surface border border-border/50 text-muted shrink-0"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---- Page Component ---- */

export default function HomePage() {
  const allItems = getAllItems();
  const editionDate = formatEditionDate();

  /* Trending This Week — badged items, newest first (12 for carousel) */
  const trendingItems = [...allItems]
    .filter((i) => !!(i as { badge?: string }).badge)
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 12);

  /* Today's Edition — 1 lead + 5 supporting picks, filling the editorial grid. */
  const editorsPick = discoveries[0];
  const leadStoryContinuation = trimText(getItemWhyText(editorsPick), 520);
  const primarySupportingPicks = [
    products[0],
    hiddenGems[0],
    futureRadar[0],
    dailyTools[0],
  ].filter(Boolean) as AnyItem[];
  const usedTodaySlugs = new Set([editorsPick.slug, ...primarySupportingPicks.map((item) => item.slug)]);
  const extraTodayPick = allItems.find(
    (item) => todaysPicks.some((pick) => pick.slug === item.slug) && !usedTodaySlugs.has(item.slug)
  ) ?? allItems.find((item) => !usedTodaySlugs.has(item.slug));
  const topPicksRest = [...primarySupportingPicks, extraTodayPick].filter(Boolean) as AnyItem[];

  /* Slugs already shown — exclude from category sections */
  const shownSlugs = new Set([editorsPick.slug, ...topPicksRest.map(i => i.slug)]);

  /* JSON-LD: Today's Picks as an ItemList — surfaces the homepage's
     featured items to Google as a real navigable list */
  const todaysPicksLd = itemListLd(
    todaysPicks.map((p) => ({ url: `/item/${p.slug}`, name: p.title })),
    "Today's Picks"
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(todaysPicksLd)} />

      {/* ============================================
          HERO — Editorial cover, single CTA
          ============================================ */}
      <div>
      <AuroraBackground
        colorA="bg-accent/12"
        colorB="bg-emerald-500/8"
        colorC="bg-cyan-500/6"
        className="relative pt-16 sm:pt-20 pb-8 sm:pb-12"
      >
        {/* Dot grid texture */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(168,85,247,0.07) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        {/* Mouse-tracking glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(500px circle at var(--hx, 50%) var(--hy, 50%), rgba(168,85,247,0.05), transparent 60%)" }} />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Eyebrow: edition date + optional streak chip */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
              </span>
              Today&rsquo;s Edition
            </span>
            <span className="text-xs text-muted-foreground">{editionDate}</span>
            <HomeStreakStatus />
          </div>

          <h1 className="mx-auto max-w-4xl text-center text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.98] mb-5 text-balance">
            Discover something <span className="gradient-text">new</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
            Products, hidden gems, future tech, and discoveries, refreshed daily with one timely story worth acting on.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="#featured-story"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:shadow-[0_0_50px_rgba(139,92,246,0.3)] active:scale-[0.98]"
            >
              Story of the week
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <SearchSurfacedButton />
          </div>
        </div>

        <div id="discover" className="relative mt-12 sm:mt-14">
          <StaticHeroShowcase />
        </div>
      </AuroraBackground>
      </div>

      <CurrentEventsEngine />

      {/* ── Topic Marquee — full-bleed, single strip ─────── */}
      <div className="py-3 border-y border-border/30 overflow-hidden">
        <StaticMarqueeStrip speed={40} items={["Science", "AI & ML", "Space", "Biotech", "Research", "Design", "Future Tech", "Hidden Gems", "Daily Tools", "Psychology", "Robotics", "Innovation", "Quantum", "Climate Tech", "Indie Makers", "Genomics", "Privacy", "Sustainability"]} />
      </div>

      {/* ============================================
          TRENDING THIS WEEK — badged items
          ============================================ */}
      {trendingItems.length > 0 && (
        <section className="pb-6 sm:pb-10 px-4 sm:px-6 border-b border-border/50">
          <div className="max-w-[90rem] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Trending This Week</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Editor&rsquo;s picks and top finds</p>
              </div>
              <Link href="/trending" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-accent transition-colors link-underline">See all <span>&rarr;</span></Link>
            </div>
            <StaticCarousel
              items={trendingItems}
              renderCard={(item, idx) => (
                <Link href={`/item/${item.slug}`} className="group block w-full">
                  <div className="flex flex-col bg-surface border border-border rounded-xl card-hover-glow h-full overflow-hidden relative">
                    <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                    <div className="overflow-hidden relative">
                      <StaticItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="sm" priority={idx < 4} className="group-hover:scale-[1.03] transition-transform duration-500" />
                      {!!(item as { badge?: string }).badge && (
                        <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded-full">
                          {(item as { badge?: string }).badge}
                        </span>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <CategoryBadge label={getCategoryLabel(item.type)} color={getCategoryColor(item.type)} className="mb-3 self-start" />
                      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-accent transition-colors">
                        {getItemTitle(item)}
                      </h3>
                      <p className="text-xs text-muted leading-relaxed line-clamp-1">
                        {getItemExcerpt(item)}
                      </p>
                    </div>
                  </div>
                </Link>
              )}
            />
          </div>
        </section>
      )}

      {/* ============================================
          CATEGORY QUICK-ACCESS CARDS
          ============================================ */}
      <section className="py-4 sm:py-8 px-4 sm:px-6">
        <div className="max-w-[90rem] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Discoveries", href: "/discover", emoji: "🔮", description: "Curious facts and science", color: "from-purple-500/20 to-transparent" },
              { label: "Products", href: "/trending", emoji: "📈", description: "Useful things to buy", color: "from-green-500/20 to-transparent" },
              { label: "Hidden Gems", href: "/hidden-gems", emoji: "💎", description: "Underrated web tools", color: "from-amber-500/20 to-transparent" },
              { label: "Future Tech", href: "/future-radar", emoji: "🔭", description: "What is coming next", color: "from-blue-500/20 to-transparent" },
              { label: "Daily Tools", href: "/tools", emoji: "🛠️", description: "Apps for everyday work", color: "from-rose-500/20 to-transparent" },
            ].map((cat) => (
              <Link key={cat.href} href={cat.href}
                className={`p-4 rounded-xl bg-gradient-to-br ${cat.color} border border-border/50 hover:border-accent/30 transition-all group backdrop-blur-sm`}>
                <span className="text-2xl">{cat.emoji}</span>
                <p className="font-semibold mt-2 text-sm group-hover:text-accent transition-colors">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          WHAT SURFACED TODAY — Daily Editorial Roundup
          (Replaces redundant Today's Picks grid; editorial layout
           is the single canonical "today" surface.)
          ============================================ */}
      <section id="today" className="relative pb-10 sm:pb-20 px-4 sm:px-6 scroll-mt-20">
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
                <span className="text-xs text-muted-foreground">{editionDate}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                <span>What Surfaced</span>{" "}
                <span className="gradient-text">Today</span>
              </h2>
              <p className="text-sm text-muted mt-1 hidden sm:block">
                One lead story and five standout finds from across the internet
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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-5">
            {/* Lead story — large card */}
            <div className="sm:col-span-2 xl:row-span-2">
            <div className="h-full">
            <div className="gradient-border relative group flex flex-col bg-surface border border-border rounded-2xl card-hover-glow overflow-hidden h-full">
              <div className={`absolute top-0 left-0 right-0 h-[3px] z-10 ${accentBar(editorsPick.type)}`} />
              <div className="overflow-hidden">
                <StaticItemImage slug={editorsPick.slug} alt={getItemTitle(editorsPick)} size="lg" priority className="group-hover:scale-[1.03] transition-transform duration-500" />
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

              <div className="text-sm sm:text-base text-muted leading-relaxed mb-6 flex-1 space-y-3">
                <p>
                  {getItemExcerpt(editorsPick, 520)}
                </p>
                <p className="hidden lg:block text-muted-foreground">
                  {leadStoryContinuation}
                </p>
              </div>

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
            </div>
            </div>

            {/* 4 supporting picks */}
            {topPicksRest.map((item, i) => (
              <div key={item.slug}>
              <div className="h-full">
              <div
                className="relative group flex flex-col bg-surface border border-border rounded-2xl card-hover-glow overflow-hidden h-full"
              >
                <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                <div className="overflow-hidden">
                  <StaticItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="md" className="group-hover:scale-[1.03] transition-transform duration-500" />
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
                  {getItemExcerpt(item)}
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
              </div>
              </div>
            ))}
          </div>

        </div>
      </section>

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
          <section key={cat.key} className="pb-8 sm:pb-18 px-4 sm:px-6">
            <div className="max-w-[90rem] mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {cat.name}
                  </h2>
                </div>
                <Link href={cat.path} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-accent transition-colors link-underline">
                  See All <span>&rarr;</span>
                </Link>
              </div>
              <StaticCarousel
                items={items}
                renderCard={(item) => {
                  const isNew = isNewToday(item, allInCategory);
                  return (
                    <Link href={`/item/${item.slug}`} className="group block w-full">
                      <div className="flex flex-col bg-surface border border-border rounded-xl card-hover-glow h-full overflow-hidden relative">
                        <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                        <div className="overflow-hidden relative">
                          <StaticItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                          {isNew && (
                            <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500 text-white rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <CategoryBadge label={getCategoryLabel(item.type)} color={getCategoryColor(item.type)} className="mb-3 self-start" />
                          <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-accent transition-colors">
                            {getItemTitle(item)}
                          </h3>
                          <p className="text-xs text-muted leading-relaxed line-clamp-1">
                            {getItemExcerpt(item)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                }}
              />
            </div>
          </section>
        );
      })}

      {categories.slice(3).map((cat) => {
        const allInCategory = getItemsForCategory(cat.key);
        const items = [...allInCategory]
          .filter((i) => !shownSlugs.has(i.slug))
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, 36);
        return (
          <section key={cat.key} className="pb-8 sm:pb-18 px-4 sm:px-6">
            <div className="max-w-[90rem] mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {cat.name}
                  </h2>
                </div>
                <Link href={cat.path} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-accent transition-colors link-underline">
                  See All <span>&rarr;</span>
                </Link>
              </div>
              <StaticCarousel
                items={items}
                renderCard={(item) => {
                  const isNew = isNewToday(item, allInCategory);
                  return (
                    <Link href={`/item/${item.slug}`} className="group block w-full">
                      <div className="flex flex-col bg-surface border border-border rounded-xl card-hover-glow h-full overflow-hidden relative">
                        <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${accentBar(item.type)}`} />
                        <div className="overflow-hidden relative">
                          <StaticItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                          {isNew && (
                            <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500 text-white rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <CategoryBadge label={getCategoryLabel(item.type)} color={getCategoryColor(item.type)} className="mb-3 self-start" />
                          <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-accent transition-colors">
                            {getItemTitle(item)}
                          </h3>
                          <p className="text-xs text-muted leading-relaxed line-clamp-1">
                            {getItemExcerpt(item)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                }}
              />
            </div>
          </section>
        );
      })}

      {/* ============================================
          SOCIAL CTA
          ============================================ */}
      <section className="pb-10 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <SocialCTA />
        </div>
      </section>

      <NewsletterSection />

    </>
  );
}
