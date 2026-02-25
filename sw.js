const STATIC_CACHE_NAME = 'menunova-static-v3';
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
  // VIDEO REMOVED FROM HERE TO PREVENT 206 ERROR
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
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

  if (event.request.method !== 'GET') return;

  // 1. SKIP VIDEOS: Range requests (206) cannot be cached.
  if (url.pathname.endsWith('.webm') || url.pathname.endsWith('.mp4')) {
    return; 
  }

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

  // 3. Static Assets: Cache First, handle redirects
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Handle Cloudflare Redirects
        if (response.redirected) {
          return response;
        }

        // Only cache successful standard responses (Status 200)
        if (response.status === 200) {
           const clone = response.clone();
           caches.open(STATIC_CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        
        return response;
      }).catch(() => {
          // Offline fallback could go here
      });
    })
  );
});
