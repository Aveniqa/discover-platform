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
import { filterLiveOutboundUrl } from "@/lib/dead-links";

export function safeHostLabel(url?: string | null): string | null {
  const liveUrl = filterLiveOutboundUrl(url);
  if (!liveUrl) return null;
  try {
    return new URL(liveUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function getItemSourceUrl(item: AnyItem): string | null {
  if (item.type === "discovery") return filterLiveOutboundUrl((item as Discovery).sourceLink);
  if (item.type === "product") return filterLiveOutboundUrl((item as Product).sourceLink);
  if (item.type === "hidden-gem") return filterLiveOutboundUrl((item as HiddenGem).websiteLink);
  if (item.type === "tool") return filterLiveOutboundUrl((item as DailyTool).websiteLink);
  if (item.type === "future-tech") return filterLiveOutboundUrl((item as FutureTech).sourceLink);
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
