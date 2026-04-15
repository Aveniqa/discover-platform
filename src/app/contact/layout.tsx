import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Partnerships",
  description:
    "Get in touch with the Surfaced team. Partnerships, press, advertising, and general inquiries.",
  openGraph: {
    title: "Contact & Partnerships",
    description:
      "Get in touch with the Surfaced team for partnerships, press, and inquiries.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
