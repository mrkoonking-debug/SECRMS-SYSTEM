// Self-unregistering Service Worker for legacy domain secrmssystem.web.app
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
      .then(function () {
        return self.registration.unregister();
      })
      .then(function () {
        return self.clients.matchAll({ type: 'window' });
      })
      .then(function (clients) {
        clients.forEach(function (client) {
          try {
            var u = new URL(client.url);
            client.navigate('https://secrms.web.app' + u.pathname + u.search + u.hash);
          } catch (e) {
            client.navigate('https://secrms.web.app/');
          }
        });
      })
  );
});
