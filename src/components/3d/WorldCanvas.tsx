"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { WorldSeed } from "@/lib/world-seed";
import { SignalField } from "./SignalField";

interface Props {
  seed: WorldSeed;
  scrollT: number;
  pointer: { x: number; y: number };
}

/* ============================================================
   THE WORLD — a deep field you can reach into.

   Two layers, no hero object:
     1. Backdrop — a raymarched volumetric haze lit by a drifting
        key light, plus star dust that stretches into hyperspace
        streaks as scroll velocity rises.
     2. SignalField — ~26k points riding a curl-noise flow that the
        cursor genuinely deflects, and that clicking blows open.

   Bloom ties them together. Everything is scroll-aware: the haze
   advances, the palette travels cyan -> violet -> rose -> gold, and
   the field is dragged toward the reader as the page moves.
   ============================================================ */

const GOLD = new THREE.Color("#f6c66d");
const GOLD_DEEP = new THREE.Color("#8a5a1c");
const NEAR_BLACK = "#05060a";

const NEBULA_VERTEX_PASSTHROUGH = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BACKDROP_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uWarp;   // 0 idle .. 1 hyperspace (scroll velocity)
  uniform float uScroll;
  uniform vec3 uGoldDeep;
  uniform vec3 uGold;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  // ---- 3D value noise + fbm, for the volumetric pass ----
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
                   mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                   mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 col = vec3(0.039, 0.035, 0.031); // near black, warm

    /* ---- VOLUMETRIC ATMOSPHERE (raymarched) ----
       Marching a real density field lit by a key light gives honest depth:
       haze thickens with distance, light scatters through it, and the
       forge glow throws god-rays instead of a flat radial gradient.

       Budget: this runs per-pixel at full resolution, so octaves matter
       more than steps. 12 steps x 2 octaves (~192 hash calls/px) reads
       nearly identically to 20 x 4 (~640) once bloom and the scrim are
       over it, and it stopped Lighthouse timing out on CI hardware.
       Steps are unrolled against a const so the loop stays GLSL-ES safe. */
    vec3 ro = vec3(0.0, 0.0, 2.6);                       // camera
    vec3 rd = normalize(vec3(uv.x * 1.7, uv.y, -1.6));   // view ray
    vec3 lightPos = vec3(0.35 + sin(uTime * 0.13) * 0.25, 0.55, -1.1);
    vec3 lightDrift = vec3(uTime * 0.035, -uTime * 0.05 - uScroll * 1.6, uScroll * 2.2);

    float density = 0.0;
    vec3  scatter = vec3(0.0);
    const int STEPS = 12;
    for (int i = 0; i < STEPS; i++) {
      float t = 0.30 + float(i) * 0.32;
      vec3 pos = ro + rd * t;
      // The cloud drifts downward and forward as the reader travels
      vec3 q = pos * 1.15 + lightDrift;
      // Two octaves inline — the third and fourth were invisible here
      float d = (noise3(q) + 0.5 * noise3(q * 2.07 + 11.3)) / 1.5 - 0.46;
      d = max(d, 0.0) * smoothstep(4.4, 0.6, t);   // fade the far field
      if (d <= 0.0) continue;
      // Distance to the key light drives in-scattering
      float lightDist = length(pos - lightPos);
      float atten = 1.0 / (1.0 + lightDist * lightDist * 1.5);
      // Forward scattering — brighter when looking toward the light
      float phase = 0.55 + 0.45 * dot(rd, normalize(lightPos - pos));
      scatter += uGold * d * atten * phase * 0.85;
      density += d;
    }
    col += scatter * 0.85;
    col += uGoldDeep * min(density * 0.08, 0.25);

    // barely-there ambient warmth drifting behind the structure
    float breath = noise(uv * 1.6 + uTime * 0.015) * 0.5 + 0.5;
    col += uGoldDeep * breath * 0.05 * smoothstep(1.6, 0.0, length(uv));

    // SPACE TRANSITION — faint gold star dust that stretches into
    // hyperspace streaks as scroll velocity rises. The star grid's y-axis
    // compresses with uWarp, elongating each point into a light-line.
    float stretch = 1.0 + uWarp * 22.0;
    vec2 sp = vec2(uv.x * 48.0, (uv.y + uScroll * 6.0) * 48.0 / stretch);
    vec2 id = floor(sp);
    float sN = hash(id);
    float star = step(0.982, sN) * (1.0 - smoothstep(0.0, 0.06 + uWarp * 0.05, length(fract(sp) - 0.5)));
    float tw = 0.55 + 0.45 * sin(uTime * (1.0 + sN * 4.0) + sN * 50.0);
    col += uGold * star * tw * (0.10 + uWarp * 0.85);

    // grain
    col += (hash(uv * 700.0 + uTime) - 0.5) * 0.015;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Backdrop({ scrollT }: { scrollT: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const lastScroll = useRef(scrollT);
  const warp = useRef(0);
  const uniforms = useMemo(
    () => ({
      uTime:     { value: 0 },
      uWarp:     { value: 0 },
      uScroll:   { value: 0 },
      uGoldDeep: { value: GOLD_DEEP.clone() },
      uGold:     { value: GOLD.clone() },
    }),
    []
  );
  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;
    const dv = Math.abs(scrollT - lastScroll.current) / Math.max(delta, 1e-4);
    lastScroll.current = scrollT;
    warp.current += (Math.min(dv * 18, 1) - warp.current) * 0.09;
    m.uniforms.uWarp.value = warp.current;
    m.uniforms.uScroll.value = scrollT;
  });
  return (
    <mesh position={[0, 0, -12]}>
      <planeGeometry args={[46, 28]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={NEBULA_VERTEX_PASSTHROUGH}
        fragmentShader={BACKDROP_FRAGMENT}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ---------- main canvas ---------- */

export default function WorldCanvas({ seed, scrollT }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
      frameloop="always"
    >
      <color attach="background" args={[NEAR_BLACK]} />
      <Backdrop scrollT={scrollT} />
      <SignalField rngSeed={seed.rngSeed} scrollT={scrollT} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.95} luminanceThreshold={0.3} luminanceSmoothing={0.35} mipmapBlur radius={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
