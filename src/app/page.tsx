import Link from "next/link";
import { Suspense } from "react";
import { hiddenGems, dailyTools, getItemExcerpt, getItemCategory, type AnyItem } from "@/lib/data";
import { itemListLd, ldScript } from "@/lib/jsonld";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { allAlcoves, alcoveByKind, alcoveFromCategory, type Alcove } from "@/lib/alcoves";
import { AlcoveBackdrop } from "@/components/3d/AlcoveBackdrop";
import { HeroAlcoveRotator } from "@/components/3d/HeroAlcoveRotator";
import { HiddenInteractions } from "@/components/3d/HiddenInteractions";
import { SoundscapeToggle } from "@/components/3d/SoundscapeToggle";
import { ItemImage } from "@/components/ui/ItemImage";
import { HomeStreakStatus, SearchSurfacedButton } from "@/components/home/HomeHeroActions";
import { LiveNowTicker } from "@/components/home/LiveNowTicker";
import { BYLINE } from "@/lib/masthead";

function formatEditionDate(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function rank(items: AnyItem[]): AnyItem[] {
  return [...items].sort((a, b) => (b.id || 0) - (a.id || 0));
}

export default function HomePage() {
  const editionDate = formatEditionDate();

  const newestTools = rank(dailyTools);
  const newestGems = rank(hiddenGems);

  // Lead story = newest badged item, else newest tool
  const allKept: AnyItem[] = [...newestTools, ...newestGems];
  const leadStory =
    allKept.find((i) => !!(i as { badge?: string }).badge) ?? newestTools[0] ?? newestGems[0];

  const supporting = allKept
    .filter((i) => i.slug !== leadStory?.slug)
    .slice(0, 5);

  // Alcove rotation — 6 worlds, ordered by how heavily we cover that category
  const alcoves: Alcove[] = [
    alcoveByKind("productivity"),
    alcoveByKind("developer"),
    alcoveByKind("design"),
    alcoveByKind("ai"),
    alcoveByKind("writing"),
    alcoveByKind("finance"),
  ];

  // Featured per-alcove: 4 items from that category
  const featuredPerAlcove = alcoves.map((alc) => {
    const matchingTools = newestTools.filter((t) => alcoveFromCategory(getItemCategory(t)).kind === alc.kind);
    const matchingGems = newestGems.filter((g) => alcoveFromCategory(getItemCategory(g)).kind === alc.kind);
    return { alcove: alc, items: [...matchingTools, ...matchingGems].slice(0, 4) };
  });

  const ld = itemListLd(
    [leadStory, ...supporting].filter(Boolean).map((p) => ({ url: `/item/${p.slug}`, name: getTitle(p) })),
    "Today's Edition"
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(ld)} />
      <HiddenInteractions />

      {/* ============================================
          HERO — fixed 3D backdrop, rotating alcoves
          ============================================ */}
      <section className="relative min-h-screen -mt-16 pt-16 flex items-center overflow-hidden">
        <HeroAlcoveRotator alcoves={alcoves} intervalMs={6000} fixed />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              Today&rsquo;s Edition
            </span>
            <span className="text-xs text-white/80">{editionDate}</span>
            <HomeStreakStatus />
          </div>

          <h1 className="mx-auto max-w-4xl text-center text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6 text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
            Software worth
            <span className="block bg-gradient-to-r from-violet-300 via-cyan-200 to-amber-200 bg-clip-text text-transparent">
              your attention.
            </span>
          </h1>
          <p className="text-base sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
            Surfaced is a hand-edited daily on the most useful tools, hidden web apps, and quiet
            corners of the internet. One editor. No SEO slop. Real opinions on what to use.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="#today"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all shadow-[0_10px_40px_rgba(0,0,0,0.5)] active:scale-[0.98]"
            >
              Read today&rsquo;s edition
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <SearchSurfacedButton />
          </div>

          <p className="mt-10 text-[11px] uppercase tracking-[0.25em] text-white/55">
            {hiddenGems.length + dailyTools.length} curated • {alcoves.length} alcoves • Updated daily
          </p>

          <div className="mt-8 flex justify-center">
            <LiveNowTicker
              items={allKept.slice(0, 30).map((i) => ({
                slug: i.slug,
                title: getTitle(i),
                category: getItemCategory(i),
                action: "open",
              }))}
            />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/60">
          <div className="flex flex-col items-center gap-1.5 text-[10px] uppercase tracking-[0.2em]">
            Scroll
            <span className="block w-px h-8 bg-gradient-to-b from-white/60 to-transparent animate-pulse" />
          </div>
        </div>
      </section>

      {/* ============================================
          TODAY'S EDITION — editorial cover
          ============================================ */}
      {leadStory && (
        <section id="today" className="relative py-20 sm:py-28 px-4 sm:px-6 scroll-mt-20 bg-background">
          <div className="max-w-[88rem] mx-auto">
            <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-accent font-semibold mb-3">
                  Today&rsquo;s Edition · {editionDate}
                </p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
                  What earned a slot today
                </h2>
                <p className="mt-3 text-muted-foreground max-w-2xl">
                  One lead pick, five worth your time. Each entry hand-tested, with the official site
                  and a one-line take from {BYLINE.name}.
                </p>
              </div>
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-border hover:border-accent/40 hover:text-accent transition-colors self-start sm:self-end"
              >
                Browse all tools →
              </Link>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lead story */}
              <ScrollReveal className="lg:col-span-2">
                <LeadCard item={leadStory} />
              </ScrollReveal>

              {/* Supporting picks */}
              <div className="flex flex-col gap-4">
                {supporting.slice(0, 3).map((item, idx) => (
                  <ScrollReveal key={item.slug} delay={idx * 80}>
                    <SupportingCard item={item} />
                  </ScrollReveal>
                ))}
              </div>
            </div>

            {supporting.length > 3 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {supporting.slice(3).map((item, idx) => (
                  <ScrollReveal key={item.slug} delay={idx * 100}>
                    <SupportingCard item={item} compact />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================
          ALCOVE TOUR — 6 worlds, each with its own scene
          ============================================ */}
      <section className="relative">
        {featuredPerAlcove.map(({ alcove, items }, idx) => (
          <AlcoveSection key={alcove.kind} alcove={alcove} items={items} index={idx} />
        ))}
      </section>

      {/* ============================================
          WORKFLOWS — novel feature preview
          ============================================ */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 bg-background border-t border-border/40">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-accent font-semibold mb-4">
            New on Surfaced
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Tell us your goal.<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
              We&rsquo;ll stitch the toolchain.
            </span>
          </h2>
          <p className="mt-5 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Workflows pair real tools into recipes — &ldquo;write a newsletter,&rdquo; &ldquo;design a logo,&rdquo;
            &ldquo;analyze a CSV.&rdquo; Pick one and get three or four apps that actually work together.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              { goal: "Write a newsletter", icon: "✉" },
              { goal: "Build a landing page", icon: "▢" },
              { goal: "Edit a podcast", icon: "♫" },
              { goal: "Analyze a spreadsheet", icon: "▦" },
              { goal: "Design a logo", icon: "◆" },
            ].map((w) => (
              <Link
                key={w.goal}
                href={`/workflows#${encodeURIComponent(w.goal.toLowerCase().replace(/\s+/g, "-"))}`}
                className="group inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border hover:border-accent/40 bg-surface hover:bg-surface-elevated transition-all text-sm font-medium"
              >
                <span className="text-accent">{w.icon}</span>
                {w.goal}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
            ))}
          </div>
          <div className="mt-10">
            <Link
              href="/workflows"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all"
            >
              Explore all workflows →
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          BYLINE — E-E-A-T trust signal
          ============================================ */}
      <section className="py-16 px-4 sm:px-6 border-t border-border/40 bg-surface/40">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-cyan flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {BYLINE.initials}
          </div>
          <div className="text-center sm:text-left flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">
              Edited by
            </p>
            <p className="text-xl font-bold">{BYLINE.name}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{BYLINE.bio}</p>
            <div className="mt-3 flex gap-3 text-xs">
              <Link href="/about" className="text-accent hover:underline">About</Link>
              <Link href="/editorial-standards" className="text-accent hover:underline">Editorial standards</Link>
              <Link href="/contact" className="text-accent hover:underline">Contact</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          NEWSLETTER
          ============================================ */}
      <Suspense fallback={null}>
        <NewsletterSection />
      </Suspense>

      <SoundscapeToggle />
    </>
  );
}

function getTitle(item: AnyItem | undefined): string {
  if (!item) return "";
  if (item.type === "hidden-gem") return item.name;
  if (item.type === "tool") return item.toolName;
  return (item as { title?: string }).title ?? item.slug;
}

function getOutbound(item: AnyItem): string | null {
  if (item.type === "hidden-gem") return item.websiteLink || null;
  if (item.type === "tool") return item.websiteLink || null;
  return null;
}

function getHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────── */

function LeadCard({ item }: { item: AnyItem }) {
  const title = getTitle(item);
  const outbound = getOutbound(item);
  const host = getHost(outbound);
  const alcove = alcoveFromCategory(getItemCategory(item));

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card h-full">
      <div className="relative aspect-[16/10] overflow-hidden">
        <ItemImage
          slug={item.slug}
          alt={title}
          aspectRatio="16/10"
          width={1200}
          height={750}
          priority
          className="group-hover:scale-[1.02] transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-0 mix-blend-overlay opacity-70" style={{
          background: `radial-gradient(at 30% 80%, ${alcove.palette[0]}55, transparent 60%), radial-gradient(at 70% 20%, ${alcove.palette[1]}33, transparent 60%)`,
        }} />
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-[0.18em] border border-white/20">
            Lead Pick
          </span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <CategoryBadge label={getItemCategory(item) || "Tool"} color="amber" className="mb-3" />
        <Link href={`/item/${item.slug}`} className="block group/title">
          <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight group-hover/title:text-amber-200 transition-colors">
            {title}
          </h3>
        </Link>
        <p className="mt-3 text-white/85 text-sm sm:text-base leading-relaxed line-clamp-2">
          {getItemExcerpt(item, 220)}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={`/item/${item.slug}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Read the take
          </Link>
          {outbound && (
            <a
              href={outbound}
              target="_blank"
              rel="noopener noreferrer"
              data-outbound="true"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md text-white text-sm font-medium border border-white/20 hover:bg-white/20 transition-colors"
            >
              Visit {host} ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function SupportingCard({ item, compact = false }: { item: AnyItem; compact?: boolean }) {
  const title = getTitle(item);
  const outbound = getOutbound(item);
  const host = getHost(outbound);
  const alcove = alcoveFromCategory(getItemCategory(item));

  return (
    <Link
      href={`/item/${item.slug}`}
      className="group block relative overflow-hidden rounded-2xl border border-border/60 bg-card hover:border-accent/40 transition-all"
    >
      <div className={`flex ${compact ? "flex-row" : "flex-col"}`}>
        <div className={`relative overflow-hidden ${compact ? "w-32 flex-shrink-0" : "w-full aspect-[16/9]"}`}>
          <ItemImage
            slug={item.slug}
            alt={title}
            aspectRatio={compact ? "1/1" : "16/9"}
            width={compact ? 200 : 600}
            height={compact ? 200 : 338}
            className="group-hover:scale-[1.03] transition-transform duration-500"
          />
          <div className="absolute inset-0 opacity-60" style={{
            background: `linear-gradient(135deg, ${alcove.palette[0]}22, transparent 60%)`,
          }} />
        </div>
        <div className="p-4 flex flex-col flex-1 min-w-0">
          <CategoryBadge label={getItemCategory(item) || "Tool"} color="amber" className="mb-2 self-start" />
          <h3 className="text-sm font-semibold leading-snug group-hover:text-accent transition-colors line-clamp-2">
            {title}
          </h3>
          {!compact && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {getItemExcerpt(item, 120)}
            </p>
          )}
          {host && (
            <p className="mt-auto pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              {host}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────── */

function AlcoveSection({ alcove, items, index }: { alcove: Alcove; items: AnyItem[]; index: number }) {
  if (items.length === 0) return null;
  const flip = index % 2 === 1;
  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden border-t border-white/[0.04]">
      <AlcoveBackdrop alcove={alcove} trackScroll />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 w-full">
        <div className={`flex flex-col ${flip ? "lg:flex-row-reverse" : "lg:flex-row"} gap-10 lg:gap-16 items-start`}>
          <div className="lg:w-1/3 lg:sticky lg:top-28">
            <p className="text-xs uppercase tracking-[0.25em] text-white/70 font-semibold mb-4">
              Alcove · {String(index + 1).padStart(2, "0")} of 06
            </p>
            <h2 className="text-4xl sm:text-6xl font-bold text-white leading-[0.95] tracking-tight">
              {alcove.label}
            </h2>
            <p className="mt-5 text-white/80 text-lg leading-relaxed max-w-md">
              {alcove.tagline}
            </p>
            <Link
              href={`/tools?category=${encodeURIComponent(alcove.label)}`}
              className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors"
            >
              See all {alcove.label} tools →
            </Link>
          </div>

          <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item, i) => (
              <ScrollReveal key={item.slug} delay={i * 90}>
                <AlcoveItemCard item={item} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AlcoveItemCard({ item }: { item: AnyItem }) {
  const title = getTitle(item);
  return (
    <Link
      href={`/item/${item.slug}`}
      className="group block relative overflow-hidden rounded-2xl border border-white/15 bg-black/30 backdrop-blur-md hover:bg-black/40 hover:border-white/30 transition-all p-5 h-full"
    >
      <div className="flex items-start gap-3 mb-3">
        <CategoryBadge label={getItemCategory(item) || ""} color="amber" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-white leading-snug group-hover:text-amber-200 transition-colors line-clamp-2">
        {title}
      </h3>
      <p className="mt-2 text-sm text-white/70 leading-relaxed line-clamp-2">
        {getItemExcerpt(item, 130)}
      </p>
      <div className="mt-4 text-[10px] uppercase tracking-wider text-white/60 inline-flex items-center gap-1">
        Read the take <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </div>
    </Link>
  );
}

// Keep allAlcoves available for future routes
void allAlcoves;
