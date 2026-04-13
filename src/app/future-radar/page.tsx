"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { ItemImage } from "@/components/ui/ItemImage";
import { futureRadar, getSubCategories } from "@/lib/data";
import { BackToTop } from "@/components/ui/BackToTop";

export default function FutureRadarPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sortMode, setSortMode] = useState<string>("default");

  const subCategories = getSubCategories("future-tech");

  const filtered = useMemo(() => {
    let items = [...futureRadar];
    if (activeCategory !== "All") {
      items = items.filter((i) => i.industry === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.techName.toLowerCase().includes(q) ||
          i.explanation.toLowerCase().includes(q)
      );
    }
    if (sortMode === "newest") items.sort((a, b) => (b.id || 0) - (a.id || 0));
    else if (sortMode === "oldest") items.sort((a, b) => (a.id || 0) - (b.id || 0));
    else if (sortMode === "az") items.sort((a, b) => a.techName.localeCompare(b.techName));
    else if (sortMode === "za") items.sort((a, b) => b.techName.localeCompare(a.techName));
    else if (sortMode === "category") items.sort((a, b) => a.industry.localeCompare(b.industry));
    return items;
  }, [activeCategory, searchQuery, sortMode]);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[140px]" />
          <div className="absolute top-24 right-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-[100px]" />
          <div className="absolute bottom-0 left-1/4 w-[250px] h-[250px] rounded-full bg-cyan-500/6 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-4">
            Future Radar
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
            Future{" "}
            <span className="gradient-text">Radar</span>
          </h1>
          <p className="mt-5 text-muted text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Breakthroughs that will reshape the world -- tracked with timelines
            and impact analysis.{" "}
            <span className="font-semibold text-foreground">
              {futureRadar.length}
            </span>{" "}
            signals tracked.
          </p>
        </div>
      </section>

      {/* ── Filter Bar ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6 mb-10">
        <div className="flex flex-col gap-4">
          {/* Search + Sort Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search future tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all"
              />
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="category">Category</option>
            </select>
          </div>

          {/* Sub-category chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("All")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeCategory === "All"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/35"
                  : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-border"
              }`}
            >
              All
            </button>
            {subCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/35"
                    : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Results Grid ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <p className="text-sm text-muted-foreground mb-6">
          Showing{" "}
          <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">{futureRadar.length}</span>{" "}
          items
        </p>

        {/* AD_ZONE: sidebar */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item, index) => (
            <ScrollReveal key={item.slug} delay={index * 50} placeholder={<SkeletonCard />}>
              <Link
                href={`/item/${item.slug}`}
                className="group block rounded-2xl border border-border/60 bg-surface card-hover-glow transition-all h-full overflow-hidden"
              >
                <div className="overflow-hidden relative">
                  <ItemImage slug={item.slug} alt={item.techName} aspectRatio="3/2" width={400} height={267} className="group-hover:scale-[1.03] transition-transform duration-500" />
                  {(item as any).badge === "editors-pick" && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/90 text-black rounded">
                      Editor&apos;s Pick
                    </span>
                  )}
                </div>
                <div className="p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <CategoryBadge label={item.industry} color="cyan" />
                    {item.developmentStage && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {item.developmentStage}
                      </span>
                    )}
                  </div>
                  <BookmarkButton slug={item.slug} />
                </div>
                <h3 className="text-base font-semibold text-foreground group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
                  {item.techName}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {item.explanation}
                </p>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No future tech matches your search.</p>
          </div>
        )}
      </section>

      {/* ── Explore Another Category ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4 mb-8">
        <div className="p-6 rounded-2xl bg-card/50 border border-border text-center">
          <h3 className="text-lg font-semibold mb-2">Done exploring? Try another category</h3>
          <p className="text-sm text-muted-foreground mb-4">Keep discovering across all of Surfaced.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "Discoveries", href: "/discover" },
              { label: "Trending Products", href: "/trending" },
              { label: "Hidden Gems", href: "/hidden-gems" },
              { label: "Daily Tools", href: "/tools" },
            ].map((cat) => (
              <Link key={cat.href} href={cat.href}
                className="px-4 py-2 rounded-full text-sm bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
                {cat.label} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter CTA ────────────────────────────────── */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.03] to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-4">
            Stay Ahead
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            See the future{" "}
            <span className="gradient-text">before it arrives.</span>
          </h2>
          <p className="mt-4 text-muted text-lg max-w-lg mx-auto leading-relaxed">
            Weekly briefings on the breakthroughs shaping tomorrow.
          </p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm />
          </div>
        </div>
      </section>
      <BackToTop />
    </>
  );
}
