"use client";

import { useEffect } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import Link from "next/link";
import { ItemImage } from "@/components/ui/ItemImage";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { LogoImage } from "@/components/ui/LogoImage";
import { ShareButtons } from "@/components/ui/ShareButtons";
import {
  getItemTitle,
  getItemDescription,
  getItemWhyText,
  getItemOutboundUrl,
  getCtaLabel,
  getCategoryColor,
  getCategoryLabel,
  type AnyItem,
  type Product,
  type HiddenGem,
  type DailyTool,
} from "@/lib/data";

interface QuickViewModalProps {
  item: AnyItem;
  onClose: () => void;
}

export function QuickViewModal({ item, onClose }: QuickViewModalProps) {
  const title = getItemTitle(item);
  const description = getItemDescription(item);
  const whyText = getItemWhyText(item);
  const outboundUrl = getItemOutboundUrl(item);
  const ctaLabel = getCtaLabel(item);
  const color = getCategoryColor(item.type);
  const label = getCategoryLabel(item.type);
  const isAffiliate = item.affiliate?.enabled || item.type === "product";
  const priceRange = item.type === "product" ? (item as Product).estimatedPriceRange : null;
  const trapRef = useFocusTrap();

  const websiteLink = (item as HiddenGem | DailyTool).websiteLink as string | undefined;
  const logoDomain = (() => {
    if (item.type !== "hidden-gem" && item.type !== "tool") return null;
    try { return websiteLink ? new URL(websiteLink).hostname.replace("www.", "") : null; } catch { return null; }
  })();

  // Close on ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickview-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="overflow-hidden rounded-t-2xl">
          <ItemImage slug={item.slug} alt={title} aspectRatio="16/7" width={800} height={350} size="md" />
        </div>

        <div className="p-6 sm:p-8">
          {/* Badge + Title */}
          <div className="flex items-center gap-2 mb-3">
            <CategoryBadge label={label} color={color} />
            {logoDomain && <LogoImage domain={logoDomain} className="w-5 h-5 rounded-sm object-contain" />}
          </div>
          <h2 id="quickview-title" className="text-xl sm:text-2xl font-bold text-foreground mb-2 leading-snug">
            {title}
          </h2>

          {/* Price (products only) */}
          {priceRange && (
            <p className="text-lg font-bold text-emerald-400 mb-3">{priceRange}</p>
          )}

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed mb-4 text-sm sm:text-base">
            {description}
          </p>

          {/* Why text */}
          {whyText && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-6 border-l-2 border-accent/30 pl-4 italic">
              {whyText}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {outboundUrl && (
              <a
                href={outboundUrl}
                target="_blank"
                rel={isAffiliate ? "sponsored noopener" : "noopener"}
                className="flex-1 text-center py-3 px-6 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {ctaLabel} →
              </a>
            )}
            <Link
              href={`/item/${item.slug}`}
              onClick={onClose}
              className="flex-1 text-center py-3 px-6 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
            >
              View Full Details →
            </Link>
          </div>

          {/* Quick share row */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground mr-1">Share:</span>
            <ShareButtons title={title} slug={item.slug} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
