// CS2 Case Opener service worker.
// Strategies:
//   - Skin & case images        → cache-first (rarely change, expensive)
//   - JS / CSS chunks           → stale-while-revalidate
//   - Anything in /api/         → network-only
//   - Everything else (HTML)    → network with cache fallback

const VERSION = 'v3';
const STATIC_CACHE = `cs2-static-${VERSION}`;
const IMAGE_CACHE = `cs2-img-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== STATIC_CACHE && k !== IMAGE_CACHE) return caches.delete(k);
      return undefined;
    }));
    await self.clients.claim();
  })());
});

function isImage(url) {
  return /\/assets\/images\//.test(url.pathname);
}

function isAsset(url) {
  return /\/assets\/(?!images)/.test(url.pathname) || /\.(?:js|css|woff2?)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ignore cross-origin (fonts CDN, Steam CDN)

  if (url.pathname.startsWith('/api/')) {
    return; // network-only
  }

  if (isImage(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const resp = await fetch(req);
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      } catch {
        return cached ?? Response.error();
      }
    })());
    return;
  }

  if (isAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then((resp) => {
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      }).catch(() => cached);
      return cached || network;
    })());
    return;
  }

  // HTML / navigation
  event.respondWith((async () => {
    try {
      const resp = await fetch(req);
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, resp.clone());
      return resp;
    } catch {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      return cached ?? new Response('Offline', { status: 503 });
    }
  })());
});
