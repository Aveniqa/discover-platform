"use client";

import { usePathname, useRouter } from "next/navigation";
import { getAllItems, type AnyItem } from "@/lib/data";
import { track } from "@/lib/analytics";

/** Map a category-route prefix to the item type it lists. */
const ROUTE_TO_TYPE: Record<string, AnyItem["type"]> = {
  "/discover": "discovery",
  "/trending": "product",
  "/hidden-gems": "hidden-gem",
  "/future-radar": "future-tech",
  "/tools": "tool",
};

export function SurpriseMe({ variant = "button" }: { variant?: "button" | "fab" }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    // Scope to the current category when viewing one — keeps the surprise
    // useful: clicking from /trending lands on a product, not a future-tech.
    let pool = getAllItems();
    let scope: string = "all";
    for (const [prefix, type] of Object.entries(ROUTE_TO_TYPE)) {
      if (pathname === prefix || pathname?.startsWith(`${prefix}/`)) {
        const filtered = pool.filter((i) => i.type === type);
        if (filtered.length > 0) {
          pool = filtered;
          scope = type;
        }
        break;
      }
    }
    const random = pool[Math.floor(Math.random() * pool.length)];
    track("surprise_me_click", { from: variant === "fab" ? "fab" : "inline", slug: random.slug, scope });
    router.push(`/item/${random.slug}`);
  };

  if (variant === "fab") {
    return (
      <button
        onClick={handleClick}
        className="group fixed bottom-6 right-6 z-40 flex items-center gap-0 h-12 rounded-full bg-surface-elevated/90 border border-border/60 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:border-accent/30 hover:shadow-[0_4px_32px_rgba(168,85,247,0.15)] backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden"
        title="Surprise Me — Random Discovery"
        aria-label="Random discovery"
      >
        <span className="grid place-items-center w-12 h-12 shrink-0 text-lg">🎲</span>
        <span className="max-w-0 group-hover:max-w-32 overflow-hidden transition-all duration-300 ease-out text-sm font-medium text-muted-foreground group-hover:text-foreground whitespace-nowrap pr-0 group-hover:pr-5">
          Surprise Me
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-elevated border border-border text-sm font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all cursor-pointer"
    >
      <span>🎲</span>
      Surprise Me
    </button>
  );
}
