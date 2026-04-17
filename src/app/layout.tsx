import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchModal } from "@/components/ui/SearchModal";
import { Analytics } from "@/components/Analytics";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { PrefetchLinks } from "@/components/ui/PrefetchLinks";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://surfaced-x.pages.dev"),
  alternates: {
    canonical: "/",
  },
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
    creator: "@xSurfaced",
  },
  verification: {
    google: "fkbYRCrZQGx9tfcR4UBdZBW6aA3MugY2hCmSR6JSKbI",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
      <head>
        <meta name="impact-site-verification" content="1dd3812c-2540-4b06-b6c6-27528553b44d" />
        <Analytics />
        <link rel="alternate" type="application/rss+xml" title="Surfaced" href="/feed.xml" />
        {/* Preconnect to image CDNs for faster above-the-fold loads */}
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="dns-prefetch" href="https://www.amazon.com" />
        {process.env.NEXT_PUBLIC_ADSENSE_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="noise">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Surfaced",
            url: "https://surfaced-x.pages.dev",
            description: "Your daily discovery engine. Curated products, hidden gems, future tech, and fascinating finds.",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://surfaced-x.pages.dev/?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }) }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:font-semibold focus:text-sm focus:shadow-lg"
        >
          Skip to content
        </a>
        <SearchModal />
        <Navbar />
        <main id="main-content" className="min-h-screen pt-16">{children}</main>
        <Footer />
        <ServiceWorkerRegistration />
        <PrefetchLinks />
      </body>
    </html>
  );
}
