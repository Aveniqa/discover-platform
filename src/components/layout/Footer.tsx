import Link from "next/link";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { discoveries, products, hiddenGems, futureRadar, dailyTools } from "@/lib/data";
import { getItemTitle, type AnyItem } from "@/lib/data";
import archiveData from "@/../data/archive.json";

export function Footer() {
  // 8 newest per category — surfaces more internal links to crawlers and to
  // human visitors using the footer for navigation.
  const newest = <T extends { id?: number }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 8);

  const columns = [
    { heading: "Discoveries", items: newest(discoveries), path: "/discover" },
    { heading: "Products", items: newest(products), path: "/trending" },
    { heading: "Hidden Gems", items: newest(hiddenGems), path: "/hidden-gems" },
    { heading: "Future Radar", items: newest(futureRadar), path: "/future-radar" },
    { heading: "Tools", items: newest(dailyTools), path: "/tools" },
  ];

  // Recently archived items — /item/<slug> stays alive for SEO. Surface 5 in
  // the footer so they keep ranking + getting human traffic instead of
  // languishing as orphaned but-still-indexed URLs.
  const recentlyArchived = (archiveData as (AnyItem & { archivedAt?: string })[])
    .filter((it) => !!it.archivedAt)
    .sort((a, b) => (b.archivedAt || "").localeCompare(a.archivedAt || ""))
    .slice(0, 5);

  return (
    <footer className="border-t border-border/40 bg-gradient-to-b from-surface/80 to-background">
      <div className="glow-line" />

      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Brand + Newsletter */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-cyan flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.2)]">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Surfaced
              </span>
            </Link>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-sm">
              Five categories of curated finds, updated every morning — so you
              never miss what matters.
            </p>
            <p className="mt-3 text-xs text-accent font-medium tracking-wide">
              Built for the endlessly curious
            </p>

            <div className="mt-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Join the daily newsletter
              </p>
              <NewsletterForm variant="minimal" data-capture-location="footer" />
              <p className="mt-3 text-xs text-muted-foreground/70">
                No spam, ever. Unsubscribe anytime.
              </p>
            </div>
          </div>

          {/* Category Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-6">
            {columns.map((col) => (
              <div key={col.heading}>
                <Link
                  href={col.path}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-accent transition-colors mb-4 block"
                >
                  {col.heading}
                </Link>
                <ul className="space-y-2.5">
                  {col.items.map((item) => {
                    const title = getItemTitle(item);
                    return (
                      <li key={item.slug}>
                        <Link
                          href={`/item/${item.slug}`}
                          aria-label={`Read ${title}`}
                          className="text-sm text-muted-foreground/70 hover:text-foreground transition-colors line-clamp-1"
                        >
                          {title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {recentlyArchived.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 mb-4 block">
                  Recently Archived
                </span>
                <ul className="space-y-2.5">
                  {recentlyArchived.map((item) => {
                    const title = getItemTitle(item);
                    return (
                      <li key={item.slug}>
                        <Link
                          href={`/item/${item.slug}`}
                          aria-label={`Read ${title}`}
                          className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors line-clamp-1"
                        >
                          {title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-muted-foreground/70">
            <p>&copy; {new Date().getFullYear()} Surfaced. All rights reserved.</p>
            <span className="hidden sm:inline">&middot;</span>
            <p>
              Some product links are affiliate links.{" "}
              <Link href="/affiliate-disclosure" className="hover:text-foreground transition-colors underline underline-offset-2">
                Learn more &rarr;
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground/70">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/affiliate-disclosure" className="hover:text-foreground transition-colors">Affiliate Disclosure</Link>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald/60 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald" />
            </span>
            Updated daily
          </div>
        </div>
      </div>
    </footer>
  );
}
