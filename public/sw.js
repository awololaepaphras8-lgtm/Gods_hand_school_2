// God's Hand International Model School - Offline Academic Service Worker
// Version: 1.0.0
const CACHE_NAME = 'ghs-cache-v1';
const ACADEMIC_CACHE_NAME = 'ghs-offline-academic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest'
];

// Install event - Pre-cache essential app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Static asset precache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== ACADEMIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first with Cache fallback for navigation & academic data
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET requests or chrome-extension URLs
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Handle HTML navigation (Single Page Application fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) return cachedIndex;
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('/')) || new Response('Offline - God\'s Hand Model School', {
          headers: { 'Content-Type': 'text/plain' }
        });
      })
    );
    return;
  }

  // Cache-first for images, fonts, and static assets
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Return empty response if offline and asset not cached
            return new Response('', { status: 408, statusText: 'Offline' });
          });
      })
    );
    return;
  }

  // Network-first for all other requests
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ offline: true, message: 'Currently offline. Showing cached records.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })
  );
});

// Message listener: allows frontend code (e.g. offlineAcademicService) to store academic records
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CACHE_ACADEMIC_DATA') {
    try {
      const cache = await caches.open(ACADEMIC_CACHE_NAME);
      const dataBlob = new Blob([JSON.stringify(event.data.payload)], {
        type: 'application/json'
      });
      const response = new Response(dataBlob, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-GHS-Cached-At': new Date().toISOString()
        }
      });
      await cache.put(`/api/offline/academic-records/${event.data.payload.studentId || 'current'}`, response);
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true, timestamp: Date.now() });
      }
    } catch (e) {
      console.warn('[ServiceWorker] Failed to cache academic data:', e);
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: false, error: String(e) });
      }
    }
  }
});
