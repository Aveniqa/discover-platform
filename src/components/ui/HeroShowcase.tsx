"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ItemImage } from "@/components/ui/ItemImage";
import {
  getAllItems,
  getItemTitle,
  getItemDescription,
  getCategoryLabel,
  getCategoryColor,
  type AnyItem,
} from "@/lib/data";

/**
 * HeroShowcase — A scrollable carousel of 30 large image cards.
 * On hover, the hovered card enlarges while neighbors shrink slightly,
 * and a one-sentence summary fades in over the image.
 * Arrow buttons appear on hover for desktop navigation.
 */

function getShowcaseItems(): AnyItem[] {
  // Diverse round-robin: ~6 items from each of 5 categories, badged first
  const all = getAllItems();
  const byType: Record<string, AnyItem[]> = {};
  for (const item of all) {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  }

  const result: AnyItem[] = [];
  const seen = new Set<string>();
  const types = Object.keys(byType);

  // First pass: badged items from each category
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

  // Second pass: round-robin newest from each category
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

export function HeroShowcase() {
  const items = getShowcaseItems();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [containerHovered, setContainerHovered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 900, behavior: "smooth" });
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setContainerHovered(true)}
      onMouseLeave={() => { setContainerHovered(false); setHoveredIdx(null); }}
    >
      {/* Left arrow — desktop only */}
      <button
        onClick={() => scroll(-1)}
        className={`hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-background/90 border border-border shadow-lg backdrop-blur transition-opacity duration-200 ${
          containerHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll left"
      >
        ←
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 sm:gap-3 h-[220px] sm:h-[340px] lg:h-[400px] overflow-x-auto px-2 sm:px-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {items.map((item, idx) => {
          const title = getItemTitle(item);
          const desc = getItemDescription(item);
          const label = getCategoryLabel(item.type);
          const color = getCategoryColor(item.type);
          const isHovered = hoveredIdx === idx;

          return (
            <Link
              key={item.slug}
              href={`/item/${item.slug}`}
              className="relative block rounded-xl overflow-hidden cursor-pointer group w-[160px] sm:w-[220px] lg:w-[260px] shrink-0 snap-start"
              style={{
                flex: isHovered ? "0 0 320px" : undefined,
                transition: "flex 0.5s cubic-bezier(0.25, 1, 0.5, 1), width 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
            >
              {/* Image */}
              <div className="absolute inset-0">
                <ItemImage
                  slug={item.slug}
                  alt={title}
                  width={600}
                  height={800}
                  aspectRatio="auto"
                  size="lg"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Permanent dark gradient at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Category pill — always visible */}
              <div className="absolute top-3 left-3 z-10">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm ${
                    colorAccent[color] || colorAccent.indigo
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Title — always visible at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-10">
                <h3
                  className="text-white font-bold leading-snug transition-all duration-300"
                  style={{
                    fontSize: isHovered ? "1.1rem" : "0.8rem",
                  }}
                >
                  <span className="line-clamp-2">{title}</span>
                </h3>

                {/* Description — only appears on hover */}
                <p
                  className="text-white/70 text-xs sm:text-sm leading-relaxed mt-1 line-clamp-2 transition-all duration-300"
                  style={{
                    opacity: isHovered ? 1 : 0,
                    maxHeight: isHovered ? "3rem" : "0",
                    overflow: "hidden",
                  }}
                >
                  {desc}
                </p>

                {/* Explore arrow — hover only */}
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent mt-2 transition-all duration-300"
                  style={{
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? "translateY(0)" : "translateY(8px)",
                  }}
                >
                  Explore →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Right arrow — desktop only */}
      <button
        onClick={() => scroll(1)}
        className={`hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-background/90 border border-border shadow-lg backdrop-blur transition-opacity duration-200 ${
          containerHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll right"
      >
        →
      </button>

      {/* Right fade hint */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
    </div>
  );
}
