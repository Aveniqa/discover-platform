import type { Metadata } from "next";
import { products } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbLd, itemListLd, ldScript } from "@/lib/jsonld";

const count = products.length;
const year = new Date().getUTCFullYear();
const title = `Trending Products Worth Buying in ${year}`;
const description = `${count.toLocaleString()} curated products across tech, home, fitness, and outdoors — each hand-picked with honest reviews and price comparisons. Updated daily by Surfaced.`;

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/trending",
  absoluteTitle: true,
});

const HUB_NAME = "Trending Products";
const breadcrumbsLd = breadcrumbLd([
  { name: "Home", href: "/" },
  { name: HUB_NAME },
]);
const listLd = itemListLd(
  [...products]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 30)
    .map((i) => ({ url: `/item/${i.slug}`, name: i.title })),
  HUB_NAME,
);

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(breadcrumbsLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(listLd)} />
      {children}
    </>
  );
}
