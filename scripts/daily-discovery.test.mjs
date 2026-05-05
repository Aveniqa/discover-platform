import assert from "node:assert/strict";
import test from "node:test";
import {
  mapWeatherStateFromText,
  rankReviewRecords,
  rejectionReasons,
  scoreCandidate,
} from "./daily-discovery.mjs";

function candidate(overrides = {}) {
  return {
    id: "nws-test",
    topic: "weather.tornado-warning",
    title: "Tornado Warning issued for test county",
    summary: "The National Weather Service issued a warning with shelter guidance.",
    sourceName: "National Weather Service",
    sourceUrl: "https://api.weather.gov/alerts/active",
    sourceType: "official",
    publisher: "weather.gov",
    sourcePublishedAt: "2026-05-05",
    lastVerifiedAt: "2026-05-05",
    geography: ["US"],
    sourceQualityScore: 95,
    legitimacyScore: 94,
    timelinessScore: 98,
    safetyScore: 94,
    confidence: 93,
    commerceRelevanceScore: 88,
    weatherState: "tornado",
    responseTags: ["weather", "tornado", "preparedness"],
    sourceTrail: [
      {
        name: "National Weather Service",
        url: "https://api.weather.gov/alerts/active",
        role: "event-source",
        sourceType: "official",
      },
    ],
    ...overrides,
  };
}

test("daily discovery scores official fresh safety candidates as review-ready", () => {
  const official = candidate();
  const score = scoreCandidate(official);
  assert.ok(score >= 82);
  assert.deepEqual(rejectionReasons(official, score), []);
});

test("daily discovery fails closed on discovery-only signals", () => {
  const discoveryOnly = candidate({
    sourceType: "discovery",
    sourceQualityScore: 72,
    confidence: 62,
    sourceTrail: [
      {
        name: "GDELT",
        url: "https://api.gdeltproject.org/api/v2/doc/doc",
        role: "signal",
        sourceType: "discovery",
      },
    ],
  });
  const reasons = rejectionReasons(discoveryOnly, scoreCandidate(discoveryOnly));
  assert.ok(reasons.some((reason) => reason.includes("official source")));
  assert.ok(reasons.some((reason) => reason.includes("Confidence")));
});

test("weather state mapping follows NWS-style event text", () => {
  assert.equal(mapWeatherStateFromText("weather.alert", "Flash Flood Warning", "Heavy rain is causing flooding."), "heavy rain");
  assert.equal(mapWeatherStateFromText("weather.alert", "Tornado Warning", "Take shelter now."), "tornado");
  assert.equal(mapWeatherStateFromText("health.alert", "Food recall", "Check affected lots."), "neutral");
});

test("review records sort review-ready candidates above rejected signals", () => {
  const ranked = rankReviewRecords([
    { id: "rejected", status: "rejected", candidateScore: 99, eventDraft: { sourcePublishedAt: "2026-05-05" } },
    { id: "ready", status: "review-ready", candidateScore: 83, eventDraft: { sourcePublishedAt: "2026-05-04" } },
  ]);
  assert.equal(ranked[0].id, "ready");
});
