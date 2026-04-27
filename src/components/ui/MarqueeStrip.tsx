"use client";

interface MarqueeStripProps {
  items: string[];
  reverse?: boolean;
  speed?: number;
  className?: string;
}

export function MarqueeStrip({ items, reverse = false, speed = 40, className = "" }: MarqueeStripProps) {
  const doubled = [...items, ...items];
  return (
    <>
      <style>{`
        @keyframes marquee-ltr {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes marquee-rtl {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
      `}</style>
      <div className={`overflow-hidden ${className}`}>
        <div
          className="flex gap-2.5 whitespace-nowrap"
          style={{
            animation: `${reverse ? "marquee-rtl" : "marquee-ltr"} ${speed}s linear infinite`,
            width: "max-content",
          }}
        >
          {doubled.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-surface border border-border/50 text-muted shrink-0"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
