import type { Metadata } from "next";
import { discoveries } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

const count = discoveries.length;
const title = "Fascinating Discoveries — Mind-Blowing Facts You Didn't Know";
const description = `Explore ${count.toLocaleString()} incredible discoveries, from forgotten history to bizarre science. Updated daily with new fascinating finds curated by Surfaced.`;

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/discover",
  absoluteTitle: true,
});

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
