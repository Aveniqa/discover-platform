import { products } from "@/data/products";
import { ProductCard } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function TrendingProducts() {
  return (
    <section className="relative py-20 sm:py-28">
      {/* Section background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber/[0.015] to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Trending"
          title="Things People Are Buying"
          description="The most interesting products trending right now — from practical essentials to premium upgrades."
          accent="amber"
          action={{ label: "Browse all products", href: "/trending" }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>

        {/* Affiliate disclosure */}
        <p className="mt-6 text-[11px] text-muted-foreground/60 text-center">
          Some links may earn us a commission.{" "}
          <a href="/affiliate-disclosure" className="underline hover:text-muted-foreground transition-colors">
            Learn more
          </a>
        </p>
      </div>
    </section>
  );
}
