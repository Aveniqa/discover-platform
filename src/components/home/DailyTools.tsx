import { tools } from "@/data/tools";
import { ToolCard } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function DailyTools() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Daily Tools"
          title="Useful Things You'll Actually Use"
          description="Calculators, planners, trackers, and utilities that make your daily life measurably better."
          accent="emerald"
          action={{ label: "View all tools", href: "/tools" }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {tools.slice(0, 8).map((tool) => (
            <ToolCard key={tool.id} {...tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
