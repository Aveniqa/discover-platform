import currentEventsData from "../../data/current-events.json";

export type CurrentEventStatus = "active" | "paused" | "expired";
export type CurrentEventRecommendationKind = "product" | "service";

export interface CurrentEventRecommendation {
  id: string;
  title: string;
  kind: CurrentEventRecommendationKind;
  matchReason: string;
  sourceName: string;
  sourceUrl: string;
  shoppingUrl: string;
  affiliate: boolean;
  ctaLabel: string;
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
  storySignals?: CurrentEventSignal[];
  nextSteps?: CurrentEventNextStep[];
  recommendations: CurrentEventRecommendation[];
}

export const currentEvents = (currentEventsData as CurrentEventItem[])
  .filter((event) => event.status === "active")
  .sort((a, b) => a.priority - b.priority);

export const leadCurrentEvent = currentEvents[0] ?? null;

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
