const CACHE_NAME = 'invoice-pwa-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // HTMLはネット優先（更新を拾う）→ 失敗時にキャッシュ/オフライン
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || caches.match('./offline.html');
      }
    })());
    return;
  }

  // それ以外はキャッシュ優先
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    } catch (e) {
      return caches.match('./offline.html');
    }
  })());
});
