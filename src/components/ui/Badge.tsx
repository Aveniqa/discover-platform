import { getTagColorClasses, cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  color?: "violet" | "cyan" | "amber" | "emerald" | "rose";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ label, color = "violet", size = "sm", className }: BadgeProps) {
  const colors = getTagColorClasses(color);

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "px-2.5 py-0.5 text-[10px] tracking-wide uppercase" : "px-3 py-1 text-xs",
        className
      )}
    >
      {label}
    </span>
  );
}
