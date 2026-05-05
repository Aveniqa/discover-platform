"use client";

import { useEffect, useState } from "react";
import { getStreak } from "@/lib/engagement";
import { getStreakMilestone } from "@/components/ui/StreakWidget";

export function SearchSurfacedButton() {
  return (
    <button
      onClick={() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      }}
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-surface border border-border text-sm text-muted hover:border-accent/30 hover:text-foreground transition-all cursor-pointer"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Search Surfaced
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-[10px] font-mono text-muted-foreground ml-1">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}

export function HomeStreakStatus() {
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [streakEmoji, setStreakEmoji] = useState("");

  useEffect(() => {
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    const syncTimer = setTimeout(() => {
      const days = getStreak();
      setStreakDays(days);
      const milestone = getStreakMilestone(days);
      if (milestone) setStreakEmoji(milestone.emoji);
      if (!milestone) return;
      const lastShown = localStorage.getItem("surfaced-streak-milestone-shown");
      if (lastShown === String(milestone.days)) return;
      localStorage.setItem("surfaced-streak-milestone-shown", String(milestone.days));
      setMilestoneToast(`${milestone.emoji} ${milestone.label} - ${days}-day streak!`);
      toastTimer = setTimeout(() => setMilestoneToast(null), 4000);
    }, 0);
    return () => {
      clearTimeout(syncTimer);
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  return (
    <>
      {milestoneToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-sm font-semibold shadow-xl backdrop-blur animate-fade-in-up whitespace-nowrap">
          {milestoneToast}
        </div>
      )}
      {streakDays > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-xs">
          {streakEmoji || "*"} Day {streakDays}
        </span>
      )}
    </>
  );
}
