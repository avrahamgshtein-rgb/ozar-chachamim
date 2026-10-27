/**
 * The children's books' reader pages and components (app/[locale]/kids/read, components/kids/reader):
 *  - the three pages render through renderToStaticMarkup, the page function awaited with Promise.resolve params;
 *  - every part carries the book's own text in order (nothing dropped, nothing rewritten but the site's bookMarks),
 *    never a placeholder, one h1, a data-speak on every piece the voice reads, noindex and the Hebrew canonical;
 *  - an unknown book, part or locale is a 404, Shira's book (not on the site yet) included;
 *  - the English and Russian addresses carry the note, and no reader address is in the sitemap;
 *  - the text size (the script that runs before paint agrees with lib/kidsReading.ts), the read-aloud player (driven with
 *    a fake voice, as headless Chromium has none), "continue where you stopped", the events;
 *  - no client component imports lib/kidsBooks (it bundles the whole text of the books).
 * It asserts no real counts (parts, meetings, words): those are the generator's test. It runs on whatever
 * content/kids-books/saltiel.json holds, and the components also on tests/fixtures/kids-book-sample.json.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import * as ReactNS from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { KIDS_BOOKS_AVAILABLE, KIDS_BOOKS_INDEXED, KIDS_READ_PATH, readBookHref, readPartHref, readerCanonical, readerRobots } from '../lib/kidsBookLinks'
import { bookMarks, validateBook, type Block, type KidsBook, type Part } from '../lib/kidsBookTypes'
import { bookSpeechItems } from '../lib/kidsBookSpeech'
import { allBooks, getBook, keysOf, neighbours, partPlainText, readingOrder, stationLinks } from '../lib/kidsBooks'
import { DEFAULT_FONT_STEP, FONT_KEY, FONT_STEPS, fontPx, parseFontStep, rememberPart, READING_KEY } from '../lib/kidsReading'
import { SITE_URL } from '../lib/siteUrl'
import { BookBlocks } from '../components/kids/reader/BookBlocks'
import { ContinueReading, continueTarget } from '../components/kids/reader/ContinueReading'
import { ListenBook, ReadAloud, READ_RATES, READ_RATE_KEY, firstBelow, hebrewVoice, nextRate, parseRate, type ListenStatus, type ReadAloudDeps } from '../components/kids/reader/ListenBook'
import { ReaderToolbar } from '../components/kids/reader/ReaderToolbar'
import { ReadingMemory } from '../components/kids/reader/ReadingMemory'
import { READER_NOTE, READER_TEXT_ID, fontInitScript } from '../components/kids/reader/ReaderShell'
import * as BooksPage from '../app/[locale]/kids/read/page'
import * as ContentsPage from '../app/[locale]/kids/read/[book]/page'
import * as PartPage from '../app/[locale]/kids/read/[book]/[slug]/page'
import sitemap from '../app/sitemap'

// the component files are transformed with the classic JSX runtime here (Next uses the automatic one)
;(globalThis as { React?: unknown }).React = ReactNS

let passed = 0
let failed = 0
const queue: Array<[string, () => void | Promise<void>]> = []
const test = (name: string, fn: () => void | Promise<void>) => { queue.push([name, fn]) }

const root = path.join(__dirname, '..')
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8')
const LOCALES = ['he', 'en', 'ru'] as const

// ---- helpers --------------------------------------------------------------------------------------------

const unescapeHtml = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
/** The visible text of some markup with every space removed: words glue across block ends, which is fine for inclusion checks. */
const compact = (html: string) => unescapeHtml(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, '')
const visible = (html: string) => unescapeHtml(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

const params = (o: Record<string, string>) => Promise.resolve(o) as never
const renderPart = async (locale: string, slug: string, book = 'saltiel') =>
  renderToStaticMarkup(await PartPage.default({ params: params({ locale, book, slug }) }))
const renderContents = async (locale = 'he', book = 'saltiel') =>
  renderToStaticMarkup(await ContentsPage.default({ params: params({ locale, book }) }))
const renderBooks = async (locale = 'he') => renderToStaticMarkup(await BooksPage.default({ params: params({ locale }) }))

const isNotFound = (e: unknown) => {
  const digest = (e as { digest?: string } | null)?.digest ?? ''
  return digest === 'NEXT_NOT_FOUND' || digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;404')
}
async function assertNotFound(run: () => Promise<unknown>, what: string) {
  let threw: unknown = null
  try { await run() } catch (e) { threw = e }
  assert.ok(threw && isNotFound(threw), `${what}: expected notFound(), got ${threw ? String(threw) : 'a page'}`)
}

const book = getBook('saltiel')
assert.ok(book, 'content/kids-books/saltiel.json must be on the site (KIDS_BOOKS_AVAILABLE.saltiel)')
const B = book as KidsBook
const fixture = JSON.parse(read('tests/fixtures/kids-book-sample.json')) as KidsBook
const attrs = (html: string, name: string) => [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map(m => unescapeHtml(m[1]))
const textBlock = (html: string) => html.slice(html.indexOf(`id="${READER_TEXT_ID}"`), html.indexOf('</article>'))

/** The block types whose pieces the voice reads, hence the ones that carry data-speak. */
const READ_TYPES = new Set<Block['t']>(['h', 'p', 'quote', 'key', 'card', 'activity', 'glossary'])

// ---- the fixture and the real book are both books the components can draw ------------------------------------

test('the real book and the fixture are valid books (so the checks below are on real structure)', () => {
  assert.deepEqual(validateBook(B), [])
  assert.deepEqual(validateBook(fixture), [])
})

// ---- the part page -------------------------------------------------------------------------------------------

test('every part of the book renders through the page function: one h1, the Hebrew frame, the title', async () => {
  for (const part of B.parts) {
    const html = await renderPart('he', part.slug)
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `${part.slug}: one h1`)
    assert.match(html, /<main id="main" lang="he" dir="rtl"/, `${part.slug}: Hebrew main`)
    assert.ok(visible(html).includes(bookMarks(part.title)), `${part.slug}: the title is on the page`)
    assert.ok(html.includes(`id="${READER_TEXT_ID}"`), `${part.slug}: the element the player looks pieces up in`)
  }
})

test('the book text of every part is on the page, all of it and in order (only the site\'s bookMarks differ)', async () => {
  for (const part of B.parts) {
    const stream = compact(textBlock(await renderPart('he', part.slug)))
    let at = 0
    for (const line of partPlainText(part).split('\n')) {
      const want = compact(bookMarks(line))
      const found = stream.indexOf(want, at)
      assert.ok(found >= 0, `${part.slug}: "${line.slice(0, 60)}" is missing or out of order`)
      at = found + want.length
    }
  }
})

test('on every page a geresh or gershayim is the site\'s, and the book\'s quotation marks stay as they are', async () => {
  for (const part of B.parts) {
    const text = visible(await renderPart('he', part.slug))
    // a letter on its own followed by an apostrophe (ה' the Name, האות מ') is always a geresh
    assert.doesNotMatch(text, /(^|[\s(])[א-ת]'(?=[\s,.:;)—]|$)/, `${part.slug}: a one-letter word with an ASCII apostrophe`)
    // a date: ה'רח"ץ is ה׳רח״ץ
    assert.doesNotMatch(text, /[הדג]'[א-ת]+"[א-ת]/, `${part.slug}: an ASCII date`)
    assert.doesNotMatch(text, /המהר"ל|המהרלב"ח|הרמב"ם/, `${part.slug}: an ASCII acronym`)
  }
  const m1 = visible(await renderPart('he', 'meeting-1'))
  assert.ok(m1.includes("'משקל יתדות ותנועות'"), 'a quoted phrase keeps its single quotes on both sides')
  assert.ok(m1.includes('ד׳תש״י'), 'the year of the card has its geresh and gershayim')
})

test('a placeholder (an unfilled field of the book) is never drawn, on a page or by BookBlocks', async () => {
  const placeholders = (b: KidsBook) => b.parts.flatMap(p => p.blocks.filter((x): x is Extract<Block, { t: 'p' }> => x.t === 'p' && !!x.placeholder).map(x => ({ part: p, text: x.text })))
  const real = placeholders(B)
  for (const { part, text } of real) {
    assert.ok(!compact(await renderPart('he', part.slug)).includes(compact(bookMarks(text))), `${part.slug}: "${text}"`)
  }
  for (const { part, text } of placeholders(fixture)) {
    assert.ok(!compact(renderToStaticMarkup(ReactNS.createElement(BookBlocks, { book: 'saltiel', part }))).includes(compact(text)), `fixture ${part.slug}: "${text}"`)
  }
  // a part made of nothing but an unfilled field and separators draws no separator either
  const only: Part = { slug: 'copyright', id: 'copyright', kind: 'front', title: 't', nav: false, blocks: [{ t: 'sep' }, { t: 'p', text: 'SECRETFIELD', placeholder: true }, { t: 'sep' }, { t: 'sep' }, { t: 'p', text: 'KEPT' }, { t: 'sep' }] }
  const html = renderToStaticMarkup(ReactNS.createElement(BookBlocks, { book: 'saltiel', part: only }))
  assert.ok(!html.includes('SECRETFIELD'))
  assert.ok(html.includes('KEPT'))
  assert.equal((html.match(/role="separator"/g) ?? []).length, 0, 'a separator at an end or twice in a row is dropped')
})

test('every piece the voice reads has its data-speak, each value once, and only readable blocks carry one', async () => {
  for (const part of B.parts) {
    const html = await renderPart('he', part.slug)
    const marked = attrs(html, 'data-speak')
    assert.equal(new Set(marked).size, marked.length, `${part.slug}: a data-speak value is used twice, so the player would light the wrong element`)
    const targets = new Set(bookSpeechItems(part).map(i => i.target))
    for (const t of targets) assert.ok(marked.includes(t), `${part.slug}: no element for the spoken target ${t}`)
    for (const m of marked) {
      if (m === 'title') continue
      assert.match(m, /^\d+(\.\d+)?$/, `${part.slug}: odd data-speak ${m}`)
      const blk = part.blocks[Number(m.split('.')[0])]
      assert.ok(blk && READ_TYPES.has(blk.t) && !(blk.t === 'p' && blk.placeholder), `${part.slug}: data-speak ${m} on a block that is not read`)
    }
  }
  // the same on the fixture, which holds every block type
  for (const part of fixture.parts) {
    const html = renderToStaticMarkup(ReactNS.createElement(BookBlocks, { book: 'saltiel', part }))
    const marked = attrs(html, 'data-speak')
    for (const it of bookSpeechItems(part)) if (it.target !== 'title') assert.ok(marked.includes(it.target), `fixture ${part.slug}: ${it.target}`)
  }
})

test('the page puts the title element first and a toolbar and the text after it', async () => {
  const html = await renderPart('he', B.parts[0].slug)
  const iTitle = html.indexOf('data-speak="title"')
  const iBar = html.indexOf('role="toolbar"')
  const iText = html.indexOf('<article')
  assert.ok(iTitle > 0 && iTitle < iBar && iBar < iText, `${iTitle} ${iBar} ${iText}`)
})

test('pictures are plain img tags with size, alt and lazy decoding; at most the first one loads at once', async () => {
  let seen = 0
  for (const part of B.parts) {
    const html = await renderPart('he', part.slug)
    assert.ok(!html.includes('/_next/image'), 'no next/image')
    const imgs = html.match(/<img\b[^>]*>/g) ?? []
    const eager: number[] = []
    imgs.forEach((tag, i) => {
      seen++
      assert.match(tag, /\swidth="\d+"/, tag)
      assert.match(tag, /\sheight="\d+"/, tag)
      assert.match(tag, /\sdecoding="async"/, tag)
      assert.match(tag, /\salt="/, tag)
      assert.match(tag, /\sloading="(lazy|eager)"/, tag)
      if (/\sloading="eager"/.test(tag)) eager.push(i)
    })
    assert.ok(eager.length <= 1 && (eager.length === 0 || eager[0] === 0), `${part.slug}: only the first picture may be eager`)
  }
  assert.ok(seen > 0, 'the book has pictures to check')
})

test('the font script is on the part page once, before the text', async () => {
  const html = await renderPart('he', B.parts[0].slug)
  const scripts = html.match(/<script>[\s\S]*?<\/script>/g) ?? []
  assert.equal(scripts.length, 1)
  assert.equal(scripts[0], `<script>${fontInitScript()}</script>`)
  assert.ok(html.indexOf('<script>') < html.indexOf(`id="${READER_TEXT_ID}"`))
})

test('the part page links the way on: previous, next, the contents, and for a meeting its station and the time machine', async () => {
  const order = readingOrder(B)
  assert.ok(order.length >= 2)
  for (const part of B.parts) {
    const html = await renderPart('he', part.slug)
    const hrefs = attrs(html, 'href')
    const { prev, next } = neighbours(B, part.slug)
    assert.equal(prev ? hrefs.includes(readPartHref('saltiel', prev.slug)) : true, true, `${part.slug}: previous`)
    assert.equal(next ? hrefs.includes(readPartHref('saltiel', next.slug)) : true, true, `${part.slug}: next`)
    if (part.nav) assert.ok(hrefs.includes(readBookHref('saltiel')), `${part.slug}: back to the contents`)
    if (!prev && part.nav) assert.ok(!/rel="prev"/.test(html), `${part.slug}: the first part has no previous`)
    if (!next && part.nav) assert.ok(!/rel="next"/.test(html), `${part.slug}: the last part has no next`)
    if (!part.nav) assert.ok(!/rel="(prev|next)"/.test(html), `${part.slug}: the copyright page is outside the reading order`)
    const st = stationLinks(B, part)
    if (st) {
      assert.ok(hrefs.includes(st.card), `${part.slug}: the station card`)
      assert.ok(hrefs.includes(st.tourHref), `${part.slug}: the time machine`)
    } else {
      assert.ok(!hrefs.some(h => h.startsWith('/he/kids/journey/')), `${part.slug}: only a meeting links the time machine`)
    }
    // the language links of the top bar follow the page
    assert.ok(hrefs.includes(`/en/kids/read/saltiel/${part.slug}`) && hrefs.includes(`/ru/kids/read/saltiel/${part.slug}`), `${part.slug}: language links`)
  }
})

test('a meeting page holds its key: the 🔑, the name and the verse as the book gives them', async () => {
  const meetings = B.parts.filter(p => p.kind === 'meeting')
  assert.ok(meetings.length > 0)
  for (const part of meetings) {
    const key = part.blocks.find((b): b is Extract<Block, { t: 'key' }> => b.t === 'key')
    assert.ok(key)
    const html = await renderPart('he', part.slug)
    const text = compact(html)
    assert.ok(html.includes('🔑'))
    for (const field of [key.title, key.name, key.text, key.verse, key.source]) assert.ok(text.includes(compact(bookMarks(field))), field)
  }
})

// ---- metadata, locales and 404 -------------------------------------------------------------------------------

test('every reader page is noindex while KIDS_BOOKS_INDEXED is false, canonical to its Hebrew address, in every language', async () => {
  const check = (md: Awaited<ReturnType<typeof PartPage.generateMetadata>>, locale: string, after: string, what: string) => {
    assert.deepEqual(md.robots, readerRobots(locale), `${what}: robots`)
    if (!KIDS_BOOKS_INDEXED) assert.deepEqual(md.robots, { index: false, follow: true }, `${what}: noindex`)
    assert.equal(md.alternates?.canonical, readerCanonical(after), `${what}: canonical`)
    assert.ok(String(md.alternates?.canonical).startsWith(`${SITE_URL}/he/kids/read`), `${what}: the Hebrew address`)
    assert.ok(typeof md.title === 'string' && md.title.length > 0, `${what}: title`)
    assert.ok(typeof md.description === 'string' && md.description.length > 0, `${what}: description`)
  }
  for (const locale of LOCALES) {
    check(await BooksPage.generateMetadata({ params: params({ locale }) }), locale, '', `books ${locale}`)
    check(await ContentsPage.generateMetadata({ params: params({ locale, book: 'saltiel' }) }), locale, '/saltiel', `contents ${locale}`)
    for (const part of B.parts) check(await PartPage.generateMetadata({ params: params({ locale, book: 'saltiel', slug: part.slug }) }), locale, `/saltiel/${part.slug}`, `${part.slug} ${locale}`)
  }
})

test('the share picture of a page is on the site and has a size', async () => {
  for (const part of B.parts) {
    const md = await PartPage.generateMetadata({ params: params({ locale: 'he', book: 'saltiel', slug: part.slug }) })
    const images = (md.openGraph as { images?: Array<{ url: string; width: number; height: number }> } | undefined)?.images ?? []
    assert.equal(images.length, 1, part.slug)
    assert.ok(images[0].url.startsWith(`${SITE_URL}/kids/books/saltiel/`) && images[0].width > 0 && images[0].height > 0, JSON.stringify(images))
  }
})

test('the English and Russian pages carry the note and the same Hebrew text; the Hebrew page has none', async () => {
  const slug = readingOrder(B)[0].slug
  const he = await renderPart('he', slug)
  for (const loc of ['en', 'ru'] as const) {
    const html = await renderPart(loc, slug)
    assert.ok(visible(html).includes(READER_NOTE[loc] as string), `${loc}: the note`)
    assert.match(html, /<main id="main" lang="he" dir="rtl"/, `${loc}: the text stays Hebrew`)
    assert.equal(compact(textBlock(html)), compact(textBlock(he)), `${loc}: the same text`)
    assert.ok((await renderContents(loc)).includes(READER_NOTE[loc] as string), `${loc}: contents note`)
    assert.ok((await renderBooks(loc)).includes(READER_NOTE[loc] as string), `${loc}: books note`)
  }
  for (const note of Object.values(READER_NOTE)) assert.ok(!visible(he).includes(note as string), 'Hebrew has no note')
})

test('an unknown part, an unknown book, a book not on the site yet and an unknown language are 404s', async () => {
  await assertNotFound(() => renderPart('he', 'nope'), 'unknown part')
  await assertNotFound(() => renderPart('he', 'meeting-1', 'nope'), 'unknown book')
  await assertNotFound(() => renderPart('he', 'station-1', 'shira'), 'Shira (no file yet)')
  await assertNotFound(() => renderPart('xx', B.parts[0].slug), 'unknown language')
  await assertNotFound(() => renderContents('he', 'nope'), 'contents of an unknown book')
  await assertNotFound(() => renderContents('he', 'shira'), 'contents of Shira (no file yet)')
  await assertNotFound(() => renderContents('xx'), 'contents in an unknown language')
  await assertNotFound(() => renderBooks('xx'), 'books in an unknown language')
  // the metadata of an unknown page is empty (Next then renders the 404), it does not throw
  assert.deepEqual(await PartPage.generateMetadata({ params: params({ locale: 'he', book: 'saltiel', slug: 'nope' }) }), {})
  assert.deepEqual(await ContentsPage.generateMetadata({ params: params({ locale: 'he', book: 'nope' }) }), {})
})

test('the pages are built ahead of time for every part of every book on the site', () => {
  const parts = PartPage.generateStaticParams()
  for (const b of allBooks()) for (const p of b.parts) assert.ok(parts.some(x => x.book === b.book && x.slug === p.slug), `${b.book}/${p.slug}`)
  assert.deepEqual(ContentsPage.generateStaticParams().map(x => x.book).sort(), allBooks().map(b => b.book).sort())
})

test('no reader address is in the sitemap while KIDS_BOOKS_INDEXED is false', async () => {
  const entries = await Promise.resolve(sitemap())
  assert.ok(entries.length > 0)
  const reader = entries.filter(e => e.url.includes('/kids/read'))
  if (!KIDS_BOOKS_INDEXED) assert.equal(reader.length, 0, reader.map(e => e.url).join(', '))
  else for (const e of reader) assert.ok(e.url.includes('/he/kids/read'), 'only the Hebrew reader pages are indexable')
})

// ---- the books page and the contents page -------------------------------------------------------------------

test('the books page: Saltiel\'s book is a link to its contents; Shira\'s is "coming soon" with no link', async () => {
  const html = await renderBooks('he')
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1)
  const hrefs = attrs(html, 'href')
  assert.ok(hrefs.includes(readBookHref('saltiel')))
  assert.equal(KIDS_BOOKS_AVAILABLE.shira, false, 'this test describes the time before her book is built')
  assert.ok(!hrefs.some(h => h.includes('/kids/read/shira')), 'no link to a book that is not there')
  assert.ok(visible(html).includes('בקרוב'))
  assert.ok(visible(html).includes(bookMarks(B.credit.author)) && visible(html).includes(bookMarks(B.credit.illustrator)))
  assert.ok(!hrefs.some(h => h === readBookHref('saltiel') + '/'), 'no trailing slash')
})

test('the contents page: the word to the parents first, the keys, every part with its own label, the copyright foot', async () => {
  const html = await renderContents('he')
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1)
  const hrefs = attrs(html, 'href')
  const order = readingOrder(B)
  for (const p of order) assert.ok(hrefs.includes(readPartHref('saltiel', p.slug)), `link to ${p.slug}`)
  const text = visible(html)
  for (const p of order) assert.ok(text.includes(bookMarks(p.tocLabel as string)), `label of ${p.slug}`)
  // the first link into the book is the parents' word
  const parents = B.parts.find(p => p.slug === 'parents')
  if (parents) {
    const first = hrefs.find(h => h.startsWith(`${readBookHref('saltiel')}/`))
    assert.equal(first, readPartHref('saltiel', 'parents'), 'the first way into the book is the word to the parents')
    assert.ok(text.indexOf('מתחילים כאן') >= 0 && text.indexOf('מתחילים כאן') < text.indexOf(bookMarks(parents.subtitle ?? parents.title)) + 200)
  }
  const keys = keysOf(B)
  assert.equal((html.match(/🔑/g) ?? []).length, keys.length, 'one 🔑 per key')
  for (const k of keys) {
    assert.ok(text.includes(bookMarks(k.name)), `key ${k.name}`)
    assert.ok(hrefs.includes(readPartHref('saltiel', k.slug)))
  }
  const copyright = B.parts.find(p => !p.nav)
  if (copyright) assert.ok(hrefs.includes(readPartHref('saltiel', copyright.slug)), 'the copyright page is reached from the foot')
  assert.ok(!html.includes('ContinueReading') && !text.includes('להמשיך מהמקום'), 'the server page draws no "continue": only a browser that has been here does')
  // the contents list holds the reading order and not the copyright page
  const tocAt = html.indexOf('id="toc-h"')
  const tocHrefs = attrs(html.slice(tocAt), 'href').filter(h => h.startsWith(`${readBookHref('saltiel')}/`))
  assert.deepEqual(tocHrefs.slice(0, order.length), order.map(p => readPartHref('saltiel', p.slug)))
})

// ---- text size --------------------------------------------------------------------------------------------

test('the script that runs before paint agrees with parseFontStep for every stored value', () => {
  const run = (raw: string | null | 'throw') => {
    const set: Record<string, string> = {}
    const ctx = {
      localStorage: { getItem: (k: string) => { if (raw === 'throw') throw new Error('blocked'); return k === FONT_KEY ? raw : null } },
      document: { documentElement: { style: { setProperty: (k: string, v: string) => { set[k] = v } } } },
    }
    vm.runInNewContext(fontInitScript(), ctx)
    return set['--read-px']
  }
  // an unreadable value sets nothing, and the text's own CSS falls back to the default size
  const fallback = `${fontPx(DEFAULT_FONT_STEP)}px`
  const raws: Array<string | null> = [null, '', ' ', '0', '1', '2', '3', '4', '5', '6', '7', '99', '-1', '2.5', 'abc', '2px', ' 3 ', '03', '1e1', '１', '[]', 'null']
  for (const raw of raws) {
    const expected = `${fontPx(parseFontStep(raw))}px`
    assert.equal(run(raw) ?? fallback, expected, `stored ${JSON.stringify(raw)}`)
  }
  for (let i = 0; i < FONT_STEPS.length; i++) assert.equal(run(String(i)), `${FONT_STEPS[i]}px`, `step ${i}`)
  assert.equal(run('throw'), undefined, 'blocked storage: no error, no change')
  assert.equal(JSON.stringify(fontInitScript()).includes('</script'), false)
})

test('the text is set from the variable the buttons and the script set, with the default as its fallback', () => {
  const page = read('app/[locale]/kids/read/[book]/[slug]/page.tsx')
  assert.ok(page.includes(`text-[length:var(--read-px,${fontPx(DEFAULT_FONT_STEP)}px)]`), 'the article\'s size and fallback')
  assert.ok(read('components/kids/reader/ReaderToolbar.tsx').includes("'--read-px'"))
  assert.ok(read('components/kids/reader/ReaderShell.tsx').includes("'--read-px'"))
  assert.match(page, /leading-\[1\.9\]/)
  assert.match(page, /max-w-\[30em\]/)
})

test('the toolbar: A− and A+ with names, neither disabled at the default size, no listen button without a voice', () => {
  const html = renderToStaticMarkup(ReactNS.createElement(ReaderToolbar, { book: 'saltiel', items: bookSpeechItems(B.parts[0]), targetId: READER_TEXT_ID }))
  assert.match(html, /role="toolbar"/)
  assert.match(html, /aria-label="הקטנת הגופן"/)
  assert.match(html, /aria-label="הגדלת הגופן"/)
  assert.ok(!/\sdisabled(=|\s|>)/.test(html), 'the default step is inside the scale, not at an end')
  assert.ok(!html.includes('הקראה בקול'), 'there is no voice on the server, so no listen button')
  assert.ok(html.includes('A−') && html.includes('A+'))
  assert.ok(DEFAULT_FONT_STEP > 0 && DEFAULT_FONT_STEP < FONT_STEPS.length - 1)
})

// ---- read aloud ---------------------------------------------------------------------------------------------

function fakeVoice() {
  const said: Array<{ text: string; rate: number }> = []
  const pending: Array<{ end: () => void; fail: (c: string) => void }> = []
  const lit: Array<string | null> = []
  const statuses: ListenStatus[] = []
  let cancels = 0
  const deps: ReadAloudDeps = {
    say(text, rate, end, fail) { said.push({ text, rate }); pending.push({ end, fail }) },
    cancel() { cancels++ },
    light(item) { lit.push(item ? item.target : null) },
    status(s) { statuses.push(s) },
  }
  return { deps, said, pending, lit, statuses, cancels: () => cancels }
}
const ITEMS = [
  { target: 'title', text: 'אחד' }, { target: '0', text: 'שניים' }, { target: '1', text: 'שלושה' }, { target: '1', text: 'ארבעה' },
]

test('read aloud: plays the pieces in order, lights each, and ends idle with nothing lit', () => {
  const f = fakeVoice()
  const p = new ReadAloud(ITEMS, f.deps)
  p.play(0)
  assert.equal(p.state, 'playing')
  assert.deepEqual(f.said.map(s => s.text), ['אחד'])
  for (let i = 0; i < ITEMS.length; i++) f.pending[i].end()
  assert.deepEqual(f.said.map(s => s.text), ITEMS.map(i => i.text))
  assert.deepEqual(f.lit, ['title', '0', '1', '1', null])
  assert.equal(p.state, 'idle')
  assert.deepEqual(f.statuses, ['playing', 'idle'])
})

test('read aloud: pause keeps the place, a late end of the cancelled piece is ignored, resume says the same piece again', () => {
  const f = fakeVoice()
  const p = new ReadAloud(ITEMS, f.deps)
  p.play(0)
  f.pending[0].end()
  assert.equal(p.index, 1)
  p.pause()
  assert.equal(p.state, 'paused')
  const before = f.said.length
  f.pending[1].end() // the browser fires `end` for the piece it was told to cancel
  f.pending[1].fail('interrupted')
  assert.equal(f.said.length, before, 'a stale event says nothing')
  p.resume()
  assert.equal(p.state, 'playing')
  assert.equal(f.said[f.said.length - 1].text, 'שניים')
})

test('read aloud: stop clears the light and goes idle; a late event does nothing', () => {
  const f = fakeVoice()
  const p = new ReadAloud(ITEMS, f.deps)
  p.play(1)
  assert.equal(f.said[0].text, 'שניים')
  p.stop()
  assert.equal(p.state, 'idle')
  assert.equal(f.lit[f.lit.length - 1], null)
  f.pending[0].end()
  assert.equal(f.said.length, 1)
})

test('read aloud: a voice error skips to the next piece; being cancelled does not; a stale error does nothing', () => {
  const f = fakeVoice()
  const p = new ReadAloud(ITEMS, f.deps)
  p.play(0)
  f.pending[0].fail('canceled')
  f.pending[0].fail('interrupted')
  assert.equal(f.said.length, 1, 'cancelled/interrupted do not advance')
  f.pending[0].fail('synthesis-failed')
  assert.equal(f.said.length, 2, 'a failed piece is skipped')
  assert.equal(f.said[1].text, 'שניים')
  p.pause()
  f.pending[1].fail('synthesis-failed')
  assert.equal(f.said.length, 2)
})

test('read aloud: a new speed applies from the piece being said; while idle it is only kept', () => {
  const f = fakeVoice()
  const p = new ReadAloud(ITEMS, f.deps)
  p.setRate(1.3)
  assert.equal(f.said.length, 0)
  p.play(2)
  assert.equal(f.said[0].rate, 1.3)
  p.setRate(1.5)
  assert.deepEqual(f.said.map(s => [s.text, s.rate]), [['שלושה', 1.3], ['שלושה', 1.5]])
  f.pending[0].end() // the old piece's end is stale after the restart
  assert.equal(f.said.length, 2)
})

test('read aloud: starting past the end finishes at once; dispose cancels without reporting a state', () => {
  const f = fakeVoice()
  const p = new ReadAloud(ITEMS, f.deps)
  p.play(99)
  assert.equal(p.state, 'idle')
  assert.equal(f.said.length, 0)
  const g = fakeVoice()
  const q = new ReadAloud(ITEMS, g.deps)
  q.play(0)
  const statuses = g.statuses.length
  q.dispose()
  assert.ok(g.cancels() >= 2)
  assert.equal(g.statuses.length, statuses, 'no state is reported to a component that is gone')
  g.pending[0].end()
  assert.equal(g.said.length, 1)
})

test('read aloud: listening starts at the first piece on the screen; a Hebrew voice on the device is preferred', () => {
  assert.equal(firstBelow([null, 40, 89, 91, 300]), 3)
  assert.equal(firstBelow([-200, -10, 5]), 0, 'nothing below the bar starts from the top')
  assert.equal(firstBelow([]), 0)
  const v = (lang: string, localService: boolean) => ({ lang, localService })
  assert.equal(hebrewVoice([v('en-US', true), v('de', true)]), null, 'no voice, no button')
  assert.equal(hebrewVoice([v('he-IL', false), v('iw_IL', true)])?.localService, true)
  assert.equal(hebrewVoice([v('HE-il', false)])?.lang, 'HE-il')
  assert.equal(hebrewVoice([v('iw', false)])?.lang, 'iw')
})

test('read aloud: the speeds and their stored key are the research player\'s, so one speed holds for the site', () => {
  const src = read('components/sages/ListenResearch.tsx')
  const rates = JSON.parse((src.match(/const RATES = (\[[^\]]*\])/) as RegExpMatchArray)[1]) as number[]
  assert.deepEqual(READ_RATES, rates)
  assert.equal(READ_RATE_KEY, (src.match(/const RATE_KEY = '([^']+)'/) as RegExpMatchArray)[1])
  assert.equal(parseRate('1.3'), 1.3)
  for (const bad of [null, '', 'abc', '2', '0', '-1', 'NaN']) assert.equal(parseRate(bad), 1, String(bad))
  let r = 1
  const seen: number[] = []
  for (let i = 0; i < READ_RATES.length; i++) { r = nextRate(r); seen.push(r) }
  assert.deepEqual(seen.sort(), [...READ_RATES].sort(), 'the cycle visits every speed and returns')
  assert.equal(r, 1)
})

test('read aloud: the button is not drawn without a Hebrew voice (the server has none), and the music steps aside while it speaks', () => {
  const html = renderToStaticMarkup(ReactNS.createElement(ListenBook, { items: ITEMS, targetId: READER_TEXT_ID, book: 'saltiel' }))
  assert.equal(html, '')
  const src = read('components/kids/reader/ListenBook.tsx')
  assert.ok(src.includes("holdSoundtrack('speech')") && src.includes("releaseSoundtrack('speech')"))
  assert.ok(src.includes('window.speechSynthesis.speak(u)'), 'the first piece is spoken inside the click (iOS speaks only in a user gesture)')
  assert.match(src, /onClick=\{status === 'idle' \? start/, 'the click starts the voice directly')
  assert.ok(!src.includes('await '), 'nothing is awaited between the click and the first piece')
  assert.ok(src.includes('SpeechSynthesisUtterance'))
})

// ---- the reader's place and the events ------------------------------------------------------------------------

test('continue where you stopped: the stored part, only when the book still has it, only for this book', () => {
  const parts = readingOrder(B).map(p => ({ slug: p.slug, label: p.title, href: readPartHref('saltiel', p.slug) }))
  const pick = parts[parts.length - 1]
  const stored = JSON.stringify(rememberPart({}, 'saltiel', pick.slug, 1790000000000))
  assert.equal(continueTarget(stored, 'saltiel', parts)?.slug, pick.slug)
  assert.equal(continueTarget(stored, 'shira', parts), null, 'another book\'s place is not this one\'s')
  assert.equal(continueTarget(JSON.stringify(rememberPart({}, 'saltiel', 'a-part-that-was-removed', 5)), 'saltiel', parts), null)
  assert.equal(continueTarget(JSON.stringify(rememberPart({}, 'saltiel', 'copyright', 5)), 'saltiel', parts), null, 'the copyright page is not a place to continue from')
  for (const junk of [null, '', 'x', '{', '[]', '"a"', '{"saltiel":1}', '{"saltiel":{"slug":5,"at":1}}', '{"__proto__":{"slug":"parents","at":1}}']) {
    assert.equal(continueTarget(junk, 'saltiel', parts), null, String(junk))
  }
  assert.equal(READING_KEY, 'ozar-kids-reading')
})

test('the browser-side pieces draw nothing on the server: no "continue", no memory', () => {
  const parts = [{ slug: 'parents', label: 'x', href: '/x' }]
  assert.equal(renderToStaticMarkup(ReactNS.createElement(ContinueReading, { book: 'saltiel', parts })), '')
  assert.equal(renderToStaticMarkup(ReactNS.createElement(ReadingMemory, { book: 'saltiel', slug: 'parents', kind: 'front', remember: true })), '')
})

test('the events: kids_read when a part opens and kids_read_listen at the first press, with the book and the kind and nothing else', () => {
  const mem = read('components/kids/reader/ReadingMemory.tsx')
  const listen = read('components/kids/reader/ListenBook.tsx')
  assert.ok(mem.includes("track('kids_read', { book, part_kind: kind })"))
  assert.ok(listen.includes("track('kids_read_listen', { book })"))
  const analytics = read('lib/analytics.ts')
  assert.match(analytics, /\|\s*'kids_read'/)
  assert.match(analytics, /\|\s*'kids_read_listen'/)
  // no other track call in the reader, and none that carries a title, a name or an id
  for (const f of readdirSync(path.join(root, 'components/kids/reader'))) {
    const calls = read(`components/kids/reader/${f}`).match(/(?<![A-Za-z])track\([^)]*\)/g) ?? []
    for (const c of calls) assert.ok(/^track\('kids_read(_listen)?', \{ book(, part_kind: kind)? \}\)$/.test(c), `${f}: ${c}`)
  }
})

// ---- structure ------------------------------------------------------------------------------------------------

test('no client component imports lib/kidsBooks (it bundles the whole text of the books); the pages do', () => {
  const dir = path.join(root, 'components/kids/reader')
  const files = readdirSync(dir).filter(f => f.endsWith('.tsx'))
  assert.ok(files.length >= 5)
  let clients = 0
  for (const f of files) {
    const src = read(`components/kids/reader/${f}`)
    assert.doesNotMatch(src, /from\s+['"][^'"]*\/kidsBooks['"]/, `${f} imports lib/kidsBooks`)
    assert.doesNotMatch(src, /from\s+['"][^'"]*\/content\/kids-books/, `${f} imports the book's JSON`)
    if (/^\s*['"]use client['"]/.test(src)) clients++
  }
  assert.ok(clients >= 4, 'the toolbar, the player, the memory and the continue card are client components')
  for (const page of ['app/[locale]/kids/read/page.tsx', 'app/[locale]/kids/read/[book]/page.tsx', 'app/[locale]/kids/read/[book]/[slug]/page.tsx']) {
    const src = read(page)
    assert.doesNotMatch(src, /^\s*['"]use client['"]/, `${page} is a server page`)
    assert.match(src, /from\s+'@\/lib\/kidsBooks'/, `${page} reads the book on the server`)
  }
})

test('the lists of links (the map, the timeline, the contents) do not prefetch every part; the way on from a part does', () => {
  const blocks = read('components/kids/reader/BookBlocks.tsx')
  const links = blocks.match(/<Link href=\{readPartHref\(book, it\.part\)\}[^>]*>/g) ?? []
  assert.ok(links.length >= 3)
  for (const l of links) assert.ok(l.includes('prefetch={false}'), l)
  const contents = read('app/[locale]/kids/read/[book]/page.tsx')
  const toc = contents.match(/<Link href=\{readPartHref\(book\.book, (k\.slug|p\.slug)\)\}[^>]*>/g) ?? []
  assert.equal(toc.length, 2)
  for (const l of toc) assert.ok(l.includes('prefetch={false}'), l)
  assert.ok(!read('components/kids/reader/PartFooter.tsx').includes('prefetch={false}'), 'the next and previous parts are prefetched')
})

test('the highlight of the piece being read is Tailwind variants on the reader\'s element, not global CSS', () => {
  const page = read('app/[locale]/kids/read/[book]/[slug]/page.tsx')
  assert.ok(page.includes('[&_.speaking]:'), 'the .speaking style')
  assert.ok(read('components/kids/reader/ListenBook.tsx').includes("classList.add('speaking')"))
  assert.doesNotMatch(read('app/globals.css'), /kids-reader|book-text/)
})

test('no model name, and the reader\'s texts are the page\'s own Hebrew', () => {
  for (const f of readdirSync(path.join(root, 'components/kids/reader'))) {
    assert.doesNotMatch(read(`components/kids/reader/${f}`), /claude|sonnet|opus|haiku/i, f)
  }
})

test('the book names its own route; the reader finds the station card of each meeting', () => {
  for (const part of B.parts.filter(p => p.kind === 'meeting')) {
    const st = stationLinks(B, part)
    assert.ok(st && st.card.startsWith('/he/kids#') && st.tourHref.startsWith('/he/kids/journey/'), part.slug)
  }
  assert.equal(KIDS_READ_PATH, '/he/kids/read')
})

// ---- the blocks, on the fixture that has every type ---------------------------------------------------------------

test('BookBlocks draws every block type of the fixture, with marks, quotes and the site\'s bookMarks', () => {
  const types = new Set<string>()
  for (const part of fixture.parts) {
    for (const b of part.blocks) types.add(b.t)
    const html = renderToStaticMarkup(ReactNS.createElement(BookBlocks, { book: 'saltiel', part }))
    assert.ok(html.length > 0, part.slug)
    const text = compact(html)
    for (const line of partPlainText({ ...part, kick: undefined, title: '', subtitle: undefined }).split('\n').filter(Boolean)) {
      assert.ok(text.includes(compact(bookMarks(line))), `${part.slug}: "${line.slice(0, 50)}"`)
    }
  }
  for (const t of ['h', 'p', 'sep', 'img', 'quote', 'card', 'key', 'activity', 'links', 'journey', 'timeline', 'glossary', 'stamps']) {
    assert.ok(types.has(t), `the fixture should hold a ${t} block`)
  }
})

test('marks become strong, em and small; a mark that ends before a quote cannot hide the letter from the bookMarks rule', () => {
  const part: Part = {
    slug: 'prologue', id: 'prologue', kind: 'intro', title: 't', nav: true, tocLabel: 't',
    blocks: [
      { t: 'p', text: 'המהר"ל אמר: צאו וראו', marks: [{ k: 'b', from: 0, to: 4 }, { k: 'em', from: 12, to: 20 }] },
      { t: 'p', text: 'שלום קטן', marks: [{ k: 'small', from: 5, to: 8 }] },
    ],
  }
  const html = renderToStaticMarkup(ReactNS.createElement(BookBlocks, { book: 'saltiel', part }))
  assert.match(html, /<strong[^>]*>המהר<\/strong>״ל אמר: <em[^>]*>צאו וראו<\/em>/)
  assert.match(html, /שלום <small[^>]*>קטן<\/small>/)
})

test('neighbouring short sayings become a row of chips, each keeping its own data-speak; one alone is a bar', () => {
  const mk = (blocks: Block[]): Part => ({ slug: 'prologue', id: 'prologue', kind: 'intro', title: 't', nav: true, tocLabel: 't', blocks })
  const four = renderToStaticMarkup(ReactNS.createElement(BookBlocks, {
    book: 'saltiel',
    part: mk([{ t: 'p', text: 'פתיחה' }, { t: 'p', style: 'mem', text: 'מסע' }, { t: 'p', style: 'mem', text: 'מפגשים' }, { t: 'p', style: 'mem', text: 'מהפכות.' }]),
  }))
  assert.equal((four.match(/flex-wrap justify-center/g) ?? []).length, 1)
  assert.deepEqual(attrs(four, 'data-speak'), ['0', '1', '2', '3'])
  const one = renderToStaticMarkup(ReactNS.createElement(BookBlocks, { book: 'saltiel', part: mk([{ t: 'p', style: 'mem', text: 'מסע' }]) }))
  assert.ok(!one.includes('flex-wrap'))
  assert.deepEqual(attrs(one, 'data-speak'), ['0'])
})

// ---- run ------------------------------------------------------------------------------------------------------

;(async () => {
  for (const [name, fn] of queue) {
    try {
      await fn()
      passed++
      console.log(`  ok  ${name}`)
    } catch (e) {
      failed++
      console.log(`  FAIL ${name}\n       ${(e as Error).message}`)
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
})()
