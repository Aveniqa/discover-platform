/**
 * Niche guards for the two live verticals. A hidden gem or daily tool is a
 * thing a reader can open and use — not a news story, a social post, or a
 * forum headline about one. Both checks are shared by the daily generator
 * (to reject candidates) and scripts/archive-off-niche.js (to clean up
 * items that slipped through before the guards existed).
 */

// Coverage and discussion hosts: fine as a source, never as the product link.
const COVERAGE_HOSTS = [
  "404media.co", "apnews.com", "arstechnica.com", "axios.com", "bbc.co.uk", "bbc.com",
  "bloomberg.com", "bsky.app", "businessinsider.com", "cnbc.com", "cnn.com", "economist.com",
  "engadget.com", "facebook.com", "forbes.com", "ft.com", "lobste.rs", "linkedin.com",
  "news.ycombinator.com", "newyorker.com", "nytimes.com", "politico.com", "reddit.com",
  "reuters.com", "techcrunch.com", "theatlantic.com", "theguardian.com", "theregister.com",
  "theverge.com", "threads.net", "twitter.com", "washingtonpost.com", "wired.com", "wsj.com",
  "x.com", "zdnet.com",
];

function isCoverageLink(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  // Mastodon-style instances (grapheneos.social, mastodon.social, …)
  if (host.endsWith(".social")) return true;
  return COVERAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * "I put employees inside S&P 500 market-cap bubbles", "Why is this script…?",
 * "Show HN: …" — a post title, not a product name.
 */
function looksLikeHeadline(name) {
  const text = String(name || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (/^(show|ask|tell|launch)\s+hn\b/i.test(text)) return true;
  if (text.endsWith("?")) return true;
  if (words.length > 8) return true;
  if (words.length >= 5 && /^(i|i'm|i've|i'd|we|we're|we've|my|our|why|how|what|when|who|is|are|do|does|can|should)\b/i.test(text)) return true;
  if (words.length >= 6 && /^(a|an|the)\b/i.test(text)) return true;
  return false;
}

module.exports = { isCoverageLink, looksLikeHeadline };
