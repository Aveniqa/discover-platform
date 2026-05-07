import type { Metadata } from "next";
import { futureRadar } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbLd, itemListLd, ldScript } from "@/lib/jsonld";

const count = futureRadar.length;
const title = "Future Technology & Emerging Innovations";
const description = `${count.toLocaleString()} emerging technologies reshaping our world — from gene editing to quantum computing to space tech. Curated daily by Surfaced.`;

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/future-radar",
  absoluteTitle: true,
});

const HUB_NAME = "Future Radar";
const breadcrumbsLd = breadcrumbLd([
  { name: "Home", href: "/" },
  { name: HUB_NAME },
]);
const listLd = itemListLd(
  [...futureRadar]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 30)
    .map((i) => ({ url: `/item/${i.slug}`, name: i.techName })),
  HUB_NAME,
);

export default function FutureRadarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(breadcrumbsLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(listLd)} />
      {children}
    </>
  );
}
