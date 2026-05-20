import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { WORKFLOWS } from "@/lib/workflows";
import { alcoveByKind } from "@/lib/alcoves";
import { AlcoveBackdrop } from "@/components/3d/AlcoveBackdrop";
import { hiddenGems, dailyTools, getItemTitle, type AnyItem } from "@/lib/data";
import { BYLINE } from "@/lib/masthead";

export const metadata: Metadata = buildMetadata({
  title: "Workflows",
  description:
    "Tool recipes for real goals — newsletters, landing pages, podcasts, logos, analysis. Three to five tools that actually work together, hand-picked.",
  path: "/workflows",
});

const allItems: AnyItem[] = [...hiddenGems, ...dailyTools];

function lookupBySlug(slug?: string): AnyItem | undefined {
  if (!slug) return undefined;
  return allItems.find((i) => i.slug === slug);
}

export default function WorkflowsPage() {
  return (
    <>
      <section className="relative min-h-[60vh] flex items-center overflow-hidden border-b border-white/[0.04]">
        <AlcoveBackdrop alcove={alcoveByKind("productivity")} trackScroll />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70 font-semibold mb-4">
            Workflows
          </p>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[0.95]">
            Tool recipes
            <span className="block bg-gradient-to-r from-violet-300 via-cyan-200 to-amber-200 bg-clip-text text-transparent">
              for real goals.
            </span>
          </h1>
          <p className="mt-6 text-white/85 text-lg max-w-2xl mx-auto leading-relaxed">
            Most &ldquo;best-of&rdquo; lists drop you 30 tools and walk away. These give you three to
            five that work together — and tell you exactly what each one is for in the chain.
          </p>
        </div>
      </section>

      <section className="bg-background">
        {WORKFLOWS.map((wf, idx) => (
          <article
            id={wf.slug}
            key={wf.slug}
            className="relative min-h-[80vh] flex items-center overflow-hidden border-t border-white/[0.04] scroll-mt-20"
          >
            <AlcoveBackdrop alcove={alcoveByKind(wf.alcove)} trackScroll />
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 w-full">
              <div className="flex flex-col lg:flex-row gap-12">
                <div className="lg:w-1/3 lg:sticky lg:top-28">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/60 font-semibold mb-3">
                    Workflow · {String(idx + 1).padStart(2, "0")}
                  </p>
                  <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
                    {wf.goal}
                  </h2>
                  <p className="mt-4 text-white/85 text-base leading-relaxed">{wf.blurb}</p>
                  <p className="mt-4 text-white/60 text-xs uppercase tracking-wider">
                    For: {wf.audience}
                  </p>
                </div>

                <ol className="lg:w-2/3 flex flex-col gap-3">
                  {wf.steps.map((step, i) => {
                    const tool = lookupBySlug(step.toolSlug);
                    const toolName = tool ? getItemTitle(tool) : step.fallback ?? "Pick your own";
                    return (
                      <li
                        key={i}
                        className="relative p-5 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 hover:border-white/30 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                            style={{ background: `${wf.tint}33`, color: "#fff", border: `1px solid ${wf.tint}80` }}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55 mb-1">
                              {step.action}
                            </p>
                            <h3 className="text-lg sm:text-xl font-semibold text-white">
                              {tool ? (
                                <Link href={`/item/${tool.slug}`} className="hover:underline">
                                  {toolName}
                                </Link>
                              ) : (
                                toolName
                              )}
                            </h3>
                            {step.note && (
                              <p className="mt-2 text-sm text-white/75 leading-relaxed">
                                {step.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="py-20 px-4 sm:px-6 bg-background border-t border-border/40 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Have a workflow we should add?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-6">
          Email {BYLINE.name} at <a href={`mailto:${BYLINE.contactEmail}`} className="text-accent hover:underline">{BYLINE.contactEmail}</a> with the goal and the tools you actually use. Real recipes only.
        </p>
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
        >
          Browse the full tool catalog →
        </Link>
      </section>
    </>
  );
}
