"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { WorldSeed } from "@/lib/world-seed";
import { makeRng } from "@/lib/world-seed";

interface Props {
  seed: WorldSeed;
  scrollT: number;
  pointer: { x: number; y: number };
}

/* ============================================================
   MOLTEN GOLD — one gold accent on near black.

   A single emissive structure hangs in the dark: liquid gold
   pours down its surface (noise + time), and as you scroll the
   structure dissolves away from the bottom up — eroding into a
   glowing edge that sheds embers. The bloom pass blows the gold
   out into a halo, so highlights read as molten light rather
   than flat color. Embers are additive-blended cinders that rise,
   flicker, and die; every click bursts a handful more into the
   dark. Restraint everywhere else: near-black field, no second
   color, no competing shapes.
   ============================================================ */

const GOLD = new THREE.Color("#f6c66d");
const GOLD_HOT = new THREE.Color("#ffe9b8");
const GOLD_DEEP = new THREE.Color("#8a5a1c");
const NEAR_BLACK = "#0a0908";

/* ---------- molten structure ---------- */

const STRUCTURE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;   // 0..1 page journey — drives the shape morph
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  // cheap 3D-ish noise from 2D hashes
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  const float TAU = 6.28318530718;

  /* The mesh is a (u,v) parameter grid; the surface itself is computed
     here, as a scroll-weighted blend of four parametric forms:
       0  trefoil torus knot   — the award
       1  rising helix column  — the pour
       2  wide halo ring       — the medal
       3  spiked molten orb    — the star
     Tube forms share a frame built from the curve tangent. */

  vec3 tubePoint(vec3 C, vec3 T, float v, float r) {
    vec3 up = abs(T.y) > 0.94 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 B = normalize(cross(T, up));
    vec3 N = normalize(cross(B, T));
    float a = v * TAU;
    return C + (cos(a) * N + sin(a) * B) * r;
  }

  vec3 knotCenter(float u) {
    float t = u * TAU;
    float r = 1.15 + 0.42 * cos(3.0 * t);
    return vec3(r * cos(2.0 * t), 0.42 * sin(3.0 * t), r * sin(2.0 * t));
  }
  vec3 shapeKnot(float u, float v) {
    vec3 C = knotCenter(u);
    vec3 T = normalize(knotCenter(u + 0.004) - C);
    return tubePoint(C, T, v, 0.30);
  }

  vec3 helixCenter(float u) {
    float t = u * TAU * 2.6;
    return vec3(cos(t) * 0.72, (u - 0.5) * 3.9, sin(t) * 0.72);
  }
  vec3 shapeHelix(float u, float v) {
    vec3 C = helixCenter(u);
    vec3 T = normalize(helixCenter(u + 0.004) - C);
    return tubePoint(C, T, v, 0.24);
  }

  vec3 shapeHalo(float u, float v) {
    float t = u * TAU;
    vec3 C = vec3(cos(t) * 1.85, sin(t * 3.0) * 0.10, sin(t) * 1.85);
    vec3 T = normalize(vec3(-sin(t), cos(t * 3.0) * 0.05, cos(t)));
    return tubePoint(C, T, v, 0.22);
  }

  vec3 shapeOrb(float u, float v) {
    float th = u * TAU;
    float ph = v * 3.14159265;
    float spikes = 1.0 + 0.30 * sin(8.0 * th + uTime * 0.35) * sin(6.0 * ph);
    float R = 1.35 * spikes;
    return vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th)) * R;
  }

  vec3 surfacePos(float u, float v) {
    // chapter weights along the scroll journey (normalized)
    float w0 = 1.0 - smoothstep(0.14, 0.32, uScroll);
    float w1 = smoothstep(0.14, 0.32, uScroll) * (1.0 - smoothstep(0.42, 0.58, uScroll));
    float w2 = smoothstep(0.42, 0.58, uScroll) * (1.0 - smoothstep(0.68, 0.84, uScroll));
    float w3 = smoothstep(0.68, 0.84, uScroll);
    float s = w0 + w1 + w2 + w3;
    return (shapeKnot(u, v) * w0 + shapeHelix(u, v) * w1 +
            shapeHalo(u, v) * w2 + shapeOrb(u, v) * w3) / s;
  }

  void main() {
    // uv in [0,1]² comes from the parameter-grid plane geometry
    float u = uv.x;
    float v = uv.y;

    vec3 P = surfacePos(u, v);
    // analytic-ish normal via finite differences on the blended surface
    vec3 Pu = surfacePos(u + 0.003, v);
    vec3 Pv = surfacePos(u, v + 0.003);
    vec3 N = normalize(cross(Pu - P, Pv - P));

    // molten wobble — the surface breathes like cooling metal
    float w = noise(P.xy * 1.6 + uTime * 0.22)
            + noise(P.yz * 1.6 - uTime * 0.17);
    vec3 displaced = P + N * (w - 1.0) * 0.09;

    vPos = P;
    vNormal = normalize(normalMatrix * N);
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const STRUCTURE_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uDissolve;   // 0 intact .. 1 fully eroded
  uniform vec3  uGold;
  uniform vec3  uGoldHot;
  uniform vec3  uGoldDeep;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.11 + 19.7; a *= 0.5; }
    return v;
  }

  void main() {
    // Dissolve field: erode from the bottom up, ragged noise edge.
    float field = vPos.y * 0.35 + 0.5 + (fbm(vPos.xz * 2.6 + vPos.y) - 0.5) * 0.55;
    float cut = uDissolve * 1.35 - 0.15;
    if (field < cut) discard;
    // Hot eroding lip right at the dissolve boundary
    float lip = 1.0 - smoothstep(0.0, 0.14, field - cut);

    // Liquid pour: bright molten streaks flowing downward
    float pourField = fbm(vec2(vPos.x * 2.2 + vPos.z * 1.4, vPos.y * 1.6 + uTime * 0.55));
    float pour = smoothstep(0.55, 0.95, pourField);
    // slow secondary drips
    float drips = smoothstep(0.7, 1.0, fbm(vec2(vPos.x * 5.0, vPos.y * 2.4 + uTime * 0.22)));

    // Fresnel rim — molten silhouette
    float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.2);

    // Compose in HDR: values above ~1 are what the bloom pass grabs.
    vec3 col = uGoldDeep * 0.32;                    // cooled body
    col += uGold * pour * 1.45;                     // molten flow
    col += uGold * drips * 0.8;
    col += uGoldHot * rim * 1.35;                   // rim light
    col += uGoldHot * lip * 3.2;                    // white-hot dissolve edge
    col += uGold * 0.12 * (0.5 + 0.5 * sin(uTime * 0.4 + vPos.y * 2.0)); // slow breath

    gl_FragColor = vec4(col, 1.0);
  }
`;

function MoltenStructure({ scrollT, pointer }: { scrollT: number; pointer: { x: number; y: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const scrollLerp = useRef(0);
  const pointerLerp = useRef({ x: 0, y: 0 });

  const uniforms = useMemo(
    () => ({
      uTime:     { value: 0 },
      uScroll:   { value: 0 },
      uDissolve: { value: 0 },
      uGold:     { value: GOLD.clone() },
      uGoldHot:  { value: GOLD_HOT.clone() },
      uGoldDeep: { value: GOLD_DEEP.clone() },
    }),
    []
  );

  useFrame((state, delta) => {
    const g = groupRef.current;
    const m = matRef.current;
    if (!g || !m) return;
    m.uniforms.uTime.value += delta;

    scrollLerp.current += (scrollT - scrollLerp.current) * 0.07;
    const sc = scrollLerp.current;
    // Shape morph is scrubbed by the journey; the dissolve-to-embers is
    // saved for the finale (last ~20% of the page).
    m.uniforms.uScroll.value = sc;
    m.uniforms.uDissolve.value = THREE.MathUtils.clamp((sc - 0.8) / 0.2, 0, 1) * 0.9;

    pointerLerp.current.x += (pointer.x - pointerLerp.current.x) * 0.04;
    pointerLerp.current.y += (pointer.y - pointerLerp.current.y) * 0.04;

    // Chapter drift: the structure travels across the screen as forms change
    // (right for the helix, left for the halo, center for knot + finale).
    const w1 = THREE.MathUtils.smoothstep(sc, 0.14, 0.32) * (1 - THREE.MathUtils.smoothstep(sc, 0.42, 0.58));
    const w2 = THREE.MathUtils.smoothstep(sc, 0.42, 0.58) * (1 - THREE.MathUtils.smoothstep(sc, 0.68, 0.84));
    const driftX = w1 * 1.7 - w2 * 1.7;

    g.rotation.y = state.clock.elapsedTime * 0.12 + pointerLerp.current.x * 0.35 + sc * 2.2;
    g.rotation.x = -0.12 + pointerLerp.current.y * 0.18 + sc * 0.3;
    g.position.x = driftX;
    g.position.y = -0.3 + Math.sin(state.clock.elapsedTime * 0.35) * 0.12 + sc * 0.9;
    g.position.z = -2.5 - sc * 1.2;
    const s = 1.35 + sc * 0.45;
    g.scale.setScalar(s);
  });

  return (
    <group ref={groupRef} position={[0, -0.3, -2.5]}>
      <mesh>
        {/* Parameter grid — the actual surface is computed in the vertex
            shader as a scroll-morphed blend of four parametric forms. */}
        <planeGeometry args={[1, 1, 420, 56]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={STRUCTURE_VERTEX}
          fragmentShader={STRUCTURE_FRAGMENT}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* ---------- embers — rising additive cinders ---------- */

const EMBER_VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute float aSpeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uRush;    // scroll-velocity boost
  varying float vLife;
  varying float vSeed;

  void main() {
    float cycle = 9.0 / aSpeed;
    float life = fract((uTime * (1.0 + uRush * 1.6)) / cycle + aSeed);
    vLife = life;
    vSeed = aSeed;

    // spawn around the structure, spiral upward with turbulence
    float ang = aSeed * 6.28318 + life * (2.0 + aSeed * 3.0);
    float rad = 0.6 + aSeed * 2.2 + life * 0.9;
    vec3 p;
    p.x = cos(ang) * rad + sin(life * 21.0 + aSeed * 40.0) * 0.22;
    p.z = sin(ang) * rad * 0.7 - 2.5;
    p.y = -1.6 + life * 5.2 + sin(life * 13.0 + aSeed * 17.0) * 0.15;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float flicker = 0.75 + 0.25 * sin(uTime * (6.0 + aSeed * 9.0) + aSeed * 90.0);
    gl_PointSize = aSize * flicker * (140.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const EMBER_FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform vec3 uGold;
  uniform vec3 uGoldHot;
  varying float vLife;
  varying float vSeed;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    core *= core;
    // born white-hot, cools to deep gold, dies out
    float fade = smoothstep(0.0, 0.12, vLife) * (1.0 - smoothstep(0.55, 1.0, vLife));
    vec3 col = mix(uGoldHot, uGold * 0.75, smoothstep(0.0, 0.6, vLife));
    gl_FragColor = vec4(col * core * fade * 1.6, core * fade);
  }
`;

function Embers({ seed, scrollT }: { seed: WorldSeed; scrollT: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const lastScroll = useRef(scrollT);
  const rush = useRef(0);
  const count = 260;

  const attrs = useMemo(() => {
    const rng = makeRng(seed.rngSeed);
    const pos = new Float32Array(count * 3); // unused positions (computed in shader) but required
    const s = new Float32Array(count);
    const sp = new Float32Array(count);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = rng();
      sp[i] = 0.6 + rng() * 1.4;
      sz[i] = 2.2 + Math.pow(rng(), 2.2) * 6.5;
    }
    return { pos, s, sp, sz };
  }, [seed.rngSeed]);

  const uniforms = useMemo(
    () => ({
      uTime:    { value: 0 },
      uRush:    { value: 0 },
      uGold:    { value: GOLD.clone() },
      uGoldHot: { value: GOLD_HOT.clone() },
    }),
    []
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;
    const dv = Math.abs(scrollT - lastScroll.current) / Math.max(delta, 1e-4);
    lastScroll.current = scrollT;
    rush.current += (Math.min(dv * 30, 1) - rush.current) * 0.08;
    m.uniforms.uRush.value = rush.current;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attrs.pos, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[attrs.s, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[attrs.sp, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[attrs.sz, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={EMBER_VERTEX}
        fragmentShader={EMBER_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ---------- click bursts — a handful of cinders per click ---------- */

const MAX_BURSTS = 8;
const PER_BURST = 42;

const BURST_VERTEX = /* glsl */ `
  attribute vec3 aDir;
  attribute float aBurst;
  attribute float aSeed;
  uniform float uTime;
  uniform vec4 uBursts[${MAX_BURSTS}]; // xyz origin, w birth time
  varying float vFade;

  void main() {
    vec4 b = uBursts[int(aBurst)];
    float age = uTime - b.w;
    float alive = step(0.0, age) * step(b.w, 1e9) * step(0.001, b.w);
    float t = clamp(age / (1.6 + aSeed), 0.0, 1.0);
    // decelerating radial flight + gravity-lite droop
    vec3 p = b.xyz + aDir * (1.0 - pow(1.0 - t, 2.6)) * (1.3 + aSeed * 1.4);
    p.y -= t * t * 0.55;
    vFade = alive * (1.0 - t);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.0 + aSeed * 5.0) * vFade * (140.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const BURST_FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform vec3 uGoldHot;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uGoldHot * core * vFade * 1.8, core * vFade);
  }
`;

function ClickBursts() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const slot = useRef(0);
  const { camera, size } = useThree();

  const attrs = useMemo(() => {
    // Seeded rng keeps render pure (react-hooks/purity) — burst shapes are
    // aesthetic, so a fixed seed loses nothing.
    const rng = makeRng(1618);
    const n = MAX_BURSTS * PER_BURST;
    const pos = new Float32Array(n * 3);
    const dir = new Float32Array(n * 3);
    const burst = new Float32Array(n);
    const sd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const phi = rng() * Math.PI * 2;
      const theta = Math.acos(rng() * 2 - 1);
      dir[i * 3] = Math.sin(theta) * Math.cos(phi);
      dir[i * 3 + 1] = Math.abs(Math.cos(theta)) * 0.9 + 0.1; // bias upward
      dir[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * 0.6;
      burst[i] = Math.floor(i / PER_BURST);
      sd[i] = rng();
    }
    return { pos, dir, burst, sd };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime:    { value: 0 },
      uGoldHot: { value: GOLD_HOT.clone() },
      uBursts:  { value: Array.from({ length: MAX_BURSTS }, () => new THREE.Vector4(0, 0, 0, 0)) },
    }),
    []
  );

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const m = matRef.current;
      if (!m) return;
      // unproject the click onto the z = -2.5 plane the scene lives on
      const ndc = new THREE.Vector3(
        (e.clientX / size.width) * 2 - 1,
        -(e.clientY / size.height) * 2 + 1,
        0.5
      ).unproject(camera);
      const dirV = ndc.sub(camera.position).normalize();
      const t = (-2.5 - camera.position.z) / dirV.z;
      const hit = camera.position.clone().add(dirV.multiplyScalar(t));
      const v = (m.uniforms.uBursts.value as THREE.Vector4[])[slot.current % MAX_BURSTS];
      v.set(hit.x, hit.y, hit.z, m.uniforms.uTime.value as number);
      slot.current++;
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [camera, size.width, size.height]);

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attrs.pos, 3]} />
        <bufferAttribute attach="attributes-aDir" args={[attrs.dir, 3]} />
        <bufferAttribute attach="attributes-aBurst" args={[attrs.burst, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[attrs.sd, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={BURST_VERTEX}
        fragmentShader={BURST_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ---------- near-black backdrop with the faintest warm breath ---------- */

const BACKDROP_FRAGMENT = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uGoldDeep;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 col = vec3(0.039, 0.035, 0.031); // near black, warm
    // barely-there ambient warmth drifting behind the structure
    float breath = noise(uv * 1.6 + uTime * 0.015) * 0.5 + 0.5;
    col += uGoldDeep * breath * 0.05 * smoothstep(1.6, 0.0, length(uv));
    // grain
    col += (hash(uv * 700.0 + uTime) - 0.5) * 0.015;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Backdrop() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime:     { value: 0 },
      uGoldDeep: { value: GOLD_DEEP.clone() },
    }),
    []
  );
  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta;
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

const NEBULA_VERTEX_PASSTHROUGH = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ---------- main canvas ---------- */

export default function WorldCanvas({ seed, scrollT, pointer }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
      frameloop="always"
    >
      <color attach="background" args={[NEAR_BLACK]} />
      <Backdrop />
      <MoltenStructure scrollT={scrollT} pointer={pointer} />
      <Embers seed={seed} scrollT={scrollT} />
      <ClickBursts />
      <EffectComposer multisampling={0}>
        <Bloom intensity={1.15} luminanceThreshold={0.42} luminanceSmoothing={0.3} mipmapBlur radius={0.72} />
      </EffectComposer>
    </Canvas>
  );
}
