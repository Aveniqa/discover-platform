import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchModal } from "@/components/ui/SearchModal";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://surfaced-x.pages.dev"),
  title: {
    default: "Surfaced — What the Internet Surfaced Today",
    template: "%s — Surfaced",
  },
  description:
    "Your daily discovery engine. Fascinating finds, trending products, hidden internet gems, and future technology — curated for the endlessly curious.",
  keywords: [
    "discovery",
    "trending products",
    "internet finds",
    "future technology",
    "AI tools",
    "daily discoveries",
    "hidden gems",
    "curated content",
  ],
  openGraph: {
    title: "Surfaced — What the Internet Surfaced Today",
    description:
      "Fascinating discoveries, trending products, hidden gems, and future technology — curated daily.",
    type: "website",
    siteName: "Surfaced",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Surfaced — What the Internet Surfaced Today",
    description:
      "Fascinating discoveries, trending products, hidden gems, and future technology — curated daily.",
    creator: "@surfaced",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="noise">
        <SearchModal />
        <Navbar />
        <main className="min-h-screen pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
