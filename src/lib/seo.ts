/**
 * Shared SEO metadata helpers.
 *
 * Use `buildMetadata()` instead of writing per-page Metadata objects by hand —
 * it guarantees every page gets a canonical, OG, and Twitter card with consistent
 * defaults and absolute URLs.
 *
 * No runtime code: pure value transforms used at build time only.
 */
import type { Metadata } from "next";

export const SITE_URL = "https://surfaced-x.pages.dev";
export const SITE_NAME = "Surfaced";
export const SITE_TAGLINE = "What the Internet Surfaced Today";
export const TWITTER_HANDLE = "@xSurfaced";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/icon.svg`;

/** Build a canonical absolute URL from a path or absolute URL. */
export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return SITE_URL;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://"))
    return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}

/** Trim a description to the SEO sweet-spot (≤ 160 chars without breaking words). */
export function trimDescription(s: string, max = 160): string {
  if (!s) return "";
  const cleaned = s.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  // Cut at last word boundary before max
  const cut = cleaned.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max - 30 ? cut.slice(0, lastSpace) : cut).replace(
    /[,.;:\s]+$/,
    ""
  ) + "…";
}

export interface BuildMetadataInput {
  title: string;
  description: string;
  /** Page path, relative to SITE_URL. e.g. "/discover" or "/item/foo" */
  path: string;
  /** Optional OG/Twitter image absolute URL. Falls back to DEFAULT_OG_IMAGE. */
  image?: string | null;
  /**
   * OG type. Defaults to "website" for index pages, "article" for items.
   * "product" is intentionally not supported here — set it via `other:
   * { "og:type": "product" }` to avoid Next.js OpenGraph type constraints.
   */
  ogType?: "website" | "article";
  /** Set to true to suppress site-name suffix and use the title as-is. */
  absoluteTitle?: boolean;
  /** Mark page as noindex (still followable). */
  noindex?: boolean;
  /** Extra metadata to merge in (e.g. schema-specific og:type). */
  other?: Record<string, string>;
  /** Article publish date (item pages). */
  publishedTime?: string;
  /** Article modified date — must be stable across builds (not new Date()). */
  modifiedTime?: string;
}

/**
 * Build a complete Next.js Metadata object with every field populated.
 *
 * Guarantees:
 *  - alternates.canonical is absolute and matches the path
 *  - openGraph.url and twitter mirror canonical
 *  - openGraph and twitter both get title, description, image
 *  - title is suffixed with " — Surfaced" unless absoluteTitle is true
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const url = absoluteUrl(input.path);
  const description = trimDescription(input.description);
  const image = input.image || DEFAULT_OG_IMAGE;
  const titleStr = input.absoluteTitle
    ? input.title
    : `${input.title} — ${SITE_NAME}`;

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: titleStr,
      description,
      url,
      siteName: SITE_NAME,
      type: input.ogType || "website",
      images: image ? [{ url: image, width: 1200, height: 630, alt: input.title }] : [],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: image ? [image] : [],
      creator: TWITTER_HANDLE,
      site: TWITTER_HANDLE,
    },
    robots: input.noindex
      ? { index: false, follow: true }
      : undefined, // inherit root layout's robots
    ...(input.other ? { other: input.other } : {}),
  };
}

/**
 * Stable build-date used for `dateModified` in JSON-LD and sitemap entries that
 * don't have an explicit per-item modification date.
 *
 * It's bucketed to the day so re-running `next build` on the same calendar day
 * doesn't churn the timestamp; this keeps Google's freshness signal honest.
 */
export function getBuildDate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
