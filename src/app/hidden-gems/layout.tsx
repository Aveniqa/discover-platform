import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hidden Gem Apps & Tools Most People Don't Know About",
  description:
    "134 under-the-radar apps, tools, and services that deserve more attention. From productivity to design to AI — curated daily by Surfaced.",
  alternates: { canonical: "https://surfaced-x.pages.dev/hidden-gems" },
  openGraph: {
    title: "Hidden Gem Apps & Tools Most People Don't Know About",
    description:
      "134 under-the-radar apps and tools that deserve more attention. From productivity to design to AI.",
    url: "https://surfaced-x.pages.dev/hidden-gems",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hidden Gem Apps & Tools",
    description:
      "Under-the-radar apps, tools, and services that deserve more attention.",
  },
};

export default function HiddenGemsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
