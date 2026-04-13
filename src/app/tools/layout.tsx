import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Tools",
  description: "Useful tools and utilities for everyday life — curated daily by Surfaced.",
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
