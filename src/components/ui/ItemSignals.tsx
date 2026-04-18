import type { AnyItem } from "@/lib/data";

type WithSignals = AnyItem & {
  dateAdded?: string;
  signalSource?: string;
  signalScore?: number;
};

/** Items added within the last 48 hours are considered "fresh". */
export function isFresh(item: WithSignals, now = new Date()): boolean {
  if (!item.dateAdded) return false;
  const added = new Date(item.dateAdded + "T00:00:00Z");
  const hours = (now.getTime() - added.getTime()) / 36e5;
  return hours >= 0 && hours < 48;
}

const SOURCE_LABEL: Record<string, string> = {
  hackernews: "HN",
  "show-hn": "HN",
  github: "GitHub",
  producthunt: "PH",
};

const SOURCE_EMOJI: Record<string, string> = {
  hackernews: "🟠",
  "show-hn": "🟠",
  github: "⭐",
  producthunt: "🚀",
};

interface NewTodayRibbonProps {
  className?: string;
}

export function NewTodayRibbon({ className = "" }: NewTodayRibbonProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-full shadow-lg shadow-rose-500/30 ${className}`}
    >
      🔥 New
    </span>
  );
}

interface SignalScoreProps {
  source?: string;
  score?: number;
  className?: string;
}

export function SignalScore({ source, score, className = "" }: SignalScoreProps) {
  if (!source || !score) return null;
  const label = SOURCE_LABEL[source] || source;
  const emoji = SOURCE_EMOJI[source] || "📈";
  const unit = source === "github" ? "stars" : "points";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-surface-elevated/80 border border-border/60 text-muted-foreground tabular-nums ${className}`}
      title={`${score} ${unit} on ${label}`}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{score.toLocaleString()}</span>
      <span className="text-[9px] opacity-70">{label}</span>
    </span>
  );
}

export function getItemSignals(item: AnyItem): { source?: string; score?: number; fresh: boolean } {
  const wi = item as WithSignals;
  return {
    source: wi.signalSource,
    score: wi.signalScore,
    fresh: isFresh(wi),
  };
}
