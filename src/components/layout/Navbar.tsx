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

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                    pathname === item.href
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
                    pathname === item.href
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
