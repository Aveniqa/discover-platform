/**
 * Single source of truth for site-wide counts.
 *
 * Replaces hardcoded "674+" / "686+" claims and stale `categories.count`
 * values. Everything renders from this — hero, footer, JSON-LD, category
 * tiles, search placeholders.
 *
 * Pure derivation from `data/*.json`. Build-time only.
 */
import {
  discoveries,
  products,
  hiddenGems,
  futureRadar,
  dailyTools,
} from "./data";
import archiveData from "@/../data/archive.json";

export interface CategoryStat {
  /** Stable category key (matches `categories.json` keys + item type slugs). */
  key: string;
  count: number;
}

export interface SiteStats {
  /** Total live, non-archived items across all 5 categories. */
  total: number;
  /** Live + archived (preserved for SEO via /item/<slug>). */
  totalIncludingArchive: number;
  /** Number of archived items. */
  archive: number;
  /** Per-category live count, keyed by category file slug. */
  byKey: Record<string, number>;
  /** Same data as `byKey` but as a stable-ordered list. */
  perCategory: CategoryStat[];
  /** Daily content-generation budget. Static — driven by the daily workflow. */
  newDaily: number;
  /** Number of top-level categories. */
  categoryCount: number;
}

/**
 * Stable category key order. Matches `data/categories.json` and the routes.
 */
const CATEGORY_ORDER: ReadonlyArray<readonly [key: string, length: number]> = [
  ["discoveries", discoveries.length],
  ["products", products.length],
  ["hidden-gems", hiddenGems.length],
  ["future-radar", futureRadar.length],
  ["daily-tools", dailyTools.length],
] as const;

let cached: SiteStats | null = null;

export function getSiteStats(): SiteStats {
  if (cached) return cached;

  const byKey: Record<string, number> = {};
  const perCategory: CategoryStat[] = [];
  let total = 0;
  for (const [key, count] of CATEGORY_ORDER) {
    byKey[key] = count;
    perCategory.push({ key, count });
    total += count;
  }

  const archive = (archiveData as unknown as unknown[]).length;

  cached = {
    total,
    totalIncludingArchive: total + archive,
    archive,
    byKey,
    perCategory,
    newDaily: 25,
    categoryCount: CATEGORY_ORDER.length,
  };
  return cached;
}
