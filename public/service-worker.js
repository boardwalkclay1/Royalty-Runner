const CACHE_NAME = "royalty-runner-v3";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/profile.html",
  "/my-catalog.html",
  "/works.html",
  "/royalties.html",
  "/rights-and-registration.html",
  "/manage.html",
  "/contracts.html",
  "/documents.html",
  "/protection.html",
  "/glossary.html",
  "/export.html",

  "/manifest.json",
  "/favicon.ico",

  "/assets/css/style.css",
  "/assets/js/app.js",
  "/assets/js/catalog.js",
  "/assets/js/db.js",
  "/assets/js/works.js",
  "/assets/js/glossary-words.js",
  "/assets/js/glossary-music.js",

  "/assets/img/royal-catalog.jpg",
  "/assets/img/royal-profile.jpg",
  "/assets/img/royal-manage.jpg",
  "/assets/img/royal-randr.jpg",

  "/assets/icons/royal-192.png",
  "/assets/icons/royal-512.png"
];

// INSTALL — cache static assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE — delete old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH — safe strategy for multi‑page apps
self.addEventListener("fetch", event => {
  const req = event.request;

  // Always network-first for HTML navigation
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => {
          // fallback only for images
          if (req.destination === "image") {
            return caches.match("/assets/img/royal-profile.jpg");
          }
        });
    })
  );
});
