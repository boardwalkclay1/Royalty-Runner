const CACHE_NAME = "royalty-runner-v2";

const ASSETS = [
  "/assets/css/style.css",
  "/assets/js/app.js",
  "/assets/js/catalog.js",
  "/assets/js/db.js",
  "/assets/js/works.js",
  "/assets/img/royal-catalog.jpg",
  "/assets/img/royal-profile.jpg",
  "/assets/img/royal-randr.jpg",
  "/assets/icons/royal-192.png",
  "/assets/icons/royal-512.png",
  "/manifest.json",
  "/favicon.ico"
];

// INSTALL — cache static assets only
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH — network first for HTML, cache first for assets
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // HTML pages → network first
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets → cache first
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req);
    })
  );
});
