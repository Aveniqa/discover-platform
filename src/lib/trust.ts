import {
  type AnyItem,
  type DailyTool,
  type Discovery,
  type FutureTech,
  type HiddenGem,
  type Product,
  getFilterCategory,
  getItemCategory,
} from "@/lib/data";

export function safeHostLabel(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function getItemSourceUrl(item: AnyItem): string | null {
  if (item.type === "discovery") return (item as Discovery).sourceLink || null;
  if (item.type === "product") return (item as Product).sourceLink || null;
  if (item.type === "hidden-gem") return (item as HiddenGem).websiteLink || null;
  if (item.type === "tool") return (item as DailyTool).websiteLink || null;
  if (item.type === "future-tech") return (item as FutureTech).sourceLink || null;
  return null;
}

export function getItemSourceLabel(item: AnyItem): string {
  if (item.type === "hidden-gem" || item.type === "tool") return "Official site";
  if (item.type === "product") return "Product source";
  return "Source";
}

export function getItemTrustSignals(item: AnyItem): string[] {
  const category = item.type === "product" || item.type === "future-tech"
    ? getFilterCategory(item)
    : getItemCategory(item);
  const sourceHost = safeHostLabel(getItemSourceUrl(item));

  if (item.type === "product") {
    return [
      "Source checked",
      "Affiliate disclosed where applicable",
      category,
    ];
  }

  if (item.type === "future-tech") {
    return [
      "Signal tracked",
      (item as FutureTech).developmentStage || "Stage noted",
      sourceHost ? `Source: ${sourceHost}` : category,
    ];
  }

  if (item.type === "hidden-gem" || item.type === "tool") {
    return [
      "Official site linked",
      "Use-case reviewed",
      category,
    ];
  }

  return [
    "Source linked",
    "Context summarized",
    category,
  ];
}
