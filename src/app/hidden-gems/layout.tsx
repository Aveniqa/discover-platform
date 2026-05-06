import type { Metadata } from "next";
import { hiddenGems } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbLd, itemListLd, ldScript } from "@/lib/jsonld";

const count = hiddenGems.length;
const title = "Hidden Gem Apps & Tools Most People Don't Know About";
const description = `${count.toLocaleString()} under-the-radar apps, tools, and services that deserve more attention. From productivity to design to AI — curated daily by Surfaced.`;

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/hidden-gems",
  absoluteTitle: true,
});

const HUB_NAME = "Hidden Gems";
const breadcrumbsLd = breadcrumbLd([
  { name: "Home", href: "/" },
  { name: HUB_NAME },
]);
const listLd = itemListLd(
  [...hiddenGems]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 30)
    .map((i) => ({ url: `/item/${i.slug}`, name: i.name })),
  HUB_NAME,
);

export default function HiddenGemsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(breadcrumbsLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(listLd)} />
      {children}
    </>
  );
}
