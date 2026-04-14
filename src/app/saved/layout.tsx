import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Items",
  description:
    "Your bookmarked discoveries, products, and finds — all in one place.",
  robots: { index: false },
};

export default function SavedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
