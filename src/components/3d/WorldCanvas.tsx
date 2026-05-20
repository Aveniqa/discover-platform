"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldSeed } from "@/lib/world-seed";
import { makeRng } from "@/lib/world-seed";

interface Props {
  seed: WorldSeed;
  scrollT: number;
  pointer: { x: number; y: number };
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

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ----- Particle field (sparse glowing dust) ----- */
function ParticleField({ seed, scrollT }: { seed: WorldSeed; scrollT: number }) {
  const ref = useRef<THREE.Points>(null);
  const count = Math.round(800 * seed.density);
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
    p.position.z = -scrollT * 2.5;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
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
function NebulaBackground({ seed, scrollT, pointer }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pointerLerp = useRef(new THREE.Vector2(0, 0));

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
    };
  }, [seed.alcove.palette, seed.hue]);

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;
    m.uniforms.uScroll.value = scrollT;
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

/* ----- Floating focal object (per-item or per-route hero geometry) ----- */
function FocalObject({ seed, scrollT }: { seed: WorldSeed; scrollT: number }) {
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

/* ----- Main canvas — composes everything ----- */
export default function WorldCanvas({ seed, scrollT, pointer }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 65 }}
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
      frameloop="always"
    >
      <color attach="background" args={[seed.alcove.base]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 2, 4]} intensity={1.6} color={seed.alcove.palette[0]} />
      <pointLight position={[-4, -1, 3]} intensity={1.1} color={seed.alcove.palette[1]} />
      <NebulaBackground seed={seed} scrollT={scrollT} pointer={pointer} />
      <ParticleField seed={seed} scrollT={scrollT} />
      <FocalObject seed={seed} scrollT={scrollT} />
    </Canvas>
  );
}
