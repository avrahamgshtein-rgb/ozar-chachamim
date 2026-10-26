// The reading edition of the owner's children's books, as the reader's pages look it up: the books' JSON
// (content/kids-books/<book>.json, written by scripts/build_kids_book.py from the owner's HTML edition,
// never by hand), the parts in reading order, the meetings and their keys, and where a meeting sits on
// the kids' page.
//
// SERVER ONLY. This module bundles the whole text of the books (about 100 KB a book), so a 'use client'
// file must never import it: tests/kidsBooksLib.test.ts greps for that. A page reads the book here and
// passes a client component only what it needs, as props; the client-side logic lives in
// lib/kidsBookSpeech.ts and lib/kidsReading.ts, which are pure and small.
//
// A book is on the site when KIDS_BOOKS_AVAILABLE says so (lib/kidsBookLinks.ts) AND its JSON is imported
// below. Shira's book is added by importing her file here and flipping that constant; the test fails when
// the two disagree with the files in content/kids-books/.
import saltielJson from '../content/kids-books/saltiel.json'
import { KIDS_BOOKS_AVAILABLE, KIDS_BOOKS_INDEXED, KIDS_READ_PATH, readBookHref, readPartHref, type BookRoute } from './kidsBookLinks'
import type { Block, KeyBlock, KidsBook, Part } from './kidsBookTypes'
import { KIDS_ROUTES, KIDS_PATH, stationAnchor } from './kidsJourney'
import { kidsTourPath } from './kidsTour'

// The JSON files are cast through unknown: their shape is checked by validateBook in the tests, not by the
// compiler (a literal type inferred from 100 KB of text would be slow and no use).
const FILES: Partial<Record<BookRoute, KidsBook>> = {
  saltiel: saltielJson as unknown as KidsBook,
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

/** The book with this slug, or null when it is unknown, not yet on the site or has no file. */
export function getBook(slug: string): KidsBook | null {
  if (!has(KIDS_BOOKS_AVAILABLE, slug) || !KIDS_BOOKS_AVAILABLE[slug as BookRoute]) return null
  return has(FILES, slug) ? FILES[slug as BookRoute] ?? null : null
}

/** Every book on the site, in the order of the routes (Saltiel's, then Shira's). */
export function allBooks(): KidsBook[] {
  return KIDS_ROUTES.map(r => getBook(r.key)).filter((b): b is KidsBook => b !== null)
}

export function getPart(book: KidsBook, slug: string): Part | null {
  return book.parts.find(p => p.slug === slug) ?? null
}

/** The parts a reader turns through, in book order: the ones the book's own contents list holds (not the copyright page). */
export function readingOrder(book: KidsBook): Part[] {
  return book.parts.filter(p => p.nav)
}

/** The parts before and after a part in the reading order. A part outside it (the copyright page) and an unknown slug have none. */
export function neighbours(book: KidsBook, slug: string): { prev: Part | null; next: Part | null } {
  const order = readingOrder(book)
  const i = order.findIndex(p => p.slug === slug)
  if (i < 0) return { prev: null, next: null }
  return { prev: order[i - 1] ?? null, next: order[i + 1] ?? null }
}

/** The meetings (station 1, 2, 3 …), by their station number. */
export function meetingParts(book: KidsBook): Part[] {
  return book.parts.filter(p => p.kind === 'meeting').sort((a, b) => (a.station ?? 0) - (b.station ?? 0))
}

/** The meeting's key (its fear-of-Heaven word and verse), or null for a part that has none. */
export function keyOf(part: Part): KeyBlock | null {
  return part.blocks.find((b): b is KeyBlock => b.t === 'key') ?? null
}

/** The keys of the meetings in order, for the contents page's row of 🔑: `title` is "המפתח הראשון: כיסופים", `name` "כיסופים". */
export function keysOf(book: KidsBook): Array<{ n: number; name: string; title: string; slug: string }> {
  const out: Array<{ n: number; name: string; title: string; slug: string }> = []
  for (const part of meetingParts(book)) {
    const key = keyOf(part)
    if (key) out.push({ n: key.n, name: key.name, title: key.title, slug: part.slug })
  }
  return out
}

/**
 * Where a meeting sits on the kids' page, for the links at the end of its reader page: `card` is the station's
 * card (its game and task and its quiz are all there), `tourHref` the time machine at the start of the route
 * (the flight takes no ?station=). `stationTitle` is the station's title on that page, so the link reads as the
 * card does (the book's own title if the route has no such station). Null for a part that is not a meeting.
 */
export function stationLinks(book: KidsBook, part: Part): { n: number; stationTitle: string; card: string; tourHref: string } | null {
  if (part.kind !== 'meeting' || typeof part.station !== 'number') return null
  const n = part.station
  const station = KIDS_ROUTES.find(r => r.key === book.route)?.stations.find(s => s.n === n)
  return {
    n,
    stationTitle: station?.title ?? part.title,
    card: `${KIDS_PATH}#${stationAnchor(book.route, n)}`,
    tourHref: kidsTourPath(book.route),
  }
}

/** The visible text of a block, field by field in reading order. A placeholder (an unfilled field of the book) has none. */
function textsOf(block: Block): string[] {
  switch (block.t) {
    case 'h':
      return [block.text]
    case 'p':
      return block.placeholder ? [] : [block.text]
    case 'sep':
      return []
    case 'img':
      return block.caption ? [block.caption] : []
    case 'quote':
      return [block.text, block.source]
    case 'card':
      return [block.title, ...block.rows.flatMap(r => [r.label, r.text])]
    case 'key':
      return [block.title, block.text, block.verse, block.source]
    case 'activity':
      return [block.title, ...(block.intro ? [block.intro.text] : []), ...block.items.map(i => i.text)]
    case 'links':
      return block.items.map(i => i.text)
    case 'journey':
      return block.items.flatMap(i => [i.title, i.where, i.who])
    case 'timeline':
      return block.items.flatMap(i => [i.hebrew, i.civil, i.place, i.region])
    case 'glossary':
      return block.items.flatMap(i => [i.term, i.text, i.idea])
    case 'stamps':
      return [block.box, ...block.items]
  }
}

/**
 * Every text field of a part in reading order (kick, title, subtitle, then the blocks), one per line,
 * placeholders left out. The book's own characters, ASCII quotes included: apply `gershayim` to show it.
 */
export function partPlainText(part: Part): string {
  const lines: string[] = [part.kick ?? '', part.title, part.subtitle ?? '']
  for (const b of part.blocks) lines.push(...textsOf(b))
  return lines.filter(Boolean).join('\n')
}

/** Words in a part's plain text: whitespace-separated pieces that hold a letter or a digit (a lone dash is not a word). */
export function partWords(part: Part): number {
  return partPlainText(part)
    .split(/\s+/)
    .filter(w => /[\p{L}\p{N}]/u.test(w)).length
}

/** The pages to build ahead of time: every part of every book, the copyright page included. */
export function bookStaticParams(): Array<{ book: string; slug: string }> {
  return allBooks().flatMap(b => b.parts.map(p => ({ book: b.book, slug: p.slug })))
}

/**
 * The reader's addresses for the sitemap (Hebrew only): none while KIDS_BOOKS_INDEXED is false; once it is true
 * the books page, each contents page and each part of the book's own contents list (not the copyright page).
 * `indexed` is a parameter so the test can look at both settings.
 */
export function kidsBookSitemapPaths(indexed: boolean = KIDS_BOOKS_INDEXED): string[] {
  if (!indexed) return []
  return [KIDS_READ_PATH, ...allBooks().flatMap(b => [readBookHref(b.book), ...readingOrder(b).map(p => readPartHref(b.book, p.slug))])]
}
