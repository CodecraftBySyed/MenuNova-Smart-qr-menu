const STATIC_CACHE_NAME = 'menunova-static-v1';
const API_CACHE_NAME = 'menunova-api-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './src/output.css?v=2',
  './src/style.css?v=2',
  './js/script.js?v=2',
  './js/config.js',
  './js/login.js',
  './images/logo.png',
  './images/favicon.ico',
  './video/video.webm'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network-first strategy for API calls
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(API_CACHE_NAME).then((cache) => cache.put(request, responseClone));
          // Notify clients that we're back online
          notifyClients({ type: 'ONLINE', message: 'Connected to server' });
          return response;
        })
        .catch(() => {
          // Network failed - notify clients
          notifyClients({ type: 'OFFLINE', message: 'You are offline' });
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first strategy for same-origin static assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        }).catch(() => {
          // Network failed for static asset
          notifyClients({ type: 'OFFLINE', message: 'You are offline' });
          return null;
        });
      })
    );
  }
});

// Notify all clients of network status changes
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

