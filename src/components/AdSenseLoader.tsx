"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ADSENSE_CLIENT = "ca-pub-8054019783472830";
const ADSENSE_SCRIPT_ID = "google-adsense-auto-ads";

// Ads run only on editorial content pages. Policy/utility/experience pages
// are excluded — AdSense reviewers penalize ads on low-content surfaces.
const NO_AD_PREFIXES = [
  "/about",
  "/privacy",
  "/terms",
  "/affiliate-disclosure",
  "/contact",
  "/newsletter",
  "/saved",
  "/roulette",
  "/gallery",
];

function canShowAds(pathname: string | null): boolean {
  const path = pathname || "/";
  if (NO_AD_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) {
    return false;
  }
  return true;
}

export function AdSenseLoader() {
  const pathname = usePathname();

  useEffect(() => {
    if (!canShowAds(pathname)) {
      document.getElementById(ADSENSE_SCRIPT_ID)?.remove();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).adsbygoogle;
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).adsbygoogle = [];
      }
      return;
    }
    if (document.getElementById(ADSENSE_SCRIPT_ID)) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const appendScript = () => {
      if (cancelled || document.getElementById(ADSENSE_SCRIPT_ID)) return;
      const script = document.createElement("script");
      script.id = ADSENSE_SCRIPT_ID;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(script);
    };

    const scheduleScript = () => {
      if ("requestIdleCallback" in window) {
        idleId = (window as unknown as {
          requestIdleCallback: (cb: () => void, options?: { timeout: number }) => number;
        }).requestIdleCallback(appendScript, { timeout: 4000 });
        return;
      }
      timeoutId = setTimeout(appendScript, 2500);
    };

    if (document.readyState === "complete") {
      scheduleScript();
    } else {
      window.addEventListener("load", scheduleScript, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleScript);
      if (timeoutId) clearTimeout(timeoutId);
      if (idleId && "cancelIdleCallback" in window) {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
    };
  }, [pathname]);

  return null;
}
