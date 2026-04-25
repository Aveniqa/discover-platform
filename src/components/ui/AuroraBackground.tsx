"use client";

/**
 * Aurora — animated WebGL-style gradient background.
 * Inspired by ReactBits Aurora component.
 * Pure CSS keyframe blobs — zero external dependencies, works in static export.
 */

interface AuroraBackgroundProps {
  /** Tailwind color classes for the three blob layers */
  colorA?: string;
  colorB?: string;
  colorC?: string;
  className?: string;
  children?: React.ReactNode;
}

export function AuroraBackground({
  colorA = "bg-emerald-500/20",
  colorB = "bg-cyan-500/15",
  colorC = "bg-teal-400/10",
  className = "",
  children,
}: AuroraBackgroundProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blob A — slow drift top-right */}
      <div
        className={`pointer-events-none absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full ${colorA} blur-[110px]`}
        style={{ animation: "aurora-a 14s ease-in-out infinite alternate" }}
      />
      {/* Blob B — medium drift bottom-left */}
      <div
        className={`pointer-events-none absolute -bottom-24 -left-24 h-[440px] w-[440px] rounded-full ${colorB} blur-[90px]`}
        style={{ animation: "aurora-b 18s ease-in-out infinite alternate" }}
      />
      {/* Blob C — fast drift center */}
      <div
        className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[360px] w-[360px] rounded-full ${colorC} blur-[80px]`}
        style={{ animation: "aurora-c 10s ease-in-out infinite alternate" }}
      />

      <style>{`
        @keyframes aurora-a {
          0%   { transform: translate(0,   0)   scale(1);    }
          33%  { transform: translate(-60px, 40px) scale(1.1); }
          66%  { transform: translate(40px, -30px) scale(0.95); }
          100% { transform: translate(-20px, 60px) scale(1.05); }
        }
        @keyframes aurora-b {
          0%   { transform: translate(0, 0)   scale(1);    }
          50%  { transform: translate(70px, -50px) scale(1.15); }
          100% { transform: translate(-40px, 30px) scale(0.9); }
        }
        @keyframes aurora-c {
          0%   { transform: translate(-50%, -50%) scale(1);   }
          50%  { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(0.85); }
        }
      `}</style>

      {/* Content on top */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
