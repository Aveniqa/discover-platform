"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ADSENSE_CLIENT = "ca-pub-8054019783472830";
const ADSENSE_SCRIPT_ID = "google-adsense-auto-ads";

const NO_AD_PREFIXES = [
  "/about",
  "/privacy",
  "/terms",
  "/affiliate-disclosure",
  "/contact",
  "/newsletter",
  "/premium",
  "/saved",
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

    const script = document.createElement("script");
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(script);
  }, [pathname]);

  return null;
}
