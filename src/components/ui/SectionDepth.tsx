"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * SectionDepth — writes a 0..1 progress variable (--depth-t) onto its
 * wrapper as the section crosses the viewport. Children opt into parallax
 * drift with the .depth-slow / .depth-medium / .depth-fast utilities, so
 * cards inside a section separate into depth planes while scrolling.
 *
 * One rAF-throttled scroll listener per section; transform-only effects.
 * No-op under prefers-reduced-motion.
 */
export function SectionDepth({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let active = false;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the section's top enters the bottom of the viewport,
      // 1 when its bottom leaves the top.
      const t = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      el.style.setProperty("--depth-t", t.toFixed(4));
    };

    const onScroll = () => {
      if (!active || raf) return;
      raf = requestAnimationFrame(update);
    };

    // Only track while near the viewport — IO gates the scroll work.
    const io = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        if (active) update();
      },
      { rootMargin: "20% 0px 20% 0px" }
    );
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
