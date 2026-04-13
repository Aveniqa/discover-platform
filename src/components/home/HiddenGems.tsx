import { hiddenGems } from "@/data/hidden-gems";
import { GemCard } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function HiddenGems() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Hidden Gems"
          title="Internet Treasure Map"
          description="Brilliant websites, tools, and corners of the internet you probably haven't found yet."
          accent="emerald"
          action={{ label: "Explore all gems", href: "/hidden-gems" }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {hiddenGems.slice(0, 8).map((gem) => (
            <GemCard key={gem.id} {...gem} />
          ))}
        </div>
      </div>
    </section>
  );
}
