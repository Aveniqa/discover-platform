import discoveriesData from "@/../data/discoveries.json";
import productsData from "@/../data/products.json";
import hiddenGemsData from "@/../data/hidden-gems.json";
import futureRadarData from "@/../data/future-radar.json";
import dailyToolsData from "@/../data/daily-tools.json";
import categoriesData from "@/../data/categories.json";

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
};

/* ---- Data Access ---- */
export const discoveries = discoveriesData as Discovery[];
export const products = productsData as Product[];
export const hiddenGems = hiddenGemsData as HiddenGem[];
export const futureRadar = futureRadarData as FutureTech[];
export const dailyTools = dailyToolsData as DailyTool[];
export const categories = categoriesData as CategoryMeta[];

/* ---- Helpers ---- */
export function getAllItems(): AnyItem[] {
  return [...discoveries, ...products, ...hiddenGems, ...futureRadar, ...dailyTools];
}

export function getItemBySlug(slug: string): AnyItem | undefined {
  return getAllItems().find((item) => item.slug === slug);
}

export function getItemTitle(item: AnyItem): string {
  if (item.type === "hidden-gem") return (item as HiddenGem).name;
  if (item.type === "future-tech") return (item as FutureTech).techName;
  if (item.type === "tool") return (item as DailyTool).toolName;
  return (item as Discovery | Product).title;
}

export function getItemDescription(item: AnyItem): string {
  if (item.type === "hidden-gem") return (item as HiddenGem).whatItDoes;
  if (item.type === "future-tech") return (item as FutureTech).explanation;
  if (item.type === "tool") return (item as DailyTool).whatItDoes;
  return (item as Discovery | Product).shortDescription;
}

export function getItemCategory(item: AnyItem): string {
  if (item.type === "future-tech") return (item as FutureTech).industry;
  return (item as Discovery | Product | HiddenGem | DailyTool).category;
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
  if (item.type === "product") return (item as Product).sourceLink;
  if (item.type === "hidden-gem") return (item as HiddenGem).websiteLink;
  if (item.type === "tool") return (item as DailyTool).websiteLink;
  if (item.type === "discovery") return (item as Discovery).sourceLink;
  return null;
}

/** Resolve outbound URL — prefer affiliate URL when available */
export function getItemOutboundUrl(item: AnyItem): string | null {
  if (item.affiliate?.enabled && item.affiliate.url) return item.affiliate.url;
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
  const cat = getItemCategory(item);
  const allSameType = getAllItems().filter(
    (i) => i.type === item.type && i.slug !== item.slug && getItemCategory(i) === cat
  );
  if (allSameType.length >= count) return allSameType.slice(0, count);
  const allType = getAllItems().filter((i) => i.type === item.type && i.slug !== item.slug);
  return allType.slice(0, count);
}

export function getSubCategories(itemType: string): string[] {
  const items = getAllItems().filter((i) => i.type === itemType);
  const cats = new Set(items.map(getItemCategory));
  return Array.from(cats).sort();
}
