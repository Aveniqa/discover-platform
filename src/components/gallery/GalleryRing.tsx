"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

export interface GalleryEntry {
  slug: string;
  title: string;
  visual: string;
  category: string;
}

/**
 * GalleryRing — a 3D carousel of real site screenshots arranged on a
 * cylinder (CSS preserve-3d). Drag, flick, or mouse-wheel to spin it;
 * momentum decays naturally and the ring auto-drifts when idle. The card
 * facing front lifts, brightens, and shows its caption; clicking any card
 * opens the item page.
 *
 * Pure CSS 3D transforms driven by one rAF loop — no WebGL, composited
 * only. Under prefers-reduced-motion the ring renders static (front card
 * fixed) and the grid below remains the primary navigation.
 */
export function GalleryRing({ entries }: { entries: GalleryEntry[] }) {
  const N = entries.length;
  const step = 360 / N;
  const radius = Math.round((300 / 2 / Math.tan(Math.PI / N)) * 1.15);

  const stageRef = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const reduced = useRef(false);
  const [frontIndex, setFrontIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced.current) return;

    const stage = stageRef.current;
    if (!stage) return;
    let raf = 0;

    const tick = () => {
      if (!dragging.current) {
        // idle drift + momentum decay
        velocity.current *= 0.95;
        angle.current += velocity.current + 0.045;
      }
      stage.style.transform = `translateZ(-${radius}px) rotateY(${angle.current}deg)`;
      const idx = ((Math.round(-angle.current / step) % N) + N) % N;
      setFrontIndex(idx);
      raf = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      lastX.current = e.clientX;
      velocity.current = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      angle.current += dx * 0.25;
      velocity.current = dx * 0.12;
    };
    const onUp = () => { dragging.current = false; };
    const onWheel = (e: WheelEvent) => {
      velocity.current += (e.deltaY + e.deltaX) * 0.012;
    };

    const wrap = stage.parentElement!;
    wrap.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    wrap.addEventListener("wheel", onWheel, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      wrap.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf);
    };
  }, [N, step, radius]);

  return (
    <div className="gallery-stage select-none" aria-label="3D gallery of featured tools — drag to spin">
      <div ref={stageRef} className="gallery-ring" style={{ transform: `translateZ(-${radius}px)` }}>
        {entries.map((entry, i) => (
          <Link
            key={entry.slug}
            href={`/item/${entry.slug}`}
            data-cursor="hover"
            className={`gallery-card ${i === frontIndex ? "gallery-card-front" : ""}`}
            style={{ "--ry": `${i * step}deg`, "--tz": `${radius}px` } as CSSProperties}
            aria-label={`${entry.title} — ${entry.category}`}
            draggable={false}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.visual}
              alt={`Screenshot of ${entry.title}`}
              width={300}
              height={188}
              loading={i < 8 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className="w-full aspect-[8/5] object-cover object-top"
            />
            <span className="gallery-caption">
              <span className="block text-[10px] uppercase tracking-[0.2em] text-amber-200/90">{entry.category}</span>
              <span className="block text-sm font-semibold text-white truncate">{entry.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
