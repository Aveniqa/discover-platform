import { cn } from "@/lib/utils";

interface CategoryChipProps {
  label: string;
  icon?: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function CategoryChip({
  label,
  icon,
  active = false,
  onClick,
  href,
  className,
}: CategoryChipProps) {
  const classes = cn(
    "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer select-none border",
    active
      ? "bg-accent/15 text-accent-hover border-accent/30 shadow-[0_0_12px_rgba(139,92,246,0.1)]"
      : "bg-surface-elevated text-muted border-border hover:text-foreground hover:bg-surface-hover hover:border-border",
    className
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {icon && <span className="text-base">{icon}</span>}
        {label}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {icon && <span className="text-base">{icon}</span>}
      {label}
    </button>
  );
}
