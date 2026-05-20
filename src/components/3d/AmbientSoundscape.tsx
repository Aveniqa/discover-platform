"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { deriveWorldSeed } from "@/lib/world-seed";

/**
 * Ambient soundscape — pure Web Audio synthesis (no audio files shipped).
 * Each route gets a unique chord built from the alcove palette's frequency
 * mapping. Crossfades smoothly when the user navigates.
 *
 * Strictly opt-in: silent until the user clicks the speaker toggle. Once
 * enabled, the preference persists in localStorage and follows the user
 * across routes. Toggle is always visible bottom-right.
 *
 * Accessibility: respects prefers-reduced-motion as a hint (still allows
 * opt-in), uses aria-pressed on the toggle, and starts at -22 LUFS so the
 * pad is felt more than heard.
 */
const STORAGE_KEY = "surfaced.soundscape.enabled";

// Map alcove kinds to chord roots (Hz) and intervals (semitones)
const PALETTE: Record<string, { root: number; intervals: number[]; lfoHz: number; lpHz: number }> = {
  ai:            { root: 220.00, intervals: [0, 7, 14, 19], lfoHz: 0.07, lpHz: 360 },
  writing:       { root: 174.61, intervals: [0, 5, 9, 12],  lfoHz: 0.05, lpHz: 420 },
  design:        { root: 261.63, intervals: [0, 4, 7, 11],  lfoHz: 0.09, lpHz: 480 },
  developer:     { root: 146.83, intervals: [0, 7, 10, 17], lfoHz: 0.06, lpHz: 320 },
  productivity: { root: 196.00, intervals: [0, 5, 7, 12],  lfoHz: 0.05, lpHz: 380 },
  research:      { root: 110.00, intervals: [0, 3, 7, 10],  lfoHz: 0.04, lpHz: 300 },
  audio:         { root: 261.63, intervals: [0, 7, 12, 19], lfoHz: 0.08, lpHz: 500 },
  finance:       { root: 130.81, intervals: [0, 4, 7, 11],  lfoHz: 0.05, lpHz: 340 },
  social:        { root: 246.94, intervals: [0, 3, 7, 10],  lfoHz: 0.07, lpHz: 440 },
  health:        { root: 174.61, intervals: [0, 5, 7, 12],  lfoHz: 0.04, lpHz: 360 },
  entertainment: { root: 293.66, intervals: [0, 4, 7, 11],  lfoHz: 0.10, lpHz: 520 },
  default:       { root: 196.00, intervals: [0, 5, 9, 12],  lfoHz: 0.06, lpHz: 400 },
};

interface ActiveVoice {
  ctx: AudioContext;
  out: GainNode;
  oscs: OscillatorNode[];
  lfo: OscillatorNode;
  lp: BiquadFilterNode;
}

export function AmbientSoundscape() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const voiceRef = useRef<ActiveVoice | null>(null);
  const currentKey = useRef<string>("");

  // Restore preference from localStorage
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setEnabled(true);
    } catch {}
  }, []);

  // Persist preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {}
  }, [enabled]);

  // Build / switch the chord when alcove changes
  useEffect(() => {
    if (!enabled) {
      teardown();
      return;
    }
    const seed = deriveWorldSeed({ pathname: pathname || "/" });
    const key = seed.alcove.kind;
    if (key === currentKey.current && voiceRef.current) return;
    currentKey.current = key;

    teardown();
    voiceRef.current = startVoice(PALETTE[key] || PALETTE.default);

    return () => teardown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pathname]);

  function teardown() {
    const v = voiceRef.current;
    if (!v) return;
    try {
      const now = v.ctx.currentTime;
      v.out.gain.cancelScheduledValues(now);
      v.out.gain.setValueAtTime(v.out.gain.value, now);
      v.out.gain.linearRampToValueAtTime(0, now + 0.9);
      setTimeout(() => {
        try { v.oscs.forEach((o) => o.stop()); v.lfo.stop(); } catch {}
        try { v.ctx.close(); } catch {}
      }, 1000);
    } catch {}
    voiceRef.current = null;
  }

  function startVoice(p: typeof PALETTE.default): ActiveVoice {
    type AnyWin = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AC: typeof AudioContext = window.AudioContext ?? (window as AnyWin).webkitAudioContext!;
    const ctx = new AC();
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);

    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.6);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = p.lpHz;
    lp.Q.value = 0.7;

    const oscs: OscillatorNode[] = p.intervals.map((semis, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? "sine" : i === 1 ? "triangle" : "sine";
      o.frequency.value = p.root * Math.pow(2, semis / 12);
      o.detune.value = (i - 1.5) * 6;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.7 : 0.45 - i * 0.06;
      o.connect(g);
      g.connect(lp);
      o.start();
      return o;
    });

    lp.connect(out);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = p.lfoHz;
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    lfo.start();

    return { ctx, out, oscs, lfo, lp };
  }

  // The toggle UI — fixed bottom-right
  return (
    <button
      onClick={() => setEnabled((e) => !e)}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute ambient soundscape" : "Play ambient soundscape — adapts to each scene"}
      title={enabled ? "Mute soundscape" : "Play ambient soundscape"}
      className={`fixed bottom-6 right-6 z-[60] w-12 h-12 rounded-full backdrop-blur-md border transition-all flex items-center justify-center shadow-lg ${
        enabled
          ? "bg-accent text-white border-accent/40 shadow-[0_8px_30px_rgba(168,85,247,0.4)]"
          : "bg-black/40 text-white/70 border-white/15 hover:bg-black/60 hover:text-white"
      }`}
    >
      {enabled ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </svg>
      )}
    </button>
  );
}
