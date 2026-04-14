"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { SearchTrigger } from "@/components/ui/SearchModal";
import { BookmarkCount } from "@/components/ui/BookmarkCount";
import { SurpriseMe } from "@/components/ui/SurpriseMe";
import { StreakWidget } from "@/components/ui/StreakWidget";

/** Maps item type slugs (used in URL /item/…) to their parent nav paths */
const typeToNavPath: Record<string, string> = {
  discovery: "/discover",
  product: "/trending",
  "hidden-gem": "/hidden-gems",
  "future-tech": "/future-radar",
  tool: "/tools",
};

/**
 * Determine which nav item is active.
 * - Exact path match on category/collection pages
 * - On /item/[slug] pages, resolve the item's type from the DOM data attribute
 *   and highlight the parent category nav link
 * - On /collections/[slug] pages, highlight /collections
 */
function getActiveHref(pathname: string): string | null {
  // Exact matches first (handles /discover, /trending, etc.)
  const navHrefs = mainNav.map((n) => n.href);
  if (navHrefs.includes(pathname)) return pathname;

  // Collection sub-pages → highlight /collections
  if (pathname.startsWith("/collections/")) return "/collections";

  // Item pages — we parse the type from the slug's position in the global data
  // This runs client-side so we can look up the item type from our data exports
  if (pathname.startsWith("/item/")) {
    // We'll resolve this via a data attribute set on the body by the item page
    // For simplicity, check all nav paths for a startsWith match first
    return null;
  }

  return null;
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [itemParentPath, setItemParentPath] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);

    // For /item/ pages, read item-type from the CTA data attribute or breadcrumb
    if (pathname.startsWith("/item/")) {
      // Try to read the item type from the main CTA button's data-item-type
      requestAnimationFrame(() => {
        const cta = document.getElementById("main-cta-button");
        const itemType = cta?.getAttribute("data-item-type");
        if (itemType && typeToNavPath[itemType]) {
          setItemParentPath(typeToNavPath[itemType]);
        } else {
          // Fallback: try breadcrumb links
          const breadcrumbLinks = document.querySelectorAll('nav[aria-label="Breadcrumb"] a');
          for (const link of breadcrumbLinks) {
            const href = link.getAttribute("href");
            if (href && mainNav.some((n) => n.href === href)) {
              setItemParentPath(href);
              return;
            }
          }
          setItemParentPath(null);
        }
      });
    } else {
      setItemParentPath(null);
    }
  }, [pathname]);

  const activeHref = getActiveHref(pathname) || itemParentPath;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          scrolled
            ? "glass-strong border-b border-border/40 shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
            : "bg-transparent"
        )}
      >
        <nav aria-label="Primary navigation" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[4.5rem] items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-cyan flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Surfaced
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                    activeHref === item.href
                      ? "text-foreground bg-surface-elevated/80 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/40"
                  )}
                >
                  {item.label}
                  {item.isNew && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan animate-glow-pulse" />
                  )}
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Streak Widget — desktop only */}
              <div className="hidden lg:block">
                <StreakWidget />
              </div>

              {/* Surprise Me — desktop only */}
              <div className="hidden lg:block">
                <SurpriseMe />
              </div>

              {/* Search Trigger */}
              <SearchTrigger />

              {/* Bookmark Count */}
              <BookmarkCount />

              {/* Newsletter CTA */}
              <Link
                href="/newsletter"
                className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-gradient text-xs cursor-pointer"
              >
                Subscribe
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
                aria-label="Toggle menu"
              >
                <div className="flex flex-col gap-1.5">
                  <span
                    className={cn(
                      "block w-5 h-[1.5px] bg-foreground transition-all duration-200 origin-center",
                      mobileOpen && "rotate-45 translate-y-[4.5px]"
                    )}
                  />
                  <span
                    className={cn(
                      "block w-5 h-[1.5px] bg-foreground transition-all duration-200",
                      mobileOpen && "-rotate-45 -translate-y-[1.5px]"
                    )}
                  />
                </div>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-16 inset-x-0 glass-strong border-b border-border/50 p-4 animate-fade-in">
            <div className="flex flex-col gap-1">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-lg text-[13px] font-medium transition-colors",
                    activeHref === item.href
                      ? "text-foreground bg-surface-elevated"
                      : "text-muted hover:text-foreground hover:bg-surface-elevated/50"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {item.label}
                      {item.isNew && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-cyan bg-cyan/10 px-1.5 py-0.5 rounded">
                          New
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex gap-3">
              <Link
                href="/newsletter"
                className="flex-1 flex items-center justify-center py-3.5 rounded-xl btn-gradient text-sm cursor-pointer"
              >
                Subscribe Free
              </Link>
              <Link
                href="/premium"
                className="flex-1 flex items-center justify-center py-3.5 rounded-xl bg-surface-elevated border border-border text-sm font-medium text-foreground hover:bg-surface-hover hover:border-accent/20 transition-all"
              >
                Go Premium
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
