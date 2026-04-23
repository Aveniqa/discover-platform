import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hidden Gem Apps & Tools Most People Don't Know About",
  description:
    "134 under-the-radar apps, tools, and services that deserve more attention. From productivity to design to AI — curated daily by Surfaced.",
  alternates: {
    canonical: "https://surfaced-x.pages.dev/hidden-gems",
    types: { "application/rss+xml": "/feeds/hidden-gems.xml" },
  },
  openGraph: {
    title: "Hidden Gem Apps & Tools Most People Don't Know About",
    description:
      "134 under-the-radar apps and tools that deserve more attention. From productivity to design to AI.",
    url: "https://surfaced-x.pages.dev/hidden-gems",
    type: "website",
    images: [{ url: "https://surfaced-x.pages.dev/og/category-hidden-gems.png", width: 1200, height: 630, alt: "Hidden Gems — Surfaced" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hidden Gem Apps & Tools",
    description:
      "Under-the-radar apps, tools, and services that deserve more attention.",
    images: ["https://surfaced-x.pages.dev/og/category-hidden-gems.png"],
  },
};

export default function HiddenGemsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
