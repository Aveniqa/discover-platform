export function SocialEcosystem() {
  const channels = [
    {
      platform: "X / Twitter",
      handle: "@xSurfaced",
      description: "Real-time finds, threads on fascinating topics, and community picks.",
      icon: "𝕏",
      gradient: "from-cyan-500/20 to-cyan-500/5",
      border: "hover:border-cyan-500/30",
      url: "https://x.com/xSurfaced",
    },
    {
      platform: "Bluesky",
      handle: "@surfaced-x.bsky.social",
      description: "Daily curated discoveries and product highlights in your feed.",
      icon: "🦋",
      gradient: "from-blue-500/20 to-blue-500/5",
      border: "hover:border-blue-500/30",
      url: "https://bsky.app/profile/surfaced-x.bsky.social",
    },
  ];

  return (
    <section className="relative py-20 sm:py-28">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan mb-3">
            Follow Surfaced
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Discoveries, everywhere you are.
          </h2>
          <p className="mt-3 text-muted text-lg max-w-lg mx-auto">
            Get your daily dose of interesting on every platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {channels.map((ch) => (
            <a
              key={ch.platform}
              href={ch.url}
              target="_blank"
              rel="noopener"
              className={`group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 ${ch.border} card-hover-glow`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ch.gradient} flex items-center justify-center mb-4 text-lg border border-white/5`}
              >
                {ch.icon}
              </div>
              <div className="mb-1">
                <h3 className="font-bold text-foreground">{ch.platform}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{ch.handle}</p>
              <p className="text-sm text-muted leading-relaxed">
                {ch.description}
              </p>
              <div className="mt-4 flex items-center text-xs text-accent font-medium group-hover:text-accent-hover transition-colors">
                Follow
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="ml-1">
                  <path d="M4 12L12 4M12 4H5M12 4v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
