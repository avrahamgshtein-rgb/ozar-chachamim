/**
 * New York in the Journey ("מסע התורה", 2026-11-02). Imports the real modules.
 *  - a borough counts at its city (the Bronx and Brooklyn at New York), and the markers keep their own points;
 *  - the five refined place texts equal data/place-refinements-2026-11.json's `after`, in both data.json copies and the sheet's rows
 *    (the sheet is read by hand: zip and XML);
 *  - the record has the shape the method asks for (a source URL and a verbatim quote per source; paper quotes are checked against the
 *    paper in the repo, Wikipedia quotes were checked against the API text when the record was made, in the session);
 *  - the journey: the centres of 1950 / 1970 / 1990 hold New York with the sages the record names, Lakewood stands apart.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { getAllSages, getAllConnections } from '../lib/serverData'
import { buildJourney, centresAt } from '../lib/journey'
import { canonicalPlace, centrePlace, coordsForName, primaryPlaceOf, resolveCoords, CENTRE_OF_PLACE } from '../lib/locationCoords'
import { regionsOf } from '../lib/regions'
import { translateTerm } from '../lib/terms'
import type { Sage } from '../lib/types'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ok  ${name}`); passed++ } catch (e) { console.log(`  FAIL ${name}\n       ${(e as Error).message}`); failed++ }
}

const ROOT = path.join(__dirname, '..', '..')
const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'place-refinements-2026-11.json'), 'utf8'))
const sages: Sage[] = getAllSages()
const byLabel = (l: string) => { const s = sages.filter(x => x.label === l); assert.equal(s.length, 1, l); return s[0] }

test('a borough counts at New York: the Bronx and Brooklyn go to the city, everything else stays', () => {
  assert.equal(centrePlace('ברונקס'), 'ניו יורק')
  assert.equal(centrePlace('ברוקלין'), 'ניו יורק')
  assert.equal(centrePlace('ניו יורק'), 'ניו יורק')
  assert.equal(centrePlace('לייקווד'), 'לייקווד')
  assert.equal(centrePlace('ירושלים'), 'ירושלים')
  assert.deepEqual(new Set(Object.keys(CENTRE_OF_PLACE)), new Set(['ברוקלין', 'ברונקס']))
  // the marker is untouched: the gazetteer still has the boroughs' own points
  assert.notDeepEqual(coordsForName('ברונקס'), coordsForName('ניו יורק'))
  assert.notDeepEqual(coordsForName('ברוקלין'), coordsForName('ניו יורק'))
})

test('the journey puts a Bronx sage (R. Aryeh Kaplan) and a Brooklyn sage (the Rayatz) at the New York centre, with the city\'s point', () => {
  const m = buildJourney(sages, getAllConnections())
  for (const label of ['הרב אריה קפלן', 'הרב יוסף יצחק שניאורסון (הריי"צ)', 'הרב מאיר כהנא']) {
    const f = m.figures.find(x => x.sage.label === label)!
    assert.equal(f.place, 'ניו יורק', label)
    assert.deepEqual(f.pos, coordsForName('ניו יורק'), label)
    assert.notEqual(primaryPlaceOf(f.sage), 'ניו יורק', `${label}: his own marker place is the borough`)
  }
  const kaplan = byLabel('הרב אריה קפלן')
  assert.deepEqual(resolveCoords(kaplan), coordsForName('ברונקס'), 'the map marker stays in the Bronx')
})

test('the mutation: without the alias a borough is a centre of its own again (the check this test makes fails)', () => {
  const saved = { ...CENTRE_OF_PLACE }
  try {
    for (const k of Object.keys(CENTRE_OF_PLACE)) delete CENTRE_OF_PLACE[k]
    const m = buildJourney(sages, getAllConnections())
    const f = m.figures.find(x => x.sage.label === 'הרב אריה קפלן')!
    assert.equal(f.place, 'ברונקס')
    assert.notEqual(f.place, 'ניו יורק')
  } finally { Object.assign(CENTRE_OF_PLACE, saved) }
})

test('the record: five changes, each with sources that have a URL and a quote, the sage\'s label, and a before that held the country', () => {
  assert.equal(record.changes.length, 5)
  for (const c of record.changes) {
    const s = byLabel(c.label)
    assert.equal(s.id, c.id, `${c.label}: id drift`)
    assert.ok(c.before.includes('ארה"ב'), c.id)
    assert.ok(!c.after.includes('ארה"ב'), c.id)
    assert.ok(c.sources.length >= 2, c.id)
    for (const src of c.sources) {
      assert.ok(src.quote && src.quote.length > 10, c.id)
      if (src.kind === 'wikipedia') {
        assert.match(src.url, /^https:\/\/(he|en)\.wikipedia\.org\/w\/index\.php\?title=.+&oldid=\d+$/, c.id)
        assert.ok(Number.isInteger(src.revid), c.id)
      } else {
        assert.equal(src.kind, 'paper')
        const paper = JSON.parse(fs.readFileSync(path.join(ROOT, src.url), 'utf8')) as Array<{ content: string }>
        assert.ok(paper.some(d => d.content.includes(src.quote)), `${c.id}: the paper does not hold "${src.quote}"`)
      }
    }
  }
  for (const n of record.not_changed) assert.ok(n.why && n.label, n.id)
})

test('each refined sage\'s node holds the record\'s `after` (corpus and both data.json copies), and nothing else of him differs from the record', () => {
  const copies = ['data.json', path.join('nextjs-app', 'public', 'data.json')].map(p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')))
  assert.deepEqual(copies[0], copies[1])
  for (const c of record.changes) {
    assert.equal(byLabel(c.label).location, c.after, c.id)
    for (const d of copies) assert.equal(d.nodes.find((n: { id: string }) => n.id === c.id).location, c.after, c.id)
  }
})

/** The sheet's rows, read by hand (zip central directory + inline strings), as the other record tests do. */
function sheetCell(cell: string): string {
  const buf = fs.readFileSync(path.join(ROOT, 'data', 'חכמי_ישראל.xlsx'))
  let eocd = buf.length - 22
  while (buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20)
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42)
    const name = buf.slice(p + 46, p + 46 + nlen).toString('utf8')
    p += 46 + nlen + elen + clen
    if (name !== 'xl/worksheets/sheet1.xml') continue
    const lh = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28)
    const raw = buf.slice(lh, lh + csize)
    const xml = (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8')
    const m = xml.match(new RegExp(`<c r="${cell}"[^>]*><is><t>(.*?)</t></is></c>`))
    assert.ok(m, cell)
    return m![1].replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
  }
  throw new Error('no sheet')
}

test('the sheet\'s cells hold the record\'s `after`', () => {
  for (const c of record.changes) assert.equal(sheetCell(c.sheet_cell), c.after, c.id)
})

test('the refined places have regions, points and translations: north-america, the sourced city, English and Russian terms', () => {
  for (const c of record.changes) {
    const s = byLabel(c.label)
    assert.ok(regionsOf(s.location).includes('north-america'), c.id)
    assert.ok(resolveCoords(s), c.id)
    for (const loc of ['en', 'ru'] as const) {
      const terms = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'i18n', `terms.${loc}.json`), 'utf8')).terms
      assert.ok(translateTerm(s.location!, terms, loc === 'en' ? 'and' : 'и'), `${c.id} ${loc}`)
    }
  }
  assert.equal(canonicalPlace(byLabel('הרב אהרן קוטלר').location), 'לייקווד')
  assert.equal(canonicalPlace(byLabel('הרב מאיר כהנא').location), 'ברוקלין')
  assert.equal(canonicalPlace(byLabel('אלי ויזל').location), 'ניו יורק')
  assert.deepEqual(regionsOf('לייקווד, ניו ג\'רזי'), ['north-america'])
  assert.deepEqual(regionsOf('ברוקלין'), ['north-america'])
})

test('sages the record leaves alone keep their text (335, 152, 610 and the European-first ones)', () => {
  assert.equal(byLabel('הרבי מליובאוויטש').location, 'רוסיה, ארה"ב')
  assert.equal(byLabel('הרב אברהם יהושע השל – הגות ומעורבות מוסרית').location, 'פולין / ארה"ב')
  assert.equal(byLabel('הרבנית חיה מושקא שניאורסון').location, 'ליובאוויטש ורוסטוב, רוסיה; ניו יורק')
})

test('the journey: New York is a centre in 1950, 1970 and 1990 with the sages the record supports; Lakewood is Kotler\'s own', () => {
  const m = buildJourney(sages, getAllConnections())
  const at = (y: number, key: string) => centresAt(m, y).find(c => c.key === key)
  const names = (y: number) => at(y, 'ניו יורק')!.figures.map(f => f.sage.label)
  assert.ok(names(1950).includes('הרב אריה קפלן') && names(1950).includes('הרבנית ד"ר ברוריה דייוויד') && names(1950).includes('הרב מאיר כהנא'))
  assert.ok(names(1970).includes('הרב שלמה קרליבך') && names(1970).includes('אלי ויזל'))
  assert.ok(names(1990).includes('הרב מאיר כהנא'))
  assert.ok(at(1950, 'לייקווד')!.figures.some(f => f.sage.label === 'הרב אהרן קוטלר'))
  assert.equal(at(1970, 'לייקווד'), undefined, 'Kotler died in 1962')
  // the country point no longer holds the American sages whose city is now known
  const usa = (y: number) => (centresAt(m, y).find(c => c.key === 'ארה"ב')?.figures ?? []).map(f => f.sage.label)
  for (const y of [1950, 1970, 1990]) for (const l of ['אלי ויזל', 'הרב שלמה קרליבך', 'הרב מאיר כהנא']) assert.ok(!usa(y).includes(l), `${l} ${y}`)
  // no centre called after a borough
  for (const y of [1930, 1950, 1970, 1990]) for (const c of centresAt(m, y)) assert.ok(!(c.key in CENTRE_OF_PLACE), `${c.key} ${y}`)
})

console.log(`\n${'-'.repeat(46)}`)
console.log(`placeRefinements: ${passed} passed, ${failed} failed`)
console.log('-'.repeat(46))
process.exit(failed > 0 ? 1 : 0)
