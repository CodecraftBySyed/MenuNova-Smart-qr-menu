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

// Install Event - Caches static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        // We use map to catch individual errors so one missing file doesn't break everything
        return Promise.allSettled(
          STATIC_ASSETS.map(asset => cache.add(asset))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Cleans up old caches
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

// Fetch Event - Handles network requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== 'GET') return;

  // 2. Network-first strategy for API calls
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(API_CACHE_NAME).then((cache) => cache.put(request, responseClone));
          notifyClients({ type: 'ONLINE', message: 'Connected to server' });
          return response;
        })
        .catch(() => {
          notifyClients({ type: 'OFFLINE', message: 'You are offline' });
          return caches.match(request);
        })
    );
    return;
  }

  // 3. Strategy for same-origin static assets (The Fix is here)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          // FIX: If the response is a redirect (common on Cloudflare), return it directly.
          // This prevents the "redirect mode is not follow" error.
          if (response.redirected) {
            return response;
          }

          const responseClone = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        }).catch(() => {
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
