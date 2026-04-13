import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Future Radar",
  description: "Emerging technologies shaping the world ahead — breakthroughs and trends curated daily by Surfaced.",
};

export default function FutureRadarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
