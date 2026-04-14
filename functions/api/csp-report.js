/**
 * CSP Violation Report Endpoint
 * 
 * Receives Content-Security-Policy violation reports from browsers,
 * stores the last 200 in Cloudflare KV, and provides a GET endpoint
 * for reviewing them.
 * 
 * POST /api/csp-report  — browsers send violation reports here
 * GET  /api/csp-report  — returns stored violations as JSON (admin use)
 * 
 * Requires a KV namespace binding named CSP_REPORTS in Cloudflare Pages settings.
 * If KV is not configured, reports are logged to console (visible via wrangler tail).
 */

const MAX_STORED = 200;
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max reports per IP per minute
const KV_KEY = "csp_violations";

// Simple in-memory rate limiter (resets per isolate lifecycle)
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// POST: Receive a CSP violation report
export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  // Rate limit
  if (isRateLimited(ip)) {
    return new Response("Too many reports", { status: 429 });
  }

  // Parse the report body
  let report;
  try {
    const body = await request.json();
    // Browsers send either {"csp-report": {...}} (report-uri) or [{"type":"csp-violation","body":{...}}] (report-to)
    report = body["csp-report"] || body?.body || (Array.isArray(body) ? body[0]?.body : null) || body;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Build a clean, minimal violation record
  const violation = {
    ts: new Date().toISOString(),
    blockedUri: report["blocked-uri"] || report.blockedURL || "",
    violatedDirective: report["violated-directive"] || report.effectiveDirective || "",
    documentUri: report["document-uri"] || report.documentURL || "",
    sourceFile: report["source-file"] || report.sourceFile || "",
    lineNumber: report["line-number"] || report.lineNumber || 0,
    disposition: report.disposition || "enforce",
    userAgent: request.headers.get("User-Agent") || "",
  };

  // Log to console (visible via `wrangler pages deployment tail`)
  console.log("[CSP Violation]", JSON.stringify(violation));

  // Store in KV if available
  if (env.CSP_REPORTS) {
    try {
      const existing = await env.CSP_REPORTS.get(KV_KEY, { type: "json" }) || [];
      existing.unshift(violation);
      // Keep only the most recent MAX_STORED
      if (existing.length > MAX_STORED) existing.length = MAX_STORED;
      await env.CSP_REPORTS.put(KV_KEY, JSON.stringify(existing));
    } catch (e) {
      console.error("[CSP] KV write error:", e.message);
    }
  }

  // Return 204 No Content (standard for report endpoints)
  return new Response(null, { status: 204 });
}

// GET: Retrieve stored violations (for admin review)
export async function onRequestGet(context) {
  const { request, env } = context;

  // Basic auth check — require a secret query param to view reports
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expectedToken = env.CSP_ADMIN_TOKEN;

  if (expectedToken && token !== expectedToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!env.CSP_REPORTS) {
    return Response.json({
      error: "KV not configured. Reports are only in console logs.",
      hint: "Bind a KV namespace called CSP_REPORTS in Cloudflare Pages settings.",
    }, { status: 503 });
  }

  const violations = await env.CSP_REPORTS.get(KV_KEY, { type: "json" }) || [];

  // Support filtering
  const directive = url.searchParams.get("directive");
  const since = url.searchParams.get("since");
  let filtered = violations;
  if (directive) {
    filtered = filtered.filter(v => v.violatedDirective?.includes(directive));
  }
  if (since) {
    filtered = filtered.filter(v => v.ts >= since);
  }

  return Response.json({
    total: violations.length,
    showing: filtered.length,
    violations: filtered,
  }, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
