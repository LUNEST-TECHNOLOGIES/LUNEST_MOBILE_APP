// Only app assets live here. API responses, logins and drafts are never cached by this worker.
const CACHE_NAME = 'lunest-pwa-v9';
const CACHE_PREFIX = 'lunest-pwa-';
const NETWORK_TIMEOUT_MS = 3500;
const READY_KEY = '/__lunest_release_ready__';
const PRECACHE_URLS = []; // Replaced by the production build with this release's app shell.
const OFFLINE_HTML = '<!-- LUNEST_OFFLINE_HTML -->';
async function optionalCache(promise, fallback = null, timeoutMs = 250) {
  let timer;
  try { return await Promise.race([promise, new Promise(resolve => { timer = setTimeout(() => resolve(fallback), timeoutMs); })]); }
  catch { return fallback; }
  finally { clearTimeout(timer); }
}
async function networkWithDeadline(request, timeoutMs = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(request, { signal: controller.signal });
    const body = await response.arrayBuffer();
    return new Response(body, {status:response.status,statusText:response.statusText,headers:response.headers});
  }
  finally { clearTimeout(timer); }
}
async function cachedAsset(cache, request, options) {
  const direct = cache && await optionalCache(cache.match(request, options));
  if (direct) return direct;
  // Keep the previous working release usable during an update or a failed precache.
  const names = await optionalCache(caches.keys(), []);
  for (const name of names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).reverse()) {
    const previous = await optionalCache(caches.open(name));
    const found = previous && await optionalCache(previous.match(request, options));
    if (found) return found;
  }
  return null;
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await optionalCache(caches.open(CACHE_NAME));
  if (cache) {
    let complete = PRECACHE_URLS.length > 0;
    const queue = PRECACHE_URLS.filter(path => path !== '/');
    await Promise.all(Array.from({length: 4}, async () => {
      while (queue.length) {
        const path = queue.shift();
        try {
          const response = await networkWithDeadline(new Request(new URL(path, self.location.origin), {cache:'reload'}), 20000);
          if (response.ok && (!path.endsWith('.js') || !response.headers.get('content-type')?.includes('text/html'))) {
            if (await optionalCache(cache.put(path, response), false) === false) complete = false;
          } else { complete = false; }
        } catch { complete = false; }
      }
    }));
    // Commit the HTML shell only after every required script/font has been saved.
    if (complete) {
      try {
        const home = await networkWithDeadline(new Request(self.location.origin+'/',{cache:'reload'}),15000);
        const markup = await home.clone().text();
        const matchingBundle = PRECACHE_URLS.some(path => path.endsWith('.js') && markup.includes(path));
        if (home.ok && matchingBundle && await optionalCache(cache.put('/',home),false) !== false) {
          await optionalCache(cache.put(READY_KEY,new Response('ready')));
        }
      } catch { /* Previous complete releases remain available. */ }
    }
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => {
  // Retain two prior releases so an interrupted update cannot erase offline access.
  const cleanup = (async () => {
    const current = await optionalCache(caches.open(CACHE_NAME));
    if (!current || !await optionalCache(current.match(READY_KEY))) return;
    const names = await optionalCache(caches.keys(), [], 500);
    return Promise.all(
    names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).slice(0, -2)
      .map(name => optionalCache(caches.delete(name), false, 500))
    );
  })();
  event.waitUntil(Promise.all([cleanup, self.clients.claim()]));
});
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || /^\/(v1|api)(\/|$)/.test(url.pathname)) return;
  const navigation = request.mode === 'navigate';
  const versionedAsset = url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/assets/');
  event.respondWith((async () => {
    const cache = await optionalCache(caches.open(CACHE_NAME));
    const refresh = async () => {
      const response = await networkWithDeadline(request, versionedAsset ? 15000 : NETWORK_TIMEOUT_MS);
      if (versionedAsset && response.headers.get('content-type')?.includes('text/html')) throw new Error('Invalid asset response');
      if (cache && response.ok && response.type !== 'opaque' && !url.searchParams.has('__lunest_probe')) {
        let save = true;
        if (navigation && PRECACHE_URLS.length) {
          const ready = await optionalCache(cache.match(READY_KEY));
          const markup = await response.clone().text();
          save = !!ready && PRECACHE_URLS.some(path => path.endsWith('.js') && markup.includes(path));
        }
        if (save) event.waitUntil(optionalCache(cache.put(navigation && url.searchParams.has('__lunest_recover') ? url.pathname : request, response.clone())));
      }
      return response;
    };
    const saved = await cachedAsset(cache, request, {ignoreSearch:navigation});
    if (versionedAsset && saved && !saved.headers.get('content-type')?.includes('text/html')) return saved;
    if (versionedAsset && saved) event.waitUntil(optionalCache(cache?.delete(request)));
    if (navigation && saved && !url.searchParams.has('__lunest_recover')) {
      event.waitUntil(refresh().catch(() => {}));
      return saved;
    }
    try { return await refresh(); }
    catch {
      if (navigation) {
        const home = saved || await cachedAsset(cache, '/');
        if (home) return home;
        return new Response(OFFLINE_HTML, {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
      if (saved && !versionedAsset) return saved;
      return new Response('Asset unavailable. Reconnect and try again.', {status:503});
    }
  })());
});
