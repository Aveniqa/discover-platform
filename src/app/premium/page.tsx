import type { Metadata } from "next";
import { NewsletterForm } from "@/components/ui/NewsletterForm";

export const metadata: Metadata = {
  title: "Premium — Surfaced",
  description:
    "Surfaced Premium is coming soon. Ad-free reading, early access, exclusive tools, saved collections, and weekly deep dives.",
  openGraph: {
    title: "Premium — Surfaced",
    description:
      "Surfaced Premium is coming soon. Ad-free reading, early access, exclusive tools, and more.",
  },
};

const freeTier = [
  { feature: "Daily discoveries feed", included: true },
  { feature: "Product picks & recommendations", included: true },
  { feature: "Basic discovery tools", included: true },
  { feature: "Daily newsletter", included: true },
  { feature: "Ad-free experience", included: false },
  { feature: "Early access to discoveries", included: false },
  { feature: "Saved collections", included: false },
  { feature: "Exclusive premium tools", included: false },
  { feature: "Weekly deep dive reports", included: false },
  { feature: "Priority support", included: false },
];

const premiumTier = [
  { feature: "Daily discoveries feed", included: true },
  { feature: "Product picks & recommendations", included: true },
  { feature: "Basic discovery tools", included: true },
  { feature: "Daily newsletter", included: true },
  { feature: "Ad-free experience", included: true },
  { feature: "Early access to discoveries", included: true },
  { feature: "Saved collections", included: true },
  { feature: "Exclusive premium tools", included: true },
  { feature: "Weekly deep dive reports", included: true },
  { feature: "Priority support", included: true },
];

function CheckIcon({ active }: { active: boolean }) {
  if (!active) {
    return (
      <svg
        className="w-5 h-5 text-white/15"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-accent"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

export default function PremiumPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/6 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Coming Soon badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="text-sm font-medium text-accent">Coming Soon</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Surfaced{" "}
            <span className="bg-gradient-to-r from-accent to-cyan bg-clip-text text-transparent">
              Premium
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted leading-relaxed max-w-xl mx-auto">
            The full discovery experience. No ads, exclusive content, powerful
            tools, and early access to everything Surfaced finds.
          </p>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 sm:py-28 bg-surface">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
            Choose your plan
          </h2>
          <p className="text-muted text-lg text-center mb-12">
            Surfaced is free forever. Premium unlocks the full experience.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Free Tier */}
            <div className="rounded-2xl border border-border/60 bg-surface-elevated p-8">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-foreground mb-1">Free</h3>
                <p className="text-muted text-sm">Everything you need to start discovering</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">$0</span>
                  <span className="text-muted text-sm ml-1">/ forever</span>
                </div>
              </div>
              <ul className="space-y-4">
                {freeTier.map((item) => (
                  <li key={item.feature} className="flex items-center gap-3">
                    <CheckIcon active={item.included} />
                    <span
                      className={
                        item.included ? "text-foreground" : "text-muted/50"
                      }
                    >
                      {item.feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium Tier */}
            <div className="relative rounded-2xl border border-accent/30 bg-surface-elevated p-8">
              {/* Highlight glow */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-accent/20 to-transparent opacity-50 pointer-events-none" />
              <div className="relative">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-foreground">
                      Premium
                    </h3>
                    <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                      Popular
                    </span>
                  </div>
                  <p className="text-muted text-sm">
                    The complete discovery experience
                  </p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">
                      TBD
                    </span>
                    <span className="text-muted text-sm ml-1">/ month</span>
                  </div>
                </div>
                <ul className="space-y-4">
                  {premiumTier.map((item) => (
                    <li key={item.feature} className="flex items-center gap-3">
                      <CheckIcon active={item.included} />
                      <span className="text-foreground">{item.feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="py-20 sm:py-28 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Get early access
          </h2>
          <p className="text-muted text-lg mb-10 max-w-xl mx-auto">
            Join the waitlist to be first in line when Surfaced Premium launches.
            Early supporters get a founding member discount.
          </p>

          <div className="max-w-md mx-auto">
            <NewsletterForm />
          </div>

          <p className="mt-6 text-sm text-muted">
            We will only email you about the Premium launch. No spam, ever.
          </p>
        </div>
      </section>
    </main>
  );
}
