"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldSeed } from "@/lib/world-seed";
import { makeRng } from "@/lib/world-seed";

interface Props {
  seed: WorldSeed;
  scrollT: number;
  pointer: { x: number; y: number };
}

/* ============================================================
   THE FILM — a scroll-scrubbed cinematic journey.

   Scroll position is the timeline: 0 → 1 flies the camera through
   four chapters (silk nebula → mineral strata → aurora field →
   horizon bloom), crossfaded so the world visibly *travels* rather
   than idles. Scroll velocity streaks the field like a long
   exposure; every click plants a blossom that shockwaves outward,
   then stays in the world and keeps slowly unfurling.

   One fullscreen fragment pass + one particle field. All chapter
   structures share a cheap 2-D fbm; the film grade (tonemap,
   anamorphic flare, vignette, grain) runs once at the end.
   ============================================================ */

const NEBULA_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MAX_BLOOMS = 8;

const NEBULA_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;      // 0..1 page journey
  uniform float uVel;         // smoothed |scroll velocity|
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec2  uPointer;
  uniform float uHue;
  uniform vec4  uBlooms[${MAX_BLOOMS}]; // xy: pos, z: birth time, w: flavor

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.13 + vec2(37.2, 17.9);
      a *= 0.5;
    }
    return v;
  }
  // Ridged variant — sharp luminous filaments
  float ridge(vec2 p) {
    float n = fbm(p);
    return pow(1.0 - abs(n * 2.0 - 1.0), 3.0);
  }

  vec3 hueShift(vec3 col, float h) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float c = cos(h * 6.28318);
    float s = sin(h * 6.28318);
    return col * c + cross(k, col) * s + k * dot(k, col) * (1.0 - c);
  }

  // ACES-ish filmic tone curve
  vec3 filmic(vec3 x) {
    x *= 0.9;
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= 1.7;

    // Camera: pointer sways the view, scroll flies it forward.
    vec2 p = uv - uPointer * 0.28;
    float travel = uScroll * 9.0;              // journey distance
    float speed  = clamp(uVel * 40.0, 0.0, 1.0); // 0 idle .. 1 flying

    // Velocity streak — long-exposure stretch along the travel axis.
    vec2 stretch = vec2(1.0, 1.0 + speed * 1.6);
    vec2 sp2 = p * stretch;

    /* ---- chapter weights along the journey (0..1 scroll) ---- */
    float w0 = 1.0 - smoothstep(0.16, 0.34, uScroll);                      // silk nebula
    float w1 = smoothstep(0.16, 0.34, uScroll) * (1.0 - smoothstep(0.44, 0.60, uScroll)); // strata
    float w2 = smoothstep(0.44, 0.60, uScroll) * (1.0 - smoothstep(0.74, 0.88, uScroll)); // aurora
    float w3 = smoothstep(0.74, 0.88, uScroll);                            // horizon bloom

    vec3 col = vec3(0.0);
    float structure = 0.0; // shared luminance used by the flare pass

    /* Ch.0 — SILK NEBULA: layered curtains sliding past */
    if (w0 > 0.002) {
      vec2 q = sp2 * 1.3 + vec2(uTime * 0.02, -travel * 0.35);
      float silk = fbm(q + fbm(q * 0.7 + travel * 0.1) * 1.4);
      float sheen = ridge(q * 0.8 - vec2(0.0, travel * 0.15)) * 0.7;
      vec3 c0 = mix(uColorC * 0.55, uColorA, silk);
      c0 = mix(c0, uColorB, sheen * 0.8);
      col += c0 * w0;
      structure += (silk * 0.6 + sheen) * w0;
    }

    /* Ch.1 — MINERAL STRATA: banded luminous veins racing by */
    if (w1 > 0.002) {
      vec2 q = sp2 * vec2(0.9, 2.2) + vec2(travel * 0.9, uTime * 0.03);
      float bands = sin(q.y * 6.0 + fbm(q * 1.4) * 5.0 - travel * 2.0);
      bands = pow(bands * 0.5 + 0.5, 3.0);
      float vein = ridge(q * vec2(1.6, 0.5));
      vec3 c1 = mix(uColorC * 0.5, hueShift(uColorB, 0.06), bands);
      c1 += hueShift(uColorA, -0.05) * vein * 0.9;
      col += c1 * w1;
      structure += (bands * 0.8 + vein * 0.7) * w1;
    }

    /* Ch.2 — AURORA FIELD: rippling curtains with vertical falloff */
    if (w2 > 0.002) {
      vec2 q = vec2(sp2.x * 1.1 + travel * 0.4, sp2.y);
      float wave = fbm(vec2(q.x * 1.3, uTime * 0.06 + travel * 0.2));
      float curtain = exp(-abs(q.y - (wave - 0.5) * 1.6) * 2.2);
      float shimmer = ridge(q * vec2(2.4, 0.8) + uTime * 0.05);
      vec3 c2 = uColorC * 0.45;
      c2 += hueShift(uColorA, 0.1) * curtain * (0.8 + shimmer * 0.6);
      c2 += uColorB * shimmer * curtain * 0.5;
      col += c2 * w2;
      structure += curtain * (0.9 + shimmer * 0.5) * w2;
    }

    /* Ch.3 — HORIZON BLOOM: dawn glow + converging god-rays */
    if (w3 > 0.002) {
      vec2 q = sp2;
      float horizon = exp(-abs(q.y + 0.35) * 2.6);
      float ang = atan(q.y + 0.35, q.x);
      float rays = pow(abs(sin(ang * 9.0 + fbm(vec2(ang * 3.0, uTime * 0.1)) * 2.0)), 6.0);
      float glow = exp(-length(q + vec2(0.0, 0.35)) * 1.4);
      vec3 c3 = mix(uColorC * 0.5, hueShift(uColorA, 0.16), horizon);
      c3 += hueShift(uColorB, 0.1) * rays * glow * 1.2;
      c3 += uColorA * glow * 0.6;
      col += c3 * w3;
      structure += (horizon * 0.7 + rays * glow) * w3;
    }

    /* ---- CLICK BLOSSOMS: shockwave, then a flower that keeps unfurling ---- */
    for (int i = 0; i < ${MAX_BLOOMS}; i++) {
      vec4 bl = uBlooms[i];
      if (bl.z <= 0.0) continue;
      float age = uTime - bl.z;
      if (age < 0.0) continue;
      vec2 d = p - bl.xy;
      float r = length(d);

      // Shockwave ring — fast, bright, gone in ~1.6s
      float ringR = age * 1.1;
      float ring = exp(-pow((r - ringR) * 9.0, 2.0)) * exp(-age * 1.6);

      // Blossom — petals that grow in over ~6s and persist, slowly rotating
      float grow = 1.0 - exp(-age * 0.45);
      float petals = 5.0 + floor(bl.w * 4.0);
      float theta = atan(d.y, d.x) + age * 0.07 + bl.w * 6.28;
      float flower = pow(abs(cos(theta * petals * 0.5)), 2.0);
      float bloomBody = exp(-r * (6.0 - grow * 3.2)) * flower * grow;

      vec3 bloomCol = hueShift(mix(uColorA, uColorB, bl.w), bl.w * 0.3);
      col += bloomCol * (ring * 1.4 + bloomBody * 0.9);
      structure += ring + bloomBody * 0.6;
    }

    /* ---- stars — finer, twinkling ---- */
    vec2 spr = uv * 42.0 + vec2(0.0, travel * 2.0);
    vec2 sId = floor(spr);
    float sN = hash(sId);
    float twinkle = 0.6 + 0.4 * sin(uTime * (1.5 + sN * 3.0) + sN * 40.0);
    float star = step(0.988, sN) * (1.0 - smoothstep(0.0, 0.05, length(fract(spr) - 0.5))) * twinkle;
    col += star * vec3(1.0, 0.95, 0.85) * (0.7 + speed * 0.8);

    /* ---- speed surge — the world brightens and cools while flying ---- */
    col *= 1.0 + speed * 0.35;
    col = mix(col, hueShift(col, 0.06), speed * 0.4);

    /* ---- film grade ---- */
    // anamorphic flare: bright structure smears horizontally
    float flare = structure * exp(-abs(uv.y) * 3.0);
    col += uColorB * flare * 0.10 * (1.0 + speed);

    // gentle chapter-based grade rotation so each chapter feels its own
    col = hueShift(col, uHue * 0.12 + uScroll * 0.10);

    // vignette + floor
    float vig = smoothstep(2.1, 0.35, length(uv));
    col *= 0.35 + 0.65 * vig;
    col = max(col, uColorC * 0.30);

    col = filmic(col);

    // fine grain
    col += (hash(uv * 913.7 + uTime) - 0.5) * 0.028;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ----- Particle field — dust that flies PAST the camera ----- */
function ParticleField({ seed, scrollT }: { seed: WorldSeed; scrollT: number }) {
  const ref = useRef<THREE.Points>(null);
  const lastScroll = useRef(scrollT);
  const vel = useRef(0);
  const count = Math.round(900 * seed.density);
  const baseColor = useMemo(() => new THREE.Color(seed.alcove.palette[0]), [seed.alcove.palette]);
  const accentColor = useMemo(() => new THREE.Color(seed.alcove.palette[1]), [seed.alcove.palette]);

  const { positions, colors } = useMemo(() => {
    const rng = makeRng(seed.rngSeed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rng() * 2 - 1) * 14;
      pos[i * 3 + 1] = (rng() * 2 - 1) * 8;
      pos[i * 3 + 2] = -rng() * 30; // a 30-unit-deep corridor
      const c = baseColor.clone().lerp(accentColor, rng());
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [count, seed.rngSeed, baseColor, accentColor]);

  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts) return;
    // Scroll velocity → fly-through speed (heavily smoothed)
    const dv = (scrollT - lastScroll.current) / Math.max(delta, 1e-4);
    lastScroll.current = scrollT;
    vel.current += (Math.abs(dv) - vel.current) * 0.08;

    const drift = 0.35 + Math.min(vel.current * 60, 14); // units/s toward camera
    const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 2; i < arr.length; i += 3) {
      arr[i] += drift * delta;
      if (arr[i] > 4) arr[i] -= 34; // recycle behind the far plane
    }
    (pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    pts.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.03;

    const mat = pts.material as THREE.PointsMaterial;
    mat.opacity = 0.55 + Math.min(vel.current * 25, 0.4);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.09}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ----- The cinematic backdrop plane ----- */
function CinematicField({ seed, scrollT, pointer }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pointerLerp = useRef(new THREE.Vector2(0, 0));
  const scrollLerp = useRef(scrollT);
  const lastScroll = useRef(scrollT);
  const vel = useRef(0);
  const bloomIndex = useRef(0);
  const { size } = useThree();

  const uniforms = useMemo(() => {
    const a = new THREE.Color(seed.alcove.palette[0]);
    const b = new THREE.Color(seed.alcove.palette[1]);
    const c = new THREE.Color(seed.alcove.palette[2]);
    return {
      uTime:    { value: 0 },
      uScroll:  { value: 0 },
      uVel:     { value: 0 },
      uColorA:  { value: new THREE.Vector3(a.r, a.g, a.b) },
      uColorB:  { value: new THREE.Vector3(b.r, b.g, b.b) },
      uColorC:  { value: new THREE.Vector3(c.r, c.g, c.b) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uHue:     { value: seed.hue },
      uBlooms:  { value: Array.from({ length: MAX_BLOOMS }, () => new THREE.Vector4(0, 0, 0, 0)) },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Palette morphs in place on route change (no uniform rebuild)
  useEffect(() => {
    const m = matRef.current;
    if (!m) return;
    const a = new THREE.Color(seed.alcove.palette[0]);
    const b = new THREE.Color(seed.alcove.palette[1]);
    const c = new THREE.Color(seed.alcove.palette[2]);
    (m.uniforms.uColorA.value as THREE.Vector3).set(a.r, a.g, a.b);
    (m.uniforms.uColorB.value as THREE.Vector3).set(b.r, b.g, b.b);
    (m.uniforms.uColorC.value as THREE.Vector3).set(c.r, c.g, c.b);
    m.uniforms.uHue.value = seed.hue;
  }, [seed.alcove.palette, seed.hue]);

  // Clicks plant blossoms in the world — they persist and keep unfurling.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const m = matRef.current;
      if (!m) return;
      const x = ((e.clientX / size.width) * 2 - 1) * 1.7;
      const y = -((e.clientY / size.height) * 2 - 1);
      const slot = (m.uniforms.uBlooms.value as THREE.Vector4[])[bloomIndex.current % MAX_BLOOMS];
      slot.set(x, y, m.uniforms.uTime.value as number, Math.random());
      bloomIndex.current++;
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [size.width, size.height]);

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;

    // Buttery scrubbing: lerp scroll, derive smoothed velocity for streaks
    scrollLerp.current += (scrollT - scrollLerp.current) * 0.09;
    const dv = Math.abs(scrollLerp.current - lastScroll.current) / Math.max(delta, 1e-4);
    lastScroll.current = scrollLerp.current;
    vel.current += (dv - vel.current) * 0.1;
    m.uniforms.uScroll.value = scrollLerp.current;
    m.uniforms.uVel.value = vel.current;

    pointerLerp.current.x += (pointer.x - pointerLerp.current.x) * 0.06;
    pointerLerp.current.y += (pointer.y - pointerLerp.current.y) * 0.06;
    (m.uniforms.uPointer.value as THREE.Vector2).copy(pointerLerp.current);
  });

  return (
    <mesh position={[0, 0, -10]}>
      <planeGeometry args={[40, 24]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={NEBULA_VERTEX}
        fragmentShader={NEBULA_FRAGMENT}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ----- Main canvas ----- */
export default function WorldCanvas({ seed, scrollT, pointer }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 65 }}
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
      frameloop="always"
    >
      <color attach="background" args={[seed.alcove.base]} />
      <CinematicField seed={seed} scrollT={scrollT} pointer={pointer} />
      <ParticleField seed={seed} scrollT={scrollT} />
    </Canvas>
  );
}
