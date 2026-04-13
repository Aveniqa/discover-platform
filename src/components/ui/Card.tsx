"use client";

import { Badge } from "./Badge";
import { cn } from "@/lib/utils";

/* ---- Discovery Card ---- */
interface DiscoveryCardProps {
  title: string;
  description: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  source: string;
  readTime: string;
  date: string;
  featured?: boolean;
  className?: string;
}

export function DiscoveryCard({
  title,
  description,
  category,
  tag,
  tagColor,
  source,
  readTime,
  date,
  featured,
  className,
}: DiscoveryCardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6 card-hover-glow",
        featured && "sm:col-span-2 sm:flex-row sm:gap-8",
        className
      )}
    >
      {/* Image placeholder */}
      <div
        className={cn(
          "rounded-lg bg-gradient-to-br from-surface-elevated to-surface overflow-hidden mb-4 flex items-center justify-center",
          featured ? "sm:mb-0 sm:w-2/5 sm:shrink-0 h-48 sm:h-auto" : "h-40"
        )}
      >
        <div className="text-4xl opacity-20">✦</div>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <Badge label={tag} color={tagColor} />
          <span className="text-[11px] text-muted-foreground">{category}</span>
        </div>

        <h3
          className={cn(
            "font-bold text-foreground leading-snug group-hover:text-accent-hover transition-colors",
            featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
          )}
        >
          {title}
        </h3>

        <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-3">
          {description}
        </p>

        <div className="mt-auto pt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{source}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>{readTime} read</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>{date}</span>
        </div>
      </div>
    </article>
  );
}

/* ---- Product Card ---- */
interface ProductCardProps {
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  rating: number;
  reviews: string;
  affiliateUrl: string;
  className?: string;
}

export function ProductCard({
  title,
  description,
  price,
  originalPrice,
  category,
  tag,
  tagColor,
  rating,
  reviews,
  affiliateUrl,
  className,
}: ProductCardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-5 card-hover-glow",
        className
      )}
    >
      {/* Image placeholder */}
      <div className="rounded-lg bg-gradient-to-br from-surface-elevated to-surface h-44 mb-4 flex items-center justify-center overflow-hidden">
        <div className="text-5xl opacity-15 group-hover:scale-110 transition-transform duration-500">
          📦
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge label={tag} color={tagColor} />
        <span className="text-[11px] text-muted-foreground">{category}</span>
      </div>

      <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-accent-hover transition-colors">
        {title}
      </h3>

      <p className="mt-1.5 text-sm text-muted leading-relaxed line-clamp-2">
        {description}
      </p>

      <div className="mt-auto pt-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">{price}</span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {originalPrice}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="text-amber-400">★</span>
          <span>{rating}</span>
          <span>({reviews})</span>
        </div>
      </div>

      <a
        href={affiliateUrl}
        className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm font-medium text-foreground hover:bg-surface-hover hover:border-accent/30 transition-all"
      >
        View Deal
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 12L12 4M12 4H5M12 4v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </article>
  );
}

/* ---- Hidden Gem Card ---- */
interface GemCardProps {
  title: string;
  description: string;
  url: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  upvotes: number;
  className?: string;
}

export function GemCard({
  title,
  description,
  url,
  category,
  tag,
  tagColor,
  upvotes,
  className,
}: GemCardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-5 card-hover-glow",
        className
      )}
    >
      {/* Icon Area */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-cyan/10 flex items-center justify-center mb-4 border border-accent/10">
        <span className="text-lg">🔗</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge label={tag} color={tagColor} />
      </div>

      <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-accent-hover transition-colors">
        {title}
      </h3>

      <p className="mt-1.5 text-sm text-muted leading-relaxed line-clamp-2">
        {description}
      </p>

      <div className="mt-auto pt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">{url}</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {upvotes.toLocaleString()}
        </div>
      </div>
    </article>
  );
}

/* ---- Future Radar Card ---- */
interface FutureCardProps {
  title: string;
  description: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  timeline: string;
  impact: string;
  source: string;
  featured?: boolean;
  className?: string;
}

export function FutureCard({
  title,
  description,
  category,
  tag,
  tagColor,
  timeline,
  impact,
  source,
  featured,
  className,
}: FutureCardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden card-hover-glow",
        featured && "sm:col-span-2 sm:flex-row",
        className
      )}
    >
      {/* Gradient accent bar */}
      <div className="h-1 sm:h-auto sm:w-1 bg-gradient-to-r sm:bg-gradient-to-b from-accent via-cyan to-accent shrink-0" />

      <div className={cn("p-5 sm:p-6 flex flex-col flex-1", featured && "sm:flex-row sm:gap-8")}>
        {featured && (
          <div className="hidden sm:flex w-1/3 shrink-0 rounded-lg bg-gradient-to-br from-accent/5 to-cyan/5 items-center justify-center border border-accent/5">
            <span className="text-5xl opacity-20">◈</span>
          </div>
        )}
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Badge label={tag} color={tagColor} />
            <span className="text-[11px] text-muted-foreground">{category}</span>
          </div>

          <h3
            className={cn(
              "font-bold text-foreground leading-snug group-hover:text-accent-hover transition-colors",
              featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
            )}
          >
            {title}
          </h3>

          <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-3">
            {description}
          </p>

          <div className="mt-auto pt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
              {timeline}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber" />
              Impact: {impact}
            </span>
            <span>{source}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---- Tool Card ---- */
interface ToolCardProps {
  title: string;
  description: string;
  category: string;
  tag: string;
  tagColor: "violet" | "cyan" | "amber" | "emerald" | "rose";
  icon: string;
  url: string;
  isFree: boolean;
  className?: string;
}

export function ToolCard({
  title,
  description,
  category,
  tag,
  tagColor,
  icon,
  url,
  isFree,
  className,
}: ToolCardProps) {
  return (
    <a
      href={url}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-5 card-hover-glow",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl bg-surface-elevated flex items-center justify-center text-xl border border-border group-hover:border-accent/20 transition-colors">
          {icon}
        </div>
        {isFree && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald px-2 py-0.5 rounded-full bg-emerald/10 border border-emerald/20">
            Free
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge label={tag} color={tagColor} size="sm" />
        <span className="text-[11px] text-muted-foreground">{category}</span>
      </div>

      <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-accent-hover transition-colors">
        {title}
      </h3>

      <p className="mt-1.5 text-sm text-muted leading-relaxed line-clamp-2">
        {description}
      </p>

      <div className="mt-auto pt-4 flex items-center text-xs text-accent font-medium group-hover:text-accent-hover transition-colors">
        Open Tool
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="ml-1">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </a>
  );
}
