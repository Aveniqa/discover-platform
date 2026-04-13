"use client";

import { useRouter } from "next/navigation";
import { getAllItems } from "@/lib/data";

export function SurpriseMe({ variant = "button" }: { variant?: "button" | "fab" }) {
  const router = useRouter();

  const handleClick = () => {
    const items = getAllItems();
    const random = items[Math.floor(Math.random() * items.length)];
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
