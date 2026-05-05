"use client";

import { useEffect, useState } from "react";

export function TrendingLiveAutoRefresh({ generatedAt }: { generatedAt: string }) {
  const [newerFeed, setNewerFeed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkFeed() {
      try {
        const response = await fetch(`/automated-content/trending-live.json?ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && payload.generatedAt && payload.generatedAt !== generatedAt) {
          setNewerFeed(payload.generatedAt);
        }
      } catch {
        return;
      }
    }
    const interval = window.setInterval(checkFeed, 15 * 60 * 1000);
    void checkFeed();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [generatedAt]);

  if (!newerFeed) {
    return (
      <span className="rounded-full border border-border bg-surface px-3 py-1">
        Auto-checking live feed
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100 transition-colors hover:bg-cyan-300/15"
    >
      New live update ready
    </button>
  );
}
