const CACHE_NAME = "expense-tracker-v23";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./config.js",
  "./manifest.json",
  "./lib/chart.umd.min.js",
  "./lib/xlsx.full.min.js",
  "./lib/supabase.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

// GitHub Pages lets the browser keep files for 10 minutes. cache.addAll() and a
// plain fetch() both go through that HTTP cache, so right after a publish they could
// store an OLD style.css next to a NEW index.html. Always ask the server instead.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(CORE_ASSETS.map(async (url) => {
        const response = await fetch(url, { cache: "reload" });
        if (!response.ok) throw new Error("Could not cache " + url);
        await cache.put(url, response);
      }))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Never intercept cross-origin calls (e.g. the Supabase API) - this cache
  // strategy is only for this app's own static shell. Caching dynamic,
  // per-user API responses here would silently serve stale data forever.
  if (new URL(event.request.url).origin !== self.location.origin) return;
  // Network-first: always try for the newest files so updates show up on the
  // next load. "no-cache" revalidates with the server (a cheap 304 when nothing
  // changed) instead of trusting the browser's HTTP cache. The service worker
  // cache is only the offline fallback.
  event.respondWith(
    fetch(event.request.url, { cache: "no-cache" })
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
