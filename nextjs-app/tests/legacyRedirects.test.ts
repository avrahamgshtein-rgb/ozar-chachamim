/**
 * The move to the site's own domain: whoever follows the address the site was shared under (the project's
 * old production host, LEGACY_HOSTS of lib/siteUrl.ts) is sent, permanently, to the same path and query
 * string on SITE_URL (next.config.ts `redirects()`, built by lib/legacyRedirects.ts).
 *
 * The rule builder is pure and is tried here with explicit arguments and, for the environment's switch
 * (NEXT_PUBLIC_SITE_URL), in fresh processes, as tests/seo.test.ts does. With SEO_BASE_URL set (a running
 * `npm run start`, say SEO_BASE_URL=http://localhost:3130) it also asks the served app, with a Host header per
 * request, where each address goes; with SEO_BUILT=1 the built routes manifest must hold the rule.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import nextConfig from '../next.config'
import { legacyRedirects } from '../lib/legacyRedirects'
import { LEGACY_HOSTS, SITE_URL } from '../lib/siteUrl'

let passed = 0
let failed = 0
let skipped = 0
const queue: Array<() => Promise<void>> = []
function test(name: string, fn: () => void | Promise<void>) {
  queue.push(async () => {
    try { await fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
  })
}

const app = path.join(__dirname, '..')
const OLD = 'ozar-chachamim-app.vercel.app'
const NEW = 'https://ozarchachamim.org'

/** A script run in a fresh process whose environment is `env` (SITE_URL reads the environment when its module loads). */
function inFreshProcess(env: Record<string, string>, code: string): string {
  const clean = { ...process.env }
  delete clean.NEXT_PUBLIC_SITE_URL
  return execFileSync(process.execPath, ['--import', 'tsx', '-e', code], { cwd: app, env: { ...clean, ...env }, encoding: 'utf8' })
}
const RULES = `console.log(JSON.stringify({ site: require('./lib/siteUrl.ts').SITE_URL, rules: require('./lib/legacyRedirects.ts').legacyRedirects() }))`

/** How the router reads a `has` host rule: a regular expression the whole host must match. */
const hostMatches = (value: string, host: string) => new RegExp(`^${value}$`).test(host)
/** How the router reads the source: the path is captured and put into the destination. */
const follow = (rule: ReturnType<typeof legacyRedirects>[number], pathname: string) => rule.destination.replace('/:path*', pathname === '/' ? '' : pathname)

// ── the rule builder ────────────────────────────────────────────────────────────

test('the old production host of this project is the one legacy host, and it is not the site\'s own address', () => {
  assert.deepEqual([...LEGACY_HOSTS], [OLD])
  assert.notEqual(new URL(NEW).host, OLD)
})

test('the default address of the site is ozarchachamim.org (with nothing in the environment)', () => {
  const o = JSON.parse(inFreshProcess({}, RULES))
  assert.equal(o.site, NEW)
})

test('the legacy host gets one permanent rule: the same path to SITE_URL, for that host only', () => {
  const rules = legacyRedirects(NEW, [OLD])
  assert.equal(rules.length, 1)
  const [r] = rules
  assert.equal(r.source, '/:path*')
  assert.equal(r.permanent, true)
  assert.equal(r.destination, `${NEW}/:path*`)
  assert.equal(r.has.length, 1)
  assert.equal(r.has[0].type, 'host')
  assert.ok(hostMatches(r.has[0].value, OLD))
  // the path is kept whole (the query string is carried over by the router, checked on the served app below)
  assert.equal(follow(r, '/he/sage/2'), `${NEW}/he/sage/2`)
  assert.equal(follow(r, '/'), NEW)
})

test('only the exact host: the dots are not wildcards, and the deployment and preview addresses of the project do not match', () => {
  const [r] = legacyRedirects(NEW, [OLD])
  const v = r.has[0].value
  assert.equal(v, 'ozar-chachamim-app\\.vercel\\.app')
  for (const other of [
    'ozar-chachamim-app-abc123.vercel.app',              // a deployment's own address
    'ozar-chachamim-app-git-main-owner.vercel.app',      // a branch preview
    'ozar-chachamim.vercel.app',                         // the separate project
    'ozar-chachamim-appXvercelYapp',                      // the dots are literal
    'x.ozar-chachamim-app.vercel.app',
    'ozar-chachamim-app.vercel.app.evil.test',
    'ozarchachamim.org', 'localhost:3130', 'localhost',
  ]) assert.ok(!hostMatches(v, other), other)
})

test('several legacy hosts each get a rule; names are lower-cased and blanks dropped', () => {
  const rules = legacyRedirects('https://example.org/', ['Old-One.example.net', ' ', 'old-two.example.net'])
  assert.deepEqual(rules.map(r => r.has[0].value), ['old-one\\.example\\.net', 'old-two\\.example\\.net'])
  for (const r of rules) assert.equal(r.destination, 'https://example.org/:path*', 'one slash only, however the address was written')
  assert.deepEqual(legacyRedirects(NEW, []), [])
})

test('SITE_URL at the legacy address gives no rule (a redirect to itself would loop); another host in its place still does', () => {
  assert.deepEqual(legacyRedirects(`https://${OLD}`, [OLD]), [])
  assert.deepEqual(legacyRedirects(`https://${OLD.toUpperCase()}/`, [OLD]), [])
  assert.deepEqual(legacyRedirects(`https://${OLD}:8443`, [OLD]).length, 1, 'a port makes it another host')
  assert.equal(legacyRedirects('https://example.org', [OLD]).length, 1)
})

test('NEXT_PUBLIC_SITE_URL is the switch: set to another domain the rule leads there, set to the legacy address there is none', () => {
  const other = JSON.parse(inFreshProcess({ NEXT_PUBLIC_SITE_URL: 'https://example.org/' }, RULES))
  assert.equal(other.site, 'https://example.org')
  assert.equal(other.rules.length, 1)
  assert.equal(other.rules[0].destination, 'https://example.org/:path*')
  for (const raw of [`https://${OLD}`, `https://${OLD}/`, OLD, `http://${OLD}`]) {
    const o = JSON.parse(inFreshProcess({ NEXT_PUBLIC_SITE_URL: raw }, RULES))
    assert.deepEqual(o.rules, [], `NEXT_PUBLIC_SITE_URL=${raw}`)
  }
})

test('next.config.ts serves exactly those rules (from the one list and the one address), and repeats neither', async () => {
  const fromConfig = await nextConfig.redirects!()
  assert.deepEqual(fromConfig, legacyRedirects())
  assert.equal(fromConfig.length, SITE_URL.includes(OLD) ? 0 : 1)
  const src = fs.readFileSync(path.join(app, 'next.config.ts'), 'utf8')
  assert.match(src, /from '\.\/lib\/legacyRedirects'/)
  assert.ok(!/ozarchachamim\.org|vercel\.app/.test(src), 'the config takes the address from lib/siteUrl.ts')
  assert.ok(!/ozarchachamim\.org/.test(fs.readFileSync(path.join(app, 'lib', 'legacyRedirects.ts'), 'utf8')))
})

test('the files that print the site\'s addresses read SITE_URL: none of them names the legacy host', () => {
  // the sitemap, robots, canonical and Open Graph all read SITE_URL (tests/seo.test.ts)
  for (const f of ['app/sitemap.ts', 'app/robots.ts', 'lib/siteMetadata.ts', 'lib/structuredData.ts']) {
    assert.ok(!fs.readFileSync(path.join(app, f), 'utf8').includes(OLD), f)
  }
})

// ── the built app ───────────────────────────────────────────────────────────────

const manifestFile = path.join(app, '.next', 'routes-manifest.json')
if (process.env.SEO_BUILT === '1' || fs.existsSync(manifestFile)) {
  test('the built routes manifest holds the permanent rule for the legacy host (run npm run build first)', () => {
    assert.ok(fs.existsSync(manifestFile), 'no build: run npm run build')
    const built = JSON.parse(fs.readFileSync(manifestFile, 'utf8')).redirects as Array<{ source: string; destination: string; statusCode?: number; permanent?: boolean; has?: Array<{ type: string; value: string }> }>
    const ours = built.filter(r => r.has?.some(h => h.type === 'host'))
    // the build was made in the environment the test runs in, or in the default one
    assert.deepEqual(ours.map(r => [r.destination, r.statusCode, r.has![0].value]), legacyRedirects().map(r => [r.destination, 308, r.has[0].value]))
  })
} else skipped++

// ── the served app ──────────────────────────────────────────────────────────────

/** A request to the running app with its own Host header (fetch cannot set one). */
function get(base: string, url: string, host: string): Promise<{ status: number; location: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url, base)
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET', headers: { Host: host } }, res => {
      res.resume()
      res.on('end', () => resolve({ status: res.statusCode ?? 0, location: String(res.headers.location ?? '') }))
    })
    req.on('error', reject)
    req.end()
  })
}

const BASE = (process.env.SEO_BASE_URL ?? '').replace(/\/$/, '')
if (BASE) {
  const site = SITE_URL
  const paths = [
    '/', '/he', '/he/sage/2?utm_source=youtube&utm_medium=video', '/en/sage/13?utm_source=spotify&utm_medium=podcast',
    '/sitemap.xml', '/robots.txt', '/he/kids/read/saltiel/meeting-1', '/sw.js', '/ru/today', '/he/tower/path/1/2',
  ]
  for (const p of paths) {
    test(`served: ${OLD}${p} is moved for good to ${site}${p}`, async () => {
      const res = await get(BASE, p, OLD)
      assert.equal(res.status, 308)
      assert.equal(res.location, `${site}${p === '/' ? '' : p}`)
    })
  }
  test('served: the site\'s own address, the local one and the project\'s deployment and preview addresses are not redirected', async () => {
    for (const host of [new URL(site).host, new URL(BASE).host, 'ozar-chachamim-app-abc123.vercel.app', 'ozar-chachamim-app-git-main-owner.vercel.app', 'ozar-chachamim.vercel.app']) {
      const res = await get(BASE, '/he', host)
      assert.equal(res.status, 200, `${host}: ${res.status} ${res.location}`)
    }
  })
  test('served: the old host\'s built files are not redirected away from it (a page already open there can finish loading)', async () => {
    const res = await get(BASE, '/_next/static/none.js', OLD)
    assert.notEqual(res.status, 308)
  })
} else skipped++

;(async () => {
  for (const run of queue) await run()
  console.log(`\n${passed} passed, ${failed} failed${skipped ? ` (${skipped} opt-in group${skipped > 1 ? 's' : ''} skipped: SEO_BASE_URL, SEO_BUILT)` : ''}`)
  if (failed > 0) process.exit(1)
})()
