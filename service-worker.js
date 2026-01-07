// Service Worker for Gokul Sweets Cost Analytics PWA
const CACHE_NAME = 'gokul-sweets-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './config.js',
  './supabase-client.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install event - cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Cache failed:', err);
        // Don't fail installation if caching fails
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network-first for navigation, cache-first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Network-first strategy for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response and cache it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then(response => {
            return response || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache-first strategy for other requests
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
  );
});

// Listen for SKIP_WAITING message to immediately activate
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
