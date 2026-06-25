const CACHE_NAME = 'fitai-cache-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/window.svg',
  '/globe.svg',
  '/file.svg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell and assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extension, internal webpack, or hot-reload dev-server requests
  if (
    event.request.url.startsWith('chrome-extension://') ||
    url.pathname.startsWith('/_next/') ||
    (url.hostname === 'localhost' && url.port === '3000' && url.pathname.includes('webpack'))
  ) {
    return;
  }

  // API requests: Network-only, or network-first but don't cache database writes
  if (url.port === '8000') {
    // Let the network handle it directly. We do not want to cache real-time API state in the service worker cache
    return;
  }

  // HTML page navigation requests: Network-First, fallback to Cache, fallback to Offline HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the successfully fetched page
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // If offline, try to find the match in cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If page is not in cache, show the offline page
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Static assets (CSS, JS, Images, Fonts): Cache-First, fallback to Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache static files if they are successfully retrieved
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => {
      // Return offline fallback if image/font fails and no cache exists
      const acceptHeader = event.request.headers.get('accept') || '';
      if (acceptHeader.includes('image')) {
        return caches.match('/icons/icon-192x192.png');
      }
    })
  );
});
