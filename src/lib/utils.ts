export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function getTagColorClasses(color: string) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      border: "border-violet-500/20",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      border: "border-cyan-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/20",
    },
  };
  return map[color] || map.violet;
}
