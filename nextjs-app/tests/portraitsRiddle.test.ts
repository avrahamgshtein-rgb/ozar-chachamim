/**
 * The riddle's portrait (lib/riddle.ts, lib/riddleServer.ts, components/riddle/RiddleGame.tsx): the sage's
 * picture belongs to the answer, so it shows on the end screen and nowhere before the game is over. The server
 * hands the game ready-made strings (the browser never imports the portraits data); the caption and the alt
 * follow the portrait's kind; a sage with no portrait leaves the card as it was. No id is named: the days are
 * found by walking the riddle's calendar until the answer has a portrait, and until it has none.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as ReactNS from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RIDDLE_EPOCH, dateOfDay, emptyState, startDay, type GuessFeedback, type RiddlePayload, type RiddleState } from '../lib/riddle'
import { cardPortrait, riddleOn, riddlePayload, riddlePoolIds } from '../lib/riddleServer'
import {
  PORTRAIT_CREDIT, hasPortrait, portraitAlt, portraitCredit, portraitEntries, portraitEpisodeHref, portraitOf,
  type Portrait, type PortraitKind,
} from '../lib/portraits'
import { RiddleGame, EndScreen } from '../components/riddle/RiddleGame'
import type { Locale } from '../lib/types'

// the component files are transformed with the classic JSX runtime here (Next uses the automatic one)
;(globalThis as { React?: unknown }).React = ReactNS

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const app = path.join(__dirname, '..')
const read = (rel: string) => fs.readFileSync(path.join(app, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const PAGE_URL = 'https://example.org/he/riddle'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

/** The first day (counting from the riddle's first) whose answer satisfies `want`, searched over two cycles of the pool. */
function findDay(want: (id: string) => boolean): number {
  const span = riddlePoolIds().length * 2
  for (let d = 0; d < span; d++) {
    const day = RIDDLE_EPOCH + d
    if (want(riddleOn(dateOfDay(day)).sage.id)) return day
  }
  throw new Error(`no riddle in ${span} days matches`)
}
const withPortrait = findDay(id => hasPortrait(id))
const without = findDay(id => !hasPortrait(id))
const payloadOn = (day: number, locale: Locale): RiddlePayload => riddlePayload(locale, dateOfDay(day))

console.log('\nwhat the page hands the game')

test('a day whose answer has a portrait gives card.portrait in every language, as ready-made strings that follow the portrait\'s kind', () => {
  for (const l of LOCALES) {
    const p = payloadOn(withPortrait, l)
    const portrait = portraitOf(p.answer)!
    assert.ok(portrait, 'the answer has a portrait')
    assert.ok(p.card.portrait, `${l}: no card.portrait`)
    assert.equal(p.card.portrait.src, portrait.src)
    assert.match(p.card.portrait.src, /^\/portraits\/[^/]+\.webp$/)
    assert.ok(fs.existsSync(path.join(app, 'public', p.card.portrait.src)), `${p.card.portrait.src} is not in public/`)
    assert.equal(p.card.portrait.kind, portrait.kind)
    assert.equal(p.card.portrait.credit, portraitCredit(portrait, l))
    assert.equal(p.card.portrait.credit, PORTRAIT_CREDIT[portrait.kind][l])
    assert.equal(p.card.portrait.alt, portraitAlt(p.card.name, l, portrait))
    assert.ok(p.card.portrait.alt.endsWith(`: ${p.card.name}`))
    assert.equal(p.card.portrait.href, portraitEpisodeHref(p.answer, l))
    assert.equal(p.card.portrait.href, `/${l}/sage/${p.answer}#listen`)
  }
})

test('a day whose answer has none gives card.portrait null in every language, and the rest of the card is untouched', () => {
  for (const l of LOCALES) {
    const p = payloadOn(without, l)
    assert.equal(p.card.portrait, null)
    assert.equal(p.card.id, p.answer)
    assert.equal(p.card.sageHref, `/${l}/sage/${p.answer}`)
    assert.equal(p.card.towerHref, `/${l}/tower/${p.answer}`)
  }
})

test('a photograph is given the photograph wording and an illustration the illustration wording, never the other way round', () => {
  const stub = (kind: PortraitKind): Portrait => ({ src: '/portraits/0.webp', srcSm: '/portraits/0.sm.webp', episode: 'e', kind })
  for (const l of LOCALES) {
    const photo = cardPortrait('7', 'Name', l, stub('photo'))!
    const drawing = cardPortrait('7', 'Name', l, stub('illustration'))!
    assert.equal(photo.kind, 'photo')
    assert.equal(photo.credit, PORTRAIT_CREDIT.photo[l])
    assert.equal(photo.alt, portraitAlt('Name', l, { kind: 'photo' }))
    assert.equal(drawing.kind, 'illustration')
    assert.equal(drawing.credit, PORTRAIT_CREDIT.illustration[l])
    assert.equal(drawing.alt, portraitAlt('Name', l, { kind: 'illustration' }))
    assert.notEqual(photo.credit, drawing.credit)
    assert.notEqual(photo.alt, drawing.alt)
    assert.equal(photo.href, `/${l}/sage/7#listen`)
  }
  assert.equal(cardPortrait('7', 'Name', 'he', null), null)
})

test('the real portraits that are photographs carry the photograph wording through the payload (when one is the answer on some day)', () => {
  for (const kind of ['illustration', 'photo'] as const) {
    const ids = new Set(portraitEntries().filter(([, e]) => e.kind === kind).map(([id]) => id))
    const span = riddlePoolIds().length * 2
    for (let d = 0; d < span; d++) {
      const p = payloadOn(RIDDLE_EPOCH + d, 'en')
      if (!ids.has(p.answer)) continue
      assert.equal(p.card.portrait?.kind, kind)
      assert.equal(p.card.portrait?.credit, PORTRAIT_CREDIT[kind].en)
    }
  }
})

test('the payload stays small with the portrait in it', () => {
  for (const l of LOCALES) {
    const bytes = Buffer.byteLength(JSON.stringify(payloadOn(withPortrait, l)))
    // the same ceiling as tests/riddle.test.ts (68 KB since the roster grew to 509 sages): the portrait adds under 300 bytes
    assert.ok(bytes < 68_000, `${l}: ${bytes} bytes`)
  }
})

console.log('\nthe game: no portrait of the answer until the game is over')

const gameHtml = (l: Locale, day: number) =>
  renderToStaticMarkup(ReactNS.createElement(RiddleGame, { locale: l, payload: payloadOn(day, l), pageUrl: PAGE_URL.replace('/he/', `/${l}/`) }))

test('the game as first rendered (not over) holds no <img>, no preload, no background image, no src and no mention of the portrait, in three languages', () => {
  for (const l of LOCALES) {
    const p = payloadOn(withPortrait, l)
    assert.ok(p.card.portrait)
    const html = gameHtml(l, withPortrait)
    assert.ok(html.length > 1000, 'the game rendered')
    assert.doesNotMatch(html, /\/portraits\//)
    assert.doesNotMatch(html, /<img\b/i)
    assert.doesNotMatch(html, /<link\b/i)
    assert.doesNotMatch(html, /\bsrc=/i)
    assert.doesNotMatch(html, /background-image|url\(/i)
    assert.doesNotMatch(html, /data-portrait|riddle-portrait/)
    assert.ok(!html.includes(esc(p.card.portrait.alt)), 'the alt text is not on the page')
    assert.ok(!html.includes(esc(p.card.portrait.credit)), 'the caption is not on the page')
    assert.ok(!html.includes(esc(p.card.name)), 'the answer\'s name is not on the page')
  }
})

test('nothing portrait-related is in the markup of a game for a sage without a portrait either, and the end screen is not rendered', () => {
  const html = gameHtml('he', without)
  assert.doesNotMatch(html, /<img\b|data-portrait|\/portraits\//)
  assert.doesNotMatch(html, /riddle-end/)
})

test('in the source, the picture is in EndScreen only, and EndScreen is rendered only in the state.done branch', () => {
  const src = read('components/riddle/RiddleGame.tsx')
  const images = [...src.matchAll(/<img\b/g)]
  assert.equal(images.length, 1, 'exactly one <img> in the game')
  assert.ok(images[0].index! > src.indexOf('export function EndScreen'), 'the <img> is inside EndScreen')
  const usages = [...src.matchAll(/<EndScreen\b/g)]
  assert.equal(usages.length, 1)
  const before = src.slice(0, usages[0].index!)
  assert.match(before, /\{state\.done \? \(\s*<>\s*$/, 'the only <EndScreen> sits directly in `state.done ? (<>`')
  assert.doesNotMatch(src, /rel="preload"|backgroundImage|background-image|fetchPriority|<picture|srcSet/)
  assert.doesNotMatch(read('app/[locale]/riddle/page.tsx'), /portrait|rel="preload"|<img|background-image/)
})

test('the client files do not import the portraits data: the game gets strings from the server', () => {
  for (const f of ['components/riddle/RiddleGame.tsx', 'lib/riddle.ts']) {
    const src = read(f)
    assert.doesNotMatch(src, /from ['"](@\/lib|\.)\/?portraits['"]/, `${f} imports lib/portraits`)
    assert.doesNotMatch(src, /data-portraits/)
  }
  assert.match(read('lib/riddleServer.ts'), /from '\.\/portraits'/)
})

console.log('\nthe end screen')

const doneState = (day: number, won: boolean): RiddleState => ({ ...startDay(emptyState(), day), guesses: ['x'], done: true, won })
const feedback: (GuessFeedback | null)[] = [{ era: 'same', region: 'other', linked: false }]
const endHtml = (l: Locale, payload: RiddlePayload, won = true) =>
  renderToStaticMarkup(ReactNS.createElement(EndScreen, {
    sectionRef: { current: null }, locale: l, payload, state: doneState(payload.day, won), feedback, pageUrl: PAGE_URL.replace('/he/', `/${l}/`),
  }))

test('the end screen of a sage with a portrait shows the picture, a lazy square img with the alt and kind, and the caption linking to the episode', () => {
  for (const l of LOCALES) {
    const p = payloadOn(withPortrait, l)
    const portrait = p.card.portrait!
    const html = endHtml(l, p)
    const img = html.match(/<img\b[^>]*>/)
    assert.ok(img, `${l}: no <img>`)
    assert.equal([...html.matchAll(/<img\b/g)].length, 1)
    assert.ok(img[0].includes(`src="${portrait.src}"`))
    assert.ok(img[0].includes(`alt="${esc(portrait.alt)}"`))
    assert.ok(img[0].includes('width="112"') && img[0].includes('height="112"'))
    assert.ok(img[0].includes('loading="lazy"') && img[0].includes('decoding="async"'))
    assert.ok(img[0].includes(`data-portrait="${p.answer}"`))
    assert.ok(img[0].includes(`data-portrait-kind="${portrait.kind}"`))
    assert.match(img[0], /object-cover/)
    assert.doesNotMatch(html, /_next\/image/)
    const credit = html.match(/<a\b[^>]*data-portrait-credit[^>]*>([^<]*)<\/a>/)
    assert.ok(credit, `${l}: no caption link`)
    assert.ok(credit[0].includes(`href="${portrait.href}"`))
    assert.equal(credit[1], esc(portrait.credit))
    // the card is otherwise the same: name, years, the way to the page and the tower
    assert.ok(html.includes(esc(p.card.name)))
    assert.ok(html.includes(`href="${p.card.sageHref}"`) && html.includes(`href="${p.card.towerHref}"`))
  }
})

test('the end screen shows the portrait whether the game was won or lost, and the logical float keeps RTL right (no left/right utilities)', () => {
  const p = payloadOn(withPortrait, 'he')
  for (const won of [true, false]) assert.match(endHtml('he', p, won), /data-portrait=/)
  const src = read('components/riddle/RiddleGame.tsx')
  const figure = src.slice(src.indexOf('<figure data-testid="riddle-portrait"'), src.indexOf('</figure>'))
  assert.match(figure, /float-start me-4/)
  assert.doesNotMatch(figure, /\b(float-left|float-right|ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)/)
})

test('a photograph on the end screen is captioned as a photograph and an illustration as an illustration', () => {
  const base = payloadOn(withPortrait, 'en')
  for (const l of LOCALES) {
    for (const kind of ['photo', 'illustration'] as const) {
      const stubbed: RiddlePayload = {
        ...base,
        card: { ...base.card, portrait: cardPortrait(base.card.id, base.card.name, l, { src: '/portraits/0.webp', srcSm: '/portraits/0.sm.webp', episode: 'e', kind }) },
      }
      const html = endHtml(l, stubbed)
      assert.ok(html.includes(`data-portrait-kind="${kind}"`))
      assert.ok(html.includes(`>${esc(PORTRAIT_CREDIT[kind][l])}</a>`), `${l} ${kind}: caption`)
      const other = kind === 'photo' ? 'illustration' : 'photo'
      assert.ok(!html.includes(esc(PORTRAIT_CREDIT[other][l])), `${l} ${kind}: the other kind's caption is on the page`)
      assert.ok(html.includes(`alt="${esc(portraitAlt(base.card.name, l, { kind }))}"`))
    }
  }
})

test('the end screen of a sage with no portrait has no image, no caption, no figure and no reserved space', () => {
  for (const l of LOCALES) {
    const p = payloadOn(without, l)
    const html = endHtml(l, p)
    assert.doesNotMatch(html, /<img\b|<figure|data-portrait|riddle-portrait|float-start|\/portraits\//)
    assert.ok(html.includes(esc(p.card.name)))
  }
})

test('the size of the picture is 96 px on a phone and 112 px from sm up (96 to 128 px, as the caption rule needs)', () => {
  const html = endHtml('en', payloadOn(withPortrait, 'en'))
  assert.match(html, /<figure[^>]*class="[^"]*\bw-24\b[^"]*\bsm:w-28\b/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
