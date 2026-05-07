import type { Metadata } from "next";
import { discoveries } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbLd, itemListLd, ldScript } from "@/lib/jsonld";

const count = discoveries.length;
const title = "Fascinating Discoveries — Mind-Blowing Facts You Didn't Know";
const description = `Explore ${count.toLocaleString()} incredible discoveries, from forgotten history to bizarre science. Updated daily with new fascinating finds curated by Surfaced.`;

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/discover",
  absoluteTitle: true,
});

// Hub-page structured data: breadcrumbs help SERP rendering, the ItemList
// surfaces the 30 newest items as a carousel-eligible list. Computed once at
// module load — same data the page renders, so no drift.
const HUB_NAME = "Discoveries";
const breadcrumbsLd = breadcrumbLd([
  { name: "Home", href: "/" },
  { name: HUB_NAME },
]);
const listLd = itemListLd(
  [...discoveries]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 30)
    .map((i) => ({ url: `/item/${i.slug}`, name: i.title })),
  HUB_NAME,
);

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(breadcrumbsLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(listLd)} />
      {children}
    </>
  );
}
