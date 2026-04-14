"use client";

import { useState } from "react";
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
 * HeroShowcase — A visually striking carousel of large image cards.
 * On hover, the hovered card enlarges while others shrink slightly,
 * and a one-sentence summary fades in over the image.
 */

function getShowcaseItems(): AnyItem[] {
  // Take the newest items across all categories, prioritize badged items
  const all = getAllItems();
  const badged = all.filter((i) => !!(i as { badge?: string }).badge);
  const newest = [...all].sort((a, b) => (b.id || 0) - (a.id || 0));

  // Deduplicate: badged first, then newest, max 8
  const seen = new Set<string>();
  const result: AnyItem[] = [];
  for (const item of [...badged, ...newest]) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    result.push(item);
    if (result.length >= 8) break;
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

  return (
    <div
      className="flex gap-2 sm:gap-3 h-[220px] sm:h-[340px] lg:h-[400px] overflow-x-auto sm:overflow-hidden px-2 sm:px-4"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      {items.map((item, idx) => {
        const title = getItemTitle(item);
        const desc = getItemDescription(item);
        const label = getCategoryLabel(item.type);
        const color = getCategoryColor(item.type);
        const isHovered = hoveredIdx === idx;
        const isAnyHovered = hoveredIdx !== null;

        return (
          <Link
            key={item.slug}
            href={`/item/${item.slug}`}
            className="relative block rounded-xl overflow-hidden cursor-pointer group w-[140px] shrink-0 sm:w-auto sm:shrink"
            style={{
              flex: isHovered ? "2.5 1 0%" : isAnyHovered ? "0.7 1 0%" : "1 1 0%",
              transition: "flex 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
              minWidth: 0,
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
  );
}
