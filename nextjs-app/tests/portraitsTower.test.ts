/**
 * Portraits in the tower's two panels: the chosen sage's panel (components/tower/TowerScene.tsx, `PanelName`) and
 * the station card of a path flown in the tower (components/connect/FlightPanel.tsx). Each shows the sage's portrait
 * at 56 px (the small file) beside his name, with the episode credit as its title, and shows nothing when he has
 * none: no wrapper, no gap, the markup the panel always had. The flight panel is rendered over flights built
 * from the real graph; the scene needs WebGL, so its panel is rendered through the exported name block and checked
 * by its source. No test names a sage id: sages are picked from `portraitEntries()` at run time, by kind.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as ReactNS from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAllSages } from '../lib/serverData'
import { towerData } from '../lib/towerServer'
import { connectNet, connectPathFor } from '../lib/connectServer'
import { buildFlight, type ConnectFlight } from '../lib/connectFlight'
import { portraitAlt, portraitCredit, portraitEntries, portraitOf, type PortraitKind } from '../lib/portraits'
import type { Locale } from '../lib/types'
import { FlightPanel } from '../components/connect/FlightPanel'
import { PanelName } from '../components/tower/TowerScene'

// the component files are transformed with the classic JSX runtime here (Next uses the automatic one)
;(globalThis as { React?: unknown }).React = ReactNS

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok  ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL ${name}`)
    console.log(`       ${(e as Error).message}`)
    failed++
  }
}

const src = (rel: string) => readFileSync(path.join(__dirname, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']

// The captions the owner gave, written out here so that a swapped pair in lib/portraits.ts is caught.
const CREDIT: Record<PortraitKind, Record<Locale, string>> = {
  illustration: { he: 'איור מתוך פרק הפודקאסט', en: 'Illustration from the podcast episode', ru: 'Иллюстрация из выпуска подкаста' },
  photo: { he: 'תמונה מתוך פרק הפודקאסט', en: 'Picture from the podcast episode', ru: 'Изображение из выпуска подкаста' },
}
const ALT_WORD: Record<PortraitKind, Record<Locale, string>> = {
  illustration: { he: 'איור', en: 'Illustration', ru: 'Иллюстрация' },
  photo: { he: 'תמונה', en: 'Picture', ru: 'Изображение' },
}

/** React writes an attribute value with these characters escaped. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const sages = getAllSages()
const entries = portraitEntries()
const withPortrait = new Set(entries.map(([id]) => id))
const idsOfKind = (kind: PortraitKind) => entries.filter(([, e]) => e.kind === kind).map(([id]) => id)
const without = sages.map(s => s.id).filter(id => !withPortrait.has(id))
const KINDS: PortraitKind[] = ['illustration', 'photo']

// only sages with a recorded link are in the graph (connect.ts); the others cannot be on a real path
const linked = new Set(connectNet('he').sages.map(s => s[0]))
const withoutLinked = without.filter(id => linked.has(id))

/** A path of the real graph, in `locale`, between `from` and the first of `to` that the graph connects to him. */
function pathFrom(from: string, to: string[], locale: Locale) {
  for (const t of to) {
    const views = connectPathFor(locale, from, t)
    if (views && views.length >= 2) return views
  }
  return null
}

/** Two sages joined by hand, for a kind whose sages have no path to anyone without a portrait (the panel only tells what it is given). */
const byHand = (a: string, b: string, locale: Locale) =>
  buildFlight(towerData(locale), locale, [{ id: a, caption: null, dotted: false }, { id: b, caption: '[caption]', dotted: false }])

/** A flight of the real graph that starts at a sage with a portrait of this kind and ends at one without. */
function flightFromPortrait(kind: PortraitKind, locale: Locale): ConnectFlight | null {
  const ids = idsOfKind(kind)
  for (const id of ids.filter(i => linked.has(i))) {
    const views = pathFrom(id, withoutLinked, locale)
    const flight = views && buildFlight(towerData(locale), locale, views)
    if (flight) return flight
  }
  return byHand(ids[0], without[0], locale)
}

/** A flight that starts at a sage without a portrait and arrives at one with a portrait of this kind. */
function flightToPortrait(kind: PortraitKind, locale: Locale): ConnectFlight | null {
  const ids = idsOfKind(kind)
  for (const id of ids.filter(i => linked.has(i))) {
    for (const from of withoutLinked) {
      const views = connectPathFor(locale, from, id)
      const flight = views && views.length >= 2 ? buildFlight(towerData(locale), locale, views) : null
      if (flight) return flight
    }
  }
  return byHand(without[0], ids[0], locale)
}

const panel = (f: ConnectFlight, l: Locale, at: number) =>
  renderToStaticMarkup(ReactNS.createElement(FlightPanel, { flight: f, locale: l, at, playing: false, copied: false, onGo() {}, onPlay() {}, onOverview() {}, onShare() {} }))
const nameBlock = (id: string, name: string, color: string, locale: Locale, child: ReactNS.ReactNode) =>
  renderToStaticMarkup(ReactNS.createElement(PanelName, { id, name, color, locale, children: child }))
const imgs = (html: string) => html.match(/<img [^>]*>/g) ?? []

console.log('\nthe data these tests pick from')

test('there are sages with a portrait and sages without one, and an illustration among the portraits', () => {
  assert.ok(without.length > 0, 'every roster sage has a portrait: the "none" cases would not be tested')
  assert.ok(idsOfKind('illustration').length > 0, 'no illustration in data-portraits.json')
})

for (const kind of KINDS) {
  if (idsOfKind(kind).length === 0) console.log(`  note: no ${kind} in data-portraits.json, the ${kind} cases below are skipped`)
}

console.log('\ncomponents/connect/FlightPanel.tsx')

for (const kind of KINDS) {
  if (idsOfKind(kind).length === 0) continue

  test(`a station whose sage has a portrait of kind ${kind} shows the thumbnail, linked to nothing, in he, en and ru`, () => {
    for (const l of LOCALES) {
      const f = flightFromPortrait(kind, l)
      assert.ok(f, `no flight from a sage with a portrait of kind ${kind} to one without, in ${l}`)
      const st = f.stations[0]
      const portrait = portraitOf(st.id)!
      assert.equal(portrait.kind, kind)
      const html = panel(f, l, 0)
      const found = imgs(html)
      assert.equal(found.length, 1, `${l}: one picture on the card`)
      const img = found[0]
      assert.ok(img.includes(`src="${portrait.srcSm}"`), `${l}: the small file, 128 px, shown at 56`)
      assert.ok(portrait.srcSm.startsWith('/portraits/') && portrait.srcSm.endsWith('.sm.webp'))
      assert.ok(img.includes('width="56"') && img.includes('height="56"'), `${l}: 56 x 56`)
      assert.ok(img.includes('loading="lazy"') && img.includes('decoding="async"'), `${l}: lazy, not the page's hero`)
      assert.ok(img.includes(`data-portrait="${st.id}"`) && img.includes(`data-portrait-kind="${kind}"`), `${l}: data attributes`)
      // decorative: the name stands beside it, and the card is an aria-live region that would read an alt at every station
      assert.ok(img.includes('alt=""'), `${l}: alt is empty (decorative)`)
      // the episode credit is its title, and the wording follows the kind (never the other kind's)
      assert.ok(img.includes(`title="${esc(portraitCredit(portrait, l))}"`), `${l}: title from portraitCredit with the portrait`)
      assert.ok(img.includes(`title="${esc(CREDIT[kind][l])}"`), `${l}: the ${kind} caption`)
      const other = KINDS.find(k => k !== kind)!
      assert.ok(!html.includes(esc(CREDIT[other][l])), `${l}: not the ${other} caption`)
      // a 56 px thumbnail carries the credit as a title only: no visible caption, no link to the episode
      assert.equal(html.split(esc(CREDIT[kind][l])).length - 1, 1, `${l}: the credit appears once, in the title`)
      assert.ok(!html.includes('data-portrait-credit') && !html.includes('#listen'), `${l}: no caption link under a thumbnail`)
      // only this site's files: nothing is asked of Spotify by a visitor
      assert.ok(!/(?:src|href)="https?:/.test(img))
      assert.doesNotMatch(img, /spotify|scdn/i)
      // it stands beside the name: after the "Station 1 of n" line and before the name
      const stationLine = { he: 'תחנה 1 מתוך', en: 'Station 1 of', ru: 'Остановка 1 из' }[l]
      assert.ok(html.includes(stationLine), `${l}: the station line`)
      assert.ok(html.indexOf('<img') < html.indexOf('<h2'), `${l}: before the name`)
      assert.ok(html.indexOf(stationLine) < html.indexOf('<img'), `${l}: after the station line`)
      // logical utilities only: it floats to the start, so the name and the era chip run beside it in either direction
      assert.match(img, /class="[^"]*\bfloat-start\b[^"]*\bme-3\b/)
      assert.doesNotMatch(img, /class="[^"]*\b(?:float-left|float-right|ml-|mr-|left-|right-)/)
      // a thin ring in the sage's era colour
      assert.ok(img.includes(`border-color:${st.color}99`), `${l}: ring in the era colour`)
    }
  })

  test(`the thumbnail follows the station: absent where the sage has none, there where he has a portrait of kind ${kind} (a later station)`, () => {
    for (const l of LOCALES) {
      const f = flightToPortrait(kind, l)
      assert.ok(f, `no flight from a sage without a portrait to one with kind ${kind}, in ${l}`)
      const last = f.stations.length - 1
      const first = panel(f, l, 0)
      assert.equal(imgs(first).length, 0, `${l}: the first sage has none`)
      assert.ok(!first.includes('data-portrait'))
      const end = panel(f, l, last)
      assert.equal(imgs(end).length, 1)
      assert.ok(end.includes(`data-portrait="${f.stations[last].id}"`))
      assert.ok(end.includes(`data-portrait-kind="${kind}"`))
      assert.ok(end.includes(`title="${esc(CREDIT[kind][l])}"`))
      // the way on, the end block and the sage's page are still there
      assert.ok(end.includes(`href="/${l}/sage/${f.stations[last].id}"`))
      assert.ok(end.includes(f.connectHref.replace(/&/g, '&amp;')))
    }
  })
}

test('a sage with no portrait leaves the card exactly as it was: the portrait adds that one picture and nothing else', () => {
  const l: Locale = 'he'
  const f = flightFromPortrait('illustration', l)!
  assert.ok(f)
  const none = without.find(id => !f.stations.some(s => s.id === id))!
  assert.ok(none)
  // the same card for a sage with no portrait: only the id differs (it is in the sage's page address)
  const g: ConnectFlight = { ...f, stations: f.stations.map((s, i) => (i === 0 ? { ...s, id: none } : s)) }
  const withIt = panel(f, l, 0)
  const withoutIt = panel(g, l, 0)
  assert.equal(imgs(withIt).length, 1)
  assert.equal(imgs(withoutIt).length, 0)
  assert.ok(!withoutIt.includes('data-portrait') && !withoutIt.includes('float-start'))
  assert.equal(
    withIt.replace(/<img [^>]*data-portrait[^>]*\/>/, ''),
    withoutIt.replace(`href="/he/sage/${none}"`, `href="/he/sage/${f.stations[0].id}"`),
    'the markup differs by the picture alone',
  )
})

test('a station whose id has no portrait entry shows no picture, whatever else the card holds', () => {
  const ghost: ConnectFlight = {
    from: 'ghost-0', to: 'ghost-1', color: '#5fd4d0', points: [],
    stations: [0, 1].map(i => ({ id: `ghost-${i}`, name: `Sage ${i}`, years: '1040–1105', era: 'Rishonim', period: 'rishonim' as const, color: '#c9973a', caption: i ? '[caption]' : null })),
    href: '/en/tower/path/ghost-0/ghost-1', connectHref: '/en/connect?from=ghost-0&to=ghost-1',
  }
  for (let at = 0; at < 2; at++) assert.equal(imgs(panel(ghost, 'en', at)).length, 0)
})

test('the panel source: portraitOf is imported statically, one picture, drawn only when there is a portrait', () => {
  const code = src('../components/connect/FlightPanel.tsx')
  assert.match(code, /^import \{[^}]*\bportraitOf\b[^}]*\} from '@\/lib\/portraits'$/m)
  assert.match(code, /^import \{[^}]*\bportraitCredit\b[^}]*\} from '@\/lib\/portraits'$/m)
  assert.equal((code.match(/<img\b/g) ?? []).length, 1)
  assert.match(code, /const portrait = portraitOf\(st\.id\)/)
  assert.match(code, /\{portrait && \(\s*<img data-portrait=\{st\.id\}/)
  assert.match(code, /alt=""/)
  assert.doesNotMatch(code, /alt=\{/)
  assert.match(code, /title=\{portraitCredit\(portrait, locale\)\}/)
  assert.match(code, /src=\{portrait\.srcSm\}/)
  // the caption and the alt come from lib/portraits.ts by the portrait's kind: no literal wording here
  for (const wording of Object.values(CREDIT).flatMap(r => Object.values(r)).concat(Object.values(ALT_WORD).flatMap(r => Object.values(r)))) {
    assert.ok(!code.includes(wording), `FlightPanel.tsx writes "${wording}" itself`)
  }
  assert.doesNotMatch(code, /next\/image/)
  assert.doesNotMatch(code, /loading="eager"/)
})

console.log('\ncomponents/tower/TowerScene.tsx')

const heTower = towerData('he')

for (const kind of KINDS) {
  if (idsOfKind(kind).length === 0) continue
  test(`the chosen sage's name block puts his portrait of kind ${kind} beside the name in he, en and ru`, () => {
    const id = idsOfKind(kind)[0]
    const portrait = portraitOf(id)!
    for (const l of LOCALES) {
      const node = towerData(l).nodes.find(n => n.id === id)
      assert.ok(node, `${id} is not in the tower in ${l}`)
      const html = nameBlock(id, node.name, node.color, l, ReactNS.createElement('h2', null, node.name))
      const found = imgs(html)
      assert.equal(found.length, 1)
      const img = found[0]
      assert.ok(img.includes(`data-portrait="${id}"`) && img.includes(`data-portrait-kind="${kind}"`))
      assert.ok(img.includes(`src="${portrait.srcSm}"`))
      assert.ok(img.includes('width="56"') && img.includes('height="56"'))
      assert.ok(img.includes('loading="lazy"') && img.includes('decoding="async"'))
      assert.ok(img.includes('alt=""'), `${l}: decorative, his name is beside it`)
      assert.ok(img.includes(`title="${esc(CREDIT[kind][l])}"`), `${l}: title`)
      assert.ok(img.includes(`title="${esc(portraitCredit(portrait, l))}"`))
      assert.ok(img.includes(`border-color:${node.color}99`), 'ring in the era colour')
      assert.match(img, /class="[^"]*\bshrink-0\b/, 'the picture keeps its size beside a long name')
      // the picture first (the reading start side), the name block after it, and it can shrink
      assert.ok(html.indexOf('<img') < html.indexOf('<h2'))
      assert.ok(html.includes('<div class="min-w-0"><h2>'))
      assert.ok(html.startsWith('<div class="flex min-w-0 items-start gap-3">'))
      assert.equal(html.split(esc(CREDIT[kind][l])).length - 1, 1, 'the credit appears once, in the title: no visible caption under a thumbnail')
    }
  })
}

test('a sage with no portrait gets the plain block the panel always had: no picture, no wrapper, no gap', () => {
  for (const l of LOCALES) {
    const id = without.find(i => towerData(l).nodes.some(n => n.id === i))!
    assert.ok(id)
    const node = towerData(l).nodes.find(n => n.id === id)!
    const child = ReactNS.createElement('h2', null, node.name)
    const html = nameBlock(id, node.name, node.color, l, child)
    assert.equal(html, renderToStaticMarkup(ReactNS.createElement('div', null, child)))
    assert.ok(!html.includes('<img') && !html.includes('data-portrait') && !html.includes('flex'))
  }
  assert.ok(heTower.nodes.length > 0)
})

test('the scene source: portraitOf is imported statically, one picture, drawn only for a sage who has a portrait, with a title', () => {
  const scene = src('../components/tower/TowerScene.tsx')
  assert.match(scene, /^import \{[^}]*\bportraitOf\b[^}]*\} from '@\/lib\/portraits'$/m)
  assert.match(scene, /^import \{[^}]*\bportraitCredit\b[^}]*\} from '@\/lib\/portraits'$/m)
  assert.equal((scene.match(/<img\b/g) ?? []).length, 1, 'exactly one picture in the scene file')
  assert.equal((scene.match(/<img data-portrait=/g) ?? []).length, 1)
  const guard = scene.indexOf('if (!portrait) return <div>{children}</div>')
  assert.ok(guard > 0, 'a sage with no portrait returns the plain block')
  assert.ok(guard < scene.indexOf('<img data-portrait='), 'and only then is the picture drawn')
  assert.match(scene, /const portrait = portraitOf\(id\)/)
  assert.match(scene, /alt=""/)
  assert.match(scene, /title=\{portraitCredit\(portrait, locale\)\}/)
  assert.match(scene, /src=\{portrait\.srcSm\}/)
  assert.match(scene, /width=\{56\}\s+height=\{56\}/)
  assert.match(scene, /loading="lazy"/)
  assert.doesNotMatch(scene, /loading="eager"/)
  assert.doesNotMatch(scene, /next\/image/)
  for (const wording of Object.values(CREDIT).flatMap(r => Object.values(r)).concat(Object.values(ALT_WORD).flatMap(r => Object.values(r)))) {
    assert.ok(!scene.includes(wording), `TowerScene.tsx writes "${wording}" itself`)
  }
})

test('the portrait sits in the chosen-sage panel and nowhere else in the scene: not in the 3D labels, the road to Sinai or the tours', () => {
  const scene = src('../components/tower/TowerScene.tsx')
  // the one use: the header of the chosen sage's panel
  assert.equal((scene.match(/<PanelName\b/g) ?? []).length, 1)
  const chosen = scene.indexOf('{/* the chosen sage */}')
  const use = scene.indexOf('<PanelName id={sel.id} name={sel.name} color={sel.color} locale={locale}>')
  assert.ok(chosen > 0 && use > chosen, 'inside the chosen-sage panel')
  assert.ok(scene.indexOf('</PanelName>') < scene.indexOf('{S.close[locale]}', use), 'beside the close button, in the same header row')
  // every other mention of "portrait" is the import, the helper (and the comment above it) or the one use
  const lines = scene.split('\n')
  let from = lines.findIndex(l => l.includes('export function PanelName('))
  assert.ok(from > 0)
  const to = lines.findIndex((l, i) => i > from && l === '}')
  while (from > 0 && lines[from - 1] !== '/**') from--
  from--
  const stray = lines.filter((l, i) => /portrait/i.test(l) && !(i >= from && i <= to) && !/^import .* from '@\/lib\/portraits'$/.test(l) && !/<PanelName\b/.test(l))
  assert.deepEqual(stray, [], 'portraits are mentioned only by the import, the helper and its one use')
  // the labels in the scene are text, as before
  const labels = scene.slice(scene.indexOf('const makeLabel'), scene.indexOf('const makeLabel') + 1500)
  assert.ok(labels.length > 100 && !/portrait|<img|createElement\('img'\)/i.test(labels))
})

test('three.js is still loaded inside the scene only, and the scene keeps its effects, camera aim and panel positions', () => {
  const scene = src('../components/tower/TowerScene.tsx')
  assert.doesNotMatch(scene, /^import .* from 'three/m)
  assert.match(scene, /await import\('three'\)/)
  // the chosen-sage panel keeps the classes that place it and cap its height on a phone
  assert.match(scene, /absolute inset-x-3 bottom-32 z-20 max-h-\[38%\] overflow-y-auto rounded-2xl border border-gold-500\/25 bg-ink-900\/90 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:end-4 sm:top-4 sm:bottom-auto sm:w-80 sm:max-h-\[70%\]/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
