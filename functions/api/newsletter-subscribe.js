const BUTTONDOWN_SUBSCRIBERS_URL = "https://api.buttondown.com/v1/subscribers";
const MAX_BODY_BYTES = 4096;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_MAP_CAP = 1000;
const rateLimitMap = new Map();

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {}),
    },
  });
}

function isRateLimited(key) {
  const now = Date.now();

  if (rateLimitMap.size > RATE_LIMIT_MAP_CAP) {
    for (const [entryKey, entry] of rateLimitMap) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(entryKey);
    }
  }

  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { windowStart: now, count: 1 });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function clamp(value, max = 140) {
  return String(value || "").trim().slice(0, max);
}

async function readPayload(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return { error: "Request too large", status: 413 };
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return { payload: await request.json() };
    }
    const formData = await request.formData();
    return {
      payload: {
        email: formData.get("email"),
        formId: formData.get("formId"),
        location: formData.get("location"),
        referrerUrl: formData.get("referrerUrl"),
      },
    };
  } catch {
    return { error: "Invalid request body", status: 400 };
  }
}

async function parseButtondownError(response) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.email_address?.[0] === "string") return data.email_address[0];
    return JSON.stringify(data).slice(0, 240);
  } catch {
    return (await response.text().catch(() => "")).slice(0, 240);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "unknown";

  if (isRateLimited(ip)) {
    return jsonResponse(
      { ok: false, code: "rate_limited", message: "Too many signup attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const { payload, error, status } = await readPayload(request);
  if (error) {
    return jsonResponse({ ok: false, code: "bad_request", message: error }, { status });
  }

  const email = clamp(payload?.email, 254).toLowerCase();
  if (!isValidEmail(email)) {
    return jsonResponse(
      { ok: false, code: "invalid_email", message: "Enter a valid email address, like you@example.com." },
      { status: 400 },
    );
  }

  if (!env.BUTTONDOWN_API_KEY) {
    return jsonResponse(
      { ok: false, code: "service_unavailable", message: "Newsletter signup is temporarily unavailable. Try again shortly." },
      { status: 503 },
    );
  }

  const formId = clamp(payload?.formId, 80);
  const location = clamp(payload?.location || formId || "newsletter", 80);
  const referrerUrl = clamp(payload?.referrerUrl, 500);

  const response = await fetch(BUTTONDOWN_SUBSCRIBERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${env.BUTTONDOWN_API_KEY}`,
      "Content-Type": "application/json",
      "X-Buttondown-Collision-Behavior": "add",
    },
    body: JSON.stringify({
      email_address: email,
      tags: ["surfaced", location].filter(Boolean),
      referrer_url: referrerUrl,
      ip_address: ip === "unknown" ? undefined : ip,
      metadata: {
        form_id: formId,
        capture_location: location,
      },
    }),
  });

  if (response.ok) {
    return jsonResponse({
      ok: true,
      message: "Check your inbox to confirm your Surfaced subscription.",
    });
  }

  const buttondownMessage = await parseButtondownError(response);

  if (response.status === 400) {
    return jsonResponse(
      {
        ok: false,
        code: "provider_validation_error",
        message: buttondownMessage || "That email address could not be subscribed. Check it and try again.",
      },
      { status: 400 },
    );
  }

  if (response.status === 409) {
    return jsonResponse(
      {
        ok: false,
        code: "subscriber_conflict",
        message: "That address may already be subscribed. Check your inbox, or try a different email.",
      },
      { status: 409 },
    );
  }

  if (response.status === 429) {
    return jsonResponse(
      { ok: false, code: "provider_rate_limited", message: "The newsletter service is rate-limiting signups. Try again in a few minutes." },
      { status: 429 },
    );
  }

  console.error("[newsletter] Buttondown error", response.status, buttondownMessage);
  return jsonResponse(
    { ok: false, code: "provider_error", message: "The newsletter service could not process that request. Try again in a moment." },
    { status: 502 },
  );
}
