"use client";

import { useRef, MouseEvent } from "react";

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

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -maxTilt;
    const rotateY = ((x - cx) / cx) * maxTilt;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;
    if (glowColor) {
      card.style.boxShadow = glowColor;
    }
  }

  function handleMouseLeave() {
    const card = ref.current;
    if (!card) return;
    card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    card.style.boxShadow = "";
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`will-change-transform ${className}`}
      style={{ transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out" }}
    >
      {children}
    </div>
  );
}
