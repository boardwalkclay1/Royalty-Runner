const CACHE_NAME = "royalty-runner-v1";
const ASSETS = [
  "index.html",
  "profile.html",
  "works.html",
  "royalties.html",
  "catalog.html",
  "export.html",
  "manifest.json",
  "assets/css/style.css",
  "assets/js/app.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
