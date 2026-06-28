/**
 * Ozar Chachamim - Service Worker
 * Enables offline functionality and app-like experience
 */

const CACHE_NAME = 'ozar-chachamim-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/graph.js',
  '/map.js',
  '/styles-graph.css',
  '/config.example.js',
  '/data.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('💾 Caching assets:', ASSETS_TO_CACHE.length, 'files');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('⚠️ Some assets could not be cached:', err);
        // Continue installation even if some assets fail
        return cache.addAll(ASSETS_TO_CACHE.filter((url) => url !== '/config.example.js'));
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external APIs and Supabase requests (always fetch fresh)
  if (
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('cdn.') ||
    event.request.url.includes('leaflet')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If offline, return cached version or offline page
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache if not ok
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Offline fallback
          console.log('📡 Offline: Could not fetch', event.request.url);
          return caches.match('/index.html');
        });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker registered - Offline mode enabled');
