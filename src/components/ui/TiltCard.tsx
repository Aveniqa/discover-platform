"use client";

import { useEffect, useRef, type PointerEvent } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Max tilt in degrees (default 8) */
  maxTilt?: number;
  /** Glow color on hover (Tailwind shadow class or CSS) */
  glowColor?: string;
}

/**
 * TiltCard — mouse-tracking 3D perspective tilt + subtle glow.
 * Inspired by ReactBits TiltCard component.
 * Zero dependencies; works in Next.js static export.
 */
export function TiltCard({ children, className = "", maxTilt = 8, glowColor }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const cleanupExitWatchRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    cleanupExitWatchRef.current?.();
  }, []);

  function canTilt() {
    if (typeof window === "undefined") return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    if (window.matchMedia?.("(pointer: coarse)").matches) return false;
    return true;
  }

  function resetCard() {
    const card = ref.current;
    if (!card) return;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pointerRef.current = null;
    card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    card.style.boxShadow = "";
    cleanupExitWatchRef.current?.();
    cleanupExitWatchRef.current = null;
  }

  function watchForExit() {
    if (cleanupExitWatchRef.current) return;

    const resetIfOutside = (event: globalThis.PointerEvent) => {
      const card = ref.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (outside) resetCard();
    };

    document.addEventListener("pointermove", resetIfOutside, { passive: true });
    window.addEventListener("scroll", resetCard, { passive: true });
    window.addEventListener("blur", resetCard);

    cleanupExitWatchRef.current = () => {
      document.removeEventListener("pointermove", resetIfOutside);
      window.removeEventListener("scroll", resetCard);
      window.removeEventListener("blur", resetCard);
    };
  }

  function applyTilt() {
    rafRef.current = null;
    const card = ref.current;
    const pointer = pointerRef.current;
    if (!card || !pointer) return;

    const rect = card.getBoundingClientRect();
    const x = pointer.x - rect.left;
    const y = pointer.y - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -maxTilt;
    const rotateY = ((x - cx) / cx) * maxTilt;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;
    if (glowColor) card.style.boxShadow = glowColor;
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!canTilt()) {
      resetCard();
      return;
    }
    pointerRef.current = { x: e.clientX, y: e.clientY };
    watchForExit();
    if (!rafRef.current) rafRef.current = requestAnimationFrame(applyTilt);
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetCard}
      onPointerCancel={resetCard}
      onBlur={resetCard}
      className={`will-change-transform ${className}`}
      style={{ transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out" }}
    >
      {children}
    </div>
  );
}
