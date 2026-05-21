/**
 * Deterministic seed + palette derivation for the global 3D world.
 *
 * Each route/slug gets a unique world signature: scroll-driven camera moves,
 * particle distribution, accent colors. Same URL = same world every visit.
 *
 * Why deterministic: returning visitors should recognise an item by its
 * world. Random per visit would make the experience feel like noise.
 */

import { alcoveFromCategory, alcoveByKind, type Alcove } from "@/lib/alcoves";

export interface WorldSeed {
  /** Route-wide world or an item-specific reading world */
  scene: "route" | "item";
  /** Stable key used to derive the scene, usually pathname or slug */
  key: string;
  /** 0..1 — hash-derived but stable per slug */
  hue: number;
  /** 0..1 — depth/intensity multiplier */
  intensity: number;
  /** 0..1 — particle density modifier */
  density: number;
  /** Alcove drives palette + motif */
  alcove: Alcove;
  /** Stable integer per slug, used as RNG seed */
  rngSeed: number;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function deriveWorldSeed(opts: {
  pathname?: string;
  category?: string;
  slug?: string;
} = {}): WorldSeed {
  const key = opts.slug || opts.pathname || "/";
  const hash = hashString(key);
  const hue = (hash % 360) / 360;
  const intensity = 0.55 + ((hash >> 8) % 100) / 220;
  const density = 0.6 + ((hash >> 16) % 100) / 250;

  let alcove: Alcove;
  if (opts.category) {
    alcove = alcoveFromCategory(opts.category);
  } else if (opts.pathname === "/workflows") {
    alcove = alcoveByKind("productivity");
  } else if (opts.pathname === "/tools") {
    alcove = alcoveByKind("developer");
  } else if (opts.pathname === "/hidden-gems") {
    alcove = alcoveByKind("design");
  } else if (opts.pathname === "/about" || opts.pathname === "/editorial-standards") {
    alcove = alcoveByKind("writing");
  } else if (opts.pathname === "/roulette") {
    alcove = alcoveByKind("entertainment");
  } else if (opts.pathname?.startsWith("/discover")) {
    alcove = alcoveByKind("research");
  } else if (opts.pathname?.startsWith("/trending")) {
    alcove = alcoveByKind("finance");
  } else if (opts.pathname?.startsWith("/future-radar")) {
    alcove = alcoveByKind("ai");
  } else {
    // Default homepage: rotate alcove by hour of day so returning visitors
    // get a slightly different world over the course of a day.
    const hour = new Date().getHours();
    const ROTATION = ["ai", "design", "writing", "developer", "productivity", "audio"] as const;
    alcove = alcoveByKind(ROTATION[hour % ROTATION.length]);
  }

  return {
    scene: opts.slug ? "item" : "route",
    key,
    hue,
    intensity,
    density,
    alcove,
    rngSeed: hash,
  };
}

/** Seeded pseudo-random number generator (mulberry32). */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
