const CACHE_NAME = "site-cache-v1";
const OFFLINE_URL = "../offline.html";

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([OFFLINE_URL]);
    })
  );
});

self.addEventListener("fetch", function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(OFFLINE_URL);
    })
  );
});
