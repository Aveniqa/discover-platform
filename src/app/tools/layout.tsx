import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Daily Tools for Productivity, Design & Development",
  description:
    "114 essential tools for creators, developers, and professionals. Free and paid — all personally vetted and curated daily by Surfaced.",
  alternates: {
    canonical: "https://surfaced-x.pages.dev/tools",
    types: { "application/rss+xml": "/feeds/daily-tools.xml" },
  },
  openGraph: {
    title: "Best Daily Tools for Productivity, Design & Development",
    description:
      "114 essential tools for creators, developers, and professionals. Free and paid — all personally vetted.",
    url: "https://surfaced-x.pages.dev/tools",
    type: "website",
    images: [{ url: "https://surfaced-x.pages.dev/og/category-tools.png", width: 1200, height: 630, alt: "Daily Tools — Surfaced" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Daily Tools",
    description:
      "Essential tools for creators, developers, and professionals — free and paid, all personally vetted.",
    images: ["https://surfaced-x.pages.dev/og/category-tools.png"],
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
