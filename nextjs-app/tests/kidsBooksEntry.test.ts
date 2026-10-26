/**
 * The ways into the kids' reader (lib/kidsBookLinks.ts): the 📖 links on /he/kids (under each route's title, on
 * each station card, and the "על הספרים" sentence), in the time machine's station card, and under the kids' card
 * on the About page. Plain `<a>` links, there only while the book is on the site (KIDS_BOOKS_AVAILABLE), so
 * Shira's are absent until her book lands. The reader itself is tested in kidsBooksReader.test.ts.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { KIDS_ROUTES } from '../lib/kidsJourney'
import { getAllConnections, getAllSages } from '../lib/serverData'
import { buildTower } from '../lib/tower'
import { READ_BOOK_TEXT, booksReadNote, kidsTour, readStationText } from '../lib/kidsTour'
import { KIDS_BOOKS_AVAILABLE, KIDS_READ_PATH, partSlugOf, readBookHref, readPartHref, readStationHref } from '../lib/kidsBookLinks'

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

const root = path.join(__dirname, '..')
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8')
const count = (text: string, needle: string) => text.split(needle).length - 1

const tower = buildTower(getAllSages(), getAllConnections(), 'he')
const [saltiel, shira] = KIDS_ROUTES

console.log('the time machine\'s station card')

test("every station of Saltiel's time machine links to its meeting in the reader; Shira's has none", () => {
  const tour = kidsTour(tower, 'saltiel')!
  assert.deepEqual(tour.stations.map(s => s.n), saltiel.stations.map(s => s.n))
  for (const s of tour.stations) {
    assert.equal(s.read, `/he/kids/read/saltiel/meeting-${s.n}`, `meeting ${s.n}`)
    assert.equal(s.read, readStationHref('saltiel', s.n))
    assert.equal(s.read, readPartHref('saltiel', partSlugOf('saltiel', s.n)))
    assert.ok(s.href.startsWith('/he/kids#'), 'the station card on the kids page is still linked')
  }
  assert.equal(KIDS_BOOKS_AVAILABLE.shira, false, 'Shira\'s book is not on the site yet: if it is, update this file and CLAUDE.md')
  const other = kidsTour(tower, 'shira')!
  assert.deepEqual(other.stations.map(s => s.n), shira.stations.map(s => s.n))
  for (const s of other.stations) assert.equal(s.read, undefined, `Shira's station ${s.n} has no reader page`)
  assert.ok(other.stations.every(s => !('read' in s)), 'the key is left out, not set to undefined')
})

test('the link follows KIDS_BOOKS_AVAILABLE: Shira\'s stations get theirs the day her book is added, Saltiel\'s go when his is pulled', () => {
  const was = { ...KIDS_BOOKS_AVAILABLE }
  try {
    KIDS_BOOKS_AVAILABLE.shira = true
    for (const s of kidsTour(tower, 'shira')!.stations) assert.equal(s.read, `/he/kids/read/shira/station-${s.n}`)
    KIDS_BOOKS_AVAILABLE.saltiel = false
    for (const s of kidsTour(tower, 'saltiel')!.stations) assert.equal(s.read, undefined)
  } finally {
    Object.assign(KIDS_BOOKS_AVAILABLE, was)
  }
  assert.equal(kidsTour(tower, 'saltiel')!.stations[0].read, '/he/kids/read/saltiel/meeting-1', 'restored')
})

test('every meeting part the book holds is the one its station links to', () => {
  const file = path.join(root, 'content/kids-books/saltiel.json')
  const book = JSON.parse(fs.readFileSync(file, 'utf8')) as { parts: Array<{ slug: string; kind: string; station?: number }> }
  const meetings = book.parts.filter(p => p.kind === 'meeting')
  assert.ok(meetings.length > 0, 'the book has meetings')
  for (const p of meetings) {
    assert.ok(p.station && saltiel.stations.some(s => s.n === p.station), `${p.slug}: no such station on the kids page`)
    assert.equal(readStationHref('saltiel', p.station!), readPartHref('saltiel', p.slug), `${p.slug}: the station links elsewhere`)
  }
})

test('the panel shows the link as a plain <a>, only when the station has one, and still never the story', () => {
  const panel = read('components/kids/KidsTourPanel.tsx')
  assert.match(panel, /\{st\.read && \(\s*<a href=\{st\.read\}/)
  assert.equal(count(panel, 'st.read'), 2, 'one guard, one href')
  assert.match(panel, /readStationText\(tour\.route\)/)
  assert.match(panel, /📖/)
  assert.doesNotMatch(panel, /next\/link|<Link/, 'a plain link: the reader is not prefetched')
  assert.doesNotMatch(panel, /\.summary|\.tasks|\.intro/)
  assert.match(panel, /href=\{st\.href\}/, 'the game, task and quiz link stays')
})

console.log('\nthe kids page (/he/kids)')

const page = read('app/[locale]/kids/page.tsx')

test('the book links come from lib/kidsBookLinks.ts, each behind the availability constant, as plain <a> links', () => {
  assert.equal(count(page, 'readBookHref('), 1)
  assert.equal(count(page, 'readStationHref('), 1)
  assert.match(page, /\{KIDS_BOOKS_AVAILABLE\[route\.key\] && \(\s*<a href=\{readBookHref\(route\.key\)\}/)
  assert.match(page, /const read = KIDS_BOOKS_AVAILABLE\[route\.key\] \? readStationHref\(route\.key, s\.n\) : null/)
  assert.match(page, /\{read && \(\s*<p className="mt-4">\s*<a href=\{read\}/)
  assert.doesNotMatch(page, /\/kids\/read/, 'no address typed by hand')
  assert.doesNotMatch(page, /<Link[^>]*(read|KIDS_READ_PATH)/, 'plain <a> only: the kids page prefetches neither the reader nor the tower')
  assert.match(page, /href=\{kidsTourPath\(route\.key\)\}/, 'the time machine link stays')
})

test('the labels: 📖 לקרוא את הספר יחד under a route\'s title, 📖 לקרוא את המפגש on a station', () => {
  assert.equal(READ_BOOK_TEXT, 'לקרוא את הספר יחד')
  assert.equal(readStationText('saltiel'), 'לקרוא את המפגש')
  assert.equal(readStationText('shira'), 'לקרוא את התחנה')
  assert.match(page, /<span aria-hidden className="text-xl">📖<\/span>\s*<span>\{READ_BOOK_TEXT\}<\/span>/)
  assert.match(page, /<span aria-hidden>📖<\/span>\s*<span>\{readStationText\(route\.key\)\}<\/span>/)
  // the link sits beside the time machine, under the route's title
  assert.ok(page.indexOf('readBookHref(route.key)') < page.indexOf('href={kidsTourPath(route.key)}'))
  assert.ok(page.indexOf('<h2 id={`${route.key}-title`}') < page.indexOf('readBookHref(route.key)'))
})

test('the "על הספרים" paragraph no longer says the stories are only in the books, and follows the constant', () => {
  assert.doesNotMatch(page, /הסיפורים עצמם בספרים/, 'the unconditional claim is gone from the page')
  assert.doesNotMatch(page, /כאן מופיעים רק/)
  assert.match(page, /const readNote = booksReadNote\(\)/)
  assert.match(page, /\{readNote\.before\}\s*\{readNote\.link && <a href=\{KIDS_READ_PATH\} className="link-gold font-semibold">\{readNote\.link\}<\/a>\}\{readNote\.after\}/)
  // what stays: the card, the summary and the tasks
  assert.match(page, /כרטיסי המסע, תקציר קצר ודפי ״משחק ומשימה״/)
  assert.match(page, /© כל הזכויות שמורות למשפחת גולדשטיין/)
})

test('the sentence is true in each state of the books', () => {
  const soon = booksReadNote({ saltiel: true, shira: false })
  assert.deepEqual(soon, { before: 'את ״מסע בעקבות החכמים״ אפשר ', link: 'לקרוא כאן ביחד', after: ', ובקרוב גם את ״קולה של החכמה״.' })
  assert.deepEqual(booksReadNote(), soon, 'the default is the real availability')
  assert.deepEqual(booksReadNote({ saltiel: true, shira: true }), { before: 'את הספרים אפשר ', link: 'לקרוא כאן ביחד', after: '.' })
  assert.deepEqual(booksReadNote({ saltiel: false, shira: true }), { before: 'את ״קולה של החכמה״ אפשר ', link: 'לקרוא כאן ביחד', after: ', ובקרוב גם את ״מסע בעקבות החכמים״.' })
  assert.deepEqual(booksReadNote({ saltiel: false, shira: false }), { before: 'הסיפורים עצמם בספרים.', after: '' })
  for (const a of [{ saltiel: true, shira: false }, { saltiel: true, shira: true }, { saltiel: false, shira: false }]) {
    const n = booksReadNote(a)
    assert.doesNotMatch(`${n.before}${n.link ?? ''}${n.after}`, /[א-ת]"[א-ת]/, 'gershayim, not a plain quote')
  }
  assert.equal(KIDS_READ_PATH, '/he/kids/read')
  assert.equal(readBookHref('saltiel'), '/he/kids/read/saltiel')
})

console.log('\nthe About page')

const about = read('components/about/AboutContent.tsx')

test('the kids card gets one line below it, "אפשר גם לקרוא את הספר יחד", as a plain link outside the card\'s own link', () => {
  const line = 'אפשר גם לקרוא את הספר יחד'
  assert.equal(count(about, line), 1, 'once')
  const cardStart = about.indexOf('<a href="/he/kids"')
  const section = about.lastIndexOf("{locale === 'he' && (", cardStart)
  const cardEnd = about.indexOf('</a>', cardStart)
  const sectionEnd = about.indexOf('</section>', cardEnd)
  assert.ok(section > 0 && section < cardStart && cardStart < cardEnd, 'the card is in the Hebrew-only section')
  assert.ok(!about.slice(section, cardStart).includes('</section>'), 'the Hebrew-only block opens this very section')
  const at = about.indexOf(line)
  assert.ok(at > cardEnd && at < sectionEnd, 'below the card, in the same section, not nested in the card\'s <a>')
  const before = about.slice(cardEnd, at)
  assert.match(before, /<a href=\{BOOKS_HERE\.length === 1 \? readBookHref\(BOOKS_HERE\[0\]\) : KIDS_READ_PATH\}/)
  assert.doesNotMatch(about, /<Link/, 'plain <a>, as the card')
  assert.match(about, /const BOOKS_HERE = \(Object\.keys\(KIDS_BOOKS_AVAILABLE\) as BookRoute\[\]\)\.filter\(k => KIDS_BOOKS_AVAILABLE\[k\]\)/)
  assert.match(about, /\{BOOKS_HERE\.length > 0 && \(/)
})

test('with one book on the site the About line goes straight to it', () => {
  const here = (Object.keys(KIDS_BOOKS_AVAILABLE) as Array<keyof typeof KIDS_BOOKS_AVAILABLE>).filter(k => KIDS_BOOKS_AVAILABLE[k])
  assert.deepEqual(here, ['saltiel'])
  assert.equal(readBookHref(here[0]), '/he/kids/read/saltiel')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
