/**
 * A path between two sages flown in the tower ("שישה צעדים", lib/connectFlight.ts): the flight is built
 * from the real tower layout (towerData), so these tests check that every point stands where its sage
 * stands, that order, captions, dotted threads and addresses survive, and that the panel
 * (components/connect/FlightPanel.tsx) and the scene (components/tower/TowerScene.tsx) tell and fly it
 * in three languages without disturbing the road to Sinai or the kids' tours. The scene itself needs a
 * browser: what can be checked here is its source and the panel's markup.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as ReactNS from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAllSages } from '../lib/serverData'
import { towerData } from '../lib/towerServer'
import { ERA_LABELS } from '../lib/types'
import type { Locale } from '../lib/types'
import { buildFlight, connectHref, FLIGHT_COLOR, flightHref, type ConnectFlight, type FlightStepInput } from '../lib/connectFlight'
import { FlightPanel } from '../components/connect/FlightPanel'

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
const sages = getAllSages()
const idOf = (label: string) => {
  const s = sages.find(x => x.label === label)
  assert.ok(s, `no sage labelled ${label}`)
  return s.id
}
// found by label, never by id
const RASHI = idOf('רש"י (רבי שלמה יצחקי)')
const RAMBAM = idOf('הרמב"ם')
const RAMBAN = idOf('הרמב"ן (רבי משה בן נחמן)')
const AKIVA = idOf('רבי עקיבא בן יוסף')

const he = towerData('he')
const heNode = new Map(he.nodes.map(n => [n.id, n]))

const steps: FlightStepInput[] = [
  { id: RASHI, caption: null, dotted: false },
  { id: RAMBAM, caption: 'הושפע מרש״י', dotted: true },
  { id: RAMBAN, caption: 'תלמידו של הרמב״ם', dotted: false },
  { id: AKIVA, caption: 'השפיע על הרמב״ן', dotted: true },
]

console.log('\nlib/connectFlight.ts')

test('the addresses: the tower opened on a path, and the connect page with the pair filled in', () => {
  assert.equal(flightHref('he', '594', '41'), '/he/tower/path/594/41')
  assert.equal(flightHref('ru', 'a b', 'c/d'), '/ru/tower/path/a%20b/c%2Fd')
  assert.equal(connectHref('he'), '/he/connect')
  assert.equal(connectHref('en', null, null), '/en/connect')
  assert.equal(connectHref('he', '594'), '/he/connect?from=594')
  assert.equal(connectHref('ru', '594', '41'), '/ru/connect?from=594&to=41')
  assert.equal(connectHref('he', undefined, '41'), '/he/connect?to=41')
})

test('every point stands where its sage stands in the tower, in the order of the path', () => {
  const f = buildFlight(he, 'he', steps)!
  assert.ok(f)
  assert.equal(f.points.length, steps.length)
  assert.equal(f.stations.length, steps.length)
  steps.forEach((s, i) => {
    const n = heNode.get(s.id)!
    const p = f.points[i]
    assert.equal(p.id, s.id)
    assert.deepEqual([p.x, p.y, p.z], [n.x, n.y, n.z], `point ${i}`)
    assert.equal(p.name, n.name)
    assert.equal(p.label, `${i + 1} · ${n.short}`)
    assert.equal(p.how, 'teacher')
    assert.equal(f.stations[i].id, s.id)
  })
})

test('the thread from a point to the next is dotted when the link into the next sage is influence', () => {
  const f = buildFlight(he, 'he', steps)!
  assert.deepEqual(f.points.map(p => Boolean(p.dotted)), [true, false, true, false])
  // the key is absent, not false, on a solid thread; the last point has no thread
  assert.ok(!('dotted' in f.points[1]))
  assert.ok(!('dotted' in f.points[3]))
  const solid = buildFlight(he, 'he', steps.map(s => ({ ...s, dotted: false })))!
  assert.ok(solid.points.every(p => !p.dotted))
})

test('the stations carry what the panel tells: name, years, era, colour and the caption into each sage', () => {
  const f = buildFlight(he, 'he', steps)!
  steps.forEach((s, i) => {
    const n = heNode.get(s.id)!
    const st = f.stations[i]
    assert.equal(st.name, n.name)
    assert.equal(st.years, n.years)
    assert.equal(st.period, n.era)
    assert.equal(st.era, he.eras.find(e => e.era === n.era)!.label)
    assert.equal(st.era, ERA_LABELS[n.era].he)
    assert.equal(st.color, n.color)
  })
  assert.deepEqual(f.stations.map(s => s.caption), [null, 'הושפע מרש״י', 'תלמידו של הרמב״ם', 'השפיע על הרמב״ן'])
  // the first sage has no one before him, whatever the caller passed
  const g = buildFlight(he, 'he', [{ id: RASHI, caption: 'לא צריך להופיע', dotted: false }, steps[1]])!
  assert.equal(g.stations[0].caption, null)
})

test('the flight knows its ends, its trail colour and its addresses', () => {
  const f = buildFlight(he, 'he', steps)!
  assert.equal(f.from, RASHI)
  assert.equal(f.to, AKIVA)
  assert.equal(f.color, FLIGHT_COLOR)
  assert.equal(FLIGHT_COLOR, '#5fd4d0')
  assert.equal(f.href, `/he/tower/path/${RASHI}/${AKIVA}`)
  assert.equal(f.connectHref, `/he/connect?from=${RASHI}&to=${AKIVA}`)
  assert.doesNotMatch(f.href, /\?/, 'the address of a flight carries no query')
})

test('there is nothing to fly with fewer than two steps or a sage the tower does not hold', () => {
  assert.equal(buildFlight(he, 'he', []), null)
  assert.equal(buildFlight(he, 'he', [steps[0]]), null)
  assert.equal(buildFlight(he, 'he', [steps[0], { id: 'no-such-sage', caption: 'x', dotted: false }]), null)
  assert.equal(buildFlight(he, 'he', [{ id: 'no-such-sage', caption: null, dotted: false }, steps[1]]), null)
  assert.equal(buildFlight(he, 'he', [steps[0], { id: 'no-such-sage', caption: 'x', dotted: false }, steps[2]]), null)
  assert.ok(buildFlight(he, 'he', steps.slice(0, 2)), 'two sages are a path of one step')
})

test('a flight in another language: names and eras in that language, the address under that language', () => {
  for (const l of ['en', 'ru'] as Locale[]) {
    const tower = towerData(l)
    const node = new Map(tower.nodes.map(n => [n.id, n]))
    const f = buildFlight(tower, l, steps)!
    assert.equal(f.href, `/${l}/tower/path/${RASHI}/${AKIVA}`)
    assert.equal(f.connectHref, `/${l}/connect?from=${RASHI}&to=${AKIVA}`)
    f.stations.forEach((st, i) => {
      assert.equal(st.name, node.get(steps[i].id)!.name)
      assert.equal(st.era, ERA_LABELS[node.get(steps[i].id)!.era][l])
      assert.doesNotMatch(st.name, /[֐-׿]/, `${l}: ${st.name} is still Hebrew`)
    })
  }
})

test('the module is pure: no file, DOM, dataset or three.js', () => {
  const code = src('../lib/connectFlight.ts')
  const imports = [...code.matchAll(/^import (type )?[^\n]* from '([^']+)'/gm)].map(m => [m[2], Boolean(m[1])] as const)
  assert.deepEqual(imports.map(i => i[0]).sort(), ['./tower', './types', './types'], 'only the types and the tower\'s shapes are imported')
  assert.ok(imports.find(i => i[0] === './tower')![1], 'lib/tower.ts is imported for its types only')
  for (const bad of ['document.', 'window.', 'localStorage', 'process.env']) assert.ok(!code.includes(bad), `lib/connectFlight.ts mentions ${bad}`)
})

console.log('\ncomponents/tower/TowerScene.tsx')

const scene = src('../components/tower/TowerScene.tsx')

test('the scene takes a flight beside the kids\' tour and treats it the same way: no choosing sages, the address left alone, no time-lapse controls', () => {
  assert.match(scene, /tour\?: KidsTour; flight\?: ConnectFlight/)
  assert.match(scene, /const flightRef = useRef\(flight\)\s+flightRef\.current = flight/)
  // the pointer: a press chooses nobody (and the kids' test still finds its own line right before `pick`)
  assert.match(scene, /if \(flightRef\.current\) return\s+if \(tourRef\.current\) return\s+const i = pick\(ev\)/)
  // the address
  assert.match(scene, /\/\/ the kids' journey keeps its own address\s+if \(tourRef\.current\) return\s+\/\/[^\n]*\s+if \(flightRef\.current\) return/)
  // another sage never ends the flight's road
  assert.match(scene, /if \(!tourRef\.current && !flightRef\.current\) \{ setRoad\(null\); setRoadPlaying\(false\) \}/)
  // the controls
  assert.match(scene, /\$\{tour \|\| flight \? ' hidden' : ' flex'\}/)
})

test('the flight starts by itself at its first sage and is told where the visitor came from', () => {
  assert.match(scene, /if \(!flight\) return\s+setRoad\(flight\.points\)\s+setRoadAt\(0\)\s+setRoadPlaying\(true\)/)
  assert.match(scene, /track\('connect_fly', \{ locale, from: via === 'picker' \|\| via === 'game' \? via : 'link' \}\)/)
  assert.match(scene, /get\('via'\)/)
  // the event carries the language and where the visitor came from, never a name or an id
  assert.equal([...scene.matchAll(/track\('connect_fly', (\{[^}]*\})\)/g)].map(m => m[1].replace(/ from: .*? \}$/, ' from }')).join(), '{ locale, from }')
})

test('two and a half seconds a station, a hold at the end and then the whole path', () => {
  assert.match(scene, /const FLIGHT_STEP_MS = 2400/)
  assert.match(scene, /tour \? TOUR_STEP_MS : flight \? FLIGHT_STEP_MS : stepMs\(road\[roadAt\], roadAt\)/)
  assert.match(scene, /tour \? 2000 : flight \? FLIGHT_STEP_MS : stepMs\(road\[roadAt\], roadAt\)/)
  // the hold at the end and the pull-back are the road's own (2.6 s, then roadOverview)
  assert.match(scene, /setRoadPlaying\(false\); api\.current\?\.roadOverview\(\) \}, 2600\)/)
  assert.match(scene, /roadAt >= road\.length - 1/)
})

test('the thread is the flight\'s teal, dotted where a point says so, solid otherwise', () => {
  assert.match(scene, /\(points\[i\]\.how === 'teacher' \|\| points\[i\]\.how === 'chain'\) && !\(points\[i\] as FlightPoint\)\.dotted/)
  assert.match(scene, /tourRef\.current\?\.color \?\? flightRef\.current\?\.color \?\? '#ffd98a'/)
  assert.match(scene, /const n = solid \? 26 : 8/)
})

test('the panel is wired to the flight\'s road: prev/next/dots stop the flight, play restarts at the end, share uses the flight\'s own address', () => {
  assert.match(scene, /<FlightPanel[\s\S]*?flight=\{flight\}[\s\S]*?locale=\{locale\}[\s\S]*?at=\{roadAt\}[\s\S]*?playing=\{roadPlaying\}[\s\S]*?copied=\{copied\}[\s\S]*?onShare=\{\(\) => shareFlight\(flight\)\}/)
  assert.match(scene, /\$\{window\.location\.origin\}\$\{f\.href\}/)
  assert.match(scene, /track\('tower_share', \{ locale, method: 'copy' \}\)/)
})

test('the chosen sage\'s panel offers to connect him to another sage, by a plain link to the connect page', () => {
  assert.match(scene, /<a href=\{connectHref\(locale, sel\.id\)\}/)
  assert.doesNotMatch(scene, /from 'next\/link'/)
  assert.match(scene, /he: 'חברו אותו לחכם אחר', en: 'Connect him to another sage', ru: 'Связать с другим мудрецом'/)
})

test('the road to Sinai and the kids\' tours are as they were, and three.js is still loaded inside the effect', () => {
  assert.match(scene, /\/\/ the kids' journey keeps its own address\s+if \(tourRef\.current\) return/)
  assert.match(scene, /if \(tourRef\.current\) return\s+const i = pick\(ev\)/)
  assert.match(scene, /has\('road'\)\) startRoad\('link'\)/)
  assert.match(scene, /track\('kids_tour', \{ route: tour\.route, stage: 'start' \}\)/)
  assert.match(scene, /const TOUR_STEP_MS = 7000/)
  assert.match(scene, /setTimeout\(\(\) => setRoadAt\(a => Math\.min\(a \+ 1, road\.length - 1\)\)/)
  assert.doesNotMatch(scene, /^import .* from 'three/m)
  assert.match(scene, /await import\('three'\)/)
})

console.log('\ncomponents/connect/FlightPanel.tsx')

// a six-station path with synthetic stations: the panel only tells what it is given
function fake(n: number, l: Locale): ConnectFlight {
  const names: Record<Locale, string> = { he: 'חכם', en: 'Sage', ru: 'Мудрец' }
  return {
    from: 's0', to: `s${n - 1}`, color: FLIGHT_COLOR, points: [],
    stations: Array.from({ length: n }, (_, i) => ({
      id: `s${i}`, name: `${names[l]} ${i}`, years: '1040–1105', era: ERA_LABELS.rishonim[l], period: 'rishonim' as const, color: '#c9973a',
      caption: i === 0 ? null : `[caption ${i}]`,
    })),
    href: `/${l}/tower/path/s0/s${n - 1}`,
    connectHref: `/${l}/connect?from=s0&to=s${n - 1}`,
  }
}
const panel = (f: ConnectFlight, l: Locale, at: number, extra: Partial<{ playing: boolean; copied: boolean }> = {}) =>
  renderToStaticMarkup(ReactNS.createElement(FlightPanel, { flight: f, locale: l, at, playing: false, copied: false, onGo() {}, onPlay() {}, onOverview() {}, onShare() {}, ...extra }))

const END_BLOCK: Record<Locale, string> = { he: 'לבחור צמד אחר', en: 'Pick another pair', ru: 'Выбрать другую пару' }

test('the panel tells the station, the sage (linked to his page), his era and years, and how he is linked to the one before', () => {
  for (const l of ['he', 'en', 'ru'] as Locale[]) {
    const f = fake(6, l)
    const first = panel(f, l, 0)
    assert.match(first, new RegExp(`dir="${l === 'he' ? 'rtl' : 'ltr'}"`))
    assert.match(first, new RegExp(`lang="${l}"`))
    assert.ok(first.includes(l === 'he' ? 'תחנה 1 מתוך 6' : l === 'en' ? 'Station 1 of 6' : 'Остановка 1 из 6'), l)
    assert.ok(first.includes(`href="/${l}/sage/s0"`))
    assert.ok(first.includes(ERA_LABELS.rishonim[l]))
    assert.ok(first.includes('1040–1105'))
    assert.ok(!first.includes('[caption'), 'the first sage has no caption')
    const mid = panel(f, l, 3)
    assert.ok(mid.includes('[caption 3]') && !mid.includes('[caption 2]'))
    assert.ok(mid.includes(`href="/${l}/sage/s3"`))
    assert.equal((mid.match(/aria-current="step"/g) ?? []).length, 1)
    assert.ok(mid.includes('disabled=""') === false, 'prev and next are both open in the middle')
    // not finished: no summary, no share
    for (const early of [first, mid]) assert.ok(!early.includes(END_BLOCK[l]), `${l}: the end block shows before the end`)
  }
})

test('prev is closed at the first station and next at the last; the buttons are 44px targets', () => {
  const f = fake(4, 'en')
  const first = panel(f, 'en', 0), last = panel(f, 'en', 3)
  assert.match(first, /aria-label="Previous station"[^>]*disabled=""|disabled=""[^>]*aria-label="Previous station"/)
  assert.doesNotMatch(first, /aria-label="Next station"[^>]*disabled=""/)
  assert.match(last, /aria-label="Next station"[^>]*disabled=""/)
  assert.ok(first.includes('h-11 w-11'))
})

test('at the end: the length of the path, again, share, the whole path, the connect page with the pair; the copied note on request', () => {
  const expected: Record<Locale, [string, string, string, string]> = {
    he: ['5 צעדים בין', 'שוב מההתחלה', 'שיתוף', 'מבט על כל המסלול'],
    en: ['5 steps between', 'Fly it again', 'Share', 'See the whole path'],
    ru: ['5 шагов между', 'Ещё раз', 'Поделиться', 'Весь путь сверху'],
  }
  for (const l of ['he', 'en', 'ru'] as Locale[]) {
    const f = fake(6, l)
    const end = panel(f, l, 5)
    for (const s of expected[l]) assert.ok(end.includes(s), `${l}: "${s}" is missing at the end`)
    assert.ok(end.includes(`href="${f.connectHref.replace('&', '&amp;')}"`), `${l}: the connect page link`)
    assert.ok(!end.includes('role="status"'))
    assert.ok(panel(f, l, 5, { copied: true }).includes('role="status"'))
    assert.ok(!panel(f, l, 4).includes(expected[l][1]), `${l}: the end block shows one station early`)
  }
})

test('the length is worded right in every language, Russian plurals included', () => {
  const want: Array<[number, Locale, string]> = [
    [1, 'he', 'צעד אחד בין'], [2, 'he', '2 צעדים בין'],
    [1, 'en', '1 step between'], [2, 'en', '2 steps between'],
    [1, 'ru', '1 шаг между'], [2, 'ru', '2 шага между'], [4, 'ru', '4 шага между'], [5, 'ru', '5 шагов между'], [11, 'ru', '11 шагов между'], [21, 'ru', '21 шаг между'], [22, 'ru', '22 шага между'],
  ]
  for (const [steps, l, text] of want) assert.ok(panel(fake(steps + 1, l), l, steps).includes(text), `${steps} steps in ${l}: "${text}"`)
})

test('nothing in English or Russian is left in Hebrew', () => {
  for (const l of ['en', 'ru'] as Locale[]) {
    const f = fake(5, l)
    for (const at of [0, 2, 4]) assert.doesNotMatch(panel(f, l, at, { copied: true }), /[֐-׿]/, `${l} at ${at}`)
  }
})

test('the panel does not write the link\'s direction itself: it tells the caption it is given', () => {
  const code = src('../components/connect/FlightPanel.tsx')
  assert.doesNotMatch(code, /תלמידו|רבו של|student of|teacher of|учени/i)
  assert.match(code, /st\.caption/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
