import Link from "next/link";
import Image from "next/image";
import { currentEvents, formatCurrentEventDate, leadCurrentEvent } from "@/lib/current-events";

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function linkRel(isAffiliate: boolean): string {
  return isAffiliate ? "sponsored noopener noreferrer nofollow" : "noopener noreferrer";
}

export function CurrentEventsEngine() {
  if (!leadCurrentEvent) {
    return (
      <section id="featured-story" className="relative py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-[90rem] mx-auto rounded-xl border border-border bg-surface/70 p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Story of the week
          </p>
          <p className="mt-2 text-sm text-muted">
            No verified current-event product guide is live right now.
          </p>
        </div>
      </section>
    );
  }

  const supportingEvents = currentEvents.slice(1);
  const sourceTrail = Array.from(
    new Map(
      [
        [leadCurrentEvent.sourceUrl, leadCurrentEvent.sourceName],
        ...leadCurrentEvent.recommendations.map((item) => [item.sourceUrl, item.sourceName] as const),
        ...(leadCurrentEvent.nextSteps?.map((step) => [step.sourceUrl, step.sourceName] as const) ?? []),
      ],
    ).entries(),
  ).slice(0, 4);

  return (
    <section id="featured-story" aria-labelledby="featured-story-heading" className="relative py-10 sm:py-16 px-4 sm:px-6 text-left">
      <div className="max-w-[90rem] mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              Story of the week
            </p>
            <h2 id="featured-story-heading" className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Tick season is the practical one to watch
            </h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            A weekly current-events feature that connects trusted reporting to useful, clearly disclosed products and services.
          </p>
        </div>

        <article className="overflow-hidden rounded-[1.75rem] border border-emerald-300/20 bg-surface shadow-[0_28px_100px_rgba(0,0,0,0.34)]">
          <div className="relative min-h-[34rem] sm:min-h-[34rem] lg:min-h-[39rem]">
            <Image
              src={leadCurrentEvent.imageUrl}
              alt={leadCurrentEvent.imageAlt}
              fill
              priority
              sizes="100vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/5" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="rounded-full bg-emerald-300 text-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                  Featured
                </span>
                <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                  {leadCurrentEvent.label}
                </span>
                <span className="text-xs text-white/70">
                  Verified {formatCurrentEventDate(leadCurrentEvent.lastVerifiedAt)}
                </span>
              </div>

              <h3 className="max-w-5xl text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.02] tracking-tight text-white text-balance">
                {leadCurrentEvent.title}
              </h3>
              <p className="mt-4 max-w-3xl text-sm sm:text-lg leading-relaxed text-white/80">
                {leadCurrentEvent.summary}
              </p>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
            <div className="flex flex-col border-t border-white/10 bg-background/40 p-5 sm:p-8 lg:p-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                Why it matters now
              </p>
              <p className="mt-3 text-base sm:text-lg leading-relaxed text-muted">
                {leadCurrentEvent.whyNow}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={leadCurrentEvent.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-white text-black px-4 py-2.5 text-sm font-bold hover:bg-white/90 transition-colors"
                >
                  Read the CDC source
                </a>
                <span className="text-xs text-muted-foreground">
                  {leadCurrentEvent.sourceName} · {hostLabel(leadCurrentEvent.sourceUrl)}
                </span>
              </div>
              <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
                Photo: {leadCurrentEvent.imageCredit}. Informational only, not medical advice. Follow CDC guidance and contact a qualified clinician for personal health concerns.
              </p>

              {!!leadCurrentEvent.storySignals?.length && (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {leadCurrentEvent.storySignals.map((signal) => (
                    <div key={`${signal.value}-${signal.label}`} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4">
                      <p className="text-lg font-black leading-tight text-emerald-200">
                        {signal.value}
                      </p>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted">
                        {signal.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!!leadCurrentEvent.nextSteps?.length && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-surface-elevated/45 p-4 sm:p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Before you shop
                      </p>
                      <h4 className="mt-1 text-xl font-black tracking-tight text-foreground">
                        A CDC-backed action plan
                      </h4>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Prevention first, products second
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {leadCurrentEvent.nextSteps.map((step, index) => (
                      <article key={step.title} className="grid grid-cols-[2rem_1fr] gap-3 rounded-xl border border-border/60 bg-background/35 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 text-xs font-black text-black">
                          {index + 1}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold leading-snug text-foreground">
                            {step.title}
                          </h5>
                          <p className="mt-1 text-xs leading-relaxed text-muted">
                            {step.body}
                          </p>
                          <a
                            href={step.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex text-[11px] font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
                          >
                            Source: {step.sourceName}
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col border-t lg:border-l border-white/10 bg-surface-elevated/45 p-5 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Practical response kit
                  </p>
                  <h4 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                    Products and services tied to the source
                  </h4>
                </div>
                <Link href="/affiliate-disclosure" className="text-xs font-medium text-muted-foreground hover:text-accent transition-colors link-underline">
                  Affiliate disclosure
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {leadCurrentEvent.recommendations.map((item) => (
                  <article key={item.id} className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                          {item.kind}
                        </span>
                        <h5 className="mt-1 text-base font-bold leading-snug text-foreground">
                          {item.title}
                        </h5>
                      </div>
                      {item.affiliate && (
                        <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                          Affiliate
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      {item.matchReason}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <a
                        href={item.shoppingUrl}
                        target="_blank"
                        rel={linkRel(item.affiliate)}
                        data-affiliate={item.affiliate ? "true" : "false"}
                        className="inline-flex items-center rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white hover:bg-accent-hover transition-colors"
                      >
                        {item.ctaLabel}
                      </a>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
                      >
                        Evidence: {item.sourceName}
                      </a>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-background/35 p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Why these made the cut
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    "Directly tied to CDC or EPA guidance",
                    "Useful before, during, or after outdoor exposure",
                    "No cure claims, panic language, or unrelated impulse buys",
                  ].map((rule) => (
                    <div key={rule} className="rounded-xl border border-border/60 bg-surface/40 p-3">
                      <p className="text-xs leading-relaxed text-muted">
                        {rule}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-background/25 p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Source trail
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sourceTrail.map(([url, name]) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-border/60 bg-surface/35 p-3 text-xs font-semibold text-foreground hover:border-emerald-300/40 hover:text-emerald-200 transition-colors"
                    >
                      {name}
                      <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                        {hostLabel(url)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>

        {supportingEvents.length > 0 && (
          <div className="mt-6">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Also watching
                </p>
                <h3 className="mt-1 text-xl sm:text-2xl font-bold text-foreground">
                  More current-event guides ready to expand
                </h3>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {supportingEvents.map((event) => (
                <article key={event.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="relative h-48">
                    <Image
                      src={event.imageUrl}
                      alt={event.imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 45vw"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute left-4 right-4 bottom-4">
                      <span className="rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                        {event.label}
                      </span>
                      <h4 className="mt-2 text-xl font-bold leading-tight text-white">
                        {event.title}
                      </h4>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm leading-relaxed text-muted line-clamp-3">
                      {event.summary}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {event.recommendations.slice(0, 3).map((item) => (
                        <a
                          key={item.id}
                          href={item.shoppingUrl}
                          target="_blank"
                          rel={linkRel(item.affiliate)}
                          data-affiliate={item.affiliate ? "true" : "false"}
                          className="rounded-lg border border-border bg-background/35 p-3 text-xs font-semibold text-foreground hover:border-accent/40 transition-colors"
                        >
                          {item.title}
                        </a>
                      ))}
                    </div>
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex text-xs font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
                    >
                      Source: {event.sourceName}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
