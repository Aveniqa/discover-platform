import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "Transparency about how Surfaced earns revenue through affiliate links and why it never compromises our editorial independence.",
  openGraph: {
    title: "Affiliate Disclosure — Surfaced",
    description:
      "Transparency about how Surfaced earns revenue through affiliate links.",
  },
};

export default function AffiliateDisclosurePage() {
  return (
    <article>
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-4">
              Transparency
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              Affiliate{" "}
              <span className="bg-gradient-to-r from-accent to-cyan bg-clip-text text-transparent">
                Disclosure
              </span>
            </h1>
            <p className="mt-4 text-muted">Last updated: April 2026</p>
          </header>

          {/* Content */}
          <div className="space-y-12">
            {/* Overview */}
            <div>
              <p className="text-lg text-muted leading-relaxed">
                Transparency is one of our core values at Surfaced. We believe
                you deserve to know exactly how we fund our work and why you can
                trust the products and tools we recommend. This page explains
                everything.
              </p>
            </div>

            {/* How We Earn */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                How Surfaced Earns Revenue
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  Some of the links on Surfaced are affiliate links. This means
                  that when you click on a product link and make a purchase, we
                  may receive a small commission from the retailer or service
                  provider. This comes at absolutely no additional cost to you —
                  the price you pay is the same whether you use our link or go
                  directly to the site.
                </p>
                <p>
                  This affiliate revenue is what allows us to keep Surfaced free,
                  pay our editorial team, and continue discovering amazing
                  products, tools, and content for you every day.
                </p>
              </div>
            </div>

            {/* Editorial Independence */}
            <div className="p-8 rounded-2xl bg-surface border border-border/60">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Our Editorial Independence
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  This is the most important thing we can tell you:{" "}
                  <span className="text-foreground font-semibold">
                    affiliate relationships never influence what we feature.
                  </span>
                </p>
                <p>
                  Our editorial process works like this: we discover and evaluate
                  products based entirely on their merit, usefulness, and
                  &quot;wow factor.&quot; Only after we have decided to feature
                  something do we check whether an affiliate program exists. If it
                  does, we use the affiliate link. If it does not, we feature the
                  product anyway.
                </p>
                <p>
                  We will never feature a product solely because it has an
                  affiliate program, and we will never exclude a product because
                  it does not. Period.
                </p>
              </div>
            </div>

            {/* All Recommendations Are Genuine */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Every Recommendation Is Genuine
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  Every product, tool, and service featured on Surfaced has been
                  personally evaluated by our team. We only recommend things we
                  would genuinely use ourselves or recommend to a friend. Our
                  reputation depends on the trust of our readers, and we never
                  take that for granted.
                </p>
                <p>
                  If we are featuring a sponsored or paid placement, we will
                  always label it clearly and prominently. Sponsored content is
                  always marked separately from our organic editorial picks.
                </p>
              </div>
            </div>

            {/* How Affiliate Links Work */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                How Affiliate Links Work
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>Here is a straightforward explanation of the process:</p>
                <ol className="list-decimal list-inside space-y-3 ml-4">
                  <li>
                    You see a product or tool on Surfaced that catches your eye
                  </li>
                  <li>
                    You click the link, which may contain an affiliate tracking
                    code
                  </li>
                  <li>
                    You are taken to the product&apos;s website where you can
                    learn more or make a purchase
                  </li>
                  <li>
                    If you make a purchase, the retailer pays Surfaced a small
                    referral commission
                  </li>
                  <li>
                    You pay the exact same price you would have paid without the
                    affiliate link
                  </li>
                </ol>
                <p>
                  Affiliate networks we participate in include:
                </p>
                <ul className="space-y-2 ml-4">
                  {["Amazon Associates", "Impact", "ShareASale", "CJ Affiliate", "Direct brand partnerships"].map((n) => (
                    <li key={n} className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  Each program has its own commission structure, but
                  none of them increase the cost to you.
                </p>
              </div>
            </div>

            {/* Commitment to Transparency */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Our Commitment to Transparency
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>We commit to the following practices:</p>
                <ul className="space-y-4 ml-4">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>
                      <span className="text-foreground font-medium">
                        Clear labeling
                      </span>{" "}
                      — Affiliate links and sponsored content are always
                      identified
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>
                      <span className="text-foreground font-medium">
                        Honest reviews
                      </span>{" "}
                      — We share both pros and cons of every product we feature
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>
                      <span className="text-foreground font-medium">
                        Editorial firewall
                      </span>{" "}
                      — Revenue decisions never influence editorial decisions
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>
                      <span className="text-foreground font-medium">
                        Open communication
                      </span>{" "}
                      — If you ever have questions about a recommendation, just
                      ask us
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Questions */}
            <div className="pt-8 border-t border-white/5">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Questions?
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  If you have any questions about our affiliate relationships or
                  how we make editorial decisions, we would love to hear from
                  you. Transparency is not just a policy for us — it is a
                  promise.
                </p>
                <p>
                  Email:{" "}
                  <a
                    href="mailto:contact@surfaced.co"
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    contact@surfaced.co
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
