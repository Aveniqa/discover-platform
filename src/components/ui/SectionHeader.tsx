import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  accent?: "violet" | "cyan" | "amber" | "emerald";
  align?: "left" | "center";
  action?: { label: string; href: string };
  className?: string;
}

const accentColors = {
  violet: "text-violet-400 light:text-violet-700",
  cyan: "text-cyan-400 light:text-cyan-700",
  amber: "text-amber-400 light:text-amber-700",
  emerald: "text-emerald-400 light:text-emerald-700",
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  accent = "violet",
  align = "left",
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-10",
        align === "center" && "text-center",
        className
      )}
    >
      <div className={cn("flex items-end justify-between", align === "center" && "flex-col items-center gap-4")}>
        <div>
          {eyebrow && (
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-[0.2em] mb-3",
                accentColors[accent]
              )}
            >
              {eyebrow}
            </p>
          )}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-3 text-muted text-base sm:text-lg max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && (
          <a
            href={action.href}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-accent-hover transition-colors shrink-0"
          >
            {action.label}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
