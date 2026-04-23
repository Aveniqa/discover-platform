"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { ItemImage } from "@/components/ui/ItemImage";
import { dailyTools, getSubCategories, type AnyItem } from "@/lib/data";
import { BackToTop } from "@/components/ui/BackToTop";
import { LogoImage } from "@/components/ui/LogoImage";
import { QuickViewModal } from "@/components/ui/QuickViewModal";
import { ItemListSchema } from "@/components/seo/ItemListSchema";

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sortMode, setSortMode] = useState<string>("default");
  const [quickViewItem, setQuickViewItem] = useState<AnyItem | null>(null);
  const [page, setPage] = useState(1);

  const subCategories = getSubCategories("tool");

  const filtered = useMemo(() => {
    let items = [...dailyTools];
    if (activeCategory !== "All") {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.toolName.toLowerCase().includes(q) ||
          i.whatItDoes.toLowerCase().includes(q)
      );
    }
    if (sortMode === "newest") items.sort((a, b) => (b.id || 0) - (a.id || 0));
    else if (sortMode === "oldest") items.sort((a, b) => (a.id || 0) - (b.id || 0));
    else if (sortMode === "az") items.sort((a, b) => a.toolName.localeCompare(b.toolName));
    else if (sortMode === "za") items.sort((a, b) => b.toolName.localeCompare(a.toolName));
    else if (sortMode === "category") items.sort((a, b) => a.category.localeCompare(b.category));
    return items;
  }, [activeCategory, searchQuery, sortMode]);

  const PER_PAGE = 24;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <ItemListSchema
        items={dailyTools as AnyItem[]}
        name="Surfaced Daily Tools — Everyday Apps & Utilities"
        description="Productivity apps, everyday utilities, and tools that make work and life easier."
        pagePath="/tools"
      />
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative py-14 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-28 right-1/3 w-[460px] h-[460px] rounded-full bg-rose-500/8 blur-[120px]" />
          <div className="absolute top-36 left-1/4 w-[320px] h-[320px] rounded-full bg-rose-500/6 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400 mb-4">
            Tools
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
            Daily{" "}
            <span className="gradient-text">Tools</span>
          </h1>
          <p className="mt-5 text-muted text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Practical, beautiful, no-sign-up tools for everyday life.{" "}
            <span className="font-semibold text-foreground">
              {dailyTools.length}
            </span>{" "}
            tools ready to use.
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
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full rounded-2xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/30 transition-all"
              />
            </div>
            <select
              value={sortMode}
              onChange={(e) => { setSortMode(e.target.value); setPage(1); }}
              className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition-all cursor-pointer"
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
              onClick={() => { setActiveCategory("All"); setPage(1); }}
              aria-pressed={activeCategory === "All"}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeCategory === "All"
                  ? "bg-rose-500/20 text-rose-300 border-rose-400/35 light:bg-rose-500/12 light:text-rose-700 light:border-rose-600/30"
                  : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-border"
              }`}
            >
              All
            </button>
            {subCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setPage(1); }}
                aria-pressed={activeCategory === cat}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-rose-500/20 text-rose-300 border-rose-400/35 light:bg-rose-500/12 light:text-rose-700 light:border-rose-600/30"
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
          <span className="font-semibold text-foreground">
            {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
          items
        </p>

        {/* AD_ZONE: sidebar */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginatedItems.map((item, index) => (
            <ScrollReveal key={item.slug} delay={Math.min(index * 50, 800)} placeholder={<SkeletonCard />}>
              <div className="group rounded-2xl border border-border/60 bg-surface card-hover-glow transition-all h-full flex flex-col overflow-hidden">
                <div className="overflow-hidden relative">
                  <ItemImage slug={item.slug} alt={item.toolName} aspectRatio="3/2" width={400} height={267} priority={index < 4} className="group-hover:scale-[1.03] transition-transform duration-500" />
                  {item.badge === "editors-pick" && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/90 text-black rounded">
                      Editor&apos;s Pick
                    </span>
                  )}
                  <button
                    onClick={() => setQuickViewItem(item as AnyItem)}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-full shadow">Quick View</span>
                  </button>
                </div>
                <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <CategoryBadge label={item.category} color="rose" />
                  <BookmarkButton slug={item.slug} />
                </div>
                <Link href={`/item/${item.slug}`} className="block mb-2">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-rose-300 transition-colors line-clamp-2 flex items-center gap-1.5">
                    {item.websiteLink && (() => { try { return new URL(item.websiteLink).hostname.replace("www.", ""); } catch { return null; } })() && (
                      <LogoImage domain={(() => { try { return new URL(item.websiteLink).hostname.replace("www.", ""); } catch { return ""; } })()} />
                    )}
                    {item.toolName}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-1 mb-4">
                  {item.whatItDoes}
                </p>
                <div className="mt-auto">
                  <a
                    href={item.websiteLink}
                    target="_blank"
                    rel="noopener"
                    data-outbound="true"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Visit Site →
                  </a>
                </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No tools match your search.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-30 hover:bg-card transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-muted-foreground px-3">Page {page} of {totalPages}</span>
            <button
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-30 hover:bg-card transition-colors"
            >
              Next →
            </button>
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
              { label: "Future Radar", href: "/future-radar" },
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
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-rose-500/[0.03] to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-rose-500/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400 mb-4">
            New Tools Weekly
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Get the best tools{" "}
            <span className="gradient-text">first.</span>
          </h2>
          <p className="mt-4 text-muted text-lg max-w-lg mx-auto leading-relaxed">
            Free tools, smart utilities, and life hacks delivered weekly.
          </p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm />
          </div>
        </div>
      </section>
      <BackToTop />
      {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
    </>
  );
}
