"use client";

import { useState } from "react";

// Buttondown's public embed endpoint handles bot detection (Turnstile) natively.
// Must be a real browser form POST — fetch calls are rejected by Turnstile.
const EMBED_ACTION = "https://buttondown.email/api/emails/embed-subscribe/surfaced";

export function NewsletterForm({
  variant = "default",
  "data-capture-location": captureLocation,
}: {
  variant?: "default" | "minimal";
  "data-capture-location"?: string;
}) {
  const [submitted, setSubmitted] = useState(false);

  // Hidden iframe absorbs the Buttondown POST response so no new tab opens
  const iframe = <iframe name="buttondown-subscribe" style={{ display: "none" }} aria-hidden="true" />;

  if (submitted) {
    return (
      <>
        {iframe}
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald shrink-0">
            <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-medium text-emerald">You&apos;re in. Check your inbox to confirm your subscription.</span>
        </div>
      </>
    );
  }

  if (variant === "minimal") {
    return (
      <>
        {iframe}
        <form
          action={EMBED_ACTION}
          method="post"
          target="buttondown-subscribe"
          onSubmit={() => setSubmitted(true)}
          className="flex gap-2"
        >
        <input
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
      </>
    );
  }

  return (
    <>
      {iframe}
      <form
      action={EMBED_ACTION}
      method="post"
      target="buttondown-subscribe"
      onSubmit={() => setSubmitted(true)}
      className="flex flex-col sm:flex-row gap-3 max-w-md"
    >
      <input
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
    </>
  );
}
