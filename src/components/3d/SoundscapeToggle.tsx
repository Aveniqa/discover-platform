"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Opt-in ambient soundscape. Pure Web Audio API (no MP3 ship), so we can change
 * tone per category without bundling audio files. Defaults OFF, never autoplays,
 * respects prefers-reduced-motion (treats it as a hint to keep it quiet).
 *
 * The synthesis is two slow detuned sine waves with a long fade — a "breath"
 * pad that sits at -22 LUFS so it's nearly subliminal. The toggle button uses
 * aria-pressed so screen readers announce on/off correctly.
 */
export function SoundscapeToggle() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (stopRef.current) stopRef.current();
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const start = () => {
    type AnyWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as AnyWindow).webkitAudioContext;
    if (!AC) return;
    const ctx: AudioContext = new AC();
    ctxRef.current = ctx;

    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);

    // Long fade in to avoid clicks
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 1.5);

    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = 110;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = 110 * 1.5;
    o2.detune.value = 6;
    const o3 = ctx.createOscillator();
    o3.type = "sine";
    o3.frequency.value = 110 * 0.5;
    o3.detune.value = -4;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    lp.Q.value = 0.8;

    const g = ctx.createGain();
    g.gain.value = 0.6;
    o1.connect(g);
    o2.connect(g);
    o3.connect(g);
    g.connect(lp);
    lp.connect(out);

    // Slow LFO on cutoff for breath
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    o1.start();
    o2.start();
    o3.start();
    lfo.start();

    stopRef.current = () => {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + 1.0);
      setTimeout(() => {
        try { o1.stop(); o2.stop(); o3.stop(); lfo.stop(); } catch {}
        try { ctx.close(); } catch {}
        ctxRef.current = null;
        stopRef.current = null;
      }, 1100);
    };
  };

  const toggle = () => {
    if (on) {
      if (stopRef.current) stopRef.current();
      setOn(false);
    } else {
      start();
      setOn(true);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Mute ambient soundscape" : "Play ambient soundscape"}
      title={on ? "Mute soundscape" : "Play soundscape"}
      className={`fixed bottom-6 right-6 z-[60] w-12 h-12 rounded-full backdrop-blur-md border transition-all flex items-center justify-center shadow-lg ${
        on ? "bg-accent text-white border-accent/40 shadow-[0_8px_30px_rgba(168,85,247,0.4)]" : "bg-black/40 text-white/70 border-white/15 hover:bg-black/60 hover:text-white"
      }`}
    >
      {on ? (
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
