"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * PortalTransition — clicking any internal /item/ link opens a golden iris
 * from the click point; navigation happens mid-bloom and the destination
 * fades in through the ring. Mount once in the root layout.
 *
 * - Event delegation: no per-card wiring; any <a href="/item/…"> qualifies.
 * - Skips modified clicks (new-tab intent), external links, and
 *   prefers-reduced-motion (plain navigation).
 * - Fail-open: if anything throws, the default navigation still happens.
 */
export function PortalTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const animating = useRef(false);

  // On arrival, dissolve any active portal so the new page shows through.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el || !animating.current) return;
    const t = setTimeout(() => {
      el.classList.remove("portal-active");
      el.style.removeProperty("--portal-r");
      animating.current = false;
    }, 260);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!href.startsWith("/item/")) return;
      if (anchor.getAttribute("target") === "_blank") return;
      const el = overlayRef.current;
      if (!el || animating.current) return;

      e.preventDefault();
      animating.current = true;

      const maxR = Math.hypot(
        Math.max(e.clientX, window.innerWidth - e.clientX),
        Math.max(e.clientY, window.innerHeight - e.clientY)
      );
      el.style.setProperty("--portal-x", `${e.clientX}px`);
      el.style.setProperty("--portal-y", `${e.clientY}px`);
      el.classList.add("portal-active");

      const start = performance.now();
      const DURATION = 420;
      const grow = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        const eased = 1 - Math.pow(1 - t, 3);
        el.style.setProperty("--portal-r", `${eased * (maxR + 40)}px`);
        if (t < 1) requestAnimationFrame(grow);
      };
      requestAnimationFrame(grow);

      // Navigate while the iris is closing over the page
      setTimeout(() => router.push(href), Math.round(DURATION * 0.55));
      // Safety: never leave the overlay stuck if navigation stalls
      setTimeout(() => {
        el.classList.remove("portal-active");
        el.style.removeProperty("--portal-r");
        animating.current = false;
      }, 2400);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  return <div ref={overlayRef} className="portal-overlay" aria-hidden="true" />;
}
