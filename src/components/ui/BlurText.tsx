"use client";

import { useEffect, useRef, useState } from "react";

interface BlurTextProps {
  children: string;
  /** Tailwind class for the text element (h1, h2, p, span) */
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  /** Stagger delay between words in ms (default 60) */
  wordDelay?: number;
  /** Trigger animation once when element enters viewport */
  onScroll?: boolean;
}

/**
 * BlurText — words blur in one-by-one on mount or scroll entry.
 * Inspired by ReactBits BlurText / SplitText components.
 * Uses IntersectionObserver + CSS transitions — no GSAP needed.
 */
export function BlurText({
  children,
  as: Tag = "span",
  className = "",
  wordDelay = 60,
  onScroll = true,
}: BlurTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(!onScroll);

  useEffect(() => {
    if (!onScroll) { setRevealed(true); return; }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onScroll]);

  const words = children.split(" ");

  return (
    // @ts-ignore — dynamic tag assignment
    <Tag ref={ref} className={`inline ${className}`} aria-label={children}>
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: "inline-block",
            marginRight: "0.25em",
            transition: `opacity 0.5s ease ${i * wordDelay}ms, filter 0.5s ease ${i * wordDelay}ms, transform 0.5s ease ${i * wordDelay}ms`,
            opacity: revealed ? 1 : 0,
            filter: revealed ? "blur(0px)" : "blur(8px)",
            transform: revealed ? "translateY(0)" : "translateY(10px)",
          }}
        >
          {word}
        </span>
      ))}
    </Tag>
  );
}
