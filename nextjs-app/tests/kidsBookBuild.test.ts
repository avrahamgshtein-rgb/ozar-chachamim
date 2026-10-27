/**
 * The reading edition of Saltiel's book ("היכן החכמה מתגוררת"), as scripts/build_kids_book.py writes it:
 * content/kids-books/saltiel.json and public/kids/books/saltiel/ against the owner's own edition they were built from
 * (data/kids-books/): the text is his, exactly (nothing rewritten, summarised or dropped), the structure is the
 * schema's, the pictures are within budget, and the generator is strict, deterministic and checks itself.
 *
 * Three independent comparisons, none of them the generator's own code:
 *   1. the JSON's text against the HTML edition's own text, tags stripped by a regular expression (not by the generator's parser);
 *   2. the JSON against the docx's text (the oracle, as the Drive connector extracts it): every line and table cell in order,
 *      except the print-only list in the meta file, which must be exactly the set that is missing;
 *   3. the generator run on copies of its input (clean, altered, with an unknown element, with a paragraph missing).
 * The runs need a Python with lxml and Pillow's WebP (/usr/bin/python3 on the cloud image, or KIDS_BOOK_PYTHON); without
 * one they are skipped and said so (KIDS_BOOK_REQUIRE_PYTHON=1 makes that a failure).
 */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { KIDS_ROUTES } from '../lib/kidsJourney'
import { segmentsOf, validateBook, type KidsBook, type Part, type Run } from '../lib/kidsBookTypes'

let passed = 0
let failed = 0
let skipped = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}
function skip(name: string, why: string) {
  skipped++
  console.log(`  skip ${name} (${why})`)
}
const say = (s: string) => console.log(`       ${s}`)

const ROOT = path.join(__dirname, '..')
const REPO = path.join(ROOT, '..')
const SCRIPT = path.join(REPO, 'scripts', 'build_kids_book.py')
const JSON_PATH = path.join(ROOT, 'content', 'kids-books', 'saltiel.json')
const IMG_DIR = path.join(ROOT, 'public', 'kids', 'books', 'saltiel')
const META_PATH = path.join(REPO, 'data', 'kids-books', 'saltiel.meta.json')

interface Meta {
  book: string; route: string
  source: { file: string; sha256: string; edition: string; drive: { html: string; docx: string } }
  oracle: { file: string; sha256: string; cover_lines: number }
  credit: { author: string; illustrator: string; rights: string }
  kinds: Record<string, string>
  print_only: Array<{ docx_line: string; reason: string }>
}
const meta: Meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'))
const book: KidsBook = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'))
const htmlBytes = fs.readFileSync(path.join(REPO, meta.source.file))
const html = htmlBytes.toString('utf8')
const oracle = fs.readFileSync(path.join(REPO, meta.oracle.file), 'utf8')
const sha256 = (b: Buffer | string) => crypto.createHash('sha256').update(b).digest('hex')

const ids = ['copyright', 'parents', 'map', 'timeline', 'prologue', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'epilogue', 'glossary', 'passport']
const slugs = ['copyright', 'parents', 'map', 'timeline', 'prologue', ...[1, 2, 3, 4, 5, 6, 7].map(n => `meeting-${n}`), 'epilogue', 'glossary', 'passport']
const kinds = ['front', 'front', 'front', 'front', 'intro', ...Array(7).fill('meeting'), 'closing', 'glossary', 'activities']
const KEY_NAMES = ['כיסופים', 'לדרוש', 'לקיים', 'לברר', 'להתבונן', 'לדבוק', 'ללמוד וללמד']

// ---- the book's text, in the order of the HTML edition and in the order of the docx ----

/** Every text of a part, in reading order. 'html': the edition's order, with the numbers the page shows (journey, timeline). 'docx': the docx's, where a list is numbered in its text and an index number is not text. */
function texts(part: Part, mode: 'html' | 'docx'): string[] {
  const out: string[] = []
  for (const t of [part.kick, part.title, part.subtitle]) if (t) out.push(t)
  for (const b of part.blocks) {
    switch (b.t) {
      case 'h': case 'p': out.push(b.text); break
      case 'sep': break
      case 'img': if (b.caption) out.push(b.caption); break
      case 'quote': out.push(b.text, b.source); break
      case 'card': out.push(b.title); for (const r of b.rows) out.push(r.label, r.text); break
      case 'key': out.push(b.title, b.text, b.verse, b.source); break
      case 'activity':
        out.push(b.title)
        if (b.intro) out.push(b.intro.text)
        b.items.forEach((it, i) => out.push((mode === 'docx' ? `${i + 1}.` : '') + it.text))
        break
      case 'links': for (const i of b.items) out.push(i.text); break
      case 'journey': for (const i of b.items) out.push(...(mode === 'html' ? [String(i.n)] : []), i.title, i.where, i.who); break
      case 'timeline':
        for (const i of b.items) out.push(...(mode === 'html' ? [String(i.n)] : []), i.hebrew, i.civil, i.place, i.region, ...(mode === 'html' ? [`מפגש ${i.n}`] : []))
        break
      case 'glossary': for (const i of b.items) out.push(i.term, i.text, i.idea); break
      case 'stamps': for (const i of b.items) out.push(i, b.box); break
    }
  }
  return out
}
const nowhite = (s: string) => s.replace(/\s+/g, '')
const plain = (s: string) => s.replace(/[״"]/g, '"').replace(/[׳']/g, "'")

function firstDiff(a: string, b: string): string {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return `first difference at ${i} (of ${a.length} and ${b.length}):\n  json: …${a.slice(Math.max(0, i - 50), i + 50)}…\n  html: …${b.slice(Math.max(0, i - 50), i + 50)}…`
}

// the edition's own text, with the pictures cut out of it
const noData = html.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, 'DATA')
const main = noData.slice(noData.indexOf('<main'), noData.indexOf('</main>'))
const cover = /<header class="cover"[\s\S]*?<\/header>/.exec(main)![0]
const body = main.replace(cover, '')
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length

// ---- the book ----

test('the book is valid, with the 15 sections of the edition in order, the right kinds, and the seven meetings numbered 1..7', () => {
  assert.deepEqual(validateBook(book), [])
  assert.equal(book.parts.length, 15)
  assert.deepEqual(book.parts.map(p => p.slug), slugs)
  assert.deepEqual(book.parts.map(p => p.id), ids)
  assert.deepEqual(book.parts.map(p => p.kind), kinds)
  assert.deepEqual(book.parts.filter(p => p.nav === false).map(p => p.slug), ['copyright'], 'only the copyright page is outside the contents')
  assert.deepEqual(book.parts.filter(p => p.kind === 'meeting').map(p => p.station), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(book.parts.filter(p => p.kind === 'meeting').map(p => p.kick), ['המפגש הראשון', 'המפגש השני', 'המפגש השלישי', 'המפגש הרביעי', 'המפגש החמישי', 'המפגש השישי', 'המפגש השביעי'])
  // the sections of the HTML, in order
  assert.deepEqual([...main.matchAll(/<section id="([^"]+)"/g)].map(m => m[1]), ids)
  // a meeting is a panel, a travel card, the story, its key, then its game and task
  for (const p of book.parts.filter(x => x.kind === 'meeting')) {
    const t = p.blocks.map(b => b.t)
    assert.deepEqual(t.slice(0, 2), ['img', 'card'], p.slug)
    assert.deepEqual(t.slice(-2), ['key', 'activity'], p.slug)
    assert.equal(p.blocks.filter(b => b.t === 'key').length, 1, p.slug)
  }
  assert.deepEqual(book.parts.filter(p => p.kind === 'meeting').map(p => p.blocks.find(b => b.t === 'key')).map(b => (b as { name: string }).name), KEY_NAMES)
  const words = book.parts.flatMap(p => texts(p, 'html')).join(' ').split(/\s+/).filter(Boolean).length
  say(`15 parts, ${words} whitespace-separated pieces of text, ${book.parts.reduce((n, p) => n + p.blocks.length, 0)} blocks`)
})

test('the contents labels are the edition\'s own contents links, in order', () => {
  const toc = /<aside id="toc"[^>]*>([\s\S]*?)<\/aside>/.exec(html)![1]
  const links = [...toc.matchAll(/<a href="#([^"]+)">([^<]*)<\/a>/g)].map(m => [m[1], m[2]])
  assert.deepEqual(links.map(l => l[0]), ids.slice(1))
  assert.deepEqual(book.parts.filter(p => p.nav).map(p => [p.id, p.tocLabel]), links)
})

test('the five unfilled fields of the copyright page are placeholders, only there, and the credit is the owner\'s words', () => {
  const ph = book.parts.flatMap(p => p.blocks.filter(b => b.t === 'p' && b.placeholder).map(b => [p.slug, (b as { text: string }).text]))
  assert.deepEqual(ph, [
    ['copyright', 'כתיבה ועריכה: אברהם שם משפחה'],
    ['copyright', 'ציורים מקוריים: שם המאייר הצעיר'],
    ['copyright', 'מסת"ב (ספר מודפס): ISBN'],
    ['copyright', 'מסת"ב (ספר אלקטרוני): ISBN'],
    ['copyright', 'ליצירת קשר: כתובת דוא"ל'],
  ])
  assert.equal(count(main, /<mark>/g), 5, 'the edition marks exactly five fields')
  for (const p of book.parts) for (const b of p.blocks) if (b.t === 'p' && !b.placeholder) assert.ok(!/שם משפחה|שם המאייר|ISBN|כתובת דוא/.test(b.text), `${p.slug}: ${b.text.slice(0, 40)}`)
  assert.deepEqual(book.credit, meta.credit)
  assert.deepEqual(book.credit, { author: 'אברהם גולדשטיין', illustrator: 'משה יהודה גולדשטיין', rights: '© כל הזכויות שמורות למשפחת גולדשטיין' })
  assert.equal(book.source.sha256, sha256(htmlBytes))
  assert.equal(meta.source.sha256, sha256(htmlBytes))
  assert.equal(meta.oracle.sha256, sha256(oracle))
  assert.equal(book.source.file, meta.source.file)
  assert.equal(book.source.edition, '2026-10-17')
})

// ---- 1. the JSON against the HTML edition's own text ----

test('the JSON\'s text is exactly the HTML edition\'s text: every character of <main>, in order, none added, none lost', () => {
  assert.ok(!/&[#\w]+;/.test(main), 'the edition has no HTML entities, so tags stripped is the text')
  assert.ok(!/<!--/.test(main))
  const htmlText = nowhite(body.replace(/<[^>]*>/g, '')).replace(/·/g, '')        // the "·" separators of the map and timeline rows are layout
  const jsonText = nowhite(book.parts.flatMap(p => texts(p, 'html')).join('')).replace(/·/g, '')
  assert.ok(jsonText === htmlText, firstDiff(jsonText, htmlText))
  say(`${htmlText.length} characters (without spaces) of the edition's body text are all in the JSON, in order`)
  // the cover's four fields
  const field = (re: RegExp) => re.exec(cover)![1]
  assert.equal(book.kick, field(/<p class="kick">([^<]*)<\/p>/))
  assert.equal(book.title, field(/<h1 class="title">([^<]*)<\/h1>/))
  assert.equal(book.subtitle, field(/<p class="sub">([^<]*)<\/p>/))
  assert.equal(book.age, field(/<p class="age">([^<]*)<\/p>/))
  assert.equal(book.cover.alt, field(/<img [^>]*alt="([^"]*)"/))
})

test('the text is untouched: the book\'s ASCII quotes and apostrophes, its nikud and its dashes are kept, nothing was converted', () => {
  const all = JSON.stringify(book)
  assert.ok(!/[״׳]/.test(html) && !/[״׳]/.test(all), 'the edition uses the ASCII " and \' and so does the JSON: gershayim are applied by the reader, at display')
  const flat = book.parts.flatMap(p => texts(p, 'html'))
  for (const s of ['המהר"ל', "ד'תש\"י", 'נִכְסְפָה וְגַם כָּלְתָה נַפְשִׁי', 'ה\' הִיא חָכְמָה']) assert.ok(flat.some(t => t.includes(s)), s)
  assert.ok(flat.some(t => t.includes(' — ')) && flat.some(t => t.includes(' - ')), 'em dashes and hyphens as the edition has them')
  assert.equal(count(all, /—/g), count(body, /—/g), 'every em dash of the edition')
  assert.ok(flat.every(t => !t.includes('\\')), 'no markdown escape (\\!) from the docx\'s text: the book is built from the edition, not from the oracle')
})

test('the paragraphs are the edition\'s paragraphs: one element, one block (nothing merged, split or dropped)', () => {
  const c = { p: 0, h2: 0, h3: 0, li: 0, figure: 0 }
  for (const p of book.parts) {
    c.p += (p.kick ? 1 : 0) + (p.subtitle ? 1 : 0) + (p.id === 'copyright' ? 1 : 0)
    for (const b of p.blocks) {
      if (b.t === 'p' || b.t === 'links') c.p += 1
      if (b.t === 'h') c[b.level === 2 ? 'h2' : 'h3'] += 1
      if (b.t === 'img') c.figure += 1
      if (b.t === 'quote') c.p += 1
      if (b.t === 'card') c.p += 1 + b.rows.length
      if (b.t === 'key') c.p += 3
      if (b.t === 'activity') { c.h3 += 1; c.p += b.intro ? 1 : 0; c.li += b.items.length }
      if (b.t === 'journey' || b.t === 'timeline') c.li += b.items.length
    }
  }
  assert.equal(c.p, count(body, /<p[ >]/g), '<p> elements')
  assert.equal(c.h2, count(body, /<h2[ >]/g), '<h2>')
  assert.equal(c.h3, count(body, /<h3[ >]/g), '<h3> (the parents\' chapter map and the activities)')
  assert.equal(c.li, count(body, /<li[ >]/g), '<li>')
  assert.equal(c.figure, count(body, /<figure[ >]/g), '<figure>')
  assert.equal(book.parts.filter(p => p.id !== 'copyright').length, count(body, /<h1[ >]/g), '<h1> (one per part but the copyright page)')
  assert.equal(count(body, /<hr[ >]/g), book.parts.flatMap(p => p.blocks).filter(b => b.t === 'sep').length, '<hr>')
})

test('emphasis: the JSON\'s marks are the edition\'s <em>, <b> and <strong>, with the same words, in order', () => {
  const runs: Run[] = []
  for (const p of book.parts) for (const b of p.blocks) {
    if (b.t === 'h' || b.t === 'p') runs.push(b)
    if (b.t === 'activity') { if (b.intro) runs.push(b.intro); runs.push(...b.items) }
  }
  for (const r of runs) for (const m of r.marks ?? []) assert.ok(m.from >= 0 && m.to <= r.text.length && m.from < m.to, `mark ${m.k} ${m.from}..${m.to} in "${r.text.slice(0, 30)}"`)
  const markedBy = (k: string) => runs.flatMap(r => segmentsOf(r).filter(s => s.mark === k).map(s => s.text))
  const em = [...body.matchAll(/<em>([^<]*)<\/em>/g)].map(m => m[1])
  assert.deepEqual(markedBy('em'), em)
  // bold: every <b>/<strong> of the body except the ones inside the journey, timeline and passport rows
  const loose = body.replace(/<ol class="(?:journey|timeline)">[\s\S]*?<\/ol>/g, '').replace(/<div class="stamps">[\s\S]*?<\/section>/, '')
  const bold = [...loose.matchAll(/<(b|strong)>([^<]*)<\/\1>/g)].map(m => m[2])
  assert.deepEqual(markedBy('b'), bold)
  assert.equal(markedBy('small').length, 0)
  assert.equal(count(loose.replace(/<p class="key-src">[\s\S]*?<\/p>/g, ''), /<small>/g), 0, 'no <small> emphasis in running text')
  say(`${em.length} emphasised passages (em) and ${bold.length} bold (b, strong): the same words as the edition's tags`)
})

// ---- 2. the JSON against the docx's text ----

const normCmp = (t: string) => t.replace(/\\/g, '').replace(/״/g, '"').replace(/׳/g, "'").replace(/[“”„]/g, '"').replace(/[’‘]/g, "'")
  .replace(/[–—―־]/g, '-').replace(/\.{5,}/g, '').replace(/\s+/g, '')

function oracleSegments(text: string): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    const s = line.trim()
    if (!s) continue
    if (s.startsWith('|')) {
      if (/^\|[\s:\-|]*$/.test(s)) continue                                    // a table rule or an empty row
      for (let c of s.replace(/^\|+|\|+$/g, '').split('|')) { c = c.trim(); if (c && !/^\d+$/.test(c)) out.push(c) }   // a number alone is a page or meeting number
    } else out.push(s)
  }
  return out
}

test('the docx\'s text is in the JSON: every line and table cell, in order, except the print-only list, which is exactly what is missing', () => {
  const segs = oracleSegments(oracle)
  const coverLines = [`${book.title}: ${book.subtitle}`, book.title, book.title, book.subtitle, book.kick, book.age]
  assert.equal(meta.oracle.cover_lines, 6)
  assert.deepEqual(segs.slice(0, 6).map(normCmp), coverLines.map(normCmp), 'the first six lines of the docx are the cover')
  const rest = segs.slice(6)
  const stream = book.parts.flatMap(p => texts(p, 'docx')).map(normCmp).join('')
  let pos = 0
  const missing: string[] = []
  for (const s of rest) {
    const n = normCmp(s)
    const i = stream.indexOf(n, pos)
    if (i < 0) missing.push(s)
    else pos = i + n.length
  }
  assert.ok(rest.length > 600, `only ${rest.length} segments read from the oracle`)
  assert.deepEqual([...missing].sort(), meta.print_only.map(e => e.docx_line).sort(), 'the segments not found must be exactly the print_only list')
  for (const e of meta.print_only) {
    assert.ok(e.reason.trim().length > 20, `print_only needs a reason: ${e.docx_line.slice(0, 40)}`)
    assert.ok(segs.includes(e.docx_line), `print_only names a line the oracle does not have: ${e.docx_line.slice(0, 40)}`)
  }
  say(`docx: ${segs.length} segments = 6 cover lines (all equal the cover fields) + ${rest.length} body segments; ${rest.length - missing.length} of the ${rest.length - meta.print_only.length} that are not print-only found in order (100%); ${missing.length} print-only:`)
  for (const m of missing) say(`  - ${m.slice(0, 90)}`)
})

test('the print-only list is only print layout: contents lines with a page number, the printed timeline\'s instruction, the printed glossary caption, an ornament', () => {
  assert.equal(meta.print_only.length, 8)
  const stream = book.parts.flatMap(p => texts(p, 'docx')).map(normCmp).join('')
  const kinds = { contents: 0, timeline: 0, glossary: 0, ornament: 0 }
  for (const e of meta.print_only) {
    assert.ok(!stream.includes(normCmp(e.docx_line)), `it is in the JSON after all: ${e.docx_line.slice(0, 40)}`)
    if (/^[^.]{3,60} · עמוד \d+$/.test(e.docx_line)) kinds.contents++
    else if (e.docx_line.startsWith('איך קוראים את הציר?') && e.docx_line.endsWith('(סובבו את הספר כדי לקרוא את הציר)')) kinds.timeline++
    else if (e.docx_line.startsWith('והפעם — אתם המאיירים') && e.docx_line.includes('ליד כל מושג יש מסגרת ריקה')) kinds.glossary++
    else if (e.docx_line === '— —') kinds.ornament++
    else assert.fail(`a print-only line that is none of the four kinds (a story paragraph must never be listed here): ${e.docx_line.slice(0, 60)}`)
  }
  assert.deepEqual(kinds, { contents: 5, timeline: 1, glossary: 1, ornament: 1 })
})

test('the seven meetings are the seven stations of Saltiel\'s route, by title and number', () => {
  const route = KIDS_ROUTES.find(r => r.key === 'saltiel')!
  const meetings = book.parts.filter(p => p.kind === 'meeting')
  assert.equal(meetings.length, route.stations.length)
  for (const p of meetings) {
    const s = route.stations.find(x => x.n === p.station)!
    assert.ok(s, `no station ${p.station}`)
    assert.equal(plain(p.title), plain(s.title), `meeting ${p.station}`)
  }
})

// ---- the pictures ----

function webpSize(buf: Buffer): { w: number; h: number } {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF')
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP')
  const kind = buf.toString('ascii', 12, 16)
  if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 } }
  if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) }
  throw new Error(`not a webp: ${kind}`)
}

test('the pictures: every picture the JSON names exists, with its real size, at most 200 KB and 1000 px wide (thumbnails 15 KB and 200 px), and nothing else is in the folder', () => {
  const named: Array<{ src: string; w: number; h: number; alt: string; thumb: boolean }> = [{ ...book.cover, thumb: false }]
  for (const p of book.parts) for (const b of p.blocks) {
    if (b.t === 'img') named.push({ src: b.src, w: b.w, h: b.h, alt: b.alt, thumb: false })
    if (b.t === 'journey') for (const i of b.items) named.push({ ...i.thumb, thumb: true })
  }
  assert.equal(named.length, 17, 'the cover, seven panels, two original drawings, seven thumbnails')
  assert.equal(new Set(named.map(n => n.src)).size, 17, 'no picture twice')
  let total = 0
  for (const n of named) {
    assert.ok(n.src.startsWith('/kids/books/saltiel/') && n.src.endsWith('.webp'), n.src)
    const file = path.join(ROOT, 'public', n.src)
    assert.ok(fs.existsSync(file), `${n.src} is missing`)
    const buf = fs.readFileSync(file)
    total += buf.length
    const { w, h } = webpSize(buf)
    assert.deepEqual([w, h], [n.w, n.h], `${n.src}: the JSON says ${n.w}x${n.h}, the file is ${w}x${h}`)
    assert.ok(w <= (n.thumb ? 200 : 1000), `${n.src} is ${w} px wide`)
    assert.ok(buf.length <= (n.thumb ? 15 : 200) * 1024, `${n.src} is ${buf.length} bytes`)
    if (!n.thumb) assert.ok(n.alt.trim(), `${n.src} has no alt text`)
    else assert.equal(n.alt, '', 'a thumbnail beside its visible title is decorative')
  }
  assert.deepEqual(fs.readdirSync(IMG_DIR).sort(), named.map(n => path.basename(n.src)).sort(), 'the folder holds exactly the pictures the JSON names')
  assert.ok(total < 2 * 1024 * 1024, `${total} bytes in all`)
  say(`17 pictures, ${total} bytes in all (${(total / 1048576).toFixed(2)} MB); largest ${Math.max(...fs.readdirSync(IMG_DIR).map(f => fs.statSync(path.join(IMG_DIR, f)).size))} bytes`)
  // each panel is in its meeting, each original drawing has the edition's caption
  for (const p of book.parts.filter(x => x.kind === 'meeting')) {
    const img = p.blocks[0]
    assert.ok(img.t === 'img' && img.variant === 'panel' && img.src === `/kids/books/saltiel/m${p.station}.webp`, p.slug)
  }
  const sons = book.parts.flatMap(p => p.blocks).filter(b => b.t === 'img' && b.variant === 'son')
  assert.equal(sons.length, 2)
  for (const s of sons) assert.ok(s.t === 'img' && s.caption, 'an original drawing has its caption')
})

test('the map, timeline, passport and glossary hold what the edition shows', () => {
  const j = book.parts.find(p => p.slug === 'map')!.blocks.find(b => b.t === 'journey')!
  const t = book.parts.find(p => p.slug === 'timeline')!.blocks.find(b => b.t === 'timeline')!
  const s = book.parts.find(p => p.slug === 'passport')!.blocks.find(b => b.t === 'stamps')!
  const g = book.parts.find(p => p.slug === 'glossary')!.blocks.find(b => b.t === 'glossary')!
  if (j.t !== 'journey' || t.t !== 'timeline' || s.t !== 'stamps' || g.t !== 'glossary') throw new Error('block types')
  assert.deepEqual(j.items.map(i => [i.n, i.part]), [1, 2, 3, 4, 5, 6, 7].map(n => [n, `meeting-${n}`]))
  for (const i of j.items) assert.equal(i.title, book.parts.find(p => p.station === i.n)!.title, 'the map names the meeting by its title')
  assert.deepEqual(t.items.map(i => i.n), [2, 3, 1, 4, 5, 6, 7], 'the timeline is in the order of the generations, not of the book')
  assert.deepEqual(t.items.filter(i => i.first).map(i => i.n), [1])
  assert.equal(s.items.length, 8)
  assert.equal(s.box, 'חותמת')
  assert.equal(g.items.length, 13)
  for (const i of g.items) assert.ok(i.idea.startsWith('רעיון לציור: '), i.term)
})

// ---- 3. the generator, run on copies of its input ----

function findPython(): string | null {
  const probe = 'import lxml.html, PIL, sys\nfrom PIL import features\nsys.exit(0 if features.check("webp") else 1)'
  for (const c of [process.env.KIDS_BOOK_PYTHON, '/usr/bin/python3', 'python3']) {
    if (!c) continue
    const r = spawnSync(c, ['-I', '-c', probe], { encoding: 'utf8' })
    if (r.status === 0) return c
  }
  return null
}
const PY = findPython()

function run(args: string[]) {
  const r = spawnSync(PY!, ['-I', SCRIPT, '--book', 'saltiel', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return { status: r.status, out: r.stdout, err: r.stderr }
}

let tmp = ''

if (!PY) {
  const why = 'no python3 with lxml and Pillow+WebP found; set KIDS_BOOK_PYTHON'
  if (process.env.KIDS_BOOK_REQUIRE_PYTHON === '1') test('a python3 with lxml and Pillow+WebP is available', () => { throw new Error(why) })
  for (const n of ['--check on the committed files', 'a build in an empty root writes the committed bytes', '--check after one block is altered', '--check after a picture is altered and a stray file added', 'an unknown element stops the build', 'a missing paragraph stops the build', 'a changed source stops the build'])
    skip(`the generator: ${n}`, why)
} else {
  const read = (p: string) => fs.readFileSync(p)
  const copyInputs = (to: string) => {
    fs.mkdirSync(path.join(to, 'data', 'kids-books'), { recursive: true })
    for (const f of ['saltiel.meta.json', path.basename(meta.source.file), path.basename(meta.oracle.file)]) fs.copyFileSync(path.join(REPO, 'data', 'kids-books', f), path.join(to, 'data', 'kids-books', f))
  }
  const writeMeta = (to: string, m: Meta) => fs.writeFileSync(path.join(to, 'data', 'kids-books', 'saltiel.meta.json'), JSON.stringify(m, null, 1) + '\n')
  const withSource = (to: string, edit: (s: string) => string) => {
    const p = path.join(to, meta.source.file)
    const s = edit(fs.readFileSync(p, 'utf8'))
    fs.writeFileSync(p, s)
    writeMeta(to, { ...meta, source: { ...meta.source, sha256: sha256(Buffer.from(s, 'utf8')) } })
    return s
  }
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kids-book-'))
  const fresh = path.join(tmp, 'fresh')

  test('the generator: --check on the committed files exits 0', () => {
    const r = run(['--check'])
    assert.equal(r.status, 0, r.err || r.out)
    assert.match(r.out, /18 files match the build/)
  })

  test('the generator: a build in an empty root writes exactly the committed bytes (deterministic)', () => {
    copyInputs(fresh)
    const r = run(['--root', fresh])
    assert.equal(r.status, 0, r.err || r.out)
    assert.match(r.out, /15 parts, 17 pictures; wrote 18 file\(s\)/)
    const j = path.join(fresh, 'nextjs-app', 'content', 'kids-books', 'saltiel.json')
    assert.ok(read(j).equals(read(JSON_PATH)), 'the JSON differs from the committed one')
    const dir = path.join(fresh, 'nextjs-app', 'public', 'kids', 'books', 'saltiel')
    assert.deepEqual(fs.readdirSync(dir).sort(), fs.readdirSync(IMG_DIR).sort())
    for (const f of fs.readdirSync(IMG_DIR)) assert.ok(read(path.join(dir, f)).equals(read(path.join(IMG_DIR, f))), `${f} differs from the committed picture`)
  })

  test('the generator: --check exits 1 after one block of the JSON is altered, and names the file', () => {
    const j = path.join(fresh, 'nextjs-app', 'content', 'kids-books', 'saltiel.json')
    const doc = JSON.parse(read(j).toString('utf8')) as KidsBook
    const blk = doc.parts.find(p => p.slug === 'meeting-3')!.blocks.find(b => b.t === 'p')!
    if (blk.t !== 'p') throw new Error('no paragraph')
    blk.text = blk.text + ' '
    fs.writeFileSync(j, JSON.stringify(doc, null, 1) + '\n')
    const r = run(['--root', fresh, '--check'])
    assert.equal(r.status, 1, r.err || r.out)
    assert.match(r.err, /differs: nextjs-app\/content\/kids-books\/saltiel\.json/)
    fs.writeFileSync(j, read(JSON_PATH))
  })

  test('the generator: --check exits 1 after a picture is altered or a stray file is added', () => {
    const dir = path.join(fresh, 'nextjs-app', 'public', 'kids', 'books', 'saltiel')
    const m1 = path.join(dir, 'm1.webp')
    const b = read(m1)
    b[b.length - 5] ^= 0xff
    fs.writeFileSync(m1, b)
    fs.writeFileSync(path.join(dir, 'stray.webp'), 'x')
    const r = run(['--root', fresh, '--check'])
    assert.equal(r.status, 1, r.err || r.out)
    assert.match(r.err, /differs: nextjs-app\/public\/kids\/books\/saltiel\/m1\.webp/)
    assert.match(r.err, /extra file: nextjs-app\/public\/kids\/books\/saltiel\/stray\.webp/)
    const w = run(['--root', fresh])               // writing repairs both
    assert.equal(w.status, 0, w.err)
    assert.ok(read(m1).equals(read(path.join(IMG_DIR, 'm1.webp'))))
    assert.ok(!fs.existsSync(path.join(dir, 'stray.webp')))
  })

  test('the generator: an unknown <aside class="x"> stops the build (exit 2) and says where', () => {
    const root = path.join(tmp, 'aside')
    copyInputs(root)
    withSource(root, s => s.replace('<aside class="key">', '<aside class="x"><p>hello</p></aside><aside class="key">'))
    const r = run(['--root', root, '--check'])
    assert.equal(r.status, 2, r.err || r.out)
    assert.match(r.err, /section#m1\.meeting.*aside\.x.*\(line \d+\)/)
    assert.ok(!fs.existsSync(path.join(root, 'nextjs-app')), 'nothing was written')
  })

  test('the generator: a paragraph missing from the source stops the build (the docx oracle is no longer covered)', () => {
    const root = path.join(tmp, 'gap')
    copyInputs(root)
    withSource(root, s => s.replace(/<p>הנה הדלת\.<\/p>\n/, ''))
    const r = run(['--root', root, '--check'])
    assert.equal(r.status, 2, r.err || r.out)
    assert.match(r.err, /missing, not in print_only: הנה הדלת/)
  })

  test('the generator: a source that is not the one in the meta file (sha256) stops the build before anything is read', () => {
    const root = path.join(tmp, 'sha')
    copyInputs(root)
    const p = path.join(root, meta.source.file)
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('</body>', ' </body>'))
    const r = run(['--root', root, '--check'])
    assert.equal(r.status, 2, r.err)
    assert.match(r.err, /the source changed/)
  })
}

if (tmp) fs.rmSync(tmp, { recursive: true, force: true })

console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`)
if (failed > 0) process.exit(1)
