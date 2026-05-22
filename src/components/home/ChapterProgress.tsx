"use client";

import { useEffect, useRef } from "react";

export function ChapterProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const marker = ref.current;
    const section = marker?.closest<HTMLElement>(".chapter-pin");
    if (!section) return;

    let active = false;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const t = Math.max(0, Math.min(1, -rect.top / travel));
      section.style.setProperty("--chapter-t", String(t));
    };

    const requestUpdate = () => {
      if (!active || raf) return;
      raf = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        update();
      },
      { rootMargin: "20% 0px" }
    );

    observer.observe(section);
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="hidden" aria-hidden="true" />;
}
