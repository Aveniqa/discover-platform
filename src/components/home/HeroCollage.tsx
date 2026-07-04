"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";

export interface CollageItem {
  slug: string;
  title: string;
  visual: string; // /screenshots/… or cached photo URL
}

/**
 * HeroCollage — floating wall of real product screenshots behind/around the
 * hero copy. Each card lives on one of three depth tiers; pointer movement
 * and scroll drive per-tier parallax so the stack reads as a volume, not a
 * wallpaper. Cards drift on a slow idle float and carry a perspective tilt.
 *
 * All motion is transform-only (GPU compositing) driven by one rAF loop.
 * Disabled for prefers-reduced-motion (renders static, still image-rich).
 */
export function HeroCollage({ items }: { items: CollageItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const root = rootRef.current;
    if (!root) return;

    let raf = 0;
    let running = false;
    let px = 0, py = 0;          // smoothed pointer -1..1
    let tx = 0, ty = 0;          // target pointer
    let sc = 0, tsc = 0;         // smoothed + target scroll

    const onPointer = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      tsc = Math.min(1.4, window.scrollY / window.innerHeight);
    };

    const tick = () => {
      // Lerp everything — flick-scrolls glide instead of snapping.
      px += (tx - px) * 0.055;
      py += (ty - py) * 0.055;
      sc += (tsc - sc) * 0.1;
      root.style.setProperty("--hx", px.toFixed(4));
      root.style.setProperty("--hy", py.toFixed(4));
      root.style.setProperty("--hs", sc.toFixed(4));
      if (running) raf = requestAnimationFrame(tick);
    };

    // Only animate while the hero is on screen — past it, the loop is idle.
    const io = new IntersectionObserver(
      ([entry]) => {
        const was = running;
        running = entry.isIntersecting;
        if (running && !was) raf = requestAnimationFrame(tick);
        if (!running && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "10% 0px 10% 0px" }
    );
    io.observe(root);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      running = false;
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Deterministic layout slots — tuned so cards ring the hero copy without
  // covering it. tier: 0 = far (small/slow), 1 = mid, 2 = near (big/fast).
  const slots = [
    { top: "5%",  left: "2%",   rot: -8,  tier: 1 },
    { top: "10%", left: "80%",  rot: 7,   tier: 2 },
    { top: "42%", left: "-6%",  rot: 5,   tier: 2 },
    { top: "56%", left: "85%",  rot: -6,  tier: 1 },
    { top: "80%", left: "-3%",  rot: 8,   tier: 0 },
    { top: "1%",  left: "34%",  rot: -4,  tier: 0 },
    { top: "84%", left: "76%",  rot: 5,   tier: 2 },
    { top: "32%", left: "92%",  rot: -9,  tier: 0 },
    { top: "68%", left: "-5%",  rot: -5,  tier: 1 },
    { top: "90%", left: "30%",  rot: 4,   tier: 1 },
  ];

  const tierStyle = (tier: number) => {
    // Deeper tiers move less with the pointer and blur slightly — cheap DOF.
    const move = [14, 30, 52][tier];
    const scrollMove = [40, 90, 150][tier];
    const scale = [0.72, 0.9, 1.08][tier];
    const opacity = [0.45, 0.62, 0.85][tier];
    const blur = [1.5, 0.5, 0][tier];
    // Near tiers also swing subtly toward the cursor and scale up as you
    // scroll away — the stack opens outward like passing through it.
    const swing = [1.5, 3, 5][tier];
    const zoom = [0.04, 0.09, 0.16][tier];
    return {
      transform:
        `perspective(1200px) ` +
        `translate3d(calc(var(--hx, 0) * ${move}px), calc(var(--hy, 0) * ${move}px + var(--hs, 0) * -${scrollMove}px), 0) ` +
        `rotateY(calc(var(--hx, 0) * ${swing}deg)) rotateX(calc(var(--hy, 0) * ${-swing}deg)) ` +
        `scale(calc(${scale} + var(--hs, 0) * ${zoom}))`,
      opacity: `calc(${opacity} - var(--hs, 0) * 0.5)`,
      filter: blur ? `blur(${blur}px)` : undefined,
    } satisfies CSSProperties;
  };

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none hero-collage"
      style={{ perspective: "1200px" }}
    >
      {items.slice(0, slots.length).map((item, i) => {
        const s = slots[i];
        return (
          <div
            key={item.slug}
            className="absolute w-[210px] sm:w-[260px] lg:w-[300px] transition-opacity duration-700 will-change-transform"
            style={{ top: s.top, left: s.left, ...tierStyle(s.tier) }}
          >
            <Link
              href={`/item/${item.slug}`}
              tabIndex={-1}
              className="block pointer-events-auto group"
              data-cursor="hover"
            >
              <div
                className="hero-collage-card rounded-xl overflow-hidden border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
                style={
                  {
                    "--rot": `${s.rot}deg`,
                    transform: `rotate(${s.rot}deg)`,
                    animation: `collage-float ${9 + (i % 5) * 1.7}s ease-in-out ${i * 0.6}s infinite alternate`,
                  } as CSSProperties
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.visual}
                  alt=""
                  width={300}
                  height={188}
                  loading={i < 4 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full aspect-[8/5] object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <p className="absolute bottom-1.5 left-2.5 right-2 text-[10px] font-semibold text-white/90 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.title}
                </p>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
