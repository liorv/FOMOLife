const CACHE_NAME = 'fomo-life-v3';

// Only cache immutable static assets — never HTML or JS chunks
const PRECACHE_URLS = [
  '/assets/logo_fomo.png',
  '/assets/circuit-bg.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Always go network for: navigation (HTML), API routes, Next.js chunks, auth, and RSC requests
  if (
    request.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/_next/') ||
    request.headers.has('rsc') ||
    request.headers.has('next-router-prefetch') ||
    request.headers.has('next-router-state-tree')
  ) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Cache-first only for same-origin static assets (images, fonts, etc.)
  // Avoid caching paths at the root (like /?tab=...)
  if (url.pathname === '/' || !url.pathname.match(/\.(png|jpg|jpeg|gif|svg|woff2?|ttf|css|js|ico|webmanifest)$/i)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Cache-first only for same-origin static assets (images, fonts, etc.)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

function notificationDestination(rawUrl) {
  const url = new URL(rawUrl || '/', self.location.origin);
  // Migrate already-delivered links without losing their conversation or task context.
  if (url.origin === self.location.origin && (url.pathname === '/dashboard' || url.pathname === '/dashboard/')) {
    url.pathname = '/';
  }
  return url.href;
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'FOMO Life', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'FOMO Life';
  const options = {
    body: data.body || '',
    icon: '/assets/logo_fomo.png',
    badge: '/assets/logo_fomo.png',
    tag: data.tag,
    data: { url: notificationDestination(data.url) },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = notificationDestination(event.notification.data && event.notification.data.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return Promise.resolve('navigate' in client ? client.navigate(url) : client)
            .then(() => client.focus());
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
