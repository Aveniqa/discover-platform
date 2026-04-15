"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for stale-while-revalidate caching.
 * - Item pages and category pages load instantly for returning visitors.
 * - Fresh content is fetched in the background after each daily update.
 * - Static assets (_next/static/) are cached permanently (content-hashed).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Register after page load to avoid competing with initial resources
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // SW registration failed — no impact on site functionality
        });
    });
  }, []);

  return null;
}
