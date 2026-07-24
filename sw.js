/**
 * sw.js — DUO Menu Service Worker
 * Strategy: Cache-first for static assets, Network-first for pages.
 * Bump CACHE_NAME to force an update on all clients.
 */

const CACHE_NAME = 'duo-menu-v5';

/* Core assets cached on install */
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/products.js',
  '/slides.js',
  '/dashboard.html',
  '/dashboard.css',
  '/dashboard.js',
  '/duo-connect.js',
  '/manifest.json',
  '/icons/logo.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  /* slide images */
  '/images/slides/slide1.jpg',
  '/images/slides/slide2.jpg',
  '/images/slides/slide3.jpg',
  '/images/slides/slide4.jpg',
  '/images/slides/slide5.jpg',
];

/* ── Install: pre-cache core assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(
        PRECACHE.filter(url => {
          // skip entries that might 404 (images added later by user)
          return true;
        })
      );
    }).catch(err => {
      console.warn('[SW] Pre-cache partial failure:', err);
    })
  );
  // Take control immediately without waiting for old SW to die
  self.skipWaiting();
});

/* ── Activate: clean up old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Claim all open clients immediately
  self.clients.claim();
});

/* ── Fetch: Cache-first with network fallback ── */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (CDN fonts, Font Awesome, etc.)
  // We still let them go to the network, but cache successful responses
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    /* Same-origin: Cache-first → Network fallback → Cache stale */
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          // Serve from cache; refresh in background
          const networkFetch = fetch(request).then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
            return response;
          }).catch(() => {/* offline — cached already served */});

          return cached; // return cached immediately
        }

        // Not in cache → fetch and cache
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
  } else {
    /* Cross-origin (CDN): Network-first → Cache fallback */
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

/* ── Message: force update from client ── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
