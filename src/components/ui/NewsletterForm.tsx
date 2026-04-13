"use client";

import { useState } from "react";

export function NewsletterForm({ variant = "default", "data-capture-location": captureLocation }: { variant?: "default" | "minimal"; "data-capture-location"?: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald shrink-0">
          <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium text-emerald">You&apos;re in. Check your inbox for a welcome from Surfaced.</span>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          data-capture-location={captureLocation}
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
          required
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg btn-gradient text-sm cursor-pointer"
        >
          Join
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        data-capture-location={captureLocation}
        className="flex-1 px-5 py-3.5 rounded-xl bg-surface-elevated border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15 transition-all"
        required
      />
      <button
        type="submit"
        className="px-7 py-3.5 rounded-xl btn-gradient text-sm cursor-pointer active:scale-[0.98]"
      >
        Subscribe Free
      </button>
    </form>
  );
}
