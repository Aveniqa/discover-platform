import currentEventsData from "../../data/current-events.json";
import {
  getCurrentEventDiagnostics,
  getPublishableRecommendationsForEvent,
  getHost,
  getWeatherPresentation,
  rankCurrentEvents,
  mapWeatherState,
  type SourceTrailEntry,
  type NormalizedEventSourceType,
  type WeatherState,
} from "@/lib/current-event-intelligence";

export type CurrentEventStatus = "active" | "paused" | "expired";
export type CurrentEventRecommendationKind = "product" | "service";
export type CurrentEventDestinationType =
  | "direct-product"
  | "affiliate-search"
  | "official-guide"
  | "service-page";

export interface CurrentEventRecommendation {
  id: string;
  label?: string;
  title: string;
  kind: CurrentEventRecommendationKind;
  category: string;
  matchReason: string;
  reason?: string;
  whyItHelps: string;
  sourceName: string;
  sourceUrl: string;
  shoppingUrl: string;
  destinationUrl?: string;
  affiliateLabel?: string;
  affiliate: boolean;
  ctaLabel: string;
  destinationType: CurrentEventDestinationType;
  destinationJustification?: string;
  matchScore?: number;
  relevanceScore?: number;
  usefulnessScore: number;
  buyerIntentScore: number;
  safetyScore: number;
  availabilityScore: number;
  neutralityScore: number;
  misleadingRiskScore: number;
  sourceTrail?: SourceTrailEntry[];
}

export interface CurrentEventSignal {
  value: string;
  label: string;
}

export interface CurrentEventNextStep {
  title: string;
  body: string;
  sourceName: string;
  sourceUrl: string;
}

export interface CurrentEventItem {
  id: string;
  status: CurrentEventStatus;
  priority: number;
  label: string;
  topic: string;
  sourceType?: NormalizedEventSourceType;
  publisher?: string;
  publishedAt?: string;
  geography: string[];
  confidence: number;
  editorialStrength: number;
  sourceQualityScore: number;
  legitimacyScore: number;
  timelinessScore: number;
  safetyScore: number;
  matchingRationale: string;
  fallbackReason?: string;
  title: string;
  summary: string;
  whyNow: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt: string;
  lastVerifiedAt: string;
  imageUrl: string;
  imageAlt: string;
  imageCredit: string;
  responseTags: string[];
  corroborationRequired?: boolean;
  weatherState?: WeatherState;
  sourceTrail?: SourceTrailEntry[];
  editorialSafeguards?: string[];
  storySignals?: CurrentEventSignal[];
  nextSteps?: CurrentEventNextStep[];
  recommendations: CurrentEventRecommendation[];
}

const allCurrentEvents = currentEventsData as CurrentEventItem[];

export const monitoredCurrentEvents = rankCurrentEvents(
  allCurrentEvents.filter((event) => event.status === "active"),
);

export const currentEvents = monitoredCurrentEvents.filter(
  (event) => getCurrentEventDiagnostics(event).homepageEligible,
);

export const leadCurrentEvent = currentEvents[0] ?? null;

export function getCurrentEventRecommendations(event: CurrentEventItem): CurrentEventRecommendation[] {
  return getPublishableRecommendationsForEvent(event, event.recommendations);
}

export function getCurrentEventSourceTrail(event: CurrentEventItem): SourceTrailEntry[] {
  const entries: SourceTrailEntry[] = [
    ...(event.sourceTrail ?? []),
    { name: event.sourceName, label: event.sourceName, url: event.sourceUrl, role: "event-source" as const },
    ...event.recommendations.flatMap((item) => item.sourceTrail ?? [
      { name: item.sourceName, label: item.sourceName, url: item.sourceUrl, role: "product-evidence" as const },
    ]),
    ...(event.nextSteps?.map((step) => ({
      name: step.sourceName,
      label: step.sourceName,
      url: step.sourceUrl,
      role: "guidance" as const,
    })) ?? []),
  ];

  return Array.from(
    new Map(entries.map((entry) => [entry.url, entry] as const)).values(),
  ).map((entry) => ({
    ...entry,
    name: entry.name || entry.label || hostLabelFallback(entry.url),
    label: entry.label || entry.name || hostLabelFallback(entry.url),
  })).slice(0, 6);
}

function hostLabelFallback(url: string): string {
  return getHost(url) || "source";
}

export function getCurrentEventTrustSummary(event: CurrentEventItem): string[] {
  const diagnostics = getCurrentEventDiagnostics(event);
  const safeguards = event.editorialSafeguards ?? [];
  return [...safeguards, ...diagnostics.reasons].slice(0, 5);
}

export { getCurrentEventDiagnostics, getHost };

export function getCurrentEventWeatherPresentation(event: CurrentEventItem) {
  return getWeatherPresentation(mapWeatherState(event));
}

export function formatCurrentEventDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
