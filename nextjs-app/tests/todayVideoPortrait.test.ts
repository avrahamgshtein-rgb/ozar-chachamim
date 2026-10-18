/**
 * The portrait in the Today status video (lib/todayVideo.ts::videoLayout, components/today/drawTodayFrame.ts,
 * components/today/TodayVideo.tsx, app/[locale]/today/page.tsx):
 *  - without a portrait the layout and the cues are exactly what the video had before (the old formulas, copied from the
 *    component as it was, are the oracle), for every roster sage in all three languages;
 *  - with one, for every roster sage in all three languages and a text measure wider than any real font: the picture is 240
 *    to 368 px, the blocks do not overlap, everything is inside the 1080 x 1920 card with the footer at its place, the
 *    caption is kept, the core idea is cut only after the picture is down to 240, and it still reads before the footer;
 *  - the frame drawing (on a recording canvas, so no browser): the picture's file is never drawn larger than its 384 px
 *    (with the push-in and the card's drift), the ring and the glow are drawn, a card whose picture did not load is drawn
 *    without it;
 *  - the pieces are wired: the page passes src and caption only when the sage has a portrait, the component loads the image,
 *    falls back to the card without it, computes the layout once, and never looks a portrait up itself.
 * The frames themselves were looked at in a browser page (see the report); this file needs no browser.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getAllSages } from '../lib/serverData'
import { localizeSage, translatedFields } from '../lib/serverDataTranslator'
import { labelParts } from '../lib/displayName'
import { formatYearRangeFor } from '../lib/utils'
import { clipWords } from '../lib/ogText'
import { ERA_COLORS, ERA_LABELS, type Locale } from '../lib/types'
import {
  CARD_DRIFT, PORTRAIT_FILE_PX, PORTRAIT_PUSH, PORTRAIT_RING, PORTRAIT_VIDEO_MAX, PORTRAIT_VIDEO_MIN, VIDEO,
  cardZoom, nameSize, phase, portraitDrawPx, portraitScale, videoCues, videoLayout, wrapWords,
  type TodayCard, type VideoLayout, type VideoMeasure,
} from '../lib/todayVideo'
import { drawTodayFrame, withAlpha, type VideoAssets } from '../components/today/drawTodayFrame'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const app = path.join(__dirname, '..')
const read = (rel: string) => fs.readFileSync(path.join(app, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']

// ---------- cards: the page's text for every roster sage, as app/[locale]/today/page.tsx builds it ----------

const WORDS = {
  heading: { he: 'היום באוצר חכמים', en: 'Today at Ozar Chachamim', ru: 'Сегодня в «Оцар Хахамим»' },
  date: { he: 'כ״ג בתשרי התשפ״ז', en: '23 Tishri 5787', ru: '23 тишрея 5787' },
  kind: { he: 'יום ההילולא של', en: 'The hillula of', ru: 'День памяти' },
  more: { he: 'מחקר מלא · האזנה · סרטון · חידון', en: 'Full research · Listen · Video · Quiz', ru: 'Исследование · Аудио · Видео · Викторина' },
  appTitle: { he: 'אוצר חכמים', en: 'Ozar Chachamim', ru: 'Оцар Хахамим' },
  caption: { he: 'איור מתוך פרק הפודקאסט', en: 'Illustration from the podcast episode', ru: 'Иллюстрация из выпуска подкаста' },
} satisfies Record<string, Record<Locale, string>>

function cardOf(sage: ReturnType<typeof getAllSages>[number], loc: Locale, portrait: boolean): TodayCard {
  const featured = localizeSage(sage, loc)
  const years = formatYearRangeFor(loc, featured.birth_year, featured.death_year, featured.date_precision)
  return {
    dir: loc === 'he' ? 'rtl' : 'ltr',
    heading: WORDS.heading[loc], date: WORDS.date[loc], kind: WORDS.kind[loc],
    name: labelParts(featured.label).name,
    sub: [ERA_LABELS[featured.period]?.[loc], years].filter(Boolean).join('  ·  '),
    line: loc === 'he' || translatedFields(sage.id, loc).has('core_concept') ? clipWords(featured.core_concept || '', 150) : '',
    more: WORDS.more[loc], host: `ozar-chachamim.vercel.app/${loc}/today`, appTitle: WORDS.appTitle[loc],
    accent: ERA_COLORS[featured.period] ?? '#c9973a',
    ...(portrait ? { portrait: { src: `/portraits/${sage.id}.webp`, caption: WORDS.caption[loc] } } : {}),
  }
}

const sages = getAllSages()
// every sage can be the day's (a hillula falls on any sage with a death date in his paper), so all of them are tried
const cards = (portrait: boolean) => LOCALES.flatMap(loc => sages.map(s => ({ loc, id: s.id, card: cardOf(s, loc, portrait) })))

// A fake measure wider than any of the site's fonts (Frank Ruhl, Heebo, PT Serif, PT Sans average 0.45 to 0.58 em a
// character): the lines wrap more than they will, so the layout is tried against the worst text it can meet.
const wide: VideoMeasure = (text, _role, _weight, px) => text.length * px * 0.62
const typical: VideoMeasure = (text, _role, _weight, px) => text.length * px * 0.5

// ---------- the oracle: the layout of the video before the portrait, copied from the component as it was ----------

function oldPositions(card: TodayCard, measure: VideoMeasure) {
  const nSize = nameSize(card.name)
  const nameLines = wrapWords(card.name, 940, s => measure(s, 'serif', 700, nSize), 3)
  const lineLines = card.line ? wrapWords(card.line, 900, s => measure(s, 'sans', 500, 40), 5) : []
  const nameH = nameLines.length * nSize * 1.12
  const total = 70 + 44 + nameH + (card.sub ? 30 + 44 : 0) + (lineLines.length ? 46 + lineLines.length * 58 : 0)
  let y = Math.max(860, 860 + (720 - total) / 2)
  const pillY = y
  y += 70 + 44
  const names: Array<{ text: string; y: number }> = []
  nameLines.forEach(l => { y += nSize; names.push({ text: l, y }); y += nSize * 0.12 })
  let subY: number | null = null
  if (card.sub) { y += 30 + 40; subY = y; y += 4 }
  const core: Array<{ text: string; y: number }> = []
  if (lineLines.length) {
    y += 46
    lineLines.forEach(l => { y += 52; core.push({ text: l, y }); y += 6 })
  }
  return { nSize, pillY, names, subY, core }
}

console.log('\nwithout a portrait: the video as it was')

test('the layout equals the old formulas bit for bit, for every roster sage in three languages', () => {
  let n = 0
  for (const measure of [wide, typical]) {
    for (const { loc, id, card } of cards(false)) {
      const old = oldPositions(card, measure)
      const L = videoLayout(card, measure)
      const where = `${id} ${loc}`
      assert.equal(L.portrait, undefined, where)
      assert.deepEqual([L.medallion.cy, L.medallion.size, L.glow.cy, L.glow.r, L.headingY, L.dateY], [400, 300, 400, 520, 640, 728], where)
      assert.deepEqual(L.footer, { moreY: 1690, hostY: 1745, appY: 1800 }, where)
      assert.equal(L.pill.y, old.pillY, where)
      assert.equal(L.pill.h, 70, where)
      assert.equal(L.nameSize, old.nSize, where)
      assert.deepEqual(L.nameLines, old.names, where)
      assert.equal(L.subY, old.subY, where)
      assert.deepEqual(L.coreLines, old.core, where)
      n++
    }
  }
  assert.ok(n >= 2 * 3 * 400, `only ${n} cards compared`)
})

test('a card whose portrait did not load (the portrait key removed) is laid out as the old card', () => {
  for (const { card } of cards(true).slice(0, 60)) {
    const without = videoLayout({ ...card, portrait: undefined }, wide)
    assert.deepEqual(without, videoLayout({ ...card, portrait: undefined }, wide))
    assert.deepEqual(without.nameLines, oldPositions(card, wide).names)
    assert.equal(without.portrait, undefined)
  }
})

test('without a portrait every cue is the old one: 2.0, 2.5, 3.3, 4.3 (+0.55 a line), then 8.6, 8.8, 9.0', () => {
  const c = videoCues(false)
  assert.deepEqual([c.pill, c.name, c.sub, c.line, c.lineStep, c.more, c.host, c.app], [2.0, 2.5, 3.3, 4.3, 0.55, 8.6, 8.8, 9.0])
  assert.equal(cardZoom(0), 1)
  assert.equal(cardZoom(VIDEO.seconds), 1 + CARD_DRIFT)
  assert.equal(CARD_DRIFT, 0.025)
  assert.deepEqual([VIDEO.width, VIDEO.height, VIDEO.fps, VIDEO.seconds], [1080, 1920, 30, 12])
})

// ---------- with a portrait ----------

console.log('\nwith a portrait')

/** [top, bottom] of what a text baseline covers (ascent 0.85 em, descent 0.25 em: generous for these fonts). */
const textBox = (baseline: number, px: number): [number, number] => [baseline - 0.85 * px, baseline + 0.25 * px]

function blocksOf(L: VideoLayout, push = 1): Array<{ name: string; box: [number, number] }> {
  const p = L.portrait!
  const grow = (p.size * (push - 1)) / 2
  const out: Array<{ name: string; box: [number, number] }> = [
    { name: 'medallion', box: [L.medallion.cy - (L.medallion.size * 1.012) / 2, L.medallion.cy + (L.medallion.size * 1.012) / 2] },
    { name: 'heading', box: textBox(L.headingY, 46) },
    { name: 'date', box: textBox(L.dateY, 58) },
    { name: 'portrait', box: [p.y - grow, p.y + p.size + grow] },
    { name: 'caption', box: textBox(p.captionY, 28) },
    { name: 'pill', box: [L.pill.y, L.pill.y + L.pill.h] },
  ]
  L.nameLines.forEach((l, i) => out.push({ name: `name${i}`, box: textBox(l.y, L.nameSize) }))
  if (L.subY !== null) out.push({ name: 'sub', box: textBox(L.subY, 40) })
  L.coreLines.forEach((l, i) => out.push({ name: `core${i}`, box: textBox(l.y, 40) }))
  out.push({ name: 'more', box: textBox(L.footer.moreY, 34) }, { name: 'host', box: textBox(L.footer.hostY, 32) }, { name: 'app', box: textBox(L.footer.appY, 30) })
  return out
}

test('for every roster sage in three languages, with a wide measure: the picture is 240 to 368 px, centred, inside the card', () => {
  const sizes = new Set<number>()
  for (const { loc, id, card } of cards(true)) {
    const L = videoLayout(card, wide)
    const p = L.portrait!
    const where = `${id} ${loc}`
    assert.ok(p, where)
    assert.ok(p.size >= PORTRAIT_VIDEO_MIN && p.size <= PORTRAIT_VIDEO_MAX, `${where}: ${p.size}`)
    assert.equal(p.size % 2, 0, `${where}: an even side keeps the picture on whole pixels`)
    assert.equal(p.x + p.size / 2, VIDEO.width / 2, where)
    assert.ok(p.x >= 0 && p.x + p.size <= VIDEO.width, where)
    sizes.add(p.size)
  }
  assert.ok(sizes.has(PORTRAIT_VIDEO_MAX), 'a short text gets the largest picture')
  assert.ok(Math.min(...sizes) < PORTRAIT_VIDEO_MAX, 'a long text gets a smaller one')
})

test('no block overlaps another, even with the push-in; all stay inside the card; the footer is at 1690, 1745 and 1800', () => {
  for (const measure of [wide, typical]) {
    for (const { loc, id, card } of cards(true)) {
      const L = videoLayout(card, measure)
      const where = `${id} ${loc}`
      assert.deepEqual(L.footer, { moreY: 1690, hostY: 1745, appY: 1800 }, where)
      const blocks = blocksOf(L, 1 + PORTRAIT_PUSH)
      for (let i = 1; i < blocks.length; i++) {
        const a = blocks[i - 1], b = blocks[i]
        assert.ok(b.box[0] >= a.box[1], `${where}: ${b.name} (${b.box[0]}) overlaps ${a.name} (${a.box[1]})`)
      }
      for (const b of blocks) assert.ok(b.box[0] >= 18 && b.box[1] <= VIDEO.height - 18, `${where}: ${b.name} outside the card`)
      // the middle ends clear of the first footer line, with the card's drift taken into account
      assert.ok(L.bottom <= 1610, `${where}: ends at ${L.bottom}`)
    }
  }
})

test('the caption is always there; every line is as wide as the card allows; the core idea has at most 5 lines', () => {
  for (const { loc, id, card } of cards(true)) {
    const L = videoLayout(card, wide)
    const where = `${id} ${loc}`
    assert.ok(L.portrait!.captionY > L.portrait!.y + L.portrait!.size, where)
    assert.ok(L.nameLines.length >= 1 && L.nameLines.length <= 3, where)
    assert.ok(L.coreLines.length <= 5, where)
    // (a cut line carries an ellipsis the wrapping did not measure: one character of slack)
    for (const l of L.nameLines) assert.ok(wide(l.text, 'serif', 700, L.nameSize) <= 940 + wide('…', 'serif', 700, L.nameSize) || !l.text.includes(' '), `${where}: name line too wide`)
    for (const l of L.coreLines) assert.ok(wide(l.text, 'sans', 500, 40) <= 900 + wide('…', 'sans', 500, 40) || !l.text.includes(' '), `${where}: core line too wide`)
    assert.ok(wide(card.portrait!.caption, 'sans', 500, 28) <= 940, `${where}: caption too wide`)
  }
})

test('a long text shrinks the picture toward 240 first, and only then cuts the core idea (5 lines, then 3, 2, 1)', () => {
  for (const measure of [wide, typical]) {
    for (const { loc, id, card } of cards(true)) {
      const L = videoLayout(card, measure)
      const full = card.line ? wrapWords(card.line, 900, s => measure(s, 'sans', 500, 40), 5).length : 0
      if (L.coreLines.length < full) {
        assert.equal(L.portrait!.size, PORTRAIT_VIDEO_MIN, `${id} ${loc}: the core idea was cut while the picture was ${L.portrait!.size}`)
      }
    }
  }
  // synthetic worst cases: a three-line name at 84 px with a five-line core idea (more than any roster sage has), then a
  // text no room can hold
  const base = cardOf(sages[0], 'en', true)
  const worst: TodayCard = { ...base, name: 'Abcdefghi '.repeat(4).trim(), sub: 'Acharonim  ·  1700–1800', line: 'word '.repeat(60).trim() }
  assert.equal(nameSize(worst.name), 84)
  const L = videoLayout(worst, wide)
  assert.equal(L.nameLines.length, 3)
  assert.equal(L.portrait!.size, PORTRAIT_VIDEO_MIN)
  assert.ok(L.coreLines.length >= 1 && L.coreLines.length <= 4, `${L.coreLines.length} core lines`)
  assert.ok(L.coreLines[L.coreLines.length - 1].text.endsWith('…'), 'a cut core idea ends with an ellipsis')
  assert.ok(L.bottom <= 1610, `ends at ${L.bottom}`)
  // the most lines that fit: with one more the stack (picture 240, caption, pill, name, era line, core idea) would end below the limit
  const heightWith = (lines: number) => 516 + 240 + 84 + 70 + 44 + L.nameLines.length * nameSize(worst.name) * 1.12 + 74 + 46 + lines * 58
  assert.ok(heightWith(L.coreLines.length) <= 1610 && heightWith(L.coreLines.length + 1) > 1610, `${L.coreLines.length} lines`)
  const huge = videoLayout({ ...worst, name: `${'W'.repeat(30)} `.repeat(14).trim() }, wide)
  assert.equal(huge.nameLines.length, 3)
  assert.ok(huge.portrait!.size >= PORTRAIT_VIDEO_MIN)
  assert.ok(huge.bottom <= 1610, `a name the width of the card three times over still ends at ${huge.bottom}`)
})

test('a short text gives the picture the most: with the typical measure the median sage is 300 px or more with the whole core idea', () => {
  const sizes: number[] = []
  let whole = 0
  let n = 0
  for (const { card } of cards(true)) {
    const L = videoLayout(card, typical)
    sizes.push(L.portrait!.size)
    const full = card.line ? wrapWords(card.line, 900, s => typical(s, 'sans', 500, 40), 5).length : 0
    if (L.coreLines.length === full) whole++
    n++
  }
  sizes.sort((a, b) => a - b)
  assert.ok(sizes[Math.floor(sizes.length / 2)] >= 300, `median ${sizes[Math.floor(sizes.length / 2)]}`)
  assert.ok(whole / n >= 0.9, `${whole} of ${n} keep the whole core idea`)
})

test('the medallion shrinks (170), the heading and the date move up, and the text starts under the picture and its caption', () => {
  const L = videoLayout(cardOf(sages[0], 'en', true), typical)
  const p = L.portrait!
  assert.deepEqual([L.medallion.size, L.headingY < 640, L.dateY < 728], [170, true, true])
  assert.ok(p.y > L.dateY && p.captionY > p.y + p.size && L.pill.y > p.captionY)
  assert.equal(p.radius, 60)
})

test('with a portrait the later cues come half a second later and the core idea is whole before the footer starts at 8.6 s', () => {
  const plain = videoCues(false)
  const c = videoCues(true)
  assert.deepEqual([c.portrait, c.ring, c.caption], [1.4, 1.6, 2.0])
  assert.ok(c.portrait > 1.0, 'after the date has begun')
  for (const k of ['pill', 'name', 'sub', 'line'] as const) assert.ok(Math.abs(c[k] - plain[k] - 0.5) < 1e-9, k)
  assert.deepEqual([c.more, c.host, c.app, c.lineStep], [8.6, 8.8, 9.0, 0.55])
  // the picture has come in (0.9 s) and the ring is drawn (0.8 s) before the pill
  assert.ok(c.portrait + 0.9 <= c.pill + 0.5 && c.ring + 0.8 <= c.pill + 0.1)
  // 5 core lines: the last starts at line + 4 * step and takes 0.7 s
  assert.ok(c.line + 4 * c.lineStep + 0.7 <= c.more, 'the fifth line is whole before the footer')
})

test('the picture is never drawn larger than its 384 px file: not with the fade-in, the push-in and the card\'s drift', () => {
  assert.equal(PORTRAIT_FILE_PX, 384)
  const cues = videoCues(true)
  let max = 0
  for (let t = 0; t <= VIDEO.seconds + 1e-9; t += 1 / VIDEO.fps) max = Math.max(max, portraitDrawPx(PORTRAIT_VIDEO_MAX, t, cues))
  assert.ok(max <= PORTRAIT_FILE_PX, `drawn up to ${max.toFixed(1)} px`)
  assert.ok(max > 360, `the largest picture is not pointlessly small (${max.toFixed(1)})`)
  // the scale: 0.9 when it starts, 1 + push at the end, never backwards after the fade
  assert.ok(Math.abs(portraitScale(cues.portrait, cues) - 0.9) < 1e-9)
  assert.ok(Math.abs(portraitScale(VIDEO.seconds, cues) - (1 + PORTRAIT_PUSH)) < 1e-9)
  assert.ok(PORTRAIT_PUSH <= 0.04)
  let prev = 0
  for (let t = cues.portrait; t <= VIDEO.seconds; t += 0.05) { const s = portraitScale(t, cues); assert.ok(s >= prev - 1e-12); prev = s }
  assert.ok(phase(cues.portrait + 0.9, cues.portrait, 0.9) === 1)
})

// ---------- drawing, on a recording canvas ----------

interface Call { op: string; args: unknown[]; scale: number; alpha: number }
/** A 2D context that keeps the transform (translate, scale, save, restore) and records every call. */
function recorder() {
  const calls: Call[] = []
  const stack: Array<{ sx: number; alpha: number }> = []
  let cur = { sx: 1, alpha: 1 }
  const state: Record<string, unknown> = { globalAlpha: 1 }
  const ctx: Record<string, unknown> = new Proxy(state, {
    get(target, prop: string) {
      if (prop === 'globalAlpha') return cur.alpha
      if (prop === 'save') return () => { stack.push({ ...cur }) }
      if (prop === 'restore') return () => { cur = stack.pop() ?? cur }
      if (prop === 'scale') return (x: number) => { cur.sx *= x }
      if (prop === 'translate' || prop === 'setTransform') return () => {}
      if (prop === 'createRadialGradient') return (...args: unknown[]) => { calls.push({ op: prop, args, scale: cur.sx, alpha: cur.alpha }); return { addColorStop: () => {} } }
      if (prop === 'measureText') return (s: string) => ({ width: s.length * 20 })
      if (prop in target) return target[prop]
      return (...args: unknown[]) => { calls.push({ op: prop, args, scale: cur.sx, alpha: cur.alpha }) }
    },
    set(target, prop: string, value) {
      if (prop === 'globalAlpha') { cur.alpha = value as number; return true }
      target[prop] = value
      return true
    },
  })
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

const medallion = { tag: 'medallion' } as unknown as CanvasImageSource
const face = { tag: 'face' } as unknown as CanvasImageSource
const fonts = { serif: 'serif', sans: 'sans-serif' }

function frame(card: TodayCard, t: number, assets: VideoAssets, L: VideoLayout) {
  const r = recorder()
  drawTodayFrame(r.ctx, t, card, assets, L)
  return r.calls
}

test('the portrait is drawn at no more than 384 px at any moment of any frame, and not at all before it comes in', () => {
  for (const loc of LOCALES) {
    const card = cardOf(sages[0], loc, true)
    const L = videoLayout(card, typical)
    const cues = videoCues(true)
    let max = 0
    for (let t = 0; t <= VIDEO.seconds; t += 0.1) {
      const faces = frame(card, t, { fonts, medallion, portrait: face }, L).filter(c => c.op === 'drawImage' && c.args[0] === face)
      if (t < cues.portrait) assert.equal(faces.length, 0, `${loc} t=${t}`)
      for (const c of faces) {
        const w = (c.args[3] as number) * c.scale
        max = Math.max(max, w)
        assert.equal(c.args[3], c.args[4], 'the picture is square')
        assert.equal(c.args[3], L.portrait!.size - 2 * PORTRAIT_RING)
      }
    }
    assert.ok(max <= PORTRAIT_FILE_PX && max > 200, `${loc}: drawn up to ${max}`)
  }
})

test('the ring draws round (a dash that grows to the whole path) and the glow is in the era colour', () => {
  const card = cardOf(sages[0], 'en', true)
  const L = videoLayout(card, typical)
  const cues = videoCues(true)
  const dashes = (t: number) => {
    const out: number[] = []
    const r = recorder()
    const real = r.ctx as unknown as Record<string, unknown>
    drawTodayFrame(new Proxy(r.ctx, {
      get(target, prop) { if (prop === 'setLineDash') return (d: number[]) => out.push(d[0] ?? -1); return real[prop as string] },
      set(target, prop, v) { (real as Record<string, unknown>)[prop as string] = v; return true },
    }), t, card, { fonts, medallion, portrait: face }, L)
    return out
  }
  assert.deepEqual(dashes(cues.ring - 0.1), [], 'no ring before it starts')
  const mid = dashes(cues.ring + 0.3)
  assert.equal(mid.length, 1)
  const late = dashes(cues.ring + 0.6)
  assert.ok(late[0] > mid[0], 'the arc grows')
  assert.deepEqual(dashes(cues.ring + 1.2), [], 'a finished ring is solid, with no dash')
  assert.match(withAlpha('#2980b9', 0.5), /^rgba\(41,128,185,0\.5\)$/)
  assert.match(withAlpha('#abc', 1), /^rgba\(170,187,204,1\)$/)
  assert.match(withAlpha('hsl(1,2%,3%)', 1), /^rgba\(201,151,58,1\)$/, 'anything else falls back to the gold')
})

test('a card whose picture did not load is drawn as the old card: no picture, no ring, the same calls', () => {
  const card = cardOf(sages[0], 'he', true)
  const plain = { ...card, portrait: undefined }
  const Lplain = videoLayout(plain, typical)
  for (const t of [0.5, 1, 3, 6, 11]) {
    const calls = frame(plain, t, { fonts, medallion, portrait: null }, Lplain)
    assert.ok(!calls.some(c => c.op === 'drawImage' && c.args[0] === face))
    assert.ok(!calls.some(c => c.op === 'clip' || c.op === 'setLineDash'))
  }
  // a layout with a portrait but no loaded picture (never made by the component) also draws none
  const L = videoLayout(card, typical)
  const calls = frame(card, 6, { fonts, medallion, portrait: null }, L)
  assert.ok(!calls.some(c => c.op === 'drawImage' && c.args[0] === face))
})

test('frames without a portrait draw the same sequence of calls whatever the cues for a portrait are', () => {
  const card = { ...cardOf(sages[0], 'en', false) }
  const L = videoLayout(card, typical)
  const a = frame(card, 6, { fonts, medallion }, L)
  const b = frame(card, 6, { fonts, medallion, portrait: null }, L)
  assert.deepEqual(a, b)
  assert.ok(a.some(c => c.op === 'fillText' && c.args[0] === card.name))
})

// ---------- wiring ----------

console.log('\nwiring')

test('the page passes src and caption only when the sage has a portrait, from portraitOf and portraitCredit', () => {
  const page = read('app/[locale]/today/page.tsx')
  assert.match(page, /import \{ portraitCredit, portraitOf \} from '@\/lib\/portraits'/)
  assert.match(page, /const portrait = portraitOf\(t\.featured\.id\)/)
  assert.match(page, /\.\.\.\(portrait \? \{ portrait: \{ src: portrait\.src, caption: portraitCredit\(portrait, loc\) \} \} : \{\}\)/)
  // the story image and the card text are not changed by it
  assert.doesNotMatch(read('app/[locale]/today/story/route.tsx'), /todayVideo/)
})

test('the component loads the picture with the other assets, falls back to the card without it and lays out once', () => {
  const comp = read('components/today/TodayVideo.tsx')
  assert.match(comp, /^'use client'/)
  assert.match(comp, /import \{ drawTodayFrame, type VideoAssets, type VideoFonts \} from '\.\/drawTodayFrame'/)
  assert.match(comp, /img\.src = card\.portrait\.src/)
  assert.match(comp, /await img\.decode\(\)/)
  assert.match(comp, /catch \{[^}]*\}/, 'a picture that fails to load is swallowed')
  assert.match(comp, /videoLayout\(assets\.portrait \? card : \{ \.\.\.card, portrait: undefined \}, canvasMeasure\(assets\.fonts\)\)/)
  // computed once per video, never per frame
  assert.equal((comp.match(/layoutFor\(/g) ?? []).length, 2, 'defined once and called once')
  const loop = comp.slice(comp.indexOf('for (let i = 0; i < frames; i++)'), comp.indexOf('await encoder.flush()'))
  assert.doesNotMatch(loop, /videoLayout|layoutFor|canvasMeasure/)
  assert.equal((comp.match(/drawTodayFrame\(ctx,/g) ?? []).length, 2, 'the encoder path and the recording path')
  // what the other tests pin stays
  assert.match(comp, /await import\('mp4-muxer'\)/)
  assert.match(comp, /MediaRecorder/)
  assert.match(comp, /if \(!can\) return null/)
  assert.doesNotMatch(comp, /from ['"][^'"]*lib\/portraits['"]|portraitOf|portraitCredit|PORTRAIT_CREDIT/)
})

test('the frame drawing is plain canvas code: no React, no DOM, no page', () => {
  const src = read('components/today/drawTodayFrame.ts')
  assert.doesNotMatch(src, /'use client'|from 'react'|\bdocument\b|\bwindow\b|\bnew Image\b|\bfetch\(/)
  assert.doesNotMatch(src, /lib\/portraits|portraitOf|portraitCredit|PORTRAIT_CREDIT/)
  const lib = read('lib/todayVideo.ts')
  assert.doesNotMatch(lib, /from ['"][^'"]*portraits['"]/)
  // the video's length, size and encoders are as they were
  assert.match(lib, /export const VIDEO = \{ width: 1080, height: 1920, fps: 30, seconds: 12 \} as const/)
  assert.match(lib, /codec: 'avc1\.640028'/)
  assert.equal((lib.match(/codec: 'avc1\./g) ?? []).length, 4)
  assert.equal(PORTRAIT_VIDEO_MIN, 240)
  assert.equal(PORTRAIT_VIDEO_MAX, 368)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
