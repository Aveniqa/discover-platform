import type { Metadata } from "next";
import Link from "next/link";
import archiveData from "@/../data/archive.json";
import { buildMetadata } from "@/lib/seo";
import { type AnyItem, getItemTitle, getItemExcerpt } from "@/lib/data";
import { ItemImage } from "@/components/ui/ItemImage";
import { alcoveByKind } from "@/lib/alcoves";
import { AlcoveBackdrop } from "@/components/3d/AlcoveBackdrop";
import { TiltCard3D } from "@/components/ui/TiltCard3D";

export const metadata: Metadata = buildMetadata({
  title: "Discoveries — Archive",
  description:
    "An archive of science and discovery briefs published on Surfaced. Surfaced now focuses on software and tools — these older posts remain online.",
  path: "/discover",
});

export default function DiscoverArchivePage() {
  const items = (archiveData as AnyItem[])
    .filter((i) => i.type === "discovery")
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 60);

  return (
    <article>
      <section className="depth-scene relative min-h-[55vh] flex items-center overflow-hidden">
        <AlcoveBackdrop alcove={alcoveByKind("research")} trackScroll />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70 font-semibold mb-4">
            Archive · Discoveries
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-tight">
            The science archive.
          </h1>
          <p className="mt-5 text-white/85 text-lg leading-relaxed">
            Surfaced now focuses on software and useful corners of the internet — but the discoveries
            beat lives on here. Every brief stays online at its original URL.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              See what Surfaced covers now →
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white border border-white/20 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Today&rsquo;s edition
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-background py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm text-muted-foreground mb-8">
            Showing the {items.length} most-recent of {(archiveData as AnyItem[]).filter((i) => i.type === "discovery").length} archived discoveries.
          </p>
          <div className="depth-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, index) => (
              <TiltCard3D key={item.slug} className="rounded-2xl h-full" tiltDepth="medium" maxTilt={14} glowColor="34, 211, 238">
              <Link href={`/item/${item.slug}`} className="group block rounded-2xl border border-border bg-card overflow-hidden hover:border-accent/40 transition-all h-full">
                <div className="depth-layer-1 aspect-[16/10] overflow-hidden">
                  <ItemImage slug={item.slug} alt={getItemTitle(item)} aspectRatio="16/10" width={500} height={313} className={`${index === 0 ? "hero-zoom-out " : ""}group-hover:scale-[1.03] transition-transform duration-500`} />
                </div>
                <div className="p-5">
                  <p className="depth-layer-3 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Discovery</p>
                  <h3 className="depth-layer-2 text-base font-semibold leading-snug group-hover:text-accent transition-colors line-clamp-2">{getItemTitle(item)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{getItemExcerpt(item, 140)}</p>
                </div>
              </Link>
              </TiltCard3D>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
