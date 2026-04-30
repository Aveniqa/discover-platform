/**
 * Tinybird events — small, typed, no-PII.
 *
 * Falls back to a no-op when:
 *   - running on the server (no `window`)
 *   - the user has Do Not Track enabled
 *   - env vars NEXT_PUBLIC_TINYBIRD_TOKEN / NEXT_PUBLIC_TINYBIRD_DATASOURCE
 *     are missing (e.g. local dev, preview deploys without secrets)
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track("bookmark_toggle", { slug, action: "add" });
 *
 * Events shipped:
 *   - page_view              { path }
 *   - bookmark_toggle        { slug, action: "add" | "remove" }
 *   - surprise_me_click      { from?: string }
 *   - newsletter_submit      { location?: string }
 *   - outbound_click         { host, kind: "amazon" | "bestbuy" | "source" | "other", slug? }
 *   - quick_view_open        { slug }
 */

type Props = Record<string, string | number | boolean | undefined | null>;

interface TinybirdConfig {
  token: string;
  datasource: string;
  endpoint: string;
}

let cachedConfig: TinybirdConfig | null | undefined;

function getConfig(): TinybirdConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;
  const token = process.env.NEXT_PUBLIC_TINYBIRD_TOKEN;
  const datasource = process.env.NEXT_PUBLIC_TINYBIRD_DATASOURCE;
  if (!token || !datasource) {
    cachedConfig = null;
    return cachedConfig;
  }
  // Region — defaults to US East. Override with NEXT_PUBLIC_TINYBIRD_HOST.
  const host = process.env.NEXT_PUBLIC_TINYBIRD_HOST || "api.us-east.tinybird.co";
  cachedConfig = { token, datasource, endpoint: `https://${host}/v0/events` };
  return cachedConfig;
}

function isDoNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  // navigator.doNotTrack is "1" / "yes" when enabled. window.doNotTrack on IE.
  const dnt =
    navigator.doNotTrack ||
    (window as unknown as { doNotTrack?: string }).doNotTrack;
  return dnt === "1" || dnt === "yes";
}

function safeProps(p?: Props): Record<string, string | number | boolean> {
  if (!p) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v == null) continue;
    out[k] = v;
  }
  return out;
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function classifyOutbound(url: string): "amazon" | "bestbuy" | "source" | "other" {
  const h = safeHost(url).toLowerCase();
  if (!h) return "other";
  if (h === "amazon.com" || h.endsWith(".amazon.com") || /(?:^|\.)amazon\.[a-z.]+$/i.test(h)) return "amazon";
  if (h === "bestbuy.com" || h.endsWith(".bestbuy.com")) return "bestbuy";
  return "source";
}

/** Fire-and-forget event. Never throws, never blocks. */
export function track(name: string, props?: Props): void {
  if (typeof window === "undefined") return;
  if (isDoNotTrack()) return;
  const cfg = getConfig();
  if (!cfg) return;

  const body = JSON.stringify({
    timestamp: new Date().toISOString(),
    name,
    ...safeProps(props),
  });

  // Prefer sendBeacon — survives page navigation. Falls back to fetch keepalive.
  const url = `${cfg.endpoint}?name=${encodeURIComponent(cfg.datasource)}&token=${encodeURIComponent(cfg.token)}`;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(url, body);
      return;
    }
    // Best-effort fetch — don't await, don't surface errors.
    void fetch(url, { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // Swallow — analytics must never break user flow.
  }
}

/** Convenience — emit page_view with current path. Call from a client effect. */
export function trackPageView(path?: string): void {
  if (typeof window === "undefined") return;
  track("page_view", { path: path || window.location.pathname });
}
