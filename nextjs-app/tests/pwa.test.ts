/**
 * The installable app: the manifest, its icons, and the service worker's rules. The service worker is
 * run for real here (in a sandbox with a small fake of the Cache API), because a worker that caches
 * the wrong thing breaks the live site quietly: chat answers and sign-in must never be cached, and an
 * offline visitor must land on the offline page rather than the browser's error.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import manifest from '../app/manifest'
import nextConfig from '../next.config'

let passed = 0
let failed = 0
let registered = 0
// the event loop emptying with a test still waiting would otherwise end as a silent success
process.on('exit', () => {
  if (passed + failed !== registered) {
    console.log(`\nFAIL ${registered - passed - failed} test(s) never finished`)
    process.exitCode = 1
  }
})
// one test at a time: the service worker tests share a network switch
let queue: Promise<void> = Promise.resolve()

function test(name: string, fn: () => void | Promise<void>) {
  registered++
  queue = queue.then(async () => {
    try {
      await fn()
      console.log(`  ok  ${name}`)
      passed++
    } catch (e) {
      console.log(`  FAIL ${name}\n       ${(e as Error).message}`)
      failed++
    }
  })
}

const root = path.join(__dirname, '..')
const pub = (p: string) => path.join(root, 'public', p)
const exists = (p: string) => fs.existsSync(pub(p))

// ── The manifest ──────────────────────────────────────────────────────────────

const m = manifest()

test('manifest: installable fields', () => {
  assert.equal(m.display, 'standalone')
  assert.ok(m.name && m.short_name && m.start_url && m.scope)
  assert.ok(m.short_name!.length <= 12, 'a long short_name is cut on the Home Screen')
  assert.equal(m.lang, 'he')
  assert.equal(m.dir, 'rtl')
})

test('manifest: start_url is inside scope and tagged for analytics', () => {
  assert.ok(m.start_url!.startsWith(m.scope!))
  assert.match(m.start_url!, /utm_source=pwa/)
})

test('manifest: icons exist, are PNG, and have the size they declare', () => {
  const icons = m.icons ?? []
  assert.ok(icons.some(i => i.sizes === '192x192' && i.purpose === 'any'), 'a 192 icon')
  assert.ok(icons.some(i => i.sizes === '512x512' && i.purpose === 'any'), 'a 512 icon')
  assert.ok(icons.some(i => i.purpose === 'maskable'), 'a maskable icon')
  for (const icon of icons) {
    assert.ok(exists(icon.src), `${icon.src} is missing`)
    const buf = fs.readFileSync(pub(icon.src))
    assert.equal(buf.subarray(1, 4).toString(), 'PNG', `${icon.src} is not a PNG`)
    const [w, h] = icon.sizes!.split('x').map(Number)
    assert.equal(buf.readUInt32BE(16), w, `${icon.src} width`)
    assert.equal(buf.readUInt32BE(20), h, `${icon.src} height`)
  }
})

test('apple touch icon exists (iOS ignores the manifest icons)', () => {
  const file = path.join(root, 'app', 'apple-icon.png')
  assert.ok(fs.existsSync(file))
  assert.equal(fs.readFileSync(file).readUInt32BE(16), 180)
})

test('/sw.js is served uncached and may control the whole site', async () => {
  const rules = await nextConfig.headers!()
  const sw = rules.find(r => r.source === '/sw.js')
  assert.ok(sw, 'headers for /sw.js')
  const get = (k: string) => sw!.headers.find(h => h.key === k)?.value
  assert.match(get('Cache-Control')!, /max-age=0/)
  assert.equal(get('Service-Worker-Allowed'), '/')
})

test('the locale layout renders the telemetry and the service worker registration', () => {
  const layout = fs.readFileSync(path.join(root, 'app', '[locale]', 'layout.tsx'), 'utf8')
  assert.match(layout, /<SiteTelemetry \/>/)
  const telemetry = fs.readFileSync(path.join(root, 'components', 'layout', 'SiteTelemetry.tsx'), 'utf8')
  assert.match(telemetry, /serviceWorker\.register\('\/sw\.js'/)
})

test('offline page: static, in the three languages', () => {
  const html = fs.readFileSync(pub('offline.html'), 'utf8')
  for (const lang of ['he', 'en', 'ru']) assert.match(html, new RegExp(`\\b${lang}: \\{`), lang)
  assert.ok(!/<script[^>]+src=/.test(html), 'must not depend on files that may not be cached')
})

// ── The service worker, run in a sandbox ──────────────────────────────────────

const ORIGIN = 'https://example.test'

class FakeCache {
  store = new Map<string, Response>()
  private key = (r: Request | string) => new URL(typeof r === 'string' ? r : r.url, ORIGIN).href
  async add(r: string) { this.store.set(this.key(r), await fetchImpl(new Request(new URL(r, ORIGIN)))) }
  async put(r: Request | string, res: Response) { this.store.set(this.key(r), res) }
  async match(r: Request | string, opts?: { ignoreSearch?: boolean }) {
    const k = new URL(this.key(r))
    for (const [key, res] of this.store) {
      const u = new URL(key)
      if (u.pathname === k.pathname && (opts?.ignoreSearch || u.search === k.search)) return res.clone()
    }
    return undefined
  }
  async keys() { return [...this.store.keys()].map(k => new Request(k)) }
  async delete(r: Request) { return this.store.delete(this.key(r)) }
}

const cacheStore = new Map<string, FakeCache>()
let online = true
const fetched: string[] = []
let slow: Promise<Response> | null = null
async function fetchImpl(req: Request): Promise<Response> {
  fetched.push(new URL(req.url).pathname)
  if (slow) return slow
  if (!online) throw new TypeError('offline')
  return new Response('network:' + new URL(req.url).pathname, { status: 200 })
}

const listeners = new Map<string, (e: unknown) => void>()
const sandbox: Record<string, unknown> = {
  URL, Request, Response, Promise, console, setTimeout,
  fetch: (r: Request) => fetchImpl(r),
  caches: {
    open: async (name: string) => cacheStore.get(name) ?? cacheStore.set(name, new FakeCache()).get(name)!,
    match: async (r: Request) => {
      for (const c of cacheStore.values()) { const hit = await c.match(r); if (hit) return hit }
      return undefined
    },
    keys: async () => [...cacheStore.keys()],
    delete: async (name: string) => cacheStore.delete(name),
  },
}
sandbox.self = Object.assign(sandbox, {
  location: { origin: ORIGIN },
  skipWaiting: async () => {},
  clients: { claim: async () => {} },
  addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
})
const swSource = fs.readFileSync(pub('sw.js'), 'utf8')
vm.runInNewContext(swSource, sandbox)

let answeredAt = 0

/** Fire a fetch event; resolves to the response the worker gave, or null when it left the request alone. */
async function ask(url: string, init: { method?: string; mode?: RequestMode; headers?: Record<string, string> } = {}) {
  const req = new Request(new URL(url, url.startsWith('http') ? undefined : ORIGIN), { method: init.method ?? 'GET', headers: init.headers })
  Object.defineProperty(req, 'mode', { value: init.mode ?? 'cors' })
  let answer = null as Promise<Response> | null
  const waits: Promise<unknown>[] = []
  listeners.get('fetch')!({ request: req, respondWith: (p: Promise<Response>) => { answer = Promise.resolve(p) }, waitUntil: (p: Promise<unknown>) => waits.push(p) })
  const res = answer ? await answer : null
  answeredAt = Date.now()
  await Promise.all(waits)
  return res
}

test('service worker: compiles and listens for install, activate and fetch', () => {
  for (const t of ['install', 'activate', 'fetch']) assert.ok(listeners.has(t), t)
})

test('service worker: every precached file exists', () => {
  const list = /const PRECACHE = \[([^\]]*)\]/.exec(swSource)![1]
  const files = [...list.matchAll(/'([^']+)'/g)].map(x => x[1])
  assert.ok(files.includes('/offline.html'))
  for (const f of files) assert.ok(exists(f), `${f} is precached but missing`)
})

test('service worker: leaves chat, sign-in, other sites and non-GET requests alone', async () => {
  assert.equal(await ask('/api/chat'), null)
  assert.equal(await ask('/api/research/12'), null)
  assert.equal(await ask('/auth/callback?code=x'), null)
  assert.equal(await ask('https://www.youtube-nocookie.com/embed/abc'), null)
  assert.equal(await ask('/he', { method: 'POST', mode: 'navigate' }), null)
  assert.equal(await ask('/research/12.json', { headers: { range: 'bytes=0-9' } }), null)
  assert.equal(await ask('/sw.js'), null)
})

test('service worker: a page is served from the network, and kept for when the network is gone', async () => {
  online = true
  const live = await ask('/he/sage/41', { mode: 'navigate' })
  assert.equal(await live!.text(), 'network:/he/sage/41')
  online = false
  const saved = await ask('/he/sage/41', { mode: 'navigate' })
  assert.equal(await saved!.text(), 'network:/he/sage/41', 'the last good copy')
  online = true
})

test('service worker: an unvisited page offline lands on the offline page', async () => {
  const install = listeners.get('install')!
  online = true
  await new Promise<void>(resolve => install({ waitUntil: (p: Promise<unknown>) => p.then(() => resolve()) }))
  online = false
  const res = await ask('/en/never-visited', { mode: 'navigate' })
  assert.equal(await res!.text(), 'network:/offline.html')
  online = true
})

test('service worker: the offline page\'s icon is available offline (it was precached, not visited)', async () => {
  online = false
  const res = await ask('/icons/icon-192.png')
  assert.equal(await res!.text(), 'network:/icons/icon-192.png')
  online = true
})

test('service worker: data is fresh when online and kept for when the network is gone', async () => {
  online = true
  await ask('/data.json')                                   // first visit: network, saved
  online = false
  const offline = await ask('/data.json')                   // offline: the saved copy
  assert.equal(await offline!.text(), 'network:/data.json')
  online = true
  const before = fetched.length
  await ask('/data.json')
  assert.ok(fetched.length > before, 'online, the network is asked first')
})

test('service worker: research documents are kept offline too, in their own cache', async () => {
  online = true
  await ask('/research/41.json')
  online = false
  const res = await ask('/research/41.json')
  assert.equal(await res!.text(), 'network:/research/41.json')
  assert.ok(cacheStore.get('ozar-research-v1')!.store.size >= 1)
  online = true
})

test('service worker: a quiz once played can be played again offline', async () => {
  online = true
  await ask('/quiz/41.json')
  online = false
  const res = await ask('/quiz/41.json')
  assert.equal(await res!.text(), 'network:/quiz/41.json')
  online = true
})

test('service worker: a slow network falls back to the saved copy', async () => {
  online = true
  await ask('/data-youtube.json')                           // saved
  slow = new Promise<Response>(resolve => setTimeout(() => resolve(new Response('late')), 4600))
  const t0 = Date.now()
  const res = await ask('/data-youtube.json')
  slow = null
  assert.equal(await res!.text(), 'network:/data-youtube.json', 'the saved copy, not the late answer')
  const waited = answeredAt - t0
  assert.ok(waited >= 3500 && waited < 4500, `answered after ${waited} ms: SLOW_MS, not the whole delay`)
})

test('service worker: old caches are removed on activation, other sites\' caches are not', async () => {
  cacheStore.set('ozar-pages-v0', new FakeCache())
  cacheStore.set('someone-else', new FakeCache())
  await new Promise<void>(resolve => listeners.get('activate')!({ waitUntil: (p: Promise<unknown>) => p.then(() => resolve()) }))
  assert.ok(!cacheStore.has('ozar-pages-v0'))
  assert.ok(cacheStore.has('someone-else'))
  assert.ok(cacheStore.has('ozar-pages-v1'))
})

queue.then(() => {
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
})
