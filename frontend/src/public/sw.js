self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('fms-cache').then((cache) =>
      cache.addAll([
        '/',
        '/assets/fallback-fish.jpg',
        '/assets/fish.jpg',
        '/assets/icon-192.png',
        '/assets/icon-512.png',
        '/assets/apple-touch-icon.png',
        '/manifest.json',
      ])
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});