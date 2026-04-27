"use client";

import { useRef } from "react";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(168,85,247,0.1)",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--sx", `${e.clientX - rect.left}px`);
    ref.current.style.setProperty("--sy", `${e.clientY - rect.top}px`);
  }

  function handleMouseEnter() {
    ref.current?.style.setProperty("--so", "1");
  }

  function handleMouseLeave() {
    ref.current?.style.setProperty("--so", "0");
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-[1]"
        style={{
          background: `radial-gradient(350px circle at var(--sx, -100px) var(--sy, -100px), ${spotlightColor}, transparent 70%)`,
          opacity: "var(--so, 0)",
          transition: "opacity 0.25s ease",
        }}
      />
      {children}
    </div>
  );
}
