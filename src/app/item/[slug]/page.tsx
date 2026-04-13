import {
  getAllItems,
  getItemBySlug,
  getItemTitle,
  getItemDescription,
  getItemCategory,
  getItemWhyText,
  getItemOutboundUrl,
  getCtaLabel,
  getWhyHeading,
  getCategoryColor,
  getCategoryLabel,
  getCategoryNavLabel,
  getCategoryPath,
  getRelatedItems,
  discoveries,
  products,
  hiddenGems,
  futureRadar,
  dailyTools,
  type AnyItem,
  type Product,
  type FutureTech,
} from "@/lib/data";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { ItemImage } from "@/components/ui/ItemImage";
import { PromoCode } from "@/components/ui/PromoCode";
import { StickyCTA } from "@/components/ui/StickyCTA";
import { isPexelsImage } from "@/lib/images";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

/* ---- Cross-category recommendations ---- */
function getCrossCategoryItems(item: AnyItem, count = 4): AnyItem[] {
  const currentType = item.type;
  const title = getItemTitle(item).toLowerCase();
  const category = getItemCategory(item).toLowerCase();
  const description = getItemDescription(item).toLowerCase();

  // Build keyword set from title words + category
  const keywords = new Set<string>(
    [...title.split(/\s+/), ...category.split(/[\s/&]+/)]
      .map((w) => w.replace(/[^a-z]/g, ""))
      .filter((w) => w.length > 3)
  );

  const allItems = getAllItems();
  const seenTypes = new Set<string>([currentType]);
  const results: AnyItem[] = [];

  // Score each item from a different category by keyword overlap
  const scored = allItems
    .filter((i) => i.type !== currentType)
    .map((i) => {
      const iTitle = getItemTitle(i).toLowerCase();
      const iCat = getItemCategory(i).toLowerCase();
      const iDesc = getItemDescription(i).toLowerCase();
      const combined = `${iTitle} ${iCat} ${iDesc}`;
      let score = 0;
      for (const kw of keywords) {
        if (combined.includes(kw)) score++;
      }
      // Bonus: description of current item mentions the other item's category
      if (description.includes(iCat)) score += 2;
      return { item: i, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Pick max 1 per type
  for (const { item: candidate } of scored) {
    if (results.length >= count) break;
    if (seenTypes.has(candidate.type)) continue;
    seenTypes.add(candidate.type);
    results.push(candidate);
  }

  return results;
}

/* ---- Static Params ---- */
export function generateStaticParams() {
  return getAllItems().map((item) => ({ slug: item.slug }));
}

/* ---- Metadata ---- */
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) return {};
  const title = getItemTitle(item);
  const desc = getItemDescription(item);
  return {
    title: title,
    description: desc,
    openGraph: { title, description: desc, type: "article", url: `/item/${slug}` },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

/* ---- Development Stage Progress ---- */
const FUTURE_TECH_STAGES = [
  "Early Research",
  "Advanced Research",
  "Prototype",
  "Early Commercialization",
  "Growth Phase",
];

function DevelopmentStageBar({ currentStage }: { currentStage: string }) {
  const activeIdx = FUTURE_TECH_STAGES.findIndex(
    (s) => s.toLowerCase() === currentStage.toLowerCase()
  );

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Development Stage
      </h3>
      <div className="relative flex items-center justify-between">
        {/* Track line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-border" />
        {/* Filled line */}
        {activeIdx >= 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-cyan-400 transition-all"
            style={{ width: `${(activeIdx / (FUTURE_TECH_STAGES.length - 1)) * 100}%` }}
          />
        )}

        {FUTURE_TECH_STAGES.map((stage, idx) => {
          const isActive = idx <= activeIdx;
          const isCurrent = idx === activeIdx;
          return (
            <div key={stage} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  isCurrent
                    ? "bg-cyan-400 border-cyan-400 ring-4 ring-cyan-400/20"
                    : isActive
                    ? "bg-cyan-400 border-cyan-400"
                    : "bg-surface border-border"
                }`}
              />
              <span
                className={`mt-2 text-[10px] sm:text-xs text-center leading-tight max-w-[4.5rem] ${
                  isCurrent ? "text-cyan-400 font-semibold" : "text-muted-foreground"
                }`}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- CTA Button Styles ---- */
const ctaStyles: Record<string, string> = {
  product:
    "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-[0_0_25px_rgba(52,211,153,0.2)] hover:shadow-[0_0_40px_rgba(52,211,153,0.3)]",
  default: "btn-gradient",
};

/* ---- Page ---- */
export default async function ItemPage({ params }: Props) {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) notFound();

  const title = getItemTitle(item);
  const description = getItemDescription(item);
  const category = getItemCategory(item);
  const whyText = getItemWhyText(item);
  const color = getCategoryColor(item.type);
  const label = getCategoryLabel(item.type);
  const navLabel = getCategoryNavLabel(item.type);
  const backPath = getCategoryPath(item.type);
  const relatedItems = getRelatedItems(item, 4);
  const crossItems = getCrossCategoryItems(item, 4);
  const outboundUrl = getItemOutboundUrl(item);

  // Prev / next within the same type array
  const typeArrayMap: Record<string, AnyItem[]> = {
    discovery: discoveries as AnyItem[],
    product: products as AnyItem[],
    "hidden-gem": hiddenGems as AnyItem[],
    "future-tech": futureRadar as AnyItem[],
    tool: dailyTools as AnyItem[],
  };
  const categoryItems = typeArrayMap[item.type] || [];
  const currentIndex = categoryItems.findIndex((i) => i.slug === slug);
  const prevItem = currentIndex > 0 ? categoryItems[currentIndex - 1] : null;
  const nextItem = currentIndex < categoryItems.length - 1 ? categoryItems[currentIndex + 1] : null;
  const ctaLabel = getCtaLabel(item);
  const isAffiliate = item.affiliate?.enabled || item.type === "product";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: `/item/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero image (full-width) ───────────────────── */}
      <div className="w-full overflow-hidden border-b border-border/30 relative">
        <ItemImage slug={slug} alt={title} width={1200} height={686} aspectRatio="16/7" size="lg" />
        {isPexelsImage(slug) && (
          <p className="absolute bottom-2 right-3 text-[10px] text-white/30">
            Photo via Pexels
          </p>
        )}
      </div>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* ── Back link ───────────────────────────────────── */}
          <Link
            href={backPath}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent-hover transition-colors mb-10"
          >
            <span aria-hidden="true">&larr;</span>
            Back to {navLabel}
          </Link>

          {/* ── Badge + Title ───────────────────────────────── */}
          <div className="mb-8">
            <CategoryBadge color={color} label={label} size="md" className="mb-4" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              {title}
            </h1>

            {/* Editorial byline */}
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Curated by Surfaced Editorial</span>
              <span className="text-border">&middot;</span>
              <span>{category}</span>
            </div>

            {/* Price range badge for products */}
            {item.type === "product" && (
              <span className="mt-5 inline-flex items-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-4 py-1.5 text-sm font-bold shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                {(item as Product).estimatedPriceRange}
              </span>
            )}
          </div>

          {/* ── Full description ────────────────────────────── */}
          <ScrollReveal>
            <div className="mb-12">
              <p className="text-lg sm:text-xl text-muted-foreground leading-[1.8]">
                {description}
              </p>
            </div>
          </ScrollReveal>

          {/* ── Why section ─────────────────────────────────── */}
          {whyText && (
            <ScrollReveal delay={100}>
              <div className="mb-12 rounded-xl border border-border bg-card p-7 sm:p-10 editorial-block">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                  {getWhyHeading(item.type)}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{whyText}</p>
              </div>
            </ScrollReveal>
          )}

          {/* ── Development stage (future-tech only) ─────────── */}
          {item.type === "future-tech" && (
            <ScrollReveal delay={150}>
              <div className="mb-12 rounded-xl border border-border bg-card p-7 sm:p-10">
                <DevelopmentStageBar currentStage={(item as FutureTech).developmentStage} />
              </div>
            </ScrollReveal>
          )}

          {/* ── CTA button (all item types with outbound URL) ── */}
          {outboundUrl && (
            <ScrollReveal delay={150}>
              <div className="mb-10">
                <a
                  href={outboundUrl}
                  target="_blank"
                  rel={isAffiliate ? "sponsored noopener" : "noopener"}
                  data-affiliate={isAffiliate ? "true" : "false"}
                  data-provider={item.affiliate?.provider || ""}
                  data-item-slug={slug}
                  data-item-category={category}
                  data-item-type={item.type}
                  id="main-cta-button"
                  className={`inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-white font-bold text-base hover:-translate-y-0.5 transition-all ${
                    ctaStyles[item.type] || ctaStyles.default
                  }`}
                >
                  {ctaLabel}
                  <span aria-hidden="true">&rarr;</span>
                </a>

                {/* Affiliate badge */}
                {isAffiliate && (
                  <p className="text-xs text-muted-foreground/50 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                    </svg>
                    Affiliate link
                  </p>
                )}

                {/* Promo code */}
                {item.promoCode && <PromoCode code={item.promoCode} />}

                {/* Affiliate disclosure */}
                {isAffiliate && (
                  <p className="text-xs text-white/40 mt-3">
                    Some links may earn Surfaced a small commission — at no extra cost to you.{" "}
                    <Link href="/affiliate-disclosure" className="text-accent/60 hover:text-accent transition-colors underline underline-offset-2">
                      Learn more
                    </Link>
                  </p>
                )}
              </div>
            </ScrollReveal>
          )}

          {/* ── Share + Bookmark row ────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-10 pb-10 border-b border-border/50">
            <ShareButtons title={title} slug={slug} />
            <BookmarkButton slug={slug} size="md" />
          </div>

          {/* ── Prev / Next navigation ──────────────────────── */}
          {(prevItem || nextItem) && (
            <div className="flex justify-between items-center py-6 border-b border-border mb-10">
              {prevItem ? (
                <Link
                  href={`/item/${prevItem.slug}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group max-w-[45%]"
                >
                  <span className="group-hover:-translate-x-1 transition-transform shrink-0">←</span>
                  <span className="truncate">{getItemTitle(prevItem)}</span>
                </Link>
              ) : (
                <div />
              )}
              {nextItem ? (
                <Link
                  href={`/item/${nextItem.slug}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group max-w-[45%] ml-auto text-right"
                >
                  <span className="truncate">{getItemTitle(nextItem)}</span>
                  <span className="group-hover:translate-x-1 transition-transform shrink-0">→</span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}

          {/* ── Related items ───────────────────────────────── */}
          {relatedItems.length > 0 && (
            <ScrollReveal delay={200}>
              <div className="mb-16">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
                  More Like This
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedItems.map((related) => {
                    const relTitle = getItemTitle(related);
                    const relDesc = getItemDescription(related);
                    const relColor = getCategoryColor(related.type);
                    const relLabel = getCategoryLabel(related.type);
                    return (
                      <Link
                        key={related.slug}
                        href={`/item/${related.slug}`}
                        className="group relative rounded-xl border border-border bg-card overflow-hidden card-hover-glow transition-all"
                      >
                        <ItemImage slug={related.slug} alt={relTitle} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                        <div className="p-5">
                          <CategoryBadge color={relColor} label={relLabel} className="mb-3" />
                          <h3 className="font-bold text-foreground group-hover:text-accent-hover transition-colors line-clamp-2 mb-2">
                            {relTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{relDesc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-6 text-right">
                  <Link
                    href={backPath}
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
                  >
                    Continue exploring {navLabel} <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ── Cross-category related picks ───────────────── */}
          {crossItems.length > 0 && (
            <ScrollReveal delay={220}>
              <div className="mb-16">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Explore Related
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  From{" "}
                  {crossItems.map((i) => getCategoryLabel(i.type)).join(", ")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {crossItems.map((related) => {
                    const relTitle = getItemTitle(related);
                    const relDesc = getItemDescription(related);
                    const relColor = getCategoryColor(related.type);
                    const relLabel = getCategoryLabel(related.type);
                    return (
                      <Link
                        key={related.slug}
                        href={`/item/${related.slug}`}
                        className="group relative rounded-xl border border-border bg-card overflow-hidden card-hover-glow transition-all"
                      >
                        <ItemImage slug={related.slug} alt={relTitle} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                        <div className="p-5">
                          <CategoryBadge color={relColor} label={relLabel} className="mb-3" />
                          <h3 className="font-bold text-foreground group-hover:text-accent-hover transition-colors line-clamp-2 mb-2">
                            {relTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{relDesc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ── Newsletter CTA ──────────────────────────────── */}
          <ScrollReveal delay={250}>
            <div className="rounded-xl border border-border bg-surface-elevated/50 p-8 sm:p-10 text-center">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
                Enjoyed this? Get five picks like this every morning.
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Free daily newsletter — zero spam, unsubscribe anytime.
              </p>
              <div className="max-w-sm mx-auto">
                <NewsletterForm variant="minimal" data-capture-location="detail-page" />
              </div>
            </div>
          </ScrollReveal>

          {/* AD_ZONE: detail-page-bottom */}
        </div>
      </section>

      {/* Sticky bottom CTA — appears when main CTA scrolls out of view */}
      {outboundUrl && (
        <StickyCTA
          title={title}
          priceRange={item.type === "product" ? (item as Product).estimatedPriceRange : undefined}
          ctaUrl={outboundUrl}
          isAffiliate={isAffiliate}
          itemType={item.type}
        />
      )}
    </>
  );
}
