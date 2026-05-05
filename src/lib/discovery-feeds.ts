import type { SourceTrailEntry } from "@/lib/current-event-intelligence";

export type DiscoveryFeedProvider = "hacker-news" | "product-hunt";
export type DiscoveryFeedCategory = "daily-tools" | "hidden-gems" | "future-radar" | "products";

export interface DiscoveryFeedSignal {
  provider: DiscoveryFeedProvider;
  category: DiscoveryFeedCategory;
  title: string;
  url: string;
  score: number;
  comments?: number;
  tagline?: string;
  publishedAt: string;
  sourceTrail: SourceTrailEntry[];
  editorialNote: string;
  rightsNote?: string;
}

export interface HackerNewsItem {
  id?: number;
  type?: string;
  deleted?: boolean;
  dead?: boolean;
  time?: number;
  url?: string;
  title?: string;
  score?: number;
  descendants?: number;
}

export interface ProductHuntPost {
  id?: string;
  name?: string;
  tagline?: string;
  description?: string;
  url?: string;
  website?: string;
  votesCount?: number;
  createdAt?: string;
  topics?: {
    edges?: Array<{
      node?: {
        name?: string;
      };
    }>;
  };
}

export interface DiscoveryFeedFetchOptions {
  fetcher?: typeof fetch;
  limit?: number;
  minScore?: number;
  productHuntToken?: string;
  now?: Date;
}

const HN_TOP_STORIES = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_SHOW_STORIES = "https://hacker-news.firebaseio.com/v0/showstories.json";
const HN_ITEM = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
const PRODUCT_HUNT_GRAPHQL = "https://api.producthunt.com/v2/api/graphql";

function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function cleanTitle(value: string): string {
  return value.replace(/^Show HN:\s*/i, "").replace(/\s+/g, " ").trim();
}

function isoFromUnixSeconds(value: number | undefined, now = new Date()): string {
  if (!value) return now.toISOString();
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? now.toISOString() : date.toISOString();
}

function inferHackerNewsCategory(item: HackerNewsItem): DiscoveryFeedCategory {
  const title = (item.title ?? "").toLowerCase();
  if (/show hn:|tool|app|launch|open source|github|cli|api|extension/.test(title)) {
    return "hidden-gems";
  }
  if (/research|paper|model|ai|robot|quantum|biology|space/.test(title)) {
    return "future-radar";
  }
  return "daily-tools";
}

function productHuntTopics(post: ProductHuntPost): string[] {
  return (post.topics?.edges ?? [])
    .map((edge) => edge.node?.name)
    .filter((name): name is string => Boolean(name));
}

function inferProductHuntCategory(post: ProductHuntPost): DiscoveryFeedCategory {
  const text = `${post.name ?? ""} ${post.tagline ?? ""} ${productHuntTopics(post).join(" ")}`.toLowerCase();
  if (/developer|productivity|design|ai|automation|analytics|no-code|nocode/.test(text)) return "daily-tools";
  return "hidden-gems";
}

export function normalizeHackerNewsSignal(
  item: HackerNewsItem,
  options: { minScore?: number; now?: Date } = {},
): DiscoveryFeedSignal | null {
  const minScore = options.minScore ?? 60;
  if (item.deleted || item.dead || item.type !== "story") return null;
  if (!item.id || !item.title || !item.url || !isPublicHttpsUrl(item.url)) return null;
  if ((item.score ?? 0) < minScore) return null;

  const sourceUrl = `https://news.ycombinator.com/item?id=${item.id}`;
  return {
    provider: "hacker-news",
    category: inferHackerNewsCategory(item),
    title: cleanTitle(item.title),
    url: item.url,
    score: item.score ?? 0,
    comments: item.descendants,
    publishedAt: isoFromUnixSeconds(item.time, options.now),
    sourceTrail: [
      {
        name: "Hacker News discussion",
        label: "Hacker News discussion",
        url: sourceUrl,
        role: "signal",
        sourceType: "discovery",
        publisher: "Hacker News",
      },
      {
        name: "Original linked project",
        label: "Original linked project",
        url: item.url,
        role: "signal",
        sourceType: "discovery",
      },
    ],
    editorialNote: "HN is a user-validation signal only; verify the original project before creating Surfaced copy.",
  };
}

export function normalizeProductHuntSignal(
  post: ProductHuntPost,
  options: { minScore?: number; now?: Date } = {},
): DiscoveryFeedSignal | null {
  const minScore = options.minScore ?? 25;
  const title = post.name?.trim();
  const productUrl = post.website || post.url;
  const discussionUrl = post.url;
  if (!title || !productUrl || !discussionUrl) return null;
  if (!isPublicHttpsUrl(productUrl) || !isPublicHttpsUrl(discussionUrl)) return null;
  if ((post.votesCount ?? 0) < minScore) return null;

  return {
    provider: "product-hunt",
    category: inferProductHuntCategory(post),
    title,
    tagline: post.tagline || post.description,
    url: productUrl,
    score: post.votesCount ?? 0,
    publishedAt: post.createdAt || options.now?.toISOString() || new Date().toISOString(),
    sourceTrail: [
      {
        name: "Product Hunt post",
        label: "Product Hunt post",
        url: discussionUrl,
        role: "signal",
        sourceType: "discovery",
        publisher: "Product Hunt",
      },
      {
        name: "Product website",
        label: "Product website",
        url: productUrl,
        role: "signal",
        sourceType: "discovery",
      },
    ],
    editorialNote: "Product Hunt is a launch/discovery signal; verify the product site and avoid treating votes as endorsement.",
    rightsNote: "Product Hunt API requires attribution and commercial-use approval before business use.",
  };
}

async function fetchJson<T>(url: string, fetcher: typeof fetch, init?: RequestInit): Promise<T> {
  const response = await fetcher(url, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": "SurfacedDiscoveryFeeds/1.0 (https://surfaced-x.pages.dev/contact)",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchHackerNewsList(
  listUrl: string,
  options: DiscoveryFeedFetchOptions,
): Promise<DiscoveryFeedSignal[]> {
  const fetcher = options.fetcher ?? fetch;
  const ids = await fetchJson<number[]>(listUrl, fetcher);
  const stories = await Promise.all(
    ids.slice(0, 60).map((id) => fetchJson<HackerNewsItem>(HN_ITEM(id), fetcher).catch(() => null)),
  );
  return stories
    .map((story) => (story ? normalizeHackerNewsSignal(story, options) : null))
    .filter((signal): signal is DiscoveryFeedSignal => Boolean(signal))
    .slice(0, options.limit ?? 10);
}

export async function fetchHackerNewsSignals(options: DiscoveryFeedFetchOptions = {}): Promise<DiscoveryFeedSignal[]> {
  const [top, show] = await Promise.all([
    fetchHackerNewsList(HN_TOP_STORIES, { ...options, minScore: options.minScore ?? 100 }),
    fetchHackerNewsList(HN_SHOW_STORIES, { ...options, minScore: options.minScore ?? 30 }),
  ]);
  return Array.from(new Map([...show, ...top].map((signal) => [signal.url, signal] as const)).values()).slice(
    0,
    options.limit ?? 12,
  );
}

export function buildProductHuntPostsQuery(limit = 10): string {
  return `
    query SurfacedProductHuntSignals {
      posts(order: VOTES, first: ${Math.max(1, Math.min(limit, 20))}) {
        edges {
          node {
            id
            name
            tagline
            description
            url
            website
            votesCount
            createdAt
            topics(first: 4) { edges { node { name } } }
          }
        }
      }
    }
  `;
}

export async function fetchProductHuntSignals(
  options: DiscoveryFeedFetchOptions = {},
): Promise<DiscoveryFeedSignal[]> {
  if (!options.productHuntToken) return [];
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(PRODUCT_HUNT_GRAPHQL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.productHuntToken}`,
      "content-type": "application/json",
      "user-agent": "SurfacedDiscoveryFeeds/1.0 (https://surfaced-x.pages.dev/contact)",
    },
    body: JSON.stringify({ query: buildProductHuntPostsQuery(options.limit ?? 10) }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = (await response.json()) as {
    data?: { posts?: { edges?: Array<{ node?: ProductHuntPost }> } };
  };
  return (payload.data?.posts?.edges ?? [])
    .map((edge) => (edge.node ? normalizeProductHuntSignal(edge.node, options) : null))
    .filter((signal): signal is DiscoveryFeedSignal => Boolean(signal))
    .slice(0, options.limit ?? 10);
}
