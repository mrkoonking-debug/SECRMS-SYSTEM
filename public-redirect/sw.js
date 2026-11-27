// Self-claiming, cache-wiping, redirecting, and self-unregistering Service Worker for secrmssystem.web.app
var TARGET_ORIGIN = 'https://secrms.web.app';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' +
          TARGET_ORIGIN +
          '/"><script>location.replace(' +
          JSON.stringify(TARGET_ORIGIN) +
          ' + location.pathname + location.search + location.hash);</script></head><body></body></html>',
        {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        }
      )
    );
  }
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
      .then(function () {
        return self.clients.claim();
      })
      .then(function () {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then(function (clients) {
        return Promise.all(
          clients.map(function (client) {
            return client.navigate(client.url).catch(function () {});
          })
        );
      })
      .then(function () {
        return self.registration.unregister();
      })
  );
});
