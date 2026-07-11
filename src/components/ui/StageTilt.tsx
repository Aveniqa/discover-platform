"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * StageTilt — writes smoothed pointer coordinates (--px/--py, each -1..1)
 * onto its wrapper while the pointer is inside it. The item-page showcase
 * CSS consumes them so the product leans toward the cursor like an object
 * held in hand. rAF-lerped for glide; no-ops under prefers-reduced-motion
 * and on touch devices.
 */
export function StageTilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let px = 0, py = 0, tx = 0, ty = 0;
    let active = false;

    const tick = () => {
      px += (tx - px) * 0.09;
      py += (ty - py) * 0.09;
      el.style.setProperty("--px", px.toFixed(4));
      el.style.setProperty("--py", py.toFixed(4));
      if (active || Math.abs(px) > 0.002 || Math.abs(py) > 0.002) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };
    const ensure = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      active = true;
      ensure();
    };
    const onLeave = () => { tx = 0; ty = 0; active = false; ensure(); };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
