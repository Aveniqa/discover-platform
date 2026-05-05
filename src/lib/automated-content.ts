import trendingLiveData from "../../automated-content/trending-live.json";
import type { CurrentEventItem } from "@/lib/current-events";

export type TrendingLiveSourceRole = "signal" | "event-source" | "publisher" | "official";

export interface TrendingLiveSource {
  name: string;
  url: string;
  role: TrendingLiveSourceRole;
}

export interface TrendingLiveItem {
  id: string;
  type: "github-trending" | "news-trending" | "current-event";
  title: string;
  summary: string;
  topic: string;
  sourceName: string;
  sourceUrl: string;
  detectedAt: string;
  publishedAt?: string;
  score: number;
  velocityLabel: string;
  ctaLabel: string;
  url?: string;
  sourceTrail: TrendingLiveSource[];
}

export interface TrendingLiveFeed {
  version: number;
  generatedAt: string;
  refreshCadence: string;
  editorialThreshold: number;
  mode: "fail-closed";
  items: TrendingLiveItem[];
  monitoredSignals: TrendingLiveItem[];
  decisionLog: string[];
}

export const trendingLiveFeed = trendingLiveData as TrendingLiveFeed;

export function getTrendingLiveItems(events: CurrentEventItem[], limit = 6): TrendingLiveItem[] {
  const automated = (trendingLiveFeed.items || [])
    .filter((item) => item.score >= trendingLiveFeed.editorialThreshold)
    .slice(0, limit);

  if (automated.length >= Math.min(3, limit)) return automated;

  const eventItems = events.slice(0, limit - automated.length).map((event) => ({
    id: `event-${event.id}`,
    type: "current-event" as const,
    title: event.title,
    summary: event.summary,
    topic: event.topic,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
    detectedAt: event.lastVerifiedAt,
    publishedAt: event.sourcePublishedAt,
    score: event.editorialStrength,
    velocityLabel: `${event.editorialStrength}/100 editorial strength`,
    ctaLabel: "Open live brief",
    url: `/live/${event.id}`,
    sourceTrail: [
      { name: event.sourceName, url: event.sourceUrl, role: "event-source" as const },
      ...(event.sourceTrail ?? []).slice(0, 3).map((source) => ({
        name: source.name || source.label || "Source",
        url: source.url,
        role: source.role === "signal" ? "signal" as const : "official" as const,
      })),
    ],
  }));

  return [...automated, ...eventItems].slice(0, limit);
}

export function getTrendingLiveGeneratedAt(): string {
  return trendingLiveFeed.generatedAt;
}
