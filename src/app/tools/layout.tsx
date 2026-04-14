import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Daily Tools for Productivity, Design & Development",
  description:
    "114 essential tools for creators, developers, and professionals. Free and paid — all personally vetted and curated daily by Surfaced.",
  alternates: { canonical: "https://surfaced-x.pages.dev/tools" },
  openGraph: {
    title: "Best Daily Tools for Productivity, Design & Development",
    description:
      "114 essential tools for creators, developers, and professionals. Free and paid — all personally vetted.",
    url: "https://surfaced-x.pages.dev/tools",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Daily Tools | Surfaced",
    description:
      "Essential tools for creators, developers, and professionals — free and paid, all personally vetted.",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
