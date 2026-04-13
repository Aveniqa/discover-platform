import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trending Products",
  description: "Products people are actually buying right now — trending gadgets, gear, and tech curated daily by Surfaced.",
};

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
