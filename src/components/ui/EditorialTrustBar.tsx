interface EditorialTrustBarProps {
  items: string[];
  tone?: "emerald" | "cyan" | "amber" | "rose" | "indigo";
  className?: string;
}

const toneClass: Record<NonNullable<EditorialTrustBarProps["tone"]>, string> = {
  amber: "border-amber-300/20 bg-amber-300/[0.06] text-amber-100",
  cyan: "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-100",
  emerald: "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100",
  indigo: "border-indigo-300/20 bg-indigo-300/[0.06] text-indigo-100",
  rose: "border-rose-300/20 bg-rose-300/[0.06] text-rose-100",
};

export function EditorialTrustBar({ items, tone = "emerald", className = "" }: EditorialTrustBarProps) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {items.map((item) => (
        <span
          key={item}
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${toneClass[tone]}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
