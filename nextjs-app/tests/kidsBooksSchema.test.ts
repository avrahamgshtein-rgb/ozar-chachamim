/**
 * The reading edition of the children's books: the schema (lib/kidsBookTypes.ts) and the shared Hebrew-marks
 * helper (lib/hebrewMarks.ts). The sample (tests/fixtures/kids-book-sample.json) is a real, trimmed excerpt of
 * the owner's HTML edition; content/kids-books/*.json (written by scripts/build_kids_book.py) must be valid
 * too. The checks on the real book's content (15 parts, the coverage against the docx's text) are in
 * tests/kidsBookBuild.test.ts.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { gershayim as pathShareGershayim } from '../lib/pathShare'
import { bookMarks, gershayim } from '../lib/hebrewMarks'
import { segmentsOf, validateBook, type Block, type KidsBook, type Run } from '../lib/kidsBookTypes'
import {
  KIDS_BOOKS_AVAILABLE, KIDS_BOOKS_INDEXED, KIDS_READ_PATH, partSlugOf, readBookHref, readPartHref, readStationHref, readerCanonical, readerRobots,
} from '../lib/kidsBookLinks'
import { SITE_URL } from '../lib/siteUrl'
import { kidsBookSitemapPaths } from '../lib/kidsBooks'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const root = path.join(__dirname, '..')
const sample: KidsBook = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/kids-book-sample.json'), 'utf8'))
const copy = (): KidsBook => JSON.parse(JSON.stringify(sample))
const part = (b: KidsBook, slug: string) => b.parts.find(p => p.slug === slug)!
const blocksOf = <T extends Block['t']>(b: KidsBook, t: T) => b.parts.flatMap(p => p.blocks).filter((x): x is Extract<Block, { t: T }> => x.t === t)
const problems = (b: unknown) => validateBook(b).join(' | ')

// ---- the sample and the real files ----

test('the sample is a valid book that holds every block type and every part kind', () => {
  assert.deepEqual(validateBook(sample), [])
  const types = new Set(sample.parts.flatMap(p => p.blocks.map(b => b.t)))
  for (const t of ['h', 'p', 'sep', 'img', 'quote', 'card', 'key', 'activity', 'links', 'journey', 'timeline', 'glossary', 'stamps']) assert.ok(types.has(t as Block['t']), `no ${t} block`)
  assert.deepEqual([...new Set(sample.parts.map(p => p.kind))].sort(), ['activities', 'closing', 'front', 'glossary', 'intro', 'meeting'])
  assert.ok(blocksOf(sample, 'p').some(b => b.placeholder), 'a placeholder paragraph')
  assert.ok(blocksOf(sample, 'p').some(b => b.marks?.some(m => m.k === 'em')), 'an em mark')
  assert.ok(blocksOf(sample, 'p').some(b => b.style === 'verse') && blocksOf(sample, 'p').some(b => b.style === 'mem'), 'verse and mem paragraphs')
})

test('every content/kids-books/*.json is valid and agrees with KIDS_BOOKS_AVAILABLE', () => {
  const dir = path.join(root, 'content/kids-books')
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : []
  assert.ok(files.length > 0, 'content/kids-books has no book')
  for (const f of files) {
    const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as KidsBook
    assert.deepEqual(validateBook(b), [], f)
    assert.equal(`${b.book}.json`, f)
    assert.equal(KIDS_BOOKS_AVAILABLE[b.book], true, `${f} exists but KIDS_BOOKS_AVAILABLE.${b.book} is false`)
  }
  for (const [route, on] of Object.entries(KIDS_BOOKS_AVAILABLE)) if (on) assert.ok(files.includes(`${route}.json`), `KIDS_BOOKS_AVAILABLE.${route} is true but there is no ${route}.json`)
})

// ---- the validator refuses what it should (each case breaks one thing in a copy of the sample) ----

const broken: Array<[string, (b: KidsBook) => void, RegExp]> = [
  ['schema 2', b => { (b as unknown as { schema: number }).schema = 2 }, /"schema"/],
  ['route differs from book', b => { (b as unknown as { route: string }).route = 'shira' }, /"route"/],
  ['a bad sha256', b => { b.source.sha256 = 'abc' }, /sha256/],
  ['an image outside the book folder', b => { b.cover.src = '/kids/saltiel-cover.webp' }, /\/kids\/books\/saltiel\//],
  ['an image that is not webp', b => { b.cover.src = '/kids/books/saltiel/cover.png' }, /\.webp/],
  ['a zero-width image', b => { b.cover.w = 0 }, /positive integers/],
  ['a duplicate slug', b => { part(b, 'map').slug = 'timeline' }, /duplicate slug/],
  ['a slug with capitals', b => { part(b, 'map').slug = 'Map' }, /"slug"/],
  ['nav without a tocLabel', b => { delete part(b, 'map').tocLabel }, /tocLabel/],
  ['a tocLabel on the copyright page', b => { part(b, 'copyright').tocLabel = 'x' }, /tocLabel/],
  ['an unknown block type', b => { (part(b, 'map').blocks as unknown[]).push({ t: 'table', rows: [] }) }, /"t" must be one of/],
  ['a mark past the text', b => { const p = blocksOf(b, 'p').find(x => x.marks)!; p.marks![0].to = p.text.length + 1 }, /past the text/],
  ['marks out of order', b => { const p = blocksOf(b, 'p').find(x => x.marks)!; p.marks = [{ k: 'b', from: 5, to: 8 }, { k: 'em', from: 2, to: 6 }] }, /out of order|overlap/],
  ['an empty mark', b => { const p = blocksOf(b, 'p').find(x => x.marks)!; p.marks![0].to = p.marks![0].from }, /empty|out of order/],
  ['a meeting without its key', b => { const p = part(b, 'meeting-1'); p.blocks = p.blocks.filter(x => x.t !== 'key') }, /exactly one key/],
  ['a meeting with two keys', b => { const p = part(b, 'meeting-1'); p.blocks.push(p.blocks.find(x => x.t === 'key')!) }, /exactly one key/],
  ['a key of the wrong number', b => { blocksOf(b, 'key')[0].n = 5 }, /key n/],
  ['a key whose title lacks its name', b => { blocksOf(b, 'key')[0].name = 'אחר' }, /"title" must contain "name"/],
  ['a key outside a meeting', b => { part(b, 'prologue').blocks.push(blocksOf(b, 'key')[0]) }, /belongs to a meeting/],
  ['a station gap', b => { const p = part(b, 'meeting-2'); p.station = 3; p.slug = 'meeting-3' }, /stations must be 1\.\.N/],
  ['a slug that does not match the station', b => { part(b, 'meeting-2').slug = 'meeting-9' }, /slug must be meeting-2/],
  ['a link to a part that does not exist', b => { blocksOf(b, 'links')[0].items[0].part = 'nowhere' }, /must name a part/],
  ['a journey item without a thumbnail', b => { delete (blocksOf(b, 'journey')[0].items[0] as { thumb?: unknown }).thumb }, /thumb/],
  ['an activity without items', b => { blocksOf(b, 'activity')[0].items = [] }, /"items"/],
  ['a paragraph with a style that does not exist', b => { (blocksOf(b, 'p')[0] as { style?: string }).style = 'huge' }, /"style"/],
  ['a placeholder that is false', b => { (blocksOf(b, 'p')[0] as { placeholder?: boolean }).placeholder = false }, /"placeholder"/],
  ['an empty part', b => { part(b, 'passport').blocks = [] }, /"blocks"/],
  ['no parts', b => { b.parts = [] }, /"parts"/],
]
for (const [name, mutate, expected] of broken) {
  test(`validateBook refuses ${name}`, () => {
    const b = copy()
    mutate(b)
    const found = problems(b)
    assert.ok(found, 'nothing was reported')
    assert.match(found, expected)
  })
}

test('validateBook never throws on junk', () => {
  for (const junk of [null, undefined, 5, 'x', [], {}, { parts: 3 }, { schema: 1, parts: [null] }, { schema: 1, parts: [{ blocks: [null] }] }]) {
    assert.ok(Array.isArray(validateBook(junk)))
    assert.ok(validateBook(junk).length > 0)
  }
})

// ---- runs, marks and the display rule ----

test('segmentsOf cuts a run at its marks and loses nothing', () => {
  for (const r of [...blocksOf(sample, 'p'), ...blocksOf(sample, 'activity').flatMap(a => a.items)] as Run[]) {
    const segs = segmentsOf(r)
    assert.equal(segs.map(s => s.text).join(''), r.text)
    assert.equal(segs.filter(s => s.mark).length, r.marks?.length ?? 0)
  }
  const kv = blocksOf(sample, 'p').find(b => b.style === 'kv')!
  assert.deepEqual(segmentsOf(kv)[0], { text: 'קהל יעד:', mark: 'b' })
  assert.deepEqual(segmentsOf({ text: 'אבג' }), [{ text: 'אבג' }])
  assert.deepEqual(segmentsOf({ text: 'אבגדה', marks: [{ k: 'em', from: 1, to: 3 }] }), [{ text: 'א' }, { text: 'בג', mark: 'em' }, { text: 'דה' }])
})

test('gershayim: the book\'s real cases', () => {
  assert.equal(gershayim('המהר"ל מפראג וסוד הגולם'), 'המהר״ל מפראג וסוד הגולם')
  assert.equal(gershayim('סביב ד\'תש"י (950 לספירה)'), 'סביב ד׳תש״י (950 לספירה)')
  assert.equal(gershayim('ה\'רח"ץ'), 'ה׳רח״ץ')
  assert.equal(gershayim('נִכְסְפָה וְגַם כָּלְתָה נַפְשִׁי לְחַצְרוֹת ה\''), 'נִכְסְפָה וְגַם כָּלְתָה נַפְשִׁי לְחַצְרוֹת ה׳')
  assert.equal(gershayim('רבי יעקב בירב והמהרלב"ח'), 'רבי יעקב בירב והמהרלב״ח')
  assert.equal(gershayim('הרבי מפיאסצ\'נה'), 'הרבי מפיאסצ׳נה')
  // quotation marks around speech stay as they are
  assert.equal(gershayim('"בבקשה, היכנס ושב!" אמר המגיד בחגיגיות.'), '"בבקשה, היכנס ושב!" אמר המגיד בחגיגיות.')
  assert.equal(gershayim('"דרור יקרא לבן עם בת, וינצרכם כמו בבת!"'), '"דרור יקרא לבן עם בת, וינצרכם כמו בבת!"')
  assert.equal(gershayim('(1941) "שלום" 12'), '(1941) "שלום" 12')
  // nothing else changes, and the length never does
  assert.equal(gershayim(''), '')
  assert.equal(gershayim('plain "text" it\'s'), 'plain "text" it\'s')
})

test('bookMarks: one character for one character, over the whole sample, so every mark offset still holds', () => {
  const texts: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') texts.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(sample.parts)
  assert.ok(texts.length > 200)
  let changed = 0
  for (const t of texts) {
    const g = bookMarks(t)
    assert.equal(g.length, t.length)
    if (g !== t) changed++
  }
  assert.ok(changed > 3, `${changed} strings change in the sample`)
  for (const r of blocksOf(sample, 'p')) {
    const segs = segmentsOf(r, { display: true })
    assert.equal(segs.map(s => s.text).join(''), bookMarks(r.text))
    assert.deepEqual(segs.map(s => s.text.length), segmentsOf(r).map(s => s.text.length))
  }
})

test('gershayim is the same rule as lib/pathShare.ts::gershayim, over every text of the sample', () => {
  const texts: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') texts.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(sample.parts)
  for (const t of texts) assert.equal(gershayim(t), pathShareGershayim(t))
})

// ---- addresses, availability and the robots switch ----

test('the reader\'s addresses and the station slugs', () => {
  assert.equal(KIDS_READ_PATH, '/he/kids/read')
  assert.equal(readBookHref('saltiel'), '/he/kids/read/saltiel')
  assert.equal(readPartHref('saltiel', 'parents'), '/he/kids/read/saltiel/parents')
  assert.equal(partSlugOf('saltiel', 3), 'meeting-3')
  assert.equal(partSlugOf('shira', 8), 'station-8')
  assert.equal(readStationHref('saltiel', 7), '/he/kids/read/saltiel/meeting-7')
  assert.equal(readStationHref('shira', 1), '/he/kids/read/shira/station-1')
  assert.equal(readerCanonical(''), `${SITE_URL}/he/kids/read`)
  assert.equal(readerCanonical('/saltiel/meeting-1'), `${SITE_URL}/he/kids/read/saltiel/meeting-1`)
  assert.equal(KIDS_BOOKS_AVAILABLE.saltiel, true)
  assert.equal(KIDS_BOOKS_AVAILABLE.shira, false, "Shira's book has not arrived")
})

test('while KIDS_BOOKS_INDEXED is false every reader page is noindex, follow, in every language', () => {
  assert.equal(KIDS_BOOKS_INDEXED, false)
  for (const l of ['he', 'en', 'ru']) assert.deepEqual(readerRobots(l), { index: false, follow: true })
})

test('the sitemap carries no reader address now, and exactly the contents list of every book once the switch is true', () => {
  assert.deepEqual(kidsBookSitemapPaths(), [])
  assert.deepEqual(kidsBookSitemapPaths(false), [])
  const on = kidsBookSitemapPaths(true)
  assert.ok(on.includes('/he/kids/read') && on.includes('/he/kids/read/saltiel'))
  assert.ok(on.every(p => p.startsWith('/he/kids/read')), 'Hebrew only')
  assert.ok(!on.includes('/he/kids/read/saltiel/copyright'), 'the copyright page is outside the contents')
  assert.ok(on.includes('/he/kids/read/saltiel/parents') && on.includes('/he/kids/read/saltiel/passport'))
  assert.equal(new Set(on).size, on.length)
})

test('the sample\'s part slugs all follow the reader\'s address rule', () => {
  for (const p of sample.parts) if (p.kind === 'meeting') assert.equal(p.slug, partSlugOf(sample.route, p.station!))
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
