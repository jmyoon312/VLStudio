// ViraLoop PWA Service Worker
const CACHE_NAME = 'viraloop-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Pass-through for dynamic API requests, Vite dev server modules, hot-reloads, and WebSocket/media streams
  if (
    url.includes('/api/') ||
    url.includes('/media/') ||
    url.includes('/files/') ||
    url.includes('/temp/') ||
    url.includes('/node_modules/') ||
    url.includes('/.vite/') ||
    url.includes('/@') ||
    url.includes('/src/') ||
    url.includes('?v=') ||
    url.includes('?import') ||
    url.includes('hot-update')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
