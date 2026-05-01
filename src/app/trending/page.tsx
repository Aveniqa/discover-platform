"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { ItemImage } from "@/components/ui/ItemImage";
import { products, getSubCategories, getFilterCategory, getItemExcerpt } from "@/lib/data";
import { type AnyItem } from "@/lib/data";
import { BackToTop } from "@/components/ui/BackToTop";
import { QuickViewModal } from "@/components/ui/QuickViewModal";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { TiltCard } from "@/components/ui/TiltCard";
import { BlurText } from "@/components/ui/BlurText";
import { AdSlot } from "@/components/ui/AdSlot";

// Parse the lower bound from "estimatedPriceRange" strings like "$299–$349" or "$29"
function parsePriceLower(range: string | undefined): number {
  if (!range) return 0;
  const match = range.match(/\$(\d+(?:,\d+)?)/);
  return match ? parseInt(match[1].replace(",", "")) : 0;
}

const PRICE_RANGES = [
  { label: "Under $50", min: 0, max: 50 },
  { label: "$50–$100", min: 50, max: 100 },
  { label: "$100–$200", min: 100, max: 200 },
  { label: "$200+", min: 200, max: Infinity },
];

import { type Product } from "@/lib/data";

export default function TrendingPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [priceFilter, setPriceFilter] = useState<string>("All");
  const [sortMode, setSortMode] = useState<string>("default");
  const [compareItems, setCompareItems] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [quickViewItem, setQuickViewItem] = useState<AnyItem | null>(null);
  const [page, setPage] = useState(1);

  function toggleCompare(slug: string) {
    setCompareItems((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, slug];
    });
  }

  const subCategories = getSubCategories("product");

  const filtered = useMemo(() => {
    let items = [...products];
    if (activeCategory !== "All") {
      items = items.filter((i) => getFilterCategory(i) === activeCategory);
    }
    if (priceFilter !== "All") {
      const range = PRICE_RANGES.find((r) => r.label === priceFilter);
      if (range) {
        items = items.filter((i) => {
          const lower = parsePriceLower(i.estimatedPriceRange);
          return lower >= range.min && lower < range.max;
        });
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.shortDescription.toLowerCase().includes(q)
      );
    }
    if (sortMode === "newest") items.sort((a, b) => (b.id || 0) - (a.id || 0));
    else if (sortMode === "oldest") items.sort((a, b) => (a.id || 0) - (b.id || 0));
    else if (sortMode === "az") items.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === "za") items.sort((a, b) => b.title.localeCompare(a.title));
    else if (sortMode === "price-asc") items.sort((a, b) => parsePriceLower(a.estimatedPriceRange) - parsePriceLower(b.estimatedPriceRange));
    else if (sortMode === "price-desc") items.sort((a, b) => parsePriceLower(b.estimatedPriceRange) - parsePriceLower(a.estimatedPriceRange));
    else if (sortMode === "category") items.sort((a, b) => a.category.localeCompare(b.category));
    return items;
  }, [activeCategory, priceFilter, searchQuery, sortMode]);

  const PER_PAGE = 24;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────── */}
      <AuroraBackground
        colorA="bg-emerald-500/18"
        colorB="bg-teal-400/12"
        colorC="bg-cyan-500/8"
        className="relative py-24 sm:py-32"
      >
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-4">
            Trending
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
            <BlurText as="span" wordDelay={55}>Trending</BlurText>{" "}
            <BlurText as="span" wordDelay={55} className="gradient-text">Products</BlurText>
          </h1>
          <p className="mt-5 text-muted text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            The internet&apos;s most-wanted products, vetted and handpicked.{" "}
            <span className="font-semibold text-foreground">
              {products.length}
            </span>{" "}
            products curated.
          </p>
        </div>
      </AuroraBackground>

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
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full rounded-2xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
              />
            </div>
            <select aria-label="Sort items"
              value={sortMode}
              onChange={(e) => { setSortMode(e.target.value); setPage(1); }}
              className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="category">Category</option>
            </select>
          </div>

          {/* Quick sort by price — prominent pill buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Sort:</span>
            {[
              { label: "💸 Price: Low → High", value: "price-asc" },
              { label: "💎 Price: High → Low", value: "price-desc" },
              { label: "✨ Newest", value: "newest" },
              { label: "A–Z", value: "az" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSortMode(sortMode === opt.value ? "default" : opt.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  sortMode === opt.value
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                    : "bg-surface text-muted-foreground border-border hover:text-foreground hover:border-emerald-500/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sub-category chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveCategory("All"); setPage(1); }}
              aria-pressed={activeCategory === "All"}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeCategory === "All"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/35"
                  : "bg-surface text-muted border-border/80 hover:text-foreground hover:border-border"
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
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/35"
                    : "bg-surface text-muted border-border/80 hover:text-foreground hover:border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Price filter chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium mr-1">Price:</span>
            <button
              onClick={() => { setPriceFilter("All"); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                priceFilter === "All"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/35"
                  : "bg-surface text-muted border-border/80 hover:text-foreground hover:border-border"
              }`}
            >
              All Prices
            </button>
            {PRICE_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => { setPriceFilter(range.label); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  priceFilter === range.label
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/35"
                    : "bg-surface text-muted border-border/80 hover:text-foreground hover:border-border"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Results Grid ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <p className="text-sm text-muted-foreground mb-6">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
          items
        </p>

        {/* ── AdSense leaderboard — above product grid ─────── */}
        {/* Paste your slot ID below once created in AdSense → Ads → By ad unit */}
        <AdSlot slot="" label="trending-top" format="auto" className="mb-4" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginatedItems.map((item, index) => (
            <ScrollReveal key={item.slug} delay={Math.min(index * 50, 800)} placeholder={<SkeletonCard />} className={index === 0 ? "sm:col-span-2 lg:col-span-2 xl:col-span-2" : ""}>
              <TiltCard
                maxTilt={6}
                glowColor="0 8px 40px rgba(52,211,153,0.12), 0 0 0 1px rgba(52,211,153,0.08)"
                className="h-full"
              >
              <div className="group rounded-2xl border border-border/60 bg-surface card-hover-glow transition-all h-full flex flex-col overflow-hidden">
                <div className="overflow-hidden relative">
                  <ItemImage slug={item.slug} alt={item.title} aspectRatio="3/2" width={400} height={267} priority={index < 4} className="group-hover:scale-[1.03] transition-transform duration-500" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setQuickViewItem(item as AnyItem); }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-full shadow">Quick View</span>
                  </button>
                  {item.badge === "editors-pick" && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/90 text-black rounded">
                      Editor&apos;s Pick
                    </span>
                  )}
                  {item.badge === "great-gift" && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-rose-500/90 text-white rounded">
                      🎁 Great Gift
                    </span>
                  )}
                  {item.badge === "best-value" && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/90 text-white rounded">
                      Best Value
                    </span>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <CategoryBadge label={getFilterCategory(item)} color="emerald" />
                    {item.estimatedPriceRange && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.estimatedPriceRange}
                      </span>
                    )}
                  </div>
                  <BookmarkButton slug={item.slug} />
                </div>
                <Link href={`/item/${item.slug}`} aria-label={`Read ${item.title}`} className="block mb-2">
                  <h2 className="text-base font-semibold text-foreground group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {item.title}
                  </h2>
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                  {getItemExcerpt(item)}
                </p>
                {item.sourceLink && (() => { try { return new URL(item.sourceLink).hostname.replace("www.", ""); } catch { return null; } })() && (
                  <a href={item.sourceLink} target="_blank" rel="noopener"
                     onClick={(e) => e.stopPropagation()}
                     className="block text-[11px] text-muted-foreground hover:text-accent transition-colors truncate mb-3">
                    📰 {(() => { try { return new URL(item.sourceLink).hostname.replace("www.", ""); } catch { return ""; } })()}
                  </a>
                )}
                <div className="mt-auto flex flex-col gap-2">
                  {item.availableOnAmazon && ((item as AnyItem).affiliate?.url || item.directAmazonUrl) && (
                  <a
                    href={(item as AnyItem).affiliate?.url || item.directAmazonUrl}
                    target="_blank"
                    rel="sponsored noopener"
                    data-affiliate="true"
                    onClick={(e) => e.stopPropagation()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:shadow-[0_0_25px_rgba(251,191,36,0.3)]"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="currentColor" aria-hidden="true">
                      <path d="M18.42 14.58C16.08 16.28 12.7 17.2 9.82 17.2c-4.03 0-7.66-1.49-10.4-3.97-.22-.2-.02-.47.24-.32 2.96 1.72 6.62 2.76 10.4 2.76 2.55 0 5.36-.53 7.94-1.62.39-.17.72.25.42.53zm1.2-1.37c-.3-.38-1.97-.18-2.72-.09-.23.03-.26-.17-.06-.31 1.33-.94 3.52-.67 3.77-.35.25.32-.07 2.51-1.32 3.56-.19.16-.37.08-.29-.14.28-.72.91-2.29.62-2.67z"/>
                    </svg>
                    Check Price on Amazon
                  </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCompare(item.slug); }}
                    className={`w-full text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                      compareItems.includes(item.slug)
                        ? "bg-accent text-white border-accent"
                        : "border-border text-muted-foreground hover:border-accent hover:text-accent"
                    }`}
                  >
                    {compareItems.includes(item.slug) ? "✓ Added to Compare" : "Compare"}
                  </button>
                </div>
                </div>
              </div>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No products match your search.</p>
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

      {/* ── Affiliate Disclosure ──────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-xl border border-border bg-surface p-5 text-center">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            <span className="font-semibold text-muted">Disclosure:</span>{" "}
            Some links on this page are affiliate links. Surfaced may earn a
            small commission at no extra cost to you. We only feature products
            we genuinely believe in.
          </p>
        </div>
      </section>

      {/* ── Explore Another Category ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-8">
        <div className="p-6 rounded-2xl bg-card/50 border border-border text-center">
          <h3 className="text-lg font-semibold mb-2">Done exploring? Try another category</h3>
          <p className="text-sm text-muted-foreground mb-4">Keep discovering across all of Surfaced.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "Discoveries", href: "/discover" },
              { label: "Hidden Gems", href: "/hidden-gems" },
              { label: "Future Radar", href: "/future-radar" },
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
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.03] to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-4">
            Never Miss a Deal
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Get trending picks in your{" "}
            <span className="gradient-text">inbox.</span>
          </h2>
          <p className="mt-4 text-muted text-lg max-w-lg mx-auto leading-relaxed">
            Weekly product roundups, exclusive deals, and editor&apos;s picks.
          </p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm formId="newsletter-trending" ariaLabel="Subscribe — trending page" />
          </div>
        </div>
      </section>
      <BackToTop />

      {/* ── Floating comparison bar ───────────────────────── */}
      {compareItems.length >= 2 && !showComparison && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border p-4 shadow-2xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{compareItems.length}</span> products selected
              {compareItems.length < 3 && <span className="ml-1 text-xs">(add 1 more or compare now)</span>}
            </span>
            <div className="flex gap-3 items-center">
              <button
                onClick={() => setShowComparison(true)}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Compare Now →
              </button>
              <button
                onClick={() => setCompareItems([])}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comparison panel ─────────────────────────────── */}
      {showComparison && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm overflow-y-auto" onClick={() => setShowComparison(false)}>
          <div className="min-h-screen flex items-start justify-center py-20 px-4">
            <div
              className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-5xl p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Product Comparison</h2>
                <button onClick={() => setShowComparison(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {(() => {
                const compared = compareItems.map(slug => products.find(p => p.slug === slug)).filter(Boolean) as Product[];
                return (
                  <div className={`grid gap-6 ${compared.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {compared.map((p) => (
                      <div key={p.slug} className="flex flex-col gap-4 rounded-xl border border-border p-5 bg-card">
                        <ItemImage slug={p.slug} alt={p.title} aspectRatio="3/2" width={400} height={267} size="sm" />
                        <div>
                          <CategoryBadge label={getFilterCategory(p)} color="emerald" className="mb-2" />
                          <h3 className="font-bold text-foreground text-sm leading-snug mb-1">{p.title}</h3>
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">{p.estimatedPriceRange || "—"}</div>
                        <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-4">{p.shortDescription}</p>
                        {((p as AnyItem).affiliate?.url || p.directAmazonUrl || p.sourceLink) && (
                        <a
                          href={(p as AnyItem).affiliate?.url || p.directAmazonUrl || p.sourceLink}
                          target="_blank"
                          rel="sponsored noopener"
                          className="mt-auto text-center py-2 px-4 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors"
                        >
                          Check Price →
                        </a>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              <button
                onClick={() => { setShowComparison(false); setCompareItems([]); }}
                className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear selection
              </button>
            </div>
          </div>
        </div>
      )}
      {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
    </>
  );
}
