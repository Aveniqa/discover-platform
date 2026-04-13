import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  href?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className,
  href,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg cursor-pointer select-none";

  const variants = {
    primary:
      "bg-accent text-white hover:bg-accent-hover shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.25)] active:scale-[0.98]",
    secondary:
      "bg-surface-elevated text-foreground border border-border hover:bg-surface-hover hover:border-border/80 active:scale-[0.98]",
    ghost:
      "text-muted hover:text-foreground hover:bg-surface-elevated active:scale-[0.98]",
    outline:
      "border border-border text-foreground hover:bg-surface-elevated hover:border-accent/30 active:scale-[0.98]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-7 py-3.5 text-base gap-2.5",
  };

  const classes = cn(base, variants[variant], sizes[size], className);

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
