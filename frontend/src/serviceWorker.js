const CACHE_NAME = 'getreech-cache-v1';
const urlsToCache = ['/assets/fallback-fish.jpg', '/'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/products')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        }).catch(() => {
          return caches.match(event.request);
        });
      })
    );
  } else {
    event.respondWith(fetch(event.request));
  }
});

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/serviceWorker.js').then(
        registration => {
          console.log('ServiceWorker registered:', registration);
        },
        error => {
          console.error('ServiceWorker registration failed:', error);
        }
      );
    });
  }
}