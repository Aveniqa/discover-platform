"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** Max tilt angle in degrees on each axis (default 12) */
  maxTilt?: number;
  /** Scale on hover (default 1.025) */
  hoverScale?: number;
  /** Glow color rgb string (default accent purple) */
  glowColor?: string;
  /** Tag to render (default 'div') */
  as?: "div" | "article" | "section";
  style?: CSSProperties;
  /** Forwarded onClick for nested interactive cards */
  onClick?: () => void;
}

/**
 * 3D tilt + glow on hover. Pure CSS variables set from mousemove — the GPU
 * does all the work via transform. Adds a soft accent-tinted shadow that
 * tracks the cursor, plus a subtle scale on enter.
 *
 * Disabled when the user has prefers-reduced-motion set or on coarse pointer
 * (touch) devices — falls back to a static element.
 */
export function TiltCard3D({
  children,
  className = "",
  maxTilt = 12,
  hoverScale = 1.025,
  glowColor = "168, 85, 247",
  as: Tag = "div",
  style,
  onClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const animFrame = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return;

    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      if (animFrame.current) return;
      animFrame.current = requestAnimationFrame(() => {
        animFrame.current = null;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;  // 0..1
        const y = (e.clientY - rect.top) / rect.height;  // 0..1
        const tiltX = (0.5 - y) * maxTilt * 2;            // y high = tilt back
        const tiltY = (x - 0.5) * maxTilt * 2;            // x right = tilt right
        el.style.setProperty("--tilt-x", `${tiltX}deg`);
        el.style.setProperty("--tilt-y", `${tiltY}deg`);
        el.style.setProperty("--mouse-x", `${x * 100}%`);
        el.style.setProperty("--mouse-y", `${y * 100}%`);
        el.style.setProperty("--scale", String(hoverScale));
      });
    };

    const onLeave = () => {
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
      el.style.setProperty("--scale", "1");
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [maxTilt, hoverScale]);

  // The inner element receives the transform so child layout doesn't shift
  return (
    <Tag
      ref={ref as never}
      onClick={onClick}
      className={`tilt-3d ${className}`}
      style={
        {
          ...style,
          "--tilt-x": "0deg",
          "--tilt-y": "0deg",
          "--scale": "1",
          "--mouse-x": "50%",
          "--mouse-y": "50%",
          "--glow-color": glowColor,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
