import type { Metadata } from "next";
import Link from "next/link";
import { getEditionDates, getEdition, formatEditionDate } from "@/lib/editions";
import { getCategoryLabel } from "@/lib/data";

export const metadata: Metadata = {
  title: "Daily Editions — Every Surfaced Daily Drop",
  description:
    "Browse every daily edition of Surfaced. Each morning we surface fresh discoveries, products, hidden gems, future tech, and tools.",
  alternates: {
    canonical: "https://surfaced-x.pages.dev/editions",
    types: { "application/rss+xml": "/feed.xml" },
  },
  openGraph: {
    title: "Daily Editions — Surfaced",
    description: "Every daily drop of curated discoveries, products, gems, and tools.",
    url: "https://surfaced-x.pages.dev/editions",
    type: "website",
  },
};

export default function EditionsIndexPage() {
  const dates = getEditionDates();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Surfaced Daily Editions",
    description: "Archive of every daily edition.",
    url: "https://surfaced-x.pages.dev/editions",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: dates.length,
      itemListElement: dates.slice(0, 50).map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://surfaced-x.pages.dev/editions/${d}`,
        name: `Edition ${d}`,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <header className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">
            Archive
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Daily editions
          </h1>
          <p className="mt-5 text-lg text-muted max-w-2xl">
            Every morning Surfaced publishes a fresh drop of discoveries,
            products, hidden gems, future tech, and tools. Browse the archive
            below — or{" "}
            <Link href="/newsletter" className="text-accent hover:underline">
              subscribe to get it in your inbox
            </Link>
            .
          </p>
        </header>

        {dates.length === 0 ? (
          <p className="text-muted">No editions published yet. Check back soon.</p>
        ) : (
          <ol className="space-y-3">
            {dates.map((d) => {
              const ed = getEdition(d);
              if (!ed) return null;
              const total = ed.items.length;
              return (
                <li key={d}>
                  <Link
                    href={`/editions/${d}`}
                    className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-accent/50 hover:bg-card/80 transition-colors"
                  >
                    <div>
                      <div className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">
                        {formatEditionDate(d)}
                      </div>
                      <div className="mt-1 text-sm text-muted">
                        {Object.entries(ed.countByType)
                          .map(([t, n]) => `${n} ${getCategoryLabel(t).toLowerCase()}`)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-accent">
                      {total} items →
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </article>
    </>
  );
}
