"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getBookmarks } from "@/lib/engagement";
import {
  getAllItems,
  getItemBySlug,
  getItemTitle,
  getItemDescription,
  getCategoryColor,
  getCategoryLabel,
  type AnyItem,
} from "@/lib/data";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function SavedPage() {
  const [mounted, setMounted] = useState(false);
  const [savedItems, setSavedItems] = useState<AnyItem[]>([]);
  const [copied, setCopied] = useState(false);

  const loadSaved = () => {
    const slugs = getBookmarks();
    const items = slugs
      .map((slug) => getItemBySlug(slug))
      .filter((item): item is AnyItem => item !== undefined);
    setSavedItems(items);
  };

  useEffect(() => {
    setMounted(true);
    loadSaved();

    const handleChange = () => loadSaved();
    window.addEventListener("bookmarkChange", handleChange);
    return () => window.removeEventListener("bookmarkChange", handleChange);
  }, []);

  const handleExport = async () => {
    const titles = savedItems.map((item) => getItemTitle(item)).join("\n");
    try {
      await navigator.clipboard.writeText(titles);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silent
    }
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Saved Items
        </h1>
        <p className="mt-2 text-muted text-sm">Loading your bookmarks...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Saved Items
          </h1>
          <p className="mt-2 text-muted text-sm">
            {savedItems.length > 0
              ? `${savedItems.length} saved item${savedItems.length === 1 ? "" : "s"}`
              : "Your bookmarked discoveries will appear here"}
          </p>
        </div>
        {savedItems.length > 0 && (
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all cursor-pointer shrink-0"
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-emerald-400">
                  <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-60">
                  <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M3 11V3.5A.5.5 0 013.5 3H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                Export Saved
              </>
            )}
          </button>
        )}
      </div>

      {/* Empty State */}
      {savedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mb-6">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
              <path
                d="M8 3.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L8 9.8 5.4 11.4l.5-2.9-2.1-2 2.9-.4L8 3.5z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            No saved items yet
          </h2>
          <p className="text-sm text-muted max-w-md mb-6">
            Bookmark discoveries, products, hidden gems, and tools to build your personal collection. Click the star icon on any item to save it.
          </p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-gradient text-sm cursor-pointer"
          >
            Start Exploring
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}

      {/* Saved Items Grid */}
      {savedItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {savedItems.map((item, i) => (
            <ScrollReveal key={item.slug} delay={i * 50}>
              <div className="group relative flex flex-col rounded-2xl border border-border/60 bg-surface-elevated/40 hover:border-accent/25 hover:bg-surface-elevated/80 transition-all duration-200 overflow-hidden">
                {/* Card Content */}
                <div className="flex flex-col flex-1 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <CategoryBadge
                      label={getCategoryLabel(item.type)}
                      color={getCategoryColor(item.type)}
                    />
                    <BookmarkButton slug={item.slug} />
                  </div>
                  <Link href={`/item/${item.slug}`} className="block flex-1">
                    <h3 className="text-sm font-semibold text-foreground leading-snug mb-2 group-hover:text-accent transition-colors line-clamp-2">
                      {getItemTitle(item)}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed line-clamp-3">
                      {getItemDescription(item)}
                    </p>
                  </Link>
                </div>
                {/* Card Footer */}
                <div className="px-5 pb-4 pt-0">
                  <Link
                    href={`/item/${item.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                  >
                    View details
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
