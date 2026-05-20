"use client";

import { useEffect, useState } from "react";
import type { Alcove } from "@/lib/alcoves";
import { AlcoveBackdrop } from "./AlcoveBackdrop";

interface Props {
  alcoves: Alcove[];
  intervalMs?: number;
  fixed?: boolean;
}

/**
 * Crossfade between alcove backdrops on a slow rotation. Used in the hero so
 * the page feels alive without scrolling — every ~6s the world shifts.
 */
export function HeroAlcoveRotator({ alcoves, intervalMs = 6000, fixed = false }: Props) {
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);

  useEffect(() => {
    if (alcoves.length <= 1) return;
    const id = setInterval(() => {
      setPrevIdx(idx);
      setIdx((n) => (n + 1) % alcoves.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [alcoves.length, intervalMs, idx]);

  useEffect(() => {
    if (prevIdx === null) return;
    const t = setTimeout(() => setPrevIdx(null), 1400);
    return () => clearTimeout(t);
  }, [prevIdx]);

  return (
    <>
      {prevIdx !== null && (
        <div className="absolute inset-0 opacity-100 animate-fade-out" style={{ animation: "fade-out 1.4s ease-out forwards" }}>
          <AlcoveBackdrop alcove={alcoves[prevIdx]} fixed={fixed} />
        </div>
      )}
      <AlcoveBackdrop alcove={alcoves[idx]} fixed={fixed} />

      {/* Alcove indicator dots */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {alcoves.map((alc, i) => (
          <button
            key={alc.kind}
            onClick={() => {
              setPrevIdx(idx);
              setIdx(i);
            }}
            aria-label={`Switch to ${alc.label} alcove`}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </>
  );
}
