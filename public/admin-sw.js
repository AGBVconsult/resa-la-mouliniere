// Service Worker for La Moulinière Admin PWA
const CACHE_NAME = 'lm-admin-v2';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('lm-admin-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-admin routes and RSC requests
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/admin')) return;

  // Skip RSC (React Server Components) requests - they should not be cached
  if (url.searchParams.has('_rsc')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Fallback to cache on network failure
        const cachedResponse = await caches.match(event.request);
        // Return cached response or a proper error response
        return cachedResponse || new Response('Offline - resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
