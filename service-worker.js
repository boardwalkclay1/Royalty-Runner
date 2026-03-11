const CACHE_NAME = "royalty-runner-v1";
const ASSETS = [
  "/index.html",
  "/profile.html",
  "/works.html",
  "/royalties.html",
  "/catalog.html",
  "/export.html",
  "/manifest.json",
  "/assets/css/style.css",
  "/assets/js/app.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// IMPORTANT FIX:
// Do NOT cache navigation requests (HTML pages).
// Always fetch them fresh so redirects work.
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // If it's a navigation request (HTML), always fetch from network
  if (req.mode === "navigate") {
    event.respondWith(fetch(req));
    return;
  }

  // Otherwise, use cache-first strategy for static assets
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
