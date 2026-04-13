import { collections_data } from "@/lib/data";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections — Surfaced",
  description: "Curated themed groups of the best finds across all categories.",
};

export default function CollectionsPage() {
  return (
    <>
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/4 w-[480px] h-[480px] rounded-full bg-accent/8 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4">
            Collections
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
            Curated <span className="gradient-text">Collections</span>
          </h1>
          <p className="mt-5 text-muted text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Themed groups of the best finds — handpicked across all categories.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections_data.map((col) => (
            <Link
              key={col.slug}
              href={`/collections/${col.slug}`}
              className="group relative rounded-2xl border border-border/60 bg-surface p-8 hover:border-accent/30 card-hover-glow transition-all flex flex-col gap-4"
            >
              <span className="text-4xl">{col.emoji}</span>
              <div>
                <h2 className="text-xl font-bold text-foreground group-hover:text-accent transition-colors mb-2">
                  {col.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {col.description}
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {col.itemSlugs.length} items
                </span>
                <span className="text-sm font-medium text-accent group-hover:translate-x-1 transition-transform inline-block">
                  Browse →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
