"use client";

import { useEffect, useRef, useState } from "react";

interface StickyCTAProps {
  title: string;
  priceRange?: string;
  ctaUrl: string;
  isAffiliate: boolean;
  itemType: string;
}

export function StickyCTA({ title, priceRange, ctaUrl, isAffiliate, itemType }: StickyCTAProps) {
  const [mainCtaVisible, setMainCtaVisible] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const mainCta = document.getElementById("main-cta-button");
    if (!mainCta) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => setMainCtaVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: "0px" }
    );
    observerRef.current.observe(mainCta);

    return () => observerRef.current?.disconnect();
  }, []);

  const label = itemType === "product" ? "Check Price →" : "Visit Site →";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex items-center justify-between gap-4 md:px-8 transition-transform duration-300"
      style={{ transform: mainCtaVisible ? "translateY(100%)" : "translateY(0)" }}
      aria-hidden={mainCtaVisible}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {priceRange && (
          <p className="text-xs text-muted-foreground">{priceRange}</p>
        )}
      </div>
      <a
        href={ctaUrl}
        target="_blank"
        rel={isAffiliate ? "sponsored noopener" : "noopener"}
        className="shrink-0 px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
      >
        {label}
      </a>
    </div>
  );
}
