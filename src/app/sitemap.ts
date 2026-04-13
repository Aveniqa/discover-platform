import { getAllItems } from "@/lib/data";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://surfaced-x.pages.dev";
  const items = getAllItems();

  const itemPages = items.map((item) => ({
    url: `${baseUrl}/item/${item.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const staticPages = [
    { url: baseUrl, changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${baseUrl}/discover`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/trending`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/hidden-gems`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/future-radar`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/tools`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/categories`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/newsletter`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${baseUrl}/premium`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/affiliate-disclosure`, changeFrequency: "yearly" as const, priority: 0.3 },
  ].map((p) => ({ ...p, lastModified: new Date() }));

  return [...staticPages, ...itemPages];
}
