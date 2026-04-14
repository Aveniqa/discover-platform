import { getAllItems, collections_data } from "@/lib/data";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = "https://surfaced-x.pages.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const items = getAllItems();

  const itemPages: MetadataRoute.Sitemap = items.map((item) => {
    const dateAdded = (item as { dateAdded?: string }).dateAdded;
    return {
      url: `${BASE}/item/${item.slug}`,
      lastModified: dateAdded ? new Date(dateAdded) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  const collectionPages: MetadataRoute.Sitemap = collections_data.map((c) => ({
    url: `${BASE}/collections/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${BASE}/discover`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE}/trending`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE}/hidden-gems`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE}/future-radar`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE}/tools`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE}/collections`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${BASE}/categories`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${BASE}/newsletter`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/about`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/premium`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/contact`, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE}/affiliate-disclosure`, changeFrequency: "yearly" as const, priority: 0.3 },
  ].map((p) => ({ ...p, lastModified: new Date() }));

  return [...staticPages, ...collectionPages, ...itemPages];
}
