// Surfaced Service Worker — stale-while-revalidate for all pages
//
// CDN headers are set to no-cache (revalidate on every request), so
// CF Pages’ edge always serves fresh content after a deploy. The SW
// is the *only* layer providing instant loads for returning visitors:
//   1. Serve cached version immediately (≈0ms)
//   2. Fetch fresh version from edge in background
//   3. Update SW cache for next visit
//
// On activation, old caches are purged automatically.

const CACHE_VERSION = 'surfaced-v2';
const CACHE_NAME = `${CACHE_VERSION}-pages`;

// Routes that benefit from SW caching (HTML navigations)
const SWR_PATTERNS = [
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

/**
 * Stale-While-Revalidate strategy:
 * 1. Serve from cache immediately (instant load for returning visitors)
 * 2. Fetch fresh version from network in background
 * 3. Update cache with fresh version for next visit
 * 4. If no cache exists, fetch from network (first visit)
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Always fetch in background to keep cache fresh
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      // Only cache successful responses
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Network failed — cachedResponse is our only hope
      return null;
    });

  // Return cached version instantly, or wait for network if no cache
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
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
self.addEventListener('install', (event) => {
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

  // HTML navigations — stale-while-revalidate
  const isNavigation = request.mode === 'navigate';
  const matchesSWR = SWR_PATTERNS.some((pattern) => pattern.test(url.pathname));

  if (isNavigation && matchesSWR) {
    event.respondWith(staleWhileRevalidate(request));
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
    caches.delete(CACHE_NAME);
  }
});
