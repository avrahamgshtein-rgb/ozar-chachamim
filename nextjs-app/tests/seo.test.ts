/**
 * The site ready for Google Search Console and Bing: the ownership codes (lib/siteVerification.ts, both
 * layouts), the sitemap (every sage page once per language, the plain index, no noindex page, a date that does
 * not move on every request), the plain index of every sage (/<locale>/sages: one ordinary link to each sage
 * page), the JSON-LD links (`sameAs` only from the Wikipedia and Sefaria files), and that the canonical address
 * of the site is one variable (NEXT_PUBLIC_SITE_URL: no other file names a vercel.app address).
 *
 * Runs on the real corpus with no network and no server. With SEO_BASE_URL set (a running `npm run start`, say
 * SEO_BASE_URL=http://localhost:3126) it also reads the served pages: the head of a sample of sage pages in the
 * three languages (one title, a description in the page's language, canonical to itself, hreflang, one h1,
 * parsable JSON-LD, the metadata inside <head>). With SEO_BUILT=1 it checks the built home page against
 * the ownership codes in the environment of the build (run it in the same environment as `npm run build`).
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import * as ReactNS from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAllSages } from '../lib/serverData'
import { sefariaEntries, sefariaTopicUrl } from '../lib/sefaria'
import { wikiEntries, wikipediaUrl, wikisourceUrl } from '../lib/wikipedia'
import { sageSameAs } from '../lib/sageSameAs'
import { sageIndexGroups } from '../lib/sageIndex'
import { SAGE_INDEX_TEXT } from '../lib/sageIndexText'
import { BING_SITE_VERIFICATION, GOOGLE_SITE_VERIFICATION, verificationMetadata } from '../lib/siteVerification'
import { localeAlternates } from '../lib/siteMetadata'
import { SITE_URL } from '../lib/siteUrl'
import { ALL_PERIODS } from '../lib/types'
import type { Locale } from '../lib/types'
import sitemap from '../app/sitemap'
import robots from '../app/robots'
import { SageIndex } from '../components/sages/SageIndex'

// the component files are transformed with the classic JSX runtime here (Next uses the automatic one)
;(globalThis as { React?: unknown }).React = ReactNS

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
const read = (rel: string) => fs.readFileSync(path.join(app, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const sages = getAllSages()
const HEBREW = /[֐-׿]/

/** A script run in a fresh process whose environment is `env` (the constants read the environment when their module loads). */
function inFreshProcess(env: Record<string, string>, code: string): string {
  const clean = { ...process.env }
  delete clean.NEXT_PUBLIC_SITE_URL
  delete clean.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  delete clean.NEXT_PUBLIC_BING_SITE_VERIFICATION
  return execFileSync(process.execPath, ['--import', 'tsx', '-e', code], { cwd: app, env: { ...clean, ...env }, encoding: 'utf8' })
}

// ── ownership codes ─────────────────────────────────────────────────────────────

test('verificationMetadata: no tag for an empty code, one key per code that is set, blanks trimmed', () => {
  assert.equal(verificationMetadata('', ''), undefined)
  assert.equal(verificationMetadata('  ', '\n'), undefined)
  assert.deepEqual(verificationMetadata('g-code', ''), { google: 'g-code' })
  assert.deepEqual(verificationMetadata('', 'b-code'), { other: { 'msvalidate.01': 'b-code' } })
  assert.deepEqual(verificationMetadata(' g ', ' b '), { google: 'g', other: { 'msvalidate.01': 'b' } })
})

test('with nothing in the environment the codes are the two constants of lib/siteVerification.ts, and the tag is left out while both are empty', () => {
  const src = read('lib/siteVerification.ts')
  const google = (src.match(/const GOOGLE_CODE = '([^']*)'/) ?? [])[1]
  const bing = (src.match(/const BING_CODE = '([^']*)'/) ?? [])[1]
  assert.notEqual(google, undefined, 'GOOGLE_CODE constant')
  assert.notEqual(bing, undefined, 'BING_CODE constant')
  const out = JSON.parse(inFreshProcess({}, `const v = require('./lib/siteVerification.ts'); console.log(JSON.stringify([v.GOOGLE_SITE_VERIFICATION, v.BING_SITE_VERIFICATION, v.verificationMetadata() ?? null]))`))
  assert.equal(out[0], google.trim())
  assert.equal(out[1], bing.trim())
  assert.equal(out[2] === null, !google.trim() && !bing.trim())
})

test('the codes can come from the environment (NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION / NEXT_PUBLIC_BING_SITE_VERIFICATION)', () => {
  const out = inFreshProcess(
    { NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: 'env-google', NEXT_PUBLIC_BING_SITE_VERIFICATION: 'env-bing' },
    `const v = require('./lib/siteVerification.ts'); console.log(JSON.stringify([v.GOOGLE_SITE_VERIFICATION, v.BING_SITE_VERIFICATION, v.verificationMetadata()]))`,
  )
  assert.deepEqual(JSON.parse(out), ['env-google', 'env-bing', { google: 'env-google', other: { 'msvalidate.01': 'env-bing' } }])
  const unset = inFreshProcess({}, `console.log(JSON.stringify(require('./lib/siteVerification.ts').verificationMetadata() ?? null))`)
  assert.equal(JSON.parse(unset), null)
})

test('both layouts that define metadata add the verification only when there is a code', () => {
  for (const file of ['app/layout.tsx', 'app/[locale]/layout.tsx']) {
    const src = read(file)
    assert.match(src, /import \{ verificationMetadata \} from '@\/lib\/siteVerification'/, file)
    assert.match(src, /\.\.\.\(verification \? \{ verification \} : \{\}\)/, `${file} must leave the key out when empty`)
  }
})

if (process.env.SEO_BUILT === '1') {
  test('built home page: the ownership meta tags are there when the codes are set in the environment, and only then', () => {
    for (const loc of LOCALES) {
      const file = path.join(app, '.next', 'server', 'app', `${loc}.html`)
      assert.ok(fs.existsSync(file), `${file} (run npm run build first)`)
      const html = fs.readFileSync(file, 'utf8')
      const g = (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '').trim()
      const b = (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? '').trim()
      const head = html.slice(0, html.indexOf('</head>'))
      if (g) assert.ok(head.includes(`<meta name="google-site-verification" content="${g}"/>`), `${loc}: google tag in the head`)
      else assert.ok(!html.includes('google-site-verification'), `${loc}: no google tag without a code`)
      if (b) assert.ok(head.includes(`<meta name="msvalidate.01" content="${b}"/>`), `${loc}: bing tag in the head`)
      else assert.ok(!html.includes('msvalidate.01'), `${loc}: no bing tag without a code`)
    }
  })
} else skipped++

// ── the sitemap ─────────────────────────────────────────────────────────────────

test('the sitemap holds every sage page once in each language, and the plain index in each language', () => {
  const urls = sitemap().map(e => e.url)
  assert.equal(new Set(urls).size, urls.length, 'no URL twice')
  for (const l of LOCALES) {
    for (const s of sages) assert.ok(urls.includes(`${SITE_URL}/${l}/sage/${s.id}`), `${l} sage ${s.id}`)
    assert.ok(urls.includes(`${SITE_URL}/${l}/sages`), `${l} /sages`)
  }
  assert.equal(urls.filter(u => /\/sage\//.test(u)).length, sages.length * 3)
  for (const u of urls) assert.ok(u.startsWith(`${SITE_URL}/`), u)
})

test('no page that is noindex is in the sitemap (tower sage and path pages, the kids pages of the other languages)', () => {
  const urls = sitemap().map(e => e.url.slice(SITE_URL.length))
  assert.ok(!urls.some(u => /^\/(?:he|en|ru)\/tower\/./.test(u)), 'tower/<id> and tower/path/... are noindex')
  assert.ok(!urls.includes('/en/kids') && !urls.includes('/ru/kids'), 'the English and Russian kids pages are noindex')
  assert.ok(urls.includes('/he/kids'))
  // every page file that says index: false names a route; none of those routes may be a sitemap URL
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : /^page\.tsx$/.test(d.name) ? [path.join(dir, d.name)] : [])
  const noindexRoutes = walk(path.join(app, 'app'))
    .filter(f => /index:\s*false/.test(fs.readFileSync(f, 'utf8')))
    .map(f => path.relative(path.join(app, 'app'), path.dirname(f)).replace(/\\/g, '/'))
  assert.ok(noindexRoutes.length >= 2, `found ${noindexRoutes.join(', ')}`)
  for (const route of noindexRoutes) {
    // [locale]/tower/[id] → /xx/tower/<something>; the kids page is noindex only for en and ru, in code
    const stem = route.replace('[locale]/', '').split('/[')[0]
    if (stem === 'kids') continue
    assert.ok(!urls.some(u => u.replace(/^\/(?:he|en|ru)/, '').startsWith(`/${stem}/`)), `${route} is noindex but the sitemap lists a page under /${stem}/`)
  }
})

test('the sitemap date is one value of the build, the same on every call, not "now"; pages of the calendar carry none', async () => {
  const first = sitemap()
  await new Promise(r => setTimeout(r, 25))
  const second = sitemap()
  const stamps = new Set<number>()
  for (let i = 0; i < first.length; i++) {
    const a = first[i].lastModified, b = second[i].lastModified
    assert.equal(a === undefined, b === undefined)
    if (a !== undefined) { assert.equal(new Date(a).getTime(), new Date(b!).getTime(), first[i].url); stamps.add(new Date(a).getTime()) }
  }
  assert.equal(stamps.size, 1, 'one build date for all')
  const daily = first.filter(e => /\/(today|riddle|connect)$/.test(e.url))
  assert.equal(daily.length, 9)
  for (const e of daily) { assert.equal(e.lastModified, undefined, e.url); assert.equal(e.changeFrequency, 'daily') }
  assert.ok(first.filter(e => /\/sage\//.test(e.url)).every(e => e.lastModified !== undefined))
})

test('every sitemap entry but the Hebrew-only kids page carries the hreflang alternates of its siblings', () => {
  for (const e of sitemap()) {
    if (e.url.endsWith('/he/kids')) { assert.equal(e.alternates, undefined); continue }
    const path = e.url.slice(SITE_URL.length).replace(/^\/(?:he|en|ru)/, '')
    assert.deepEqual(e.alternates?.languages, localeAlternates(path), e.url)
  }
})

test('robots.txt points at the sitemap of this site and keeps /api/ and /auth/ out', () => {
  const r = robots()
  assert.equal(r.sitemap, `${SITE_URL}/sitemap.xml`)
  const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules
  assert.equal(rule.allow, '/')
  assert.ok((rule.disallow as string[]).includes('/api/') && (rule.disallow as string[]).includes('/auth/'))
})

// ── the plain index of every sage ────────────────────────────────────────────────

test('the sage index lists every sage exactly once under his era, eras in the order of the generations, names in the page language', () => {
  for (const l of LOCALES) {
    const groups = sageIndexGroups(l)
    const ids = groups.flatMap(g => g.entries.map(e => e.id))
    assert.equal(ids.length, sages.length, l)
    assert.equal(new Set(ids).size, ids.length, `${l}: no sage twice`)
    for (const s of sages) assert.ok(ids.includes(s.id), `${l}: sage ${s.id}`)
    const order = groups.map(g => ALL_PERIODS.indexOf(g.period))
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `${l}: eras in order`)
    for (const g of groups) {
      assert.ok(g.entries.length > 0 && g.label)
      for (const e of g.entries) {
        assert.ok(e.name.trim(), `${l}: sage ${e.id} has a name`)
        if (l !== 'he') assert.ok(!HEBREW.test(e.name), `${l}: sage ${e.id} "${e.name}" is not in the page language`)
      }
    }
  }
})

test('the sage index page: one h1, an h2 per era, one plain link per sage to his page in the same language, no script', () => {
  for (const l of LOCALES) {
    const groups = sageIndexGroups(l)
    const html = renderToStaticMarkup(ReactNS.createElement(SageIndex, { locale: l, groups }))
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1)
    assert.equal((html.match(/<h2[\s>]/g) ?? []).length, groups.length)
    const hrefs = [...html.matchAll(/<a href="(\/(?:he|en|ru)\/sage\/\d+)"/g)].map(m => m[1])
    assert.equal(hrefs.length, sages.length, l)
    assert.equal(new Set(hrefs).size, sages.length)
    for (const s of sages) assert.ok(hrefs.includes(`/${l}/sage/${s.id}`), `${l}: link to ${s.id}`)
    assert.ok(!/<script|onClick|<button/.test(html))
    for (const g of groups) assert.ok(html.includes(`href="#${g.period}"`) && html.includes(`id="${g.period}"`), `${l}: jump link to ${g.period}`)
    // light: the markup of the whole list stays small (the page ships it twice, as HTML and as data)
    assert.ok(html.length < 140_000, `${l}: ${html.length} bytes`)
  }
})

test('the sage index page is in three languages, has its own title and description, and is linked from the top bar of the site\'s pages', () => {
  for (const l of LOCALES) {
    const t = SAGE_INDEX_TEXT[l]
    assert.ok(t.title && t.heading && t.erasNav && t.openApp)
    assert.ok(t.description(sages.length).length <= 160, `${l}: description ${t.description(sages.length).length} chars`)
    assert.ok(t.description(sages.length).includes(String(sages.length)))
    assert.ok(t.lede(sages.length).includes(String(sages.length)))
    assert.ok(!/"/.test(t.title + t.heading + t.lede(1) + t.description(1) + t.openApp), 'no straight quote (Hebrew gershayim are ״)')
  }
  assert.ok(HEBREW.test(SAGE_INDEX_TEXT.he.heading) && !HEBREW.test(SAGE_INDEX_TEXT.en.heading + SAGE_INDEX_TEXT.ru.heading))
  const page = read('app/[locale]/sages/page.tsx')
  assert.match(page, /pageMetadata\(\{ locale, path: '\/sages'/)
  assert.match(page, /<SiteTopBar locale=\{locale\} path="\/sages" \/>/)
  assert.match(page, /if \(!isValidLocale\(locale\)\) notFound\(\)/)
  assert.doesNotMatch(page, /index:\s*false|noindex/)
  // every page carries a plain link to the list (a skip link, shown on focus), so the home page and every sage page reach it in one step
  const layout = read('app/[locale]/layout.tsx')
  assert.match(layout, /<a href=\{`\/\$\{validLocale\}\/sages`\} className="skip-link">\{SAGE_INDEX_TEXT\[validLocale\]\.skip\}<\/a>/)
  for (const l of LOCALES) assert.ok(SAGE_INDEX_TEXT[l].skip.trim())
  const bar = read('components/layout/SiteTopBar.tsx')
  assert.match(bar, /href=\{`\/\$\{locale\}\/sages`\}/)
  assert.doesNotMatch(bar, /<Link[^>]*sages/, 'a plain <a>, so nothing prefetches the 500 links')
})

// ── JSON-LD: sameAs from the existing Wikipedia and Sefaria files only ────────────────

test('sameAs holds only addresses the site already has: its Wikipedia, Wikisource and Sefaria entries and the podcast episode', () => {
  const allowed = new Set<string>()
  for (const [, w] of wikiEntries()) {
    if (w.he) allowed.add(wikipediaUrl('he', w.he))
    if (w.en) allowed.add(wikipediaUrl('en', w.en))
    if (w.wikisource) allowed.add(wikisourceUrl(w.wikisource))
  }
  for (const [, s] of sefariaEntries()) {
    allowed.add(sefariaTopicUrl(s.slug))
    if (s.wiki?.he) allowed.add(wikipediaUrl('he', s.wiki.he))
    if (s.wiki?.en) allowed.add(wikipediaUrl('en', s.wiki.en))
  }
  let withWiki = 0, withSefaria = 0
  for (const s of sages) {
    const urls = sageSameAs(s.id, s.spotify_url)
    assert.equal(new Set(urls).size, urls.length, `${s.id}: no address twice`)
    for (const u of urls) {
      const episode = u === s.spotify_url && /^https:\/\/open\.spotify\.com\/episode\//.test(u)
      assert.ok(allowed.has(u) || episode, `${s.id}: ${u} is not from the data files`)
      assert.ok(!/search\?|index\.php\?search|spotifycreators/.test(u), `${s.id}: ${u} is a search or a short link`)
    }
    if (urls.some(u => /wikipedia\.org/.test(u))) withWiki++
    if (urls.some(u => /sefaria\.org\/topics/.test(u))) withSefaria++
  }
  assert.ok(withWiki > 300 && withSefaria > 150, `wikipedia ${withWiki}, sefaria ${withSefaria}`)
  // a sage the files know carries the links; one they do not has none of them
  const known = sages.find(s => wikiEntries().some(([id, w]) => id === s.id && w.he && w.en))!
  assert.ok(sageSameAs(known.id).some(u => u.startsWith('https://he.wikipedia.org/')) && sageSameAs(known.id).some(u => u.startsWith('https://en.wikipedia.org/')))
  const unknown = sages.find(s => !wikiEntries().some(([id]) => id === s.id) && !sefariaEntries().some(([id]) => id === s.id))!
  assert.deepEqual(sageSameAs(unknown.id), [])
  // the six sages whose episode link is a spotifycreators short link keep no sameAs for it
  const shortLinked = sages.filter(s => /spotifycreators/.test(s.spotify_url ?? ''))
  assert.ok(shortLinked.length > 0)
  for (const s of shortLinked) assert.ok(!sageSameAs(s.id, s.spotify_url).some(u => /spotify/.test(u)))
})

test('the sage page puts sameAs and the place and field in the page language into its JSON-LD, and its metadata is complete', () => {
  const page = read('app/[locale]/sage/[id]/page.tsx')
  assert.match(page, /sageSameAs\(raw\.id, sage\.spotify_url\)/)
  assert.match(page, /workLocation: sage\.location \? \{ '@type': 'Place', name: shownLocation\(sage\) \}/)
  assert.match(page, /knowsAbout: shownField\(sage\)/)
  // canonical to itself, the three languages and x-default, the site name in the Open Graph block
  assert.match(page, /canonical: `\/\$\{loc\}\/sage\/\$\{id\}`/)
  for (const k of ["he: `/he/sage/${id}`", "en: `/en/sage/${id}`", "ru: `/ru/sage/${id}`", "'x-default': `/he/sage/${id}`"]) assert.ok(page.includes(k), k)
  assert.match(page, /siteName: UI\[loc\]\.appTitle/)
})

// ── the address of the site is one variable ──────────────────────────────────────────

test('no file of the app names a vercel.app address except lib/siteUrl.ts (moving to a domain is NEXT_PUBLIC_SITE_URL)', () => {
  const hits: string[] = []
  const skipAnywhere = new Set(['node_modules', '.next', 'tests'])
  // generated data and media under public/ hold no address of the site's own
  const skipInPublic = new Set(['research', 'quiz', 'portraits', 'kids', 'audio', 'images', 'icons', 'i18n'])
  const walk = (dir: string, inPublic: boolean) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name)
      if (d.isDirectory()) { if (!skipAnywhere.has(d.name) && !(inPublic && skipInPublic.has(d.name))) walk(p, inPublic); continue }
      if (!/\.(tsx?|mjs|js|json|html|webmanifest|css)$/.test(d.name)) continue
      if (inPublic && /^data.*\.json$/.test(d.name)) continue
      if (fs.readFileSync(p, 'utf8').includes('vercel.app')) hits.push(path.relative(app, p))
    }
  }
  for (const top of ['app', 'components', 'lib', 'store', 'public', 'assets']) walk(path.join(app, top), top === 'public')
  for (const f of ['middleware.ts', 'next.config.ts', 'vercel.json', 'package.json']) if (fs.readFileSync(path.join(app, f), 'utf8').includes('vercel.app')) hits.push(f)
  assert.deepEqual(hits, ['lib/siteUrl.ts'])
})

test('with NEXT_PUBLIC_SITE_URL set, the sitemap, robots.txt and the hreflang map use that address and no other', () => {
  const out = inFreshProcess(
    { NEXT_PUBLIC_SITE_URL: 'https://example.org/' },
    `const s = require('./app/sitemap.ts').default(); const r = require('./app/robots.ts').default(); const m = require('./lib/siteMetadata.ts'); const u = require('./lib/siteUrl.ts');
     console.log(JSON.stringify({ urls: s.map(e => e.url), alts: s.flatMap(e => Object.values(e.alternates?.languages ?? {})), robots: r.sitemap, hreflang: m.localeAlternates('/about'), site: u.SITE_URL, abs: u.absoluteUrl('/x') }))`,
  )
  const o = JSON.parse(out)
  assert.equal(o.site, 'https://example.org')
  assert.ok(o.urls.length > 1500 && o.urls.every((u: string) => u.startsWith('https://example.org/')))
  assert.ok(o.alts.every((u: string) => u.startsWith('https://example.org/')))
  assert.equal(o.robots, 'https://example.org/sitemap.xml')
  assert.equal(o.hreflang['x-default'], 'https://example.org/he/about')
  assert.equal(o.abs, 'https://example.org/x')
  assert.ok(!out.includes('vercel.app'))
})

// ── the served pages (opt-in: SEO_BASE_URL=http://localhost:3126 against `npm run start`) ──────────────

const BASE = (process.env.SEO_BASE_URL ?? '').replace(/\/$/, '')
if (BASE) {
  const dec = (s: string) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const attr = (tag: string, name: string) => dec((tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i')) ?? [])[1] ?? '')
  const woman = sages.find(s => (s.tags ?? []).includes('נשים'))!
  const undated = sages.find(s => s.birth_year == null && s.death_year == null)!
  const sample = [...new Set([sages[0], sages[Math.floor(sages.length / 3)], sages[Math.floor(sages.length / 2)], sages[sages.length - 1], woman, undated].map(s => s.id))]
  for (const l of LOCALES) {
    for (const id of sample) {
      test(`served /${l}/sage/${id}: the head, the h1 and the JSON-LD`, async () => {
        const html = await (await fetch(`${BASE}/${l}/sage/${id}`)).text()
        const head = html.slice(0, html.indexOf('</head>'))
        assert.equal((html.match(/<title>/g) ?? []).length, 1, 'one title')
        assert.ok(head.includes('<title>'), 'the title is inside <head>')
        const desc = attr((html.match(/<meta name="description"[^>]*>/) ?? [''])[0], 'content')
        assert.ok(desc.length > 20 && desc.length <= 160, `description ${desc.length}`)
        if (l !== 'he') assert.ok(!HEBREW.test(desc), 'description in the page language')
        const canonical = attr((head.match(/<link rel="canonical"[^>]*>/) ?? [''])[0], 'href')
        assert.equal(canonical, `${SITE_URL}/${l}/sage/${id}`)
        const alts = [...head.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map(m => `${m[1]} ${m[2]}`).sort()
        assert.deepEqual(alts, [`en ${SITE_URL}/en/sage/${id}`, `he ${SITE_URL}/he/sage/${id}`, `ru ${SITE_URL}/ru/sage/${id}`, `x-default ${SITE_URL}/he/sage/${id}`].sort())
        assert.match(html, new RegExp(`<html[^>]*lang="${l}"[^>]*dir="${l === 'he' ? 'rtl' : 'ltr'}"`))
        assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, 'one h1')
        assert.ok(/property="og:image" content="[^"]+"/.test(html))
        const ld = JSON.parse((html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) ?? [])[1].replace(/\\u003c/g, '<'))
        const person = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'Person')
        assert.equal(person.url, `${SITE_URL}/${l}/sage/${id}`)
        assert.deepEqual((person.sameAs ?? []).filter((u: string) => !/open\.spotify\.com/.test(u)), sageSameAs(id).filter(u => !/open\.spotify\.com/.test(u)))
        if (l !== 'he') assert.ok(!HEBREW.test(JSON.stringify([person.workLocation, person.knowsAbout])), 'place and field in the page language')
      })
    }
  }
} else skipped++

;(async () => {
  for (const run of queue) await run()
  console.log(`\n${passed} passed, ${failed} failed${skipped ? ` (${skipped} opt-in group${skipped > 1 ? 's' : ''} skipped: SEO_BASE_URL, SEO_BUILT)` : ''}`)
  if (failed > 0) process.exit(1)
})()
