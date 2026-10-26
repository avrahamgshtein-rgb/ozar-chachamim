// What the children's books' reader keeps in the visitor's browser: where he stopped reading each book
// (localStorage `ozar-kids-reading`) and the text size he chose (`ozar-kids-font`). Pure: the components
// read and write the storage; this module only says what a stored value means, so a damaged, old or
// hand-edited value is repaired or ignored and never breaks a page. Both are per-browser conveniences
// (CLAUDE.md, "Browser storage"): the page works with neither.

export const READING_KEY = 'ozar-kids-reading'
export const FONT_KEY = 'ozar-kids-font'

/** The reader's text sizes in CSS px, smallest first; the stored value is the index. */
export const FONT_STEPS = [17, 19, 21, 24, 27, 31]
export const DEFAULT_FONT_STEP = 2

/** The last part opened of each book, by the book's slug: `{ saltiel: { slug: 'meeting-3', at: 1790000000000 } }`. */
export type ReadingMemory = Record<string, { slug: string; at: number }>

// A book or part slug as the reader makes them (saltiel, meeting-3, epilogue). Also keeps __proto__ out.
const SLUG = /^[a-z][a-z0-9-]{0,40}$/

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

/** The stored reading memory (a JSON string, or null); an entry that is not `{ slug, at }` is dropped, anything unreadable is empty. */
export function parseReading(raw: unknown): ReadingMemory {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (!isRecord(value)) return {}
  const out: ReadingMemory = {}
  for (const [book, entry] of Object.entries(value)) {
    if (!SLUG.test(book) || !isRecord(entry)) continue
    const { slug, at } = entry
    if (typeof slug !== 'string' || !SLUG.test(slug) || typeof at !== 'number' || !Number.isFinite(at) || at < 0) continue
    out[book] = { slug, at }
  }
  return out
}

/** The memory after opening `slug` of `book` at time `now` (ms); a new object, the old one is untouched. */
export function rememberPart(mem: ReadingMemory, book: string, slug: string, now: number): ReadingMemory {
  if (!SLUG.test(book) || !SLUG.test(slug)) return mem
  return { ...mem, [book]: { slug, at: Number.isFinite(now) && now >= 0 ? now : 0 } }
}

/** Where to continue a book: the part he last opened, if it is still one of `validSlugs` (the book's reading order), else null. */
export function lastPartOf(mem: ReadingMemory, book: string, validSlugs: string[]): string | null {
  if (!has(mem, book)) return null
  const slug = mem[book]?.slug
  return typeof slug === 'string' && validSlugs.includes(slug) ? slug : null
}

const clampStep = (step: number): number =>
  Number.isFinite(step) ? Math.min(FONT_STEPS.length - 1, Math.max(0, Math.round(step))) : DEFAULT_FONT_STEP

/** The stored text size (the step as text or number); anything that is not a step of the scale is the default. */
export function parseFontStep(raw: unknown): number {
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  if (!/^\d+$/.test(text)) return DEFAULT_FONT_STEP
  const n = Number(text)
  return n < FONT_STEPS.length ? n : DEFAULT_FONT_STEP
}

/** One step smaller (-1) or larger (+1), kept inside the scale: at an end it returns the step it was given. */
export function stepFont(step: number, dir: -1 | 1): number {
  return clampStep(clampStep(step) + dir)
}

/** The size of a step in CSS px (a step outside the scale is clamped to it). */
export function fontPx(step: number): number {
  return FONT_STEPS[clampStep(step)]
}
