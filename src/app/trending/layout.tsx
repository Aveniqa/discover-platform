import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trending Products Worth Buying in 2026",
  description:
    "135 curated products across tech, home, fitness, and outdoors — each hand-picked with honest reviews and price comparisons. Updated daily by Surfaced.",
  alternates: { canonical: "https://surfaced-x.pages.dev/trending" },
  openGraph: {
    title: "Trending Products Worth Buying in 2026",
    description:
      "135 curated products across tech, home, fitness, and outdoors — hand-picked with honest reviews.",
    url: "https://surfaced-x.pages.dev/trending",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trending Products Worth Buying | Surfaced",
    description:
      "Curated products across tech, home, fitness, and outdoors — with honest reviews and prices.",
  },
};

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
