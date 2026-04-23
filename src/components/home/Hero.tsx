import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Layers */}
      <div className="absolute inset-0">
        {/* Gradient orbs — higher opacity in light mode to stay visible on light bg */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 light:bg-accent/10 blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan/5 light:bg-cyan/10 blur-[100px] animate-glow-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/3 light:bg-accent/8 blur-[160px]" />

        {/* Grid overlay — uses foreground color so it shows in both modes */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Top fade */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-background to-transparent" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-glow-pulse" />
          <span className="text-xs font-medium text-muted">
            Updated daily with fresh discoveries
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[0.95] animate-fade-in-up">
          <span className="text-foreground">What the internet</span>
          <br />
          <span className="gradient-text">surfaced today.</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 sm:mt-8 text-base sm:text-lg lg:text-xl text-muted max-w-2xl mx-auto leading-relaxed animate-fade-in-up [animation-delay:0.15s]">
          Fascinating discoveries, trending products, hidden gems, and future
          technology — curated daily for the endlessly curious.
        </p>

        {/* CTAs */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-fade-in-up [animation-delay:0.3s]">
          <Link
            href="/discover"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:shadow-[0_0_50px_rgba(139,92,246,0.3)] active:scale-[0.98]"
          >
            Start Exploring
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/newsletter"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-surface-elevated border border-border text-sm font-semibold text-foreground hover:bg-surface-hover hover:border-accent/20 transition-all active:scale-[0.98]"
          >
            Get the Daily Email
          </Link>
        </div>

        {/* Social proof */}
        <div className="mt-12 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs text-muted-foreground animate-fade-in-up [animation-delay:0.45s]">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-surface-elevated to-surface-hover border-2 border-background"
                />
              ))}
            </div>
            <span>Growing community</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
          <span>Trusted by curious minds worldwide</span>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
          <span>Free, daily updates</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <div className="w-6 h-10 rounded-full border border-border/50 flex items-start justify-center p-1.5">
          <div className="w-1 h-2.5 rounded-full bg-muted-foreground animate-shimmer" />
        </div>
      </div>
    </section>
  );
}
