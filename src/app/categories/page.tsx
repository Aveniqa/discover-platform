import type { Metadata } from "next";
import Link from "next/link";
import { categories } from "@/lib/data";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Browse by Category",
  description: "Explore discoveries, products, tools, and hidden gems organized by topic.",
  path: "/categories",
});

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string; dot: string }> = {
  indigo: {
    bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-300",
    glow: "group-hover:shadow-[0_0_30px_rgba(99,102,241,0.08)]", dot: "bg-indigo-300",
  },
  emerald: {
    bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300",
    glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]", dot: "bg-emerald-300",
  },
  amber: {
    bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-300",
    glow: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]", dot: "bg-amber-300",
  },
  cyan: {
    bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-300",
    glow: "group-hover:shadow-[0_0_30px_rgba(6,182,212,0.08)]", dot: "bg-cyan-300",
  },
  rose: {
    bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-300",
    glow: "group-hover:shadow-[0_0_30px_rgba(244,63,94,0.08)]", dot: "bg-rose-300",
  },
};

export default function CategoriesPage() {
  const totalItems = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-accent/8 blur-[130px]" />
          <div className="absolute top-40 left-[16%] w-[280px] h-[280px] rounded-full bg-cyan/6 blur-[90px]" />
          <div className="absolute top-32 right-[16%] w-[280px] h-[280px] rounded-full bg-amber/6 blur-[90px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400 mb-4">
            Explore Everything
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
            Browse by <span className="gradient-text">Category</span>
          </h1>
          <p className="mt-5 text-muted text-lg sm:text-xl max-w-2xl mx-auto">
            {categories.length} topics, {totalItems.toLocaleString()} items. Find exactly what fascinates you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 -mt-4">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const colors = colorMap[cat.color] || colorMap.indigo;
            return (
              <Link
                key={cat.key}
                href={cat.path}
                className={`group relative flex flex-col rounded-xl border border-border bg-card p-6 sm:p-7 card-hover-glow transition-shadow duration-300 ${colors.glow}`}
              >
                <div className={`w-16 h-16 rounded-2xl ${colors.bg} ${colors.border} border flex items-center justify-center text-2xl mb-5`}>
                  {cat.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-accent-hover transition-colors">
                  {cat.name}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{cat.description}</p>
                <div className="mt-auto pt-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    <span><span className="font-semibold text-foreground">{cat.count}</span> items</span>
                  </div>
                  <div className="flex items-center text-xs font-medium text-muted group-hover:text-accent-hover transition-colors">
                    Explore
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="ml-1 transition-transform group-hover:translate-x-0.5">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.03] to-transparent" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            The best of every topic, <span className="gradient-text">daily.</span>
          </h2>
          <p className="mt-4 text-muted text-lg max-w-lg mx-auto">
            One email. Every category. Five minutes. Zero noise.
          </p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm formId="newsletter-categories" ariaLabel="Subscribe — categories page" />
          </div>
        </div>
      </section>
    </>
  );
}
