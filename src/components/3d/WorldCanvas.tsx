"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldSeed } from "@/lib/world-seed";
import { makeRng } from "@/lib/world-seed";
import {
  ITEM_KEYFRAMES,
  clamp01,
  getItemPhase,
  getItemSceneSnapshot,
  lerp,
} from "@/lib/world-phase";

interface Props {
  seed: WorldSeed;
  scrollT: number;
  scrollVelocity: number;
  pointer: { x: number; y: number };
  quality: "full" | "lite";
  worldIntensity: number;
}

const ITEM_MORPH_STOPS = ITEM_KEYFRAMES.length;

function signedNoise(seed: number, vertexIndex: number, channel: number): number {
  const n = Math.sin((seed * 0.0001 + vertexIndex * 12.9898 + channel * 78.233) * 437.585);
  return (n - Math.floor(n)) * 2 - 1;
}

function writeTarget(
  target: Float32Array,
  offset: number,
  x: number,
  y: number,
  z: number
) {
  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = z;
}

function buildItemMorphTargets(
  base: Float32Array,
  seed: WorldSeed
): Float32Array[] {
  const targets = Array.from({ length: ITEM_MORPH_STOPS }, () => new Float32Array(base.length));
  const motifBend: Record<string, number> = {
    orbit: 0.32,
    lattice: 0.12,
    ripple: 0.42,
    particles: 0.5,
    prism: 0.22,
    gem: 0.28,
  };
  const bend = motifBend[seed.alcove.motif] ?? 0.3;
  const seedAngle = seed.hue * Math.PI * 2;

  for (let i = 0; i < base.length; i += 3) {
    const vertexIndex = i / 3;
    const x = base[i];
    const y = base[i + 1];
    const z = base[i + 2];
    const length = Math.hypot(x, y, z) || 1;
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;
    const angle = Math.atan2(nz, nx);
    const ring = Math.hypot(nx, nz);
    const jitter = signedNoise(seed.rngSeed, vertexIndex, 1);
    const jitterB = signedNoise(seed.rngSeed, vertexIndex, 2);
    const facet = Math.sin(angle * 6 + seedAngle) * 0.08;

    const compactRadius = 1.0 + jitter * 0.055 + facet;
    writeTarget(targets[0], i, nx * compactRadius, ny * compactRadius, nz * compactRadius);

    const apertureRadius = 1.42 + Math.sin(angle * 4 + seedAngle) * 0.13 + jitter * 0.04;
    writeTarget(
      targets[1],
      i,
      Math.cos(angle) * apertureRadius,
      ny * 0.24 + jitterB * 0.045,
      Math.sin(angle) * (apertureRadius * (0.58 + Math.abs(ny) * 0.18))
    );

    const helixTurn = angle + ny * (3.6 + bend * 2.4) + seedAngle * 0.35;
    const helixRadius = 0.72 + ring * 0.45 + jitter * 0.08;
    writeTarget(
      targets[2],
      i,
      Math.cos(helixTurn) * helixRadius,
      ny * 1.45,
      Math.sin(helixTurn) * helixRadius
    );

    const gridStep = 2.8;
    writeTarget(
      targets[3],
      i,
      Math.round(nx * gridStep) / gridStep * 1.42 + jitter * 0.045,
      Math.round(ny * gridStep) / gridStep * 1.15 + jitterB * 0.035,
      Math.round(nz * gridStep) / gridStep * 1.42 + signedNoise(seed.rngSeed, vertexIndex, 3) * 0.045
    );

    const bloomRadius = 1.22 + Math.pow(Math.abs(Math.sin(angle * 3 + seedAngle)), 1.7) * 0.5 + jitter * 0.08;
    writeTarget(
      targets[4],
      i,
      nx * bloomRadius * (1 + bend * 0.25),
      ny * bloomRadius * 0.86,
      nz * bloomRadius
    );

    const shardRadius = (1 - Math.abs(ny)) * 0.78 + 0.12 + jitter * 0.035;
    const shardAngle = angle + seedAngle * 0.2 + jitterB * 0.18;
    writeTarget(
      targets[5],
      i,
      Math.cos(shardAngle) * shardRadius,
      ny * 1.65,
      Math.sin(shardAngle) * shardRadius * (0.72 + bend * 0.3)
    );
  }

  return targets;
}

/* ----- Shared shaders (one set, swap uniforms) ----- */

const NEBULA_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEBULA_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec2  uPointer;
  uniform float uHue;
  uniform float uVelocity;
  uniform float uIntensity;

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
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p *= 2.07;
      a *= 0.5;
    }
    return v;
  }

  // hue rotation helper — keeps tonal weight, rotates color around the wheel
  vec3 hueShift(vec3 col, float h) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float c = cos(h * 6.28318);
    float s = sin(h * 6.28318);
    return col * c + cross(k, col) * s + k * dot(k, col) * (1.0 - c);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= 1.7; // aspect compensate

    // pointer parallax — gives a sense of depth as cursor moves
    vec2 p = uv - uPointer * 0.22;

    // Slow drifting noise field (the "nebula")
    vec2 q = p * 1.4 + vec2(uTime * 0.025, -uTime * 0.018);
    float n1 = fbm(q + uScroll * 0.6);
    float n2 = fbm(q * 1.7 + vec2(-uTime * 0.04, uTime * 0.03));
    float n3 = fbm(q * 3.1 - uTime * 0.02);

    // Distance-from-center fall-off so edges go deep
    float d = length(uv) * 0.7;
    float vignette = smoothstep(1.8, 0.0, d);

    // Stars: bright pinpoints scattered through the field
    vec2 sp = uv * 35.0;
    vec2 sId = floor(sp);
    vec2 sF  = fract(sp) - 0.5;
    float starNoise = hash(sId);
    float star = step(0.985, starNoise) * (1.0 - smoothstep(0.0, 0.06, length(sF))) * 1.2;

    // Scroll-driven swirl — moves through the world as user scrolls
    float swirlAngle = uScroll * 1.8 + n2 * 1.5;
    float swirl = sin(d * 12.0 - swirlAngle * 2.4) * 0.5 + 0.5;
    swirl = pow(swirl * vignette, 2.4) * 0.8;

    // Energy core — soft glow that breathes with time + scroll
    float core = exp(-d * 2.8) * (0.4 + 0.25 * sin(uTime * 0.3));
    core *= 0.9 + 0.4 * sin(uScroll * 3.2);

    // Composite colors
    vec3 deepBase = mix(uColorC, hueShift(uColorA, uHue * 0.15), n1);
    vec3 midGlow  = mix(deepBase, hueShift(uColorB, uHue * 0.25), swirl * 0.85);
    vec3 hot      = mix(midGlow, hueShift(uColorA, uHue * 0.4), core);

    // Stars overlay
    vec3 col = hot + star * vec3(1.0, 0.96, 0.85);

    // Subtle film grain so it doesn't look CSS-flat
    float grain = (hash(uv * 800.0 + uTime) - 0.5) * 0.03;
    col += grain;

    // Reach for the floor — never pure black, always tinted
    col = max(col, uColorC * 0.4);

    // Scroll-driven cooling: the deeper you scroll, the more the palette
    // pushes toward color C (the deepest tone). Adds a "journey" feel.
    col = mix(col, hueShift(col, uScroll * 0.18), 0.35);

    // Velocity-driven chromatic depth: subtle edge split that decays from JS.
    float chroma = min(0.12, abs(uVelocity) * 0.006) * uIntensity;
    float edge = smoothstep(0.35, 1.45, length(uv));
    col.r += chroma * edge * 0.7;
    col.b -= chroma * edge * 0.45;

    // Cursor-centered vignette: darker at the edges, slightly brighter when
    // the pointer comes home to center.
    vec2 vignetteCenter = uPointer * 0.28;
    float edgeVignette = smoothstep(0.45, 1.55, length(uv - vignetteCenter));
    float centerBoost = (1.0 - smoothstep(0.0, 0.55, length(uPointer))) * 0.1;
    col *= 1.0 - edgeVignette * (0.35 - centerBoost) * uIntensity;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const SHAFT_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float center = 1.0 - smoothstep(0.0, 0.48, abs(vUv.x - 0.5));
    float vertical = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.72, 1.0, vUv.y));
    float glow = pow(center, 1.75) * vertical;
    gl_FragColor = vec4(uColor, glow * uOpacity);
  }
`;

const DRIFT_PARTICLE_VERTEX = /* glsl */ `
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vAlpha = clamp(1.0 - abs(position.z) * 0.04, 0.35, 1.0);
    gl_PointSize = aSize * (280.0 / max(1.0, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const DRIFT_PARTICLE_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uChroma;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float disc = 1.0 - smoothstep(0.18, 0.5, d);
    vec3 color = uColor + vec3(uChroma, 0.0, -uChroma * 0.65);
    gl_FragColor = vec4(color, disc * uOpacity * vAlpha);
  }
`;

/* ----- Particle field (sparse glowing dust) ----- */
function ParticleField({ seed, scrollT }: { seed: WorldSeed; scrollT: number }) {
  const ref = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const isItemScene = seed.scene === "item";
  const count = Math.round((isItemScene ? 1300 : 800) * seed.density);
  const baseColor = useMemo(() => new THREE.Color(seed.alcove.palette[0]), [seed.alcove.palette]);
  const accentColor = useMemo(() => new THREE.Color(seed.alcove.palette[1]), [seed.alcove.palette]);

  const { positions, colors, sizes } = useMemo(() => {
    const rng = makeRng(seed.rngSeed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute on a soft sphere of radius ~8 with slight elongation in z
      const phi = rng() * Math.PI * 2;
      const theta = Math.acos(rng() * 2 - 1);
      const r = 4 + Math.pow(rng(), 0.6) * 8;
      pos[i * 3] = Math.cos(phi) * Math.sin(theta) * r;
      pos[i * 3 + 1] = Math.cos(theta) * r * 0.7;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r - 6;

      // Mix the two accent colors per particle (using rng for the mix)
      const mixT = rng();
      const c = baseColor.clone().lerp(accentColor, mixT);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      sz[i] = 0.04 + Math.pow(rng(), 3) * 0.18;
    }
    return { positions: pos, colors: col, sizes: sz };
  }, [count, seed.rngSeed, baseColor, accentColor]);

  useFrame((state, delta) => {
    const p = ref.current;
    if (!p) return;
    // Slow rotation + scroll-driven dolly along z
    p.rotation.y += delta * 0.018;
    p.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.04;
    p.position.z = isItemScene ? -scrollT * 5.2 : -scrollT * 2.5;

    if (isItemScene) {
      const frame = getItemSceneSnapshot(seed, scrollT);
      const pulse = clamp01(frame.density);
      const visibleCount = Math.max(140, Math.floor(count * (0.34 + pulse * 0.66)));
      geometryRef.current?.setDrawRange(0, visibleCount);
      if (materialRef.current) {
        materialRef.current.opacity = 0.34 + pulse * 0.5;
        materialRef.current.size = 0.065 + pulse * 0.09;
      }
    } else {
      // Reset imperatives the item scene may have set on previous frames so
      // route pages visited after an item don't inherit a clipped/dimmed field.
      geometryRef.current?.setDrawRange(0, Infinity);
      if (materialRef.current) {
        materialRef.current.opacity = 0.85;
        materialRef.current.size = 0.12;
      }
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.12}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ----- Nebula background plane (covers viewport) ----- */
function NebulaBackground({ seed, scrollT, scrollVelocity, pointer, worldIntensity }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pointerLerp = useRef(new THREE.Vector2(0, 0));
  const targetColors = useMemo(() => {
    const a = new THREE.Color(seed.alcove.palette[0]);
    const b = new THREE.Color(seed.alcove.palette[1]);
    const c = new THREE.Color(seed.alcove.palette[2]);
    return [
      new THREE.Vector3(a.r, a.g, a.b),
      new THREE.Vector3(b.r, b.g, b.b),
      new THREE.Vector3(c.r, c.g, c.b),
    ] as const;
  }, [seed.alcove.palette]);

  const uniforms = useMemo(() => {
    const a = new THREE.Color(seed.alcove.palette[0]);
    const b = new THREE.Color(seed.alcove.palette[1]);
    const c = new THREE.Color(seed.alcove.palette[2]);
    return {
      uTime:    { value: 0 },
      uScroll:  { value: 0 },
      uColorA:  { value: new THREE.Vector3(a.r, a.g, a.b) },
      uColorB:  { value: new THREE.Vector3(b.r, b.g, b.b) },
      uColorC:  { value: new THREE.Vector3(c.r, c.g, c.b) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uHue:     { value: seed.hue },
      uVelocity: { value: 0 },
      uIntensity: { value: worldIntensity },
    };
    // Palette changes are lerped in useFrame so route transitions do not snap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;
    m.uniforms.uScroll.value = scrollT;
    m.uniforms.uVelocity.value = scrollVelocity;
    m.uniforms.uIntensity.value = worldIntensity;
    m.uniforms.uHue.value = lerp(m.uniforms.uHue.value, seed.hue, Math.min(1, delta / 0.6));
    (m.uniforms.uColorA.value as THREE.Vector3).lerp(targetColors[0], Math.min(1, delta / 0.6));
    (m.uniforms.uColorB.value as THREE.Vector3).lerp(targetColors[1], Math.min(1, delta / 0.6));
    (m.uniforms.uColorC.value as THREE.Vector3).lerp(targetColors[2], Math.min(1, delta / 0.6));
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

function ScenePalette({ seed }: { seed: WorldSeed }) {
  const current = useRef(new THREE.Color(seed.alcove.base));
  const target = useMemo(() => new THREE.Color(seed.alcove.base), [seed.alcove.base]);

  useFrame((state, delta) => {
    current.current.lerp(target, Math.min(1, delta / 0.6));
    state.scene.background = current.current;
  });

  return null;
}

function ReactiveLights({ seed, scrollT, pointer, worldIntensity }: Props) {
  const keyRef = useRef<THREE.PointLight>(null);
  const fillRef = useRef<THREE.PointLight>(null);
  const rimRef = useRef<THREE.PointLight>(null);
  const keyTarget = useMemo(() => new THREE.Color(seed.alcove.palette[0]), [seed.alcove.palette]);
  const fillTarget = useMemo(() => new THREE.Color(seed.alcove.palette[1]), [seed.alcove.palette]);
  const rimTarget = useMemo(() => new THREE.Color(seed.alcove.palette[2]), [seed.alcove.palette]);

  useFrame((_, delta) => {
    const key = keyRef.current;
    const fill = fillRef.current;
    const rim = rimRef.current;
    if (key) {
      key.color.lerp(keyTarget, Math.min(1, delta / 0.6));
      key.position.lerp(new THREE.Vector3(2.6 + pointer.x * 0.9, 2.1 + pointer.y * 0.35, 3.3 - scrollT), 0.045);
      key.intensity = lerp(key.intensity, (1.45 + scrollT * 0.55) * worldIntensity, 0.05);
    }
    if (fill) {
      fill.color.lerp(fillTarget, Math.min(1, delta / 0.6));
      fill.position.lerp(new THREE.Vector3(-3.6 + pointer.x * 0.45, -1.2 + pointer.y * 0.25, 2.8), 0.04);
      fill.intensity = lerp(fill.intensity, (0.82 + Math.sin(scrollT * Math.PI) * 0.42) * worldIntensity, 0.05);
    }
    if (rim) {
      rim.color.lerp(rimTarget, Math.min(1, delta / 0.6));
      rim.position.lerp(new THREE.Vector3(pointer.x * 1.4, 1.7 + pointer.y * 0.45, -3.8), 0.05);
      rim.intensity = lerp(rim.intensity, (0.7 + scrollT * 0.6) * worldIntensity, 0.04);
    }
  });

  return (
    <>
      <ambientLight intensity={0.22 * worldIntensity} />
      <pointLight ref={keyRef} position={[3, 2, 4]} intensity={1.4} color={seed.alcove.palette[0]} />
      <pointLight ref={fillRef} position={[-4, -1, 3]} intensity={0.9} color={seed.alcove.palette[1]} />
      <pointLight ref={rimRef} position={[0, 2, -4]} intensity={0.7} color={seed.alcove.palette[2]} />
    </>
  );
}

function GodRayBeam({
  seed,
  pointer,
  scrollT,
  worldIntensity,
  index,
  x,
  y,
  z,
  rotation,
  width,
}: Props & { index: number; x: number; y: number; z: number; rotation: number; width: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const sun = useRef(new THREE.Vector3(0, 0.7, -2));
  const targetColor = useMemo(() => new THREE.Color(seed.alcove.palette[index % seed.alcove.palette.length]), [index, seed.alcove.palette]);
  const uniforms = useMemo(() => ({
    uColor: { value: targetColor.clone() },
    uOpacity: { value: 0 },
  }), [targetColor]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    sun.current.lerp(new THREE.Vector3(pointer.x * 0.4, 0.7 + pointer.y * 0.2, -2), 0.025);
    if (mesh) {
      mesh.position.x = x + sun.current.x * (0.8 + index * 0.12);
      mesh.position.y = y + Math.sin(state.clock.elapsedTime * 0.18 + index) * 0.12 + sun.current.y * 0.18;
      mesh.position.z = z;
      mesh.rotation.z = rotation + pointer.x * 0.08 + Math.sin(state.clock.elapsedTime * 0.08 + index) * 0.035;
    }
    if (mat) {
      (mat.uniforms.uColor.value as THREE.Color).lerp(targetColor, Math.min(1, delta / 0.6));
      mat.uniforms.uOpacity.value = (0.055 + scrollT * 0.08) * worldIntensity;
    }
  });

  return (
    <mesh ref={meshRef} position={[x, y, z]} rotation={[0, 0, rotation]}>
      <planeGeometry args={[width, 7.2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={NEBULA_VERTEX}
        fragmentShader={SHAFT_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GodRayShafts(props: Props) {
  const beams = useMemo(() => [
    { x: -1.9, y: 0.25, z: -4.8, rotation: -0.28, width: 0.8 },
    { x: -0.7, y: 0.45, z: -4.2, rotation: -0.16, width: 0.55 },
    { x: 0.5, y: 0.32, z: -4.5, rotation: 0.08, width: 0.7 },
    { x: 1.7, y: 0.12, z: -5.2, rotation: 0.22, width: 0.65 },
  ], []);

  if (props.quality === "lite") return null;

  return (
    <>
      {beams.map((beam, index) => (
        <GodRayBeam key={index} {...props} {...beam} index={index} />
      ))}
    </>
  );
}

function DriftPlane({
  seed,
  pointer,
  scrollVelocity,
  worldIntensity,
  plane,
  count,
  z,
}: Props & { plane: number; count: number; z: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const colorTarget = useMemo(() => new THREE.Color(seed.alcove.palette[plane % seed.alcove.palette.length]), [plane, seed.alcove.palette]);
  const { positions, sizes } = useMemo(() => {
    const rng = makeRng(seed.rngSeed + plane * 101);
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rng() - 0.5) * (11 + plane * 2);
      pos[i * 3 + 1] = (rng() - 0.5) * (5.8 + plane);
      pos[i * 3 + 2] = (rng() - 0.5) * 0.7;
      sz[i] = 6 + rng() * 6;
    }
    return { positions: pos, sizes: sz };
  }, [count, plane, seed.rngSeed]);
  const uniforms = useMemo(() => ({
    uColor: { value: colorTarget.clone() },
    uOpacity: { value: 0.18 },
    uChroma: { value: 0 },
  }), [colorTarget]);

  useFrame((state, delta) => {
    const p = pointsRef.current;
    const mat = matRef.current;
    const depth = Math.abs(z) / 8;
    if (p) {
      p.position.x = pointer.x * depth * 0.65;
      p.position.y = pointer.y * depth * 0.28;
      p.position.z = z + Math.sin(state.clock.elapsedTime * 0.12 + plane) * 0.18;
      p.rotation.z += delta * (0.006 + plane * 0.002);
    }
    if (mat) {
      (mat.uniforms.uColor.value as THREE.Color).lerp(colorTarget, Math.min(1, delta / 0.6));
      mat.uniforms.uOpacity.value = (0.11 + plane * 0.04) * worldIntensity;
      mat.uniforms.uChroma.value = plane === 0 ? Math.min(0.09, Math.abs(scrollVelocity) * 0.003) : 0;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={DRIFT_PARTICLE_VERTEX}
        fragmentShader={DRIFT_PARTICLE_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function DepthDriftParticles(props: Props) {
  const counts = props.quality === "lite"
    ? [{ plane: 1, count: 24, z: -4 }]
    : [
        { plane: 0, count: 24, z: -8 },
        { plane: 1, count: 32, z: -4 },
        { plane: 2, count: 16, z: -1 },
      ];

  return (
    <>
      {counts.map((cfg) => (
        <DriftPlane key={cfg.plane} {...props} {...cfg} />
      ))}
    </>
  );
}

function FocalBloomHalo({ seed, scrollT, worldIntensity }: { seed: WorldSeed; scrollT: number; worldIntensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const colorTarget = useMemo(() => new THREE.Color(seed.alcove.palette[1]), [seed.alcove.palette]);

  useFrame((state) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    const frame = seed.scene === "item" ? getItemSceneSnapshot(seed, scrollT) : null;
    if (mesh) {
      mesh.position.y = frame ? frame.objectY : -0.5 + Math.sin(state.clock.elapsedTime * 0.4) * 0.25;
      mesh.position.z = frame ? frame.objectZ : -2 - scrollT * 4;
      const scale = (frame ? frame.objectScale : 1) * (1.9 + Math.sin(state.clock.elapsedTime * 0.5) * 0.08);
      mesh.scale.setScalar(scale);
    }
    if (mat) {
      mat.color.lerp(colorTarget, 0.035);
      mat.opacity = (seed.scene === "item" ? 0.16 : 0.12) * worldIntensity;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -0.5, -2]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        color={seed.alcove.palette[1]}
        transparent
        opacity={0.14}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ----- Morphing focal object: item pages get six deterministic keyframes ----- */
function ItemFocalObject({ seed, scrollT }: { seed: WorldSeed; scrollT: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.IcosahedronGeometry>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const targetsRef = useRef<Float32Array[] | null>(null);
  const targetKeyRef = useRef("");
  const basePositionsRef = useRef<Float32Array | null>(null);
  const baseColor = useMemo(() => new THREE.Color(seed.alcove.palette[0]), [seed.alcove.palette]);
  const emissiveColor = useMemo(() => new THREE.Color(seed.alcove.palette[1]), [seed.alcove.palette]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const geometry = geometryRef.current;
    if (!geometry) return;
    if (!basePositionsRef.current) {
      basePositionsRef.current = (geometry.attributes.position.array as Float32Array).slice();
    }
    if (!targetsRef.current || targetKeyRef.current !== seed.key) {
      targetsRef.current = buildItemMorphTargets(basePositionsRef.current, seed);
      targetKeyRef.current = seed.key;
    }
    const targets = targetsRef.current;
    const position = geometry.attributes.position;
    const array = position.array as Float32Array;
    const phase = getItemPhase(scrollT);
    const from = targets[phase.index];
    const to = targets[phase.next];
    const frame = getItemSceneSnapshot(seed, scrollT);

    for (let i = 0; i < array.length; i++) {
      array[i] = lerp(from[i], to[i], phase.t);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();

    if (!mesh) return;
    mesh.rotation.x += delta * (0.12 + frame.twist * 0.08);
    mesh.rotation.y += delta * (0.22 + frame.twist * 0.12);
    mesh.rotation.z = Math.sin(state.clock.elapsedTime * 0.22 + seed.hue * 6.28) * 0.12;
    mesh.position.y = frame.objectY + Math.sin(state.clock.elapsedTime * 0.45) * 0.08;
    mesh.position.z = frame.objectZ;
    mesh.scale.setScalar(frame.objectScale * (1 + Math.sin(state.clock.elapsedTime * 0.65) * 0.035));

    const material = materialRef.current;
    if (material) {
      material.opacity = 0.48 + frame.glow * 0.18;
      material.emissiveIntensity = frame.glow;
      material.wireframe = seed.alcove.motif === "lattice" || phase.index === 3;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -0.4, -2.2]}>
      <icosahedronGeometry ref={geometryRef} args={[1, 2]} />
      <meshStandardMaterial
        ref={materialRef}
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={0.85}
        roughness={0.28}
        metalness={0.72}
        transparent
        opacity={0.62}
      />
    </mesh>
  );
}

/* ----- Floating focal object for non-item routes ----- */
function RouteFocalObject({ seed, scrollT }: { seed: WorldSeed; scrollT: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Pick geometry detail level from alcove motif (radius, detail)
  const geometryArgs = useMemo<[number, number]>(() => {
    switch (seed.alcove.motif) {
      case "gem":     return [1.2, 0];
      case "prism":   return [1, 4];
      case "lattice": return [1.1, 1];
      case "orbit":   return [1, 2];
      case "ripple":  return [1, 3];
      case "particles": return [0.95, 5];
      default: return [1, 1];
    }
  }, [seed.alcove.motif]);

  const baseColor = useMemo(() => new THREE.Color(seed.alcove.palette[0]), [seed.alcove.palette]);
  const emissiveColor = useMemo(() => new THREE.Color(seed.alcove.palette[1]), [seed.alcove.palette]);

  useFrame((state, delta) => {
    const m = meshRef.current;
    if (!m) return;
    m.rotation.x += delta * 0.18;
    m.rotation.y += delta * 0.24;
    // Scroll-driven: the focal object recedes as user scrolls deeper
    m.position.z = -2 - scrollT * 4;
    m.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 0.4) * 0.25;
    m.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.6) * 0.05);
  });

  return (
    <mesh ref={meshRef} position={[0, -0.5, -2]}>
      <icosahedronGeometry args={geometryArgs} />
      <meshStandardMaterial
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={0.7}
        roughness={0.35}
        metalness={0.6}
        transparent
        opacity={0.55}
        wireframe={seed.alcove.motif === "lattice"}
      />
    </mesh>
  );
}

/* ----- Floating focal object (per-item or per-route hero geometry) ----- */
function FocalObject({ seed, scrollT }: { seed: WorldSeed; scrollT: number }) {
  if (seed.scene === "item") {
    return <ItemFocalObject seed={seed} scrollT={scrollT} />;
  }
  return <RouteFocalObject seed={seed} scrollT={scrollT} />;
}

/* ----- Camera rig — item pages dolly through the six reading keyframes ----- */
function CameraRig({ seed, scrollT, pointer }: Props) {
  const desired = useRef(new THREE.Vector3(0, 0, 6));
  const target = useRef(new THREE.Vector3(0, -0.25, -2));

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;

    if (seed.scene === "item") {
      const frame = getItemSceneSnapshot(seed, scrollT);
      desired.current.set(
        frame.cameraX + pointer.x * 0.16,
        frame.cameraY + pointer.y * 0.08,
        frame.cameraZ
      );
      target.current.set(
        frame.lookX + pointer.x * 0.05,
        frame.lookY + pointer.y * 0.03,
        frame.lookZ
      );
      camera.position.lerp(desired.current, 0.065);
      camera.lookAt(target.current);
      camera.fov = lerp(camera.fov, frame.fov, 0.045);
      camera.updateProjectionMatrix();
      return;
    }

    desired.current.set(pointer.x * 0.12, pointer.y * 0.08, 6 - scrollT * 0.35 + Math.max(0, scrollT - 0.95) * 1.4);
    target.current.set(0, -0.18, -2 - scrollT * 1.2);
    camera.position.lerp(desired.current, 0.04);
    camera.lookAt(target.current);
    camera.fov = lerp(camera.fov, 65, 0.04);
    camera.updateProjectionMatrix();
  });

  return null;
}

/* ----- Main canvas — composes everything ----- */
export default function WorldCanvas(props: Props) {
  const { seed, scrollT, quality } = props;
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 65 }}
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      dpr={quality === "lite" ? [1, 1.25] : [1, 1.5]}
      frameloop="always"
    >
      <ScenePalette seed={seed} />
      <ReactiveLights {...props} />
      <CameraRig {...props} />
      <NebulaBackground {...props} />
      <GodRayShafts {...props} />
      <DepthDriftParticles {...props} />
      <ParticleField seed={seed} scrollT={scrollT} />
      {quality === "full" && <FocalBloomHalo seed={seed} scrollT={scrollT} worldIntensity={props.worldIntensity} />}
      <FocalObject seed={seed} scrollT={scrollT} />
    </Canvas>
  );
}
