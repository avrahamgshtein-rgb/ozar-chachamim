/**
 * The portrait on the share card (app/[locale]/sage/[id]/opengraph-image.tsx, 1200 x 630) and on the Today status
 * image (app/[locale]/today/story/route.tsx, 1080 x 1920), through lib/ogPortrait.ts:
 *  - Satori cannot read WebP, so both images take assets/og/portraits/<id>.jpg (a data URL), never the .webp files;
 *  - the caption drawn under the picture is the portrait's own wording by its kind (illustration or photo), never swapped;
 *  - a sage with no portrait keeps the old card and story (the medallion, no credit line);
 *  - the card's PNG stays under WhatsApp's ~300 KB preview limit (270 KB here) for the largest portraits, in all three
 *    languages; the status image stays under 1 MB.
 * It renders the real Image() and GET() with next/og (a spy on ImageResponse reads the element tree it is given), picks
 * its sages from portraitEntries() at run time and never names an id. `PORTRAITS_SHARE_ALL=1 npx tsx tests/portraitsShare.test.ts`
 * renders every portrait sage in all three languages and prints the largest card.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { getAllSages } from '../lib/serverData'
import { PORTRAIT_CREDIT, portraitEntries, portraitOf, type PortraitKind } from '../lib/portraits'
import { CARD_PORTRAIT_PX, ogCaption, ogPortrait, portraitImage, storyPortraitPx } from '../lib/ogPortrait'
import { isRtlText, rtlWords } from '../lib/ogText'
import { todayFeature } from '../lib/todayServer'
import { formatHebrewDate } from '../lib/today'
import { localizeSage } from '../lib/serverDataTranslator'
import { labelParts } from '../lib/displayName'
import type { Locale } from '../lib/types'

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
const LOCALES: Locale[] = ['he', 'en', 'ru']
const KINDS: PortraitKind[] = ['illustration', 'photo']
const MAX_CARD = 270 * 1024
const MAX_STORY = 1024 * 1024

let passed = 0
let failed = 0
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

// ----- reading what a route drew ------------------------------------------------------------------------------

interface Img { src: string; width: number }
/** Every text node and every <img> of an element tree, expanding the card's function components (OgLine has no hooks). */
function inspect(root: unknown) {
  const texts: string[] = []
  const imgs: Img[] = []
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
    walk(el.props?.children)
  }
  walk(root)
  return { texts, imgs, undefinedStyles }
}

/** Where the line is drawn, or -1: its words (Hebrew: in visual order, as the boxes OgLine makes) follow each other in the tree. */
function lineAt(texts: string[], line: string): number {
  const want = isRtlText(line) ? rtlWords(line) : [line]
  for (let i = 0; i + want.length <= texts.length; i++) if (want.every((w, j) => texts[i + j] === w)) return i
  return -1
}
const drawsLine = (texts: string[], line: string) => lineAt(texts, line) >= 0

function pngSize(buf: Buffer) {
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'a PNG signature')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function jpegSize(buf: Buffer) {
  assert.equal(buf[0], 0xff); assert.equal(buf[1], 0xd8, 'a JPEG')
  let i = 2
  while (i < buf.length) {
    assert.equal(buf[i], 0xff, `marker at ${i}`)
    const m = buf[i + 1]
    const len = buf.readUInt16BE(i + 2)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
    i += 2 + len
  }
  throw new Error('no SOF marker')
}

// ----- choosing the sages (never by id) ----------------------------------------------------------------------

const entries = portraitEntries()
const jpgBytes = (id: string) => fs.statSync(path.join(app, 'assets/og/portraits', `${id}.jpg`)).size
/** The sage whose JPEG is the largest, the first photograph (the data holds the owner's approved ones), then others spread over the set. */
function pickSages(max: number): string[] {
  const ids = entries.map(([id]) => id)
  const picked: string[] = []
  const add = (id: string | undefined) => { if (id && !picked.includes(id) && picked.length < max) picked.push(id) }
  add([...ids].sort((a, b) => jpgBytes(b) - jpgBytes(a))[0])
  add(entries.find(([, e]) => e.kind === 'photo')?.[0])
  add(entries.find(([, e]) => e.kind === 'illustration')?.[0])
  for (let i = 0; picked.length < max && i < ids.length; i++) add(ids[Math.floor((i * ids.length) / max)])
  for (let i = 0; picked.length < max && i < ids.length; i++) add(ids[i])
  return picked
}
const ALL = process.env.PORTRAITS_SHARE_ALL === '1'
const sample = ALL ? entries.map(([id]) => id) : pickSages(5)
const noPortrait = getAllSages().find(s => !portraitOf(s.id))
const kindOf = (id: string): PortraitKind => portraitOf(id)!.kind

async function card(loc: Locale, id: string) {
  const Image = (await import('../app/[locale]/sage/[id]/opengraph-image')).default
  const before = captured.length
  const res = await Image({ params: Promise.resolve({ locale: loc, id }) })
  const buf = Buffer.from(await res.arrayBuffer())
  assert.equal(captured.length, before + 1, 'one ImageResponse')
  return { buf, tree: inspect(captured[before].element), options: captured[before].options }
}

/** The status image for a day whose featured sage is the one asked for (or any day when none is): next/og reads the clock, so the Date is fixed for the call. */
async function story(loc: Locale, day: Date) {
  const { GET } = await import('../app/[locale]/today/story/route')
  const RealDate = Date
  class FixedDate extends RealDate {
    constructor(...a: unknown[]) { if (a.length === 0) super(day.getTime()); else super(...(a as [number])) }
    static now() { return day.getTime() }
  }
  const before = captured.length
  ;(globalThis as { Date: DateConstructor }).Date = FixedDate as unknown as DateConstructor
  let res: Response
  try { res = await GET(new Request('http://localhost/'), { params: Promise.resolve({ locale: loc }) }) } finally { (globalThis as { Date: DateConstructor }).Date = RealDate }
  const buf = Buffer.from(await res.arrayBuffer())
  assert.equal(captured.length, before + 1, 'one ImageResponse')
  return { buf, tree: inspect(captured[before].element), options: captured[before].options, featured: todayFeature(day).featured }
}

/** Days (from a fixed start, so the run is the same every time) whose featured sage has a portrait: the first of each kind the data holds, up to `max`. */
function daysWithPortrait(max: number, limit = 1500): Array<{ day: Date; id: string }> {
  const out: Array<{ day: Date; id: string }> = []
  const kinds = new Set<PortraitKind>()
  const want = new Set(entries.map(([, e]) => e.kind))
  const seen = new Set<string>()
  for (let d = 0; d < limit && out.length < max; d++) {
    const day = new Date(Date.UTC(2026, 9, 17, 9) + d * 86_400_000)
    const id = todayFeature(day).featured.id
    if (!portraitOf(id) || seen.has(id)) continue
    seen.add(id); kinds.add(kindOf(id)); out.push({ day, id })
    if (kinds.size === want.size && out.length >= 2) break // both kinds the data holds, and more than one sage
  }
  return out
}

async function main() {
  console.log('\nthe files')

  await test('the data holds portraits, and the sample has the largest one', () => {
    assert.ok(entries.length > 0, 'no portraits in public/data-portraits.json')
    assert.ok(sample.length > 0)
    if (!ALL) assert.ok(sample.length <= 5)
    assert.ok(noPortrait, 'every sage has a portrait: the no-portrait cases cannot be tested')
  })

  await test('portraitImage: the sage\'s assets/og/portraits JPEG as a data URL; null for a sage with none and for ids that are not sages', async () => {
    for (const id of sample.slice(0, 5)) {
      const uri = await portraitImage(id)
      assert.ok(uri && uri.startsWith('data:image/jpeg;base64,'), `data URL for ${id}`)
      const bytes = Buffer.from(uri.slice('data:image/jpeg;base64,'.length), 'base64')
      assert.deepEqual(bytes, fs.readFileSync(path.join(app, 'assets/og/portraits', `${id}.jpg`)), 'the file, byte for byte')
      assert.deepEqual(jpegSize(bytes), { width: 320, height: 320 })
    }
    assert.equal(await portraitImage(noPortrait!.id), null)
    assert.equal(await portraitImage('no-such-sage'), null)
    assert.equal(await portraitImage('../../package'), null, 'an id is never a path')
    assert.equal(await portraitImage(''), null)
  })

  await test('ogPortrait: the picture with the caption of its kind, in every language; null with no portrait', async () => {
    for (const id of sample.slice(0, 5)) {
      for (const loc of LOCALES) {
        const p = await ogPortrait(id, loc)
        assert.ok(p)
        assert.equal(p.caption, PORTRAIT_CREDIT[kindOf(id)][loc])
        assert.ok(p.src.startsWith('data:image/jpeg;base64,'))
      }
    }
    for (const loc of LOCALES) assert.equal(await ogPortrait(noPortrait!.id, loc), null)
  })

  await test('ogCaption: the illustration wording for an illustration, the photo wording for a photograph, in all three languages', () => {
    const words = {
      illustration: { he: 'איור מתוך פרק הפודקאסט', en: 'Illustration from the podcast episode', ru: 'Иллюстрация из выпуска подкаста' },
      photo: { he: 'תמונה מתוך פרק הפודקאסט', en: 'Picture from the podcast episode', ru: 'Изображение из выпуска подкаста' },
    }
    for (const kind of KINDS) for (const loc of LOCALES) {
      assert.equal(ogCaption({ kind }, loc), words[kind][loc], `${kind} ${loc}`)
      assert.equal(ogCaption({ kind }, loc), PORTRAIT_CREDIT[kind][loc])
    }
    for (const loc of LOCALES) assert.notEqual(ogCaption({ kind: 'photo' }, loc), ogCaption({ kind: 'illustration' }, loc), 'never swapped')
  })

  await test('the routes use the JPEG helper and the portrait\'s own caption; nothing reads the webp files or the network', () => {
    const cardSrc = read('app/[locale]/sage/[id]/opengraph-image.tsx')
    const storySrc = read('app/[locale]/today/story/route.tsx')
    const lib = read('lib/ogPortrait.ts')
    for (const src of [cardSrc, storySrc]) {
      assert.ok(/ogPortrait\(/.test(src), 'a route asks lib/ogPortrait for the picture')
      assert.ok(!/\.webp|public\/portraits|fetch\(/.test(src.replace(/\/\/.*$/gm, '')), 'no webp, no public/portraits, no network')
      assert.ok(!/PORTRAIT_CREDIT|'illustration'|"illustration"/.test(src), 'the caption is never picked by hand in a route')
    }
    assert.ok(!/\.webp/.test(lib.replace(/\/\/.*$/gm, '')), 'lib/ogPortrait never reads a .webp file')
    assert.ok(/assets\/og\/portraits/.test(lib))
    assert.ok(/portraitCredit\(/.test(lib), 'the caption comes from lib/portraits')
    // the card's fonts list in lib/ogCard.tsx is checked file by file by share.test.ts: the per-id JPEGs stay out of it
    assert.ok(!/asset\('[^']*portraits/.test(read('lib/ogCard.tsx')))
    assert.ok(/size = \{ width: 1200, height: 630 \}/.test(cardSrc), 'the card is still 1200 x 630')
    assert.ok(/width: 1080, height: 1920/.test(storySrc), 'the story is still 1080 x 1920')
  })

  await test('lib/ogCard.tsx: OgLine gives Satori no undefined style value (it throws on one, which made every English and Russian card fail)', async () => {
    const { OgLine } = await import('../lib/ogCard')
    for (const text of ['Rashi', 'Рашi', 'רש"י'])
      for (const align of ['start', 'end', 'center'] as const) {
        const t = inspect(OgLine({ text, size: 20, color: '#fff', font: 'Heebo', weight: 500, align }))
        assert.deepEqual(t.undefinedStyles, [], `${text} ${align}`)
      }
  })

  await test('storyPortraitPx: between 260 and 440 in steps of 10, smaller for more text, larger with no core-idea line', () => {
    for (const loc of LOCALES) {
      for (const size of [70, 84, 100, 120]) {
        let prev = Infinity
        for (let len = 4; len <= 60; len += 4) {
          const px = storyPortraitPx('x'.repeat(len), size, 'y'.repeat(100), loc)
          assert.ok(px >= 260 && px <= 440 && px % 10 === 0, `${loc} ${size} ${len}: ${px}`)
          assert.ok(px <= prev, 'a longer name never gives a larger picture')
          prev = px
        }
        let prevLine = Infinity
        for (let len = 0; len <= 150; len += 10) {
          const px = storyPortraitPx('x'.repeat(20), size, 'y'.repeat(len), loc)
          assert.ok(px <= prevLine, 'a longer line never gives a larger picture')
          prevLine = px
        }
        assert.ok(storyPortraitPx('x'.repeat(20), size, '', loc) >= storyPortraitPx('x'.repeat(20), size, 'y'.repeat(10), loc))
      }
      assert.equal(storyPortraitPx('רבי', 120, 'קצר', loc), 440, 'a short name and line get the largest picture')
    }
  })

  console.log('\nthe share card')

  await test('a sage with a portrait: PNG 1200 x 630 under 270 KB in he, en and ru; the JPEG and the caption of his kind are drawn, the medallion is a badge', async () => {
    const sizes: string[] = []
    let largest = { id: '', loc: '', bytes: 0 }
    for (const id of sample) {
      const row: string[] = []
      for (const loc of LOCALES) {
        const { buf, tree, options } = await card(loc, id)
        assert.deepEqual(pngSize(buf), { width: 1200, height: 630 }, `${id} ${loc}`)
        assert.equal(options.width, 1200); assert.equal(options.height, 630)
        assert.ok(buf.length <= MAX_CARD, `${id} ${loc}: ${(buf.length / 1024).toFixed(0)} KB is over ${(MAX_CARD / 1024).toFixed(0)} KB`)
        if (buf.length > largest.bytes) largest = { id, loc, bytes: buf.length }
        row.push(`${loc} ${(buf.length / 1024).toFixed(0)}`)

        const jpeg = fs.readFileSync(path.join(app, 'assets/og/portraits', `${id}.jpg`)).toString('base64')
        const portraitImgs = tree.imgs.filter(i => i.src.startsWith('data:image/jpeg;base64,'))
        assert.equal(portraitImgs.length, 1, 'one portrait picture')
        assert.equal(portraitImgs[0].src, `data:image/jpeg;base64,${jpeg}`, 'the sage\'s own file')
        assert.ok(portraitImgs[0].width >= CARD_PORTRAIT_PX - 12 && portraitImgs[0].width <= CARD_PORTRAIT_PX)
        assert.ok(tree.imgs.some(i => i.src.startsWith('data:image/png') && i.width < 120), 'the medallion shrinks to a badge')
        assert.ok(!tree.imgs.some(i => i.src.startsWith('data:image/png') && i.width >= 300), 'no full-size medallion beside the portrait')
        const kind = kindOf(id)
        const other = KINDS.find(k => k !== kind)!
        assert.ok(drawsLine(tree.texts, PORTRAIT_CREDIT[kind][loc]), `${id} ${loc}: the ${kind} caption is drawn`)
        assert.ok(!drawsLine(tree.texts, PORTRAIT_CREDIT[other][loc]), `${id} ${loc}: not the ${other} caption`)
        assert.deepEqual(tree.undefinedStyles, [], 'no undefined style value')
      }
      sizes.push(`${id} (${kindOf(id)}, jpg ${(jpgBytes(id) / 1024).toFixed(0)} KB): ${row.join(', ')}`)
    }
    console.log(`       card PNG sizes in KB at ${CARD_PORTRAIT_PX} px:\n         ${ALL ? '(all portraits: see the largest)' : sizes.join('\n         ')}`)
    console.log(`       largest card: ${largest.id} ${largest.loc} ${(largest.bytes / 1024).toFixed(0)} KB (limit ${(MAX_CARD / 1024).toFixed(0)})`)
  })

  await test('a sage with no portrait keeps the old card in he, en and ru: the 330 px medallion, no credit line, a valid PNG', async () => {
    for (const loc of LOCALES) {
      const { buf, tree } = await card(loc, noPortrait!.id)
      assert.deepEqual(pngSize(buf), { width: 1200, height: 630 })
      assert.ok(buf.length <= MAX_CARD, `${loc}: ${(buf.length / 1024).toFixed(0)} KB`)
      assert.deepEqual(tree.imgs.map(i => [i.src.slice(0, 14), i.width]), [['data:image/png', 330]], 'only the medallion, as before')
      for (const kind of KINDS) assert.ok(!drawsLine(tree.texts, PORTRAIT_CREDIT[kind][loc]), 'no credit line')
      assert.deepEqual(tree.undefinedStyles, [])
    }
  })

  await test('an id that is not a sage still gets the card of the medallion alone', async () => {
    const { buf, tree } = await card('he', 'no-such-sage')
    assert.deepEqual(pngSize(buf), { width: 1200, height: 630 })
    assert.equal(tree.imgs.length, 1)
  })

  console.log('\nthe status image')

  const days = daysWithPortrait(4)

  await test('a day whose sage has a portrait: PNG 1080 x 1920 under 1 MB in he, en and ru; the JPEG and the caption of his kind between the date and the name', async () => {
    assert.ok(days.length > 0, 'no day within the scan has a featured sage with a portrait')
    const sizes: string[] = []
    for (const { day, id } of days) {
      const row: string[] = []
      for (const loc of LOCALES) {
        const { buf, tree, options, featured } = await story(loc, day)
        assert.equal(featured.id, id)
        assert.deepEqual(pngSize(buf), { width: 1080, height: 1920 }, `${id} ${loc}`)
        assert.equal(options.width, 1080); assert.equal(options.height, 1920)
        assert.ok(buf.length <= MAX_STORY, `${id} ${loc}: ${(buf.length / 1024).toFixed(0)} KB`)
        row.push(`${loc} ${(buf.length / 1024).toFixed(0)}`)

        const jpeg = fs.readFileSync(path.join(app, 'assets/og/portraits', `${id}.jpg`)).toString('base64')
        const portraitImgs = tree.imgs.filter(i => i.src.startsWith('data:image/jpeg;base64,'))
        assert.equal(portraitImgs.length, 1)
        assert.equal(portraitImgs[0].src, `data:image/jpeg;base64,${jpeg}`)
        assert.ok(portraitImgs[0].width >= 248 && portraitImgs[0].width <= 440, `portrait ${portraitImgs[0].width} px`)
        const medallion = tree.imgs.filter(i => i.src.startsWith('data:image/png'))
        assert.deepEqual(medallion.map(i => i.width), [170], 'the medallion shrinks to make room')
        const kind = kindOf(id)
        const other = KINDS.find(k => k !== kind)!
        assert.ok(drawsLine(tree.texts, PORTRAIT_CREDIT[kind][loc]), `${id} ${loc}: the ${kind} caption`)
        assert.ok(!drawsLine(tree.texts, PORTRAIT_CREDIT[other][loc]), `${id} ${loc}: not the ${other} caption`)
        // between the date and the name: the date line, then the picture's caption, then the sage's name
        const name = labelParts(localizeSage(featured, loc).label).name
        const dateAt = lineAt(tree.texts, formatHebrewDate(day, loc))
        const captionAt = lineAt(tree.texts, PORTRAIT_CREDIT[kind][loc])
        const nameAt = lineAt(tree.texts, name)
        assert.ok(dateAt >= 0 && dateAt < captionAt && captionAt < nameAt, `${id} ${loc}: date ${dateAt}, caption ${captionAt}, name ${nameAt}`)
        assert.deepEqual(tree.undefinedStyles, [])
      }
      sizes.push(`${id} (${kindOf(id)}): ${row.join(', ')}`)
    }
    console.log(`       story PNG sizes in KB:\n         ${sizes.join('\n         ')}`)
  })

  await test('a day whose sage has no portrait keeps the old status image in he, en and ru: the 300 px medallion alone, no credit line', async () => {
    let day: Date | null = null
    for (let d = 0; d < 400 && !day; d++) {
      const at = new Date(Date.UTC(2026, 9, 17, 9) + d * 86_400_000)
      if (!portraitOf(todayFeature(at).featured.id)) day = at
    }
    assert.ok(day, 'every featured sage has a portrait')
    for (const loc of LOCALES) {
      const { buf, tree } = await story(loc, day)
      assert.deepEqual(pngSize(buf), { width: 1080, height: 1920 })
      assert.deepEqual(tree.imgs.map(i => [i.src.slice(0, 14), i.width]), [['data:image/png', 300]])
      for (const kind of KINDS) assert.ok(!drawsLine(tree.texts, PORTRAIT_CREDIT[kind][loc]), 'no credit line')
    }
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
