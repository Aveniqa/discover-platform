/**
 * Best-effort bridge to the Agent Reach CLI
 * (https://github.com/Panniantong/Agent-Reach, installed with
 * `uv tool install …/releases/download/v1.6.0/agent-reach.zip`).
 *
 * Surfaced uses three of its channels:
 *   - web read       → a candidate's own page text, so Gemini writes from the
 *                      product's words instead of a forum headline
 *   - github read    → stars / last push / licence / archived for repo-hosted items
 *   - youtube search → a walkthrough video for the item page
 *
 * Every helper resolves to null (or []) when the CLI is missing, a channel is
 * down, or a call times out. The pipeline must behave exactly as it did before
 * Agent Reach existed when none of this works.
 */
const { spawn } = require("child_process");

const BIN = process.env.AGENT_REACH_BIN || "agent-reach";

function runAgentReach(args, { timeoutMs = 30000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    let child;
    try {
      child = spawn(BIN, args, { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      resolve(null);
      return;
    }
    let out = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(null);
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.on("error", () => finish(null));
    child.on("close", () => {
      try {
        finish(JSON.parse(out));
      } catch {
        finish(null);
      }
    });
  });
}

let availability;
function agentReachAvailable() {
  availability ??= runAgentReach(["version"], { timeoutMs: 15000 }).then((r) => Boolean(r && r.ok));
  return availability;
}

function firstItem(res) {
  return res && res.ok && Array.isArray(res.items) && res.items[0] ? res.items[0] : null;
}

function cleanText(text, maxChars) {
  return String(text || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // markdown images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → their text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`|=~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

/** The page's own title and opening text, or null. */
async function readPage(url, { timeoutMs = 25000, maxChars = 700 } = {}) {
  const item = firstItem(await runAgentReach(["read", url], { timeoutMs }));
  if (!item) return null;
  const title = cleanText(item.title, 160);
  const text = cleanText(item.text, maxChars);
  return title || text ? { title, text } : null;
}

// github.com/<owner>/<repo> paths that are product pages, not repositories.
const GITHUB_RESERVED_OWNERS = new Set([
  "about", "apps", "collections", "enterprise", "explore", "features", "login",
  "marketplace", "orgs", "pricing", "settings", "site", "sponsors", "topics", "trending",
]);

function githubRepoFromUrl(url) {
  const m = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#]|$)/i.exec(url || "");
  if (!m || GITHUB_RESERVED_OWNERS.has(m[1].toLowerCase())) return null;
  return `${m[1]}/${m[2]}`;
}

/** Live repo stats for a github.com URL, or null. */
async function githubRepoStats(url, { timeoutMs = 25000 } = {}) {
  const repo = githubRepoFromUrl(url);
  if (!repo) return null;
  const item = firstItem(await runAgentReach(["read", `https://github.com/${repo}`], { timeoutMs }));
  const raw = item && item.raw;
  const stars = raw ? Number(raw.stargazers_count) : NaN;
  if (!Number.isFinite(stars)) return null;
  const stats = { repo, stars, forks: Number(raw.forks_count) || 0, archived: Boolean(raw.archived) };
  if (raw.pushed_at) stats.pushedAt = String(raw.pushed_at).slice(0, 10);
  if (raw.license && raw.license !== "NOASSERTION" && raw.license !== "Other") stats.license = String(raw.license);
  return stats;
}

/** YouTube search results, best first. */
async function youtubeSearch(query, { limit = 5, timeoutMs = 45000 } = {}) {
  const res = await runAgentReach(["youtube", "search", query, "--limit", String(limit)], { timeoutMs });
  if (!res || !res.ok || !Array.isArray(res.items)) return [];
  return res.items
    .map((item) => {
      const raw = item.raw || {};
      const views = Number(raw.view_count);
      const durationSec = Number(raw.duration);
      return {
        id: String(raw.id || ""),
        title: String(item.title || ""),
        channel: String(item.author || ""),
        text: String(item.text || ""),
        views: Number.isFinite(views) ? views : null,
        durationSec: Number.isFinite(durationSec) ? durationSec : null,
      };
    })
    .filter((v) => /^[\w-]{11}$/.test(v.id));
}

/** Map with bounded concurrency — Agent Reach shells out per call. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

module.exports = {
  agentReachAvailable,
  readPage,
  githubRepoFromUrl,
  githubRepoStats,
  youtubeSearch,
  mapLimit,
};
