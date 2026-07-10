"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { deriveWorldSeed } from "@/lib/world-seed";

const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

/**
 * GlobalWorld — the persistent 3D world that lives behind every route.
 *
 * Mounted once in app/layout.tsx, never unmounts on client navigation. As the
 * pathname changes the seed updates (palette + motif morphs in place), and
 * scroll position drives the shader uniforms / camera. The result is one
 * continuous environment instead of disconnected per-section backdrops.
 *
 * Performance gates:
 *  - Defers initial mount to requestIdleCallback so the page is content-ready
 *    before WebGL spins up. AdSense reviewers + crawlers still see real HTML.
 *  - Respects prefers-reduced-motion — falls back to a static CSS radial
 *    gradient using the same palette.
 *  - Detects mobile-class GPUs and lowers DPR / disables some passes.
 *  - Tab-hidden = pause: visibilitychange listener throttles to 0 fps when the
 *    tab isn't visible so we don't drain battery in background tabs.
 */
export function GlobalWorld() {
  const pathname = usePathname();
  const [seed, setSeed] = useState(() => deriveWorldSeed({ pathname: pathname || "/" }));
  const [enabled, setEnabled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const scrollTRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [scrollT, setScrollT] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  // Update seed on route change OR when the item page tells us it's seeded.
  // Reading [data-item-slug] from <body> lets item pages contribute their
  // slug to the seed for unique per-item worlds.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const reseed = () => {
      const slug = document.body.dataset.itemSlug;
      const category = document.body.dataset.itemCategory;
      setSeed(deriveWorldSeed({ pathname: pathname || "/", slug, category }));
    };
    reseed();
    // Tell the world a navigation happened — the particle systems answer
    // with an ember surge + center burst (the "particle transformation").
    window.dispatchEvent(new Event("surfaced:navigated"));
    window.addEventListener("surfaced:world-reseed", reseed);
    return () => window.removeEventListener("surfaced:world-reseed", reseed);
  }, [pathname]);

  // Defer WebGL boot until idle so the first paint is content
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    const idle = (cb: () => void) =>
      w.requestIdleCallback ? w.requestIdleCallback(cb, { timeout: 1500 }) : window.setTimeout(cb, 800);
    idle(() => setEnabled(true));
  }, []);

  // Scroll progress 0..1 (capped at scrollable height)
  useEffect(() => {
    let raf = 0;
    const handler = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const t = Math.min(1, window.scrollY / max);
        scrollTRef.current = t;
        setScrollT(t);
      });
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => {
      window.removeEventListener("scroll", handler);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Pointer parallax — normalize to -1..1
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(((e.clientY / window.innerHeight) * 2 - 1));
      pointerRef.current = { x, y };
      setPointer({ x, y });
    };
    window.addEventListener("pointermove", handler, { passive: true });
    return () => window.removeEventListener("pointermove", handler);
  }, []);

  // Pause rendering when tab is hidden (saves battery on long-open tabs)
  useEffect(() => {
    const handler = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Gold-on-near-black fallback matching the molten WebGL scene — shown to
  // reduced-motion users and during the idle-deferred WebGL boot.
  const fallback = `radial-gradient(ellipse at 50% 42%, rgba(246,198,109,0.14), transparent 55%), radial-gradient(at 50% 100%, rgba(138,90,28,0.10), transparent 60%), #0a0908`;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10"
      style={{ background: fallback }}
    >
      {enabled && !hidden && (
        <WorldCanvas seed={seed} scrollT={scrollT} pointer={pointer} />
      )}
      {/* Scrim — keeps text readable against the lively backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 25%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
}
