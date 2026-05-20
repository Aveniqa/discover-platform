"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Alcove } from "@/lib/alcoves";

interface Props {
  alcove: Alcove;
  /** 0 → top of section in view, 1 → scrolled past */
  scrollT?: number;
  /** Fixes the canvas to viewport — used for the homepage hero only */
  fixed?: boolean;
  /** Slight density reduction — used inside item cards / category headers */
  intimate?: boolean;
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vNormal = normal;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_BASE = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPos;
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec2 uPointer;
  uniform float uMotif;

  // hash + noise (Inigo Quilez style, compact)
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
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.07;
      a *= 0.55;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= 1.6;

    // pointer parallax: subtle offset toward cursor
    vec2 p = uv - uPointer * 0.18;

    // motif drives the inner shape rendering
    float dist = length(p);

    // ambient deep gradient
    float grad = smoothstep(1.2, 0.0, dist);

    // animated noise pattern
    vec2 q = p * 2.6 + vec2(uTime * 0.06, uTime * 0.04);
    float n = fbm(q);

    // motif: 0=orbit, 1=lattice, 2=ripple, 3=particles, 4=prism, 5=gem
    float ring1 = 0.0;
    float ring2 = 0.0;
    float lattice = 0.0;

    if (uMotif < 0.5) {
      // orbit: two soft rings drifting
      float a = atan(p.y, p.x);
      ring1 = exp(-pow((dist - 0.45 - 0.04 * sin(uTime * 0.4 + a * 2.0)) * 14.0, 2.0));
      ring2 = exp(-pow((dist - 0.78 - 0.05 * sin(uTime * 0.3 - a * 3.0)) * 12.0, 2.0)) * 0.7;
    } else if (uMotif < 1.5) {
      // lattice: faint grid pulse
      vec2 g = fract(p * 6.0) - 0.5;
      lattice = (1.0 - smoothstep(0.0, 0.03, abs(g.x))) + (1.0 - smoothstep(0.0, 0.03, abs(g.y)));
      lattice *= 0.4 + 0.6 * sin(uTime * 0.5 + dist * 6.0);
      lattice *= smoothstep(1.0, 0.2, dist);
    } else if (uMotif < 2.5) {
      // ripple: concentric expanding rings
      ring1 = sin(dist * 12.0 - uTime * 1.8) * 0.5 + 0.5;
      ring1 = pow(ring1, 6.0);
      ring1 *= smoothstep(1.1, 0.1, dist);
    } else if (uMotif < 3.5) {
      // particles: bright dots from noise threshold
      float dots = step(0.78, noise(p * 18.0 + uTime * 0.2));
      ring1 = dots * smoothstep(1.0, 0.0, dist) * 1.4;
    } else if (uMotif < 4.5) {
      // prism: rotating angular slices
      float a = atan(p.y, p.x);
      ring1 = sin(a * 6.0 + uTime * 0.4) * 0.5 + 0.5;
      ring1 *= smoothstep(0.95, 0.1, dist);
      ring1 = pow(ring1, 2.5);
    } else {
      // gem: faceted bright clusters
      vec2 cell = floor(p * 4.0 + 1.0);
      float r = hash(cell);
      vec2 cp = fract(p * 4.0 + 1.0) - 0.5;
      ring1 = exp(-dot(cp, cp) * 35.0) * r * 1.4;
      ring1 *= smoothstep(1.1, 0.2, dist);
    }

    float energy = ring1 + ring2 + lattice;
    energy *= 0.9 + 0.25 * n;

    // gentle scroll-driven warp: as user scrolls, palette shifts toward C
    float s = clamp(uScroll, 0.0, 1.0);

    vec3 col = mix(uColorC, uColorA, grad);
    col = mix(col, uColorB, energy * (0.55 + 0.4 * (1.0 - s)));
    col = mix(col, uColorC, s * 0.35);

    // soft vignette
    col *= 1.0 - dist * 0.4;
    col += 0.02;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function motifIndex(motif: Alcove["motif"]): number {
  switch (motif) {
    case "orbit": return 0;
    case "lattice": return 1;
    case "ripple": return 2;
    case "particles": return 3;
    case "prism": return 4;
    case "gem": return 5;
    default: return 0;
  }
}

function hexToVec3(hex: string): THREE.Vector3 {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return new THREE.Vector3(r, g, b);
}

function Plane({
  alcove,
  scrollT = 0,
}: { alcove: Alcove; scrollT?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pointerRef = useRef<[number, number]>([0, 0]);

  const uniforms = useMemo(() => {
    const a = hexToVec3(alcove.palette[0]);
    const b = hexToVec3(alcove.palette[1]);
    const c = hexToVec3(alcove.palette[2]);
    return {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uColorA: { value: a },
      uColorB: { value: b },
      uColorC: { value: c },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uMotif: { value: motifIndex(alcove.motif) },
    };
  }, [alcove]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      pointerRef.current = [x, -y];
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;
    m.uniforms.uScroll.value = scrollT;
    const [px, py] = pointerRef.current;
    const cur = m.uniforms.uPointer.value as THREE.Vector2;
    cur.x += (px - cur.x) * 0.05;
    cur.y += (py - cur.y) * 0.05;
  });

  return (
    <mesh>
      <planeGeometry args={[4, 3, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT_BASE}
        transparent={false}
      />
    </mesh>
  );
}

export default function AlcoveCanvas({ alcove, scrollT = 0, fixed = false, intimate = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // defer WebGL until idle to keep content + AdSense the priority
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    const idle = (cb: () => void) =>
      w.requestIdleCallback
        ? w.requestIdleCallback(cb, { timeout: 1200 })
        : window.setTimeout(cb, 800);
    idle(() => setEnabled(true));
  }, []);

  // Only mount the canvas when scrolled near. Browsers cap WebGL contexts (~8-16)
  // — without gating, a long page with many alcove sections crashes on mobile.
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  const dpr: [number, number] = intimate ? [1, 1.25] : [1, 1.5];

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ background: alcove.base }}
    >
      {enabled && visible && (
        <Canvas
          orthographic
          camera={{ position: [0, 0, 5], zoom: 200 }}
          gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
          dpr={dpr}
          frameloop="always"
        >
          <Plane alcove={alcove} scrollT={scrollT} />
        </Canvas>
      )}
    </div>
  );
}
// preserve unused-prop signature for callers without a TS break
void undefined as unknown as { fixed?: boolean };
