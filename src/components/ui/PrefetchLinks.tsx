"use client";

import { useEffect } from "react";

/**
 * Prefetches visible internal links using requestIdleCallback + IntersectionObserver.
 * Only prefetches /item/* and category pages to avoid wasting bandwidth.
 * Uses <link rel="prefetch"> which is low-priority and non-blocking.
 */
const PREFETCH_PATTERNS = [
  /^\/item\//,
  /^\/discover(\/|$)/,
  /^\/trending(\/|$)/,
  /^\/hidden-gems(\/|$)/,
  /^\/future-radar(\/|$)/,
  /^\/tools(\/|$)/,
  /^\/collections(\/|$)/,
];

export function PrefetchLinks() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect data-saver / slow connections
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") return;

    const prefetched = new Set<string>();
    const MAX_PREFETCH = 8; // Limit to avoid excessive requests

    function prefetchUrl(href: string) {
      if (prefetched.size >= MAX_PREFETCH) return;
      if (prefetched.has(href)) return;
      prefetched.add(href);

      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = href;
      link.as = "document";
      document.head.appendChild(link);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const anchor = entry.target as HTMLAnchorElement;
          const href = anchor.getAttribute("href");
          if (!href) continue;

          // Only prefetch internal links matching our patterns
          const matches = PREFETCH_PATTERNS.some((p) => p.test(href));
          if (!matches) continue;

          // Use requestIdleCallback to avoid blocking
          if ("requestIdleCallback" in window) {
            (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => prefetchUrl(href));
          } else {
            setTimeout(() => prefetchUrl(href), 200);
          }

          observer.unobserve(anchor);
        }
      },
      { rootMargin: "200px" } // Start prefetching slightly before links enter viewport
    );

    // Observe all internal links on the page
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/item/"], a[href^="/discover"], a[href^="/trending"], a[href^="/hidden-gems"], a[href^="/future-radar"], a[href^="/tools"], a[href^="/collections"]');
    links.forEach((link) => observer.observe(link));

    return () => observer.disconnect();
  }, []);

  return null;
}
