"use client";

import { type FormEvent, useRef, useState } from "react";
import { track } from "@/lib/analytics";

const EMBED_ACTION = "https://buttondown.email/api/emails/embed-subscribe/surfaced";
const SUBSCRIBE_ENDPOINT = "/api/newsletter-subscribe";
const TEASER = "Get the day's top tech discoveries delivered at 6 PM.";

type SubmitState = "idle" | "submitting" | "success" | "error";

function getValidationMessage(input: HTMLInputElement): string | null {
  if (input.validity.valueMissing) return "Enter your email address to subscribe.";
  if (input.validity.typeMismatch) return "Enter a valid email address, like you@example.com.";
  if (!input.validity.valid) return "Check the email address and try again.";
  return null;
}

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
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputId = `${formId}-email`;
  const teaserId = `${formId}-teaser`;
  const hintId = `${formId}-hint`;
  const messageId = `${formId}-message`;
  const isMinimal = variant === "minimal";
  const describedBy = `${teaserId} ${hintId}${state === "error" ? ` ${messageId}` : ""}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const emailInput = form.elements.namedItem("email");
    if (!(emailInput instanceof HTMLInputElement)) return;

    const validationMessage = getValidationMessage(emailInput);
    if (validationMessage) {
      setState("error");
      setMessage(validationMessage);
      setFallbackAvailable(false);
      emailInput.focus();
      return;
    }

    setState("submitting");
    setMessage("");
    setFallbackAvailable(false);
    const location = captureLocation || formId;
    track("newsletter_submit", { location });

    try {
      const response = await fetch(SUBSCRIBE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          formId,
          location,
          referrerUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const canUseHostedFallback = response.status === 503 || payload?.code === "service_unavailable";
        setState("error");
        setFallbackAvailable(canUseHostedFallback);
        setMessage(
          canUseHostedFallback
            ? "Newsletter signup is temporarily routing through Buttondown. Use the secure fallback to finish subscribing."
            : typeof payload?.message === "string"
            ? payload.message
            : "The newsletter service could not process that request. Try again in a moment.",
        );
        track("newsletter_error", { location, status: response.status });
        return;
      }

      setState("success");
      setMessage("You're in. Check your inbox to confirm your subscription.");
      track("newsletter_success", { location });
    } catch {
      setState("error");
      setMessage("We could not reach the newsletter service. Check your connection and try again.");
      setFallbackAvailable(false);
      track("newsletter_error", { location, status: "network" });
    }
  }

  function openHostedFallback() {
    const form = formRef.current;
    if (!form) return;
    track("newsletter_fallback", { location: captureLocation || formId });
    HTMLFormElement.prototype.submit.call(form);
  }

  if (state === "success") {
    return (
      <div
        id={messageId}
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3.5"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mt-0.5 shrink-0 text-emerald" aria-hidden="true">
          <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <p className="text-sm font-bold text-emerald">Check your inbox.</p>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-100/85">
            We sent a confirmation link so you can finish joining Surfaced.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={isMinimal ? "w-full" : "w-full max-w-md"}>
      <p
        id={teaserId}
        className={isMinimal ? "sr-only" : "mb-3 text-sm font-medium leading-relaxed text-muted"}
      >
        {TEASER}
      </p>
      <form
        ref={formRef}
        id={formId}
        aria-label={ariaLabel}
        action={EMBED_ACTION}
        method="post"
        target="_blank"
        rel="noopener noreferrer"
        noValidate
        onSubmit={handleSubmit}
        className={isMinimal ? "flex gap-2" : "flex flex-col gap-3 sm:flex-row"}
      >
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          name="email"
          placeholder={isMinimal ? "Enter your email" : "your@email.com"}
          autoComplete="email"
          inputMode="email"
          data-capture-location={captureLocation}
          aria-describedby={describedBy}
          aria-invalid={state === "error"}
          className={
            isMinimal
              ? "min-w-0 flex-1 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
              : "min-w-0 flex-1 rounded-xl border border-border bg-surface-elevated px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/15"
          }
          required
          disabled={state === "submitting"}
        />
        <input type="hidden" name="tag" value="surfaced" />
        <button
          type="submit"
          aria-busy={state === "submitting"}
          disabled={state === "submitting"}
          className={
            isMinimal
              ? "rounded-lg px-5 py-2.5 text-sm btn-gradient cursor-pointer disabled:cursor-wait disabled:opacity-70"
              : "rounded-xl px-7 py-3.5 text-sm btn-gradient cursor-pointer active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          }
        >
          {state === "submitting" ? "Joining..." : isMinimal ? "Join" : "Subscribe Free"}
        </button>
      </form>
      <p id={hintId} className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Free, source-linked, and easy to unsubscribe from.
      </p>
      {state === "error" && (
        <div id={messageId} role="alert" className="mt-2 text-xs font-semibold leading-relaxed text-rose-200">
          <p>{message}</p>
          {fallbackAvailable && (
            <button
              type="button"
              onClick={openHostedFallback}
              className="mt-2 inline-flex rounded-lg border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-xs font-bold text-rose-50 transition-colors hover:border-rose-100/60"
            >
              Open secure Buttondown signup
            </button>
          )}
        </div>
      )}
    </div>
  );
}
