import { futureItems } from "@/data/future-radar";
import { FutureCard } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function FutureRadar() {
  const featured = futureItems.filter((f) => f.featured);
  const rest = futureItems.filter((f) => !f.featured);

  return (
    <section className="relative py-20 sm:py-28">
      {/* Unique visual treatment */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Future Radar"
          title="What's Coming Next"
          description="Breakthrough technologies, emerging science, and innovations shaping the world ahead."
          accent="cyan"
          action={{ label: "Full future radar", href: "/future-radar" }}
        />

        {/* Featured */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-5">
          {featured.map((item) => (
            <FutureCard key={item.id} {...item} />
          ))}
        </div>

        {/* Rest */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {rest.map((item) => (
            <FutureCard key={item.id} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
