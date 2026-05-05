#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeJsonSafe } from "./lib/write-safe.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const EVENTS_FILE = join(ROOT, "automated-content", "current-events.json");
const API_KEY = process.env.YOUTUBE_API_KEY;
const USER_AGENT = "SurfacedVideoEnrichment/1.0 (https://surfaced-x.pages.dev/contact)";

function setGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`);
}

function scoreVideo(event, item) {
  const snippet = item.snippet || {};
  const channel = String(snippet.channelTitle || "").toLowerCase();
  const title = String(snippet.title || "").toLowerCase();
  const publisher = String(event.publisher || event.sourceName || "").toLowerCase();
  const sourceName = String(event.sourceName || "").toLowerCase();
  const topicTokens = String(event.topic || "").toLowerCase().split(/[.\s-]+/).filter((token) => token.length > 3);
  let score = 0;
  if (publisher && channel.includes(publisher.replace(/\s+(newsroom|api|release)$/i, ""))) score += 45;
  if (sourceName && channel.includes(sourceName.replace(/\s+(newsroom|api|release)$/i, ""))) score += 35;
  if (/\b(cdc|noaa|national weather service|fda|cpsc|epa|fema)\b/.test(channel)) score += 35;
  for (const token of topicTokens) {
    if (title.includes(token)) score += 5;
  }
  if (title.includes("official")) score += 5;
  return score;
}

async function searchVideo(event) {
  const query = `${event.publisher || event.sourceName} ${event.title}`;
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("type", "video");
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("q", query);
  url.searchParams.set("key", API_KEY);
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    redirect: "error",
  });
  if (!response.ok) throw new Error(`YouTube HTTP ${response.status}`);
  const payload = await response.json();
  const ranked = (payload.items || [])
    .map((item) => ({ item, score: scoreVideo(event, item) }))
    .sort((a, b) => b.score - a.score);
  const match = ranked.find(({ item, score }) => score >= 45 && item.id?.videoId);
  if (!match) return null;
  return {
    youtubeVideoId: match.item.id.videoId,
    youtubeVideoTitle: match.item.snippet.title,
    youtubeChannelTitle: match.item.snippet.channelTitle,
    youtubeVideoPublishedAt: String(match.item.snippet.publishedAt || "").slice(0, 10),
  };
}

async function main() {
  if (!API_KEY) {
    console.log("YOUTUBE_API_KEY is not set; skipping current-event video enrichment.");
    setGithubOutput({ changed: "false" });
    return;
  }
  if (!existsSync(EVENTS_FILE)) {
    throw new Error("automated-content/current-events.json is missing");
  }

  const events = JSON.parse(readFileSync(EVENTS_FILE, "utf8"));
  let changed = false;

  for (const event of events) {
    if (event.status !== "active" || event.youtubeVideoId) continue;
    try {
      const video = await searchVideo(event);
      if (!video) continue;
      Object.assign(event, video);
      changed = true;
      console.log(`Matched YouTube video for ${event.id}: ${video.youtubeVideoTitle}`);
    } catch (error) {
      console.warn(`Video lookup skipped for ${event.id}: ${error.message}`);
    }
  }

  if (changed) writeJsonSafe(EVENTS_FILE, events);
  setGithubOutput({ changed: changed ? "true" : "false" });
  console.log(changed ? "Current-event videos enriched." : "No current-event videos changed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
