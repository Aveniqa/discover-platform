export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function getTagColorClasses(color: string) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    violet: {
      bg: "bg-violet-500/10 light:bg-violet-500/12",
      text: "text-violet-400 light:text-violet-700",
      border: "border-violet-500/20 light:border-violet-600/30",
    },
    cyan: {
      bg: "bg-cyan-500/10 light:bg-cyan-500/12",
      text: "text-cyan-400 light:text-cyan-700",
      border: "border-cyan-500/20 light:border-cyan-600/30",
    },
    amber: {
      bg: "bg-amber-500/10 light:bg-amber-500/15",
      text: "text-amber-400 light:text-amber-700",
      border: "border-amber-500/20 light:border-amber-600/35",
    },
    emerald: {
      bg: "bg-emerald-500/10 light:bg-emerald-500/12",
      text: "text-emerald-400 light:text-emerald-700",
      border: "border-emerald-500/20 light:border-emerald-600/30",
    },
    rose: {
      bg: "bg-rose-500/10 light:bg-rose-500/12",
      text: "text-rose-400 light:text-rose-700",
      border: "border-rose-500/20 light:border-rose-600/30",
    },
  };
  return map[color] || map.violet;
}
