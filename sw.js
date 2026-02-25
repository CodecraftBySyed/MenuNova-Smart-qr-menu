const STATIC_CACHE_NAME = 'menunova-static-v2'; // Changed version to force update
const API_CACHE_NAME = 'menunova-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index',
  '/login',
  '/src/output.css?v=2',
  '/src/style.css?v=2',
  '/js/script.js?v=2',
  '/js/config.js',
  '/js/login.js',
  '/images/logo.png',
  '/images/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      // We use a loop so if one file fails, the others still cache
      return Promise.allSettled(
        STATIC_ASSETS.map(asset => cache.add(asset))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // 2. API requests: Network First
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(API_CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Static Assets & Pages: Cache First, but handle Redirects
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // THIS IS THE FIX: If Cloudflare redirects .html to a clean URL,
        // we just return the response and let the browser handle it.
        if (response.redirected) {
          return response;
        }

        const clone = response.clone();
        caches.open(STATIC_CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
          // Optional: Return a custom offline page here
      });
    })
  );
});
