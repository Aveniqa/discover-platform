"use client";

import { useEffect, useRef, useState } from "react";

interface StickyCTAProps {
  title: string;
  priceRange?: string;
  ctaUrl: string;
  isAffiliate: boolean;
  itemType: string;
  provider?: string;
}

export function StickyCTA({ title, priceRange, ctaUrl, isAffiliate, itemType, provider }: StickyCTAProps) {
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

  const isAmazon = provider === "amazon" || ctaUrl.includes("amazon.com");
  const label = isAmazon ? "Check Price on Amazon" : itemType === "product" ? "Check Price →" : "Visit Site →";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/97 backdrop-blur-md border-t border-border px-4 py-3 flex items-center justify-between gap-4 md:px-8 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] transition-transform duration-300"
      style={{ transform: mainCtaVisible ? "translateY(100%)" : "translateY(0)" }}
      aria-hidden={mainCtaVisible}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Currently viewing</p>
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        {priceRange && (
          <p className="text-sm font-bold text-emerald-400">{priceRange}</p>
        )}
      </div>
      <a
        href={ctaUrl}
        target="_blank"
        rel={isAffiliate ? "sponsored noopener" : "noopener"}
        className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-2 ${
          isAmazon
            ? "bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.2)]"
            : "bg-accent hover:bg-accent/90 text-white"
        }`}
      >
        {isAmazon && (
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M18.42 14.58C16.08 16.28 12.7 17.2 9.82 17.2c-4.03 0-7.66-1.49-10.4-3.97-.22-.2-.02-.47.24-.32 2.96 1.72 6.62 2.76 10.4 2.76 2.55 0 5.36-.53 7.94-1.62.39-.17.72.25.42.53zm1.2-1.37c-.3-.38-1.97-.18-2.72-.09-.23.03-.26-.17-.06-.31 1.33-.94 3.52-.67 3.77-.35.25.32-.07 2.51-1.32 3.56-.19.16-.37.08-.29-.14.28-.72.91-2.29.62-2.67z"/>
          </svg>
        )}
        {label}
      </a>
    </div>
  );
}
