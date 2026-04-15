"use client";

import { useRef, useState, type ReactNode } from "react";
import type { AnyItem } from "@/lib/data";

interface CarouselProps {
  items: AnyItem[];
  renderCard: (item: AnyItem, index: number) => ReactNode;
  cardWidthClass?: string;
}

export function Carousel({
  items,
  renderCard,
  cardWidthClass = "w-[300px] sm:w-[320px]",
}: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const scroll = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstChild = el.firstElementChild as HTMLElement | null;
    const cardWidth = firstChild ? firstChild.offsetWidth + 16 : 336;
    el.scrollBy({ left: dir * cardWidth * 3, behavior: "smooth" });
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left arrow — desktop only */}
      <button
        onClick={() => scroll(-1)}
        className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-background/90 border border-border shadow-lg backdrop-blur transition-opacity duration-200 ${
          hovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll left"
      >
        ←
      </button>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
        style={
          {
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties
        }
      >
        {items.map((item, index) => (
          <div key={item.slug} className={`snap-start shrink-0 ${cardWidthClass}`}>
            {renderCard(item, index)}
          </div>
        ))}
      </div>

      {/* Right arrow — desktop only */}
      <button
        onClick={() => scroll(1)}
        className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-background/90 border border-border shadow-lg backdrop-blur transition-opacity duration-200 ${
          hovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll right"
      >
        →
      </button>

      {/* Fade hint */}
      <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />

      {/* Mobile: show all / expanded grid — CSS-controlled, no JS detection */}
      <div className="md:hidden">
        {!expanded && items.length > 6 && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-3 w-full py-2.5 text-sm text-accent hover:text-accent/80 transition-colors text-center border border-border/50 rounded-lg"
          >
            Show all {items.length} items ↓
          </button>
        )}
        {expanded && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {items.slice(6).map((item, i) => (
              <div key={`exp-${item.slug}`} className="overflow-hidden">
                {renderCard(item, i + 6)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
