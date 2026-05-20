"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Ticker {
  slug: string;
  title: string;
  category: string;
  action: string;
}

interface Props {
  items: Ticker[];
  intervalMs?: number;
}

/**
 * "Live now" ticker on the homepage. Cycles through random tools and pairs
 * them with rotating "someone is doing X with Y right now" phrasing. The
 * phrasings are picked from a small bank — designed to feel alive without
 * being a fake number generator.
 *
 * Renders nothing on first paint (avoids hydration jitter) — the parent server
 * component still ships the H1/CTA so the page is content-complete for crawlers.
 */
const PHRASES = [
  "someone is opening",
  "a reader just bookmarked",
  "an indie hacker is testing",
  "a designer is comparing",
  "an editor is writing about",
  "a student is learning",
  "a PM is mapping a workflow with",
];

export function LiveNowTicker({ items, intervalMs = 4200 }: Props) {
  const [idx, setIdx] = useState<number | null>(null);
  const [phrase, setPhrase] = useState<string>(PHRASES[0]);

  useEffect(() => {
    if (items.length === 0) return;
    // Stagger the first render to feel alive without immediately overwriting
    const firstPick = Math.floor(Math.random() * items.length);
    setIdx(firstPick);
    setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);

    const id = setInterval(() => {
      setIdx((curr) => {
        const next = Math.floor(Math.random() * items.length);
        // Avoid repeating the same slot back-to-back
        return next === curr ? (next + 1) % items.length : next;
      });
      setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
    }, intervalMs);

    return () => clearInterval(id);
  }, [items, intervalMs]);

  if (idx === null) return null;
  const current = items[idx];
  if (!current) return null;

  return (
    <Link
      href={`/item/${current.slug}`}
      className="group inline-flex max-w-full items-center gap-3 px-4 py-2.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-xs sm:text-sm font-medium hover:bg-black/50 hover:border-white/25 transition-all"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <span className="text-white/70 truncate">{phrase}</span>
      <span className="font-semibold text-white truncate max-w-[180px] sm:max-w-[280px]">{current.title}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60">→</span>
    </Link>
  );
}
