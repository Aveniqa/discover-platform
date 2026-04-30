import {
  getAllItems,
  getItemBySlug,
  getItemTitle,
  getItemDescription,
  getItemExcerpt,
  getItemCategory,
  getItemWhyText,
  getItemOutboundUrl,
  getCtaLabel,
  getWhyHeading,
  getCategoryColor,
  getCategoryLabel,
  getCategoryNavLabel,
  getCategoryPath,
  discoveries,
  products,
  hiddenGems,
  futureRadar,
  dailyTools,
  type AnyItem,
  type Discovery,
  type Product,
  type FutureTech,
  type HiddenGem,
  type DailyTool,
} from "@/lib/data";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { BookmarkButton } from "@/components/ui/BookmarkButton";
import { ShareButtons } from "@/components/ui/ShareButtons";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { BackToTop } from "@/components/ui/BackToTop";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { ItemImage } from "@/components/ui/ItemImage";
import { PromoCode } from "@/components/ui/PromoCode";
import { StickyCTA } from "@/components/ui/StickyCTA";
import { BlurText } from "@/components/ui/BlurText";
import { AdSlot } from "@/components/ui/AdSlot";
import { LogoImage } from "@/components/ui/LogoImage";
import { ScreenshotImage } from "@/components/ui/ScreenshotImage";
import { isPexelsImage } from "@/lib/images";
import { getItemImageUrl } from "@/lib/images";
import { buildMetadata, getBuildDate } from "@/lib/seo";
import { articleLd, productLd, breadcrumbLd, ldScript } from "@/lib/jsonld";
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
  if (!item) return { title: "Not Found" };
  const title = getItemTitle(item);
  const desc = getItemDescription(item);
  const ogImage = getItemImageUrl(slug, 1200, 630, "og");
  const isProduct = item.type === "product";
  const priceRange = isProduct ? (item as Product).estimatedPriceRange : undefined;
  const dateAdded = (item as { dateAdded?: string }).dateAdded;

  // Optional SEO-tuned title — populated by scripts/backfill-seo-titles.mjs.
  // Falls back to `title` when missing. Visible H1 still uses the full title.
  const seoTitle = (item as { seoTitle?: string }).seoTitle;

  const meta = buildMetadata({
    title,
    seoTitle,
    description: desc,
    path: `/item/${slug}`,
    image: ogImage,
    ogType: "article",
    publishedTime: dateAdded,
    modifiedTime: dateAdded || getBuildDate(),
  });

  // Product-specific OG additions (don't overwrite ogType — product OG type
  // breaks Twitter card preview on some platforms).
  if (isProduct) {
    meta.other = {
      ...(meta.other || {}),
      ...(ogImage ? { "pinterest:media": ogImage } : {}),
      ...(priceRange ? { "product:price:amount": priceRange, "product:price:currency": "USD" } : {}),
    };
  }
  return meta;
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
  // Amazon products get the signature amber/orange treatment
  "product-amazon":
    "bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_30px_rgba(251,191,36,0.25)] hover:shadow-[0_0_45px_rgba(251,191,36,0.35)]",
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
  const crossItems = getCrossCategoryItems(item, 6);
  const outboundUrl = getItemOutboundUrl(item);

  // Source article URL (for "Read Original Source" link)
  const sourceUrl = (() => {
    try {
      let url: string | null = null;
      if (item.type === "discovery") url = (item as Discovery).sourceLink;
      else if (item.type === "product") url = (item as Product).sourceLink;
      else if (item.type === "hidden-gem") url = (item as HiddenGem).websiteLink;
      else if (item.type === "tool") url = (item as DailyTool).websiteLink;
      else if (item.type === "future-tech") {
        url = (item as FutureTech).sourceLink ?? null;
      }
      if (!url) return null;
      new URL(url); // validate — throws if malformed
      return url;
    } catch {
      return null;
    }
  })();

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
  const isAmazonOutbound = !!outboundUrl && /(?:^|\.)amazon\.[a-z.]+\//i.test(outboundUrl);
  const isAffiliate = item.affiliate?.enabled === true || isAmazonOutbound;
  // Amazon links are always sponsored regardless of the schema flag (Google
  // affiliate disclosure best-practice + Amazon Associates ToS).
  const ctaRel = isAffiliate ? "sponsored noopener nofollow" : "noopener";

  // C1: Reading time estimate
  const readingText = [description, whyText].filter(Boolean).join(" ");
  const readingTime = Math.max(1, Math.ceil(readingText.length / 1000));

  // "More from {Category}" — same-type items, newest first, excluding current + cross-rail
  const shownSlugs = new Set([slug, ...crossItems.map(i => i.slug)]);
  const moreFromCategory = categoryItems
    .filter((i) => !shownSlugs.has(i.slug))
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 6);

  // Brand logo domain for hidden gems and tools
  const websiteLink = (item as HiddenGem | DailyTool).websiteLink as string | undefined;
  const logoDomain = (() => {
    if (item.type !== "hidden-gem" && item.type !== "tool") return null;
    try { return websiteLink ? new URL(websiteLink).hostname.replace("www.", "") : null; } catch { return null; }
  })();

  // ── Structured Data (JSON-LD) ──────────────────────
  const pageUrl = `/item/${slug}`;
  const imageUrl = getItemImageUrl(slug);
  const categoryPath = getCategoryPath(item.type);
  const dateAdded = (item as { dateAdded?: string }).dateAdded;

  const itemLd = item.type === "product"
    ? productLd({
        title,
        description,
        url: pageUrl,
        image: imageUrl,
        priceRange: (item as Product).estimatedPriceRange,
        offerUrl: (item as Product).directAmazonUrl || null,
        reviewBody: whyText || description,
      })
    : articleLd({
        title,
        description,
        url: pageUrl,
        image: imageUrl,
        // datePublished only when we have a real authored date; otherwise omit
        ...(dateAdded ? { datePublished: dateAdded } : {}),
        // dateModified bucketed to build day — see lib/seo.getBuildDate
        dateModified: dateAdded || getBuildDate(),
      });

  const crumbsLd = breadcrumbLd([
    { name: "Home", href: "/" },
    { name: navLabel, href: categoryPath },
    { name: title },
  ]);

  return (
    <>
      <ScrollProgress />
      <BackToTop />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(itemLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(crumbsLd)} />

      {/* ── Hero image (full-width) ───────────────────── */}
      <div className="w-full overflow-hidden border-b border-border/30 relative">
        {item.type === "hidden-gem" && (item as HiddenGem).screenshotUrl ? (
          <ScreenshotImage src={(item as HiddenGem).screenshotUrl!} alt={title} />
        ) : (
          <>
            <ItemImage slug={slug} alt={title} width={1200} height={686} aspectRatio="16/7" size="lg" />
            {isPexelsImage(slug) && (
              <p className="absolute bottom-2 right-3 text-[10px] text-white/60">
                Photo via Pexels
              </p>
            )}
          </>
        )}
      </div>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* ── Visible breadcrumbs ─────────────────────────── */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">Home</Link>
              </li>
              <li aria-hidden="true" className="text-border">/</li>
              <li>
                <Link href={backPath} className="hover:text-accent transition-colors">{navLabel}</Link>
              </li>
              <li aria-hidden="true" className="text-border">/</li>
              <li className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none" aria-current="page">
                {title}
              </li>
            </ol>
          </nav>

          {/* ── Badge + Title ───────────────────────────────── */}
          <div className="mb-8">
            <CategoryBadge color={color} label={label} size="md" className="mb-4" />
            <div className="flex items-center gap-3 mb-1">
              {logoDomain && (
                <LogoImage domain={logoDomain} className="w-8 h-8 rounded object-contain shrink-0" />
              )}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                <BlurText as="span" wordDelay={45}>{title}</BlurText>
              </h1>
            </div>

            {/* Editorial byline */}
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground flex-wrap">
              <span>Curated by Surfaced Editorial</span>
              <span className="text-border">&middot;</span>
              <span>{category}</span>
              <span className="text-border">&middot;</span>
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                {readingTime} min read
              </span>
            </div>

            {/* C4: Share This Find — compact row below title */}
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Share:</span>
              <ShareButtons title={title} slug={slug} compact />
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

          {/* ── YouTube product video ───────────────────────── */}
          {item.type === "product" && (item as Product).youtubeVideoId && (
            <ScrollReveal delay={120}>
              <div className="mb-12">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  See It In Action
                </h2>
                <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{paddingBottom: "56.25%"}}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${(item as Product).youtubeVideoId}?rel=0&modestbranding=1`}
                    title={`${title} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ── Source article link ──────────────────────────── */}
          {sourceUrl && (
            <ScrollReveal delay={130}>
              <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-card/50 border border-border mb-10">
                <svg className="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <a href={sourceUrl} target="_blank" rel="noopener"
                   className="text-sm text-accent hover:text-accent/80 transition-colors truncate">
                  Read full article at {new URL(sourceUrl).hostname.replace("www.", "")} →
                </a>
              </div>
            </ScrollReveal>
          )}

          {/* ── CTA button (all item types with outbound URL) ── */}
          {outboundUrl && (
            <ScrollReveal delay={150}>
              <div className="mb-10">
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href={outboundUrl}
                    target="_blank"
                    rel={ctaRel}
                    data-affiliate={isAffiliate ? "true" : "false"}
                    data-provider={item.affiliate?.provider || ""}
                    data-item-slug={slug}
                    data-item-category={category}
                    data-item-type={item.type}
                    id="main-cta-button"
                    className={`inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base hover:-translate-y-0.5 transition-all ${
                      item.type === "product" && (isAffiliate && item.affiliate?.provider === "amazon" || outboundUrl?.includes("amazon.com"))
                        ? ctaStyles["product-amazon"] + " text-black"
                        : "text-white " + (ctaStyles[item.type] || ctaStyles.default)
                    }`}
                  >
                    {item.type === "product" && outboundUrl?.includes("amazon.com")
                      ? "Check Price on Amazon"
                      : ctaLabel}
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                  {logoDomain && (
                    <LogoImage domain={logoDomain} alt={`${title} logo`} className="w-7 h-7 rounded object-contain" />
                  )}
                </div>

                {/* Affiliate badge */}
                {isAffiliate && (
                  <p className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                    </svg>
                    Affiliate link
                  </p>
                )}

                {/* Also at Best Buy — products only */}
                {item.type === "product" && (item as Product).bestBuyUrl && (
                  <a
                    href={(item as Product).bestBuyUrl}
                    target="_blank"
                    rel="sponsored noopener"
                    data-affiliate="true"
                    data-provider="bestbuy"
                    data-item-slug={slug}
                    className="inline-flex items-center gap-2 mt-3 text-sm text-muted-foreground hover:text-accent transition-colors"
                  >
                    Also at Best Buy <span>&rarr;</span>
                  </a>
                )}

                {/* Promo code */}
                {item.promoCode && <PromoCode code={item.promoCode} />}

                {/* Affiliate disclosure — satisfies both FTC and Amazon Associates requirements */}
                {isAffiliate && (item.affiliate?.provider === "amazon" || isAmazonOutbound) && (
                  <p className="text-xs text-muted-foreground/60 mt-3">
                    As an Amazon Associate, Surfaced earns from qualifying purchases — at no extra cost to you.{" "}
                    <Link href="/affiliate-disclosure" className="text-accent/60 hover:text-accent transition-colors underline underline-offset-2">
                      Learn more
                    </Link>
                  </p>
                )}
                {isAffiliate && item.affiliate?.provider && item.affiliate.provider !== "amazon" && !isAmazonOutbound && (
                  <p className="text-xs text-muted-foreground/60 mt-3">
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

          {/* ── Related (cross-category) ───────────────────── */}
          {crossItems.length > 0 && (
            <ScrollReveal delay={200}>
              <div className="mb-14">
                <div className="flex items-end justify-between gap-4 mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Related</h2>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    From {crossItems.map((i) => getCategoryLabel(i.type)).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {crossItems.map((related) => {
                    const relTitle = getItemTitle(related);
                    const relColor = getCategoryColor(related.type);
                    const relLabel = getCategoryLabel(related.type);
                    return (
                      <Link
                        key={related.slug}
                        href={`/item/${related.slug}`}
                        aria-label={`Read ${relTitle}`}
                        className="group relative rounded-xl border border-border bg-card overflow-hidden card-hover-glow transition-all flex flex-col"
                      >
                        <ItemImage slug={related.slug} alt={relTitle} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                        <div className="p-4 flex flex-col flex-1">
                          <CategoryBadge color={relColor} label={relLabel} className="mb-2" />
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-accent-hover transition-colors line-clamp-2 mb-2 flex-1">
                            {relTitle}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{getItemExcerpt(related)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ── More from {Category} ────────────────────────── */}
          {moreFromCategory.length > 0 && (
            <ScrollReveal delay={220}>
              <div className="mb-16">
                <div className="flex items-end justify-between gap-4 mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">More from {navLabel}</h2>
                  <Link
                    href={backPath}
                    aria-label={`Browse all ${navLabel}`}
                    className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-accent transition-colors link-underline"
                  >
                    View all <span>&rarr;</span>
                  </Link>
                </div>
                <div className="hidden sm:grid sm:grid-cols-3 gap-4">
                  {moreFromCategory.map((related) => {
                    const relTitle = getItemTitle(related);
                    const relColor = getCategoryColor(related.type);
                    const relLabel = getCategoryLabel(related.type);
                    const hasAmazon = !!(related as { directAmazonUrl?: string }).directAmazonUrl || !!(related as { affiliate?: { enabled?: boolean } }).affiliate?.enabled;
                    return (
                      <Link
                        key={related.slug}
                        href={`/item/${related.slug}`}
                        aria-label={`Read ${relTitle}`}
                        className="group relative rounded-xl border border-border bg-card overflow-hidden card-hover-glow transition-all flex flex-col"
                      >
                        {hasAmazon && (
                          <span className="absolute top-2 left-2 z-10 text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded-full">
                            🛒 On Amazon
                          </span>
                        )}
                        <ItemImage slug={related.slug} alt={relTitle} aspectRatio="3/2" width={400} height={267} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                        <div className="p-4 flex flex-col flex-1">
                          <CategoryBadge color={relColor} label={relLabel} className="mb-2" />
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-2 flex-1">
                            {relTitle}
                          </h3>
                          <span className="text-xs text-accent font-medium">Read →</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="sm:hidden flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
                  {moreFromCategory.map((related) => {
                    const relTitle = getItemTitle(related);
                    const relColor = getCategoryColor(related.type);
                    const relLabel = getCategoryLabel(related.type);
                    const hasAmazon = !!(related as { directAmazonUrl?: string }).directAmazonUrl || !!(related as { affiliate?: { enabled?: boolean } }).affiliate?.enabled;
                    return (
                      <Link
                        key={related.slug}
                        href={`/item/${related.slug}`}
                        aria-label={`Read ${relTitle}`}
                        className="group relative shrink-0 w-[200px] rounded-xl border border-border bg-card overflow-hidden card-hover-glow flex flex-col"
                      >
                        {hasAmazon && (
                          <span className="absolute top-2 left-2 z-10 text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded-full">
                            🛒 On Amazon
                          </span>
                        )}
                        <ItemImage slug={related.slug} alt={relTitle} aspectRatio="3/2" width={200} height={133} size="sm" className="group-hover:scale-[1.03] transition-transform duration-500" />
                        <div className="p-3 flex flex-col flex-1">
                          <CategoryBadge color={relColor} label={relLabel} className="mb-2" />
                          <h3 className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-2 flex-1">
                            {relTitle}
                          </h3>
                          <span className="text-xs text-accent font-medium">Read →</span>
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

          {/* ── AdSense — below detail content ───────────────── */}
          {/* Paste your slot ID below once created in AdSense → Ads → By ad unit */}
          <AdSlot slot="" label="detail-page-bottom" format="auto" />
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
          provider={item.affiliate?.provider || (outboundUrl?.includes("amazon.com") ? "amazon" : undefined)}
        />
      )}
    </>
  );
}
