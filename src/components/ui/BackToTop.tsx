"use client";

import { useState, useEffect } from "react";

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-28 right-5 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 border border-border text-muted-foreground hover:text-accent hover:border-accent/50 backdrop-blur shadow-lg transition-all duration-200 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-label="Back to top"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12V4M4 8l4-4 4 4" />
      </svg>
    </button>
  );
}
