const CACHE_NAME = "royalty-runner-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/profile.html",
  "/works.html",
  "/rights-and-registration.html",
  "/royalties.html",
  "/manage.html",
  "/law.html",
  "/contracts.html",
  "/documents.html",
  "/protection.html",
  "/glossary.html",
  "/the-game.html",
  "/about-me.html",
  "/export.html",

  "/manifest.json",
  "/favicon.ico",

  "/assets/css/style.css",
  "/assets/js/app.js",
  "/assets/js/catalog.js",
  "/assets/js/db.js",
  "/assets/js/works.js",

  "/assets/img/royal-catalog.jpg",
  "/assets/img/royal-profile.jpg",
  "/assets/img/royal-randr.jpg",

  "/assets/icons/royal-192.png",
  "/assets/icons/royal-512.png"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE
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

// FETCH
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() =>
          caches.match("/index.html")
        )
      );
    })
  );
});
