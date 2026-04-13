export function SocialCTA() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 text-center">
      <h3 className="text-base font-bold text-foreground mb-1.5">
        Surfaced — Daily discoveries, curated for the curious
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        Five categories of curated finds, updated every morning.
      </p>
      <a
        href="/newsletter"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-surface-elevated text-sm text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all"
      >
        Get the daily newsletter →
      </a>
    </div>
  );
}
