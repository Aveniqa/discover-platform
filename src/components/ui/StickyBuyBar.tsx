"use client";

import { useState, useEffect } from "react";

interface StickyBuyBarProps {
  outboundUrl: string;
  title: string;
  priceRange?: string;
  isAffiliate: boolean;
  provider?: string;
}

/**
 * Mobile-only sticky bottom bar that appears once the main CTA button
 * scrolls out of view. Keeps a "Check Price on Amazon" button always
 * accessible without the user hunting for it.
 */
export function StickyBuyBar({ outboundUrl, title, priceRange, isAffiliate, provider }: StickyBuyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cta = document.getElementById("main-cta-button");
    if (!cta) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(cta);
    return () => observer.disconnect();
  }, []);

  const isAmazon = provider === "amazon" || outboundUrl.includes("amazon.com");

  return (
    <div
      aria-hidden={!visible}
      className={`fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-background/97 backdrop-blur-md border-t border-border/80 px-4 py-3 flex items-center gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground truncate">{title}</p>
        {priceRange && (
          <p className="text-sm font-bold text-foreground leading-tight">{priceRange}</p>
        )}
      </div>

      {/* CTA button */}
      <a
        href={outboundUrl}
        target="_blank"
        rel={isAffiliate ? "sponsored noopener" : "noopener"}
        className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
          isAmazon
            ? "bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.25)]"
            : "bg-accent hover:bg-accent/90 text-white"
        }`}
      >
        {isAmazon && (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.699-3.182v.685zm3.186 7.705c-.209.189-.512.201-.745.074-1.052-.872-1.238-1.276-1.814-2.106-1.734 1.767-2.962 2.297-5.209 2.297-2.66 0-4.731-1.641-4.731-4.925 0-2.565 1.391-4.309 3.37-5.164 1.715-.754 4.11-.891 5.942-1.095v-.41c0-.753.06-1.642-.384-2.294-.385-.579-1.124-.818-1.774-.818-1.205 0-2.277.618-2.54 1.897-.054.285-.261.567-.549.582l-3.061-.333c-.259-.058-.548-.266-.472-.66C6.22 2.88 9.074 2 11.652 2c1.317 0 3.038.351 4.077 1.346C16.95 4.565 16.81 6.17 16.81 7.914v4.107c0 1.236.512 1.779 .993 2.444.17.236.207.519-.009.696l-2.65 2.634-.001-.001z"/>
          </svg>
        )}
        {isAmazon ? "Check Price" : "View Now"}
      </a>
    </div>
  );
}
