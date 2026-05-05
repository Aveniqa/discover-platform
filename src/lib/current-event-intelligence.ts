export type EventSourceCategory =
  | "official"
  | "trusted-publisher"
  | "trend-signal"
  | "commerce";

export interface EventSourceProfile {
  id: string;
  name: string;
  category: EventSourceCategory;
  hosts: string[];
  trustLevel: number;
  timeliness: number;
  geographicRelevance: number;
  topicRelevance: number;
  reproducibility: number;
  automationEase: number;
  licensingNote: string;
  failureModes: string[];
  recommendedUse: "verify" | "discover" | "corroborate" | "match-products";
}

export interface SourceTrailEntry {
  name: string;
  url: string;
  role: "event-source" | "guidance" | "product-evidence" | "service-destination" | "signal";
}

export interface RecommendationQualityLike {
  title: string;
  kind: "product" | "service";
  matchReason: string;
  sourceUrl: string;
  shoppingUrl: string;
  affiliate: boolean;
  category?: string;
  whyItHelps?: string;
  destinationType?: "direct-product" | "affiliate-search" | "official-guide" | "service-page";
  usefulnessScore?: number;
  buyerIntentScore?: number;
  safetyScore?: number;
  availabilityScore?: number;
  neutralityScore?: number;
  misleadingRiskScore?: number;
}

export interface CurrentEventQualityLike {
  status: "active" | "paused" | "expired";
  priority: number;
  title: string;
  summary: string;
  whyNow: string;
  sourceUrl: string;
  sourcePublishedAt: string;
  lastVerifiedAt: string;
  confidence?: number;
  editorialStrength?: number;
  sourceQualityScore?: number;
  legitimacyScore?: number;
  timelinessScore?: number;
  safetyScore?: number;
  matchingRationale?: string;
  recommendations: RecommendationQualityLike[];
}

export interface EventDiagnostics {
  editorialStrength: number;
  label: "Strong" | "Usable" | "Needs review" | "Rejected";
  homepageEligible: boolean;
  reasons: string[];
  recommendationCount: number;
}

export const EVENT_SCORE_THRESHOLDS = {
  homepage: 82,
  sourceQuality: 80,
  legitimacy: 78,
  safety: 82,
  recommendation: 72,
  minimumRecommendations: 3,
  maximumRecommendations: 6,
} as const;

export const TRUSTED_EVENT_SOURCE_PROFILES: EventSourceProfile[] = [
  {
    id: "cdc",
    name: "CDC",
    category: "official",
    hosts: ["cdc.gov"],
    trustLevel: 96,
    timeliness: 88,
    geographicRelevance: 96,
    topicRelevance: 96,
    reproducibility: 92,
    automationEase: 78,
    licensingNote: "Public U.S. government guidance; use short summaries and link to source.",
    failureModes: ["Health guidance can change", "Topic scope is limited to public health"],
    recommendedUse: "verify",
  },
  {
    id: "nws-noaa",
    name: "National Weather Service / NOAA",
    category: "official",
    hosts: ["weather.gov", "noaa.gov", "nhc.noaa.gov"],
    trustLevel: 95,
    timeliness: 94,
    geographicRelevance: 96,
    topicRelevance: 95,
    reproducibility: 90,
    automationEase: 86,
    licensingNote: "Public U.S. government weather and preparedness material.",
    failureModes: ["Highly regional alerts need location context", "Alert feeds can be noisy"],
    recommendedUse: "verify",
  },
  {
    id: "epa-airnow",
    name: "EPA / AirNow",
    category: "official",
    hosts: ["epa.gov", "airnow.gov"],
    trustLevel: 93,
    timeliness: 88,
    geographicRelevance: 92,
    topicRelevance: 92,
    reproducibility: 88,
    automationEase: 82,
    licensingNote: "Public environmental and air-quality guidance; cite source pages directly.",
    failureModes: ["AQI is location-specific", "Consumer product claims need careful wording"],
    recommendedUse: "verify",
  },
  {
    id: "ready-fema",
    name: "Ready.gov / FEMA",
    category: "official",
    hosts: ["ready.gov", "fema.gov"],
    trustLevel: 92,
    timeliness: 78,
    geographicRelevance: 94,
    topicRelevance: 90,
    reproducibility: 86,
    automationEase: 80,
    licensingNote: "Public preparedness guidance; useful as evergreen corroboration.",
    failureModes: ["Often evergreen rather than event-specific", "Needs pairing with current alert source"],
    recommendedUse: "corroborate",
  },
  {
    id: "cpsc",
    name: "CPSC Recalls API",
    category: "official",
    hosts: ["cpsc.gov", "saferproducts.gov"],
    trustLevel: 94,
    timeliness: 86,
    geographicRelevance: 90,
    topicRelevance: 88,
    reproducibility: 92,
    automationEase: 88,
    licensingNote: "Machine-readable public recall data; cite exact recall pages.",
    failureModes: ["Recall data can update", "Some records need product-name disambiguation"],
    recommendedUse: "verify",
  },
  {
    id: "openfda",
    name: "openFDA",
    category: "official",
    hosts: ["open.fda.gov", "api.fda.gov", "fda.gov"],
    trustLevel: 93,
    timeliness: 82,
    geographicRelevance: 90,
    topicRelevance: 90,
    reproducibility: 91,
    automationEase: 86,
    licensingNote: "Public FDA datasets; enforcement data may lag initial announcements.",
    failureModes: ["Dataset fields vary by endpoint", "Some recalls are classified after initial notice"],
    recommendedUse: "verify",
  },
  {
    id: "gdelt",
    name: "GDELT",
    category: "trend-signal",
    hosts: ["gdeltproject.org", "api.gdeltproject.org"],
    trustLevel: 76,
    timeliness: 94,
    geographicRelevance: 86,
    topicRelevance: 78,
    reproducibility: 80,
    automationEase: 84,
    licensingNote: "Use as discovery/signal data, not as the authoritative source.",
    failureModes: ["Media-volume bias", "Duplicate/syndicated coverage", "Entity extraction noise"],
    recommendedUse: "discover",
  },
  {
    id: "newsapi",
    name: "NewsAPI",
    category: "trusted-publisher",
    hosts: ["newsapi.org"],
    trustLevel: 78,
    timeliness: 88,
    geographicRelevance: 82,
    topicRelevance: 82,
    reproducibility: 78,
    automationEase: 82,
    licensingNote: "Free tier is development-only; production use requires a paid plan.",
    failureModes: ["Licensing cost", "Partial article content", "Publisher quality varies"],
    recommendedUse: "discover",
  },
  {
    id: "bestbuy",
    name: "Best Buy Products API",
    category: "commerce",
    hosts: ["bestbuy.com", "developer.bestbuy.com", "developers.bestbuy.com"],
    trustLevel: 82,
    timeliness: 88,
    geographicRelevance: 82,
    topicRelevance: 78,
    reproducibility: 82,
    automationEase: 76,
    licensingNote: "Product, price, availability, image, and direct URL data are API-key gated.",
    failureModes: ["Retailer-specific catalog", "Availability changes quickly"],
    recommendedUse: "match-products",
  },
  {
    id: "amazon-paapi",
    name: "Amazon Product Advertising API",
    category: "commerce",
    hosts: ["amazon.com", "affiliate-program.amazon.com", "webservices.amazon.com"],
    trustLevel: 80,
    timeliness: 90,
    geographicRelevance: 86,
    topicRelevance: 80,
    reproducibility: 78,
    automationEase: 64,
    licensingNote: "Use product advertising content only within Associates policy and link product content to the relevant Amazon page.",
    failureModes: ["Access gating", "Strict product-content rules", "Search pages are less transparent than product pages"],
    recommendedUse: "match-products",
  },
];

const unsafeClaimTerms = [
  "miracle",
  "cure",
  "guaranteed",
  "secret",
  "panic",
  "urgent buy",
  "official recommendation",
  "official product",
];

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function getSourceProfileForUrl(url: string): EventSourceProfile | null {
  const host = getHost(url);
  if (!host) return null;
  return TRUSTED_EVENT_SOURCE_PROFILES.find((profile) =>
    profile.hosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`)),
  ) ?? null;
}

export function hasTrustedSource(url: string): boolean {
  const profile = getSourceProfileForUrl(url);
  return Boolean(profile && profile.trustLevel >= EVENT_SCORE_THRESHOLDS.sourceQuality);
}

function hasUnsafeClaimText(value: string): boolean {
  const lower = value.toLowerCase();
  return unsafeClaimTerms.some((term) => lower.includes(term));
}

function scoreDateFreshness(sourcePublishedAt: string, now = new Date()): number {
  const published = new Date(`${sourcePublishedAt}T00:00:00.000Z`);
  if (Number.isNaN(published.getTime())) return 0;
  const ageDays = Math.max(0, (now.getTime() - published.getTime()) / 86_400_000);
  if (ageDays <= 7) return 96;
  if (ageDays <= 21) return 88;
  if (ageDays <= 45) return 72;
  if (ageDays <= 90) return 58;
  return 35;
}

export function scoreRecommendationMatch(recommendation: RecommendationQualityLike): number {
  const profile = getSourceProfileForUrl(recommendation.sourceUrl);
  const sourceScore = profile?.trustLevel ?? 0;
  const usefulnessScore = recommendation.usefulnessScore ?? 70;
  const buyerIntentScore = recommendation.buyerIntentScore ?? 65;
  const safetyScore = recommendation.safetyScore ?? 72;
  const availabilityScore = recommendation.availabilityScore ?? 65;
  const neutralityScore = recommendation.neutralityScore ?? 70;
  const misleadingRiskScore = recommendation.misleadingRiskScore ?? 70;

  const destinationPenalty =
    recommendation.destinationType === "affiliate-search" ? 6 : 0;
  const unsafePenalty = hasUnsafeClaimText(`${recommendation.title} ${recommendation.matchReason} ${recommendation.whyItHelps ?? ""}`) ? 25 : 0;

  return clampScore(
    sourceScore * 0.16 +
      usefulnessScore * 0.24 +
      buyerIntentScore * 0.12 +
      safetyScore * 0.22 +
      availabilityScore * 0.08 +
      neutralityScore * 0.1 +
      misleadingRiskScore * 0.08 -
      destinationPenalty -
      unsafePenalty,
  );
}

export function getEligibleRecommendations<T extends RecommendationQualityLike>(recommendations: T[]): T[] {
  return recommendations
    .map((recommendation) => ({
      recommendation,
      score: scoreRecommendationMatch(recommendation),
    }))
    .filter(({ score }) => score >= EVENT_SCORE_THRESHOLDS.recommendation)
    .sort((a, b) => b.score - a.score)
    .slice(0, EVENT_SCORE_THRESHOLDS.maximumRecommendations)
    .map(({ recommendation }) => recommendation);
}

export function scoreCurrentEvent(event: CurrentEventQualityLike): number {
  const sourceProfile = getSourceProfileForUrl(event.sourceUrl);
  const sourceQualityScore = event.sourceQualityScore ?? sourceProfile?.trustLevel ?? 0;
  const legitimacyScore = event.legitimacyScore ?? (sourceProfile ? sourceProfile.reproducibility : 0);
  const timelinessScore = event.timelinessScore ?? scoreDateFreshness(event.sourcePublishedAt);
  const safetyScore = event.safetyScore ?? 70;
  const recommendationScores = event.recommendations.map(scoreRecommendationMatch);
  const recommendationAverage =
    recommendationScores.length > 0
      ? recommendationScores.reduce((sum, score) => sum + score, 0) / recommendationScores.length
      : 0;
  const unsafePenalty = hasUnsafeClaimText(`${event.title} ${event.summary} ${event.whyNow}`) ? 30 : 0;

  return clampScore(
    sourceQualityScore * 0.23 +
      legitimacyScore * 0.2 +
      timelinessScore * 0.15 +
      safetyScore * 0.2 +
      recommendationAverage * 0.22 -
      unsafePenalty,
  );
}

export function getCurrentEventDiagnostics(event: CurrentEventQualityLike): EventDiagnostics {
  const editorialStrength = clampScore(event.editorialStrength ?? event.confidence ?? scoreCurrentEvent(event));
  const eligibleRecommendations = getEligibleRecommendations(event.recommendations);
  const reasons: string[] = [];
  const sourceQualityScore = event.sourceQualityScore ?? getSourceProfileForUrl(event.sourceUrl)?.trustLevel ?? 0;
  const legitimacyScore = event.legitimacyScore ?? 0;
  const safetyScore = event.safetyScore ?? 0;

  if (sourceQualityScore >= EVENT_SCORE_THRESHOLDS.sourceQuality) {
    reasons.push("Primary source is allowlisted and high-trust.");
  }
  if (legitimacyScore >= EVENT_SCORE_THRESHOLDS.legitimacy) {
    reasons.push("Event is specific, dated, and reproducible from the source trail.");
  }
  if (eligibleRecommendations.length >= EVENT_SCORE_THRESHOLDS.minimumRecommendations) {
    reasons.push("Recommendations passed relevance and safety gates.");
  }
  if (event.matchingRationale) reasons.push(event.matchingRationale);

  const homepageEligible =
    event.status === "active" &&
    editorialStrength >= EVENT_SCORE_THRESHOLDS.homepage &&
    sourceQualityScore >= EVENT_SCORE_THRESHOLDS.sourceQuality &&
    legitimacyScore >= EVENT_SCORE_THRESHOLDS.legitimacy &&
    safetyScore >= EVENT_SCORE_THRESHOLDS.safety &&
    eligibleRecommendations.length >= EVENT_SCORE_THRESHOLDS.minimumRecommendations;

  return {
    editorialStrength,
    label:
      homepageEligible && editorialStrength >= 90
        ? "Strong"
        : homepageEligible
          ? "Usable"
          : editorialStrength >= 70
            ? "Needs review"
            : "Rejected",
    homepageEligible,
    reasons: reasons.slice(0, 4),
    recommendationCount: eligibleRecommendations.length,
  };
}

export function rankCurrentEvents<T extends CurrentEventQualityLike>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const aDiagnostics = getCurrentEventDiagnostics(a);
    const bDiagnostics = getCurrentEventDiagnostics(b);
    if (aDiagnostics.homepageEligible !== bDiagnostics.homepageEligible) {
      return aDiagnostics.homepageEligible ? -1 : 1;
    }
    if (aDiagnostics.editorialStrength !== bDiagnostics.editorialStrength) {
      return bDiagnostics.editorialStrength - aDiagnostics.editorialStrength;
    }
    return a.priority - b.priority;
  });
}

