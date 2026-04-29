import type { Metadata } from "next";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { SocialCTA } from "@/components/SocialCTA";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Newsletter",
  description:
    "Get the best discoveries, trending products, and hidden internet gems delivered to your inbox every morning. Free, no spam.",
  path: "/newsletter",
});

const benefits = [
  "Daily curated discoveries you won't find anywhere else",
  "Trending products before they go mainstream",
  "AI tools and software that actually change your workflow",
  "Deep dives into fascinating internet rabbit holes",
  "Zero spam — unsubscribe anytime in one click",
];

export default function NewsletterPage() {
  return (
    <article>
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background accents */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/8 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-4">
              Free Daily Newsletter
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Start every morning{" "}
              <span className="bg-gradient-to-r from-accent to-cyan bg-clip-text text-transparent">
                smarter.
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted leading-relaxed max-w-xl mx-auto">
              The internet surfaces incredible things every day. We find the best
              of it and deliver it straight to your inbox — free, every weekday
              morning.
            </p>
          </div>

          {/* Newsletter Form */}
          <div className="max-w-md mx-auto mb-4">
            <NewsletterForm data-capture-location="newsletter-page" />
          </div>
          <p className="text-center text-xs text-muted-foreground/70 mb-16">No spam, ever. Unsubscribe in one click.</p>

          {/* Social proof */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-surface-elevated border border-border/60">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald" />
              </span>
              <p className="text-sm text-muted">
                New edition every weekday morning
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 sm:py-28 bg-surface">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            What you get
          </h2>
          <p className="text-muted text-lg mb-10">
            Every issue is handpicked by our editorial team — five minutes of
            reading that saves you hours of browsing.
          </p>

          <ul className="space-y-5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-4">
                <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </span>
                <span className="text-foreground text-lg">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sample Issue Preview */}
      <section className="py-20 sm:py-28 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            A look inside
          </h2>
          <p className="text-muted text-lg mb-10 max-w-xl mx-auto">
            Each issue follows a simple format designed for fast, enjoyable reading.
          </p>

          <div className="text-left space-y-4">
            {[
              {
                label: "The Big Find",
                desc: "One standout discovery we can't stop thinking about",
              },
              {
                label: "Quick Hits",
                desc: "3-5 rapid-fire links worth your attention",
              },
              {
                label: "Tool of the Day",
                desc: "A product or app that could change your workflow",
              },
              {
                label: "Rabbit Hole",
                desc: "Something delightfully weird to explore when you have time",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-4 p-5 rounded-xl bg-surface border border-border/60"
              >
                <div className="flex-shrink-0 w-2 h-2 mt-2.5 rounded-full bg-accent" />
                <div>
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-muted text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 max-w-md mx-auto">
            <p className="text-muted mb-4">Ready to start discovering?</p>
            <NewsletterForm variant="minimal" />
          </div>
        </div>
      </section>

      {/* Social CTA */}
      <section className="pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <SocialCTA />
        </div>
      </section>
    </article>
  );
}
