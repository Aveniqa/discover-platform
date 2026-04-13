import { discoveries } from "@/data/discoveries";
import { DiscoveryCard } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CategoryChip } from "@/components/ui/CategoryChip";

export function FeaturedDiscoveries() {
  const featured = discoveries.filter((d) => d.featured);
  const rest = discoveries.filter((d) => !d.featured).slice(0, 4);

  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Discover"
          title="Today Worth Knowing"
          description="Fascinating discoveries, breakthroughs, and stories that expand how you see the world."
          accent="violet"
          action={{ label: "View all discoveries", href: "/discover" }}
        />

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {["All", "Science", "Culture", "AI & Tech", "Space", "Psychology"].map(
            (cat, i) => (
              <CategoryChip key={cat} label={cat} active={i === 0} />
            )
          )}
        </div>

        {/* Featured Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {featured.map((item) => (
            <DiscoveryCard key={item.id} {...item} />
          ))}
        </div>

        {/* Additional Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-5">
          {rest.map((item) => (
            <DiscoveryCard key={item.id} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
