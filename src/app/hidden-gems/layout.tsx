import type { Metadata } from "next";
import { hiddenGems } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

const count = hiddenGems.length;
const title = "Hidden Gem Apps & Tools Most People Don't Know About";
const description = `${count.toLocaleString()} under-the-radar apps, tools, and services that deserve more attention. From productivity to design to AI — curated daily by Surfaced.`;

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/hidden-gems",
  absoluteTitle: true,
});

export default function HiddenGemsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
