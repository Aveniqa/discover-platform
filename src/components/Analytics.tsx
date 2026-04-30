"use client";

import { useEffect } from "react";
import { track, trackPageView, classifyOutbound } from "@/lib/analytics";

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;

  useEffect(() => {
    trackPageView();

    // Delegate outbound clicks — covers item CTAs, Best Buy alt link,
    // source links, and the newsletter source link without per-element wiring.
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      // Only outbound targets
      const isExternal = target.target === "_blank" || /^https?:\/\//i.test(href);
      if (!isExternal) return;
      const slug = target.getAttribute("data-item-slug") || undefined;
      const kind = classifyOutbound(href);
      let host = "";
      try { host = new URL(href, window.location.origin).hostname.replace(/^www\./, ""); } catch { /* noop */ }
      track("outbound_click", { host, kind, slug });
    };
    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, []);

  if (!domain) return null;

  return (
    <script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.outbound-links.js"
    />
  );
}
