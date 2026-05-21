import type { WorldSeed } from "@/lib/world-seed";

export type WorldAlcoveId =
  | "arrival"
  | "recognition"
  | "heart"
  | "inversion"
  | "communion"
  | "departure";

export interface ItemKeyframe {
  id: WorldAlcoveId;
  label: string;
  camera: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  density: number;
  objectScale: number;
  objectY: number;
  objectZ: number;
  twist: number;
  glow: number;
}

export interface ItemPhase {
  index: number;
  next: number;
  t: number;
  raw: number;
}

export interface WorldPhaseTelemetry {
  scene: WorldSeed["scene"];
  scrollT: number;
  phaseIndex: number;
  nextPhaseIndex: number;
  mix: number;
  raw: number;
  id: WorldAlcoveId;
  nextId: WorldAlcoveId;
  label: string;
  nextLabel: string;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  fov: number;
  density: number;
  objectScale: number;
  objectY: number;
  objectZ: number;
  twist: number;
  glow: number;
}

export const ITEM_KEYFRAMES: ItemKeyframe[] = [
  {
    id: "arrival",
    label: "Arrival",
    camera: [0, 0.15, 6.25],
    lookAt: [0, -0.35, -2.1],
    fov: 66,
    density: 0.58,
    objectScale: 1.0,
    objectY: -0.42,
    objectZ: -2.05,
    twist: 0.22,
    glow: 0.72,
  },
  {
    id: "recognition",
    label: "Recognition",
    camera: [0.95, 0.55, 5.45],
    lookAt: [0.1, -0.2, -2.7],
    fov: 61,
    density: 0.86,
    objectScale: 1.18,
    objectY: -0.18,
    objectZ: -2.65,
    twist: 0.58,
    glow: 0.9,
  },
  {
    id: "heart",
    label: "Heart",
    camera: [-1.15, 0.85, 4.75],
    lookAt: [-0.1, -0.05, -3.25],
    fov: 57,
    density: 1.0,
    objectScale: 0.92,
    objectY: -0.02,
    objectZ: -3.2,
    twist: 1.08,
    glow: 1.15,
  },
  {
    id: "inversion",
    label: "Inversion",
    camera: [1.35, -0.05, 4.2],
    lookAt: [0, -0.18, -3.95],
    fov: 54,
    density: 0.74,
    objectScale: 1.34,
    objectY: -0.28,
    objectZ: -3.85,
    twist: 0.72,
    glow: 0.96,
  },
  {
    id: "communion",
    label: "Communion",
    camera: [-0.55, 0.35, 3.72],
    lookAt: [0.08, -0.32, -4.6],
    fov: 50,
    density: 0.96,
    objectScale: 1.12,
    objectY: -0.46,
    objectZ: -4.45,
    twist: 1.38,
    glow: 1.22,
  },
  {
    id: "departure",
    label: "Departure",
    camera: [0.15, 0.08, 5.15],
    lookAt: [0, -0.55, -5.05],
    fov: 59,
    density: 0.64,
    objectScale: 0.82,
    objectY: -0.62,
    objectZ: -5.05,
    twist: 0.36,
    glow: 0.66,
  },
];

const ROUTE_PHASE_STOPS = [0, 2, 5] as const;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getItemPhase(scrollT: number): ItemPhase {
  const scaled = clamp01(scrollT) * (ITEM_KEYFRAMES.length - 1);
  const index = Math.min(ITEM_KEYFRAMES.length - 2, Math.floor(scaled));
  const next = Math.min(ITEM_KEYFRAMES.length - 1, index + 1);
  return { index, next, t: smoothstep(scaled - index), raw: scaled };
}

function getRoutePhase(scrollT: number): ItemPhase {
  const scaled = clamp01(scrollT) * (ROUTE_PHASE_STOPS.length - 1);
  const routeIndex = Math.min(ROUTE_PHASE_STOPS.length - 2, Math.floor(scaled));
  const routeNext = Math.min(ROUTE_PHASE_STOPS.length - 1, routeIndex + 1);
  return {
    index: ROUTE_PHASE_STOPS[routeIndex],
    next: ROUTE_PHASE_STOPS[routeNext],
    t: smoothstep(scaled - routeIndex),
    raw: scaled,
  };
}

export function getWorldPhase(seed: WorldSeed, scrollT: number): ItemPhase {
  return seed.scene === "item" ? getItemPhase(scrollT) : getRoutePhase(scrollT);
}

export function getItemSceneSnapshot(seed: WorldSeed, scrollT: number): WorldPhaseTelemetry {
  const phase = getItemPhase(scrollT);
  return buildTelemetry(seed, scrollT, phase);
}

export function getWorldPhaseTelemetry(seed: WorldSeed, scrollT: number): WorldPhaseTelemetry {
  return buildTelemetry(seed, scrollT, getWorldPhase(seed, scrollT));
}

function buildTelemetry(
  seed: WorldSeed,
  scrollT: number,
  phase: ItemPhase
): WorldPhaseTelemetry {
  const from = ITEM_KEYFRAMES[phase.index];
  const to = ITEM_KEYFRAMES[phase.next];
  const side = seed.rngSeed % 2 === 0 ? 1 : -1;
  const depth = 0.9 + seed.intensity * 0.18;
  const cameraX = lerp(from.camera[0], to.camera[0], phase.t) * side;
  const lookX = lerp(from.lookAt[0], to.lookAt[0], phase.t) * side * 0.45;
  const heartbeat = 0.92 + Math.sin(phase.raw * Math.PI) * 0.08;

  return {
    scene: seed.scene,
    scrollT: clamp01(scrollT),
    phaseIndex: phase.index,
    nextPhaseIndex: phase.next,
    mix: phase.t,
    raw: phase.raw,
    id: from.id,
    nextId: to.id,
    label: seed.scene === "route" && phase.index === 2 ? "Exploration" : from.label,
    nextLabel: seed.scene === "route" && phase.next === 2 ? "Exploration" : to.label,
    cameraX,
    cameraY: lerp(from.camera[1], to.camera[1], phase.t),
    cameraZ: lerp(from.camera[2], to.camera[2], phase.t) * depth,
    lookX,
    lookY: lerp(from.lookAt[1], to.lookAt[1], phase.t),
    lookZ: lerp(from.lookAt[2], to.lookAt[2], phase.t),
    fov: lerp(from.fov, to.fov, phase.t),
    density: lerp(from.density, to.density, phase.t) * heartbeat,
    objectScale: lerp(from.objectScale, to.objectScale, phase.t),
    objectY: lerp(from.objectY, to.objectY, phase.t),
    objectZ: lerp(from.objectZ, to.objectZ, phase.t),
    twist: lerp(from.twist, to.twist, phase.t),
    glow: lerp(from.glow, to.glow, phase.t),
  };
}
