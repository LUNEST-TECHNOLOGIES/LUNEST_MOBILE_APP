// Only disposable LUNEST app assets live here; login and drafts use separate storage.
const CACHE_NAME = 'lunest-pwa-v8';
const CACHE_PREFIX = 'lunest-pwa-';
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name))
  )).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkWithDeadline(request, timeoutMs = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(request, { signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || /^\/(v1|api)(\/|$)/.test(url.pathname)) return;
  const navigation = request.mode === 'navigate';
  const versionedAsset = url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/assets/');
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Fingerprinted assets cannot change at the same URL. Warm launches need no network round trip.
    if (versionedAsset) {
      const cached = await cache.match(request);
      if (cached && !cached.headers.get('content-type')?.includes('text/html')) return cached;
      if (cached) await cache.delete(request);
    }
    try {
      const response = await networkWithDeadline(request, versionedAsset ? 15000 : NETWORK_TIMEOUT_MS);
      if (versionedAsset && response.headers.get('content-type')?.includes('text/html')) {
        return new Response('App asset is unavailable. Reload to get the latest version.', { status: 503 });
      }
      if (response.ok && response.type !== 'opaque') {
        event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
      }
      return response;
    } catch {
      const cached = await cache.match(request, { ignoreSearch: navigation });
      if (cached) return cached;
      if (navigation) {
        const home = await cache.match('/');
        if (home) return home;
        return new Response('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>LUNEST</title><body style="margin:0;background:#010135;color:white;display:grid;place-content:center;min-height:100vh;text-align:center;font-family:system-ui"><h1>LUNEST</h1><p>You are offline. Reconnect and try again.</p><button onclick="location.reload()">Try again</button></body></html>', { status: 503, headers: { 'Content-Type': 'text/html' } });
      }
      // Never serve an HTML document as a missing JavaScript file.
      return new Response('Asset unavailable offline', { status: 503 });
    }
  })());
});
