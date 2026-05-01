"use client";

import { useState, useEffect } from "react";
import { updateStreak } from "@/lib/engagement";

// Milestones at 7/30/100 — sparse enough that hitting one feels earned.
// The home toast (page.tsx) only fires when a milestone changes, so users
// don't see the badge daily.
const MILESTONES = [
  { days: 100, emoji: "👑", label: "Legendary curator" },
  { days: 30, emoji: "🏆", label: "Discovery master" },
  { days: 7, emoji: "⚡", label: "True explorer" },
];

export function getStreakMilestone(days: number) {
  return MILESTONES.find((m) => days >= m.days) || null;
}

export function StreakWidget() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(updateStreak());
  }, []);

  if (streak < 1) return null;

  const milestone = getStreakMilestone(streak);
  const icon = milestone ? milestone.emoji : "🔥";

  // Compact in navbar (icon + day count only). Full milestone label lives in
  // the aria-label + native title tooltip so screen readers + hover users get
  // the context without bloating the navbar at narrow desktop widths.
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-xs font-medium text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.08)] whitespace-nowrap"
      role="status"
      aria-label={milestone ? `${milestone.label} — day ${streak} streak` : `Day ${streak} streak`}
      title={milestone ? `${milestone.label} — Day ${streak} streak` : `Day ${streak} streak`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="font-medium">Day {streak}</span>
    </div>
  );
}
