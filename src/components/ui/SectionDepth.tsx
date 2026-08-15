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

    /* Seed --depth-t BEFORE enabling the effects.
       The CSS dims and shrinks .plane-3d as a function of --depth-t, so if
       we flagged the section active first and waited for the first rAF to
       supply a value, every card would sit at opacity .3 in the gap. That
       gap is unbounded when rAF is throttled (background tab, low-power
       mode, heavily loaded device) — which would show dimmed content to
       real readers and to crawlers/reviewers. Writing the true value
       synchronously here means the effects only ever switch on with
       correct state. */
    computeTarget();
    current = target;
    el.style.setProperty("--depth-t", current.toFixed(4));
    el.dataset.depthActive = "";

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

    /* rAF is throttled to a standstill in hidden tabs, so a section that
       scrolled while hidden would still be mid-animation on return. Snap
       to truth whenever the tab comes back. */
    const onVisibility = () => {
      if (document.hidden) return;
      computeTarget();
      current = target;
      el.style.setProperty("--depth-t", current.toFixed(4));
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
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
