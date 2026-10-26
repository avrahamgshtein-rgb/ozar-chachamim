/**
 * The reader's library for the children's books: lib/kidsBooks.ts (the server-side lookups),
 * lib/kidsBookSpeech.ts (what the voice reads) and lib/kidsReading.ts (the reader's memory and text size).
 * Every function is tested on the committed sample (tests/fixtures/kids-book-sample.json) and on the book the
 * site really serves (getBook('saltiel')), and asserts only the book's structure, never its real counts: those
 * belong to the generator's test (tests/kidsBookBuild.test.ts). Also pinned here: KIDS_BOOKS_AVAILABLE agrees
 * with the files in content/kids-books/, and no client component imports the server-only lookups.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  allBooks, bookStaticParams, getBook, getPart, keyOf, keysOf, meetingParts, neighbours, partPlainText, partWords, readingOrder, stationLinks,
} from '../lib/kidsBooks'
import { BOOK_SPEECH_MAX, BOOK_VOICE_LANGS, bookSpeechItems, type BookSpeechItem } from '../lib/kidsBookSpeech'
import { KIDS_BOOKS_AVAILABLE, partSlugOf } from '../lib/kidsBookLinks'
import { classifyMarks } from '../lib/hebrewMarks'
import { bookMarks, validateBook, type Block, type KidsBook, type Part } from '../lib/kidsBookTypes'
import { KIDS_PATH, KIDS_ROUTES, stationAnchor } from '../lib/kidsJourney'
import { kidsTourPath } from '../lib/kidsTour'
import {
  DEFAULT_FONT_STEP, FONT_KEY, FONT_STEPS, READING_KEY, fontPx, lastPartOf, parseFontStep, parseReading, rememberPart, stepFont,
} from '../lib/kidsReading'
import { VOICE_LANGS } from '../lib/speech'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const root = path.join(__dirname, '..')
const sample: KidsBook = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/kids-book-sample.json'), 'utf8'))
const real = getBook('saltiel')
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const slugsOf = (parts: Part[]) => parts.map(p => p.slug)
// The letters, digits and nikud of a text: what is left when punctuation and spacing (which speech may add or change) are ignored.
const letters = (s: string) => s.replace(/[^\p{L}\p{N}\p{M}]/gu, '')

assert.ok(real, 'getBook("saltiel") returned nothing')
const books: Array<[string, KidsBook]> = [['sample', sample], ['saltiel', real as KidsBook]]

// ---- kidsBooks.ts ----

test('the sample and the served book are valid (the lookups below assume it)', () => {
  assert.deepEqual(validateBook(sample), [])
  assert.deepEqual(validateBook(real), [])
})

test('getBook gives a book only for a known slug that is available; allBooks lists exactly those', () => {
  for (const slug of ['', 'nope', 'constructor', '__proto__', 'toString', 'Saltiel', 'saltiel/', 'hasOwnProperty']) assert.equal(getBook(slug), null, slug)
  for (const route of KIDS_ROUTES.map(r => r.key)) {
    const b = getBook(route)
    assert.equal(b !== null, KIDS_BOOKS_AVAILABLE[route], `${route}: getBook vs KIDS_BOOKS_AVAILABLE`)
    if (b) assert.equal(b.book, route)
  }
  assert.deepEqual(allBooks().map(b => b.book), KIDS_ROUTES.map(r => r.key).filter(r => KIDS_BOOKS_AVAILABLE[r]))
})

test('KIDS_BOOKS_AVAILABLE is true exactly when content/kids-books/<book>.json exists, and lib/kidsBooks.ts serves that file', () => {
  const dir = path.join(root, 'content/kids-books')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  for (const [route, on] of Object.entries(KIDS_BOOKS_AVAILABLE)) {
    assert.equal(files.includes(`${route}.json`), on, `${route}: file ${files.includes(`${route}.json`) ? 'exists' : 'missing'} but KIDS_BOOKS_AVAILABLE is ${on}`)
    assert.equal(getBook(route) !== null, files.includes(`${route}.json`), `${route}: the file is not imported by lib/kidsBooks.ts (or is, without being available)`)
    if (on) assert.deepEqual(getBook(route), JSON.parse(fs.readFileSync(path.join(dir, `${route}.json`), 'utf8')), `${route}: getBook serves other content than the file holds`)
  }
  for (const f of files) assert.ok(f.replace(/\.json$/, '') in KIDS_BOOKS_AVAILABLE, `${f} is not a book of the routes`)
})

test('getPart finds a part by its slug and nothing else', () => {
  for (const [name, b] of books) {
    for (const p of b.parts) assert.equal(getPart(b, p.slug), p, `${name}/${p.slug}`)
    for (const slug of ['', 'nope', 'meeting-99', 'constructor', '__proto__']) assert.equal(getPart(b, slug), null, `${name}/${slug}`)
  }
})

test('readingOrder is the parts the book lists, in book order, without the copyright page', () => {
  for (const [name, b] of books) {
    const order = readingOrder(b)
    assert.deepEqual(order, b.parts.filter(p => p.nav), name)
    assert.ok(order.length > 0 && order.every(p => p.nav && p.tocLabel), name)
    assert.ok(b.parts.some(p => !p.nav), `${name}: expected a part outside the reading order (the copyright page)`)
    assert.ok(!slugsOf(order).includes('copyright'), name)
  }
})

test('neighbours walk the reading order, skip the copyright page and end at the ends', () => {
  for (const [name, b] of books) {
    const order = readingOrder(b)
    order.forEach((p, i) => {
      const n = neighbours(b, p.slug)
      assert.equal(n.prev, order[i - 1] ?? null, `${name}/${p.slug} prev`)
      assert.equal(n.next, order[i + 1] ?? null, `${name}/${p.slug} next`)
    })
    assert.equal(neighbours(b, order[0].slug).prev, null, `${name}: nothing before the first part`)
    assert.equal(neighbours(b, order[order.length - 1].slug).next, null, `${name}: nothing after the last part`)
    for (const p of b.parts) for (const side of ['prev', 'next'] as const) assert.notEqual(neighbours(b, p.slug)[side]?.slug, 'copyright', `${name}/${p.slug} ${side}`)
    assert.deepEqual(neighbours(b, 'copyright'), { prev: null, next: null }, `${name}: the copyright page has no neighbours`)
    assert.deepEqual(neighbours(b, 'nope'), { prev: null, next: null }, name)
  }
  // wherever the copyright page stands in the book, the parts around it are neighbours of each other
  const moved = copy(sample)
  const at = moved.parts.findIndex(p => p.slug === 'copyright')
  const [cr] = moved.parts.splice(at, 1)
  moved.parts.splice(3, 0, cr)
  const order = readingOrder(moved)
  const before = moved.parts[2]
  const after = moved.parts[4]
  assert.equal(neighbours(moved, before.slug).next, after)
  assert.equal(neighbours(moved, after.slug).prev, before)
  assert.equal(order.length, readingOrder(sample).length)
})

test('meetingParts are the meetings by station number; keyOf and keysOf give their keys', () => {
  for (const [name, b] of books) {
    const meetings = meetingParts(b)
    assert.deepEqual(new Set(slugsOf(meetings)), new Set(slugsOf(b.parts.filter(p => p.kind === 'meeting'))), name)
    assert.ok(meetings.length > 0, name)
    meetings.forEach((m, i) => {
      assert.equal(m.station, i + 1, `${name}: stations 1..N in order`)
      assert.equal(m.slug, partSlugOf(b.route, i + 1), name)
    })
    const keys = keysOf(b)
    assert.equal(keys.length, meetings.length, name)
    keys.forEach((k, i) => {
      const key = keyOf(meetings[i])
      assert.ok(key, `${name}/${meetings[i].slug}: no key`)
      assert.deepEqual(k, { n: key.n, name: key.name, title: key.title, slug: meetings[i].slug })
      assert.equal(k.n, meetings[i].station)
      assert.ok(k.title.includes(k.name) && k.name.length > 0, name)
    })
    for (const p of b.parts) {
      const key = keyOf(p)
      assert.equal(key !== null, p.blocks.some(x => x.t === 'key'), `${name}/${p.slug}`)
      if (p.kind !== 'meeting') assert.equal(key, null, `${name}/${p.slug}: only a meeting has a key`)
    }
  }
  // meetings listed out of order in the file still come out by station
  const shuffled = copy(sample)
  shuffled.parts.reverse()
  assert.deepEqual(meetingParts(shuffled).map(m => m.station), meetingParts(sample).map(m => m.station))
  assert.deepEqual(keysOf(shuffled).map(k => k.n), keysOf(sample).map(k => k.n))
})

test('stationLinks point at the station card and the route\'s time machine, and only for a meeting', () => {
  for (const [name, b] of books) {
    for (const p of b.parts) {
      const links = stationLinks(b, p)
      if (p.kind !== 'meeting') { assert.equal(links, null, `${name}/${p.slug}`); continue }
      assert.ok(links, `${name}/${p.slug}`)
      assert.equal(links.n, p.station)
      assert.equal(links.card, `/he/kids#saltiel-${p.station}`)
      assert.equal(links.card, `${KIDS_PATH}#${stationAnchor('saltiel', p.station as number)}`)
      assert.equal(links.tourHref, '/he/kids/journey/saltiel')
      assert.equal(links.tourHref, kidsTourPath('saltiel'))
      const station = KIDS_ROUTES.find(r => r.key === 'saltiel')?.stations.find(s => s.n === p.station)
      assert.ok(station, `${name}/${p.slug}: the kids page has no station ${p.station}`)
      assert.equal(links.stationTitle, station.title, 'the link reads as the station card does')
    }
  }
  // Shira's book plugs in the same way: her anchors and her route
  const shira = copy(sample)
  shira.book = 'shira'
  shira.route = 'shira'
  const meeting = shira.parts.find(p => p.kind === 'meeting') as Part
  const links = stationLinks(shira, meeting)
  assert.ok(links)
  assert.equal(links.card, `/he/kids#shira-${meeting.station}`)
  assert.equal(links.tourHref, '/he/kids/journey/shira')
  // a meeting the route has no station for keeps the book's own title
  const far = { ...meeting, station: 99, title: 'כותרת משלו' }
  assert.equal(stationLinks(sample, far)?.stationTitle, 'כותרת משלו')
  assert.equal(stationLinks(sample, { ...meeting, station: undefined }), null)
})

test('partPlainText holds every text field in reading order and no placeholder', () => {
  const skip = new Set(['t', 'style', 'variant', 'src', 'alt', 'part', 'k'])
  const leaves = (v: unknown, key = ''): string[] => {
    if (typeof v === 'string') return skip.has(key) ? [] : [v]
    if (Array.isArray(v)) return v.flatMap(x => leaves(x, key))
    if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => leaves(x, k))
    return []
  }
  for (const [name, b] of books) {
    for (const p of b.parts) {
      const text = partPlainText(p)
      const where = `${name}/${p.slug}`
      assert.ok(text.includes(p.title), where)
      if (p.kick) assert.ok(text.indexOf(p.kick) < text.indexOf(p.title), `${where}: kick before title`)
      if (p.subtitle) assert.ok(text.includes(p.subtitle), where)
      let from = text.indexOf(p.title)
      for (const blk of p.blocks) {
        if (blk.t === 'p' && blk.placeholder) {
          assert.ok(!text.includes(blk.text), `${where}: placeholder "${blk.text}" is in the text`)
          continue
        }
        const own = leaves(blk)
        for (const s of own) assert.ok(text.includes(s), `${where}: ${blk.t} text "${s.slice(0, 30)}" missing`)
        if (own.length) {
          const first = text.indexOf(own[0], from)
          assert.ok(first >= 0, `${where}: ${blk.t} "${own[0].slice(0, 30)}" is out of order`)
          from = first
        }
      }
    }
  }
})

test('partWords counts the words of the plain text and ignores lone punctuation', () => {
  for (const [name, b] of books) {
    for (const p of b.parts) {
      const w = partWords(p)
      assert.ok(Number.isInteger(w) && w > 0, `${name}/${p.slug}: ${w}`)
      assert.equal(w, partPlainText(p).split(/\s+/).filter(x => /[\p{L}\p{N}]/u.test(x)).length)
    }
  }
  const part: Part = { slug: 'x', id: 'x', kind: 'front', title: 'שלום עולם', nav: true, blocks: [
    { t: 'p', text: 'אחד שניים — שלושה, 4 ו־5.' }, { t: 'p', text: 'ISBN נעלם', placeholder: true }, { t: 'sep' },
  ] }
  assert.equal(partWords(part), 2 + 5)
})

test('bookStaticParams lists every part of every available book once, the copyright page included', () => {
  const params = bookStaticParams()
  const keys = params.map(p => `${p.book}/${p.slug}`)
  assert.equal(new Set(keys).size, keys.length)
  assert.deepEqual(new Set(params.map(p => p.book)), new Set(allBooks().map(b => b.book)))
  for (const b of allBooks()) {
    assert.deepEqual(params.filter(p => p.book === b.book).map(p => p.slug), slugsOf(b.parts))
    assert.ok(params.some(p => p.book === b.book && p.slug === 'copyright'))
  }
  for (const p of params) assert.ok(getPart(getBook(p.book) as KidsBook, p.slug), `${p.book}/${p.slug} would be a 404`)
})

// ---- kidsBookSpeech.ts ----

/** The blocks of a part that bookSpeechItems must never read. */
const NOT_READ: Array<Block['t']> = ['img', 'sep', 'links', 'journey', 'timeline', 'stamps']

/** Each readable thing of a part: its target and the words that must be read under it. */
function expectedSpeech(part: Part): Map<string, string> {
  const want = new Map<string, string>()
  const put = (target: string, ...texts: Array<string | undefined>) => {
    const t = letters(texts.join(''))
    if (t) want.set(target, (want.get(target) ?? '') + t)
  }
  put('title', part.kick, part.title, part.subtitle)
  part.blocks.forEach((b, bi) => {
    const at = String(bi)
    if (b.t === 'h' || (b.t === 'p' && !b.placeholder)) put(at, b.text)
    else if (b.t === 'quote') put(at, b.text, b.source)
    else if (b.t === 'key') put(at, b.title, b.text, b.verse, b.source)
    else if (b.t === 'card') b.rows.forEach((r, ri) => put(`${at}.${ri}`, r.label, r.text))
    else if (b.t === 'activity') { put(at, b.title, b.intro?.text); b.items.forEach((it, ii) => put(`${at}.${ii}`, it.text)) }
    else if (b.t === 'glossary') b.items.forEach((it, ii) => put(`${at}.${ii}`, it.term, it.text, it.idea))
  })
  return want
}

test('bookSpeechItems read exactly the words of the readable blocks, in order, under their own targets', () => {
  for (const [name, b] of books) {
    for (const p of b.parts) {
      const where = `${name}/${p.slug}`
      const items = bookSpeechItems(p)
      assert.ok(items.length > 0, where)
      const heard = new Map<string, string>()
      for (const it of items) heard.set(it.target, (heard.get(it.target) ?? '') + letters(it.text))
      const want = expectedSpeech(p)
      assert.deepEqual([...heard.keys()].sort(), [...want.keys()].sort(), `${where}: targets`)
      for (const [target, text] of want) assert.equal(heard.get(target), text, `${where}: words under ${target}`)
      // items come in the order of the page: 'title' first, then blocks and their items as they stand
      const rank = (it: BookSpeechItem) => it.target === 'title' ? [-1, 0] : it.target.split('.').map(Number).concat(0).slice(0, 2)
      const ranks = items.map(rank)
      ranks.forEach((r, i) => { if (i > 0) assert.ok(r[0] > ranks[i - 1][0] || (r[0] === ranks[i - 1][0] && r[1] >= ranks[i - 1][1]), `${where}: item ${i} (${items[i].target}) is out of order`) })
    }
  }
})

test('bookSpeechItems never read a placeholder, the map, the timeline or the passport', () => {
  for (const [name, b] of books) {
    for (const p of b.parts) {
      const where = `${name}/${p.slug}`
      const items = bookSpeechItems(p)
      p.blocks.forEach((blk, bi) => {
        const own = items.filter(i => i.target === String(bi) || i.target.startsWith(`${bi}.`))
        if (NOT_READ.includes(blk.t)) assert.deepEqual(own, [], `${where}: block ${bi} (${blk.t}) has speech`)
        if (blk.t === 'p' && blk.placeholder) {
          assert.deepEqual(own, [], `${where}: placeholder block ${bi} has speech`)
          assert.ok(!letters(items.map(i => i.text).join(' ')).includes(letters(blk.text)), `${where}: placeholder "${blk.text}" is read`)
        }
      })
    }
  }
  // the same, on a part built to hold every kind of block that must stay silent
  const part: Part = { slug: 'x', id: 'x', kind: 'front', title: 'כותרת', nav: true, blocks: [
    { t: 'p', text: 'שדה לא מלא ZZZPLACEHOLDER', placeholder: true },
    { t: 'img', variant: 'panel', src: '/kids/books/saltiel/x.webp', w: 10, h: 10, alt: 'ZZZALT', caption: 'ZZZCAPTION' },
    { t: 'sep' },
    { t: 'links', items: [{ text: 'ZZZLINK', part: 'x' }] },
    { t: 'journey', items: [{ n: 1, title: 'ZZZJOURNEY', where: 'ZZZWHERE', who: 'ZZZWHO', part: 'x', thumb: { src: '/kids/books/saltiel/x.webp', w: 1, h: 1, alt: '' } }] },
    { t: 'timeline', items: [{ n: 1, hebrew: 'ZZZHEB', civil: 'ZZZCIVIL', place: 'ZZZPLACE', region: 'ZZZREGION', part: 'x' }] },
    { t: 'stamps', box: 'ZZZBOX', items: ['ZZZSTAMP'] },
    { t: 'p', text: 'פסקה אחת קוראים' },
  ] }
  const items = bookSpeechItems(part)
  assert.deepEqual(items, [{ target: 'title', text: 'כותרת' }, { target: '7', text: 'פסקה אחת קוראים' }])
})

test('bookSpeechItems are short enough for every browser\'s voice: at most 240 characters, never empty', () => {
  assert.equal(BOOK_SPEECH_MAX, 240)
  for (const [name, b] of books) {
    for (const p of b.parts) {
      for (const it of bookSpeechItems(p)) {
        assert.ok(it.text.length > 0 && it.text.length <= 240, `${name}/${p.slug} ${it.target}: ${it.text.length} characters`)
        assert.equal(it.text, it.text.trim())
        assert.ok(/[\p{L}\p{N}]/u.test(it.text), `${name}/${p.slug} ${it.target}: nothing to say`)
      }
    }
  }
  // a very long paragraph, with and without commas, and one word with no spaces at all
  const sentence = (i: number) => `זהו משפט מספר ${i} שמתאר את מה שקרה לשאלתי ולמגיד בבית המדרש הגדול, בין הנרות והספרים`
  const long = Array.from({ length: 30 }, (_, i) => sentence(i + 1)).join(', ')
  const part: Part = { slug: 'x', id: 'x', kind: 'front', title: 'ארוך', nav: true, blocks: [
    { t: 'p', text: long }, { t: 'p', text: 'מילה '.repeat(200).trim() }, { t: 'p', text: 'א'.repeat(700) },
  ] }
  const items = bookSpeechItems(part)
  assert.ok(items.filter(i => i.target === '0').length > 1, 'a long paragraph is cut')
  for (const it of items) assert.ok(it.text.length <= 240, `${it.target}: ${it.text.length}`)
  part.blocks.forEach((blk, bi) => {
    assert.equal(letters(items.filter(i => i.target === String(bi)).map(i => i.text).join('')), letters((blk as { text: string }).text), `block ${bi} loses or adds words`)
  })
})

test('every target of bookSpeechItems is "title", a block index of the part, or an item of a block that has items', () => {
  for (const [name, b] of books) {
    for (const p of b.parts) {
      for (const { target } of bookSpeechItems(p)) {
        const where = `${name}/${p.slug} ${target}`
        if (target === 'title') continue
        assert.match(target, /^\d+(\.\d+)?$/, where)
        const [bi, ii] = target.split('.').map(Number)
        const blk = p.blocks[bi]
        assert.ok(blk, `${where}: no such block`)
        assert.ok(!NOT_READ.includes(blk.t), `${where}: block ${blk.t} is not read`)
        if (ii === undefined) assert.ok(['h', 'p', 'quote', 'key', 'activity'].includes(blk.t), `${where}: ${blk.t} has no element of its own`)
        else if (blk.t === 'card') assert.ok(ii < blk.rows.length, where)
        else if (blk.t === 'activity') assert.ok(ii < blk.items.length, where)
        else if (blk.t === 'glossary') assert.ok(ii < blk.items.length, where)
        else assert.fail(`${where}: ${blk.t} has no items`)
      }
    }
  }
})

test('the speech uses the site\'s bookMarks: no ASCII geresh or gershayim is left', () => {
  let seen = 0
  for (const [name, b] of books) {
    for (const p of b.parts) {
      for (const it of bookSpeechItems(p)) {
        assert.ok(classifyMarks(it.text).every(m => m.cls !== 'geresh' && m.cls !== 'gershayim'), `${name}/${p.slug}: an ASCII geresh or gershayim is left: ${it.text}`)
        assert.ok(!it.text.includes('·'), 'the card\'s middle dots are turned into commas')
        if (/[א-ת][״׳]/.test(it.text)) seen++
      }
    }
  }
  assert.ok(seen > 0, 'expected some text with bookMarks or geresh')
  const part: Part = { slug: 'x', id: 'x', kind: 'front', title: 'א', nav: true, blocks: [{ t: 'p', text: 'ראו את המהר"ל, "דברים" ו-ה\' ד\'תש"י.' }] }
  assert.equal(bookSpeechItems(part)[1].text, 'ראו את המהר״ל, "דברים" ו-ה׳ ד׳תש״י.')
  assert.equal(bookSpeechItems(part)[1].text, bookMarks(part.blocks[0].t === 'p' ? part.blocks[0].text : ''))
})

test('the book is read in Hebrew: the voice languages are the research player\'s', () => {
  assert.deepEqual(BOOK_VOICE_LANGS, VOICE_LANGS.he)
  assert.ok(BOOK_VOICE_LANGS.includes('he') && BOOK_VOICE_LANGS.includes('iw'))
})

test('a card row reads label and text as a sentence, a key reads title, text, verse and source', () => {
  const part: Part = { slug: 'meeting-1', id: 'm1', kind: 'meeting', kick: 'המפגש הראשון', title: 'כותרת', station: 1, nav: true, blocks: [
    { t: 'card', title: 'כרטיס מסע', rows: [{ label: 'לאן?', text: 'קורדובה · ספרד' }, { label: 'מילות המפתח', text: 'קולות · משקל' }] },
    { t: 'key', n: 1, title: 'המפתח הראשון: כיסופים', name: 'כיסופים', text: 'החכמה מתחילה בגעגוע.', verse: '"נִכְסְפָה ה\'"', source: '(תהלים פד, ג)' },
  ] }
  assert.deepEqual(bookSpeechItems(part), [
    { target: 'title', text: 'המפגש הראשון. כותרת' },
    { target: '0.0', text: 'לאן? קורדובה, ספרד' },
    { target: '0.1', text: 'מילות המפתח: קולות, משקל' },
    { target: '1', text: 'המפתח הראשון: כיסופים. החכמה מתחילה בגעגוע. "נִכְסְפָה ה׳". (תהלים פד, ג)' },
  ])
})

// ---- kidsReading.ts ----

test('the storage keys and the font scale are the ones the plan names', () => {
  assert.equal(READING_KEY, 'ozar-kids-reading')
  assert.equal(FONT_KEY, 'ozar-kids-font')
  assert.deepEqual(FONT_STEPS, [17, 19, 21, 24, 27, 31])
  assert.equal(DEFAULT_FONT_STEP, 2)
  assert.equal(fontPx(DEFAULT_FONT_STEP), 21)
  assert.deepEqual(FONT_STEPS.map((_, i) => fontPx(i)), FONT_STEPS)
  assert.deepEqual([...FONT_STEPS].sort((a, b) => a - b), FONT_STEPS, 'smallest first')
})

test('parseReading keeps a good memory and survives garbage', () => {
  const good = { saltiel: { slug: 'meeting-3', at: 1790000000000 }, shira: { slug: 'station-2', at: 5 } }
  assert.deepEqual(parseReading(JSON.stringify(good)), good)
  assert.deepEqual(parseReading(good), good, 'an object already parsed is accepted too')
  const garbage: unknown[] = [
    null, undefined, '', ' ', 'null', 'undefined', '[]', '[1,2]', '"text"', '12', 'true', '{bad json', '{"saltiel":', '{', '}', '\u0000',
    0, 12, true, false, NaN, [], [1], () => 1, Symbol('x'), new Date(), {}, { saltiel: null }, { saltiel: 'meeting-1' }, { saltiel: [] }, { saltiel: {} },
    { saltiel: { slug: 5, at: 1 } }, { saltiel: { slug: 'meeting-1' } }, { saltiel: { slug: 'meeting-1', at: 'now' } },
    { saltiel: { slug: 'meeting-1', at: NaN } }, { saltiel: { slug: 'meeting-1', at: -1 } }, { saltiel: { slug: 'meeting-1', at: Infinity } },
    { saltiel: { slug: '', at: 1 } }, { saltiel: { slug: 'Meeting 1', at: 1 } }, { saltiel: { slug: '../x', at: 1 } }, { saltiel: { slug: 'x'.repeat(500), at: 1 } },
    { '': { slug: 'a', at: 1 } }, { 'bad book': { slug: 'a', at: 1 } }, { Saltiel: { slug: 'a', at: 1 } },
  ]
  for (const g of garbage) {
    const parsed = parseReading(g)
    assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed), `parseReading(${String(g)})`)
    assert.deepEqual(parsed, {}, `parseReading(${typeof g === 'string' ? JSON.stringify(g) : String(g)})`)
  }
  // an entry that is damaged is dropped alone, the good ones stay
  assert.deepEqual(parseReading(JSON.stringify({ saltiel: { slug: 'meeting-1', at: 1 }, shira: { slug: 7, at: 1 }, extra: null })), { saltiel: { slug: 'meeting-1', at: 1 } })
  // a key that would reach the prototype cannot
  const proto = parseReading('{"__proto__":{"slug":"a","at":1},"constructor":{"slug":"b","at":2}}')
  assert.deepEqual(Object.keys(proto), ['constructor'])
  assert.equal(Object.getPrototypeOf(proto), Object.prototype)
})

test('rememberPart records the part and the time, replaces the book\'s old entry and leaves the old memory alone', () => {
  const empty = parseReading(null)
  const a = rememberPart(empty, 'saltiel', 'meeting-1', 1000)
  assert.deepEqual(a, { saltiel: { slug: 'meeting-1', at: 1000 } })
  assert.deepEqual(empty, {}, 'the old memory is untouched')
  const b = rememberPart(a, 'shira', 'station-2', 2000)
  const c = rememberPart(b, 'saltiel', 'meeting-4', 3000)
  assert.deepEqual(c, { saltiel: { slug: 'meeting-4', at: 3000 }, shira: { slug: 'station-2', at: 2000 } })
  assert.deepEqual(a, { saltiel: { slug: 'meeting-1', at: 1000 } })
  assert.deepEqual(parseReading(JSON.stringify(c)), c, 'what is remembered is what is read back')
  // bad input changes nothing
  assert.equal(rememberPart(a, '', 'meeting-1', 1), a)
  assert.equal(rememberPart(a, 'saltiel', '', 1), a)
  assert.equal(rememberPart(a, '__proto__', 'meeting-1', 1), a)
  assert.equal(rememberPart(a, 'saltiel', 'a b', 1), a)
  assert.deepEqual(rememberPart(a, 'saltiel', 'meeting-2', NaN), { saltiel: { slug: 'meeting-2', at: 0 } })
})

test('lastPartOf gives the part he stopped at, and ignores a slug that no longer exists', () => {
  for (const [name, b] of books) {
    const valid = slugsOf(readingOrder(b))
    const mem = rememberPart({}, b.book, valid[valid.length - 1], 1)
    assert.equal(lastPartOf(mem, b.book, valid), valid[valid.length - 1], name)
    assert.equal(lastPartOf(mem, b.book, valid.slice(0, -1)), null, `${name}: the part was removed from the book`)
    assert.equal(lastPartOf(mem, b.book, []), null, name)
    // the copyright page is not in the reading order, so a memory of it is not a place to continue from
    assert.equal(lastPartOf(rememberPart({}, b.book, 'copyright', 1), b.book, valid), null, name)
  }
  const mem = { saltiel: { slug: 'meeting-9', at: 1 } }
  assert.equal(lastPartOf(mem, 'saltiel', ['meeting-1', 'meeting-2']), null)
  assert.equal(lastPartOf(mem, 'shira', ['meeting-9']), null, 'another book')
  assert.equal(lastPartOf({}, 'saltiel', ['meeting-1']), null)
  for (const book of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) assert.equal(lastPartOf({}, book, ['meeting-1', 'function']), null, book)
  assert.equal(lastPartOf(parseReading('{"saltiel":{"slug":"meeting-1","at":1}}'), 'saltiel', ['meeting-1']), 'meeting-1')
})

test('parseFontStep keeps a step of the scale and turns anything else into the default', () => {
  FONT_STEPS.forEach((_, i) => {
    assert.equal(parseFontStep(String(i)), i)
    assert.equal(parseFontStep(i), i)
  })
  assert.equal(parseFontStep(' 3 '), 3)
  const garbage: unknown[] = [
    null, undefined, '', ' ', 'abc', 'NaN', 'null', 'undefined', '-1', '-0', '6', '7', '99', '1000000000000000000000', '2.5', '2.0', '1e1', '0x2', '+2', '２',
    '2px', '{"a":1}', '[2]', '"2"', NaN, Infinity, -Infinity, -1, 6, 2.5, true, false, {}, [], [2], () => 2, Symbol('x'),
  ]
  for (const g of garbage) assert.equal(parseFontStep(g), DEFAULT_FONT_STEP, `parseFontStep(${typeof g === 'symbol' ? 'Symbol' : String(g)})`)
})

test('stepFont moves one step and stops at the ends of the scale', () => {
  const last = FONT_STEPS.length - 1
  assert.equal(stepFont(2, 1), 3)
  assert.equal(stepFont(2, -1), 1)
  assert.equal(stepFont(last, 1), last)
  assert.equal(stepFont(0, -1), 0)
  let s = DEFAULT_FONT_STEP
  for (let i = 0; i < 20; i++) s = stepFont(s, 1)
  assert.equal(s, last)
  for (let i = 0; i < 20; i++) s = stepFont(s, -1)
  assert.equal(s, 0)
  // a step that is not on the scale is brought back to it
  assert.equal(stepFont(99, -1), last - 1)
  assert.equal(stepFont(-5, 1), 1)
  assert.equal(stepFont(NaN, 1), DEFAULT_FONT_STEP + 1)
  assert.equal(stepFont(NaN, -1), DEFAULT_FONT_STEP - 1)
  assert.equal(stepFont(2.4, 1), 3)
})

test('fontPx gives the size of a step and clamps a step outside the scale', () => {
  assert.equal(fontPx(0), 17)
  assert.equal(fontPx(FONT_STEPS.length - 1), 31)
  assert.equal(fontPx(-3), 17)
  assert.equal(fontPx(99), 31)
  assert.equal(fontPx(NaN), FONT_STEPS[DEFAULT_FONT_STEP])
  for (const g of ['', 'x', null, undefined, '9', '-1']) assert.ok(FONT_STEPS.includes(fontPx(parseFontStep(g))), String(g))
})

// ---- who may import what ----

const SOURCE = /\.(ts|tsx)$/
const SKIP_DIRS = new Set(['node_modules', '.next', '.next-verify', 'tests', 'public', 'content', 'scripts', 'data'])
function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...sourceFiles(p))
    else if (SOURCE.test(e.name)) out.push(p)
  }
  return out
}
const importsOf = (src: string): string[] => [...src.matchAll(/(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g)].map(m => m[1])
const isClient = (src: string) => /^\s*['"]use client['"]/m.test(src)
const reachesServerOnly = (spec: string) => /(^|\/)kidsBooks$/.test(spec)

test('no client component (components/, app/, lib/ — the reader\'s files included) imports lib/kidsBooks', () => {
  const files = sourceFiles(root)
  assert.ok(files.length > 100, `only ${files.length} source files found: the walk is broken`)
  const clients = files.filter(f => isClient(fs.readFileSync(f, 'utf8')))
  assert.ok(clients.some(f => f.includes(`${path.sep}components${path.sep}`)), 'no client component found: the detection is broken')
  const offenders = clients.filter(f => importsOf(fs.readFileSync(f, 'utf8')).some(reachesServerOnly)).map(f => path.relative(root, f))
  assert.deepEqual(offenders, [], `client files import the server-only lib/kidsBooks: ${offenders.join(', ')}`)
  // the detection itself, on text
  assert.equal(isClient(`'use client'\nimport x from '../../lib/kidsBooks'`), true)
  assert.deepEqual(importsOf(`import { a } from '@/lib/kidsBooks'\nconst b = await import("../lib/kidsBooks")\nimport c from '../lib/kidsBookSpeech'`).filter(reachesServerOnly), ['@/lib/kidsBooks', '../lib/kidsBooks'])
})

test('the server-only module is not a client module, and the client-safe ones import nothing server-only', () => {
  const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8')
  assert.ok(!isClient(read('lib/kidsBooks.ts')), 'lib/kidsBooks.ts must stay a server module')
  assert.ok(importsOf(read('lib/kidsBooks.ts')).some(s => s.includes('content/kids-books/')), 'lib/kidsBooks.ts imports the books\' JSON')
  for (const f of ['lib/kidsBookSpeech.ts', 'lib/kidsReading.ts']) {
    const imports = importsOf(read(f))
    for (const spec of imports) {
      assert.ok(!reachesServerOnly(spec) && !spec.startsWith('node:') && !['fs', 'path'].includes(spec) && !spec.includes('content/'), `${f} imports ${spec}`)
    }
  }
  assert.deepEqual(importsOf(read('lib/kidsReading.ts')), [], 'lib/kidsReading.ts imports nothing')
  // nor does a client file pull the books' text into the browser by importing the JSON itself
  const clients = sourceFiles(root).filter(f => isClient(fs.readFileSync(f, 'utf8')))
  const direct = clients.filter(f => importsOf(fs.readFileSync(f, 'utf8')).some(s => s.includes('content/kids-books/'))).map(f => path.relative(root, f))
  assert.deepEqual(direct, [], `client files import the books' JSON: ${direct.join(', ')}`)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
