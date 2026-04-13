"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import type { AnyItem } from "@/lib/data";

interface CarouselProps {
  items: AnyItem[];
  /** Render a card; the returned element fills its wrapper — do not set a fixed width on the card. */
  renderCard: (item: AnyItem) => ReactNode;
  /** Width class applied to each carousel card wrapper. Defaults to "w-[300px] sm:w-[320px]" */
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstChild = el.firstElementChild as HTMLElement | null;
    const gap = 16; // gap-4 = 1rem = 16px at default font-size
    const cardWidth = firstChild ? firstChild.offsetWidth + gap : 336;
    el.scrollBy({ left: dir * cardWidth * 3, behavior: "smooth" });
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left arrow */}
      <button
        onClick={() => scroll(-1)}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-background/90 border border-border shadow-lg backdrop-blur transition-opacity duration-200 ${
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
        {items.map((item) => (
          <div key={item.slug} className={`snap-start shrink-0 ${cardWidthClass}`}>
            {renderCard(item)}
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll(1)}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-background/90 border border-border shadow-lg backdrop-blur transition-opacity duration-200 ${
          hovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll right"
      >
        →
      </button>

      {/* Fade hint — indicates more cards to scroll */}
      <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />

      {/* Mobile: Show all button */}
      {isMobile && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 w-full py-2 text-sm text-accent hover:text-accent/80 transition-colors text-center"
        >
          Show all {items.length} items ↓
        </button>
      )}

      {/* Mobile: expanded 2-col grid */}
      {isMobile && expanded && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {items.map((item) => (
            <div key={`expanded-${item.slug}`} className="overflow-hidden">
              {renderCard(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
