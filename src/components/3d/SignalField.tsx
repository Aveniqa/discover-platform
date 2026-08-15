"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { makeRng } from "@/lib/world-seed";

/* ============================================================
   SIGNAL FIELD — an interactive current you can push around.

   ~26k points ride a curl-noise flow field. The cursor is a real
   force in that field: particles bend away from it and speed up
   as they slip past, so moving the mouse carves visible channels
   through the drift. Clicking fires a shockwave that blows a
   ring open and heals over ~2s.

   Everything is stateless: a particle's position is a pure
   function of (seed, time, scroll, pointer, ripples) evaluated in
   the vertex shader. No feedback buffers, no per-frame CPU work
   beyond a handful of uniforms — one draw call for the whole
   field, which is why it stays cheap enough to run behind text.

   The palette travels with the page: cyan at the top, through
   violet and rose, to gold at the end. Depth (z) drives size and
   brightness, so the field reads as a volume, not a sheet.
   ============================================================ */

const FIELD_VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute float aScale;
  uniform float uTime;
  uniform float uScroll;
  uniform vec3  uPointer;     // world-space cursor
  uniform float uPointerOn;   // 0 when the pointer has never moved
  uniform vec4  uRipples[4];  // xyz origin, w birth time
  varying float vGlow;
  varying float vDepth;
  varying float vSpeed;

  // --- cheap 3D value noise ---
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
                   mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                   mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  // Potential field -> curl gives a divergence-free (fluid-looking) flow
  vec3 potential(vec3 p) {
    return vec3(
      noise3(p + vec3(0.0, 0.0, 0.0)),
      noise3(p + vec3(31.4, 17.7, 5.3)),
      noise3(p + vec3(9.2, 47.1, 23.8))
    );
  }
  vec3 curlFlow(vec3 p) {
    float e = 0.28;
    vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
    vec3 px0 = potential(p - dx), px1 = potential(p + dx);
    vec3 py0 = potential(p - dy), py1 = potential(p + dy);
    vec3 pz0 = potential(p - dz), pz1 = potential(p + dz);
    float x = (py1.z - py0.z) - (pz1.y - pz0.y);
    float y = (pz1.x - pz0.x) - (px1.z - px0.z);
    float z = (px1.y - px0.y) - (py1.x - py0.x);
    return normalize(vec3(x, y, z) + 1e-6);
  }

  void main() {
    // Home position, spread through a wide slab in front of the camera
    float s = aSeed;
    vec3 home = vec3(
      (fract(s * 71.3) - 0.5) * 26.0,
      (fract(s * 113.7) - 0.5) * 15.0,
      -2.0 - fract(s * 37.1) * 16.0
    );

    // Drift along the flow field. Sampling the curl at (home + time)
    // and integrating with a fixed lookback keeps this stateless while
    // still reading as continuous motion.
    float t = uTime * 0.13 + s * 6.0;
    vec3 flow = curlFlow(home * 0.09 + vec3(0.0, t * 0.5, uScroll * 1.4));
    vec3 pos = home + flow * (1.6 + sin(t + s * 12.0) * 0.9);

    // Scroll drags the whole field toward the reader — travelling, not idling
    pos.z += uScroll * 9.0;
    pos.y -= uScroll * 3.0;
    pos.z = mod(pos.z + 20.0, 20.0) - 18.0;

    // --- CURSOR AS A FORCE ---
    vec3 toP = pos - uPointer;
    float d = length(toP.xy);
    float R = 4.2;
    float push = uPointerOn * smoothstep(R, 0.0, d);
    pos.xy += normalize(toP.xy + 1e-6) * push * 2.6;
    float stirred = push;

    // --- CLICK SHOCKWAVES ---
    for (int i = 0; i < 4; i++) {
      vec4 rip = uRipples[i];
      if (rip.w <= 0.0) continue;
      float age = uTime - rip.w;
      if (age < 0.0 || age > 2.2) continue;
      float radius = age * 7.0;
      float dist = length(pos.xy - rip.xy);
      float band = exp(-pow((dist - radius) * 0.7, 2.0)) * (1.0 - age / 2.2);
      pos.xy += normalize(pos.xy - rip.xy + 1e-6) * band * 3.4;
      stirred = max(stirred, band);
    }

    vSpeed = stirred;
    vDepth = clamp((pos.z + 18.0) / 18.0, 0.0, 1.0);
    /* The page lays readability scrims (up to ~0.55 black) over the canvas,
       so the field has to render hot to survive them — the old molten object
       got through because it output HDR values. Base glow is high and
       stirring pushes it well past 1.0 so the bloom pass catches the trail
       the cursor carves. */
    vGlow = 0.72 + stirred * 1.9;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aScale * (1.0 + stirred * 2.4) * (82.0 / max(-mv.z, 0.6));
    gl_Position = projectionMatrix * mv;
  }
`;

const FIELD_FRAGMENT = /* glsl */ `
  // Must match the vertex stage: uScroll is declared in both, and a vertex
  // shader defaults to highp. Declaring mediump here fails the link with
  // "Precisions of uniform 'uScroll' differ between VERTEX and FRAGMENT".
  precision highp float;
  uniform float uScroll;
  varying float vGlow;
  varying float vDepth;
  varying float vSpeed;

  void main() {
    // Round, soft-edged point
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    core *= core;

    /* The field travels through a palette as the page scrolls:
       cyan -> violet -> rose -> gold. Stirred particles run hot,
       so the trail you carve with the cursor reads brighter and
       warmer than the calm field around it. */
    vec3 cyan   = vec3(0.28, 0.86, 0.98);
    vec3 violet = vec3(0.60, 0.42, 0.98);
    vec3 rose   = vec3(0.98, 0.44, 0.68);
    vec3 gold   = vec3(0.96, 0.78, 0.42);

    float phase = clamp(uScroll, 0.0, 1.0) * 3.0;
    vec3 col = mix(cyan, violet, clamp(phase, 0.0, 1.0));
    col = mix(col, rose, clamp(phase - 1.0, 0.0, 1.0));
    col = mix(col, gold, clamp(phase - 2.0, 0.0, 1.0));

    // Hot core where the field is disturbed
    col = mix(col, vec3(1.0, 0.96, 0.9), vSpeed * 0.75);

    float depthFade = 0.4 + vDepth * 0.6;
    gl_FragColor = vec4(col * vGlow * depthFade * 2.0, core * depthFade * 0.9);
  }
`;

const MAX_RIPPLES = 4;

export function SignalField({ rngSeed, scrollT }: { rngSeed: number; scrollT: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, size } = useThree();
  const slot = useRef(0);
  const pointerTarget = useRef(new THREE.Vector3(0, 0, -8));
  const pointerLerp = useRef(new THREE.Vector3(0, 0, -8));
  const pointerOn = useRef(0);
  const scrollLerp = useRef(0);

  const COUNT = 17000;

  const attrs = useMemo(() => {
    const rng = makeRng(rngSeed);
    const pos = new Float32Array(COUNT * 3); // required attribute; real position is computed in the shader
    const seed = new Float32Array(COUNT);
    const scale = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      seed[i] = rng();
      // A few large "lead" motes among many fine ones reads richer than uniform dust
      scale[i] = 1.0 + Math.pow(rng(), 3.2) * 3.4;
    }
    return { pos, seed, scale };
  }, [rngSeed]);

  const uniforms = useMemo(
    () => ({
      uTime:      { value: 0 },
      uScroll:    { value: 0 },
      uPointer:   { value: new THREE.Vector3(0, 0, -8) },
      uPointerOn: { value: 0 },
      uRipples:   { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, 0, 0)) },
    }),
    []
  );

  // Project the cursor onto the slab the field occupies so the force lands
  // where the user actually sees their pointer.
  useEffect(() => {
    const toWorld = (clientX: number, clientY: number) => {
      const ndc = new THREE.Vector3(
        (clientX / size.width) * 2 - 1,
        -(clientY / size.height) * 2 + 1,
        0.5
      ).unproject(camera);
      const dir = ndc.sub(camera.position).normalize();
      const t = (-8 - camera.position.z) / dir.z;
      return camera.position.clone().add(dir.multiplyScalar(t));
    };

    const onMove = (e: PointerEvent) => {
      pointerTarget.current.copy(toWorld(e.clientX, e.clientY));
      pointerOn.current = 1;
    };
    const onDown = (e: PointerEvent) => {
      const m = matRef.current;
      if (!m) return;
      const p = toWorld(e.clientX, e.clientY);
      const v = (m.uniforms.uRipples.value as THREE.Vector4[])[slot.current % MAX_RIPPLES];
      v.set(p.x, p.y, p.z, m.uniforms.uTime.value as number);
      slot.current++;
    };
    const onLeave = () => { pointerOn.current = 0; };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [camera, size.width, size.height]);

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;
    scrollLerp.current += (scrollT - scrollLerp.current) * 0.08;
    m.uniforms.uScroll.value = scrollLerp.current;
    // Lerp the pointer so fast flicks leave a trailing wake instead of teleporting
    pointerLerp.current.lerp(pointerTarget.current, 0.16);
    (m.uniforms.uPointer.value as THREE.Vector3).copy(pointerLerp.current);
    const targetOn = pointerOn.current;
    m.uniforms.uPointerOn.value += (targetOn - (m.uniforms.uPointerOn.value as number)) * 0.1;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attrs.pos, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[attrs.seed, 1]} />
        <bufferAttribute attach="attributes-aScale" args={[attrs.scale, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={FIELD_VERTEX}
        fragmentShader={FIELD_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
