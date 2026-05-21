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
  const shadowRef = useRef<HTMLDivElement>(null);
  const echoRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [enabled, setEnabled] = useState(false);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const trail = useRef({ x: 0, y: 0 });
  const shadow = useRef({ x: 0, y: 0 });
  const lastPointer = useRef({ x: 0, y: 0, time: 0 });
  const echoIndex = useRef(0);
  const cardCenter = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Touch devices don't have a meaningful cursor
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    const raf = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(16, now - (lastPointer.current.time || now));
      const speed = Math.hypot(e.clientX - lastPointer.current.x, e.clientY - lastPointer.current.y) / (dt / 1000);
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      lastPointer.current = { x: e.clientX, y: e.clientY, time: now };
      ref.current?.classList.remove("companion-hidden");
      trailRef.current?.classList.remove("companion-hidden");
      shadowRef.current?.classList.remove("companion-hidden");

      if (speed > 1200) {
        for (let i = 0; i < 3; i++) {
          const echo = echoRefs.current[echoIndex.current % echoRefs.current.length];
          echoIndex.current++;
          if (!echo) continue;
          const offset = i * 4;
          echo.style.transition = "none";
          echo.style.opacity = "0.34";
          echo.style.transform = `translate3d(${e.clientX - 8 - offset}px, ${e.clientY - 8}px, 0) scale(${1 - i * 0.12})`;
          requestAnimationFrame(() => {
            echo.style.transition = "opacity 280ms ease, transform 280ms ease";
            echo.style.opacity = "0";
            echo.style.transform = `translate3d(${e.clientX - 8 - offset}px, ${e.clientY - 8}px, 0) scale(0.35)`;
          });
        }
      }
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const interactive = t.closest("a, button, [role='button'], input, textarea, [data-cursor='hover']");
      const tiltCard = t.closest<HTMLElement>(".tilt-3d");
      const orb = ref.current;
      if (!orb) return;
      if (tiltCard) {
        const rect = tiltCard.getBoundingClientRect();
        cardCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        orb.classList.add("companion-card");
      } else {
        cardCenter.current = null;
        orb.classList.remove("companion-card");
      }
      if (interactive) {
        orb.classList.add("companion-hover");
      } else {
        orb.classList.remove("companion-hover");
      }
    };

    const onDown = () => ref.current?.classList.add("companion-press");
    const onUp = () => ref.current?.classList.remove("companion-press");
    const onLeaveWindow = () => {
      ref.current?.classList.add("companion-hidden");
      trailRef.current?.classList.add("companion-hidden");
      shadowRef.current?.classList.add("companion-hidden");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointerleave", onLeaveWindow);
    window.addEventListener("blur", onLeaveWindow);

    let raf = 0;
    const tick = () => {
      const attraction = cardCenter.current;
      const tx = attraction ? target.current.x + (attraction.x - target.current.x) * 0.2 : target.current.x;
      const ty = attraction ? target.current.y + (attraction.y - target.current.y) * 0.2 : target.current.y;
      // Soft spring toward cursor
      current.current.x += (tx - current.current.x) * 0.22;
      current.current.y += (ty - current.current.y) * 0.22;
      // Slower-following "trail" gives a sense of mass
      trail.current.x += (current.current.x - trail.current.x) * 0.10;
      trail.current.y += (current.current.y - trail.current.y) * 0.10;
      shadow.current.x += (current.current.x - shadow.current.x) * 0.16;
      shadow.current.y += (current.current.y - shadow.current.y) * 0.16;

      const o = ref.current;
      const t = trailRef.current;
      const s = shadowRef.current;
      if (o) o.style.transform = `translate3d(${current.current.x - 14}px, ${current.current.y - 14}px, 0)`;
      if (t) t.style.transform = `translate3d(${trail.current.x - 28}px, ${trail.current.y - 28}px, 0)`;
      if (s) s.style.transform = `translate3d(${shadow.current.x - 18}px, ${shadow.current.y + 16}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointerleave", onLeaveWindow);
      window.removeEventListener("blur", onLeaveWindow);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={shadowRef} className="companion-shadow" aria-hidden="true" />
      <div ref={trailRef} className="companion-trail" aria-hidden="true" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          ref={(el) => { echoRefs.current[index] = el; }}
          className="companion-echo"
          aria-hidden="true"
        />
      ))}
      <div ref={ref} className="companion-orb" aria-hidden="true" />
    </>
  );
}
