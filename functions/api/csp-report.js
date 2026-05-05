/**
 * CSP Violation Report Endpoint
 *
 * Receives Content-Security-Policy violation reports from browsers and
 * persists the last 200 using the Cloudflare Cache API (no KV binding needed).
 *
 * POST /api/csp-report  — browsers send violation reports here
 * GET  /api/csp-report  — returns stored violations as JSON (token-protected)
 *
 * Storage priority:
 *   1. KV namespace binding "CSP_REPORTS" (if configured in Pages settings)
 *   2. Cloudflare Cache API (works automatically on *.pages.dev — per-colo, ephemeral)
 *
 * The Cache API store is per-data-center and may be evicted, but it requires
 * zero dashboard configuration and captures the majority of real violations.
 */

const MAX_STORED = 200;
const MAX_BODY_BYTES = 16 * 1024;
const MAX_FIELD_CHARS = 200;
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max reports per IP per minute
const RATE_LIMIT_MAP_CAP = 1000; // prune when map exceeds this size
const KV_KEY = "csp_violations";
// Cache API key — a synthetic URL used as the cache key
const CACHE_KEY = "https://surfaced-x.pages.dev/_internal/csp-violations-store";
// Cache TTL: 7 days (max useful window for CSP violation review)
const CACHE_TTL = 60 * 60 * 24 * 7;

// Admin token — MUST be set as CSP_ADMIN_TOKEN environment variable
// in Cloudflare Pages Settings > Environment Variables.
// No hardcoded fallback — if the env var is missing, GET returns 503.

// In-memory rate limiter (resets per isolate lifecycle)
const rateLimitMap = new Map();

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function isRateLimited(ip) {
  const now = Date.now();

  // Prune stale entries when map grows too large
  if (rateLimitMap.size > RATE_LIMIT_MAP_CAP) {
    for (const [key, entry] of rateLimitMap) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitMap.delete(key);
      }
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

/**
 * Constant-time string comparison to prevent timing attacks on the admin token.
 * JavaScript's !== short-circuits on the first differing character.
 */
function timingSafeEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function noStoreResponse(body, init = {}) {
  return new Response(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init.headers || {}),
    },
  });
}

function clampField(value, max = MAX_FIELD_CHARS) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
}

function sanitizeDirective(value) {
  return clampField(value, 120).replace(/[^\w\s:;.'*-]/g, "");
}

function sanitizeLineNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 1_000_000);
}

function sanitizeReportUrl(value, requestUrl, detail = "origin") {
  const raw = clampField(value);
  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (
    lower === "inline" ||
    lower === "eval" ||
    lower === "wasm-eval" ||
    lower === "self" ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("about:")
  ) {
    return lower.split(":")[0];
  }

  try {
    const current = new URL(requestUrl);
    const parsed = new URL(raw, current.origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return parsed.protocol.replace(":", "");
    }

    if (parsed.origin === current.origin) {
      return `${parsed.pathname || "/"}`;
    }

    return detail === "path" ? `${parsed.origin}${parsed.pathname || "/"}` : parsed.origin;
  } catch {
    return raw.replace(/[?#].*$/, "").slice(0, 80);
  }
}

// ── Storage helpers ─────────────────────────────────────────────────

async function readViolations(env) {
  // Try KV first
  if (env.CSP_REPORTS) {
    try {
      const data = await env.CSP_REPORTS.get(KV_KEY, { type: "json" });
      if (data) return { violations: data, source: "kv" };
    } catch (e) {
      console.error("[CSP] KV read error:", e.message);
    }
  }

  // Fall back to Cache API
  try {
    const cache = caches.default;
    const req = new Request(CACHE_KEY);
    const cached = await cache.match(req);
    if (cached) {
      const data = await cached.json();
      return { violations: data, source: "cache" };
    }
  } catch (e) {
    console.error("[CSP] Cache read error:", e.message);
  }

  return { violations: [], source: "none" };
}

async function writeViolations(env, violations, ctx) {
  const json = JSON.stringify(violations);

  // Write to KV if available
  if (env.CSP_REPORTS) {
    try {
      await env.CSP_REPORTS.put(KV_KEY, json);
    } catch (e) {
      console.error("[CSP] KV write error:", e.message);
    }
  }

  // Always write to Cache API as well (backup / standalone)
  try {
    const cache = caches.default;
    const req = new Request(CACHE_KEY);
    const res = new Response(json, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL}`,
      },
    });
    // Use waitUntil so the cache write doesn't block the response
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(cache.put(req, res));
    } else {
      await cache.put(req, res);
    }
  } catch (e) {
    console.error("[CSP] Cache write error:", e.message);
  }
}

// ── POST: Receive a CSP violation report ────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  if (isRateLimited(ip)) {
    return noStoreResponse("Too many reports", { status: 429 });
  }

  let report;
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return noStoreResponse("Report too large", { status: 413 });
    }

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return noStoreResponse("Report too large", { status: 413 });
    }

    const body = JSON.parse(text);
    // Browsers send either {"csp-report": {...}} or [{"type":"csp-violation","body":{...}}]
    report =
      body["csp-report"] ||
      body?.body ||
      (Array.isArray(body) ? body[0]?.body : null) ||
      body;
  } catch {
    return noStoreResponse("Invalid JSON", { status: 400 });
  }

  if (!report || typeof report !== "object") {
    return noStoreResponse("Invalid report", { status: 400 });
  }

  const violation = {
    ts: new Date().toISOString(),
    blockedUri: sanitizeReportUrl(
      report["blocked-uri"] || report.blockedURL,
      request.url
    ),
    violatedDirective:
      sanitizeDirective(report["violated-directive"] || report.effectiveDirective),
    documentUri: sanitizeReportUrl(
      report["document-uri"] || report.documentURL,
      request.url,
      "path"
    ),
    sourceFile: sanitizeReportUrl(
      report["source-file"] || report.sourceFile,
      request.url
    ),
    lineNumber: sanitizeLineNumber(report["line-number"] || report.lineNumber),
    disposition: clampField(report.disposition || "enforce", 20),
  };

  console.log(
    "[CSP Violation]",
    violation.violatedDirective || "unknown-directive",
    violation.blockedUri || "unknown-blocked-uri"
  );

  // Read → prepend → trim → write
  const { violations } = await readViolations(env);
  violations.unshift(violation);
  if (violations.length > MAX_STORED) violations.length = MAX_STORED;
  await writeViolations(env, violations, context);

  return noStoreResponse(null, { status: 204 });
}

// ── GET: Retrieve stored violations ─────────────────────────────────

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expectedToken = env.CSP_ADMIN_TOKEN;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  if (!expectedToken) {
    console.warn("[CSP] GET request but CSP_ADMIN_TOKEN not configured");
    return Response.json(
      { error: "CSP_ADMIN_TOKEN not configured in environment variables." },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const auth = request.headers.get("Authorization") || "";
  const bearerToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const suppliedToken = bearerToken || token || "";

  if (!timingSafeEquals(suppliedToken, expectedToken)) {
    console.warn("[CSP] Unauthorized GET attempt from:", ip);
    return noStoreResponse("Unauthorized", { status: 401 });
  }

  const { violations, source } = await readViolations(env);

  // Support filtering
  let filtered = violations;
  const directive = url.searchParams.get("directive");
  const since = url.searchParams.get("since");
  if (directive) {
    filtered = filtered.filter((v) =>
      v.violatedDirective?.includes(directive)
    );
  }
  if (since) {
    filtered = filtered.filter((v) => v.ts >= since);
  }

  return Response.json(
    {
      total: violations.length,
      showing: filtered.length,
      storage: source,
      violations: filtered,
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...NO_STORE_HEADERS,
      },
    }
  );
}
