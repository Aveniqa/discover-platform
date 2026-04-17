"use client";

import { useState } from "react";

// Public embed endpoint — no API key needed, safe to call from the browser
const BUTTONDOWN_EMBED_URL = "https://buttondown.email/api/emails/embed-subscribe/surfaced";

async function subscribe(email: string): Promise<void> {
  const body = new URLSearchParams({ email, tag: "surfaced" });
  const res = await fetch(BUTTONDOWN_EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Subscription failed (${res.status}). Please try again.`);
  }
}

export function NewsletterForm({
  variant = "default",
  "data-capture-location": captureLocation,
}: {
  variant?: "default" | "minimal";
  "data-capture-location"?: string;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await subscribe(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald shrink-0">
          <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium text-emerald">You&apos;re in. Check your inbox to confirm your subscription.</span>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className="flex flex-col gap-1.5">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            data-capture-location={captureLocation}
            className="flex-1 px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
            required
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg btn-gradient text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "…" : "Join"}
          </button>
        </form>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          data-capture-location={captureLocation}
          className="flex-1 px-5 py-3.5 rounded-xl bg-surface-elevated border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15 transition-all"
          required
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-7 py-3.5 rounded-xl btn-gradient text-sm cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Subscribing…" : "Subscribe Free"}
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
