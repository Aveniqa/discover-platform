import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Saved Items",
  description:
    "Your bookmarked discoveries, products, and finds — all in one place.",
  path: "/saved",
  noindex: true,
});

export default function SavedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
