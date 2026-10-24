/**
 * Which language a bare address goes to (middleware.ts → lib/localeDetect.ts): the Accept-Language header is read
 * with its q-values (it used to be searched for "he", "en", "ru" in that order, so `en-US,en;q=0.9,he;q=0.8` got
 * Hebrew), and the bare "/" goes straight to "/<locale>" (it went to "/<locale>/", which Next.js redirected once
 * more: a two-hop chain). Also pins what the middleware must keep doing: addresses that already carry a language
 * are not redirected, assets, /api and /auth pass through, and the query string survives.
 *
 * Runs the real middleware on addresses that need no session refresh (the refresh calls the auth service).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { preferredLocale, localePrefixedPath } from '../lib/localeDetect'
import { middleware } from '../middleware'

let passed = 0
let failed = 0
const queue: Array<() => Promise<void>> = []
function test(name: string, fn: () => void | Promise<void>) {
  queue.push(async () => {
    try { await fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
  })
}

// ---------------------------------------------------------------------------------------------
// the pure reading of the header
// ---------------------------------------------------------------------------------------------
const CASES: Array<[string | null | undefined, string, string]> = [
  // header, expected, why
  [undefined, 'he', 'no header'],
  [null, 'he', 'null header'],
  ['', 'he', 'empty header'],
  ['he', 'he', 'plain Hebrew'],
  ['he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7', 'he', 'a Hebrew browser'],
  ['en', 'en', 'plain English'],
  ['en-US,en;q=0.9,he;q=0.8', 'en', 'the case the old code got wrong: English first, Hebrew lower'],
  ['en-GB,en;q=0.9', 'en', 'British English'],
  ['ru', 'ru', 'plain Russian'],
  ['ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7', 'ru', 'a Russian browser'],
  ['ru,en;q=0.5,he;q=0.3', 'ru', 'Russian first'],
  ['he;q=0.5,ru', 'ru', 'a lower q on the first entry: the later, heavier one wins'],
  ['en;q=0.4, ru;q=0.6, he;q=0.5', 'ru', 'the highest q, wherever it stands'],
  ['en;q=0.5,ru;q=0.5', 'en', 'equal weights: the first in the header'],
  ['en, ru', 'en', 'no weights: the first in the header'],
  ['fr-FR,fr;q=0.9,en;q=0.8', 'en', 'a language we do not serve is skipped, the next one counts'],
  ['fr-FR,fr;q=0.9,de;q=0.8', 'he', 'nothing we serve: Hebrew'],
  ['de-DE,de;q=0.9', 'he', 'nothing we serve: Hebrew (a "he" must not be found inside another word)'],
  ['*', 'he', 'a wildcard alone: Hebrew'],
  ['*;q=0.5,en;q=0.3', 'en', 'a wildcard is not a language'],
  ['en;q=0,ru;q=0.1', 'ru', 'q=0 is "not acceptable"'],
  ['en;q=0', 'he', 'only a refused language: Hebrew'],
  ['iw-IL,iw;q=0.9,en;q=0.5', 'he', 'iw is the old code of Hebrew'],
  ['EN-us,RU;Q=0.5', 'en', 'case does not matter'],
  [' en-US , ru ; q=0.5 ', 'en', 'spaces around the entries'],
  ['en;q=abc,ru;q=0.5', 'ru', 'a weight that cannot be read drops its entry'],
  ['en;q=7,ru;q=0.5', 'ru', 'a weight above 1 is not a weight'],
  [',,,;;;,en', 'en', 'empty entries and stray separators'],
  ['zh-Hans-CN,zh;q=0.9,ru;q=0.5', 'ru', 'script and region subtags after the language'],
  ['hebrew', 'he', 'a word that is not a tag: nothing recognised, Hebrew'],
]
for (const [header, expected, why] of CASES) {
  test(`Accept-Language ${JSON.stringify(header)} → ${expected} (${why})`, () => {
    assert.equal(preferredLocale(header), expected)
  })
}

test('a header of thousands of entries is read in bounded time and the first entries decide', () => {
  const header = 'ru;q=0.5,' + Array.from({ length: 5000 }, (_, i) => `x${i};q=0.1`).join(',') + ',en;q=0.9'
  const t0 = Date.now()
  assert.equal(preferredLocale(header), 'ru') // the English entry lies beyond the entries that are read
  assert.ok(Date.now() - t0 < 200)
})

test('the fallback can be chosen', () => {
  assert.equal(preferredLocale('de', 'en'), 'en')
  assert.equal(preferredLocale('', 'ru'), 'ru')
})

test('where a bare path goes: "/" straight to "/<locale>", anything else prefixed, the query kept', () => {
  assert.equal(localePrefixedPath('en', '/'), '/en')
  assert.equal(localePrefixedPath('he', '/', '?a=1'), '/he?a=1')
  assert.equal(localePrefixedPath('ru', '/about'), '/ru/about')
  assert.equal(localePrefixedPath('en', '/sage/2', '?tab=table&x=y'), '/en/sage/2?tab=table&x=y')
  assert.equal(localePrefixedPath('he', '/sage/2/'), '/he/sage/2/')
})

// ---------------------------------------------------------------------------------------------
// the real middleware
// ---------------------------------------------------------------------------------------------
async function hit(url: string, acceptLanguage?: string) {
  const req = new NextRequest(url, { headers: acceptLanguage === undefined ? {} : { 'accept-language': acceptLanguage } })
  return middleware(req)
}
function target(res: Response): string | null {
  const loc = res.headers.get('location')
  return loc ? loc.replace('http://localhost:3000', '') : null
}

test('"/" is one redirect, straight to the language\'s home (no trailing slash), for four browsers', async () => {
  const cases: Array<[string | undefined, string]> = [
    [undefined, '/he'],
    ['en-US,en;q=0.9,he;q=0.8', '/en'],
    ['ru-RU,ru;q=0.9,en;q=0.5', '/ru'],
    ['he-IL,he;q=0.9,en;q=0.5', '/he'],
  ]
  for (const [header, expected] of cases) {
    const res = await hit('http://localhost:3000/', header)
    assert.equal(res.status, 307, `status for ${header}`)
    assert.equal(target(res), expected, `target for ${header}`)
  }
})

test('a bare path is prefixed with the language and keeps its query string', async () => {
  const res = await hit('http://localhost:3000/about?utm_source=x&a=b', 'en-US,en;q=0.9,he;q=0.8')
  assert.equal(res.status, 307)
  assert.equal(target(res), '/en/about?utm_source=x&a=b')
  const root = await hit('http://localhost:3000/?utm_source=youtube', 'ru')
  assert.equal(target(root), '/ru?utm_source=youtube')
})

test('an unknown first segment is prefixed (so /xx/sage/1 becomes the 404 of /he/xx/sage/1)', async () => {
  const res = await hit('http://localhost:3000/xx/sage/1')
  assert.equal(target(res), '/he/xx/sage/1')
})

test('assets, /api, /auth and /_next pass through untouched', async () => {
  for (const p of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/sw.js', '/icons/icon-192.png', '/api/chat', '/auth/callback?code=1', '/_next/static/x.js', '/favicon.ico']) {
    const res = await hit(`http://localhost:3000${p}`, 'en')
    assert.equal(res.headers.get('location'), null, `${p} must not redirect`)
    assert.equal(res.headers.get('x-middleware-next'), '1', `${p} must pass through`)
  }
})

test('middleware.ts sends a language-less address through lib/localeDetect and keeps the pass-throughs', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'middleware.ts'), 'utf8')
  assert.ok(src.includes("from '@/lib/localeDetect'"))
  assert.ok(!/\.includes\(locale\)/.test(src), 'the substring search for a language in the header is back')
  assert.ok(src.includes("isValidLocale(firstSegment)"), 'an address that already carries a language is not redirected')
})

;(async () => {
  for (const t of queue) await t()
  console.log(`\nTests: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
})()
