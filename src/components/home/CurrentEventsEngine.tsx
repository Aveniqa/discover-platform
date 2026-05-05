import Link from "next/link";
import Image from "next/image";
import {
  currentEvents,
  formatCurrentEventDate,
  getCurrentEventDiagnostics,
  getCurrentEventRecommendations,
  getCurrentEventSourceTrail,
  getCurrentEventTrustSummary,
  getCurrentEventWeatherPresentation,
  getHost,
  leadCurrentEvent,
} from "@/lib/current-events";
import type {
  CurrentEventItem,
  CurrentEventNextStep,
  CurrentEventRecommendation,
  CurrentEventSignal,
} from "@/lib/current-events";
import {
  getTrendingLiveGeneratedAt,
  getTrendingLiveItems,
  type TrendingLiveItem,
} from "@/lib/automated-content";
import type { SourceTrailEntry } from "@/lib/current-event-intelligence";
import { LazyDailyInsightQuiz } from "@/components/home/LazyDailyInsightQuiz";
import type { DailyInsightQuizData } from "@/components/home/DailyInsightQuiz";
import { LazyPublisherVideo } from "@/components/home/LazyPublisherVideo";
import { TrendingLiveAutoRefresh } from "@/components/home/TrendingLiveAutoRefresh";

function hostLabel(url: string): string {
  return getHost(url) || "source";
}

function linkRel(isAffiliate: boolean): string {
  return isAffiliate ? "sponsored noopener noreferrer nofollow" : "noopener noreferrer";
}

function SignalPill({ signal }: { signal: CurrentEventSignal }) {
  return (
    <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2">
      <p className="text-sm font-black leading-tight text-emerald-200">
        {signal.value}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        {signal.label}
      </p>
    </div>
  );
}

function ActionStep({ step, index }: { step: CurrentEventNextStep; index: number }) {
  return (
    <article className="grid grid-cols-[1.65rem_1fr] gap-3 border-t border-border/60 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300 text-[11px] font-black text-black">
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
          className="mt-1.5 inline-flex text-[11px] font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
        >
          Source: {step.sourceName}
        </a>
      </div>
    </article>
  );
}

function RecommendationCard({ item }: { item: CurrentEventRecommendation }) {
  return (
    <article className="rounded-xl border border-border/70 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
            {item.category}
          </span>
          <h5 className="mt-1 text-sm font-bold leading-snug text-foreground">
            {item.title}
          </h5>
        </div>
        {item.affiliate && (
          <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
            Affiliate
          </span>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-3">
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
          Evidence
        </a>
      </div>
    </article>
  );
}

function SourceTrailCard({ sourceTrail }: { sourceTrail: SourceTrailEntry[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        Source trail
      </p>
      <div className="mt-3 grid gap-2">
        {sourceTrail.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border/60 bg-background/35 px-3 py-2.5 text-xs font-semibold text-foreground hover:border-emerald-300/40 hover:text-emerald-200 transition-colors"
          >
            {source.name}
            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
              {hostLabel(source.url)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function seededNumber(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildDailyInsightQuiz(event: CurrentEventItem): DailyInsightQuizData | null {
  const steps = event.nextSteps ?? [];
  const correctStep = steps[0];
  if (!correctStep) return null;

  const distractors = [
    ...steps.slice(1).map((step) => step.title),
    ...getCurrentEventRecommendations(event).slice(0, 3).map((item) => item.title),
  ].filter((option) => option && option !== correctStep.title);

  const options = Array.from(new Set([correctStep.title, ...distractors])).slice(0, 4);
  if (options.length < 3) return null;

  const rotation = seededNumber(`${event.id}:${event.lastVerifiedAt}`) % options.length;
  const rotated = [...options.slice(rotation), ...options.slice(0, rotation)];
  const answerIndex = rotated.findIndex((option) => option === correctStep.title);

  return {
    storyId: event.id,
    dateKey: event.lastVerifiedAt,
    title: event.title,
    question: `Which step comes first in today's ${event.label.toLowerCase()} guide?`,
    options: rotated,
    answerIndex,
    explainer: correctStep.body,
    sourceName: correctStep.sourceName,
    sourceUrl: correctStep.sourceUrl,
  };
}

function TrendingLiveCard({ item }: { item: TrendingLiveItem }) {
  const source = item.sourceTrail[0] ?? { name: item.sourceName, url: item.sourceUrl };
  const href = item.url || item.sourceUrl;

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-border/70 bg-background/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {item.type === "github-trending" ? "GitHub" : item.type === "news-trending" ? "News" : "Live guide"}
        </span>
        <span className="text-[11px] font-black text-emerald-200">
          {item.score}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-black leading-snug text-foreground">
        {item.title}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-3">
        {item.summary}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-xs font-bold text-cyan-100 hover:text-cyan-200 transition-colors link-underline"
        >
          {item.ctaLabel}
        </a>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
        >
          Source: {source.name}
        </a>
      </div>
    </article>
  );
}

function TrendingLiveRail({ events }: { events: CurrentEventItem[] }) {
  const items = getTrendingLiveItems(events, 6);
  if (!items.length) return null;

  return (
    <div className="mb-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
            Trending Live
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
            Signals with source trails
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span className="rounded-full border border-border bg-surface px-3 py-1">
            Refreshed {formatCurrentEventDate(getTrendingLiveGeneratedAt().slice(0, 10))}
          </span>
          <TrendingLiveAutoRefresh generatedAt={getTrendingLiveGeneratedAt()} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <TrendingLiveCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function SupportingEventCard({ event }: { event: CurrentEventItem }) {
  const recommendations = getCurrentEventRecommendations(event).slice(0, 2);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="grid grid-cols-[7rem_1fr] sm:grid-cols-[8.5rem_1fr]">
        <div className="relative min-h-full">
          <Image
            src={event.imageUrl}
            alt={event.imageAlt}
            fill
            sizes="140px"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/15 to-transparent" />
        </div>
        <div className="p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {event.label}
          </span>
          <h4 className="mt-1 text-sm font-bold leading-snug text-foreground">
            {event.title}
          </h4>
          <p className="mt-1.5 text-xs leading-relaxed text-muted line-clamp-2">
            {event.summary}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {recommendations.map((item) => (
              <a
                key={item.id}
                href={item.shoppingUrl}
                target="_blank"
                rel={linkRel(item.affiliate)}
                data-affiliate={item.affiliate ? "true" : "false"}
                className="rounded-full border border-border/70 bg-background/35 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-accent/40 transition-colors"
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function CurrentEventsEngine() {
  if (!leadCurrentEvent) {
    return (
      <section id="featured-story" className="relative border-y border-border/40 px-4 py-6 sm:px-6">
        <div className="max-w-[90rem] mx-auto rounded-xl border border-border bg-surface/70 p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Current signal
          </p>
          <p className="mt-2 text-sm text-muted">
            No verified current-event product guide is live right now.
          </p>
        </div>
      </section>
    );
  }

  const supportingEvents = currentEvents.slice(1, 3);
  const leadRecommendations = getCurrentEventRecommendations(leadCurrentEvent).slice(0, 4);
  const leadDiagnostics = getCurrentEventDiagnostics(leadCurrentEvent);
  const trustSummary = getCurrentEventTrustSummary(leadCurrentEvent).slice(0, 3);
  const sourceTrail = getCurrentEventSourceTrail(leadCurrentEvent).slice(0, 5);
  const weatherPresentation = getCurrentEventWeatherPresentation(leadCurrentEvent);
  const storySignals = leadCurrentEvent.storySignals?.slice(0, 3) ?? [];
  const nextSteps = leadCurrentEvent.nextSteps?.slice(0, 4) ?? [];
  const quiz = buildDailyInsightQuiz(leadCurrentEvent);

  return (
    <section
      id="featured-story"
      aria-labelledby="featured-story-heading"
      className="relative border-y border-border/40 bg-background/70 px-4 py-6 text-left sm:px-6 sm:py-8"
    >
      <div className="max-w-[90rem] mx-auto">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              Current signal
            </p>
            <h2 id="featured-story-heading" className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Today&rsquo;s response guide
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="rounded-full border border-border bg-surface px-3 py-1">
              Verified {formatCurrentEventDate(leadCurrentEvent.lastVerifiedAt)}
            </span>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-emerald-200">
              {leadDiagnostics.editorialStrength}/100 {leadDiagnostics.label}
            </span>
            {weatherPresentation.state !== "neutral" && (
              <span className="rounded-full border border-border bg-surface px-3 py-1">
                {weatherPresentation.label}
              </span>
            )}
          </div>
        </div>

        <TrendingLiveRail events={currentEvents} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <article
            className={`relative overflow-hidden rounded-xl border border-emerald-300/20 ${weatherPresentation.className}`}
            data-weather-state={weatherPresentation.state}
          >
            {weatherPresentation.effects.length > 0 && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
                {weatherPresentation.effects.map((effect, index) => (
                  <div
                    key={`${weatherPresentation.state}-${effect}`}
                    className={`absolute inset-0 ${effect} ${index === 0 ? "opacity-45" : "opacity-25"}`}
                  />
                ))}
              </div>
            )}
            <div className="relative grid sm:grid-cols-[minmax(12rem,18rem)_1fr]">
              <div className="relative h-48 sm:h-full sm:min-h-[20rem]">
                <Image
                  src={leadCurrentEvent.imageUrl}
                  alt={leadCurrentEvent.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 40vw, 320px"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent sm:bg-gradient-to-r" />
              </div>

              <div className="relative flex flex-col p-5 sm:p-6 lg:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Featured
                  </span>
                  <span className="rounded-full border border-border bg-background/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {leadCurrentEvent.label}
                  </span>
                </div>

                <h3 className="mt-4 max-w-3xl text-2xl font-black leading-[1.06] tracking-tight text-foreground text-balance sm:text-3xl lg:text-4xl">
                  {leadCurrentEvent.title}
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
                  {leadCurrentEvent.summary}
                </p>

                {storySignals.length > 0 && (
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {storySignals.map((signal) => (
                      <SignalPill key={`${signal.value}-${signal.label}`} signal={signal} />
                    ))}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    href={leadCurrentEvent.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-white/90"
                  >
                    Read the source
                  </a>
                  <Link
                    href={`/live/${leadCurrentEvent.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background/35 px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-emerald-300/35"
                  >
                    Open live brief
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {leadCurrentEvent.sourceName} · {hostLabel(leadCurrentEvent.sourceUrl)}
                  </span>
                </div>

                <p className="mt-auto pt-5 text-[11px] leading-relaxed text-muted-foreground">
                  Photo: {leadCurrentEvent.imageCredit}. Informational only; follow linked source guidance for health, safety, or property decisions.
                </p>
              </div>
            </div>
          </article>

          <div className="grid gap-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Why now
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {leadCurrentEvent.whyNow}
              </p>
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Editorial safeguards
                </p>
                <div className="mt-2 grid gap-2">
                  {trustSummary.map((rule) => (
                    <p key={rule} className="text-xs leading-relaxed text-muted">
                      {rule}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            {quiz && <LazyDailyInsightQuiz quiz={quiz} />}
            {leadCurrentEvent.youtubeVideoId && (
              <LazyPublisherVideo
                videoId={leadCurrentEvent.youtubeVideoId}
                title={leadCurrentEvent.youtubeVideoTitle || `${leadCurrentEvent.title} video`}
                channelTitle={leadCurrentEvent.youtubeChannelTitle || leadCurrentEvent.publisher || leadCurrentEvent.sourceName}
              />
            )}
            <SourceTrailCard sourceTrail={sourceTrail} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          {nextSteps.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Before you shop
                  </p>
                  <h4 className="mt-1 text-lg font-black tracking-tight text-foreground">
                    Prevention first, products second
                  </h4>
                </div>
                <span className="hidden text-[11px] text-muted-foreground sm:inline">
                  {nextSteps.length} source-backed steps
                </span>
              </div>
              <div className="mt-4">
                {nextSteps.map((step, index) => (
                  <ActionStep key={step.title} step={step} index={index} />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Practical response kit
                </p>
                <h4 className="mt-1 text-lg font-black tracking-tight text-foreground">
                  Useful recommendations with evidence
                </h4>
              </div>
              <Link href="/affiliate-disclosure" className="text-xs font-medium text-muted-foreground hover:text-accent transition-colors link-underline">
                Affiliate disclosure
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {leadRecommendations.map((item) => (
                <RecommendationCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        {supportingEvents.length > 0 && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.34fr_0.66fr]">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Also watching
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
                More guides are ready when the story shifts
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Surfaced keeps the lead slot narrow and rotates only when a monitored story has stronger source quality, timeliness, and practical reader value.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {supportingEvents.map((event) => (
                <SupportingEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
