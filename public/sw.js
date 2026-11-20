// Only disposable LUNEST app assets live here; login and drafts use separate storage.
const CACHE_NAME = 'lunest-pwa-v8';
const CACHE_PREFIX = 'lunest-pwa-';
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
async function optionalCache(promise, fallback = null, timeoutMs = 250) {
  let timer;
  try {
    return await Promise.race([promise, new Promise(resolve => { timer = setTimeout(() => resolve(fallback), timeoutMs); })]);
  } catch { return fallback; }
  finally { clearTimeout(timer); }
}
self.addEventListener('activate', event => {
  // Cache maintenance must never stop a new worker from taking control.
  const cleanup = optionalCache(caches.keys(), [], 500).then(names => Promise.all(
    names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => optionalCache(caches.delete(name), false, 500))
  ));
  event.waitUntil(Promise.all([cleanup, self.clients.claim()]));
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
    const cache = await optionalCache(caches.open(CACHE_NAME));
    // Fingerprinted assets cannot change at the same URL. Warm launches need no network round trip.
    if (versionedAsset && cache) {
      const cached = await optionalCache(cache.match(request));
      if (cached && !cached.headers.get('content-type')?.includes('text/html')) return cached;
      if (cached) event.waitUntil(optionalCache(cache.delete(request)));
    }
    try {
      const response = await networkWithDeadline(request, versionedAsset ? 15000 : NETWORK_TIMEOUT_MS);
      if (versionedAsset && response.headers.get('content-type')?.includes('text/html')) {
        return new Response('App asset is unavailable. Reload to get the latest version.', { status: 503 });
      }
      if (cache && response.ok && response.type !== 'opaque') {
        event.waitUntil(optionalCache(cache.put(request, response.clone())));
      }
      return response;
    } catch {
      const cached = cache && await optionalCache(cache.match(request, { ignoreSearch: navigation }));
      if (cached) return cached;
      if (navigation) {
        const home = cache && await optionalCache(cache.match('/'));
        if (home) return home;
        return new Response('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>LUNEST</title><body style="margin:0;background:#010135;color:white;display:grid;place-content:center;min-height:100vh;text-align:center;font-family:system-ui"><h1>LUNEST</h1><p>You are offline. Reconnect and try again.</p><button onclick="location.reload()">Try again</button></body></html>', { status: 503, headers: { 'Content-Type': 'text/html' } });
      }
      // Never serve an HTML document as a missing JavaScript file.
      return new Response('Asset unavailable offline', { status: 503 });
    }
  })());
});
