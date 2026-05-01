import {
  collections_data,
  getItemBySlug,
  getItemTitle,
  getItemExcerpt,
  getCategoryColor,
  getCategoryLabel,
  type AnyItem,
} from "@/lib/data";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { ItemImage } from "@/components/ui/ItemImage";
import { buildMetadata } from "@/lib/seo";
import { collectionPageLd, breadcrumbLd, ldScript } from "@/lib/jsonld";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return collections_data.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const col = collections_data.find((c) => c.slug === slug);
  if (!col) return {};
  return buildMetadata({
    title: `${col.title} Collection`,
    description: col.description,
    path: `/collections/${slug}`,
  });
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const col = collections_data.find((c) => c.slug === slug);
  if (!col) notFound();

  const items: AnyItem[] = col.itemSlugs
    .map((s) => getItemBySlug(s))
    .filter(Boolean) as AnyItem[];

  const collectionLd = collectionPageLd({
    title: col.title,
    description: col.description,
    url: `/collections/${slug}`,
    items: items.map((it) => ({ url: `/item/${it.slug}`, name: getItemTitle(it) })),
  });
  const crumbsLd = breadcrumbLd([
    { name: "Home", href: "/" },
    { name: "Collections", href: "/collections" },
    { name: col.title },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(collectionLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(crumbsLd)} />
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/4 w-[480px] h-[480px] rounded-full bg-accent/6 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors mb-10"
          >
            ← All Collections
          </Link>
          <div className="text-center">
            <span className="text-5xl mb-4 block">{col.emoji}</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4">
              {col.title}
            </h1>
            <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
              {col.description}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {items.length} curated items
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/item/${item.slug}`}
              className="group block rounded-2xl border border-border/60 bg-surface card-hover-glow transition-all h-full overflow-hidden"
            >
              <div className="overflow-hidden">
                <ItemImage
                  slug={item.slug}
                  alt={getItemTitle(item)}
                  aspectRatio="3/2"
                  width={400}
                  height={267}
                  className="group-hover:scale-[1.03] transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <CategoryBadge
                    label={getCategoryLabel(item.type)}
                    color={getCategoryColor(item.type)}
                  />
                  <BookmarkButton slug={item.slug} />
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-1">
                  {getItemTitle(item)}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {getItemExcerpt(item)}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No items in this collection yet.</p>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Browse all collections
          </Link>
        </div>
      </section>
    </>
  );
}
