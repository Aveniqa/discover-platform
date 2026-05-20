"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cursor companion — a small glowing orb that follows the cursor with a
 * springy delay. Inspired by fuse.kiwi / awwwards-style hero cursors.
 *
 * When the cursor hovers an interactive element (a, button) the orb expands
 * and changes color. On touch devices it doesn't render.
 */
export function CursorCompanion() {
  const ref = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const trail = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Touch devices don't have a meaningful cursor
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const interactive = t.closest("a, button, [role='button'], input, textarea, [data-cursor='hover']");
      const orb = ref.current;
      if (!orb) return;
      if (interactive) {
        orb.classList.add("companion-hover");
      } else {
        orb.classList.remove("companion-hover");
      }
    };

    const onDown = () => ref.current?.classList.add("companion-press");
    const onUp = () => ref.current?.classList.remove("companion-press");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    let raf = 0;
    const tick = () => {
      // Soft spring toward cursor
      current.current.x += (target.current.x - current.current.x) * 0.22;
      current.current.y += (target.current.y - current.current.y) * 0.22;
      // Slower-following "trail" gives a sense of mass
      trail.current.x += (current.current.x - trail.current.x) * 0.10;
      trail.current.y += (current.current.y - trail.current.y) * 0.10;

      const o = ref.current;
      const t = trailRef.current;
      if (o) o.style.transform = `translate3d(${current.current.x - 14}px, ${current.current.y - 14}px, 0)`;
      if (t) t.style.transform = `translate3d(${trail.current.x - 28}px, ${trail.current.y - 28}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={trailRef} className="companion-trail" aria-hidden="true" />
      <div ref={ref} className="companion-orb" aria-hidden="true" />
    </>
  );
}
