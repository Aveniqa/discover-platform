export type EventSourceCategory =
  | "official"
  | "trusted-publisher"
  | "trend-signal"
  | "commerce";

export type NormalizedEventSourceType = "discovery" | "official" | "corroboration";

export type WeatherState =
  | "sunny"
  | "cloudy"
  | "drizzle"
  | "light rain"
  | "rain"
  | "heavy rain"
  | "monsoon"
  | "tornado"
  | "hurricanes"
  | "neutral";

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
  name?: string;
  label?: string;
  url: string;
  role: "event-source" | "guidance" | "product-evidence" | "service-destination" | "signal";
  sourceType?: NormalizedEventSourceType;
  publisher?: string;
}

export interface RecommendationQualityLike {
  id?: string;
  label?: string;
  title: string;
  kind: "product" | "service";
  matchReason: string;
  reason?: string;
  sourceUrl: string;
  shoppingUrl: string;
  destinationUrl?: string;
  affiliateLabel?: string;
  affiliate: boolean;
  category?: string;
  whyItHelps?: string;
  destinationType?: "direct-product" | "affiliate-search" | "official-guide" | "service-page";
  destinationJustification?: string;
  sourceTrail?: SourceTrailEntry[];
  matchScore?: number;
  relevanceScore?: number;
  usefulnessScore?: number;
  buyerIntentScore?: number;
  safetyScore?: number;
  availabilityScore?: number;
  neutralityScore?: number;
  misleadingRiskScore?: number;
}

export interface CurrentEventQualityLike {
  id?: string;
  status: "active" | "paused" | "expired";
  priority: number;
  topic: string;
  title: string;
  summary: string;
  whyNow: string;
  sourceUrl: string;
  sourceName?: string;
  publisher?: string;
  sourceType?: NormalizedEventSourceType;
  sourcePublishedAt: string;
  publishedAt?: string;
  lastVerifiedAt: string;
  confidence?: number;
  editorialStrength?: number;
  sourceQualityScore?: number;
  legitimacyScore?: number;
  timelinessScore?: number;
  safetyScore?: number;
  matchingRationale?: string;
  geography?: string | string[];
  responseTags?: string[];
  sourceTrail?: SourceTrailEntry[];
  corroborationRequired?: boolean;
  weatherState?: WeatherState;
  recommendations: RecommendationQualityLike[];
}

export interface EventDiagnostics {
  editorialStrength: number;
  label: "Strong" | "Usable" | "Needs review" | "Rejected";
  homepageEligible: boolean;
  reasons: string[];
  rejectionReasons: string[];
  recommendationCount: number;
  sourceTrailValid: boolean;
  sourceType: NormalizedEventSourceType;
  weatherState: WeatherState;
}

export interface CurrentEvent {
  id: string;
  topic: string;
  title: string;
  summary: string;
  sourceUrl: string;
  publisher: string;
  sourceType: NormalizedEventSourceType;
  geography?: string;
  publishedAt: string;
  confidence: number;
  legitimacyScore: number;
  timelinessScore: number;
  safetyScore: number;
  sourceQualityScore: number;
  editorialStrength: number;
  sourceTrail: Array<{ label: string; url: string }>;
  matchingRationale: string;
}

export interface Recommendation {
  id: string;
  label: string;
  category: "product" | "service";
  reason: string;
  destinationUrl: string;
  affiliateLabel?: string;
  sourceTrail: Array<{ label: string; url: string }>;
  matchScore: number;
  safetyScore: number;
  relevanceScore: number;
}

export interface PipelineIssue {
  code:
    | "weak-source"
    | "missing-source-trail"
    | "stale-event"
    | "missing-corroboration"
    | "low-confidence"
    | "low-editorial-strength"
    | "unsafe-event"
    | "unrelated-recommendation"
    | "unsafe-recommendation"
    | "weak-recommendation-destination"
    | "too-few-recommendations";
  message: string;
}

export interface CurrentEventPipelineResult<T extends CurrentEventQualityLike> {
  published: T[];
  rejected: Array<{ event: T; issues: PipelineIssue[] }>;
}

export const EVENT_SCORE_THRESHOLDS = {
  homepage: 82,
  confidence: 82,
  sourceQuality: 80,
  legitimacy: 78,
  timeliness: 60,
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
    hosts: ["weather.gov", "api.weather.gov", "noaa.gov", "nhc.noaa.gov"],
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
    id: "google-news-rss",
    name: "Google News RSS",
    category: "trusted-publisher",
    hosts: ["news.google.com"],
    trustLevel: 78,
    timeliness: 88,
    geographicRelevance: 82,
    topicRelevance: 82,
    reproducibility: 78,
    automationEase: 82,
    licensingNote: "Use as publisher discovery/corroboration signal only; link to primary publisher or official source for truth.",
    failureModes: ["Google redirect URLs", "Publisher quality varies", "Syndicated duplicate coverage"],
    recommendedUse: "corroborate",
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
    id: "walmart",
    name: "Walmart product feed",
    category: "commerce",
    hosts: ["walmart.com"],
    trustLevel: 78,
    timeliness: 82,
    geographicRelevance: 82,
    topicRelevance: 74,
    reproducibility: 76,
    automationEase: 62,
    licensingNote: "Use only if feed/API terms provide direct product URLs and affiliate tracking is approved.",
    failureModes: ["Feed reliability varies", "Availability changes quickly"],
    recommendedUse: "match-products",
  },
  {
    id: "target",
    name: "Target product feed",
    category: "commerce",
    hosts: ["target.com"],
    trustLevel: 78,
    timeliness: 82,
    geographicRelevance: 82,
    topicRelevance: 74,
    reproducibility: 76,
    automationEase: 62,
    licensingNote: "Use only when direct product URLs and affiliate terms are reliable.",
    failureModes: ["Feed reliability varies", "Availability changes quickly"],
    recommendedUse: "match-products",
  },
  {
    id: "home-depot",
    name: "Home Depot product feed",
    category: "commerce",
    hosts: ["homedepot.com"],
    trustLevel: 78,
    timeliness: 82,
    geographicRelevance: 82,
    topicRelevance: 76,
    reproducibility: 76,
    automationEase: 62,
    licensingNote: "Use for storm, home-repair, and household preparedness matches only when direct URLs are available.",
    failureModes: ["Regional inventory drift", "Feed reliability varies"],
    recommendedUse: "match-products",
  },
  {
    id: "rei",
    name: "REI product feed",
    category: "commerce",
    hosts: ["rei.com"],
    trustLevel: 78,
    timeliness: 80,
    geographicRelevance: 78,
    topicRelevance: 76,
    reproducibility: 76,
    automationEase: 60,
    licensingNote: "Use for outdoor safety/preparedness categories only when direct product URLs are available.",
    failureModes: ["Category scope is narrow", "Inventory drift"],
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

export const ALLOWED_DISCOVERY_SOURCE_HOSTS = new Set([
  "api.gdeltproject.org",
  "gdeltproject.org",
  "news.google.com",
]);

export const ALLOWED_OFFICIAL_SOURCE_HOSTS = new Set([
  "airnow.gov",
  "api.fda.gov",
  "api.weather.gov",
  "cdc.gov",
  "cpsc.gov",
  "epa.gov",
  "fda.gov",
  "fema.gov",
  "health.hawaii.gov",
  "nhc.noaa.gov",
  "noaa.gov",
  "open.fda.gov",
  "ready.gov",
  "saferproducts.gov",
  "weather.gov",
]);

export const ALLOWED_COMMERCE_HOSTS = new Set([
  "amazon.com",
  "bestbuy.com",
  "homedepot.com",
  "rei.com",
  "target.com",
  "walmart.com",
]);

const WEATHER_STATES = new Set<WeatherState>([
  "sunny",
  "cloudy",
  "drizzle",
  "light rain",
  "rain",
  "heavy rain",
  "monsoon",
  "tornado",
  "hurricanes",
  "neutral",
]);

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

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function hostMatches(host: string, allowedHost: string): boolean {
  return host === allowedHost || host.endsWith(`.${allowedHost}`);
}

export function isAllowedSourceHost(host: string): boolean {
  return [...ALLOWED_OFFICIAL_SOURCE_HOSTS, ...ALLOWED_DISCOVERY_SOURCE_HOSTS].some((allowedHost) =>
    hostMatches(host, allowedHost),
  );
}

export function isAllowedCommerceHost(host: string): boolean {
  return [...ALLOWED_COMMERCE_HOSTS].some((allowedHost) => hostMatches(host, allowedHost));
}

export function isAllowedEventSourceUrl(value: string): boolean {
  const host = getHost(value);
  return isHttpsUrl(value) && Boolean(host) && isAllowedSourceHost(host);
}

export function isAllowedFetchUrl(
  value: string,
  allowedHosts: Set<string> = new Set([...ALLOWED_OFFICIAL_SOURCE_HOSTS, ...ALLOWED_DISCOVERY_SOURCE_HOSTS]),
): boolean {
  const host = getHost(value);
  return isHttpsUrl(value) && Boolean(host) && [...allowedHosts].some((allowedHost) => hostMatches(host, allowedHost));
}

export function isRejectedRedirect(originalUrl: string, resolvedUrl: string): boolean {
  if (!isAllowedFetchUrl(originalUrl) || !isAllowedFetchUrl(resolvedUrl)) return true;
  return originalUrl !== resolvedUrl;
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

export function getSourceTrailLabel(entry: SourceTrailEntry): string {
  return entry.label || entry.name || getHost(entry.url) || "Source";
}

export function getSourceTypeForUrl(url: string): NormalizedEventSourceType {
  const profile = getSourceProfileForUrl(url);
  if (!profile) return "discovery";
  if (profile.category === "official") return "official";
  if (profile.category === "trend-signal" || profile.recommendedUse === "discover") return "discovery";
  return "corroboration";
}

export function getEventSourceType(event: CurrentEventQualityLike): NormalizedEventSourceType {
  return event.sourceType ?? getSourceTypeForUrl(event.sourceUrl);
}

function uniqueTrailEntries(entries: SourceTrailEntry[]): SourceTrailEntry[] {
  return Array.from(new Map(entries.filter((entry) => entry.url).map((entry) => [entry.url, entry] as const)).values());
}

export function getNormalizedSourceTrail(event: CurrentEventQualityLike): SourceTrailEntry[] {
  const sourceEntry: SourceTrailEntry = {
    label: event.sourceName || event.publisher || getHost(event.sourceUrl) || "Primary source",
    name: event.sourceName || event.publisher || getHost(event.sourceUrl) || "Primary source",
    url: event.sourceUrl,
    role: "event-source",
    sourceType: getEventSourceType(event),
    publisher: event.publisher || event.sourceName,
  };

  return uniqueTrailEntries([sourceEntry, ...(event.sourceTrail ?? [])]).map((entry) => ({
    ...entry,
    name: getSourceTrailLabel(entry),
    label: getSourceTrailLabel(entry),
    sourceType: entry.sourceType ?? getSourceTypeForUrl(entry.url),
  }));
}

export function hasValidSourceTrail(event: CurrentEventQualityLike): boolean {
  const rawTrailUrls = (event.sourceTrail ?? []).map((entry) => entry.url);
  if (new Set(rawTrailUrls).size !== rawTrailUrls.length) return false;

  const trail = getNormalizedSourceTrail(event);
  if (trail.length < 1 || trail.length > 8) return false;
  if (!isAllowedEventSourceUrl(event.sourceUrl)) return false;

  const seen = new Set<string>();
  for (const entry of trail) {
    if (!isAllowedEventSourceUrl(entry.url)) return false;
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
  }

  return trail.some((entry) => entry.url === event.sourceUrl || entry.role === "event-source");
}

export function hasOfficialSource(event: CurrentEventQualityLike): boolean {
  return getNormalizedSourceTrail(event).some((entry) => {
    const profile = getSourceProfileForUrl(entry.url);
    return profile?.category === "official" || entry.sourceType === "official";
  });
}

export function requiresCorroboration(event: CurrentEventQualityLike): boolean {
  const sourceProfile = getSourceProfileForUrl(event.sourceUrl);
  return Boolean(
    event.corroborationRequired ||
      getEventSourceType(event) !== "official" ||
      sourceProfile?.recommendedUse === "discover" ||
      (sourceProfile?.trustLevel ?? 0) < EVENT_SCORE_THRESHOLDS.sourceQuality,
  );
}

export function passesCorroborationRules(event: CurrentEventQualityLike): boolean {
  if (!hasValidSourceTrail(event) || !hasOfficialSource(event)) return false;
  if (!requiresCorroboration(event)) return true;

  const validTrail = getNormalizedSourceTrail(event).filter((entry) => isAllowedEventSourceUrl(entry.url));
  const officialCount = validTrail.filter((entry) => entry.sourceType === "official").length;
  const corroborationCount = validTrail.filter((entry) => entry.sourceType === "corroboration").length;
  const discoveryCount = validTrail.filter((entry) => entry.sourceType === "discovery").length;

  return officialCount >= 1 && validTrail.length >= 2 && (corroborationCount >= 1 || discoveryCount >= 1);
}

function hasUnsafeClaimText(value: string): boolean {
  const lower = value.toLowerCase();
  return unsafeClaimTerms.some((term) => lower.includes(term));
}

export function scoreDateFreshness(sourcePublishedAt: string, now = new Date()): number {
  const published = new Date(`${sourcePublishedAt}T00:00:00.000Z`);
  if (Number.isNaN(published.getTime())) return 0;
  const ageDays = Math.max(0, (now.getTime() - published.getTime()) / 86_400_000);
  if (ageDays <= 7) return 96;
  if (ageDays <= 21) return 88;
  if (ageDays <= 45) return 72;
  if (ageDays <= 90) return 58;
  return 35;
}

export function getEventPublishedAt(event: CurrentEventQualityLike): string {
  return event.publishedAt || event.sourcePublishedAt;
}

export function isStaleEvent(event: CurrentEventQualityLike, now = new Date()): boolean {
  const timelinessScore = event.timelinessScore ?? scoreDateFreshness(getEventPublishedAt(event), now);
  return timelinessScore < EVENT_SCORE_THRESHOLDS.timeliness;
}

const stopWords = new Set([
  "about",
  "after",
  "alert",
  "also",
  "and",
  "are",
  "before",
  "can",
  "direct",
  "during",
  "event",
  "for",
  "from",
  "guide",
  "helps",
  "into",
  "local",
  "more",
  "need",
  "official",
  "only",
  "product",
  "products",
  "service",
  "shop",
  "source",
  "step",
  "the",
  "this",
  "use",
  "users",
  "when",
  "with",
]);

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  );
}

function sharedTokenCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const token of a) {
    if (b.has(token)) count += 1;
  }
  return count;
}

function eventTokenText(event: CurrentEventQualityLike): string {
  return [
    event.topic,
    event.title,
    event.summary,
    event.whyNow,
    event.matchingRationale ?? "",
    Array.isArray(event.geography) ? event.geography.join(" ") : event.geography ?? "",
    event.responseTags?.join(" ") ?? "",
  ].join(" ");
}

function recommendationTokenText(recommendation: RecommendationQualityLike): string {
  return [
    recommendation.label ?? "",
    recommendation.title,
    recommendation.category ?? "",
    recommendation.matchReason,
    recommendation.reason ?? "",
    recommendation.whyItHelps ?? "",
  ].join(" ");
}

export function isRecommendationRelatedToEvent(
  event: CurrentEventQualityLike,
  recommendation: RecommendationQualityLike,
): boolean {
  const eventTrailUrls = new Set(getNormalizedSourceTrail(event).map((entry) => entry.url));
  const recTrailUrls = new Set([
    recommendation.sourceUrl,
    ...(recommendation.sourceTrail ?? []).map((entry) => entry.url),
  ]);
  const sharesSource = [...recTrailUrls].some((url) => eventTrailUrls.has(url));
  if (sharesSource) return true;

  const eventTokens = tokenize(eventTokenText(event));
  const recommendationTokens = tokenize(recommendationTokenText(recommendation));
  return sharedTokenCount(eventTokens, recommendationTokens) >= 2;
}

export function hasAllowedRecommendationDestination(recommendation: RecommendationQualityLike): boolean {
  const destination = recommendation.destinationUrl || recommendation.shoppingUrl;
  if (!isHttpsUrl(destination)) return false;

  const host = getHost(destination);
  if (!host) return false;

  if (recommendation.affiliate) {
    if (!isAllowedCommerceHost(host)) return false;
    if (hostMatches(host, "amazon.com")) {
      const url = new URL(destination);
      const isDirectProduct = /^\/(dp|gp\/product)\//.test(url.pathname);
      const isSearch = url.pathname === "/s" && recommendation.destinationType === "affiliate-search";
      return Boolean(url.searchParams.get("tag")) && (isDirectProduct || isSearch);
    }
    return recommendation.destinationType === "direct-product";
  }

  return isAllowedEventSourceUrl(destination) || isAllowedCommerceHost(host);
}

export function scoreRecommendationMatch(recommendation: RecommendationQualityLike): number {
  if (Number.isInteger(recommendation.matchScore)) return clampScore(recommendation.matchScore ?? 0);
  if (Number.isInteger(recommendation.relevanceScore)) return clampScore(recommendation.relevanceScore ?? 0);

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

export function getPublishableRecommendationsForEvent<T extends RecommendationQualityLike>(
  event: CurrentEventQualityLike,
  recommendations: T[] = event.recommendations as T[],
): T[] {
  return recommendations
    .map((recommendation) => ({
      recommendation,
      score: scoreRecommendationMatch(recommendation),
    }))
    .filter(({ recommendation, score }) => {
      if (score < EVENT_SCORE_THRESHOLDS.recommendation) return false;
      if ((recommendation.safetyScore ?? 0) < 80) return false;
      if (hasUnsafeClaimText(`${recommendation.title} ${recommendation.matchReason} ${recommendation.whyItHelps ?? ""}`)) {
        return false;
      }
      if (!isAllowedEventSourceUrl(recommendation.sourceUrl)) return false;
      if (!hasAllowedRecommendationDestination(recommendation)) return false;
      return isRecommendationRelatedToEvent(event, recommendation);
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, EVENT_SCORE_THRESHOLDS.maximumRecommendations)
    .map(({ recommendation }) => recommendation);
}

export function scoreCurrentEvent(event: CurrentEventQualityLike): number {
  const sourceProfile = getSourceProfileForUrl(event.sourceUrl);
  const sourceQualityScore = event.sourceQualityScore ?? sourceProfile?.trustLevel ?? 0;
  const legitimacyScore = event.legitimacyScore ?? (sourceProfile ? sourceProfile.reproducibility : 0);
  const timelinessScore = event.timelinessScore ?? scoreDateFreshness(getEventPublishedAt(event));
  const safetyScore = event.safetyScore ?? 70;
  const recommendationScores = getPublishableRecommendationsForEvent(event).map(scoreRecommendationMatch);
  const recommendationAverage =
    recommendationScores.length > 0
      ? recommendationScores.reduce((sum, score) => sum + score, 0) / recommendationScores.length
      : 0;
  const unsafePenalty = hasUnsafeClaimText(`${event.title} ${event.summary} ${event.whyNow}`) ? 30 : 0;
  const sourceTrailPenalty = hasValidSourceTrail(event) ? 0 : 35;
  const corroborationPenalty = passesCorroborationRules(event) ? 0 : 25;
  const stalePenalty = isStaleEvent(event) ? 20 : 0;

  return clampScore(
    sourceQualityScore * 0.23 +
      legitimacyScore * 0.2 +
      timelinessScore * 0.15 +
      safetyScore * 0.2 +
      recommendationAverage * 0.22 -
      unsafePenalty -
      sourceTrailPenalty -
      corroborationPenalty -
      stalePenalty,
  );
}

function hasWeatherSourceProof(event: CurrentEventQualityLike): boolean {
  if (event.topic.toLowerCase().includes("weather")) return true;
  return getNormalizedSourceTrail(event).some((entry) => {
    const host = getHost(entry.url);
    return (
      hostMatches(host, "weather.gov") ||
      hostMatches(host, "api.weather.gov") ||
      hostMatches(host, "noaa.gov") ||
      hostMatches(host, "nhc.noaa.gov")
    );
  });
}

export function mapWeatherState(event: CurrentEventQualityLike): WeatherState {
  if (!hasWeatherSourceProof(event)) return "neutral";
  if (event.weatherState && WEATHER_STATES.has(event.weatherState)) return event.weatherState;

  const text = `${event.topic} ${event.title} ${event.summary} ${event.responseTags?.join(" ") ?? ""}`.toLowerCase();
  if (/\b(hurricane|tropical storm|cyclone)\b/.test(text)) return "hurricanes";
  if (/\b(tornado|twister)\b/.test(text)) return "tornado";
  if (/\bmonsoon\b/.test(text)) return "monsoon";
  if (/\b(flash flood|flooding|heavy rain|atmospheric river)\b/.test(text)) return "heavy rain";
  if (/\b(light rain|showers)\b/.test(text)) return "light rain";
  if (/\bdrizzle\b/.test(text)) return "drizzle";
  if (/\brain\b/.test(text)) return "rain";
  if (/\b(cloud|cloudy|overcast)\b/.test(text)) return "cloudy";
  if (/\b(sunny|heat|extreme heat)\b/.test(text)) return "sunny";
  return "neutral";
}

export function getWeatherPresentation(
  weatherState: WeatherState,
  options: { reducedMotion?: boolean } = {},
): { state: WeatherState; label: string; className: string; effects: string[] } {
  const state = WEATHER_STATES.has(weatherState) ? weatherState : "neutral";
  const effectsByState: Record<WeatherState, string[]> = {
    sunny: ["weather-mask-sun", "weather-mask-warm"],
    cloudy: ["weather-mask-cloud", "weather-mask-mist"],
    drizzle: ["weather-mask-drizzle", "weather-mask-mist"],
    "light rain": ["weather-mask-rain", "weather-mask-mist"],
    rain: ["weather-mask-rain", "weather-mask-cool"],
    "heavy rain": ["weather-mask-heavy-rain", "weather-mask-cool", "weather-mask-mist"],
    monsoon: ["weather-mask-heavy-rain", "weather-mask-tropical", "weather-mask-cool"],
    tornado: ["weather-mask-tornado", "weather-mask-mist", "weather-mask-warm"],
    hurricanes: ["weather-mask-hurricane", "weather-mask-cool", "weather-mask-mist"],
    neutral: [],
  };
  const labels: Record<WeatherState, string> = {
    sunny: "Sunny conditions",
    cloudy: "Cloudy conditions",
    drizzle: "Drizzle conditions",
    "light rain": "Light rain conditions",
    rain: "Rain conditions",
    "heavy rain": "Heavy rain conditions",
    monsoon: "Monsoon conditions",
    tornado: "Tornado conditions",
    hurricanes: "Hurricane readiness",
    neutral: "Neutral background",
  };

  return {
    state,
    label: labels[state],
    className: state === "neutral" ? "bg-surface" : `weather-aware-panel weather-${state.replaceAll(" ", "-")}`,
    effects: options.reducedMotion ? [] : effectsByState[state].slice(0, 3),
  };
}

export function getCurrentEventDiagnostics(event: CurrentEventQualityLike): EventDiagnostics {
  const editorialStrength = clampScore(event.editorialStrength ?? event.confidence ?? scoreCurrentEvent(event));
  const eligibleRecommendations = getPublishableRecommendationsForEvent(event);
  const reasons: string[] = [];
  const rejectionReasons: string[] = [];
  const sourceQualityScore = event.sourceQualityScore ?? getSourceProfileForUrl(event.sourceUrl)?.trustLevel ?? 0;
  const legitimacyScore = event.legitimacyScore ?? 0;
  const timelinessScore = event.timelinessScore ?? scoreDateFreshness(getEventPublishedAt(event));
  const safetyScore = event.safetyScore ?? 0;
  const confidence = event.confidence ?? editorialStrength;
  const sourceTrailValid = hasValidSourceTrail(event);
  const sourceType = getEventSourceType(event);
  const weatherState = mapWeatherState(event);

  if (sourceQualityScore >= EVENT_SCORE_THRESHOLDS.sourceQuality) {
    reasons.push("Primary source is allowlisted and high-trust.");
  } else {
    rejectionReasons.push("Primary source is weak or not allowlisted.");
  }
  if (legitimacyScore >= EVENT_SCORE_THRESHOLDS.legitimacy) {
    reasons.push("Event is specific, dated, and reproducible from the source trail.");
  } else {
    rejectionReasons.push("Legitimacy score is below the editorial gate.");
  }
  if (confidence < EVENT_SCORE_THRESHOLDS.confidence) rejectionReasons.push("Confidence is below the homepage gate.");
  if (timelinessScore < EVENT_SCORE_THRESHOLDS.timeliness || isStaleEvent(event)) {
    rejectionReasons.push("Event is stale for current-event placement.");
  }
  if (safetyScore < EVENT_SCORE_THRESHOLDS.safety) rejectionReasons.push("Safety score is below the homepage gate.");
  if (!sourceTrailValid) rejectionReasons.push("Source trail is missing, duplicated, or not allowlisted.");
  if (!passesCorroborationRules(event)) {
    rejectionReasons.push("Official-source or corroboration rules were not satisfied.");
  }
  if (eligibleRecommendations.length >= EVENT_SCORE_THRESHOLDS.minimumRecommendations) {
    reasons.push("Recommendations passed relevance and safety gates.");
  } else {
    rejectionReasons.push("Fewer than three useful recommendations passed the gates.");
  }
  if (event.matchingRationale) reasons.push(event.matchingRationale);

  const homepageEligible =
    event.status === "active" &&
    confidence >= EVENT_SCORE_THRESHOLDS.confidence &&
    editorialStrength >= EVENT_SCORE_THRESHOLDS.homepage &&
    sourceQualityScore >= EVENT_SCORE_THRESHOLDS.sourceQuality &&
    legitimacyScore >= EVENT_SCORE_THRESHOLDS.legitimacy &&
    timelinessScore >= EVENT_SCORE_THRESHOLDS.timeliness &&
    safetyScore >= EVENT_SCORE_THRESHOLDS.safety &&
    sourceTrailValid &&
    passesCorroborationRules(event) &&
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
    rejectionReasons: rejectionReasons.slice(0, 6),
    recommendationCount: eligibleRecommendations.length,
    sourceTrailValid,
    sourceType,
    weatherState,
  };
}

export function rankCurrentEvents<T extends CurrentEventQualityLike>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const aDiagnostics = getCurrentEventDiagnostics(a);
    const bDiagnostics = getCurrentEventDiagnostics(b);
    if (aDiagnostics.homepageEligible !== bDiagnostics.homepageEligible) {
      return aDiagnostics.homepageEligible ? -1 : 1;
    }
    const aLeadRank = scoreCurrentEventLeadRank(a);
    const bLeadRank = scoreCurrentEventLeadRank(b);
    if (aLeadRank !== bLeadRank) {
      return bLeadRank - aLeadRank;
    }
    if (aDiagnostics.editorialStrength !== bDiagnostics.editorialStrength) {
      return bDiagnostics.editorialStrength - aDiagnostics.editorialStrength;
    }
    return a.priority - b.priority;
  });
}

export function scoreCurrentEventLeadRank(event: CurrentEventQualityLike, now = new Date()): number {
  const diagnostics = getCurrentEventDiagnostics(event);
  const confidence = clampScore(event.confidence ?? diagnostics.editorialStrength);
  const timeliness = clampScore(event.timelinessScore ?? scoreDateFreshness(getEventPublishedAt(event), now));
  const verifiedFreshness = event.lastVerifiedAt ? scoreDateFreshness(event.lastVerifiedAt, now) : timeliness;
  const recommendationCoverage = clampScore(
    (diagnostics.recommendationCount / EVENT_SCORE_THRESHOLDS.maximumRecommendations) * 100,
  );
  const priorityScore = clampScore(104 - Math.max(1, event.priority) * 4);

  return clampScore(
    diagnostics.editorialStrength * 0.38 +
      confidence * 0.18 +
      timeliness * 0.16 +
      verifiedFreshness * 0.16 +
      recommendationCoverage * 0.07 +
      priorityScore * 0.05,
  );
}

export function normalizeCurrentEvent(event: CurrentEventQualityLike): CurrentEvent {
  const sourceQualityScore = event.sourceQualityScore ?? getSourceProfileForUrl(event.sourceUrl)?.trustLevel ?? 0;
  const legitimacyScore = event.legitimacyScore ?? 0;
  const timelinessScore = event.timelinessScore ?? scoreDateFreshness(getEventPublishedAt(event));
  const safetyScore = event.safetyScore ?? 0;
  const editorialStrength = clampScore(event.editorialStrength ?? event.confidence ?? scoreCurrentEvent(event));
  const geography = Array.isArray(event.geography) ? event.geography.join(", ") : event.geography;

  return {
    id: event.id ?? event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    topic: event.topic,
    title: event.title,
    summary: event.summary,
    sourceUrl: event.sourceUrl,
    publisher: event.publisher || event.sourceName || getHost(event.sourceUrl) || "Unknown publisher",
    sourceType: getEventSourceType(event),
    geography,
    publishedAt: getEventPublishedAt(event),
    confidence: clampScore(event.confidence ?? editorialStrength),
    legitimacyScore: clampScore(legitimacyScore),
    timelinessScore: clampScore(timelinessScore),
    safetyScore: clampScore(safetyScore),
    sourceQualityScore: clampScore(sourceQualityScore),
    editorialStrength,
    sourceTrail: getNormalizedSourceTrail(event).map((entry) => ({
      label: getSourceTrailLabel(entry),
      url: entry.url,
    })),
    matchingRationale: event.matchingRationale ?? "",
  };
}

export function normalizeRecommendation(recommendation: RecommendationQualityLike): Recommendation {
  const score = scoreRecommendationMatch(recommendation);
  return {
    id: recommendation.id ?? recommendation.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    label: recommendation.label || recommendation.title,
    category: recommendation.kind,
    reason: recommendation.reason || recommendation.matchReason,
    destinationUrl: recommendation.destinationUrl || recommendation.shoppingUrl,
    affiliateLabel: recommendation.affiliateLabel ?? (recommendation.affiliate ? "Affiliate link" : undefined),
    sourceTrail: (recommendation.sourceTrail ?? [
      { label: recommendation.sourceUrl, url: recommendation.sourceUrl, role: "product-evidence" as const },
    ]).map((entry) => ({
      label: getSourceTrailLabel(entry),
      url: entry.url,
    })),
    matchScore: score,
    safetyScore: clampScore(recommendation.safetyScore ?? 0),
    relevanceScore: clampScore(recommendation.relevanceScore ?? recommendation.usefulnessScore ?? score),
  };
}

export function getCurrentEventPipelineIssues(event: CurrentEventQualityLike): PipelineIssue[] {
  const issues: PipelineIssue[] = [];
  const diagnostics = getCurrentEventDiagnostics(event);
  const sourceQualityScore = event.sourceQualityScore ?? getSourceProfileForUrl(event.sourceUrl)?.trustLevel ?? 0;
  const confidence = event.confidence ?? diagnostics.editorialStrength;

  if (sourceQualityScore < EVENT_SCORE_THRESHOLDS.sourceQuality) {
    issues.push({ code: "weak-source", message: "Primary event source is weak or not allowlisted." });
  }
  if (!diagnostics.sourceTrailValid) {
    issues.push({ code: "missing-source-trail", message: "Event does not have a valid, allowlisted source trail." });
  }
  if (isStaleEvent(event)) {
    issues.push({ code: "stale-event", message: "Event is too old for current-event placement." });
  }
  if (!passesCorroborationRules(event)) {
    issues.push({ code: "missing-corroboration", message: "Official-source preference or corroboration rule failed." });
  }
  if (confidence < EVENT_SCORE_THRESHOLDS.confidence) {
    issues.push({ code: "low-confidence", message: "Confidence is below the homepage threshold." });
  }
  if (diagnostics.editorialStrength < EVENT_SCORE_THRESHOLDS.homepage) {
    issues.push({ code: "low-editorial-strength", message: "Editorial strength is below the homepage threshold." });
  }
  if ((event.safetyScore ?? 0) < EVENT_SCORE_THRESHOLDS.safety || hasUnsafeClaimText(`${event.title} ${event.summary}`)) {
    issues.push({ code: "unsafe-event", message: "Event copy or safety score failed the safety gate." });
  }

  const publishable = getPublishableRecommendationsForEvent(event);
  if (publishable.length < EVENT_SCORE_THRESHOLDS.minimumRecommendations) {
    issues.push({ code: "too-few-recommendations", message: "Fewer than three recommendations passed relevance and safety gates." });
  }

  return issues;
}

export function runCurrentEventEditorialPipeline<T extends CurrentEventQualityLike>(
  events: T[],
): CurrentEventPipelineResult<T> {
  const rejected: Array<{ event: T; issues: PipelineIssue[] }> = [];
  const published: T[] = [];

  for (const event of rankCurrentEvents(events)) {
    const issues = getCurrentEventPipelineIssues(event);
    if (getCurrentEventDiagnostics(event).homepageEligible && issues.length === 0) {
      published.push(event);
    } else {
      rejected.push({ event, issues });
    }
  }

  return { published, rejected };
}
