"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeRng } from "@/lib/world-seed";

/* ============================================================
   BRANCHING GROWTH — the world literally branches as you scroll.

   A deterministic fractal of molten-gold limbs grows out of the
   dark: the trunk forms in the hero, then each scroll chapter
   spawns the next generation of branches, until a full canopy
   hangs over the page and its tips shed embers.

   Built as ONE merged geometry (no instancing edge cases, one
   draw call). Every vertex carries the scroll threshold at which
   its branch is born (aBirth) plus its generation and its
   position along the limb, so growth, taper, and tip-glow are all
   resolved on the GPU — the CPU only ever updates one uniform.
   ============================================================ */

const BRANCH_VERTEX = /* glsl */ `
  attribute float aBirth;   // scroll value at which this branch appears
  attribute float aGen;     // generation index (0 = trunk)
  attribute float aAlong;   // 0 at branch base .. 1 at tip
  uniform float uScroll;
  uniform float uTime;
  varying float vGrow;
  varying float vAlong;
  varying float vGen;
  varying vec3  vNormalW;
  varying vec3  vViewDir;

  void main() {
    // Growth: each branch extrudes from its base over a short scroll window
    float grow = smoothstep(aBirth, aBirth + 0.14, uScroll);
    vGrow = grow;
    vAlong = aAlong;
    vGen = aGen;

    vec3 p = position;

    // Sway — thinner, younger limbs move more, like heat-shimmer in metal
    float sway = sin(uTime * 0.55 + aGen * 1.7 + p.y * 0.8) * 0.035 * (aGen + 1.0) * aAlong;
    p.x += sway;
    p.z += cos(uTime * 0.42 + aGen * 2.1) * 0.03 * aAlong * (aGen + 1.0);

    // Un-grown branches collapse back toward their base point rather than
    // popping in: scale the offset-from-base by the growth factor.
    vec3 basePoint = vec3(p.x, p.y - aAlong * 0.0, p.z);
    p = mix(basePoint - vec3(0.0, aAlong * 1.0, 0.0) * (1.0 - grow), p, grow);

    vec4 world = modelMatrix * vec4(p, 1.0);
    vec4 mv = viewMatrix * world;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const BRANCH_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uGold;
  uniform vec3  uGoldHot;
  uniform vec3  uGoldDeep;
  varying float vGrow;
  varying float vAlong;
  varying float vGen;
  varying vec3  vNormalW;
  varying vec3  vViewDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    if (vGrow <= 0.001) discard;

    // Fresnel rim — the silhouette of real metal
    float rim = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 2.0);

    // Heat gradient: cool deep gold at the base, white-hot at growing tips
    float tip = smoothstep(0.55, 1.0, vAlong);
    float freshness = 1.0 - smoothstep(0.0, 0.85, vGrow); // brightest while extruding

    // Molten veins crawling along the limb
    float veins = noise(vec2(vAlong * 9.0 - uTime * 0.5, vGen * 3.0));
    veins = smoothstep(0.55, 0.95, veins);

    vec3 col = uGoldDeep * 0.42;
    col += uGold * veins * 0.9;
    col += uGoldHot * rim * 1.15;
    col += uGoldHot * tip * (0.55 + freshness * 2.2);
    col += uGold * 0.10 * (0.5 + 0.5 * sin(uTime * 0.6 + vGen));

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Branch {
  a: THREE.Vector3;
  b: THREE.Vector3;
  r0: number;
  r1: number;
  gen: number;
  birth: number;
}

/** Deterministic fractal limb system, generated once per seed. */
function buildBranches(rngSeed: number): Branch[] {
  const rng = makeRng(rngSeed);
  const out: Branch[] = [];
  // Scroll windows per generation — the world gains a layer per chapter
  const BIRTH = [0.02, 0.2, 0.4, 0.58, 0.74];
  const GENERATIONS = 5;

  const grow = (
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    len: number,
    radius: number,
    gen: number
  ) => {
    if (gen >= GENERATIONS) return;
    // Each limb curves slightly along its length instead of being a stick
    const SUB = 3;
    let p = origin.clone();
    let d = dir.clone().normalize();
    const birth = BIRTH[gen] + rng() * 0.05;
    for (let s = 0; s < SUB; s++) {
      const segLen = len / SUB;
      const bend = new THREE.Vector3((rng() - 0.5) * 0.35, (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.35);
      const next = p.clone().add(d.clone().multiplyScalar(segLen)).add(bend.multiplyScalar(segLen * 0.5));
      out.push({
        a: p.clone(),
        b: next.clone(),
        r0: radius * (1 - s / SUB) + radius * 0.25,
        r1: radius * (1 - (s + 1) / SUB) + radius * 0.2,
        gen,
        birth,
      });
      d = next.clone().sub(p).normalize();
      p = next;
    }
    // Split into children, fanning outward and upward
    const children = gen === 0 ? 3 : 2 + (rng() > 0.62 ? 1 : 0);
    for (let c = 0; c < children; c++) {
      const angle = (c / children) * Math.PI * 2 + rng() * 1.2;
      const spread = 0.55 + rng() * 0.5;
      const child = new THREE.Vector3(
        Math.cos(angle) * spread,
        0.75 + rng() * 0.5,
        Math.sin(angle) * spread
      ).normalize();
      // Blend parent direction so the fractal keeps its upward drive
      child.lerp(d, 0.35).normalize();
      grow(p.clone(), child, len * (0.62 + rng() * 0.16), radius * 0.62, gen + 1);
    }
  };

  grow(new THREE.Vector3(0, -3.1, -3), new THREE.Vector3(0, 1, 0), 1.5, 0.16, 0);
  return out;
}

/** Merge every limb into one geometry with growth attributes baked in. */
function buildGeometry(branches: Branch[]): THREE.BufferGeometry {
  const RADIAL = 6;
  const positions: number[] = [];
  const normals: number[] = [];
  const births: number[] = [];
  const gens: number[] = [];
  const alongs: number[] = [];
  const indices: number[] = [];

  const up = new THREE.Vector3(0, 1, 0);
  const altUp = new THREE.Vector3(1, 0, 0);
  let vertexBase = 0;

  for (const br of branches) {
    const axis = br.b.clone().sub(br.a);
    const len = axis.length();
    if (len < 1e-5) continue;
    const dir = axis.clone().normalize();
    const ref = Math.abs(dir.dot(up)) > 0.94 ? altUp : up;
    const n1 = new THREE.Vector3().crossVectors(dir, ref).normalize();
    const n2 = new THREE.Vector3().crossVectors(dir, n1).normalize();

    for (let ring = 0; ring < 2; ring++) {
      const center = ring === 0 ? br.a : br.b;
      const radius = ring === 0 ? br.r0 : br.r1;
      const alongV = ring === 0 ? 0 : 1;
      for (let i = 0; i < RADIAL; i++) {
        const a = (i / RADIAL) * Math.PI * 2;
        const normal = n1.clone().multiplyScalar(Math.cos(a)).add(n2.clone().multiplyScalar(Math.sin(a)));
        const p = center.clone().add(normal.clone().multiplyScalar(radius));
        positions.push(p.x, p.y, p.z);
        normals.push(normal.x, normal.y, normal.z);
        births.push(br.birth);
        gens.push(br.gen);
        alongs.push(alongV);
      }
    }
    for (let i = 0; i < RADIAL; i++) {
      const next = (i + 1) % RADIAL;
      const a0 = vertexBase + i;
      const a1 = vertexBase + next;
      const b0 = vertexBase + RADIAL + i;
      const b1 = vertexBase + RADIAL + next;
      indices.push(a0, b0, a1, a1, b0, b1);
    }
    vertexBase += RADIAL * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("aBirth", new THREE.Float32BufferAttribute(births, 1));
  geo.setAttribute("aGen", new THREE.Float32BufferAttribute(gens, 1));
  geo.setAttribute("aAlong", new THREE.Float32BufferAttribute(alongs, 1));
  geo.setIndex(indices);
  return geo;
}

export function BranchingGrowth({
  rngSeed,
  scrollT,
  gold,
  goldHot,
  goldDeep,
}: {
  rngSeed: number;
  scrollT: number;
  gold: THREE.Color;
  goldHot: THREE.Color;
  goldDeep: THREE.Color;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const scrollLerp = useRef(0);

  const geometry = useMemo(() => buildGeometry(buildBranches(rngSeed)), [rngSeed]);

  const uniforms = useMemo(
    () => ({
      uScroll:   { value: 0 },
      uTime:     { value: 0 },
      uGold:     { value: gold.clone() },
      uGoldHot:  { value: goldHot.clone() },
      uGoldDeep: { value: goldDeep.clone() },
    }),
    [gold, goldHot, goldDeep]
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    const g = groupRef.current;
    if (!m || !g) return;
    m.uniforms.uTime.value += delta;
    scrollLerp.current += (scrollT - scrollLerp.current) * 0.07;
    m.uniforms.uScroll.value = scrollLerp.current;
    // The canopy drifts down and rotates as it fills in, so the reader
    // travels *through* the structure rather than watching it from outside.
    g.rotation.y = scrollLerp.current * 0.9;
    g.position.y = -0.4 + scrollLerp.current * 2.6;
    g.position.z = -1.2 + scrollLerp.current * 2.2;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={BRANCH_VERTEX}
          fragmentShader={BRANCH_FRAGMENT}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
