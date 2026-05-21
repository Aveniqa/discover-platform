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
  const lastScroll = useRef({ y: 0, time: 0 });
  const idleTimer = useRef<number | null>(null);

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
      const docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const now = performance.now();
      const dt = Math.max(16, now - (lastScroll.current.time || now));
      const dy = window.scrollY - lastScroll.current.y;
      const velocity = Math.max(-60, Math.min(60, dy / (dt / 16.67)));
      const pageT = Math.min(1, Math.max(0, window.scrollY / docMax));
      section.style.setProperty("--scroll-px", `${offset}px`);
      section.style.setProperty("--section-scroll-t", `${Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)))}`);
      document.documentElement.style.setProperty("--scroll-t", String(pageT));
      document.documentElement.style.setProperty("--scroll-vel", String(velocity));
      lastScroll.current = { y: window.scrollY, time: now };
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        document.documentElement.style.setProperty("--scroll-vel", "0");
      }, 300);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const onPointer = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -((event.clientY / window.innerHeight) * 2 - 1);
      document.documentElement.style.setProperty("--pointer-x", String(x));
      document.documentElement.style.setProperty("--pointer-y", String(y));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      if (raf) cancelAnimationFrame(raf);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  return <div ref={ref} className="hidden" aria-hidden="true" />;
}
