// Surfaced Service Worker — network-first for HTML, cache-first for assets
//
// CDN headers are set to no-cache (revalidate on every request), so
// CF Pages' edge always serves fresh content after a deploy. HTML navigations
// must also be network-first in the SW so returning visitors do not keep seeing
// an older cached homepage after a production release.
//
// On activation, old caches are purged automatically.

const CACHE_VERSION = 'surfaced-v4';
const CACHE_NAME = `${CACHE_VERSION}-pages`;
const CACHED_AT_HEADER = 'X-Surfaced-SW-Cached-At';
const NAVIGATION_FALLBACK_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

// Routes that can use an offline fallback when the network is unavailable.
const NAVIGATION_PATTERNS = [
  /^\/$/,               // homepage
  /^\/item\//,          // all 500+ item detail pages
  /^\/discover(\/|$)/,  // discovery category + pagination
  /^\/trending(\/|$)/,  // products category
  /^\/hidden-gems(\/|$)/,
  /^\/future-radar(\/|$)/,
  /^\/tools(\/|$)/,     // daily tools category
  /^\/collections(\/|$)/,
  /^\/categories(\/|$)/,
];

// Static assets that should be cached aggressively (immutable)
const STATIC_PATTERN = /\/_next\/static\//;

function stampCachedResponse(response) {
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT_HEADER, String(Date.now()));
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isFreshNavigationFallback(response) {
  const cachedAt = Number(response.headers.get(CACHED_AT_HEADER) || 0);
  return cachedAt > 0 && Date.now() - cachedAt <= NAVIGATION_FALLBACK_MAX_AGE;
}

/**
 * Network-first strategy:
 * 1. Fetch fresh HTML from Cloudflare Pages.
 * 2. Cache it only as an offline fallback.
 * 3. Use cache only when the network is unavailable.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, stampCachedResponse(networkResponse.clone())).catch(() => {});
    }
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse && isFreshNavigationFallback(cachedResponse)) return cachedResponse;
  }

  // Both cache and network failed — return offline fallback
  return new Response('Offline — please check your connection.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * Cache-first strategy for immutable static assets (_next/static/).
 * These files are content-hashed and never change.
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// ── Install ─────────────────────────────────────────
self.addEventListener('install', () => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

// ── Activate ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Static assets — cache-first (immutable, content-hashed)
  if (STATIC_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML navigations — network-first so deploys are visible immediately.
  const isNavigation = request.mode === 'navigate';
  const matchesNavigation = NAVIGATION_PATTERNS.some((pattern) => pattern.test(url.pathname));

  if (isNavigation && matchesNavigation) {
    event.respondWith(networkFirst(request));
    return;
  }
});

// ── Message handler for cache invalidation ──────────
self.addEventListener('message', (event) => {
  // Only accept messages from pages on our own origin.
  // event.origin is empty for same-origin MessagePort messages in some
  // browsers, so also accept when the source client matches self.origin.
  const fromSameOrigin =
    event.origin === self.location.origin ||
    (event.origin === '' &&
      event.source &&
      new URL(event.source.url).origin === self.location.origin);

  if (!fromSameOrigin) return;

  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('surfaced-'))
            .map((key) => caches.delete(key))
        )
      )
    );
  }
});
