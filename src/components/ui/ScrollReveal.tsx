"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Optional placeholder rendered while off-screen (prevents flash of empty space) */
  placeholder?: ReactNode;
}

export function ScrollReveal({ children, delay = 0, className = "", placeholder }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Start visible so SSR/SSG renders content fully — JS then hides off-screen cards
  const [visible, setVisible] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const el = ref.current;
    if (!el) return;

    // If already in viewport on mount, keep visible (no animation needed)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 50) {
      setVisible(true);
      return;
    }

    // Below viewport — hide and animate in on scroll
    setVisible(false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.01, rootMargin: "200px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* When a placeholder is provided, show it until the card enters the viewport,
     then crossfade to the real content — zero layout shift, no flash. */
  if (placeholder) {
    return (
      <div ref={ref} className={`relative ${className}`}>
        {/* Skeleton — visible until real content fades in */}
        <div
          style={{
            opacity: visible ? 0 : 1,
            transition: hydrated ? `opacity 0.4s ease ${delay}ms` : "none",
            pointerEvents: visible ? "none" : "auto",
          }}
          aria-hidden={visible}
        >
          {placeholder}
        </div>
        {/* Real content — fades up on enter */}
        <div
          className="absolute inset-0"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: hydrated
              ? `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
              : "none",
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: hydrated
          ? `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
          : "none",
      }}
    >
      {children}
    </div>
  );
}
