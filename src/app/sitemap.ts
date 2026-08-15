import { getAllItems, collections_data } from "@/lib/data";
import { SITE_URL, getBuildDate } from "@/lib/seo";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/**
 * Sitemap with stable lastModified timestamps:
 *   - Items use their `dateAdded` if present, otherwise the build date
 *   - Static + collection pages all share the build date
 *
 * Bucketing to a per-day timestamp (vs `new Date()` per build) prevents
 * Google from seeing every URL refreshed on every push.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const items = getAllItems();
  const buildDate = new Date(getBuildDate());

  const itemPages: MetadataRoute.Sitemap = items.map((item) => {
    const dateAdded = (item as { dateAdded?: string }).dateAdded;
    return {
      url: `${SITE_URL}/item/${item.slug}`,
      lastModified: dateAdded ? new Date(dateAdded) : buildDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  const collectionPages: MetadataRoute.Sitemap = collections_data.map((c) => ({
    url: `${SITE_URL}/collections/${c.slug}`,
    lastModified: buildDate,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  /* The /live current-event guides were retired 2026-08-15: their feeder
     workflows were switched off during the 2026-05 niche pivot, so the
     published guides had aged into false present-tense claims ("…Week is
     underway") while still being indexed. The route is gone; the data,
     lib, and validator survive for revival. */

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${SITE_URL}/discover`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${SITE_URL}/trending`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${SITE_URL}/hidden-gems`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${SITE_URL}/future-radar`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${SITE_URL}/tools`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${SITE_URL}/workflows`, changeFrequency: "weekly" as const, priority: 0.85 },
    { url: `${SITE_URL}/roulette`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/gallery`, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${SITE_URL}/collections`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/categories`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/editorial-standards`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/newsletter`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${SITE_URL}/affiliate-disclosure`, changeFrequency: "yearly" as const, priority: 0.3 },
  ].map((p) => ({ ...p, lastModified: buildDate }));

  return [...staticPages, ...collectionPages, ...itemPages];
}
