import type { Metadata } from "next";
import { SocialCTA } from "@/components/SocialCTA";

export const metadata: Metadata = {
  title: "About — Surfaced",
  description:
    "Learn about Surfaced, the daily discovery engine that surfaces what matters from the infinite internet.",
  openGraph: {
    title: "About — Surfaced",
    description:
      "Learn about Surfaced, the daily discovery engine that surfaces what matters from the infinite internet.",
  },
};

const pillars = [
  {
    name: "Hidden Gems",
    description:
      "Obscure tools, fascinating websites, and internet rabbit holes most people never find.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      </svg>
    ),
  },
  {
    name: "Trending Products",
    description:
      "The products gaining traction right now across tech, design, health, and lifestyle.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941"
        />
      </svg>
    ),
  },
  {
    name: "Future Technology",
    description:
      "Breakthroughs in AI, biotech, space, and computing that are shaping what comes next.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
  },
  {
    name: "AI & Tools",
    description:
      "The best AI tools, automations, and software that actually change how you work and create.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.341 4.025A2.25 2.25 0 0115.5 20.25H8.5a2.25 2.25 0 01-2.159-1.625L5 14.5m14 0H5"
        />
      </svg>
    ),
  },
  {
    name: "Culture & Lifestyle",
    description:
      "The ideas, movements, and oddities defining modern culture across the digital landscape.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
        />
      </svg>
    ),
  },
];

const values = [
  {
    title: "Curiosity First",
    description:
      "We believe the best discoveries come from following genuine curiosity, not algorithms.",
  },
  {
    title: "Editorial Independence",
    description:
      "Our recommendations are never for sale. If we feature it, we genuinely believe in it.",
  },
  {
    title: "Signal Over Noise",
    description:
      "The internet is infinite. We exist to cut through the noise and surface what actually matters.",
  },
  {
    title: "Radical Transparency",
    description:
      "From affiliate links to editorial process, we tell you exactly how Surfaced works.",
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* Hero / Mission */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan/8 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-4">
            Our Mission
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            We surface what matters from the{" "}
            <span className="bg-gradient-to-r from-accent to-cyan bg-clip-text text-transparent">
              infinite internet
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted leading-relaxed max-w-2xl mx-auto">
            Every day, the internet produces more content than any human could ever
            process. Surfaced exists to be your trusted filter — finding the most
            fascinating discoveries, tools, and ideas so you never miss what
            matters.
          </p>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-20 sm:py-28 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            What We Do
          </h2>
          <div className="space-y-6 text-muted text-lg leading-relaxed">
            <p>
              Surfaced is a daily discovery engine for the endlessly curious. We
              scour the internet — from niche subreddits to academic research, from
              Product Hunt launches to underground creator communities — and
              distill it all into a curated daily feed.
            </p>
            <p>
              We spend hours every day so you can spend five minutes. Each item
              is hand-reviewed, categorized, and written up with context on why
              it matters — not just what it is.
            </p>
            <p>
              Whether it is an AI tool that changes your workflow, a product you
              did not know you needed, or a rabbit hole that blows your mind, we
              make sure it reaches you.
            </p>
          </div>
        </div>
      </section>

      {/* Our Pillars */}
      <section className="py-20 sm:py-28 bg-surface">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Our Five Pillars
          </h2>
          <p className="text-muted text-lg mb-12">
            Everything we publish falls within these core discovery categories.
          </p>

          <div className="space-y-8">
            {pillars.map((pillar) => (
              <div
                key={pillar.name}
                className="flex gap-5 p-6 rounded-xl bg-surface-elevated border border-border/60 transition-colors hover:border-accent/20"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  {pillar.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {pillar.name}
                  </h3>
                  <p className="text-muted leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-20 sm:py-28 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            How Surfaced Started
          </h2>
          <div className="space-y-6 text-muted text-lg leading-relaxed">
            <p>
              Surfaced began as a personal habit — a daily practice of scouring
              the internet for the most interesting things happening across
              science, technology, design, and culture.
            </p>
            <p>
              Friends kept asking how we found things so early. So we built a
              system to share the process: five categories, strict editorial
              standards, and a commitment to explaining <em>why</em> each find
              matters — not just <em>what</em> it is.
            </p>
            <p>
              Today, Surfaced is read by thousands of curious people every morning.
              Every item is hand-selected. Every description is written by a
              human. We never feature anything we would not genuinely recommend.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 sm:py-28 bg-surface">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12">
            Our Values
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {values.map((value) => (
              <div key={value.title}>
                <div className="w-1 h-8 bg-gradient-to-b from-accent to-cyan rounded-full mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social CTA */}
      <section className="pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <SocialCTA />
        </div>
      </section>
    </main>
  );
}
