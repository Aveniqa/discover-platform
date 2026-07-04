"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * SectionDepth — writes a 0..1 progress variable (--depth-t) onto its
 * wrapper as the section crosses the viewport. Children opt into scrubbed
 * 3D entrances and parallax drift via .plane-3d / .plane-rate-* (and the
 * legacy .depth-* utilities).
 *
 * Luxury-motion details:
 *  - The raw progress is smoothstep-eased, then lerped toward its target
 *    every frame (~12%/frame), so fast flicks settle with a soft glide
 *    instead of snapping — scrubbed but buttery.
 *  - Sets data-depth-active only after hydration when motion is allowed;
 *    the CSS effects are gated on that attribute, so SSR, no-JS, and
 *    prefers-reduced-motion users see the finished layout, never a
 *    half-rotated card.
 *  - IntersectionObserver gates the rAF loop: zero work while the section
 *    is off-screen.
 */
export function SectionDepth({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    el.dataset.depthActive = "";

    let raf = 0;
    let running = false;
    let current = 0;
    let target = 0;

    const smoothstep = (t: number) => t * t * (3 - 2 * t);

    const computeTarget = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the section's top enters the bottom of the viewport,
      // 1 when its bottom leaves the top.
      const raw = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      target = smoothstep(raw);
    };

    const tick = () => {
      computeTarget();
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.0005) current = target;
      el.style.setProperty("--depth-t", current.toFixed(4));
      if (running) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        const wasRunning = running;
        running = entry.isIntersecting;
        if (running && !wasRunning) raf = requestAnimationFrame(tick);
        if (!running && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
          // Snap to the resting value so re-entry starts from truth.
          computeTarget();
          current = target;
          el.style.setProperty("--depth-t", current.toFixed(4));
        }
      },
      { rootMargin: "25% 0px 25% 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      running = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
