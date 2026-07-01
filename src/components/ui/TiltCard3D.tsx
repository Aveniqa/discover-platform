"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** Max tilt angle in degrees on each axis (default 18) */
  maxTilt?: number;
  /** Scale on hover (default 1.04) */
  hoverScale?: number;
  /** Glow color rgb string (default accent purple) */
  glowColor?: string;
  /** Parallax strength for inner layers */
  tiltDepth?: "strong" | "medium" | "subtle";
  /** Tag to render (default 'div') */
  as?: "div" | "article" | "section" | "li";
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
  maxTilt = 18,
  hoverScale = 1.04,
  glowColor = "168, 85, 247",
  tiltDepth = "medium",
  as: Tag = "div",
  style,
  onClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const animFrame = useRef<number | null>(null);
  const lastPointer = useRef({ x: 0.5, y: 0.5, clientX: 0, clientY: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return;

    const el = ref.current;
    if (!el) return;

    const depthLift = {
      strong: 28,
      medium: 20,
      subtle: 12,
    }[tiltDepth];

    const resetMagnetic = () => {
      el.querySelectorAll<HTMLElement>(".magnetic").forEach((target) => {
        target.style.setProperty("--mag-x", "0px");
        target.style.setProperty("--mag-y", "0px");
      });
    };

    const resetNeighbors = () => {
      const grid = el.closest<HTMLElement>(".depth-grid, [data-depth-grid='true']");
      if (!grid) return;
      grid.querySelectorAll<HTMLElement>(".tilt-3d").forEach((card) => {
        card.classList.remove("is-neighbor-reacting");
        card.style.setProperty("--neighbor-tilt-y", "0deg");
        card.style.setProperty("--neighbor-brightness", "1");
        card.style.setProperty("--neighbor-saturation", "1");
      });
      grid.style.removeProperty("--hovered-card-index");
    };

    const updateNeighbors = () => {
      const grid = el.closest<HTMLElement>(".depth-grid, [data-depth-grid='true']");
      if (!grid) return;
      const cards = Array.from(grid.querySelectorAll<HTMLElement>(".tilt-3d"));
      const hoveredIndex = cards.indexOf(el);
      if (hoveredIndex < 0) return;
      grid.style.setProperty("--hovered-card-index", String(hoveredIndex));

      const hoveredRect = el.getBoundingClientRect();
      const hoveredCenter = hoveredRect.left + hoveredRect.width / 2;
      cards.forEach((card) => {
        if (card === el) return;
        const rect = card.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const distance = Math.abs(center - hoveredCenter);
        const strength = Math.max(0, 1 - distance / 820);
        const direction = center < hoveredCenter ? 1 : -1;
        card.classList.add("is-neighbor-reacting");
        card.style.setProperty("--neighbor-tilt-y", `${direction * strength * 2.6}deg`);
        card.style.setProperty("--neighbor-brightness", `${1 - strength * 0.15}`);
        card.style.setProperty("--neighbor-saturation", `${1 - strength * 0.1}`);
      });
    };

    const onMove = (e: PointerEvent) => {
      lastPointer.current.clientX = e.clientX;
      lastPointer.current.clientY = e.clientY;
      if (animFrame.current) return;
      animFrame.current = requestAnimationFrame(() => {
        animFrame.current = null;
        const rect = el.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (lastPointer.current.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (lastPointer.current.clientY - rect.top) / rect.height));
        lastPointer.current.x = x;
        lastPointer.current.y = y;
        const tiltX = (0.5 - y) * maxTilt * 2;
        const tiltY = (x - 0.5) * maxTilt * 2;
        const rimAngle = Math.atan2(0.5 - y, x - 0.5) * (180 / Math.PI);
        el.style.setProperty("--tilt-x", `${tiltX}deg`);
        el.style.setProperty("--tilt-y", `${tiltY}deg`);
        el.style.setProperty("--mouse-x", `${x * 100}%`);
        el.style.setProperty("--mouse-y", `${y * 100}%`);
        el.style.setProperty("--rim-angle", `${rimAngle}deg`);
        el.style.setProperty("--scale", String(hoverScale));
        el.style.setProperty("--lift-z", `${depthLift}px`);

        el.querySelectorAll<HTMLElement>(".magnetic").forEach((target) => {
          const buttonRect = target.getBoundingClientRect();
          const cx = buttonRect.left + buttonRect.width / 2;
          const cy = buttonRect.top + buttonRect.height / 2;
          const dx = lastPointer.current.clientX - cx;
          const dy = lastPointer.current.clientY - cy;
          const distance = Math.hypot(dx, dy);
          if (distance > 80) {
            target.style.setProperty("--mag-x", "0px");
            target.style.setProperty("--mag-y", "0px");
            return;
          }
          const pull = (1 - distance / 80) * 6;
          target.style.setProperty("--mag-x", `${(dx / Math.max(distance, 1)) * pull}px`);
          target.style.setProperty("--mag-y", `${(dy / Math.max(distance, 1)) * pull}px`);
        });
      });
    };

    const onEnter = () => {
      el.classList.add("is-hovered");
      updateNeighbors();
    };

    const onLeave = () => {
      el.classList.remove("is-hovered");
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
      el.style.setProperty("--scale", "1");
      el.style.setProperty("--lift-z", "0px");
      el.style.setProperty("--rim-angle", "0deg");
      resetMagnetic();
      resetNeighbors();
    };

    const onCancel = () => onLeave();

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onLeave);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onLeave);
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      resetMagnetic();
      resetNeighbors();
    };
  }, [maxTilt, hoverScale, tiltDepth]);

  // The inner element receives the transform so child layout doesn't shift
  return (
    <Tag
      ref={ref as never}
      onClick={onClick}
      data-tilt-depth={tiltDepth}
      className={`tilt-3d specular-highlight rim-light ${className}`}
      style={
        {
          ...style,
          "--tilt-x": "0deg",
          "--tilt-y": "0deg",
          "--scale": "1",
          "--lift-z": "0px",
          "--mouse-x": "50%",
          "--mouse-y": "50%",
          "--rim-angle": "0deg",
          "--glow-color": glowColor,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
