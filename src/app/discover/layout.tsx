import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fascinating Discoveries — Mind-Blowing Facts You Didn't Know",
  description:
    "Explore 120+ incredible discoveries, from forgotten history to bizarre science. Updated daily with new fascinating finds curated by Surfaced.",
  alternates: {
    canonical: "https://surfaced-x.pages.dev/discover",
    types: { "application/rss+xml": "/feeds/discoveries.xml" },
  },
  openGraph: {
    title: "Fascinating Discoveries — Mind-Blowing Facts You Didn't Know",
    description:
      "Explore 120+ incredible discoveries, from forgotten history to bizarre science. Updated daily.",
    url: "https://surfaced-x.pages.dev/discover",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fascinating Discoveries",
    description:
      "Mind-blowing facts, forgotten history, and bizarre science — updated daily.",
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
