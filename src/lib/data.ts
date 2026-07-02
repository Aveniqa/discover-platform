import discoveriesData from "@/../data/discoveries.json";
import productsData from "@/../data/products.json";
import hiddenGemsData from "@/../data/hidden-gems.json";
import futureRadarData from "@/../data/future-radar.json";
import dailyToolsData from "@/../data/daily-tools.json";
import archiveData from "@/../data/archive.json";
import categoriesData from "@/../data/categories.json";
import todaysPicksData from "@/../data/todays-picks.json";
import collectionsData from "@/../data/collections.json";
import { filterLiveOutboundUrl } from "@/lib/dead-links";

/* ---- Types ---- */
export interface Discovery {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  category: string;
  whyItIsInteresting: string;
  imageIdea: string;
  sourceLink: string;
  badge?: string;
  type: "discovery";
}

export interface Product {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  category: string;
  whyItIsInteresting: string;
  imageIdea: string;
  sourceLink: string;
  estimatedPriceRange: string;
  availableOnAmazon?: boolean;
  amazonAsin?: string;
  directAmazonUrl?: string;
  bestBuyUrl?: string;
  badge?: string;
  youtubeVideoId?: string;
  type: "product";
}

export interface HiddenGem {
  id: number;
  slug: string;
  name: string;
  whatItDoes: string;
  category: string;
  whyItIsUseful: string;
  websiteLink: string;
  screenshotUrl?: string;
  badge?: string;
  type: "hidden-gem";
}

export interface FutureTech {
  id: number;
  slug: string;
  techName: string;
  explanation: string;
  industry: string;
  whyItMatters: string;
  developmentStage: string;
  sourceLink?: string;
  badge?: string;
  type: "future-tech";
}

export interface DailyTool {
  id: number;
  slug: string;
  toolName: string;
  whatItDoes: string;
  category: string;
  whyItIsUseful: string;
  websiteLink: string;
  screenshotUrl?: string;
  badge?: string;
  type: "tool";
}

export interface CategoryMeta {
  key: string;
  name: string;
  icon: string;
  color: string;
  hex: string;
  description: string;
  path: string;
  count: number;
}

export interface AffiliateInfo {
  enabled: boolean;
  provider?: "amazon" | "impact" | "shareasale" | "cj" | "custom";
  url?: string;
  code?: string;
}

export type AnyItem = (Discovery | Product | HiddenGem | FutureTech | DailyTool) & {
  affiliate?: AffiliateInfo;
  promoCode?: string;
  /** Single editorial paragraph from the 2026-05 rewrite, replaces the old
   *  two-section template when present. See scripts/editorial-rewrite.mjs */
  editorial?: string;
  /** One-liner take that appears under the title */
  takeaway?: string;
  rewrittenAt?: string;
};

/** Editorial-first description getter — prefers the rewritten paragraph */
export function getItemEditorial(item: AnyItem): string {
  if (item.editorial) return item.editorial;
  // Fall back to the old two-section concatenation
  const what = getItemDescription(item);
  const why = getItemWhyText(item);
  if (what && why) return `${what}\n\n${why}`;
  return what || why || "";
}

/* ---- Data Access ---- */
export const discoveries = discoveriesData as Discovery[];
export const products = productsData as Product[];
export const hiddenGems = hiddenGemsData as HiddenGem[];
export const futureRadar = futureRadarData as FutureTech[];
export const dailyTools = dailyToolsData as DailyTool[];

// `data/categories.json` is hand-edited (icon, color, copy) but its `count`
// drifts when the rotation/generate scripts skip an update. Derive count from
// the live data files at build so every consumer sees the same number.
const _liveCategoryCounts: Record<string, number> = {
  discoveries: discoveries.length,
  products: products.length,
  "hidden-gems": hiddenGems.length,
  "future-radar": futureRadar.length,
  "daily-tools": dailyTools.length,
};
export const categories = (categoriesData as CategoryMeta[]).map((c) => ({
  ...c,
  count: _liveCategoryCounts[c.key] ?? c.count,
})) as CategoryMeta[];

export interface TodaysPick {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  description: string;
  badge: string | null;
  type: string;
}
export const todaysPicks = todaysPicksData as TodaysPick[];

export interface Collection {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  itemSlugs: string[];
}
export const collections_data = collectionsData as Collection[];

/* ---- Helpers ---- */
// Archive items are included so their /item/<slug> URLs stay alive for Google.
// They never appear in category listing pages — only accessible via direct URL
// or internal links, preserving all indexed pages after daily rotation.
const archive = archiveData as AnyItem[];

export function getAllItems(): AnyItem[] {
  return [...discoveries, ...products, ...hiddenGems, ...futureRadar, ...dailyTools, ...archive];
}

/**
 * Returns only the items in the live niche (hidden-gems + daily-tools, not
 * archived). Use this for surfaces that should not surface archived content —
 * homepage carousels, search results, listing pages, cross-category
 * recommendations. Archived items keep their /item/<slug> URLs alive for SEO
 * via getAllItems(), but they shouldn't be promoted in ranked discovery flows.
 */
export function getLiveItems(): AnyItem[] {
  return [...hiddenGems, ...dailyTools];
}

export function getItemBySlug(slug: string): AnyItem | undefined {
  return getAllItems().find((item) => item.slug === slug);
}

export function isLiveItem(slug: string): boolean {
  return (
    hiddenGems.some((i) => i.slug === slug) || dailyTools.some((i) => i.slug === slug)
  );
}

export function getItemTitle(item: AnyItem): string {
  const raw =
    item.type === "hidden-gem" ? (item as HiddenGem).name :
    item.type === "future-tech" ? (item as FutureTech).techName :
    item.type === "tool" ? (item as DailyTool).toolName :
    (item as Discovery | Product).title;

  // Helper: detects strings shaped like a slug ("nature-skills",
  // "guizang-ppt-skill") so we don't render them in a UI surface.
  const isSlugShaped = (s: string | null | undefined): boolean =>
    !!s && /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(s.trim());

  const titleCase = (s: string): string =>
    s
      .split("-")
      .map((part) => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
      .join(" ");

  // Some catalog items were generated with the slug duplicated into the
  // title field (e.g. toolName: "guizang-ppt-skill"). When that happens,
  // prefer the seoTitle's first segment if it is human-readable; otherwise
  // title-case the slug.
  if (isSlugShaped(raw)) {
    const seo = (item as { seoTitle?: string }).seoTitle;
    if (seo && seo.length > 0) {
      const firstSegment = seo.split(/\s+[—–-]\s+/)[0] || seo;
      // If the first segment is still slug-shaped (e.g. "nature-skills — Python"),
      // title-case it so the H1 reads like a real product name.
      return isSlugShaped(firstSegment) ? titleCase(firstSegment) : firstSegment;
    }
    return titleCase(raw);
  }
  return raw;
}

export function getItemDescription(item: AnyItem): string {
  if (item.type === "hidden-gem") return (item as HiddenGem).whatItDoes;
  if (item.type === "future-tech") return (item as FutureTech).explanation;
  if (item.type === "tool") return (item as DailyTool).whatItDoes;
  return (item as Discovery | Product).shortDescription;
}

/**
 * Word-boundary excerpt for listing cards. The full description still renders
 * on /item/<slug>; listing routes ship a slim version so 50–500 cards per page
 * don't bloat HTML or invite "thin content" classification when the same body
 * text repeats across category index + collections + homepage.
 */
export function getItemExcerpt(item: AnyItem, max = 160): string {
  return trimToWordBoundary(getItemDescription(item), max);
}

function trimToWordBoundary(s: string, max: number): string {
  if (!s) return "";
  const cleaned = s.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max - 30 ? cut.slice(0, lastSpace) : cut).replace(
    /[,.;:\s]+$/,
    ""
  ) + "…";
}

export function getItemCategory(item: AnyItem): string {
  if (item.type === "future-tech") return (item as FutureTech).industry;
  return (item as Discovery | Product | HiddenGem | DailyTool).category;
}

/** Self-hosted website screenshot path, when captured (gems + tools only) */
export function getItemScreenshot(item: AnyItem): string | null {
  if (item.type === "hidden-gem") return (item as HiddenGem).screenshotUrl || null;
  if (item.type === "tool") return (item as DailyTool).screenshotUrl || null;
  return null;
}

export function getItemWhyText(item: AnyItem): string {
  if (item.type === "discovery") return (item as Discovery).whyItIsInteresting;
  if (item.type === "product") return (item as Product).whyItIsInteresting;
  if (item.type === "hidden-gem") return (item as HiddenGem).whyItIsUseful;
  if (item.type === "future-tech") return (item as FutureTech).whyItMatters;
  if (item.type === "tool") return (item as DailyTool).whyItIsUseful;
  return "";
}

function getItemExternalLink(item: AnyItem): string | null {
  if (item.type === "product") return filterLiveOutboundUrl((item as Product).sourceLink);
  if (item.type === "hidden-gem") return filterLiveOutboundUrl((item as HiddenGem).websiteLink);
  if (item.type === "tool") return filterLiveOutboundUrl((item as DailyTool).websiteLink);
  if (item.type === "discovery") return filterLiveOutboundUrl((item as Discovery).sourceLink);
  return null;
}

/** Resolve outbound URL — prefer affiliate URL, then directAmazonUrl, then sourceLink */
export function getItemOutboundUrl(item: AnyItem): string | null {
  const affiliateUrl = item.affiliate?.enabled ? filterLiveOutboundUrl(item.affiliate.url) : null;
  if (affiliateUrl) return affiliateUrl;
  if (item.type === "product") {
    const amazonUrl = filterLiveOutboundUrl((item as Product).directAmazonUrl);
    if (amazonUrl) return amazonUrl;
  }
  return getItemExternalLink(item);
}

export function getCtaLabel(item: AnyItem): string {
  if (item.type === "product") return "Check Price";
  if (item.type === "hidden-gem") return "Visit Site";
  if (item.type === "tool") return "Open Tool";
  if (item.type === "future-tech") return "Learn More";
  return "Explore";
}

export function getWhyHeading(itemType: string): string {
  switch (itemType) {
    case "discovery": return "Why It\u2019s Fascinating";
    case "product": return "Why It Stands Out";
    case "hidden-gem":
    case "tool": return "Why It\u2019s Useful";
    case "future-tech": return "Why It Matters";
    default: return "Why It\u2019s Interesting";
  }
}

export function getCategoryColor(itemType: string): string {
  const map: Record<string, string> = {
    discovery: "indigo",
    product: "emerald",
    "hidden-gem": "amber",
    "future-tech": "cyan",
    tool: "rose",
  };
  return map[itemType] || "indigo";
}

export function getCategoryLabel(itemType: string): string {
  const map: Record<string, string> = {
    discovery: "Discovery",
    product: "Product",
    "hidden-gem": "Hidden Gem",
    "future-tech": "Future Tech",
    tool: "Tool",
  };
  return map[itemType] || "Discovery";
}

export function getCategoryNavLabel(itemType: string): string {
  const map: Record<string, string> = {
    discovery: "Discoveries",
    product: "Trending",
    "hidden-gem": "Hidden Gems",
    "future-tech": "Future Radar",
    tool: "Daily Tools",
  };
  return map[itemType] || "Browse";
}

export function getCategoryPath(itemType: string): string {
  const map: Record<string, string> = {
    discovery: "/discover",
    product: "/trending",
    "hidden-gem": "/hidden-gems",
    "future-tech": "/future-radar",
    tool: "/tools",
  };
  return map[itemType] || "/discover";
}

export function getRelatedItems(item: AnyItem, count = 4): AnyItem[] {
  // Recommendations always draw from the live niche so an archived item-page
  // sends readers forward to current content, and a live item-page never
  // pulls readers into archive. Live pool may be smaller, but a focused
  // experience beats a deep pool full of stale content.
  const pool = getLiveItems();
  const cat = getItemCategory(item);

  // Prefer same-type + same-category
  const sameTypeCat = pool.filter(
    (i) => i.type === item.type && i.slug !== item.slug && getItemCategory(i) === cat
  );
  if (sameTypeCat.length >= count) return sameTypeCat.slice(0, count);

  // Fall back to same-type, any category
  const sameType = pool.filter((i) => i.type === item.type && i.slug !== item.slug);
  if (sameType.length >= count) return sameType.slice(0, count);

  // Final fallback: any live item that isn't this one
  return pool.filter((i) => i.slug !== item.slug).slice(0, count);
}

/* ---- Category Normalization ----
   Verbose compound categories ("Smart Home / Entertainment Lighting",
   "Biotechnology, Personalized Medicine, Neuroscience, AI, Nutrition")
   are collapsed to clean top-level labels for filter UIs. */

const PRODUCT_CATEGORY_MAP: Record<string, string> = {};
const FUTURE_INDUSTRY_MAP: Record<string, string> = {};

function normalizeProductCategory(raw: string): string {
  if (PRODUCT_CATEGORY_MAP[raw]) return PRODUCT_CATEGORY_MAP[raw];
  const r = raw.toLowerCase();
  if (r.includes("audio") || r.includes("speaker") || r.includes("headphone") || r.includes("earbuds")) return "Audio";
  if (r.includes("kitchen") || r.includes("sous vide") || r.includes("coffee") || r.includes("dining") || r.includes("cooking")) return "Kitchen & Home";
  if (r.includes("smart home") || r.includes("automation") || r.includes("cleaning") || r.includes("security") || r.includes("decor") || r.includes("entertainment lighting") || r.includes("gardening")) return "Smart Home";
  if (r.includes("outdoor") || r.includes("camping") || r.includes("travel") || r.includes("adventure") || r.includes("satellite")) return "Outdoor & Travel";
  if (r.includes("fitness") || r.includes("wellness") || r.includes("health") || r.includes("ergonomic") || r.includes("personal care") || r.includes("oral health")) return "Health & Wellness";
  if (r.includes("wearable") || r.includes("sports")) return "Wearable Tech";
  if (r.includes("pet")) return "Pet Care";
  if (r.includes("photo") || r.includes("drone") || r.includes("camera")) return "Photography";
  if (r.includes("gaming")) return "Gaming";
  if (r.includes("fashion") || r.includes("bag") || r.includes("accessories") || r.includes("beauty")) return "Fashion & Accessories";
  if (r.includes("productivity") || r.includes("electronics") || r.includes("home office")) return "Productivity";
  if (r.includes("sustainability")) return "Sustainability";
  if (r.includes("gift")) return "Gifts";
  if (r.includes("home") || r.includes("garden")) return "Kitchen & Home";
  return raw; // fallback to original
}

function normalizeFutureIndustry(raw: string): string {
  if (FUTURE_INDUSTRY_MAP[raw]) return FUTURE_INDUSTRY_MAP[raw];
  const r = raw.toLowerCase();
  if (r.includes("biotech") || r.includes("pharma") || r.includes("regenerative") || r.includes("bio-engineering") || r.includes("oncology")) return "Biotechnology";
  if (r.includes("healthcare") || r.includes("medical") || r.includes("neuroscience") || r.includes("assistive")) return "Healthcare";
  if (r.includes("ai") || r.includes("computing") || r.includes("quantum") || r.includes("semiconductor") || r.includes("machine learning") || r.includes("data storage")) return "AI & Computing";
  if (r.includes("climate") || r.includes("environment") || r.includes("waste") || r.includes("remediation")) return "Climate & Environment";
  if (r.includes("energy") || r.includes("renewable")) return "Energy";
  if (r.includes("space") || r.includes("aerospace")) return "Space & Aerospace";
  if (r.includes("robot") || r.includes("manufacturing") || r.includes("nanotechnology") || r.includes("3d print")) return "Manufacturing & Robotics";
  if (r.includes("material")) return "Materials Science";
  if (r.includes("transport") || r.includes("logistics")) return "Transportation";
  if (r.includes("construction") || r.includes("architecture") || r.includes("urban") || r.includes("smart cit") || r.includes("infrastructure")) return "Construction & Cities";
  if (r.includes("agriculture") || r.includes("horticulture")) return "Agriculture";
  if (r.includes("telecom") || r.includes("communication") || r.includes("cybersecurity")) return "Telecom & Security";
  if (r.includes("education")) return "Education";
  if (r.includes("entertainment") || r.includes("gaming") || r.includes("wellness") || r.includes("consumer")) return "Consumer Tech";
  return raw.split(",")[0].trim(); // fallback to first term
}

/** Get the display-friendly filter category for a given item */
export function getFilterCategory(item: AnyItem): string {
  const raw = getItemCategory(item);
  if (item.type === "product") return normalizeProductCategory(raw);
  if (item.type === "future-tech") return normalizeFutureIndustry(raw);
  return raw;
}

export function getSubCategories(itemType: string): string[] {
  const items = getAllItems().filter((i) => i.type === itemType);
  const cats = new Set(items.map(i =>
    itemType === "product" || itemType === "future-tech" ? getFilterCategory(i) : getItemCategory(i)
  ));
  return Array.from(cats).sort();
}
