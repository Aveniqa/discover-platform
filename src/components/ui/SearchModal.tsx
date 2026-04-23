"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useRouter } from "next/navigation";
import { getAllItems, getItemTitle, getItemDescription, getItemCategory, getCategoryColor, getCategoryLabel, type AnyItem } from "@/lib/data";

const colorMap: Record<string, string> = {
  indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30 light:bg-indigo-500/12 light:text-indigo-700 light:border-indigo-600/30",
  emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30 light:bg-emerald-500/12 light:text-emerald-700 light:border-emerald-600/30",
  amber: "bg-amber-500/20 text-amber-300 border-amber-400/30 light:bg-amber-500/15 light:text-amber-700 light:border-amber-600/35",
  cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30 light:bg-cyan-500/12 light:text-cyan-700 light:border-cyan-600/30",
  rose: "bg-rose-500/20 text-rose-300 border-rose-400/30 light:bg-rose-500/12 light:text-rose-700 light:border-rose-600/30",
};

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnyItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useFocusTrap(open);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const router = useRouter();

  const allItems = useRef<AnyItem[]>([]);

  useEffect(() => {
    allItems.current = getAllItems();
  }, []);

  // Reset keyboard selection whenever results change
  useEffect(() => {
    setActiveIndex(-1);
    itemRefs.current = [];
  }, [results]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        navigateTo(results[activeIndex].slug);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, activeIndex]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    }
  }, [open]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    const lower = q.toLowerCase();
    const filtered = allItems.current.filter((item) => {
      const title = getItemTitle(item).toLowerCase();
      const desc = getItemDescription(item).toLowerCase();
      const cat = getItemCategory(item).toLowerCase();
      return title.includes(lower) || desc.includes(lower) || cat.includes(lower);
    });
    setResults(filtered.slice(0, 20));
  }, []);

  const navigateTo = (slug: string) => {
    setOpen(false);
    router.push(`/item/${slug}`);
  };

  if (!open) return null;

  // Group results by type (for display), while maintaining a flat index for keyboard nav
  const grouped = results.reduce<Record<string, AnyItem[]>>((acc, item) => {
    const label = getCategoryLabel(item.type);
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});

  // Build flat index map: grouped display order → results[] index
  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Search Surfaced">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative mx-auto mt-[10vh] max-w-2xl px-4">
        <div ref={trapRef} className="rounded-2xl border border-border/60 bg-surface-elevated shadow-[0_20px_80px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-muted-foreground shrink-0">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search 320+ discoveries, products, tools..."
              className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
              aria-autocomplete="list"
              aria-controls="search-results"
              aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
            />
            <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] bg-surface border border-border text-muted-foreground font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div
            id="search-results"
            role="listbox"
            aria-label="Search results"
            className="max-h-[60vh] overflow-y-auto"
          >
            {query.length >= 2 && results.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-muted-foreground text-sm">No results found for &quot;{query}&quot;</p>
                <p className="text-muted-foreground/70 text-xs mt-1">Try searching for AI, gadgets, tools, science...</p>
              </div>
            )}

            {Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                <div className="px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground bg-surface/50 sticky top-0">
                  {label} ({items.length})
                </div>
                {items.map((item) => {
                  const color = getCategoryColor(item.type);
                  const currentIdx = flatIdx++;
                  const isActive = currentIdx === activeIndex;
                  return (
                    <button
                      key={item.slug}
                      id={`search-result-${currentIdx}`}
                      role="option"
                      aria-selected={isActive}
                      ref={(el) => { itemRefs.current[currentIdx] = el; }}
                      onClick={() => navigateTo(item.slug)}
                      onMouseEnter={() => setActiveIndex(currentIdx)}
                      className={`w-full flex items-center gap-3 px-6 py-3.5 transition-colors text-left cursor-pointer ${
                        isActive
                          ? "bg-surface-hover ring-1 ring-inset ring-accent/20"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <span className={`shrink-0 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorMap[color]}`}>
                        {getCategoryLabel(item.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{getItemTitle(item)}</p>
                        <p className="text-xs text-muted-foreground truncate">{getItemDescription(item).slice(0, 80)}...</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`shrink-0 transition-colors ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            ))}

            {query.length < 2 && (
              <div className="px-5 py-8 text-center">
                <p className="text-muted-foreground text-sm mb-1">Search 320+ curated finds</p>
                <p className="text-muted-foreground/70 text-xs">Try &quot;AI&quot;, &quot;productivity&quot;, &quot;biotech&quot;, or &quot;design tools&quot;</p>
              </div>
            )}
          </div>

          {/* Footer hint */}
          {results.length > 0 && (
            <div className="px-6 py-2.5 border-t border-border/50 flex items-center gap-4 text-[10px] text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-surface border border-border font-mono text-[9px]">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-surface border border-border font-mono text-[9px]">↵</kbd>
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-surface border border-border font-mono text-[9px]">ESC</kbd>
                close
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SearchTrigger() {
  const [shortcutLabel, setShortcutLabel] = useState("⌘K");

  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    setShortcutLabel(isMac ? "⌘K" : "Ctrl+K");
  }, []);

  return (
    <button
      onClick={() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      }}
      className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-elevated/70 border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-accent/25 transition-all cursor-pointer"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="opacity-50">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span>Search...</span>
      <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-background/50 border border-border/50 text-muted-foreground font-mono">
        {shortcutLabel}
      </kbd>
    </button>
  );
}
