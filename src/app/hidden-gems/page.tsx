"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { ItemImage } from "@/components/ui/ItemImage";
import { hiddenGems, getSubCategories } from "@/lib/data";

export default function HiddenGemsPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sortMode, setSortMode] = useState<string>("default");

  const subCategories = getSubCategories("hidden-gem");

  const filtered = useMemo(() => {
    let items = [...hiddenGems];
    if (activeCategory !== "All") {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.whatItDoes.toLowerCase().includes(q)
      );
    }
    if (sortMode === "az") {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortMode === "category") {
      items.sort((a, b) => a.category.localeCompare(b.category));
    }
    return items;
  }, [activeCategory, searchQuery, sortMode]);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-28 left-1/3 w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-[120px]" />
          <div className="absolute top-40 right-1/4 w-[340px] h-[340px] rounded-full bg-amber-500/6 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400 mb-4">
            Hidden Gems
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
            Hidden{" "}
            <span className="gradient-text">Gems</span>
          </h1>
          <p className="mt-5 text-muted text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Remarkable websites, underground tools, and corners of the internet
            you didn&apos;t know existed.{" "}
            <span className="font-semibold text-foreground">
              {hiddenGems.length}
            </span>{" "}
            gems discovered.
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
                placeholder="Search hidden gems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all"
              />
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="az">A-Z</option>
              <option value="category">Category</option>
            </select>
          </div>

          {/* Sub-category chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("All")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeCategory === "All"
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/35"
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
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/35"
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
          <span className="font-semibold text-foreground">{hiddenGems.length}</span>{" "}
          items
        </p>

        {/* AD_ZONE: sidebar */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item, index) => (
            <ScrollReveal key={item.slug} delay={index * 50} placeholder={<SkeletonCard />}>
              <div className="group rounded-2xl border border-border/60 bg-surface card-hover-glow transition-all h-full flex flex-col overflow-hidden">
                <div className="overflow-hidden">
                  <ItemImage slug={item.slug} alt={item.name} aspectRatio="3/2" width={400} height={267} className="group-hover:scale-[1.03] transition-transform duration-500" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <CategoryBadge label={item.category} color="amber" />
                  <BookmarkButton slug={item.slug} />
                </div>
                <Link href={`/item/${item.slug}`} className="block mb-2">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-amber-300 transition-colors line-clamp-2">
                    {item.name}
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
                    className="inline-flex items-center text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
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
            <p className="text-muted-foreground">No hidden gems match your search.</p>
          </div>
        )}
      </section>

      {/* ── Newsletter CTA ────────────────────────────────── */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.03] to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400 mb-4">
            Discover More
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            New gems delivered{" "}
            <span className="gradient-text">weekly.</span>
          </h2>
          <p className="mt-4 text-muted text-lg max-w-lg mx-auto leading-relaxed">
            The best hidden corners of the internet, straight to your inbox.
          </p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
