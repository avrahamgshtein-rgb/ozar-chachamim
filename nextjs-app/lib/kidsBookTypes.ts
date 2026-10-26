// The reading edition of the owner's children's books: the shape of content/kids-books/<book>.json, which
// scripts/build_kids_book.py writes from the owner's HTML edition of the book (never by hand), and the checks
// the generator's test, the reader and the lead's integration run on it. Pure: no dataset, no DOM.
//
// EVERY text field holds the book's text exactly as the edition has it (nikud, the ASCII " and ' the book
// uses, its dashes): never rewritten, never normalised. The site's Hebrew punctuation is applied only where the
// text is shown or read aloud, through `bookMarks` below (lib/hebrewMarks.ts: gershayim and geresh where they
// are one, the book's quotation marks left as they are), which keeps every offset valid.
import { partSlugOf, type BookRoute } from './kidsBookLinks'
import { bookMarks, gershayim } from './hebrewMarks'

export { bookMarks, gershayim }

/** Emphasis inside a text: offsets are in UTF-16 units of the sibling `text`, 0 <= from < to <= text.length, ordered, never overlapping. */
export interface Mark { k: 'b' | 'em' | 'small'; from: number; to: number }
export interface Run { text: string; marks?: Mark[] }
/** A picture: `src` is /kids/books/<book>/<name>.webp. */
export interface Img { src: string; w: number; h: number; alt: string }

export type PStyle = 'kv' | 'mem' | 'verse' | 'center' | 'center-strong' | 'small' | 'note'

export type Block =
  | { t: 'h'; level: 2 | 3; text: string; marks?: Mark[] }
  /** `placeholder`: an unfilled field of the book (the author's surname, an ISBN): kept for the coverage test, never shown or read aloud. */
  | { t: 'p'; text: string; marks?: Mark[]; style?: PStyle; placeholder?: true }
  | { t: 'sep' }
  | ({ t: 'img'; variant: 'panel' | 'son'; caption?: string } & Img)
  /** The verse on the door: blockquote and its cite. */
  | { t: 'quote'; text: string; source: string }
  /** כרטיס מסע: לאן? / מתי? / את מי נפגוש? / מילות המפתח. */
  | { t: 'card'; title: string; rows: Array<{ label: string; text: string }> }
  /** The meeting's key: `title` "המפתח הראשון: כיסופים", `name` "כיסופים", the verse with its quotes, `source` "(תהלים פד, ג)". */
  | { t: 'key'; n: number; title: string; name: string; text: string; verse: string; source: string }
  /** משחק ומשימה: an ordered list, each item starting with a bold label. */
  | { t: 'activity'; title: string; intro?: Run; items: Run[] }
  /** The map page's row of links to other parts; `part` is a slug. */
  | { t: 'links'; items: Array<{ text: string; part: string }> }
  | { t: 'journey'; items: Array<{ n: number; title: string; where: string; who: string; part: string; thumb: Img }> }
  | { t: 'timeline'; items: Array<{ n: number; hebrew: string; civil: string; place: string; region: string; part: string; first?: true }> }
  /** `idea` keeps its "רעיון לציור: " prefix. */
  | { t: 'glossary'; items: Array<{ term: string; text: string; idea: string }> }
  /** The passport: `box` is the stamp's label ("חותמת"), `items` the lines "מפגש 1 · קורדובה". */
  | { t: 'stamps'; box: string; items: string[] }

export type KeyBlock = Extract<Block, { t: 'key' }>

export type PartKind = 'front' | 'intro' | 'meeting' | 'closing' | 'glossary' | 'activities'

export interface Part {
  /** The part's address: copyright | parents | map | timeline | prologue | meeting-1..7 | epilogue | glossary | passport (Shira's stations: station-1..8). */
  slug: string
  /** The book's own anchor: copyright, parents, map, timeline, prologue, m1..m7, epilogue, glossary, passport. */
  id: string
  kind: PartKind
  /** 'המפגש הראשון' | 'מבוא' | 'סוף המסע' | 'מפתחות בית המדרש' */
  kick?: string
  /** The h1 (for the copyright page: its first line). */
  title: string
  subtitle?: string
  /** Meeting parts only: 1..N, the station number on /he/kids. */
  station?: number
  /** false only for the copyright page, which the book's own contents list leaves out. */
  nav: boolean
  /** The text of the book's own contents link; present exactly when `nav`. */
  tocLabel?: string
  blocks: Block[]
}

export interface KidsBook {
  schema: 1
  book: BookRoute
  /** The key of the route in lib/kidsJourney.ts (equals `book`). */
  route: BookRoute
  title: string
  subtitle: string
  kick: string
  age: string
  /** The owner's words (data/kids-books/<book>.meta.json), not the book's own copyright lines, which carry unfilled placeholders. */
  credit: { author: string; illustrator: string; rights: string }
  cover: Img
  /** The committed source the generator read: repo-relative path, its sha256, the edition's date. */
  source: { file: string; sha256: string; edition: string }
  /** The sections of the book, in book order. */
  parts: Part[]
}

export const PART_KINDS: PartKind[] = ['front', 'intro', 'meeting', 'closing', 'glossary', 'activities']
export const P_STYLES: PStyle[] = ['kv', 'mem', 'verse', 'center', 'center-strong', 'small', 'note']
export const BLOCK_TYPES = ['h', 'p', 'sep', 'img', 'quote', 'card', 'key', 'activity', 'links', 'journey', 'timeline', 'glossary', 'stamps'] as const
export const BOOK_ROUTES: BookRoute[] = ['saltiel', 'shira']

/**
 * A run cut at its marks, in order: [{ text: 'קהל יעד:', mark: 'b' }, { text: ' גילאי 9 עד 12' }].
 * With `display: true` the whole text is first converted with `bookMarks` (a quote can open before a mark and close
 * after it, so the conversion never works on a slice) and then cut; one character for one character, so the cut
 * points hold.
 */
export function segmentsOf(run: Run, opts: { display?: boolean } = {}): Array<{ text: string; mark?: Mark['k'] }> {
  const text = opts.display ? bookMarks(run.text) : run.text
  const out: Array<{ text: string; mark?: Mark['k'] }> = []
  let at = 0
  for (const m of run.marks ?? []) {
    if (m.from > at) out.push({ text: text.slice(at, m.from) })
    out.push({ text: text.slice(m.from, m.to), mark: m.k })
    at = m.to
  }
  if (at < text.length) out.push({ text: text.slice(at) })
  return out
}

// ---- validation -----------------------------------------------------------------------------------------

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)
const SLUG = /^[a-z]+(-\d+)?$/

/**
 * What a valid book looks like. Returns the problems found, each with its place; an empty list means valid.
 * Structure only: it cannot know whether the text is the book's (the generator's test compares it with the
 * docx's own text), and it does not look for the image files (the generator's test does).
 */
export function validateBook(input: unknown): string[] {
  const errs: string[] = []
  const bad = (where: string, what: string) => errs.push(`${where}: ${what}`)
  if (!isObj(input)) return ['book: not an object']
  const b = input

  const needStr = (o: Obj, k: string, where: string, allowEmpty = false) => {
    if (!isStr(o[k]) || (!allowEmpty && !(o[k] as string).trim())) bad(where, `"${k}" must be a${allowEmpty ? '' : ' non-empty'} string`)
  }
  const checkMarks = (marks: unknown, text: unknown, where: string) => {
    if (marks === undefined) return
    if (!Array.isArray(marks) || marks.length === 0) return bad(where, '"marks" must be a non-empty array when present')
    if (!isStr(text)) return
    let at = 0
    marks.forEach((m, i) => {
      if (!isObj(m) || !['b', 'em', 'small'].includes(m.k as string) || !isInt(m.from) || !isInt(m.to)) return bad(`${where}.marks[${i}]`, 'must be { k: b|em|small, from, to }')
      if (m.from < at || m.from >= m.to || m.to > text.length) bad(`${where}.marks[${i}]`, `offsets ${m.from}..${m.to} are out of order, empty or past the text (${text.length}), or overlap the previous mark`)
      at = m.to
    })
  }
  const checkRun = (r: unknown, where: string) => {
    if (!isObj(r)) return bad(where, 'must be { text, marks? }')
    needStr(r, 'text', where)
    checkMarks(r.marks, r.text, where)
  }
  const checkImg = (im: unknown, where: string, book: string, allowEmptyAlt = false) => {
    if (!isObj(im)) return bad(where, 'must be an image { src, w, h, alt }')
    if (!isStr(im.src) || !im.src.startsWith(`/kids/books/${book}/`) || !im.src.endsWith('.webp')) bad(where, `"src" must be /kids/books/${book}/<name>.webp, got ${String(im.src)}`)
    if (!isInt(im.w) || im.w <= 0 || !isInt(im.h) || im.h <= 0) bad(where, '"w" and "h" must be positive integers')
    needStr(im, 'alt', where, allowEmptyAlt)
  }

  if (b.schema !== 1) bad('book', '"schema" must be 1')
  if (!BOOK_ROUTES.includes(b.book as BookRoute)) bad('book', '"book" must be saltiel or shira')
  if (b.route !== b.book) bad('book', '"route" must equal "book"')
  const book = isStr(b.book) ? b.book : 'saltiel'
  for (const k of ['title', 'subtitle', 'kick', 'age']) needStr(b, k, 'book')
  if (!isObj(b.credit)) bad('book.credit', 'must be { author, illustrator, rights }')
  else for (const k of ['author', 'illustrator', 'rights']) needStr(b.credit, k, 'book.credit')
  checkImg(b.cover, 'book.cover', book)
  if (!isObj(b.source)) bad('book.source', 'must be { file, sha256, edition }')
  else {
    needStr(b.source, 'file', 'book.source')
    if (!isStr(b.source.sha256) || !/^[0-9a-f]{64}$/.test(b.source.sha256)) bad('book.source', '"sha256" must be 64 hex digits')
    if (!isStr(b.source.edition) || !/^\d{4}-\d{2}-\d{2}$/.test(b.source.edition)) bad('book.source', '"edition" must be YYYY-MM-DD')
  }
  if (!Array.isArray(b.parts) || b.parts.length === 0) {
    bad('book', '"parts" must be a non-empty array')
    return errs
  }

  const parts = b.parts as unknown[]
  const slugs = new Set<string>()
  for (const p of parts) if (isObj(p) && isStr(p.slug)) slugs.add(p.slug)
  const seen = new Set<string>()
  const stations: number[] = []

  parts.forEach((p, pi) => {
    const where = `parts[${pi}]`
    if (!isObj(p)) return bad(where, 'not an object')
    const w = `${where}(${String(p.slug)})`
    if (!isStr(p.slug) || !SLUG.test(p.slug)) bad(w, '"slug" must look like prologue or meeting-1')
    else if (seen.has(p.slug)) bad(w, 'duplicate slug')
    else seen.add(p.slug)
    needStr(p, 'id', w)
    if (!PART_KINDS.includes(p.kind as PartKind)) bad(w, `"kind" must be one of ${PART_KINDS.join(', ')}`)
    needStr(p, 'title', w)
    for (const k of ['kick', 'subtitle', 'tocLabel']) if (p[k] !== undefined) needStr(p, k, w)
    if (typeof p.nav !== 'boolean') bad(w, '"nav" must be a boolean')
    else if (p.nav !== (p.tocLabel !== undefined)) bad(w, '"tocLabel" must be present exactly when "nav" is true')
    if (!Array.isArray(p.blocks) || p.blocks.length === 0) return bad(w, '"blocks" must be a non-empty array')

    const isMeeting = p.kind === 'meeting'
    if (isMeeting) {
      if (!isInt(p.station) || p.station < 1) bad(w, 'a meeting needs a positive integer "station"')
      else {
        stations.push(p.station)
        if (isStr(p.slug) && (b.book === 'saltiel' || b.book === 'shira') && p.slug !== partSlugOf(b.book, p.station)) bad(w, `slug must be ${partSlugOf(b.book, p.station)} for station ${p.station}`)
      }
    } else if (p.station !== undefined) bad(w, '"station" belongs to meeting parts only')

    let keys = 0
    p.blocks.forEach((blk: unknown, bi: number) => {
      const bw = `${w}.blocks[${bi}]`
      if (!isObj(blk) || !BLOCK_TYPES.includes(blk.t as (typeof BLOCK_TYPES)[number])) return bad(bw, `"t" must be one of ${BLOCK_TYPES.join(', ')}`)
      const partRef = (v: unknown, at: string) => { if (!isStr(v) || !slugs.has(v)) bad(at, `"part" must name a part of the book, got ${String(v)}`) }
      const list = (k: string, min = 1): unknown[] => {
        const a = blk[k]
        if (!Array.isArray(a) || a.length < min) { bad(bw, `"${k}" must be a non-empty array`); return [] }
        return a
      }
      switch (blk.t) {
        case 'h':
          if (blk.level !== 2 && blk.level !== 3) bad(bw, '"level" must be 2 or 3')
          needStr(blk, 'text', bw); checkMarks(blk.marks, blk.text, bw)
          break
        case 'p':
          needStr(blk, 'text', bw); checkMarks(blk.marks, blk.text, bw)
          if (blk.style !== undefined && !P_STYLES.includes(blk.style as PStyle)) bad(bw, `"style" must be one of ${P_STYLES.join(', ')}`)
          if (blk.placeholder !== undefined && blk.placeholder !== true) bad(bw, '"placeholder" is true or absent')
          break
        case 'sep':
          break
        case 'img':
          if (blk.variant !== 'panel' && blk.variant !== 'son') bad(bw, '"variant" must be panel or son')
          if (blk.caption !== undefined) needStr(blk, 'caption', bw)
          checkImg(blk, bw, book)
          break
        case 'quote':
          needStr(blk, 'text', bw); needStr(blk, 'source', bw)
          break
        case 'card':
          needStr(blk, 'title', bw)
          list('rows').forEach((r, i) => {
            if (!isObj(r)) return bad(`${bw}.rows[${i}]`, 'must be { label, text }')
            needStr(r, 'label', `${bw}.rows[${i}]`); needStr(r, 'text', `${bw}.rows[${i}]`)
          })
          break
        case 'key':
          keys++
          if (!isInt(blk.n)) bad(bw, '"n" must be an integer')
          else if (isMeeting && blk.n !== p.station) bad(bw, `key n (${blk.n}) must equal the meeting's station (${String(p.station)})`)
          for (const k of ['title', 'name', 'text', 'verse', 'source']) needStr(blk, k, bw)
          if (isStr(blk.title) && isStr(blk.name) && !blk.title.includes(blk.name)) bad(bw, '"title" must contain "name"')
          if (!isMeeting) bad(bw, 'a key belongs to a meeting')
          break
        case 'activity':
          needStr(blk, 'title', bw)
          if (blk.intro !== undefined) checkRun(blk.intro, `${bw}.intro`)
          list('items').forEach((r, i) => checkRun(r, `${bw}.items[${i}]`))
          break
        case 'links':
          list('items').forEach((r, i) => {
            if (!isObj(r)) return bad(`${bw}.items[${i}]`, 'must be { text, part }')
            needStr(r, 'text', `${bw}.items[${i}]`); partRef(r.part, `${bw}.items[${i}]`)
          })
          break
        case 'journey':
          list('items').forEach((r, i) => {
            const iw = `${bw}.items[${i}]`
            if (!isObj(r)) return bad(iw, 'not an object')
            if (!isInt(r.n)) bad(iw, '"n" must be an integer')
            for (const k of ['title', 'where', 'who']) needStr(r, k, iw)
            partRef(r.part, iw); checkImg(r.thumb, `${iw}.thumb`, book, true)
          })
          break
        case 'timeline':
          list('items').forEach((r, i) => {
            const iw = `${bw}.items[${i}]`
            if (!isObj(r)) return bad(iw, 'not an object')
            if (!isInt(r.n)) bad(iw, '"n" must be an integer')
            for (const k of ['hebrew', 'civil', 'place', 'region']) needStr(r, k, iw)
            partRef(r.part, iw)
            if (r.first !== undefined && r.first !== true) bad(iw, '"first" is true or absent')
          })
          break
        case 'glossary':
          list('items').forEach((r, i) => {
            if (!isObj(r)) return bad(`${bw}.items[${i}]`, 'not an object')
            for (const k of ['term', 'text', 'idea']) needStr(r, k, `${bw}.items[${i}]`)
          })
          break
        case 'stamps':
          needStr(blk, 'box', bw)
          list('items').forEach((r, i) => { if (!isStr(r) || !r.trim()) bad(`${bw}.items[${i}]`, 'must be a non-empty string') })
          break
      }
    })
    if (isMeeting && keys !== 1) bad(w, `a meeting has exactly one key block, found ${keys}`)
  })

  const sorted = [...stations].sort((x, y) => x - y)
  if (sorted.some((n, i) => n !== i + 1)) bad('parts', `meeting stations must be 1..N without gaps or repeats, got ${stations.join(',')}`)
  return errs
}
