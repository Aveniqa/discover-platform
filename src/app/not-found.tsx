import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist — but there are 500+ fascinating things here that do.",
  robots: { index: false, follow: false },
};

const CATEGORIES = [
  { href: "/discover",     label: "Today's Discoveries", icon: "◉", accent: "bg-indigo-500/10 text-indigo-400 light:bg-indigo-500/8 light:text-indigo-700 border-indigo-500/15 light:border-indigo-600/20" },
  { href: "/trending",     label: "Trending Products",   icon: "▲", accent: "bg-emerald-500/10 text-emerald-400 light:bg-emerald-500/8 light:text-emerald-700 border-emerald-500/15 light:border-emerald-600/20" },
  { href: "/hidden-gems",  label: "Hidden Gems",         icon: "◆", accent: "bg-amber-500/10 text-amber-400 light:bg-amber-500/8 light:text-amber-700 border-amber-500/15 light:border-amber-600/20" },
  { href: "/future-radar", label: "Future Radar",        icon: "✶", accent: "bg-cyan-500/10 text-cyan-400 light:bg-cyan-500/8 light:text-cyan-700 border-cyan-500/15 light:border-cyan-600/20" },
  { href: "/tools",        label: "Daily Tools",         icon: "✦", accent: "bg-rose-500/10 text-rose-400 light:bg-rose-500/8 light:text-rose-700 border-rose-500/15 light:border-rose-600/20" },
];

export default function NotFound() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden py-20 px-4">
      {/* Ambient background blobs */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 light:bg-accent/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan/5 light:bg-cyan/8 blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-xl text-center">
        {/* Giant watermark number */}
        <p className="text-[9rem] sm:text-[13rem] font-black leading-none tracking-tighter gradient-text opacity-[0.10] select-none pointer-events-none">
          404
        </p>

        {/* Content overlaid on the number */}
        <div className="-mt-12 sm:-mt-20 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted">Something got lost in the feed</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-3">
            Page not found.
          </h1>
          <p className="text-muted text-base max-w-sm mx-auto leading-relaxed mb-8">
            But 500+ curated discoveries, products, and tools do exist here — keep exploring.
          </p>

          {/* Primary CTA */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-gradient text-sm mb-8"
          >
            Back to Home <span aria-hidden="true">&rarr;</span>
          </Link>

          {/* Category grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 hover:border-accent/25 hover:bg-surface-hover transition-all duration-200 text-left"
              >
                <span className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center text-sm font-bold ${cat.accent}`}>
                  {cat.icon}
                </span>
                <span className="text-xs font-medium text-foreground group-hover:text-accent-hover transition-colors leading-snug">
                  {cat.label}
                </span>
              </Link>
            ))}
            {/* Placeholder to even the grid */}
            <div className="hidden sm:block" />
          </div>

          {/* Search hint */}
          <p className="text-xs text-muted-foreground/60">
            Looking for something specific?{" "}
            <span className="text-accent">
              Press <kbd className="mx-0.5 px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[9px]">⌘K</kbd> to search
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
