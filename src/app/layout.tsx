import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchModal } from "@/components/ui/SearchModal";
import { Analytics } from "@/components/Analytics";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { PrefetchLinks } from "@/components/ui/PrefetchLinks";
import { SITE_URL, SITE_NAME, TWITTER_HANDLE, DEFAULT_OG_IMAGE } from "@/lib/seo";
import { organizationLd, websiteLd, ldScript } from "@/lib/jsonld";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Root canonical is "/"; every nested page MUST set its own
  // alternates.canonical or it inherits this value (which would dupe content).
  alternates: { canonical: "/" },
  title: {
    default: `${SITE_NAME} — ${"What the Internet Surfaced Today"}`,
    template: `%s — ${SITE_NAME}`,
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
    title: `${SITE_NAME} — What the Internet Surfaced Today`,
    description:
      "Fascinating discoveries, trending products, hidden gems, and future technology — curated daily.",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — What the Internet Surfaced Today`,
    description:
      "Fascinating discoveries, trending products, hidden gems, and future technology — curated daily.",
    creator: TWITTER_HANDLE,
    site: TWITTER_HANDLE,
    images: [DEFAULT_OG_IMAGE],
  },
  verification: {
    google: "6WKQAe4TdWU2yAH-KF_Sivy8NZgZOvxyhHvdDd2bRTQ",
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
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://www.amazon.com" />
        <link rel="dns-prefetch" href="https://cdn.pixabay.com" />
        {/* Google AdSense — verification + auto ads */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8054019783472830"
          crossOrigin="anonymous"
        />
      </head>
      <body className="noise">
        <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(websiteLd())} />
        <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(organizationLd())} />
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
