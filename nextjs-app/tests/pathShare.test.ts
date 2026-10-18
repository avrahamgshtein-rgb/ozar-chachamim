/**
 * The share images of a path between two sages ("שישה צעדים") and the button that shares them:
 *  - the link preview of the path page (app/[locale]/tower/path/[from]/[to]/opengraph-image.tsx, 1200 x 630, at most
 *    270 KB: WhatsApp drops a preview over ~300 KB) and the status image (.../story/route.tsx, 1080 x 1920);
 *  - the stations as faces (JPEG through lib/ogPortrait.ts: Satori rejects WebP), a disc with the medallion for a sage with
 *    no portrait, the "+k" disc for a path too long to show in full, Hebrew right to left with proper gershayim;
 *  - the credit lines by the portrait's own kind: the photograph caption is drawn when a photograph is, the illustration
 *    caption when an illustration is, never one for the other (and when both are drawn, the photographs carry a mark);
 *  - the page's own og:image / twitter:image name the card; lib/shareFile.ts shares or saves the image; the button is on the
 *    flight panel and on the picker.
 * The images are rendered through the real route functions with next/og (a spy on ImageResponse reads the element tree it is
 * given). The paths are found at run time in the real graph (by label for Rashi and the Rambam, never by id): a one-step
 * path, Rashi to the Rambam, a six-station path, the longest path there is, a path whose stations mostly have no portrait,
 * paths with photographs, and for every length the path with the heaviest portraits (the worst case for the card's size).
 * `PATH_SHARE_OUT=<dir> npx tsx tests/pathShare.test.ts` also writes the PNGs of those cases to <dir>, to look at.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import nextConfig from '../next.config'
import { getAllSages } from '../lib/serverData'
import { connectGraph, connectPathFor } from '../lib/connectServer'
import { compareIds, shortestPath } from '../lib/connect'
import { portraitOf, PORTRAIT_CREDIT, type PortraitKind } from '../lib/portraits'
import { isRtlText, rtlWords } from '../lib/ogText'
import { ERA_LABELS, type Locale } from '../lib/types'
import { SITE_URL } from '../lib/siteUrl'
import { UI } from '../lib/i18n'
import { FLIGHT_COLOR, flightHref, type ConnectFlight } from '../lib/connectFlight'
import { shareImageFile } from '../lib/shareFile'
import {
  CARD_FACE_AREA, CARD_MAX_ITEMS, CARD_ROW_WIDTH, SIX_STEPS, STORY, cardAlt, cardLayout, cardPath, creditLines, elide, gershayim,
  hiddenLabel, isHidden, pathShare, stepsLabel, storyLayout, storyPath, titleOf, type Face, type PathShare, type Shown,
} from '../lib/pathShare'
import { clipTitle, clipToLines, fitSize, linesOf, wordFit } from '../lib/pathShareArt'

;(globalThis as { React?: unknown }).React = React // tsx compiles with jsx: preserve

// A spy on next/og: the routes get a class that records the element tree and then draws it for real.
interface Captured { element: unknown; options: { width: number; height: number } }
const captured: Captured[] = []
const ogPath = require.resolve('next/og')
const realOg = require('next/og') as { ImageResponse: new (el: unknown, opts: unknown) => Response }
class SpyImageResponse extends realOg.ImageResponse {
  constructor(element: unknown, options: { width: number; height: number }) {
    captured.push({ element, options })
    super(element, options)
  }
}
require.cache[ogPath] = { id: ogPath, filename: ogPath, loaded: true, exports: { ImageResponse: SpyImageResponse } } as unknown as NodeModule

const app = path.join(__dirname, '..')
const read = (rel: string) => fs.readFileSync(path.join(app, rel), 'utf8')
const code = (rel: string) => read(rel).replace(/\/\/.*$/gm, '')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const MAX_CARD = 270 * 1024
const OUT = process.env.PATH_SHARE_OUT

let passed = 0
let failed = 0
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

// ----- reading what a route drew ------------------------------------------------------------------------------

interface Img { src: string; width: number }
/** Every text node, every <img> and every camera mark of an element tree, expanding the images' function components (they have no hooks). */
function inspect(root: unknown) {
  const texts: string[] = []
  const imgs: Img[] = []
  const marks: number[] = []
  const undefinedStyles: string[] = []
  const walk = (node: unknown): void => {
    if (node == null || typeof node === 'boolean') return
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (typeof node === 'string' || typeof node === 'number') { texts.push(String(node)); return }
    const el = node as { type: unknown; props: Record<string, unknown> }
    if (typeof el.type === 'function') { walk((el.type as (p: unknown) => unknown)(el.props)); return }
    const style = (el.props?.style ?? {}) as Record<string, unknown>
    for (const [k, v] of Object.entries(style)) if (v === undefined) undefinedStyles.push(`${String(el.type)}.${k}`)
    if (el.type === 'img') imgs.push({ src: String(el.props.src), width: Number(el.props.width) })
    if (el.type === 'svg' && el.props.viewBox === '0 0 24 24') marks.push(Number(el.props.width))
    walk(el.props?.children)
  }
  walk(root)
  return { texts, imgs, marks, undefinedStyles }
}

/** Where the line is drawn, or -1: its words (Hebrew: in visual order, as the boxes OgLine and TitleLine make) follow each other in the tree. */
function lineAt(texts: string[], line: string): number {
  const want = isRtlText(line) ? rtlWords(line) : [line]
  for (let i = 0; i + want.length <= texts.length; i++) if (want.every((w, j) => texts[i + j] === w)) return i
  return -1
}
// a title is drawn word by word, whatever the language
const titleDrawn = (texts: string[], title: string) => {
  const want = isRtlText(title) ? rtlWords(title) : title.split(/\s+/).filter(Boolean)
  for (let i = 0; i + want.length <= texts.length; i++) if (want.every((w, j) => texts[i + j] === w)) return true
  return false
}

function pngSize(buf: Buffer) {
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'a PNG signature')
  assert.equal(buf.subarray(12, 16).toString('latin1'), 'IHDR')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

// ----- the paths (found in the real graph, never by id) --------------------------------------------------------

const g = connectGraph()
const roster = getAllSages()
const idOf = (label: string) => {
  const s = roster.find(x => x.label === label)
  assert.ok(s, `no sage labelled ${label}`)
  return s.id
}
const RASHI = idOf('רש"י (רבי שלמה יצחקי)')
const RAMBAM = idOf('הרמב"ם')
const ids = [...(g as unknown as { ids: string[] }).ids]
const jpgBytes = (id: string) => (portraitOf(id) && fs.existsSync(path.join(app, 'assets/og/portraits', `${id}.jpg`)) ? fs.statSync(path.join(app, 'assets/og/portraits', `${id}.jpg`)).size : 0)
const kindOf = (id: string): PortraitKind | null => portraitOf(id)?.kind ?? null

interface Pair { from: string; to: string; stations: string[] }
function pairOf(from: string, to: string): Pair | null {
  const p = shortestPath(g, from, to)
  return p ? { from, to, stations: p.steps.map(s => s.id) } : null
}

/** The stations a card shows in full or at the ends (all, or the first and last three). */
const shownIds = (stations: string[], items: Shown[]) => items.filter((i): i is number => !isHidden(i)).map(i => stations[i])

/** One scan of every pair a < b: the longest path, the first of several shapes, and the heaviest by length. */
function scan() {
  let longest: Pair | null = null
  let one: Pair | null = null
  let six: Pair | null = null
  let fewFaces: Pair | null = null
  let allPhoto: Pair | null = null
  let mixedPhoto: Pair | null = null
  const heaviest = new Map<number, { pair: Pair; bytes: number }>() // by the number of items the card shows
  for (const a of ids) {
    for (const b of ids) {
      if (compareIds(a, b) >= 0) continue
      const p = shortestPath(g, a, b)
      if (!p) continue
      const stations = p.steps.map(s => s.id)
      const n = stations.length
      const pair = { from: a, to: b, stations }
      if (!longest || n > longest.stations.length) longest = pair
      if (!one && n === 2 && kindOf(a) && kindOf(b)) one = pair
      if (!six && n === 6 && stations.every(id => portraitOf(id))) six = pair
      const items = cardLayout(n).items
      const shown = shownIds(stations, items)
      const kinds = shown.map(kindOf)
      if (!fewFaces && n >= 4 && kinds.filter(Boolean).length * 4 <= shown.length) fewFaces = pair
      if (!allPhoto && n >= 2 && kinds.every(k => k === 'photo')) allPhoto = pair
      if (!mixedPhoto && n >= 3 && kinds.includes('photo') && kinds.includes('illustration')) mixedPhoto = pair
      const bytes = shown.reduce((s, id) => s + jpgBytes(id), 0)
      const cur = heaviest.get(items.length)
      if (!cur || bytes > cur.bytes) heaviest.set(items.length, { pair, bytes })
    }
  }
  return { longest: longest!, one: one!, six: six!, fewFaces: fewFaces!, allPhoto: allPhoto!, mixedPhoto: mixedPhoto!, heaviest }
}
const found = scan()
const RASHI_RAMBAM = pairOf(RASHI, RAMBAM)!

// ----- rendering ------------------------------------------------------------------------------------------------

async function card(loc: string, from: string, to: string) {
  const route = (await import('../app/[locale]/tower/path/[from]/[to]/opengraph-image')).default
  const before = captured.length
  const res = await route({ params: Promise.resolve({ locale: loc, from, to }) })
  const buf = Buffer.from(await res.arrayBuffer())
  return { res, buf, tree: res.status === 200 ? inspect(captured[before].element) : null, drawn: captured.length - before }
}
async function story(loc: string, from: string, to: string) {
  const { GET } = await import('../app/[locale]/tower/path/[from]/[to]/story/route')
  const before = captured.length
  const res = await GET(new Request('http://localhost/'), { params: Promise.resolve({ locale: loc, from, to }) })
  const buf = Buffer.from(await res.arrayBuffer())
  return { res, buf, tree: res.status === 200 ? inspect(captured[before].element) : null, drawn: captured.length - before }
}

const jpegOf = (id: string) => `data:image/jpeg;base64,${fs.readFileSync(path.join(app, 'assets/og/portraits', `${id}.jpg`)).toString('base64')}`
let largestCard = { bytes: 0, label: '' }
let largestStory = { bytes: 0, label: '' }

/** What both images must hold for this path in this language, given which items they show. */
function checkTree(tree: ReturnType<typeof inspect>, share: PathShare, items: Shown[], loc: Locale, label: string) {
  assert.deepEqual(tree.undefinedStyles, [], `${label}: a style key set to undefined`)
  const shown = items.filter((i): i is number => !isHidden(i))
  // a face for each shown sage who has a portrait file, a medallion disc for each of the others
  const jpegs = tree.imgs.filter(i => i.src.startsWith('data:image/jpeg;base64,')).map(i => i.src)
  const pngs = tree.imgs.filter(i => i.src.startsWith('data:image/png'))
  const withFace = shown.filter(k => jpgBytes(share.stations[k].id) > 0)
  assert.deepEqual(jpegs, withFace.map(k => jpegOf(share.stations[k].id)), `${label}: the sages' own JPEGs, in the order of the path`)
  assert.equal(pngs.length, shown.length - withFace.length, `${label}: a medallion disc for each station with no portrait, and nothing else`)
  // no image of any other kind: no WebP, no remote address
  assert.equal(tree.imgs.length, jpegs.length + pngs.length, label)
  // the credit by the portrait's kind
  const kinds = new Set(withFace.map(k => kindOf(share.stations[k].id)!))
  for (const kind of ['illustration', 'photo'] as PortraitKind[]) {
    const drawn = lineAt(tree.texts, PORTRAIT_CREDIT[kind][loc]) >= 0
    assert.equal(drawn, kinds.has(kind), `${label}: the ${kind} caption is drawn iff a ${kind} is`)
  }
  const photosShown = withFace.filter(k => kindOf(share.stations[k].id) === 'photo').length
  // each photograph's mark, plus the one in front of its credit line
  assert.equal(tree.marks.length, kinds.size > 1 ? photosShown + 1 : 0, `${label}: camera marks`)
  // the line the page shows: the step count, and the "+k" disc when stations are left out
  assert.ok(lineAt(tree.texts, stepsLabel(share.steps, loc)) >= 0, `${label}: the step count`)
  const hidden = items.find(isHidden)
  if (hidden) {
    assert.ok(tree.texts.includes(`+${hidden.hidden}`), `${label}: the +k disc`)
    assert.ok(lineAt(tree.texts, hiddenLabel(hidden.hidden, loc)) >= 0, `${label}: what the disc stands for`)
  } else {
    assert.ok(!tree.texts.some(t => /^\+\d+$/.test(t)), `${label}: a +k disc with nothing left out`)
  }
  // Hebrew: gershayim, never a straight quote between two letters
  for (const t of tree.texts) assert.doesNotMatch(t, /[א-ת]"|"[א-ת]/, `${label}: a straight quote in "${t}"`)
}

async function main() {
  console.log('\nlib/pathShare.ts')

  await test('elide: all the stations up to the limit, past it the first ones, one "+k" disc and the last ones; never a "+1"', () => {
    assert.deepEqual(elide(10, 7), [0, 1, 2, { hidden: 4 }, 7, 8, 9])
    assert.deepEqual(elide(7, 7), [0, 1, 2, 3, 4, 5, 6])
    assert.deepEqual(elide(2, 7), [0, 1])
    assert.deepEqual(elide(8, 7), [0, 1, 2, { hidden: 2 }, 5, 6, 7])
    assert.deepEqual(elide(9, 5), [0, 1, { hidden: 5 }, 7, 8])
    assert.deepEqual(elide(18, 7), [0, 1, 2, { hidden: 12 }, 15, 16, 17])
    for (let max = 3; max <= 9; max++) for (let n = 2; n <= 30; n++) {
      const items = elide(n, max)
      assert.ok(items.length <= max, `${n} in ${max}: ${items.length} items`)
      const hidden = items.find(isHidden)
      if (n <= max) assert.equal(hidden, undefined)
      else {
        assert.ok(hidden && hidden.hidden >= 2, `${n} in ${max}: the disc stands for ${hidden?.hidden}`)
        const shown = items.filter((i): i is number => !isHidden(i))
        assert.equal(shown.length + hidden.hidden, n, 'every station is shown or counted')
        assert.equal(shown[0], 0); assert.equal(shown[shown.length - 1], n - 1, 'both ends of the path are always shown')
      }
    }
  })

  await test('the title, the step count and the disc are worded in the three languages, Russian plurals included', () => {
    assert.equal(titleOf('רש"י', 'הרמב"ם', 'he'), 'רש"י ← הרמב"ם')
    assert.equal(titleOf('Rashi', 'Maimonides', 'en'), 'Rashi → Maimonides')
    assert.equal(titleOf('Раши', 'Маймонид', 'ru'), 'Раши → Маймонид')
    const steps: Array<[number, Locale, string]> = [
      [1, 'he', 'צעד אחד'], [2, 'he', '2 צעדים'], [1, 'en', '1 step'], [2, 'en', '2 steps'],
      [1, 'ru', '1 шаг'], [2, 'ru', '2 шага'], [5, 'ru', '5 шагов'], [11, 'ru', '11 шагов'], [21, 'ru', '21 шаг'], [22, 'ru', '22 шага'],
    ]
    for (const [n, l, text] of steps) assert.equal(stepsLabel(n, l), text, `${n} ${l}`)
    assert.equal(hiddenLabel(4, 'he'), 'עוד 4 חכמים'); assert.equal(hiddenLabel(1, 'he'), 'עוד חכם אחד')
    assert.equal(hiddenLabel(4, 'en'), '4 more sages'); assert.equal(hiddenLabel(1, 'en'), '1 more sage')
    assert.equal(hiddenLabel(2, 'ru'), 'ещё 2 мудреца'); assert.equal(hiddenLabel(5, 'ru'), 'ещё 5 мудрецов'); assert.equal(hiddenLabel(21, 'ru'), 'ещё 21 мудрец')
    assert.deepEqual(SIX_STEPS, { he: 'שישה צעדים', en: 'Six Steps', ru: 'Шесть шагов' })
    assert.equal(cardAlt('Rashi', 'Maimonides', 2, 'en'), 'Rashi → Maimonides · 2 steps')
  })

  await test('gershayim: a straight quote between Hebrew letters becomes ״, a geresh ׳; Latin and Russian text is left alone', () => {
    assert.equal(gershayim('רש"י'), 'רש״י')
    assert.equal(gershayim('הרמב"ם (רבי משה)'), 'הרמב״ם (רבי משה)')
    assert.equal(gershayim("ר' יוסף"), 'ר׳ יוסף')
    assert.equal(gershayim('הושפע מ־רש"י'), 'הושפע מ־רש״י')
    assert.equal(gershayim('Rabbi "Rashi" Yitzchaki'), 'Rabbi "Rashi" Yitzchaki')
    assert.equal(gershayim("O'Brien"), "O'Brien")
    assert.equal(gershayim('Рабби Моше бен Маймон'), 'Рабби Моше бен Маймон')
  })

  await test('the addresses of the card and of the story, under the path page\'s own', () => {
    assert.equal(cardPath('he', '594', '41'), '/he/tower/path/594/41/opengraph-image')
    assert.equal(storyPath('ru', '594', '41'), '/ru/tower/path/594/41/story')
    assert.equal(storyPath('en', 'a b', 'c/d'), '/en/tower/path/a%20b/c%2Fd/story')
    assert.equal(storyPath('he', '594', '41'), `${flightHref('he', '594', '41')}/story`)
  })

  await test('cardLayout: at most seven items, faces that shrink as the faces grow in number, the whole row inside the card, names that fit', () => {
    assert.equal(CARD_MAX_ITEMS, 7)
    let prev = Infinity
    for (let n = 2; n <= 40; n++) {
      const { items, face, pitch, nameSize } = cardLayout(n)
      assert.ok(items.length <= CARD_MAX_ITEMS, `${n}: ${items.length} items`)
      assert.ok(pitch * items.length <= CARD_ROW_WIDTH, `${n}: the row is ${pitch * items.length} px of ${CARD_ROW_WIDTH}`)
      assert.ok(face >= 100 && face <= 208 && face % 2 === 0, `${n}: face ${face}`)
      assert.ok(face < pitch, `${n}: the faces do not touch`)
      assert.ok(nameSize >= 22 && nameSize <= 28)
      const faces = items.filter(i => !isHidden(i)).length
      assert.ok(faces * Math.PI / 4 * face * face <= CARD_FACE_AREA * 1.01, `${n}: ${faces} faces of ${face} px cover more than the budget`)
      if (n <= CARD_MAX_ITEMS) { assert.ok(face <= prev, `${n}: a longer path never gets larger faces`); prev = face }
    }
  })

  await test('storyLayout: every length fits the column (face 150 to 220 px), the three blocks and the frame make the 1,920 px, a short path spreads out', () => {
    assert.equal(STORY.top + STORY.zone + STORY.bottom + 2 * 18, 1920)
    for (let n = 2; n <= 40; n++) {
      const { items, face, connector, height } = storyLayout(n)
      assert.ok(height <= STORY.zone - STORY.pad, `${n}: ${height} px of ${STORY.zone - STORY.pad}`)
      assert.ok(face >= 150 && face <= STORY.faceMax && face % 10 === 0, `${n}: face ${face}`)
      assert.ok(connector >= STORY.connector && connector <= STORY.connectorMax, `${n}: connector ${connector}`)
      assert.equal(items.length, elide(n, STORY.maxFull).length)
    }
    assert.equal(storyLayout(2).face, STORY.faceMax)
    assert.ok(storyLayout(3).connector > storyLayout(7).connector, 'a short path has more room between the stations')
    assert.equal(storyLayout(STORY.maxFull).items.length, STORY.maxFull, 'the story shows a six-step path (seven stations) in full')
    assert.ok(storyLayout(STORY.maxFull + 1).items.some(isHidden))
  })

  await test('the type fits: a title and a name are set in at most two lines, and a name too long for its box is cut at a word', () => {
    for (const loc of LOCALES) {
      const title = 'x '.repeat(5).repeat(6).trim() // long
      const size = fitSize(title, 1088, 128, [64, 58, 52, 48, 44, 40], loc)
      assert.ok([64, 58, 52, 48, 44, 40].includes(size))
      assert.ok(linesOf('short', 64, 1088, loc) === 1)
    }
    const long = 'Рабби Ицхак бен Яаков ха-Лаван из Праги'
    const cut = clipToLines(long, 22, 145, 'ru', 3)
    assert.ok(cut.endsWith('…') && linesOf(cut, 22, 145, 'ru') <= 3, cut)
    assert.equal(clipToLines('Раши', 22, 145, 'ru', 3), 'Раши')
    assert.equal(wordFit(['Раши', 'Маймонид'], 145, 'ru', 22, 18), 22, 'short words keep the size')
    assert.ok(wordFit(['Филон Александрийский'], 171, 'ru', 25, 18) < 25, 'a long word shrinks the type')
    assert.equal(wordFit(['Александрийскийскийский'], 100, 'ru', 25, 18), 18, 'never below the floor')
    assert.ok(clipToLines('Александрийскийскийский', 18, 100, 'ru', 3).endsWith('…'), 'a word wider than the box is cut')
    const t = clipTitle(long, 'Ребецн Бат-Шева Эстер Каневская', 'ru', 936, 44)
    assert.ok(linesOf(t, 44, 936, 'ru') <= 2, t)
  })

  console.log('\nthe path as the images tell it')

  await test('pathShare: the stations in the order of the path, the captions and dotted threads of the flight panel, the portrait kinds; null for the pages\' 404s', () => {
    for (const loc of LOCALES) {
      const share = pathShare(loc, RASHI, RAMBAM)!
      assert.ok(share)
      const views = connectPathFor(loc, RASHI, RAMBAM)!
      assert.deepEqual(share.stations.map(s => s.id), views.map(v => v.id))
      assert.equal(share.steps, views.length - 1)
      share.stations.forEach((s, i) => {
        assert.equal(s.name, gershayim(views[i].name))
        assert.equal(s.caption, views[i].caption === null ? null : gershayim(views[i].caption!))
        assert.equal(s.dotted, views[i].dotted)
        assert.equal(s.period, views[i].period)
        assert.equal(s.era, ERA_LABELS[s.period][loc])
        assert.equal(s.portraitKind, kindOf(s.id))
      })
      assert.equal(share.stations[0].caption, null)
      assert.equal(share.title, titleOf(share.stations[0].name, share.stations[share.stations.length - 1].name, loc))
      assert.equal(share.title.includes(loc === 'he' ? '←' : '→'), true)
    }
    assert.equal(pathShare('he', RASHI, RASHI), null, 'the same sage twice')
    assert.equal(pathShare('he', 'no-such-sage', RAMBAM), null)
    assert.equal(pathShare('he', RASHI, 'no-such-sage'), null)
    const lonely = roster.find(s => s.id !== RASHI && shortestPath(g, s.id, RASHI) === null)
    assert.ok(lonely, 'every sage has a path to Rashi: the no-path case cannot be tested')
    assert.equal(pathShare('he', lonely.id, RASHI), null, 'two sages with no path between them')
  })

  await test('creditLines: one line for each kind of portrait drawn, its own caption, in order of appearance; mixed only when both are there', () => {
    const face = (kind: PortraitKind, loc: Locale): Face => ({ src: 'x', caption: PORTRAIT_CREDIT[kind][loc], kind })
    for (const loc of LOCALES) {
      const none = creditLines(new Map())
      assert.deepEqual(none, { lines: [], mixed: false })
      const ill = creditLines(new Map([[0, face('illustration', loc)], [3, face('illustration', loc)]]))
      assert.deepEqual(ill, { lines: [{ kind: 'illustration', text: PORTRAIT_CREDIT.illustration[loc] }], mixed: false })
      const photo = creditLines(new Map([[2, face('photo', loc)]]))
      assert.deepEqual(photo, { lines: [{ kind: 'photo', text: PORTRAIT_CREDIT.photo[loc] }], mixed: false })
      const both = creditLines(new Map([[5, face('illustration', loc)], [1, face('photo', loc)]]))
      assert.deepEqual(both.lines.map(l => l.kind), ['photo', 'illustration'], 'in the order of the path')
      assert.equal(both.mixed, true)
    }
  })

  console.log('\nthe cases the images are drawn for')

  const cases: Array<[string, Pair]> = [
    ['one step', found.one],
    ['Rashi to the Rambam', RASHI_RAMBAM],
    ['six stations', found.six],
    ['the longest path', found.longest],
    ['stations mostly without a portrait', found.fewFaces],
    ['only photographs', found.allPhoto],
    ['photographs and illustrations', found.mixedPhoto],
  ]

  await test('the cases exist: a one-step path, a six-station path, the longest path (and how long), a path of mostly no portraits, photographs only and mixed', () => {
    for (const [name, pair] of cases) assert.ok(pair, `no path for "${name}"`)
    assert.equal(found.one.stations.length, 2)
    assert.equal(found.six.stations.length, 6)
    assert.ok(RASHI_RAMBAM.stations.length >= 2)
    assert.ok(found.longest.stations.length - 1 >= 15, `the longest path is ${found.longest.stations.length - 1} steps`)
    console.log(`       the longest path in the graph: ${found.longest.stations.length - 1} steps (${found.longest.stations.length} stations)`)
    const kinds = (p: Pair) => shownIds(p.stations, cardLayout(p.stations.length).items).map(kindOf)
    assert.ok(kinds(found.fewFaces).filter(Boolean).length * 4 <= kinds(found.fewFaces).length)
    assert.ok(kinds(found.allPhoto).every(k => k === 'photo'))
    assert.ok(kinds(found.mixedPhoto).includes('photo') && kinds(found.mixedPhoto).includes('illustration'))
  })

  await test('the card of every case, in he, en and ru: a PNG of 1200 x 630 under 270 KB; faces, medallion discs, credits and the "+k" disc as the path needs', async () => {
    for (const [name, pair] of cases) {
      for (const loc of LOCALES) {
        const label = `${name} ${loc}`
        const { res, buf, tree, drawn } = await card(loc, pair.from, pair.to)
        assert.equal(res.status, 200, label)
        assert.equal(drawn, 1, `${label}: one image drawn`)
        assert.equal(res.headers.get('content-type'), 'image/png')
        assert.deepEqual(pngSize(buf), { width: 1200, height: 630 }, label)
        assert.ok(buf.length <= MAX_CARD, `${label}: ${(buf.length / 1024).toFixed(0)} KB is over ${(MAX_CARD / 1024).toFixed(0)} KB`)
        assert.match(res.headers.get('cache-control') ?? '', /max-age=3600, s-maxage=86400/, label)
        if (buf.length > largestCard.bytes) largestCard = { bytes: buf.length, label }
        const share = pathShare(loc, pair.from, pair.to)!
        const layout = cardLayout(share.stations.length)
        checkTree(tree!, share, layout.items, loc, label)
        assert.ok(titleDrawn(tree!.texts, clipTitle(share.stations[0].name, share.stations[share.stations.length - 1].name, loc, CARD_ROW_WIDTH, fitSize(share.title, CARD_ROW_WIDTH, 128, [64, 58, 52, 48, 44, 40], loc))), `${label}: the title`)
        // each face is at most the layout's size: the medallion and the JPEGs are drawn inside the ring
        for (const i of tree!.imgs) assert.ok(i.width <= layout.face, `${label}: an image of ${i.width} px in a face of ${layout.face}`)
        if (OUT) fs.writeFileSync(path.join(OUT, `card-${name.replace(/\W+/g, '_')}-${loc}.png`), buf)
      }
    }
    console.log(`       largest card of the cases: ${(largestCard.bytes / 1024).toFixed(0)} KB (${largestCard.label}); limit ${(MAX_CARD / 1024).toFixed(0)} KB`)
  })

  await test('the card with the heaviest portraits for every number of items the card can show (the worst case for the size), in he, en and ru, under 270 KB', async () => {
    assert.ok(found.heaviest.size >= 6, `${found.heaviest.size} classes of length`)
    const rows: string[] = []
    for (const [items, { pair, bytes }] of [...found.heaviest].sort((a, b) => a[0] - b[0])) {
      const row: string[] = []
      for (const loc of LOCALES) {
        const { buf } = await card(loc, pair.from, pair.to)
        assert.deepEqual(pngSize(buf), { width: 1200, height: 630 })
        assert.ok(buf.length <= MAX_CARD, `${items} items ${loc} (${pair.from} to ${pair.to}, ${(bytes / 1024).toFixed(0)} KB of JPEG): ${(buf.length / 1024).toFixed(0)} KB`)
        if (buf.length > largestCard.bytes) largestCard = { bytes: buf.length, label: `${items} items ${loc}` }
        row.push(`${loc} ${(buf.length / 1024).toFixed(0)}`)
      }
      rows.push(`${items} items, ${pair.stations.length} stations, ${(bytes / 1024).toFixed(0)} KB of JPEG: ${row.join(', ')} KB`)
    }
    console.log(`       heaviest cards by length:\n         ${rows.join('\n         ')}`)
    console.log(`       largest card of all: ${(largestCard.bytes / 1024).toFixed(0)} KB (${largestCard.label})`)
  })

  await test('the story of every case, in he, en and ru: a PNG of 1080 x 1920; faces, captions of the links between stations, the address and the site', async () => {
    for (const [name, pair] of cases) {
      for (const loc of LOCALES) {
        const label = `${name} ${loc}`
        const { res, buf, tree, drawn } = await story(loc, pair.from, pair.to)
        assert.equal(res.status, 200, label)
        assert.equal(drawn, 1, `${label}: one image drawn`)
        assert.equal(res.headers.get('content-type'), 'image/png')
        assert.deepEqual(pngSize(buf), { width: 1080, height: 1920 }, label)
        assert.match(res.headers.get('cache-control') ?? '', /max-age=3600, s-maxage=86400/, label)
        assert.ok(buf.length < 2 * 1024 * 1024, `${label}: ${(buf.length / 1024).toFixed(0)} KB`)
        if (buf.length > largestStory.bytes) largestStory = { bytes: buf.length, label }
        const share = pathShare(loc, pair.from, pair.to)!
        const layout = storyLayout(share.stations.length)
        checkTree(tree!, share, layout.items, loc, label)
        const textW = 936 - layout.face - 60
        // the header, the title and the address
        assert.ok(lineAt(tree!.texts, `${SIX_STEPS[loc]}  ·  ${UI[loc].appTitle}`) >= 0, `${label}: the header`)
        assert.ok(tree!.texts.includes(`${SITE_URL.replace(/^https?:\/\//, '')}${flightHref(loc, pair.from, pair.to)}`), `${label}: the path's address`)
        assert.ok(titleDrawn(tree!.texts, clipTitle(share.stations[0].name, share.stations[share.stations.length - 1].name, loc, 936, fitSize(share.title, 936, 150, [76, 68, 60, 54, 48, 44, 40, 36], loc))), `${label}: the title`)
        // the caption of the link into each shown station whose neighbour above is shown too, as the flight panel says it
        layout.items.forEach((it, k) => {
          if (isHidden(it)) return
          const st = share.stations[it]
          const size = fitSize(st.name, textW, layout.face - 60, [62, 56, 50, 46, 42, 38], loc)
          assert.ok(lineAt(tree!.texts, clipToLines(st.name, size, textW, loc, 2)) >= 0, `${label}: the name of station ${it}`)
          if (k > 0 && !isHidden(layout.items[k - 1])) {
            assert.ok(st.caption, `${label}: station ${it} has no caption`)
            assert.ok(lineAt(tree!.texts, clipToLines(st.caption!, 30, textW, loc, 1)) >= 0, `${label}: the caption of station ${it} (${st.caption})`)
          }
          assert.ok(lineAt(tree!.texts, [st.era, st.years].filter(Boolean).join('  ·  ')) >= 0, `${label}: the era and years of station ${it}`)
        })
        // the thumbnails never exceed the layout's face
        for (const i of tree!.imgs) assert.ok(i.width <= layout.face, `${label}: an image of ${i.width} px in a face of ${layout.face}`)
        if (OUT) fs.writeFileSync(path.join(OUT, `story-${name.replace(/\W+/g, '_')}-${loc}.png`), buf)
      }
    }
    console.log(`       largest story of the cases: ${(largestStory.bytes / 1024).toFixed(0)} KB (${largestStory.label})`)
  })

  await test('a station with no portrait is a disc in his era colour with the medallion, never a gap; one that has a portrait is never given the medallion', async () => {
    const { tree } = await card('he', found.fewFaces.from, found.fewFaces.to)
    const share = pathShare('he', found.fewFaces.from, found.fewFaces.to)!
    const shown = cardLayout(share.stations.length).items.filter((i): i is number => !isHidden(i))
    const noFace = shown.filter(k => !jpgBytes(share.stations[k].id))
    assert.ok(noFace.length >= 2, 'the case has stations with no portrait')
    assert.equal(tree!.imgs.filter(i => i.src.startsWith('data:image/png')).length, noFace.length)
    const el = await story('en', RASHI, RAMBAM)
    assert.equal(el.tree!.imgs.filter(i => i.src.startsWith('data:image/png')).length, shownIds(RASHI_RAMBAM.stations, storyLayout(3).items).filter(id => !jpgBytes(id)).length)
  })

  await test('a photograph carries the photograph caption, an illustration the illustration one: a path of photographs only draws no illustration caption, and the other way round', async () => {
    const kindsOf = (p: Pair) => new Set(shownIds(p.stations, cardLayout(p.stations.length).items).map(kindOf))
    for (const loc of LOCALES) {
      const photos = await card(loc, found.allPhoto.from, found.allPhoto.to)
      assert.ok(kindsOf(found.allPhoto).has('photo') && kindsOf(found.allPhoto).size === 1)
      assert.ok(lineAt(photos.tree!.texts, PORTRAIT_CREDIT.photo[loc]) >= 0)
      assert.equal(lineAt(photos.tree!.texts, PORTRAIT_CREDIT.illustration[loc]), -1, `${loc}: the illustration caption on photographs`)
      assert.equal(photos.tree!.marks.length, 0, 'photographs only: no mark is needed')
      const ill = await story(loc, RASHI, RAMBAM)
      assert.ok(lineAt(ill.tree!.texts, PORTRAIT_CREDIT.illustration[loc]) >= 0)
      assert.equal(lineAt(ill.tree!.texts, PORTRAIT_CREDIT.photo[loc]), -1, `${loc}: the photograph caption on illustrations`)
      const mixed = await story(loc, found.mixedPhoto.from, found.mixedPhoto.to)
      assert.ok(lineAt(mixed.tree!.texts, PORTRAIT_CREDIT.photo[loc]) >= 0 && lineAt(mixed.tree!.texts, PORTRAIT_CREDIT.illustration[loc]) >= 0)
      assert.ok(mixed.tree!.marks.length >= 2, `${loc}: the photographs are marked when the path has both`)
    }
  })

  await test('the Hebrew title and stations read right to left, the first station at the right: words in visual order, in a row-reverse row', async () => {
    const { tree } = await card('he', RASHI, RAMBAM)
    const share = pathShare('he', RASHI, RAMBAM)!
    assert.ok(titleDrawn(tree!.texts, share.title))
    assert.ok(share.title.includes('←') && !share.title.includes('→'))
    const first = tree!.texts.findIndex(t => t === rtlWords(share.stations[0].name)[0])
    assert.ok(first >= 0)
    const src = code('app/[locale]/tower/path/[from]/[to]/opengraph-image.tsx')
    assert.match(src, /flexDirection: rtl \? 'row-reverse' : 'row'/)
    assert.match(src, /toward=\{rtl \? 'left' : 'right'\}/)
  })

  console.log('\nthe 404s')

  await test('an unknown sage, the same sage twice, two sages with no path between them and an unknown language are a plain 404 from both routes, and draw nothing', async () => {
    const lonely = roster.find(s => s.id !== RASHI && shortestPath(g, s.id, RASHI) === null)
    const pairs: Array<[string, string, string]> = [
      ['he', 'no-such-sage', RAMBAM], ['he', RASHI, 'no-such-sage'], ['he', RASHI, RASHI], ['xx', RASHI, RAMBAM], ['fr', RASHI, RAMBAM],
    ]
    if (lonely) pairs.push(['en', lonely.id, RASHI])
    for (const [loc, from, to] of pairs) {
      const c = await card(loc, from, to)
      assert.equal(c.res.status, 404, `card ${loc} ${from} ${to}`)
      assert.equal(c.drawn, 0)
      const s = await story(loc, from, to)
      assert.equal(s.res.status, 404, `story ${loc} ${from} ${to}`)
      assert.equal(s.drawn, 0)
    }
    assert.ok(lonely, 'every sage is on a path: only five of the six 404 cases ran')
  })

  console.log('\nthe page and the routes')

  await test('the path page names the card as og:image and twitter:image (1200 x 630, summary_large_image) and shares its title with the images', async () => {
    const page = await import('../app/[locale]/tower/path/[from]/[to]/page')
    for (const loc of LOCALES) {
      const meta = await page.generateMetadata({ params: Promise.resolve({ locale: loc, from: RASHI, to: RAMBAM }) })
      const url = `${SITE_URL}/${loc}/tower/path/${RASHI}/${RAMBAM}/opengraph-image`
      const og = meta.openGraph?.images as Array<{ url: string; width: number; height: number; alt: string }>
      assert.equal(og.length, 1, 'one og:image: the card, not the medallion')
      assert.deepEqual([og[0].url, og[0].width, og[0].height], [url, 1200, 630])
      assert.ok(og[0].alt.length > 0)
      const tw = meta.twitter as { card: string; images: Array<{ url: string }>; title: string }
      assert.equal(tw.card, 'summary_large_image')
      assert.equal(tw.images.length, 1)
      assert.equal(tw.images[0].url, url)
      const views = connectPathFor(loc, RASHI, RAMBAM)!
      assert.ok(String(meta.title).includes(titleOf(views[0].name, views[views.length - 1].name, loc)), 'the page and the images share one title')
      assert.deepEqual(meta.robots, { index: false, follow: true })
    }
    const none = await page.generateMetadata({ params: Promise.resolve({ locale: 'he', from: RASHI, to: RASHI }) })
    assert.deepEqual(none, {}, 'no card promised for a pair that is a 404')
  })

  await test('the routes: the card exports alt, size and contentType; both read the portraits only through lib/pathShare and lib/ogPortrait; both are traced for the fonts', () => {
    const cardSrc = code('app/[locale]/tower/path/[from]/[to]/opengraph-image.tsx')
    const storySrc = code('app/[locale]/tower/path/[from]/[to]/story/route.tsx')
    const art = code('lib/pathShareArt.tsx')
    const lib = code('lib/pathShare.ts')
    assert.match(cardSrc, /export const alt = /)
    assert.match(cardSrc, /export const size = \{ width: 1200, height: 630 \}/)
    assert.match(cardSrc, /export const contentType = 'image\/png'/)
    assert.match(storySrc, /export async function GET/)
    assert.match(storySrc, /width: 1080, height: 1920/)
    for (const [name, src] of [['card', cardSrc], ['story', storySrc], ['art', art]] as const) {
      assert.ok(!/\.webp|public\/portraits|fetch\(/.test(src), `${name}: no webp, no public/portraits, no network`)
      assert.ok(!/PORTRAIT_CREDIT|'illustration'|"illustration"/.test(src), `${name}: the caption is never picked by hand`)
      assert.ok(!/emoji|📸|🖼/.test(src), `${name}: no emoji in an image (Satori would fetch it over the network)`)
    }
    assert.match(lib, /ogPortrait\(/)
    assert.ok(!/\.webp/.test(lib))
    assert.match(code('lib/ogPortrait.ts'), /portraitCredit\(/, 'the caption comes from the portrait\'s own kind')
    for (const src of [cardSrc, storySrc]) {
      assert.match(src, /facesOf\(/)
      assert.match(src, /creditLines\(/)
      assert.match(src, /status: 404/)
      assert.match(src, /Cache-Control': 'public, max-age=3600, s-maxage=86400'/)
    }
    // Hebrew goes through OgLine / TitleLine, the arrow in the path's teal
    assert.match(art, /export const TEAL = FLIGHT_COLOR/)
    assert.equal(FLIGHT_COLOR, '#5fd4d0')
    const include = (nextConfig.outputFileTracingIncludes ?? {}) as Record<string, string[]>
    // red until next.config.ts names the two routes (outputFileTracingIncludes): without it the fonts are not in the deployment
    const keys = ['/[locale]/tower/path/[from]/[to]/opengraph-image', '/[locale]/tower/path/[from]/[to]/story']
    assert.deepEqual(keys.filter(k => !(include[k] ?? []).includes('./assets/og/**')), [], 'assets/og must be traced for these routes (next.config.ts outputFileTracingIncludes)')
  })

  console.log('\nlib/shareFile.ts')

  type Fake = {
    fetchOk?: boolean; fetchFails?: boolean; canShare?: boolean; shareError?: string; noShareApi?: boolean
  }
  /** Runs shareImageFile against a fake browser and says what it did. */
  async function drive(f: Fake) {
    const calls = { fetched: [] as string[], shared: [] as unknown[], clicks: 0, download: '', opened: [] as string[], revoked: 0, timers: [] as Array<() => void> }
    const g = globalThis as Record<string, unknown>
    const saved = { fetch: g.fetch, setTimeout: g.setTimeout, createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL }
    const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    const doc = Object.getOwnPropertyDescriptor(globalThis, 'document')
    const win = Object.getOwnPropertyDescriptor(globalThis, 'window')
    g.fetch = async (url: string) => {
      calls.fetched.push(url)
      if (f.fetchFails) throw new TypeError('network')
      return { ok: f.fetchOk !== false, status: f.fetchOk === false ? 404 : 200, blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }) }
    }
    g.setTimeout = (fn: () => void) => { calls.timers.push(fn); return 0 }
    URL.createObjectURL = () => 'blob:fake'
    URL.revokeObjectURL = () => { calls.revoked++ }
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: f.noShareApi ? {} : {
        canShare: () => f.canShare === true,
        share: async (data: unknown) => { calls.shared.push(data); if (f.shareError) { const e = new Error('x'); e.name = f.shareError; throw e } },
      },
    })
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => ({ set href(v: string) { /* noop */ }, set download(v: string) { calls.download = v }, click() { calls.clicks++ } }) },
    })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { open: (u: string) => { calls.opened.push(u) } } })
    try {
      const result = await shareImageFile({ url: '/he/tower/path/1/2/story', fileName: 'p.png', text: 'caption\nhttps://x/y' })
      calls.timers.forEach(t => t())
      return { result, ...calls }
    } finally {
      g.fetch = saved.fetch; g.setTimeout = saved.setTimeout; URL.createObjectURL = saved.createObjectURL; URL.revokeObjectURL = saved.revokeObjectURL
      for (const [k, d] of [['navigator', nav], ['document', doc], ['window', win]] as const) {
        if (d) Object.defineProperty(globalThis, k, d); else delete (g as Record<string, unknown>)[k]
      }
    }
  }

  await test('shareImageFile: a browser that shares files gets the PNG as a File with the caption; nothing is downloaded', async () => {
    const r = await drive({ canShare: true })
    assert.equal(r.result, 'shared')
    assert.deepEqual(r.fetched, ['/he/tower/path/1/2/story'])
    assert.equal(r.shared.length, 1)
    const data = r.shared[0] as { files: File[]; text: string }
    assert.equal(data.text, 'caption\nhttps://x/y')
    assert.equal(data.files.length, 1)
    assert.equal(data.files[0].name, 'p.png')
    assert.equal(data.files[0].type, 'image/png')
    assert.equal(r.clicks, 0)
    assert.equal(r.opened.length, 0)
  })

  await test('shareImageFile: a browser that cannot share files (or has no share at all) downloads it, and lets the blob address go afterwards', async () => {
    for (const f of [{ canShare: false }, { noShareApi: true }]) {
      const r = await drive(f)
      assert.equal(r.result, 'downloaded')
      assert.equal(r.shared.length, 0)
      assert.equal(r.clicks, 1)
      assert.equal(r.download, 'p.png')
      assert.equal(r.revoked, 1)
      assert.equal(r.opened.length, 0)
    }
  })

  await test('shareImageFile: closing the share sheet is "cancelled" and opens nothing; any other failure opens the image itself in a new tab', async () => {
    const closed = await drive({ canShare: true, shareError: 'AbortError' })
    assert.equal(closed.result, 'cancelled')
    assert.equal(closed.opened.length, 0)
    assert.equal(closed.clicks, 0)
    for (const f of [{ fetchFails: true }, { fetchOk: false }, { canShare: true, shareError: 'NotAllowedError' }]) {
      const r = await drive(f)
      assert.equal(r.result, 'opened', JSON.stringify(f))
      assert.deepEqual(r.opened, ['/he/tower/path/1/2/story'])
    }
  })

  console.log('\nthe button')

  await test('SharePathImage: a 44 px button in the page\'s language, no Hebrew in English or Russian, no note before there is one', async () => {
    const { SharePathImage } = await import('../components/connect/SharePathImage')
    const want: Record<Locale, string> = { he: 'תמונה לשיתוף', en: 'Image to share', ru: 'Картинка для статуса' }
    for (const loc of LOCALES) {
      const html = renderToStaticMarkup(React.createElement(SharePathImage, { locale: loc, from: '1', to: '2', shareText: 'x' }))
      assert.ok(html.includes('data-testid="share-path-image"'), loc)
      assert.ok(html.includes(want[loc]), `${loc}: "${want[loc]}"`)
      assert.ok(html.includes('min-h-[44px]'), `${loc}: a 44 px target`)
      assert.ok(!html.includes('role="status"'))
      assert.doesNotMatch(html, /disabled=""/, `${loc}: the button is open before it is pressed`)
      if (loc !== 'he') assert.doesNotMatch(html, /[֐-׿]/, `${loc}: Hebrew left in the button`)
      assert.ok(renderToStaticMarkup(React.createElement(SharePathImage, { locale: loc, from: '1', to: '2', shareText: 'x', className: 'mine' })).includes('class="mine"'))
    }
  })

  await test('SharePathImage: the image is the path\'s story, the text is the flight\'s line and its address, and the event says only the language and how', () => {
    const src = code('components/connect/SharePathImage.tsx')
    assert.match(src, /url: `\$\{href\}\/story`/)
    assert.match(src, /const href = flightHref\(locale, from, to\)/)
    assert.match(src, /text: `\$\{shareText\}\\n\$\{window\.location\.origin\}\$\{href\}`/)
    const calls = [...src.matchAll(/track\('([a-z_]+)', (\{[^}]*\})\)/g)]
    assert.deepEqual(calls.map(c => c[1]), ['tower_share', 'tower_share'])
    assert.deepEqual(calls.map(c => c[2]), ["{ locale, method: 'image' }", "{ locale, method: 'download' }"])
    for (const c of calls) assert.doesNotMatch(c[2], /\bid\b|name|from|to\b/, 'the event carries no sage')
    assert.match(read('lib/analytics.ts'), /\| 'tower_share'/)
    assert.ok(!/from '@\/lib\/(serverData|connectServer|pathShare|towerServer)/.test(src), 'a client component imports no server module')
    assert.ok(/shareImageFile\(/.test(src))
    assert.ok(!/<img/.test(src))
  })

  await test('the flight panel shows the button at the end of the flight, beside "share", and not before; the picker shows it in its result, beside "fly"', async () => {
    const { FlightPanel } = await import('../components/connect/FlightPanel')
    const fake = (n: number, l: Locale): ConnectFlight => ({
      from: 's0', to: `s${n - 1}`, color: FLIGHT_COLOR, points: [],
      stations: Array.from({ length: n }, (_, i) => ({
        id: `s${i}`, name: `${l} ${i}`, years: '1040–1105', era: ERA_LABELS.rishonim[l], period: 'rishonim' as const, color: '#c9973a', caption: i === 0 ? null : `[caption ${i}]`,
      })),
      href: `/${l}/tower/path/s0/s${n - 1}`, connectHref: `/${l}/connect?from=s0&to=s${n - 1}`,
    })
    const panel = (l: Locale, at: number) => renderToStaticMarkup(React.createElement(FlightPanel, { flight: fake(5, l), locale: l, at, playing: false, copied: false, onGo() {}, onPlay() {}, onOverview() {}, onShare() {} }))
    const want: Record<Locale, string> = { he: 'תמונה לשיתוף', en: 'Image to share', ru: 'Картинка для статуса' }
    for (const l of LOCALES) {
      assert.ok(!panel(l, 3).includes('share-path-image'), `${l}: the button shows one station early`)
      const end = panel(l, 4)
      assert.ok(end.includes('data-testid="share-path-image"') && end.includes(want[l]), l)
      assert.ok(end.indexOf('share-path-image') > end.indexOf('↗'), `${l}: after "share"`)
      assert.equal((end.match(/<img/g) ?? []).length, 0, 'the synthetic stations have no portrait: no picture')
    }
    const panelSrc = code('components/connect/FlightPanel.tsx')
    assert.equal((panelSrc.match(/<img/g) ?? []).length, 1, 'FlightPanel still draws one picture, the thumbnail')
    assert.match(panelSrc, /<SharePathImage locale=\{locale\} from=\{flight\.from\} to=\{flight\.to\} shareText=\{summary\(last, shortName\(stations\[0\]\.name\), shortName\(st\.name\), locale\)\}/)
    assert.ok(!/stations\[0\]\.id/.test(panelSrc), 'nothing is derived from the first station\'s id')
    const picker = code('components/connect/ConnectPicker.tsx')
    assert.match(picker, /<SharePathImage\s+locale=\{locale\}\s+from=\{outcome\.from\}\s+to=\{outcome\.to\}\s+shareText=\{summary\(/)
    assert.ok(picker.indexOf('<SharePathImage') > picker.indexOf('data-testid="connect-fly"'), 'beside "fly"')
    assert.ok(picker.indexOf('<SharePathImage') < picker.indexOf('{S.flyNote[locale]}'))
    assert.ok(!/track\('tower_share'/.test(picker), 'the event is sent from the button')
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
