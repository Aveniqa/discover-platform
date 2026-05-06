/**
 * Real-world signal sources for daily content generation.
 *
 * Each fetcher returns a small array of seed items — real, currently-trending
 * things — that Gemini then rewrites into Surfaced's schema. This turns the
 * pipeline from "AI-guessed content" into "curated signal, AI-polished copy."
 *
 * All fetchers fail soft: if the API is down or creds are missing, they return []
 * and the caller falls back to pure AI generation.
 *
 * Sources:
 *   - Hacker News  (no auth)   → hidden-gems, future-radar
 *   - GitHub search (optional GITHUB_TOKEN for higher rate limit) → daily-tools
 *   - Product Hunt (requires PRODUCT_HUNT_TOKEN) → products, daily-tools
 */

const HN_TOP = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM = (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
const HN_ALGOLIA = "https://hn.algolia.com/api/v1/search";
const GH_SEARCH = "https://api.github.com/search/repositories";
const PH_GQL = "https://api.producthunt.com/v2/api/graphql";

const UA = "Surfaced-SignalFetcher/1.0 (https://surfaced-x.pages.dev)";
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_BASE_DELAY_MS = 1500;
const API_RETRY_MAX_DELAY_MS = 12000;

async function fetchJson(url, opts = {}) {
  const { timeout = 10000, retries = API_RETRY_ATTEMPTS, label, ...fetchOpts } = opts;
  return withRetry(async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        ...fetchOpts,
        signal: ctrl.signal,
        headers: { "User-Agent": UA, Accept: "application/json", ...(fetchOpts.headers || {}) },
      });
      if (!res.ok) throw httpError(res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }, { label: label || new URL(url).hostname, retries });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpError(status) {
  const error = new Error(`HTTP ${status}`);
  error.status = status;
  return error;
}

function isRetryableStatus(status) {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(Number(status));
}

function isRetryableError(error) {
  const message = error?.message || "";
  return (
    error?.name === "AbortError" ||
    isRetryableStatus(error?.status) ||
    /ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|network/i.test(message)
  );
}

function retryDelayMs(attempt) {
  const exponential = API_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
  return Math.min(exponential, API_RETRY_MAX_DELAY_MS) + Math.floor(Math.random() * 500);
}

async function withRetry(fn, { label = "API request", retries = API_RETRY_ATTEMPTS } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error) || attempt >= retries) throw error;
      const delay = retryDelayMs(attempt);
      console.warn(`  ⚠ ${label} failed (${error.message}); retry ${attempt}/${retries} in ${Math.round(delay / 1000)}s`);
      await sleep(delay);
    }
  }
}

/**
 * Strip tracking parameters (utm_*, ref, fbclid, etc.) from a URL.
 * Leaves legitimate query params intact.
 */
function stripTracking(url) {
  try {
    const u = new URL(url);
    const junk = [];
    for (const key of u.searchParams.keys()) {
      if (
        key.startsWith("utm_") ||
        key === "ref" ||
        key === "ref_src" ||
        key === "ref_url" ||
        key === "referrer" ||
        key === "fbclid" ||
        key === "gclid" ||
        key === "mc_cid" ||
        key === "mc_eid"
      ) {
        junk.push(key);
      }
    }
    junk.forEach((k) => u.searchParams.delete(k));
    return u.toString().replace(/\?$/, "");
  } catch {
    return url;
  }
}

// Note: PH's /r/<id> redirect URLs return 403 to non-browser clients (Cloudflare bot
// protection), so we can't resolve them server-side. Real users clicking the link
// in a browser get redirected to the product's real site — we just strip tracking
// params so the URL looks clean in Surfaced's UI.

/**
 * Hacker News front page — items with external URLs.
 * Great for hidden-gems (Show HN, interesting sites) and future-radar (research).
 */
async function fetchHackerNews({ limit = 10, minScore = 100 } = {}) {
  try {
    const ids = await fetchJson(HN_TOP);
    const top = ids.slice(0, 60);
    const stories = await Promise.all(top.map((id) => fetchJson(HN_ITEM(id)).catch(() => null)));
    return stories
      .filter((s) => s && s.url && s.title && (s.score || 0) >= minScore)
      .filter((s) => !/^https?:\/\/(news\.ycombinator|twitter|x)\.com/.test(s.url))
      .slice(0, limit)
      .map((s) => ({
        title: s.title,
        url: s.url,
        score: s.score,
        source: "hackernews",
      }));
  } catch (err) {
    console.warn(`  ⚠ HN fetch failed: ${err.message}`);
    return [];
  }
}

/**
 * Show HN posts — specifically projects/tools authors are launching.
 * Highest-quality seed for hidden-gems.
 */
async function fetchShowHN({ limit = 8 } = {}) {
  try {
    const since = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
    const url = `${HN_ALGOLIA}?tags=show_hn&numericFilters=created_at_i>${since},points>20&hitsPerPage=${limit * 3}`;
    const data = await fetchJson(url);
    return (data.hits || [])
      .filter((h) => h.url && h.title)
      .slice(0, limit)
      .map((h) => ({
        title: h.title.replace(/^Show HN:\s*/i, ""),
        url: h.url,
        score: h.points,
        source: "show-hn",
      }));
  } catch (err) {
    console.warn(`  ⚠ Show HN fetch failed: ${err.message}`);
    return [];
  }
}

/**
 * GitHub trending (proxy via search API: recent repos, sorted by stars).
 * Token optional — unauthenticated = 60 req/hr (plenty for daily use).
 */
async function fetchGitHubTrending({ limit = 8, minStars = 50, daysBack = 14 } = {}) {
  try {
    const since = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const q = `created:>${since} stars:>${minStars}`;
    const url = `${GH_SEARCH}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${limit * 2}`;
    const headers = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const data = await fetchJson(url, { headers });
    return (data.items || [])
      .filter((r) => r.description && !r.fork && !r.archived)
      .slice(0, limit)
      .map((r) => ({
        title: r.name,
        fullName: r.full_name,
        url: r.html_url,
        homepage: r.homepage || null,
        description: r.description,
        score: r.stargazers_count,
        language: r.language,
        source: "github",
      }));
  } catch (err) {
    console.warn(`  ⚠ GitHub trending fetch failed: ${err.message}`);
    return [];
  }
}

/**
 * Product Hunt top posts from the last 24h. Requires developer token.
 * Fails soft (returns []) when PRODUCT_HUNT_TOKEN is absent.
 */
async function fetchProductHunt({ limit = 8 } = {}) {
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) return [];
  try {
    const query = `
      query {
        posts(order: VOTES, first: ${limit * 2}) {
          edges {
            node {
              name
              tagline
              description
              url
              website
              votesCount
              topics(first: 3) { edges { node { name } } }
            }
          }
        }
      }`;
    const res = await withRetry(async () => {
      const response = await fetch(PH_GQL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": UA,
        },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw httpError(response.status);
      return response;
    }, { label: "Product Hunt API" });
    const data = await res.json();
    if (data.errors?.length) throw new Error(`GraphQL error: ${data.errors.map((e) => e.message).join("; ")}`);
    const edges = data?.data?.posts?.edges || [];
    const items = edges.slice(0, limit).map(({ node }) => ({
      title: node.name,
      tagline: node.tagline,
      description: node.description,
      url: node.website || node.url,
      score: node.votesCount,
      topics: (node.topics?.edges || []).map((e) => e.node.name),
      source: "producthunt",
    }));
    // PH returns UTM-laden /r/<id> redirect URLs. Strip tracking so item pages
    // show clean URLs; the redirect still works fine for real users in a browser.
    for (const item of items) {
      item.url = stripTracking(item.url);
    }
    return items;
  } catch (err) {
    console.warn(`  ⚠ Product Hunt fetch failed: ${err.message}`);
    return [];
  }
}

/**
 * Format seed items as a compact block for the Gemini prompt.
 * Gemini is told to select N and rewrite them in Surfaced's schema,
 * keeping the real URL, name, and factual core intact.
 */
function formatSeeds(seeds) {
  if (!seeds.length) return "";
  return seeds
    .map((s, i) => {
      const parts = [`${i + 1}. ${s.title}`];
      if (s.tagline) parts.push(`   Tagline: ${s.tagline}`);
      if (s.description && s.description !== s.tagline) parts.push(`   Desc: ${s.description.slice(0, 200)}`);
      if (s.language) parts.push(`   Language: ${s.language}`);
      if (s.topics?.length) parts.push(`   Topics: ${s.topics.join(", ")}`);
      parts.push(`   URL: ${s.url}`);
      if (s.score) parts.push(`   Signal: ${s.score} ${s.source === "github" ? "stars" : "points/votes"} on ${s.source}`);
      return parts.join("\n");
    })
    .join("\n\n");
}

/**
 * Get seeds appropriate for a given content category.
 * Fetches multiple sources in parallel and combines.
 */
async function getSeedsForCategory(category) {
  switch (category) {
    case "hidden-gems": {
      const [show, hn] = await Promise.all([fetchShowHN({ limit: 6 }), fetchHackerNews({ limit: 4, minScore: 200 })]);
      return [...show, ...hn].slice(0, 8);
    }
    case "daily-tools": {
      const [gh, ph] = await Promise.all([fetchGitHubTrending({ limit: 6 }), fetchProductHunt({ limit: 4 })]);
      return [...gh, ...ph].slice(0, 8);
    }
    case "future-radar": {
      return fetchHackerNews({ limit: 6, minScore: 150 });
    }
    case "products": {
      return fetchProductHunt({ limit: 18 });
    }
    case "discoveries":
    default:
      return [];
  }
}

module.exports = {
  fetchHackerNews,
  fetchShowHN,
  fetchGitHubTrending,
  fetchProductHunt,
  getSeedsForCategory,
  formatSeeds,
};
