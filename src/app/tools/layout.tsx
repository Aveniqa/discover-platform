import type { Metadata } from "next";
import { dailyTools } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbLd, itemListLd, ldScript } from "@/lib/jsonld";

const count = dailyTools.length;
const title = "Best Daily Tools for Productivity, Design & Development";
const description = `${count.toLocaleString()} essential tools for creators, developers, and professionals. Free and paid — all personally vetted and curated daily by Surfaced.`;

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/tools",
  absoluteTitle: true,
});

const HUB_NAME = "Daily Tools";
const breadcrumbsLd = breadcrumbLd([
  { name: "Home", href: "/" },
  { name: HUB_NAME },
]);
const listLd = itemListLd(
  [...dailyTools]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 30)
    .map((i) => ({ url: `/item/${i.slug}`, name: i.toolName })),
  HUB_NAME,
);

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(breadcrumbsLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(listLd)} />
      {children}
    </>
  );
}
