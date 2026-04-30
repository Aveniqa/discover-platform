"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

// Buttondown's embed endpoint uses Cloudflare Turnstile bot detection.
// It requires a real browser form POST — fetch calls are rejected (400).
// target="_blank" opens Buttondown's response in a new tab while onSubmit
// shows the success state immediately on the main page.
const EMBED_ACTION = "https://buttondown.email/api/emails/embed-subscribe/surfaced";

export function NewsletterForm({
  variant = "default",
  formId = "newsletter",
  ariaLabel = "Subscribe to the daily Surfaced newsletter",
  "data-capture-location": captureLocation,
}: {
  variant?: "default" | "minimal";
  /** Unique id base — feeds the input id and aria-labelledby pairing. */
  formId?: string;
  /** Accessible name for the form when no visible label is present. */
  ariaLabel?: string;
  "data-capture-location"?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const inputId = `${formId}-email`;

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
      <form
        id={formId}
        aria-label={ariaLabel}
        action={EMBED_ACTION}
        method="post"
        target="_blank"
        onSubmit={() => { track("newsletter_submit", { location: captureLocation || formId }); setSubmitted(true); }}
        className="flex gap-2"
      >
        <label htmlFor={inputId} className="sr-only">Email address</label>
        <input
          id={inputId}
          type="email"
          name="email"
          placeholder="Enter your email"
          data-capture-location={captureLocation}
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
          required
        />
        <input type="hidden" name="tag" value="surfaced" />
        <button type="submit" className="px-5 py-2.5 rounded-lg btn-gradient text-sm cursor-pointer">
          Join
        </button>
      </form>
    );
  }

  return (
    <form
      id={formId}
      aria-label={ariaLabel}
      action={EMBED_ACTION}
      method="post"
      target="_blank"
      onSubmit={() => { track("newsletter_submit", { location: captureLocation || formId }); setSubmitted(true); }}
      className="flex flex-col sm:flex-row gap-3 max-w-md"
    >
      <label htmlFor={inputId} className="sr-only">Email address</label>
      <input
        id={inputId}
        type="email"
        name="email"
        placeholder="your@email.com"
        data-capture-location={captureLocation}
        className="flex-1 px-5 py-3.5 rounded-xl bg-surface-elevated border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15 transition-all"
        required
      />
      <input type="hidden" name="tag" value="surfaced" />
      <button type="submit" className="px-7 py-3.5 rounded-xl btn-gradient text-sm cursor-pointer active:scale-[0.98]">
        Subscribe Free
      </button>
    </form>
  );
}
