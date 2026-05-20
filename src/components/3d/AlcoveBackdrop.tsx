"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Alcove } from "@/lib/alcoves";

const AlcoveCanvas = dynamic(() => import("./AlcoveCanvas"), {
  ssr: false,
  loading: () => null,
});

interface Props {
  alcove: Alcove;
  /** Fixed full-screen (homepage hero). When false, fills its parent. */
  fixed?: boolean;
  /** Smaller, lower-effort variant for inside cards / item pages */
  intimate?: boolean;
  /** Track scroll progress 0..1 of this element through the viewport */
  trackScroll?: boolean;
  className?: string;
}

/**
 * AdSense + perf friendly wrapper around the WebGL alcove. Renders an immediate
 * CSS gradient fallback so the section is never blank for crawlers, then upgrades
 * to the 3D canvas once the page is idle and the user hasn't asked for reduced
 * motion. Tracks scroll progress through the parent element so the shader can
 * react to it.
 */
export function AlcoveBackdrop({
  alcove,
  fixed = false,
  intimate = false,
  trackScroll = false,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollT, setScrollT] = useState(0);

  useEffect(() => {
    if (!trackScroll) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const handler = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        // 0 when top reaches viewport, 1 when bottom passes
        const t = 1 - Math.max(0, Math.min(1, (rect.bottom) / (vh + rect.height)));
        setScrollT(t);
      });
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => {
      window.removeEventListener("scroll", handler);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [trackScroll]);

  const [a, b, c] = alcove.palette;
  const fallbackGradient = `radial-gradient(at 30% 20%, ${a}33, transparent 60%), radial-gradient(at 75% 70%, ${b}26, transparent 65%), ${c}`;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden absolute inset-0 z-0 ${className ?? ""}`}
      style={{ background: fallbackGradient }}
    >
      <AlcoveCanvas alcove={alcove} fixed={false} intimate={intimate} scrollT={scrollT} />
      {/* soft scrim so text always reads */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: fixed
            ? "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.55) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.30), rgba(0,0,0,0.55))",
        }}
      />
    </div>
  );
}
