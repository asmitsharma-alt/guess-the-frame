// Scoopcast Guess The Frame - Production Service Worker
// Enables instant 0ms asset retrieval via Cache-First strategy

const CACHE_NAME = 'gtf-cache-v2';
const CORE_PRECACHE = [
  '/',
  '/index.html',
  '/css/tailwind.min.css',
  '/bg/guess_the_frame.webp',
  '/bg/cinema_bg.webp',
  '/logo.png',
  '/avvtar/aman.svg',
  '/avvtar/amish.svg',
  '/avvtar/aziz.svg',
  '/avvtar/vish.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_PRECACHE).catch((err) => {
        console.warn('[SW] Non-blocking precache error:', err);
      });
    })
  );
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Never intercept WebSocket or Appwrite API/Realtime calls
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || url.pathname.startsWith('/v1/')) {
    return;
  }

  // Cache-First for media assets: movie frames, eyes, sounds, avatars, fonts
  const isMediaAsset =
    url.pathname.includes('/GUESSTHEFRAME/') ||
    url.pathname.includes('/GUESSTHEEYES/') ||
    url.pathname.includes('/tie breaker/') ||
    url.pathname.includes('/avvtar/') ||
    url.pathname.includes('/bg/') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2');

  if (isMediaAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          return cachedResponse;
        });
      })
    );
    return;
  }

  // Network-First for HTML/document to ensure players always get latest updates
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // Stale-While-Revalidate for other static requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
