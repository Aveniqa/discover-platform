import type { AnyItem } from "@/lib/data";
import { getItemTitle, getItemDescription } from "@/lib/data";

interface ItemListSchemaProps {
  items: AnyItem[];
  name: string;
  description: string;
  pagePath: string;
  max?: number;
}

/** Emits schema.org ItemList JSON-LD for a category landing page. */
export function ItemListSchema({ items, name, description, pagePath, max = 30 }: ItemListSchemaProps) {
  const base = "https://surfaced-x.pages.dev";
  const listElements = items.slice(0, max).map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${base}/item/${item.slug}`,
    name: getItemTitle(item),
    description: getItemDescription(item),
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${base}${pagePath}`,
    isPartOf: { "@type": "WebSite", name: "Surfaced", url: base },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: listElements,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
