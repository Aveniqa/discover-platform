/**
 * Shared JSON-LD builders.
 *
 * Each helper returns a plain JS object that should be JSON.stringified into a
 * <script type="application/ld+json"> tag. Helpers refuse to invent data — if
 * a field is missing or unusable, the helper omits it (rather than returning
 * a placeholder that would fail Google's structured-data validator).
 */
import { SITE_URL, SITE_NAME, absoluteUrl } from "./seo";

/* ─── Primitives ─────────────────────────────────────────────── */

const ORG_NODE = {
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
};

/* ─── Page-level schemas ─────────────────────────────────────── */

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    ...ORG_NODE,
    sameAs: [
      "https://twitter.com/xSurfaced",
      "https://bsky.app/profile/xsurfaced.bsky.social",
      "https://www.pinterest.com/xSurfaced/",
    ],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Your daily discovery engine. Curated products, hidden gems, future tech, and fascinating finds.",
    publisher: ORG_NODE,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BreadcrumbCrumb {
  name: string;
  /** Absolute URL or path; if omitted, the crumb is treated as the current page (no `item` field). */
  href?: string;
}

export function breadcrumbLd(crumbs: BreadcrumbCrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: absoluteUrl(c.href) } : {}),
    })),
  };
}

export interface ArticleLdInput {
  title: string;
  description: string;
  url: string;
  image?: string | null;
  /** YYYY-MM-DD; omit if not stable. */
  datePublished?: string;
  /** YYYY-MM-DD; should be stable across builds — see seo.getBuildDate(). */
  dateModified?: string;
  authorName?: string;
}

export function articleLd(input: ArticleLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.url),
    ...(input.image ? { image: input.image } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    author: {
      "@type": "Organization",
      name: input.authorName || `${SITE_NAME} Editorial`,
    },
    publisher: ORG_NODE,
  };
}

export interface ProductLdInput {
  title: string;
  description: string;
  url: string;
  image?: string | null;
  brand?: string;
  /** Free-form price range from data; parser extracts low/high if present. */
  priceRange?: string;
  /** Outbound merchant URL (Amazon affiliate, etc.). */
  offerUrl?: string | null;
  /** Editorial review body (will be wrapped in a Review node). */
  reviewBody?: string;
}

/** Parse "$12 – $30" → { low: "12", high: "30" } */
function parsePrice(range?: string): { low?: string; high?: string } {
  if (!range) return {};
  const nums = range.replace(/,/g, "").match(/[\d]+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return {};
  return { low: nums[0], high: nums[nums.length - 1] };
}

/**
 * Heuristic brand extractor. Pulls a leading capitalised brand from a product
 * title. For multi-word brands we look at known prefixes, otherwise we take
 * the first 1–2 capitalised words.
 */
const KNOWN_BRAND_PREFIXES = [
  "Our Place",
  "Peak Design",
  "Click & Grow",
  "Goal Zero",
  "Sea to Summit",
  "Apple",
  "Sony",
  "Bose",
  "Samsung",
  "LG",
  "Dyson",
  "Anker",
  "Logitech",
  "Garmin",
  "Fitbit",
  "Withings",
  "Oura",
  "Whoop",
  "Theragun",
  "Hydro Flask",
  "Yeti",
  "Coleman",
  "Patagonia",
  "REI",
  "Black Diamond",
  "Tile",
  "Roborock",
  "iRobot",
  "Eufy",
  "Ring",
  "Nest",
  "Philips Hue",
  "Govee",
];

export function extractBrand(title: string): string | undefined {
  if (!title) return undefined;
  const lower = title.toLowerCase();
  for (const b of KNOWN_BRAND_PREFIXES) {
    if (lower.startsWith(b.toLowerCase())) return b;
  }
  // Take first 1-2 capitalised words; abandon if the first word is lowercase
  const tokens = title.split(/\s+/).slice(0, 3);
  if (!tokens[0] || /^[a-z]/.test(tokens[0])) return undefined;
  // Two capitalised words = likely "Brand Name Product…"
  if (tokens[1] && /^[A-Z]/.test(tokens[1]) && tokens[1].length > 1) {
    return `${tokens[0]} ${tokens[1]}`;
  }
  return tokens[0];
}

export function productLd(input: ProductLdInput) {
  const { low, high } = parsePrice(input.priceRange);
  const brand = input.brand || extractBrand(input.title);

  // Only emit AggregateOffer if we actually have a parseable price.
  // Returning undefined-priced offers fails Google's structured-data validator.
  const offers = low
    ? {
        "@type": low === high ? "Offer" : "AggregateOffer",
        priceCurrency: "USD",
        ...(low === high
          ? { price: low }
          : { lowPrice: low, ...(high ? { highPrice: high } : {}) }),
        availability: "https://schema.org/InStock",
        ...(input.offerUrl ? { url: input.offerUrl } : {}),
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.url),
    ...(input.image ? { image: input.image } : {}),
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    ...(offers ? { offers } : {}),
    ...(input.reviewBody
      ? {
          review: {
            "@type": "Review",
            author: { "@type": "Organization", name: SITE_NAME },
            reviewBody: input.reviewBody,
          },
        }
      : {}),
  };
}

export interface ItemListLdItem {
  url: string;
  name: string;
}

export function itemListLd(items: ItemListLdItem[], listName?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(listName ? { name: listName } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.url),
    })),
  };
}

export interface CollectionPageLdInput {
  title: string;
  description: string;
  url: string;
  items: ItemListLdItem[];
}

export function collectionPageLd(input: CollectionPageLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.url),
    publisher: ORG_NODE,
    mainEntity: itemListLd(input.items, input.title),
  };
}

/**
 * Helper to wrap a JSON-LD object into a `dangerouslySetInnerHTML` payload.
 * Use as: <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(obj)} />
 */
export function ldScript(obj: object): { __html: string } {
  return { __html: JSON.stringify(obj) };
}
