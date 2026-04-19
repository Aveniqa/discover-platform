"use client";

export function AnimatedHeroBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Animated gradient mesh — multi-layer with floating blobs */}
      <div
        className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.18] blur-[120px]"
        style={{
          background: "radial-gradient(circle, #A855F7 0%, transparent 70%)",
          animation: "float 14s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-10 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.14] blur-[110px]"
        style={{
          background: "radial-gradient(circle, #22D3EE 0%, transparent 70%)",
          animation: "float 18s ease-in-out infinite",
          animationDelay: "-4s",
        }}
      />
      <div
        className="absolute top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-[0.10] blur-[130px]"
        style={{
          background: "radial-gradient(ellipse, #34D399 0%, transparent 70%)",
          animation: "breathe 10s ease-in-out infinite",
        }}
      />
      {/* Subtle shifting gradient wash */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          background:
            "linear-gradient(120deg, #A855F7 0%, #22D3EE 33%, #34D399 66%, #A855F7 100%)",
          backgroundSize: "300% 300%",
          animation: "gradient-shift 20s ease infinite",
        }}
      />
    </div>
  );
}
