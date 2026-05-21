"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { deriveWorldSeed, type WorldSeed } from "@/lib/world-seed";
import {
  ITEM_KEYFRAMES,
  clamp01,
  getWorldPhaseTelemetry,
  type WorldPhaseTelemetry,
} from "@/lib/world-phase";

/**
 * Scroll-locked layered soundscape.
 *
 * PR 1 for the spatial world upgrade: no shipped samples, no Tone.js, just six
 * Web Audio synth layers that behave like short loops and crossfade by the
 * same phase telemetry the item camera/morph uses. Default is silent; a user
 * tap is required before an AudioContext exists.
 */
const STORAGE_KEY = "surfaced.soundscape.enabled";
const PHASE_EVENT = "surfaced:world-phase";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const ROUTE_LAYER_SCALE = 0.72;

type OscillatorKind = OscillatorType;

interface LayerSpec {
  intervals: number[];
  oscillator: OscillatorKind;
  detuneSpread: number;
  filterHz: number;
  filterQ: number;
  delayMs: number;
  feedback: number;
  lfoHz: number;
  lfoDepth: number;
  maxGain: number;
}

interface LayerVoice {
  gain: GainNode;
  filter: BiquadFilterNode;
  oscs: OscillatorNode[];
  lfo: OscillatorNode;
}

interface ActiveSoundscape {
  ctx: AudioContext;
  master: GainNode;
  layers: LayerVoice[];
  key: string;
  hiddenMuted: boolean;
}

const ROOTS: Record<string, number> = {
  ai: 220.0,
  writing: 174.61,
  design: 261.63,
  developer: 146.83,
  productivity: 196.0,
  research: 110.0,
  audio: 261.63,
  finance: 130.81,
  social: 246.94,
  health: 174.61,
  entertainment: 293.66,
  default: 196.0,
};

const LAYERS: LayerSpec[] = [
  // Arrival: sparse sub-bass drone.
  {
    intervals: [-24, -12, 0],
    oscillator: "sine",
    detuneSpread: 3,
    filterHz: 150,
    filterQ: 0.55,
    delayMs: 0,
    feedback: 0,
    lfoHz: 1 / 16,
    lfoDepth: 28,
    maxGain: 0.72,
  },
  // Recognition: bell-pad layer enters.
  {
    intervals: [0, 7, 12, 19],
    oscillator: "triangle",
    detuneSpread: 9,
    filterHz: 520,
    filterQ: 0.7,
    delayMs: 180,
    feedback: 0.18,
    lfoHz: 1 / 12,
    lfoDepth: 70,
    maxGain: 0.58,
  },
  // Heart: full harmonic stack.
  {
    intervals: [-12, 0, 4, 7, 12, 16],
    oscillator: "sawtooth",
    detuneSpread: 14,
    filterHz: 880,
    filterQ: 0.85,
    delayMs: 260,
    feedback: 0.24,
    lfoHz: 1 / 10,
    lfoDepth: 120,
    maxGain: 0.42,
  },
  // Inversion: cooled, reverbed pulse.
  {
    intervals: [-12, 0, 3, 10, 15],
    oscillator: "triangle",
    detuneSpread: 7,
    filterHz: 340,
    filterQ: 1.2,
    delayMs: 420,
    feedback: 0.34,
    lfoHz: 0.75,
    lfoDepth: 150,
    maxGain: 0.48,
  },
  // Communion: choral pad / constellation.
  {
    intervals: [-7, 0, 5, 7, 12, 19],
    oscillator: "sine",
    detuneSpread: 18,
    filterHz: 740,
    filterQ: 0.65,
    delayMs: 520,
    feedback: 0.28,
    lfoHz: 1 / 14,
    lfoDepth: 95,
    maxGain: 0.5,
  },
  // Departure: collapses to a single sine.
  {
    intervals: [-24],
    oscillator: "sine",
    detuneSpread: 0,
    filterHz: 220,
    filterQ: 0.45,
    delayMs: 90,
    feedback: 0.08,
    lfoHz: 1 / 16,
    lfoDepth: 18,
    maxGain: 0.68,
  },
];

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true;
}

function readScrollT(): number {
  if (typeof window === "undefined") return 0;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return clamp01(window.scrollY / max);
}

function currentWorldSeed(pathname: string | null): WorldSeed {
  if (typeof document === "undefined") {
    return deriveWorldSeed({ pathname: pathname || "/" });
  }
  const slug = document.body.dataset.itemSlug;
  const category = document.body.dataset.itemCategory;
  return deriveWorldSeed({ pathname: pathname || "/", slug, category });
}

function soundscapeKey(seed: WorldSeed): string {
  return `${seed.scene}:${seed.key}:${seed.alcove.kind}`;
}

function note(root: number, semis: number): number {
  return root * Math.pow(2, semis / 12);
}

function rootForSeed(seed: WorldSeed): number {
  const base = ROOTS[seed.alcove.kind] ?? ROOTS.default;
  return base * (0.96 + seed.hue * 0.08);
}

function startLayeredSoundscape(seed: WorldSeed): ActiveSoundscape {
  type AnyWin = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AC: typeof AudioContext = window.AudioContext ?? (window as AnyWin).webkitAudioContext!;
  const ctx = new AC({ latencyHint: "interactive" });
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const root = rootForSeed(seed);
  const layers = LAYERS.map((spec, layerIndex) => createLayer(ctx, master, root, spec, layerIndex, seed));
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.058, ctx.currentTime + 1.1);

  return { ctx, master, layers, key: soundscapeKey(seed), hiddenMuted: document.hidden };
}

function createLayer(
  ctx: AudioContext,
  master: GainNode,
  root: number,
  spec: LayerSpec,
  layerIndex: number,
  seed: WorldSeed
): LayerVoice {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(master);

  const filter = ctx.createBiquadFilter();
  filter.type = layerIndex >= 3 ? "bandpass" : "lowpass";
  filter.frequency.value = spec.filterHz;
  filter.Q.value = spec.filterQ;

  if (spec.delayMs > 0) {
    const delay = ctx.createDelay(1.2);
    const feedback = ctx.createGain();
    delay.delayTime.value = spec.delayMs / 1000;
    feedback.gain.value = spec.feedback;
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(gain);
  }
  filter.connect(gain);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = spec.lfoHz;
  lfoGain.gain.value = spec.lfoDepth;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const oscs = spec.intervals.map((semis, i) => {
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    osc.type = spec.oscillator;
    osc.frequency.value = note(root, semis);
    osc.detune.value = (i - (spec.intervals.length - 1) / 2) * spec.detuneSpread + (seed.hue - 0.5) * 12;
    voiceGain.gain.value = 1 / Math.max(1.8, spec.intervals.length);
    osc.connect(voiceGain);
    voiceGain.connect(filter);
    osc.start();
    return osc;
  });

  return { gain, filter, oscs, lfo };
}

function syncLayerGains(active: ActiveSoundscape, telemetry: WorldPhaseTelemetry): void {
  const now = active.ctx.currentTime;
  const fromPower = Math.cos(telemetry.mix * Math.PI * 0.5);
  const toPower = Math.sin(telemetry.mix * Math.PI * 0.5);
  const routeScale = telemetry.scene === "route" ? ROUTE_LAYER_SCALE : 1;
  const masterTarget = active.hiddenMuted ? 0 : (0.048 + telemetry.glow * 0.012) * routeScale;

  active.master.gain.setTargetAtTime(masterTarget, now, 0.16);

  active.layers.forEach((layer, index) => {
    let power = 0;
    if (index === telemetry.phaseIndex) power = fromPower;
    if (index === telemetry.nextPhaseIndex) power = Math.max(power, toPower);
    const target = power * LAYERS[index].maxGain;
    layer.gain.gain.setTargetAtTime(target, now, 0.085);
    layer.filter.frequency.setTargetAtTime(
      LAYERS[index].filterHz * (0.82 + telemetry.glow * 0.22),
      now,
      0.18
    );
  });
}

function setHiddenMuted(active: ActiveSoundscape | null, hidden: boolean): void {
  if (!active) return;
  active.hiddenMuted = hidden;
  const now = active.ctx.currentTime;
  active.master.gain.cancelScheduledValues(now);
  active.master.gain.setTargetAtTime(hidden ? 0 : active.master.gain.value, now, hidden ? 0.04 : 0.12);
}

function teardown(active: ActiveSoundscape | null): void {
  if (!active) return;
  try {
    const now = active.ctx.currentTime;
    active.master.gain.cancelScheduledValues(now);
    active.master.gain.setValueAtTime(active.master.gain.value, now);
    active.master.gain.linearRampToValueAtTime(0, now + 0.55);
    window.setTimeout(() => {
      try {
        active.layers.forEach((layer) => {
          layer.oscs.forEach((osc) => osc.stop());
          layer.lfo.stop();
        });
      } catch {}
      try {
        active.ctx.close();
      } catch {}
    }, 650);
  } catch {}
}

export function AmbientSoundscape() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState("Arrival");
  const [reducedMotion, setReducedMotion] = useState(false);
  const voiceRef = useRef<ActiveSoundscape | null>(null);
  const seedRef = useRef<WorldSeed | null>(null);
  const telemetryRef = useRef<WorldPhaseTelemetry | null>(null);
  const rafRef = useRef(0);
  const labelRef = useRef("Arrival");

  useEffect(() => {
    const syncSeed = () => {
      const seed = currentWorldSeed(pathname);
      const key = soundscapeKey(seed);
      const active = voiceRef.current;
      seedRef.current = seed;

      if (active && active.key !== key && !prefersReducedMotion()) {
        teardown(active);
        voiceRef.current = startLayeredSoundscape(seed);
      }
      schedulePhaseSync();
    };

    syncSeed();
    window.addEventListener("surfaced:world-reseed", syncSeed);
    return () => window.removeEventListener("surfaced:world-reseed", syncSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const schedule = () => schedulePhaseSync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const syncVisibility = () => {
      setHiddenMuted(voiceRef.current, document.hidden);
      if (!document.hidden) schedulePhaseSync();
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!media) return;
    const syncReducedMotion = () => {
      const isReduced = media.matches;
      setReducedMotion(isReduced);
      if (isReduced && voiceRef.current) {
        setEnabled(false);
        teardown(voiceRef.current);
        voiceRef.current = null;
      }
    };
    syncReducedMotion();
    media.addEventListener?.("change", syncReducedMotion);
    return () => media.removeEventListener?.("change", syncReducedMotion);
  }, []);

  useEffect(() => () => teardown(voiceRef.current), []);

  function schedulePhaseSync() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const seed = seedRef.current ?? currentWorldSeed(pathname);
      const telemetry = getWorldPhaseTelemetry(seed, readScrollT());
      telemetryRef.current = telemetry;
      const active = voiceRef.current;
      if (active) syncLayerGains(active, telemetry);
      document.body.dataset.worldPhase = telemetry.id;
      window.dispatchEvent(new CustomEvent(PHASE_EVENT, { detail: telemetry }));

      if (labelRef.current !== telemetry.label) {
        labelRef.current = telemetry.label;
        setPhaseLabel(telemetry.label);
      }
    });
  }

  async function toggleSoundscape() {
    if (enabled) {
      setEnabled(false);
      try {
        localStorage.setItem(STORAGE_KEY, "0");
      } catch {}
      teardown(voiceRef.current);
      voiceRef.current = null;
      return;
    }

    if (prefersReducedMotion()) {
      setPhaseLabel("Motion safe");
      return;
    }

    const seed = currentWorldSeed(pathname);
    seedRef.current = seed;
    const active = startLayeredSoundscape(seed);
    voiceRef.current = active;
    if (active.ctx.state === "suspended") {
      await active.ctx.resume();
    }
    const telemetry = getWorldPhaseTelemetry(seed, readScrollT());
    telemetryRef.current = telemetry;
    syncLayerGains(active, telemetry);
    setEnabled(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    schedulePhaseSync();
  }

  const disabledForMotion = reducedMotion;
  const label = disabledForMotion
    ? "Soundscape disabled while reduced motion is enabled"
    : enabled
      ? `Mute ${phaseLabel} soundscape`
      : "Tap to enable scroll-locked soundscape";

  return (
    <button
      onClick={toggleSoundscape}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
      className={`fixed bottom-6 right-6 z-[60] h-12 rounded-full backdrop-blur-md border transition-all inline-flex items-center justify-center gap-2 px-3 sm:px-4 shadow-lg ${
        enabled
          ? "bg-accent text-white border-accent/40 shadow-[0_8px_30px_rgba(168,85,247,0.4)]"
          : "bg-black/40 text-white/70 border-white/15 hover:bg-black/60 hover:text-white"
      }`}
    >
      {enabled ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </svg>
      )}
      <span className="text-xs font-semibold leading-none">
        {enabled ? phaseLabel : disabledForMotion ? "Motion safe" : "Tap for sound"}
      </span>
      <span className="sr-only">
        {ITEM_KEYFRAMES.map((phase) => phase.label).join(", ")}
      </span>
    </button>
  );
}
