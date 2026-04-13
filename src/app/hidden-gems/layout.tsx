import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hidden Gems",
  description: "Brilliant websites and tools most people haven't found yet — curated daily by Surfaced.",
};

export default function HiddenGemsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
