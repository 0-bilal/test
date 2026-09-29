/**
 * sw.js — DUO Menu Service Worker
 * Strategy: Cache-first for static assets, Network-first for pages.
 * Bump CACHE_NAME to force an update on all clients.
 */

const CACHE_NAME = 'duo-menu-v39';

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
  './images/new-products/new.jpg',
  /* صور الشرائح — 7 شرائح JPG مضغوطة (كانت PNG بحجم ~5.7MB) */
  './images/slides/slide1.jpg',
  './images/slides/slide2.jpg',
  './images/slides/slide3.jpg',
  './images/slides/slide4.jpg',
  './images/slides/slide5.jpg',
  './images/slides/slide6.jpg',
  './images/slides/slide7.jpg',
];

/* ── Install: pre-cache core assets ──
   - cache:'reload' يتجاوز كاش HTTP في المتصفح، فلا تُخزَّن نسخة قديمة من
     ملف مع نسخة جديدة من آخر (خليط إصدارات يسبب أخطاء غريبة).
   - كل ملف يُضاف على حدة: فشل ملف واحد لا يُلغي تخزين الباقي (addAll كان
     يفشل بالكامل لو غاب ملف واحد). */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(PRECACHE.map(url =>
        fetch(new Request(url, { cache: 'reload' })).then(res => {
          if (res && res.ok) return cache.put(url, res);
        })
      ))
    )
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
    ).then(() => self.clients.claim())
  );
});

/* مكتبات ثابتة من CDN (الخطوط، Font Awesome، Firebase SDK) — عناوينها
   مرقّمة بالإصدار ولا تتغيّر، فتُقدَّم من الكاش فوراً */
const STATIC_CDN_HOSTS = [
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com',
];

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    /* Same-origin: Cache-first (stale-while-revalidate) → Network fallback */
    event.respondWith(
      caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then(cached => {
        const networkFetch = fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });

        if (cached) {
          // Serve from cache; refresh in background
          event.waitUntil(networkFetch.catch(() => {}));
          return cached;
        }
        return networkFetch.catch(() =>
          request.mode === 'navigate' ? caches.match('./index.html') : Response.error()
        );
      })
    );
    return;
  }

  if (STATIC_CDN_HOSTS.includes(url.hostname)) {
    /* CDN ثابت: Cache-first — كان Network-first فينتظر كل فتح الشبكة
       (واي فاي المطعم البطيء) قبل الرسم، فيتأخر التحميل ويتقطّع */
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // أي طلب خارجي آخر (مثل Firebase Realtime Database) يذهب للشبكة مباشرة
  // دون تدخّل — تخزين ردود قاعدة البيانات في الكاش كان يُرجع بيانات قديمة.
});

/* ── Message: force update from client ── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
