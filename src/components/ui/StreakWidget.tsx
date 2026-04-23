"use client";

import { useState, useEffect } from "react";
import { updateStreak } from "@/lib/engagement";

const MILESTONES = [
  { days: 30, emoji: "👑", label: "Legendary curator" },
  { days: 14, emoji: "🏆", label: "Discovery master" },
  { days: 7, emoji: "⚡", label: "True explorer" },
  { days: 3, emoji: "🔥", label: "On a roll" },
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

  return (
    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber/15 border border-amber/30 text-xs font-medium text-amber shadow-[0_0_15px_var(--amber-glow)]">
      <span>{icon}</span>
      <span className="font-medium">Day {streak} streak</span>
    </div>
  );
}
