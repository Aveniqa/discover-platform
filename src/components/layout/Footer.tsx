import Link from "next/link";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { discoveries, products, hiddenGems, futureRadar, dailyTools } from "@/lib/data";
import { getItemTitle } from "@/lib/data";

export function Footer() {
  const columns = [
    { heading: "Discoveries", items: discoveries.slice(0, 4), path: "/discover" },
    { heading: "Products", items: products.slice(0, 4), path: "/trending" },
    { heading: "Hidden Gems", items: hiddenGems.slice(0, 4), path: "/hidden-gems" },
    { heading: "Future Radar", items: futureRadar.slice(0, 4), path: "/future-radar" },
    { heading: "Tools", items: dailyTools.slice(0, 4), path: "/tools" },
  ];

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
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6">
            {columns.map((col) => (
              <div key={col.heading}>
                <Link
                  href={col.path}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-accent transition-colors mb-4 block"
                >
                  {col.heading}
                </Link>
                <ul className="space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/item/${item.slug}`}
                        className="text-sm text-muted-foreground/70 hover:text-foreground transition-colors line-clamp-1"
                      >
                        {getItemTitle(item)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
