import { safeHostLabel } from "@/lib/trust";

interface SourceTrailLinkProps {
  href: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function SourceTrailLink({
  href,
  label = "Source",
  compact = false,
  className = "",
}: SourceTrailLinkProps) {
  const host = safeHostLabel(href);
  if (!host) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-outbound="true"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/35 text-muted-foreground hover:border-emerald-300/35 hover:text-emerald-200 transition-colors ${
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${className}`}
    >
      <span className="font-semibold text-foreground/80">{label}:</span>
      <span className="truncate">{host}</span>
    </a>
  );
}
