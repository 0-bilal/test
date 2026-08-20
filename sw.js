/**
 * sw.js — DUO Menu Service Worker
 * Strategy: Cache-first for static assets, Network-first for pages.
 * Bump CACHE_NAME to force an update on all clients.
 */

const CACHE_NAME = 'duo-menu-v23';

/* Core assets cached on install — مسارات نسبية (بلا "/" بادئة) عمداً:
   تُحسَب داخل Service Worker بالنسبة لموقع sw.js نفسه، فتعمل صحيحة سواء
   كان الموقع منشوراً على جذر الدومين أو داخل مجلد فرعي (subpath). كانت
   النسخة السابقة تستخدم مسارات جذر مطلقة (/index.html...) تُخطئ الموقع
   الحقيقي لأي نشر ليس على جذر الدومين مباشرة — وهو على الأرجح سبب فتح
   التطبيق المثبَّت لصفحة خاطئة بدل صفحة المنيو. */
const PRECACHE = [
  './',
  './index.html',
  './cashier.html',
  './dashboard.html',
  './manifest.json',
  './css/style.css',
  './css/vmenu.css',
  './css/game.css',
  './css/game-xo.css',
  './css/cashier.css',
  './css/dashboard.css',
  './js/main.js',
  './js/vmenu.js',
  './js/products.js',
  './js/slides.js',
  './js/game.js',
  './js/game-xo.js',
  './js/games-hub.js',
  './js/dashboard.js',
  './js/cashier.js',
  './js/duo-config.js',
  './js/duo-connect.js',
  './js/duo-sync.js',
  './js/duo-auth.js',
  './icons/logo.ico',
  './icons/icon.svg',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './images/logo.ico',
  /* صور الشرائح — 7 شرائح PNG فعلية */
  './images/slides/slide1.png',
  './images/slides/slide2.png',
  './images/slides/slide3.png',
  './images/slides/slide4.png',
  './images/slides/slide5.png',
  './images/slides/slide6.png',
  './images/slides/slide7.png',
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
