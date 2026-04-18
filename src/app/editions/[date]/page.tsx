import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEditionDates,
  getEdition,
  formatEditionDate,
} from "@/lib/editions";
import {
  getItemTitle,
  getItemDescription,
  getCategoryLabel,
  getCategoryPath,
  type AnyItem,
} from "@/lib/data";
import { getItemImageUrl, getOgImageUrl } from "@/lib/images";

type Props = { params: Promise<{ date: string }> };

export async function generateStaticParams() {
  return getEditionDates().map((date) => ({ date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const ed = getEdition(date);
  if (!ed) return { title: "Edition not found" };
  const formatted = formatEditionDate(date);
  const title = `Surfaced Edition · ${formatted}`;
  const desc = `${ed.items.length} fresh picks from ${formatted}: ${Object.entries(
    ed.countByType
  )
    .map(([t, n]) => `${n} ${getCategoryLabel(t).toLowerCase()}${n === 1 ? "" : "s"}`)
    .join(", ")}.`;
  const url = `https://surfaced-x.pages.dev/editions/${date}`;
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      url,
      type: "article",
    },
  };
}

export default async function EditionPage({ params }: Props) {
  const { date } = await params;
  const ed = getEdition(date);
  if (!ed) notFound();

  const url = `https://surfaced-x.pages.dev/editions/${date}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: `Surfaced Edition · ${formatEditionDate(date)}`,
    datePublished: date,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    publisher: {
      "@type": "Organization",
      name: "Surfaced",
      logo: {
        "@type": "ImageObject",
        url: "https://surfaced-x.pages.dev/icon.svg",
      },
    },
    about: {
      "@type": "ItemList",
      numberOfItems: ed.items.length,
      itemListElement: ed.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://surfaced-x.pages.dev/item/${item.slug}`,
        name: getItemTitle(item),
      })),
    },
  };

  const grouped = groupByType(ed.items);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <nav className="mb-6 text-sm text-muted">
          <Link href="/editions" className="hover:text-accent">
            ← All editions
          </Link>
        </nav>

        <header className="mb-12 pb-8 border-b border-border">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">
            Daily Edition
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
            {formatEditionDate(date)}
          </h1>
          <p className="mt-5 text-lg text-muted">
            {ed.items.length} items surfaced ·{" "}
            {Object.entries(ed.countByType)
              .map(([t, n]) => `${n} ${getCategoryLabel(t).toLowerCase()}${n === 1 ? "" : "s"}`)
              .join(" · ")}
          </p>
        </header>

        <div className="space-y-12">
          {Object.entries(grouped).map(([type, items]) => (
            <section key={type}>
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="text-2xl font-bold text-foreground">
                  {getCategoryLabel(type)}
                  {items.length === 1 ? "" : "s"}
                </h2>
                <Link
                  href={getCategoryPath(type)}
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  More →
                </Link>
              </div>
              <ul className="space-y-3">
                {items.map((item) => {
                  const ogPng = getOgImageUrl(item.slug);
                  const img = ogPng || getItemImageUrl(item.slug, 200, 200, "sm");
                  return (
                    <li key={item.slug}>
                      <Link
                        href={`/item/${item.slug}`}
                        className="group flex gap-4 rounded-xl border border-border bg-card p-4 hover:border-accent/50 hover:bg-card/80 transition-colors"
                      >
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            loading="lazy"
                            className="w-24 h-24 rounded-lg object-cover flex-shrink-0 bg-card"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-accent/30 to-cyan/20 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-1">
                            {getItemTitle(item)}
                          </h3>
                          <p className="mt-1 text-sm text-muted line-clamp-2">
                            {getItemDescription(item)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </>
  );
}

function groupByType(items: AnyItem[]): Record<string, AnyItem[]> {
  const out: Record<string, AnyItem[]> = {};
  for (const i of items) {
    (out[i.type] ||= []).push(i);
  }
  return out;
}
