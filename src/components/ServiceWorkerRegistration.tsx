"use client";

import { useEffect } from "react";

const SW_CACHE_KEY = "surfaced-sw-cache-mode";
const SW_CACHE_VERSION = "network-first-v3";

/**
 * Registers the service worker for production caching.
 * - HTML navigations stay network-first so deploys are visible immediately.
 * - Static assets (_next/static/) are cached permanently (content-hashed).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Register after page load to avoid competing with initial resources
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          registration.update().catch(() => {});
          navigator.serviceWorker.ready
            .then((readyRegistration) => {
              if (localStorage.getItem(SW_CACHE_KEY) !== SW_CACHE_VERSION) {
                readyRegistration.active?.postMessage("CLEAR_CACHE");
                localStorage.setItem(SW_CACHE_KEY, SW_CACHE_VERSION);
              }
            })
            .catch(() => {});

          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                worker.postMessage("SKIP_WAITING");
              }
            });
          });
        })
        .catch(() => {
          // SW registration failed — no impact on site functionality
        });
    };

    window.addEventListener("load", register);
    return () => {
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
