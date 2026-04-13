export function WhyComeBack() {
  const reasons = [
    {
      icon: "✦",
      title: "Fresh Every Day",
      description:
        "New discoveries, products, and finds curated every morning. Your daily internet briefing.",
      accent: "from-accent/20 to-accent/5",
    },
    {
      icon: "◈",
      title: "Genuinely Useful",
      description:
        "Not clickbait. Not fluff. Every piece is selected because it's fascinating, practical, or both.",
      accent: "from-cyan/20 to-cyan/5",
    },
    {
      icon: "◆",
      title: "Beautifully Curated",
      description:
        "We find the signal in the noise. Quality over quantity, depth over breadth.",
      accent: "from-amber/20 to-amber/5",
    },
    {
      icon: "●",
      title: "Built for Curious Minds",
      description:
        "Science, tech, culture, products, tools — all connected. One platform, infinite rabbit holes.",
      accent: "from-emerald/20 to-emerald/5",
    },
  ];

  return (
    <section className="relative py-20 sm:py-28">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">
            Why Surfaced
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Your new daily habit.
          </h2>
          <p className="mt-4 text-muted text-lg max-w-xl mx-auto">
            People don&apos;t come back because we tell them to. They come back because they can&apos;t stop finding interesting things.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="relative rounded-xl border border-border bg-card p-6 group hover:border-accent/20 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${reason.accent} flex items-center justify-center mb-5 text-lg border border-white/5`}
              >
                {reason.icon}
              </div>
              <h3 className="font-bold text-foreground text-base mb-2">
                {reason.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
