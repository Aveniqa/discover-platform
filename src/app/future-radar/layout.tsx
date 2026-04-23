import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Future Technology & Emerging Innovations",
  description:
    "110 emerging technologies reshaping our world — from gene editing to quantum computing to space tech. Curated daily by Surfaced.",
  alternates: {
    canonical: "https://surfaced-x.pages.dev/future-radar",
    types: { "application/rss+xml": "/feeds/future-radar.xml" },
  },
  openGraph: {
    title: "Future Technology & Emerging Innovations",
    description:
      "110 emerging technologies reshaping our world — from gene editing to quantum computing to space tech.",
    url: "https://surfaced-x.pages.dev/future-radar",
    type: "website",
    images: [{ url: "https://surfaced-x.pages.dev/og/category-future-radar.png", width: 1200, height: 630, alt: "Future Radar — Surfaced" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Future Technology & Emerging Innovations",
    description:
      "Emerging technologies reshaping our world — gene editing, quantum computing, space tech, and more.",
    images: ["https://surfaced-x.pages.dev/og/category-future-radar.png"],
  },
};

export default function FutureRadarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
