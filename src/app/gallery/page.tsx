import Link from "next/link";
import {
  hiddenGems,
  dailyTools,
  getItemTitle,
  getItemCategory,
  getItemExcerpt,
  getItemScreenshot,
  type AnyItem,
} from "@/lib/data";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbLd, itemListLd, ldScript } from "@/lib/jsonld";
import { GalleryRing, type GalleryEntry } from "@/components/gallery/GalleryRing";
import { SectionDepth } from "@/components/ui/SectionDepth";
import { CategoryBadge } from "@/components/ui/CategoryBadge";

export const metadata = buildMetadata({
  title: "3D Gallery — the internet's best tools, in the round",
  seoTitle: "3D Tool Gallery — Surfaced",
  description:
    "Spin through real screenshots of the most useful tools and hidden gems Surfaced has covered — a 3D gallery of the software actually worth your attention.",
  path: "/gallery",
});

export default function GalleryPage() {
  // Newest items that have a real self-hosted screenshot, balanced across verticals
  const pick = (items: AnyItem[], n: number) =>
    [...items]
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .filter((i) => (getItemScreenshot(i) || "").startsWith("/screenshots/"))
      .slice(0, n);

  const featured = [...pick(dailyTools as AnyItem[], 9), ...pick(hiddenGems as AnyItem[], 9)];
  const entries: GalleryEntry[] = featured.map((i) => ({
    slug: i.slug,
    title: getItemTitle(i),
    visual: getItemScreenshot(i)!,
    category: getItemCategory(i),
  }));

  const ld = itemListLd(
    entries.map((e) => ({ url: `/item/${e.slug}`, name: e.title })),
    "Surfaced 3D Gallery"
  );
  const crumbs = breadcrumbLd([{ name: "Home", href: "/" }, { name: "3D Gallery" }]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(ld)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(crumbs)} />

      <section className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden py-20">
        <div className="absolute inset-0 world-scrim pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 text-center px-4 mb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/70 font-semibold mb-3">
            The Gallery
          </p>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
            Eighteen picks,
            <span className="block bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent">
              in the round.
            </span>
          </h1>
          <p className="mt-4 text-white/80 max-w-xl mx-auto">
            Real screenshots of the newest tools and gems in the catalog. Drag or scroll to spin —
            click anything to read the take.
          </p>
        </div>
        <GalleryRing entries={entries} />
      </section>

      {/* Crawlable editorial index — the same items as accessible text content */}
      <section className="relative py-16 px-4 sm:px-6 border-t border-white/[0.05]">
        <div className="absolute inset-0 world-scrim pointer-events-none" aria-hidden="true" />
        <SectionDepth className="relative max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">Everything in the ring</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featured.map((item, i) => (
              <div key={item.slug} className={`plane-3d ${i % 2 ? "plane-rate-medium" : "plane-rate-slow"}`}>
                <Link
                  href={`/item/${item.slug}`}
                  data-cursor="hover"
                  className="alcove-card group block rounded-xl p-5 h-full"
                >
                  <CategoryBadge label={getItemCategory(item)} color="amber" className="mb-2" />
                  <h3 className="text-base font-semibold text-white group-hover:text-amber-300 transition-colors">
                    {getItemTitle(item)}
                  </h3>
                  <p className="mt-2 text-sm alcove-card-muted leading-relaxed line-clamp-2">
                    {getItemExcerpt(item, 140)}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </SectionDepth>
      </section>
    </>
  );
}
