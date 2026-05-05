import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentEventDiagnostics,
  getCurrentEventPipelineIssues,
  getPublishableRecommendationsForEvent,
  getWeatherPresentation,
  isAllowedEventSourceUrl,
  isRejectedRedirect,
  mapWeatherState,
  type CurrentEventQualityLike,
  type RecommendationQualityLike,
} from "../src/lib/current-event-intelligence.ts";

function recommendation(overrides: Partial<RecommendationQualityLike> = {}): RecommendationQualityLike {
  return {
    id: "epa-registered-repellent",
    title: "EPA-registered tick repellent",
    kind: "product",
    category: "Outdoor prevention",
    matchReason: "CDC recommends EPA-registered repellents for tick-bite prevention before outdoor exposure.",
    whyItHelps: "Repellent is directly relevant to tick prevention in grassy or wooded areas.",
    sourceUrl: "https://www.epa.gov/insect-repellents/find-repellent-right-you",
    shoppingUrl: "https://www.amazon.com/s?k=EPA+registered+tick+repellent&tag=vaultvibe-20",
    destinationType: "affiliate-search",
    destinationJustification: "Category-level prevention item until an exact direct product URL is verified.",
    affiliate: true,
    usefulnessScore: 94,
    buyerIntentScore: 86,
    safetyScore: 92,
    availabilityScore: 84,
    neutralityScore: 86,
    misleadingRiskScore: 92,
    sourceTrail: [
      {
        label: "EPA repellent finder",
        url: "https://www.epa.gov/insect-repellents/find-repellent-right-you",
        role: "product-evidence",
      },
    ],
    ...overrides,
  };
}

function event(overrides: Partial<CurrentEventQualityLike> = {}): CurrentEventQualityLike {
  return {
    id: "tick-season-er-visits-2026",
    status: "active",
    priority: 1,
    topic: "public-health.tick-borne-disease",
    title: "Tick-bite ER visits are higher than usual",
    summary: "CDC reported that emergency room visits for tick bites are higher than normal in many parts of the United States.",
    whyNow: "CDC says weekly ER-visit rates are high for this point in the season.",
    sourceUrl: "https://www.cdc.gov/media/releases/2026/2026-cdc-data-show-weekly-er-visits-for-tick-bites-higher-than-usual.html",
    sourceName: "CDC Newsroom",
    sourceType: "official",
    publisher: "CDC Newsroom",
    sourcePublishedAt: "2026-04-23",
    publishedAt: "2026-04-23",
    lastVerifiedAt: "2026-05-05",
    confidence: 94,
    editorialStrength: 94,
    sourceQualityScore: 96,
    legitimacyScore: 94,
    timelinessScore: 88,
    safetyScore: 95,
    matchingRationale: "The product set maps directly to CDC prevention guidance with source links beside commerce.",
    geography: ["US"],
    responseTags: ["ticks", "repellent", "tick-removal"],
    sourceTrail: [
      {
        label: "CDC newsroom release",
        url: "https://www.cdc.gov/media/releases/2026/2026-cdc-data-show-weekly-er-visits-for-tick-bites-higher-than-usual.html",
        role: "event-source",
        sourceType: "official",
      },
      {
        label: "EPA repellent finder",
        url: "https://www.epa.gov/insect-repellents/find-repellent-right-you",
        role: "product-evidence",
        sourceType: "official",
      },
    ],
    recommendations: [
      recommendation(),
      recommendation({ id: "tick-tweezers", title: "Fine-tipped tick tweezers", matchReason: "CDC tick guidance supports prompt removal with clean fine-tipped tweezers.", sourceUrl: "https://www.cdc.gov/ticks/after-a-tick-bite/", sourceTrail: [{ label: "CDC after-bite guidance", url: "https://www.cdc.gov/ticks/after-a-tick-bite/", role: "guidance" }] }),
      recommendation({ id: "yard-steps", title: "Yard tick-risk reduction", kind: "service", category: "Home prevention", affiliate: false, shoppingUrl: "https://www.cdc.gov/ticks/prevention/index.html", destinationType: "official-guide", buyerIntentScore: 45, sourceUrl: "https://www.cdc.gov/ticks/prevention/index.html", sourceTrail: [{ label: "CDC prevention guidance", url: "https://www.cdc.gov/ticks/prevention/index.html", role: "guidance" }] }),
    ],
    ...overrides,
  };
}

test("source allowlisting accepts official sources and rejects unknown hosts", () => {
  assert.equal(isAllowedEventSourceUrl("https://api.weather.gov/alerts/active"), true);
  assert.equal(isAllowedEventSourceUrl("https://www.saferproducts.gov/RestWebServices/Recall?format=json"), true);
  assert.equal(isAllowedEventSourceUrl("https://example.com/news"), false);
});

test("redirected source fetches are rejected", () => {
  assert.equal(
    isRejectedRedirect("https://api.weather.gov/alerts/active", "https://weather.gov/alerts/active"),
    true,
  );
  assert.equal(
    isRejectedRedirect("https://api.weather.gov/alerts/active", "https://api.weather.gov/alerts/active"),
    false,
  );
});

test("stale or weak events fail closed", () => {
  const weak = event({
    sourceUrl: "https://example.com/unverified-story",
    sourceQualityScore: 20,
    sourceTrail: [],
  });
  const stale = event({
    sourcePublishedAt: "2025-01-01",
    publishedAt: "2025-01-01",
    timelinessScore: 35,
  });

  assert.equal(getCurrentEventDiagnostics(weak).homepageEligible, false);
  assert.equal(getCurrentEventPipelineIssues(weak).some((issue) => issue.code === "weak-source"), true);
  assert.equal(getCurrentEventDiagnostics(stale).homepageEligible, false);
  assert.equal(getCurrentEventPipelineIssues(stale).some((issue) => issue.code === "stale-event"), true);
});

test("unrelated recommendations are filtered even when their individual score is high", () => {
  const unrelated = recommendation({
    id: "gaming-laptop",
    title: "Gaming laptop",
    category: "Electronics",
    matchReason: "A fast laptop is useful for entertainment and general shopping.",
    whyItHelps: "It does not respond to this editorial event.",
    sourceUrl: "https://www.ready.gov/kit",
    sourceTrail: [{ label: "Ready.gov kit guidance", url: "https://www.ready.gov/kit", role: "guidance" }],
    usefulnessScore: 96,
    buyerIntentScore: 96,
    safetyScore: 96,
    availabilityScore: 96,
    neutralityScore: 96,
    misleadingRiskScore: 96,
  });

  assert.equal(getPublishableRecommendationsForEvent(event(), [unrelated]).length, 0);
});

test("confidence threshold blocks homepage publication", () => {
  const diagnostics = getCurrentEventDiagnostics(event({ confidence: 81 }));
  assert.equal(diagnostics.homepageEligible, false);
  assert.equal(diagnostics.rejectionReasons.some((reason) => reason.includes("Confidence")), true);
});

test("weather state maps only with weather proof", () => {
  const weatherEvent = event({
    topic: "weather.hurricane-preparedness",
    title: "Hurricane Preparedness Week is underway",
    summary: "The National Weather Service points households toward hurricane readiness before the season begins.",
    sourceUrl: "https://www.weather.gov/safety/events_calendar",
    sourceName: "National Weather Service",
    sourceType: "official",
    sourceTrail: [
      {
        label: "National Weather Service preparedness calendar",
        url: "https://www.weather.gov/safety/events_calendar",
        role: "event-source",
        sourceType: "official",
      },
    ],
    responseTags: ["hurricane", "alerts"],
    weatherState: "hurricanes",
  });

  assert.equal(mapWeatherState(weatherEvent), "hurricanes");
  assert.equal(mapWeatherState(event({ title: "Cloud storage prices changed", summary: "A non-weather software story mentions clouds in passing." })), "neutral");
});

test("reduced-motion weather presentation removes effects", () => {
  const normal = getWeatherPresentation("hurricanes");
  const reduced = getWeatherPresentation("hurricanes", { reducedMotion: true });
  assert.ok(normal.effects.length > 0);
  assert.ok(normal.effects.length <= 3);
  assert.deepEqual(reduced.effects, []);
});
