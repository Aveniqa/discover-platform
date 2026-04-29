import type { Metadata } from "next";
import { products } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

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

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
