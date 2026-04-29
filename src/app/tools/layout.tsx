import type { Metadata } from "next";
import { dailyTools } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

const count = dailyTools.length;
const title = "Best Daily Tools for Productivity, Design & Development";
const description = `${count.toLocaleString()} essential tools for creators, developers, and professionals. Free and paid — all personally vetted and curated daily by Surfaced.`;

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/tools",
  absoluteTitle: true,
});

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
