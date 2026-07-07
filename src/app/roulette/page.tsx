import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { hiddenGems, dailyTools, getItemTitle, getItemCategory, getItemExcerpt } from "@/lib/data";
import { RouletteClient } from "@/components/roulette/RouletteClient";

export const metadata: Metadata = buildMetadata({
  title: "Tool Roulette",
  description:
    "Spin to discover a random hand-picked tool from Surfaced. Pair it with a real use case, save your favourites, never look at another endless list again.",
  path: "/roulette",
});

// Strip data down to client-safe shape (no full bodies)
const pool = [...hiddenGems, ...dailyTools].map((i) => ({
  slug: i.slug,
  title: getItemTitle(i),
  category: getItemCategory(i),
  excerpt: getItemExcerpt(i, 140),
  outbound:
    (i.type === "hidden-gem" ? i.websiteLink : i.type === "tool" ? i.websiteLink : null) || null,
}));

export default function RoulettePage() {
  return (
    <article data-world-scene="roulette" className="relative min-h-screen">
      <div className="absolute inset-0 world-scrim pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
        <header className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-white/70 font-semibold mb-4">
            Surfaced · Tool Roulette
          </p>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[0.95]">
            Pick a goal.
            <span className="block bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent">
              Spin the world.
            </span>
          </h1>
          <p className="mt-6 text-white/85 text-lg max-w-2xl mx-auto leading-relaxed">
            Hit spin and Surfaced will pull a random tool from {pool.length} hand-tested entries —
            paired with a use case you can act on right now. Lock in favourites, skip duds.
          </p>
        </header>

        <RouletteClient pool={pool} />

        <footer className="mt-16 text-center text-xs uppercase tracking-[0.2em] text-white/55">
          History stored locally — never sent anywhere.
        </footer>
      </div>
    </article>
  );
}
