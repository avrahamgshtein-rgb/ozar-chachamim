/**
 * The small places a portrait shows: the featured card of the Today page (components/today/TodayPortrait.tsx, used by
 * app/[locale]/today/page.tsx) and the result rows of the search box (components/ui/SearchBar.tsx, which gets the
 * lookup through components/ui/usePortraitLookup.ts). Sages are picked from the data at run time (the first
 * illustration, the first photograph, the first roster sage without a portrait), never by id.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as ReactNS from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAllSages } from '../lib/serverData'
import { portraitAlt, portraitCredit, portraitEntries, portraitEpisodeHref, portraitOf, PORTRAIT_CREDIT, type PortraitKind } from '../lib/portraits'
import type { Locale } from '../lib/types'
import { TodayFeaturedHead, TodayPortrait } from '../components/today/TodayPortrait'
import { loadPortraits, searchThumb, usePortraitLookup } from '../components/ui/usePortraitLookup'
import { SearchPortraitThumb } from '../components/ui/SearchBar'

// the component files are transformed with the classic JSX runtime here (Next uses the automatic one)
;(globalThis as { React?: unknown }).React = ReactNS

let passed = 0
let failed = 0
const pending: Promise<void>[] = []

function test(name: string, fn: () => void | Promise<void>) {
  const done = (e?: unknown) => {
    if (e === undefined) { console.log(`  ok  ${name}`); passed++ } else {
      console.log(`  FAIL ${name}`)
      console.log(`       ${(e as Error).message}`)
      failed++
    }
  }
  try {
    const r = fn()
    if (r && typeof (r as Promise<void>).then === 'function') pending.push((r as Promise<void>).then(() => done(), done))
    else done()
  } catch (e) { done(e) }
}

const read = (rel: string) => readFileSync(path.join(__dirname, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const sages = getAllSages()
const entries = portraitEntries()

// a sage with an illustration, one with a photograph (when the data holds one), one without a portrait
const firstOf = (kind: PortraitKind) => entries.find(([, e]) => e.kind === kind)?.[0]
const illustrationId = firstOf('illustration')
const photoId = firstOf('photo')
const noneId = sages.find(s => !portraitOf(s.id))?.id
const withPortrait: Array<[PortraitKind, string]> = []
if (illustrationId) withPortrait.push(['illustration', illustrationId])
if (photoId) withPortrait.push(['photo', photoId])

const attr = (html: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(html)?.[1]
const unescape = (s: string | undefined) => (s ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
const ACCENT = '#c9973a'
const portraitHtml = (id: string, loc: Locale, name = 'Name') =>
  renderToStaticMarkup(ReactNS.createElement(TodayPortrait, { id, name, locale: loc, accent: ACCENT }))
const headHtml = (id: string, loc: Locale, body: ReactNS.ReactNode) =>
  renderToStaticMarkup(ReactNS.createElement(TodayFeaturedHead, { id, name: 'Name', locale: loc, accent: ACCENT, children: body }))
const thumbHtml = (id: string, thumb: NonNullable<ReturnType<typeof searchThumb>>) =>
  renderToStaticMarkup(ReactNS.createElement(SearchPortraitThumb, { id, thumb, color: ACCENT }))

let moduleOnce: ReturnType<typeof loadPortraits> | null = null
const pendingModule = () => (moduleOnce ??= loadPortraits())

test('the data holds an illustration and a sage without a portrait to test against', () => {
  assert.ok(illustrationId, 'no illustration in public/data-portraits.json')
  assert.ok(noneId, 'every roster sage has a portrait: the no-portrait case cannot be shown')
  if (!photoId) console.log('       (no photograph in the data: the photo wording is tested through the lookup stub below)')
})

// ---------- the Today card ----------

test('the Today portrait: the picture, its alt, size and markers, and the caption link to the episode', () => {
  for (const [kind, id] of withPortrait) {
    const portrait = portraitOf(id)!
    assert.equal(portrait.kind, kind)
    for (const loc of LOCALES) {
      const html = portraitHtml(id, loc)
      assert.match(html, /^<figure /)
      assert.equal(attr(html, 'src'), portrait.src)
      assert.equal(unescape(attr(html, 'alt')), portraitAlt('Name', loc, portrait))
      assert.equal(attr(html, 'width'), '120')
      assert.equal(attr(html, 'height'), '120')
      assert.equal(attr(html, 'loading'), 'lazy')
      assert.equal(attr(html, 'decoding'), 'async')
      assert.equal(attr(html, 'data-portrait'), id)
      assert.equal(attr(html, 'data-portrait-kind'), kind)
      assert.doesNotMatch(html, /next\/image|_next\/image/)
      // the caption is a link to the episode section of his own page, in the page's language
      const link = /<a [^>]*data-portrait-credit[^>]*>([^<]*)<\/a>/.exec(html)
      assert.ok(link, `no caption link in ${loc}`)
      assert.equal(link[1], portraitCredit(portrait, loc))
      assert.equal(attr(link[0], 'href'), portraitEpisodeHref(id, loc))
      assert.match(attr(link[0], 'href')!, new RegExp(`^/${loc}/sage/${id}#listen$`))
    }
  }
})

test('the Today caption follows the portrait kind and is never the other kind (a photograph is not an illustration)', () => {
  for (const [kind, id] of withPortrait) {
    const other: PortraitKind = kind === 'illustration' ? 'photo' : 'illustration'
    for (const loc of LOCALES) {
      const html = portraitHtml(id, loc)
      assert.ok(html.includes(`>${PORTRAIT_CREDIT[kind][loc]}</a>`))
      assert.ok(!html.includes(PORTRAIT_CREDIT[other][loc]), `${kind} under the ${other} caption in ${loc}`)
      assert.equal(unescape(attr(html, 'alt')).split(':')[0], portraitAlt('x', loc, { kind }).split(':')[0])
      assert.notEqual(portraitAlt('x', loc, { kind }), portraitAlt('x', loc, { kind: other }))
    }
  }
})

test('the Today portrait for a sage without one is nothing at all', () => {
  for (const loc of LOCALES) {
    assert.equal(portraitHtml(noneId!, loc), '')
  }
})

test('the Today card head: without a portrait it is exactly its children, with one the picture sits beside them', () => {
  const body = ReactNS.createElement('p', { 'data-test-body': true }, 'the name block')
  const bare = renderToStaticMarkup(body)
  for (const loc of LOCALES) {
    // no wrapper, no gap, byte for byte
    assert.equal(headHtml(noneId!, loc, body), bare)
    for (const [, id] of withPortrait) {
      const html = headHtml(id, loc, body)
      assert.ok(html.includes(bare), 'the name block is kept')
      assert.ok(html.includes(`data-portrait="${id}"`))
      assert.ok(html.indexOf(bare) < html.indexOf('<figure'), 'the picture follows the name block: at the end of the line, in either direction')
      assert.match(html, /^<div class="flex items-start /)
    }
  }
})

test('the Today portrait uses logical utilities only, plain img and the ink and gold tokens', () => {
  const src = read('../components/today/TodayPortrait.tsx')
  assert.doesNotMatch(src, /\b(?:left|right|ml|mr|pl|pr|text-left|text-right)-/)
  assert.doesNotMatch(src, /from 'next\/image'/)
  assert.match(src, /import \{[^}]*portraitCredit[^}]*\} from '@\/lib\/portraits'/)
  assert.match(src, /portraitAlt\(name, locale, portrait\)/)
  assert.match(src, /portraitCredit\(portrait, locale\)/)
  assert.match(src, /portraitEpisodeHref\(id, locale\)/)
  // never a literal caption or a hand-picked row of the caption table
  assert.doesNotMatch(src, /PORTRAIT_CREDIT\./)
  assert.doesNotMatch(src, /איור|תמונה|Illustration|Picture|Иллюстрация|Изображение/)
  assert.doesNotMatch(src, /loading="eager"/)
  assert.doesNotMatch(src, /'use client'/)
})

test('the Today page uses the head once, for the featured sage, and leaves the story and the video alone', () => {
  const page = read('../app/[locale]/today/page.tsx')
  assert.equal((page.match(/<TodayFeaturedHead\b/g) ?? []).length, 1)
  assert.match(page, /<TodayFeaturedHead id=\{t\.featured\.id\} name=\{name\} locale=\{loc\} accent=\{card\.accent\}>/)
  assert.match(page, /import \{ TodayFeaturedHead \} from '@\/components\/today\/TodayPortrait'/)
  // the hillula and the coming lists are not given a picture
  assert.doesNotMatch(page, /<TodayPortrait\b/)
  // the head wraps the pill, the name and the years, and the name block still carries its id for aria-labelledby
  const section = page.slice(page.indexOf('<TodayFeaturedHead'), page.indexOf('</TodayFeaturedHead>'))
  assert.match(section, /id="today-featured"/)
  assert.match(section, /<EraChip /)
  // the status image and the video are not part of this change
  for (const f of ['../components/today/TodayVideo.tsx', '../lib/todayVideo.ts']) assert.doesNotMatch(read(f), /portrait/i)
})

// ---------- the search box ----------

test('SearchBar has no static import of lib/portraits; the lookup is loaded on demand by the hook', () => {
  const bar = read('../components/ui/SearchBar.tsx')
  assert.doesNotMatch(bar, /from ['"][^'"]*lib\/portraits['"]/)
  assert.doesNotMatch(bar, /import\(['"][^'"]*portraits['"]\)/)
  assert.doesNotMatch(bar, /from ['"][^'"]*data-portraits/)
  assert.match(bar, /from '\.\/usePortraitLookup'/)
  assert.match(bar, /usePortraitLookup\(showDropdown && sageHits\.length > 0\)/)
  const hook = read('../components/ui/usePortraitLookup.ts')
  assert.match(hook, /import\('@\/lib\/portraits'\)/)
  // nothing but types from lib/portraits is imported statically
  assert.doesNotMatch(hook, /^import (?!type\b)[^\n]*['"][^'"]*lib\/portraits['"]/m)
  assert.doesNotMatch(hook, /from ['"][^'"]*data-portraits/)
  // nothing is requested until the list of sages is shown
  assert.match(hook, /if \(!enabled \|\| mod\) return/)
})

test('SearchBar rows: the small picture in place of the era dot, the dot kept for a sage without one, the rest untouched', () => {
  const bar = read('../components/ui/SearchBar.tsx')
  assert.match(bar, /const thumb = searchThumb\(portraits, sage\.id, locale\)/)
  assert.match(bar, /<SearchPortraitThumb id=\{sage\.id\} thumb=\{thumb\}/)
  assert.match(bar, /<span className="era-dot" style=\{\{ background: eraColor \}\} aria-hidden \/>/)
  const thumb = bar.slice(bar.indexOf('export function SearchPortraitThumb'), bar.indexOf('export function SearchBar'))
  assert.match(thumb, /loading="lazy"/)
  assert.match(thumb, /decoding="async"/)
  assert.match(thumb, /data-portrait=\{id\}/)
  assert.match(thumb, /data-portrait-kind=\{thumb\.kind\}/)
  assert.match(thumb, /title=\{thumb\.title\}/)
  assert.match(thumb, /alt=""/)
  assert.doesNotMatch(thumb, /alt=\{/)
  assert.doesNotMatch(thumb, /loading="eager"|next\/image/)
  // the keyboard handling, the assistant's row and the overlay are as they were
  for (const kept of ['ArrowDown', "e.key === 'Enter'", "kind: 'ask'", 'askQuestion(text)', 'toggleSearch()', 'aria-activedescendant']) {
    assert.ok(bar.includes(kept), `lost: ${kept}`)
  }
})

test('the result thumbnail: srcSm, 36 px, lazy, caption as title, decorative (alt empty: the name is beside it), markers', () => {
  const mod = pendingModule()
  return mod.then(m => {
    for (const [kind, id] of withPortrait) {
      for (const loc of LOCALES) {
        const portrait = m.portraitOf(id)!
        const thumb = searchThumb(m, id, loc)!
        assert.ok(thumb)
        assert.equal(thumb.src, portrait.srcSm)
        assert.equal(thumb.title, portraitCredit(portrait, loc))
        assert.ok(!('alt' in thumb), 'the thumbnail carries no alt text of its own')
        assert.equal(thumb.kind, kind)
        const html = thumbHtml(id, thumb)
        assert.match(html, /^<img /)
        assert.equal(attr(html, 'src'), portrait.srcSm)
        assert.equal(unescape(attr(html, 'title')), PORTRAIT_CREDIT[kind][loc])
        assert.equal(attr(html, 'alt'), '', 'decorative: the row already reads the name')
        assert.equal(attr(html, 'width'), '36')
        assert.equal(attr(html, 'height'), '36')
        assert.equal(attr(html, 'loading'), 'lazy')
        assert.equal(attr(html, 'data-portrait'), id)
        assert.equal(attr(html, 'data-portrait-kind'), kind)
        assert.ok(!html.includes('.webp"') || html.includes('.sm.webp"'), 'the large file in a 36 px thumbnail')
      }
    }
    // the photograph wording too, when the data has no photograph: through a stub entry, never by swapping rows
    const stub = { ...m, portraitOf: () => ({ src: '/portraits/x.webp', srcSm: '/portraits/x.sm.webp', episode: 'e', kind: 'photo' as const }) }
    for (const loc of LOCALES) {
      const t = searchThumb(stub, 'x', loc)!
      assert.equal(t.title, PORTRAIT_CREDIT.photo[loc])
      assert.equal(t.kind, 'photo')
    }
  })
})

test('a sage without a portrait, or a lookup not yet loaded, gets no thumbnail (the row keeps its era dot)', () => {
  return pendingModule().then(m => {
    for (const loc of LOCALES) {
      assert.equal(searchThumb(m, noneId!, loc), null)
      assert.equal(searchThumb(null, illustrationId!, loc), null)
    }
  })
})

test('the hook is exported and the lookup loads lazily, once, and resolves portraitOf', async () => {
  assert.equal(typeof usePortraitLookup, 'function')
  assert.equal(typeof loadPortraits, 'function')
  const first = loadPortraits()
  assert.equal(loadPortraits(), first, 'one load for every caller')
  const m = await first
  assert.equal(typeof m.portraitOf, 'function')
  assert.deepEqual(m.portraitOf(illustrationId!), portraitOf(illustrationId!))
  assert.equal(m.portraitOf(noneId!), null)
  // on the server (and in the first render) the lookup has not arrived: null, enabled or not
  const Probe = ({ enabled }: { enabled: boolean }) => ReactNS.createElement(ReactNS.Fragment, null, String(usePortraitLookup(enabled)))
  assert.equal(renderToStaticMarkup(ReactNS.createElement(Probe, { enabled: false })), 'null')
  assert.equal(renderToStaticMarkup(ReactNS.createElement(Probe, { enabled: true })), 'null')
})

Promise.all(pending).then(() => {
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
})
