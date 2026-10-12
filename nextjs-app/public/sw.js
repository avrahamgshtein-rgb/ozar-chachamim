/* Service worker of אוצר חכמים: the site opens offline and the second visit is fast.
 *
 * It only ever helps. Anything it does not recognise goes to the network untouched, and a broken
 * cache falls through to the network. Bump VERSION to drop every cache it holds.
 *
 *   /api/*, /auth/*            network only (chat, quota, sign-in are never cached)
 *   /_next/static/*            cache first (file names carry a hash, so they never go stale)
 *   data*.json, i18n, research network first (an edited dataset shows at once), the saved copy when
 *                              offline or when the network takes more than SLOW_MS
 *   images, icons              stale-while-revalidate (shown at once, refreshed in the background)
 *   pages (navigations)        network first, the last good copy when offline, /offline.html at last
 */
const VERSION = 'v1'
const SHELL = `ozar-shell-${VERSION}`
const STATIC = `ozar-static-${VERSION}`
const DATA = `ozar-data-${VERSION}`
const PAGES = `ozar-pages-${VERSION}`
const RESEARCH = `ozar-research-${VERSION}`
const ALL = [SHELL, STATIC, DATA, PAGES, RESEARCH]
const MAX_PAGES = 60
const SLOW_MS = 4000
const MAX_RESEARCH = 80      // research documents are the only large files: keep the ones read last

const PRECACHE = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/images/temple-medallion.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      // one missing file must not stop the worker from installing
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ozar-') && !ALL.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok) cache.put(request, res.clone()).catch(() => {})
  return res
}

async function staleWhileRevalidate(event, cacheName, max) {
  const cache = await caches.open(cacheName)
  // the precached shell files (the offline page's icon) live in another cache: look there too
  const hit = (await cache.match(event.request)) || (await caches.match(event.request))
  const refresh = fetch(event.request)
    .then(res => {
      if (res.ok) {
        cache.put(event.request, res.clone()).then(() => max && trim(cacheName, max)).catch(() => {})
      }
      return res
    })
    .catch(() => null)
  if (hit) {
    event.waitUntil(refresh)
    return hit
  }
  return (await refresh) || Response.error()
}

async function networkFirst(event, cacheName, max) {
  const cache = await caches.open(cacheName)
  const saved = await cache.match(event.request)
  const live = fetch(event.request).then(res => {
    if (res.ok) cache.put(event.request, res.clone()).then(() => max && trim(cacheName, max)).catch(() => {})
    return res
  })
  if (!saved) return live
  event.waitUntil(live.catch(() => {}))
  const slow = new Promise(resolve => setTimeout(() => resolve(saved), SLOW_MS))
  return Promise.race([live.catch(() => saved), slow])
}

async function navigation(request) {
  const cache = await caches.open(PAGES)
  try {
    const res = await fetch(request)
    // a redirected response may not answer a navigation, so only a direct 200 is kept
    if (res.ok && !res.redirected) {
      cache.put(request, res.clone()).then(() => trim(PAGES, MAX_PAGES)).catch(() => {})
    }
    return res
  } catch {
    const hit = await cache.match(request, { ignoreSearch: true })
    if (hit) return hit
    const shell = await caches.open(SHELL)
    return (await shell.match('/offline.html')) || Response.error()
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return          // YouTube, Spotify, maps, Supabase: not ours to cache
  if (request.headers.has('range')) return                 // media streaming
  const path = url.pathname
  if (path.startsWith('/api/') || path.startsWith('/auth/') || path === '/sw.js') return

  if (request.mode === 'navigate') {
    event.respondWith(navigation(request))
    return
  }
  if (path.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC).catch(() => fetch(request)))
    return
  }
  // the dataset and the research change when the owner edits them: fresh when online
  if (/^\/(data[^/]*\.json|i18n\/)/.test(path)) {
    event.respondWith(networkFirst(event, DATA))
  } else if (path.startsWith('/research/')) {
    event.respondWith(networkFirst(event, RESEARCH, MAX_RESEARCH))
  } else if (/^\/(icons|images)\//.test(path)) {
    // not hashed, so they can change in place: show the saved copy and refresh it
    event.respondWith(staleWhileRevalidate(event, DATA))
  }
})
