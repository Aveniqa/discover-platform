"use client";

import { type AnchorHTMLAttributes } from "react";

interface GlowButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** "amber" for Amazon CTAs, "emerald" for general, "accent" for brand */
  variant?: "amber" | "emerald" | "accent";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const variants = {
  amber: {
    base: "bg-amber-400 hover:bg-amber-300 text-black",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.35)] hover:shadow-[0_0_40px_rgba(251,191,36,0.55)]",
    ring: "ring-amber-400/40",
    pulse: "rgba(251,191,36,0.6)",
  },
  emerald: {
    base: "bg-emerald-500 hover:bg-emerald-400 text-white",
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_40px_rgba(52,211,153,0.5)]",
    ring: "ring-emerald-400/40",
    pulse: "rgba(52,211,153,0.5)",
  },
  accent: {
    base: "bg-accent hover:bg-accent/90 text-white",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)]",
    ring: "ring-accent/40",
    pulse: "rgba(99,102,241,0.5)",
  },
};

const sizes = {
  sm: "px-4 py-2 text-xs rounded-lg",
  md: "px-6 py-3 text-sm rounded-xl",
  lg: "px-8 py-4 text-base rounded-xl",
};

/**
 * GlowButton — animated glowing CTA button.
 * Inspired by ReactBits GlowButton component.
 * Renders as an <a> tag so it works as affiliate links.
 */
export function GlowButton({
  variant = "amber",
  size = "md",
  children,
  className = "",
  ...props
}: GlowButtonProps) {
  const v = variants[variant];

  return (
    <a
      {...props}
      className={`
        relative inline-flex items-center justify-center gap-2
        font-bold transition-all duration-200 active:scale-95
        hover:-translate-y-0.5
        ${v.base} ${v.glow} ${sizes[size]}
        ${className}
      `}
    >
      {/* Animated border ring */}
      <span
        className={`pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ${v.ring}`}
        style={{ animation: "glow-pulse 2.5s ease-in-out infinite" }}
      />

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
      `}</style>

      {children}
    </a>
  );
}
