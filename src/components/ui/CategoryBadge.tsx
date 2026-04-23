import { cn } from "@/lib/utils";

const colorClasses: Record<string, string> = {
  indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30 light:bg-indigo-500/12 light:text-indigo-700 light:border-indigo-600/30",
  emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30 light:bg-emerald-500/12 light:text-emerald-700 light:border-emerald-600/30",
  amber: "bg-amber-500/20 text-amber-300 border-amber-400/30 light:bg-amber-500/15 light:text-amber-700 light:border-amber-600/35",
  cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30 light:bg-cyan-500/12 light:text-cyan-700 light:border-cyan-600/30",
  rose: "bg-rose-500/20 text-rose-300 border-rose-400/30 light:bg-rose-500/12 light:text-rose-700 light:border-rose-600/30",
};

interface CategoryBadgeProps {
  label: string;
  color: string;
  size?: "sm" | "md";
  className?: string;
}

export function CategoryBadge({ label, color, size = "sm", className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full border",
        colorClasses[color] || colorClasses.indigo,
        size === "sm" ? "px-3 py-0.5 text-[10px] tracking-widest uppercase" : "px-3.5 py-1 text-xs tracking-wide uppercase",
        className
      )}
    >
      {label}
    </span>
  );
}
