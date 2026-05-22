"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { deriveWorldSeed } from "@/lib/world-seed";

const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

type WorldQuality = "full" | "lite";

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
  const [inViewport, setInViewport] = useState(true);
  const scrollTRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const lastScrollRef = useRef({ y: 0, time: 0 });
  const idleTimerRef = useRef<number | null>(null);
  const [scrollT, setScrollT] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [quality, setQuality] = useState<WorldQuality>("full");

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
    window.addEventListener("surfaced:world-reseed", reseed);
    return () => window.removeEventListener("surfaced:world-reseed", reseed);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const path = pathname || "/";
    const intensity = path.startsWith("/item/")
      ? "0.7"
      : ["/about", "/contact", "/privacy", "/terms", "/editorial-standards", "/affiliate-disclosure"].includes(path)
        ? "0.4"
        : path === "/"
          ? "1"
          : "0.82";
    document.body.dataset.worldIntensity = intensity;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches === true;
    const narrow = window.innerWidth < 900;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const lowData = connection && "saveData" in connection
      ? connection.saveData === true
      : false;
    const raf = requestAnimationFrame(() => setQuality(coarse || narrow || lowData ? "lite" : "full"));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Defer WebGL boot until idle so the first paint is content
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches === true;
    const narrow = window.innerWidth < 900;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const lowData = connection && "saveData" in connection
      ? connection.saveData === true
      : false;
    if (coarse || narrow || lowData) return;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    const idle = (cb: () => void) =>
      w.requestIdleCallback ? w.requestIdleCallback(cb, { timeout: 1500 }) : window.setTimeout(cb, 800);
    idle(() => setEnabled(true));
  }, []);

  // Gate the persistent canvas with IntersectionObserver. It normally stays
  // active because #main-content spans the reading surface, but it avoids a
  // live WebGL renderer when the app shell is mounted offscreen in tests or
  // embedded previews.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      return;
    }
    const target = document.getElementById("main-content");
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting),
      { rootMargin: "240px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Scroll progress 0..1 (capped at scrollable height)
  useEffect(() => {
    let raf = 0;
    const depthScenes = Array.from(document.querySelectorAll<HTMLElement>(".depth-scene"));
    const depthSceneRatios = new Map<HTMLElement, number>();
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              depthSceneRatios.set(entry.target as HTMLElement, entry.intersectionRatio);
            });
            handler();
          },
          { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] }
        )
      : null;
    const updateSectionProgress = () => {
      depthScenes.forEach((scene) => {
        const rect = scene.getBoundingClientRect();
        const sectionT = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
        const exitStart = window.innerHeight * 0.4;
        const exitT = rect.bottom < exitStart
          ? Math.max(0, Math.min(1, (exitStart - rect.bottom) / Math.max(1, rect.height * 0.4)))
          : 0;
        scene.style.setProperty("--section-scroll-t", String(sectionT));
        scene.style.setProperty("--section-exit-t", String(exitT));
        scene.style.setProperty("--section-io-ratio", String(depthSceneRatios.get(scene) ?? 0));
      });
    };
    const handler = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const now = performance.now();
        const currentY = window.scrollY;
        const t = Math.min(1, currentY / max);
        const dt = Math.max(16, now - (lastScrollRef.current.time || now));
        const dy = currentY - lastScrollRef.current.y;
        const velocity = Math.max(-60, Math.min(60, dy / (dt / 16.67)));
        const tilt = Math.max(-1.5, Math.min(1.5, velocity * 0.04));
        lastScrollRef.current = { y: currentY, time: now };
        scrollTRef.current = t;
        setScrollT(t);
        setScrollVelocity(velocity);
        document.documentElement.style.setProperty("--scroll-t", String(t));
        document.documentElement.style.setProperty("--scroll-vel", String(velocity));
        document.documentElement.style.setProperty("--scroll-tilt", `${tilt}deg`);
        updateSectionProgress();
        if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = window.setTimeout(() => {
          setScrollVelocity(0);
          document.documentElement.style.setProperty("--scroll-vel", "0");
          document.documentElement.style.setProperty("--scroll-tilt", "0deg");
        }, 300);
      });
    };
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    depthScenes.forEach((scene) => observer?.observe(scene));
    handler();
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
      observer?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [pathname]);

  // Pointer parallax — normalize to -1..1
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(((e.clientY / window.innerHeight) * 2 - 1));
      pointerRef.current = { x, y };
      setPointer({ x, y });
      document.documentElement.style.setProperty("--pointer-x", String(x));
      document.documentElement.style.setProperty("--pointer-y", String(y));
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

  const shouldKeepDepartureAlive = seed.scene === "item" && scrollT > 0.9;
  const shouldRenderWorld = enabled && !hidden && (inViewport || shouldKeepDepartureAlive);
  const legalPath = ["/about", "/contact", "/privacy", "/terms", "/editorial-standards", "/affiliate-disclosure"].includes(pathname || "/");
  const worldIntensity = seed.scene === "item" ? 0.7 : legalPath ? 0.4 : pathname === "/" ? 1 : 0.82;
  const [a, b, c] = seed.alcove.palette;
  const fallback = `radial-gradient(at 28% 20%, ${a}55, transparent 60%), radial-gradient(at 72% 78%, ${b}33, transparent 65%), ${c}`;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10"
      style={{ background: fallback, transition: "background 600ms cubic-bezier(0.65, 0, 0.35, 1)" }}
    >
      {shouldRenderWorld && (
        <WorldCanvas
          seed={seed}
          scrollT={scrollT}
          scrollVelocity={scrollVelocity}
          pointer={pointer}
          quality={quality}
          worldIntensity={worldIntensity}
        />
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
