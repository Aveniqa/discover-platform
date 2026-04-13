import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discoveries",
  description: "Fascinating facts, breakthroughs, and surprising things worth knowing — curated daily by Surfaced.",
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
