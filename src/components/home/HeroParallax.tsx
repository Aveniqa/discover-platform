"use client";

import { useEffect, useRef } from "react";

/**
 * HeroParallax — writes window.scrollY (clamped to viewport) onto the hero
 * section as a CSS custom property `--scroll-px`. The `.parallax-slow / -medium
 * / -fast` utilities then translate at fractions of that value to create depth.
 *
 * Mount inside the hero <section>. Stops applying once the user has scrolled
 * past the hero (otherwise the hero text floats away into the next section).
 */
export function HeroParallax() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;
    const section = el.parentElement;
    if (!section) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      // Cap parallax to the height of the hero — once it's scrolled past,
      // freeze the offset so the text doesn't slide away.
      const maxOffset = rect.height * 0.5;
      const offset = Math.max(-maxOffset, Math.min(maxOffset, -rect.top * 0.6));
      section.style.setProperty("--scroll-px", `${offset}px`);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="hidden" aria-hidden="true" />;
}
