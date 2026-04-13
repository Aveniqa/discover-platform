"use client";

import { useState, useEffect } from "react";
import { updateStreak } from "@/lib/engagement";

export function StreakWidget() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(updateStreak());
  }, []);

  if (streak < 1) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-xs font-medium text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.08)]">
      <span>🔥</span>
      <span className="font-medium">Day {streak} streak</span>
    </div>
  );
}
