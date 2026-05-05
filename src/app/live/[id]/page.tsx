import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  formatCurrentEventDate,
  getCurrentEventDiagnostics,
  getCurrentEventDisplayImageUrl,
  getCurrentEventRecommendations,
  getCurrentEventSourceTrail,
  getHost,
  monitoredCurrentEvents,
} from "@/lib/current-events";
import { buildMetadata, getBuildDate } from "@/lib/seo";
import { articleLd, breadcrumbLd, ldScript } from "@/lib/jsonld";
import { SourceTrailLink } from "@/components/ui/SourceTrailLink";
import { LazyPublisherVideo } from "@/components/home/LazyPublisherVideo";

type Props = { params: Promise<{ id: string }> };

function getEvent(id: string) {
  return monitoredCurrentEvents.find((event) => event.id === id) ?? null;
}

export function generateStaticParams() {
  return monitoredCurrentEvents.map((event) => ({ id: event.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = getEvent(id);
  if (!event) return { title: "Not Found" };
  return buildMetadata({
    title: event.title,
    seoTitle: `${event.title} | Live Brief`,
    description: event.summary,
    path: `/live/${event.id}`,
    image: event.imageUrl,
    ogType: "article",
    publishedTime: event.publishedAt,
    modifiedTime: event.lastVerifiedAt || getBuildDate(),
  });
}

export default async function LiveBriefPage({ params }: Props) {
  const { id } = await params;
  const event = getEvent(id);
  if (!event) notFound();

  const diagnostics = getCurrentEventDiagnostics(event);
  const recommendations = getCurrentEventRecommendations(event).slice(0, 4);
  const sourceTrail = getCurrentEventSourceTrail(event);
  const pagePath = `/live/${event.id}`;
  const itemLd = articleLd({
    title: event.title,
    description: event.summary,
    url: pagePath,
    image: event.imageUrl,
    datePublished: event.publishedAt,
    dateModified: event.lastVerifiedAt || getBuildDate(),
  });
  const crumbsLd = breadcrumbLd([
    { name: "Home", href: "/" },
    { name: "Live", href: pagePath },
    { name: event.title },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(itemLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(crumbsLd)} />

      <article className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-[90rem]">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-accent transition-colors">Home</Link>
            <span>/</span>
            <span className="text-foreground">Live brief</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div>
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="relative aspect-[16/8] min-h-[18rem]">
                  <Image
                    src={getCurrentEventDisplayImageUrl(event, 960, 72)}
                    alt={event.imageAlt}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 62vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                      {event.label}
                    </p>
                    <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                      {event.title}
                    </h1>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Verified</p>
                  <p className="mt-2 text-sm font-bold text-foreground">{formatCurrentEventDate(event.lastVerifiedAt)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Strength</p>
                  <p className="mt-2 text-sm font-bold text-emerald-200">{diagnostics.editorialStrength}/100 {diagnostics.label}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Primary source</p>
                  <p className="mt-2 text-sm font-bold text-foreground">{getHost(event.sourceUrl)}</p>
                </div>
              </div>

              <section className="mt-8 rounded-xl border border-border bg-surface p-5 sm:p-7">
                <h2 className="text-2xl font-black tracking-tight text-foreground">What changed</h2>
                <p className="mt-3 text-base leading-relaxed text-muted">{event.summary}</p>
                <h3 className="mt-7 text-lg font-black tracking-tight text-foreground">Why now</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{event.whyNow}</p>
                <div className="mt-6">
                  <SourceTrailLink href={event.sourceUrl} label={event.sourceName} />
                </div>
              </section>

              {recommendations.length > 0 && (
                <section className="mt-6">
                  <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Response kit</p>
                      <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">Useful recommendations with evidence</h2>
                    </div>
                    <Link href="/affiliate-disclosure" className="text-xs font-medium text-muted-foreground hover:text-accent transition-colors link-underline">
                      Affiliate disclosure
                    </Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recommendations.map((item) => (
                      <article key={item.id} className="rounded-xl border border-border bg-surface p-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">{item.category}</span>
                        <h3 className="mt-1 text-sm font-black leading-snug text-foreground">{item.title}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-muted">{item.matchReason}</p>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex text-[11px] font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
                        >
                          Evidence: {item.sourceName}
                        </a>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="grid content-start gap-4">
              {event.youtubeVideoId && (
                <LazyPublisherVideo
                  videoId={event.youtubeVideoId}
                  title={event.youtubeVideoTitle || `${event.title} video`}
                  channelTitle={event.youtubeChannelTitle || event.publisher || event.sourceName}
                />
              )}
              <div className="rounded-xl border border-border bg-surface p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Source trail</p>
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
                      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{getHost(source.url)}</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Editorial safeguards</p>
                <div className="mt-3 grid gap-2">
                  {(event.editorialSafeguards ?? diagnostics.reasons).slice(0, 5).map((rule) => (
                    <p key={rule} className="text-xs leading-relaxed text-muted">{rule}</p>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
