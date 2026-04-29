import type { Metadata } from "next";
import { futureRadar } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

const count = futureRadar.length;
const title = "Future Technology & Emerging Innovations";
const description = `${count.toLocaleString()} emerging technologies reshaping our world — from gene editing to quantum computing to space tech. Curated daily by Surfaced.`;

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/future-radar",
  absoluteTitle: true,
});

export default function FutureRadarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
