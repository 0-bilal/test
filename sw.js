self.addEventListener('install', (e) => {
  console.log('Service Worker Installed');
});

self.addEventListener('fetch', (e) => {
  // هذا الكود يسمح للتطبيق بالعمل حتى في حالة ضعف الإنترنت
  e.respondWith(fetch(e.request));
});