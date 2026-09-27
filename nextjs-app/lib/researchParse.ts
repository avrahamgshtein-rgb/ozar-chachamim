// Research papers arrive as plain text: one paragraph per line, no markup.
// Most were exported from Google Docs (NotebookLM and deep-research reports),
// so their structure survives only as conventions:
//   - a short line with no closing punctuation is a heading;
//   - "1. …", "5.1 …", "פרק ג: …" open numbered sections;
//   - "a | b | c" (or tab-separated) lines are table rows;
//   - a rule of dashes usually precedes the works-cited list, whose lines
//     carry URLs;
//   - citations sit inline as "[3]", "[4, 6]" or "[cite: 1, 2]".
// This module recovers that structure for display. It never rewrites text:
// every block records the source line it came from, and every string it holds
// is that line or a verbatim slice of it (a list item minus its "* " marker,
// a table cell). `verifyParse` in the offline check proves it over the corpus.
// It must not throw on any input: `parseResearchDoc` falls back to one
// paragraph per line if anything unexpected happens.

export interface ResearchDocInput {
  title?: string
  source_file?: string
  word_count?: number
  content?: string
}

export type HeadingLevel = 2 | 3

export interface ListItem {
  line: number
  /** The source's own marker ("3.", "ב)") for ordered items, else null. */
  marker: string | null
  /** The item text, without its marker. */
  text: string
  /**
   * When the item reads "Label: rest", the index just past the colon, so the
   * renderer can set `text.slice(0, labelEnd)` in bold. 0 when there is none.
   */
  labelEnd: number
}

export interface BibEntry {
  line: number
  /** The number inline citations use for this entry. */
  n: number
  /** The source's own marker ("12.") when the list was numbered, else null. */
  marker: string | null
  /** The entry text, without its marker. May be empty when the line was a bare URL. */
  text: string
  /** A bare URL printed on the following line, joined to this entry. */
  urlLine?: { line: number; text: string }
}

export type ResearchBlock =
  | { kind: 'title'; line: number; text: string; duplicate: boolean }
  | { kind: 'heading'; line: number; level: HeadingLevel; text: string; id: string; numbered: boolean }
  | { kind: 'paragraph'; line: number; text: string; lead?: boolean; labelEnd?: number }
  | { kind: 'quote'; line: number; text: string }
  | { kind: 'list'; ordered: boolean; items: ListItem[] }
  /** `intro`: text before a markdown table flattened onto one line ("ציר זמן מרכזי: | … |"). */
  | { kind: 'table'; lines: number[]; rows: string[][]; intro?: string }
  | { kind: 'separator'; line: number; text: string }
  | { kind: 'bibliography'; id: string; heading: { line: number; text: string } | null; separatorLine: number | null; entries: BibEntry[] }

export interface TocEntry {
  id: string
  level: HeadingLevel
  /** null for a bibliography without its own heading; the UI names it. */
  text: string | null
  kind: 'heading' | 'bibliography'
}

export interface ParsedResearchDoc {
  title: string
  sourceFile: string
  wordCount: number
  /** At about 200 words a minute, never less than 1. */
  readingMinutes: number
  /** The script most of the text is written in. */
  dir: 'rtl' | 'ltr'
  blocks: ResearchBlock[]
  toc: TocEntry[]
  /** Inline citation markers ("[3]", "[cite: 1]") found in the text. */
  citationCount: number
  /** True when the parser threw and fell back to plain paragraphs. */
  fallback: boolean
}

export const WORDS_PER_MINUTE = 200

// ── Line patterns ────────────────────────────────────────────────────────────

const URL_TEST = /(?:https?:\/\/|\bwww\.)\S/i
const BARE_URL = /^(?:https?:\/\/|www\.)\S+$/i
/** A rule of three or more dashes, underscores, stars or bullets. */
const SEPARATOR = /^(?:[-–—_=~*•·]\s*){3,}$/
const BULLET = /^(?:[•●▪◦○■□►▸‣⁃·]|\*(?!\*)|[-–—](?=\s))\s*/
/** "3." "3)" "12." — or a dotted path "5.1" / "5.1." */
const NUMBERED = /^(\d{1,3}(?:\.\d{1,2})*)(?:([.)])\s+|(?<=\d\.\d{1,2})\s+)(?=\S)/
const ROMAN = /^([IVX]{1,5})\.\s+(?=\S)/
const HEB_LETTER = /^([א-ת])([.)])\s+(?=\S)/
const PEREK = /^(?:פרק|חלק|שער|Chapter|Part|Глава|Часть)\s+[^\s:.\-–—]{1,6}(?:\s*[:.\-–—]\s*\S.*)?$/i
const MD_HEADING = /^(#{1,6})\s+(?=\S)/
const BIB_HEAD = /^(?:מקורות(?:\s+(?:וקישורים|ומראי\s+מקום|נבחרים|ביבליוגרפיים|והפניות))?|רשימת\s+(?:מקורות|ספרות|המקורות)|ביבליוגרפיה(?:\s+נבחרת)?|הערות(?:\s+שוליים)?|מראי\s+מקום|sources(?:\s+cited)?|works\s+cited|bibliography|references|notes|endnotes|further\s+reading|источники|библиография|литература|примечания|список\s+литературы)\s*:?$/i
/** Section titles that always open a top-level section. */
const TOP_LEVEL = /^(?:\d+[.)]?\s*)?(?:סיכום|concluding|final\s+(?:thoughts|reflections|assessment)|מסקנות|מסקנה|סוף\s+דבר|אחרית\s+דבר|מבוא|הקדמה|פתיחה|conclusions?|summary|introduction|epilogue|заключение|введение|итоги)/i
const INLINE_CITE_TEST = /\[(?:cite:\s*)?\d{1,3}(?:\s*[-–,]\s*\d{1,3})*\]/i
const END_PUNCT = /[.!?,;…؟]$/
const OPEN_QUOTE = /^["“„«]/
const MATH = /[=+×÷≈⊂⊃⟶∑∫√^−]/
/** Zero-width and direction marks: a line of only these is blank. */
const INVISIBLE = /[\u200b-\u200f\u2060\ufeff\u202a-\u202e]/g

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

/** "…נפש החיים)" → "…נפש החיים": trailing quotes/brackets hide the real last character. */
function stripClosers(s: string): string {
  return s.replace(/["'”’״׳»)\]\s]+$/u, '')
}

function norm(s: string): string {
  return s
    .replace(/[״“”„]/g, '"')
    .replace(/[׳‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** A short line with no closing punctuation, no URL and no citation. */
export function looksLikeHeading(s: string): boolean {
  if (s.length < 2 || s.length > 120) return false
  if (URL_TEST.test(s) || INLINE_CITE_TEST.test(s)) return false
  const words = wordCount(s)
  if (words > 16) return false
  if (s.endsWith(':')) return words <= 4 && s.length <= 40
  if (/^[(\[]/.test(s)) return false
  if (OPEN_QUOTE.test(s) && /["”»]$/.test(s)) return false
  const core = stripClosers(s)
  if (!core || END_PUNCT.test(core)) return false
  // A lone number or year is a stray table cell, not a title.
  if (/^[\d\s.,–-]+$/.test(core)) return false
  // Equations exported one token per line ("M=", "n(n", "cos(3x)", "אוT").
  if (MATH.test(s) || !/\p{L}{2}/u.test(s) || /[\u0590-\u05FF][A-Za-z]|[A-Za-z][\u0590-\u05FF]/.test(s)) return false
  // A Latin title starts with a capital; "dawn", "total" are formula labels.
  const firstLetter = /\p{L}/u.exec(s)?.[0] ?? ''
  if (/[a-z]/.test(firstLetter)) return false
  return true
}

/** A whole-line quotation, optionally followed by a citation or a source in parentheses. */
function looksLikeQuote(s: string): boolean {
  if (s.length > 450 || !OPEN_QUOTE.test(s)) return false
  return /["”»](?:\s*[.,;:]?\s*(?:\[[^\]]{1,40}\]|\([^)]{1,80}\))?\s*[.,;]?)$/.test(s)
}

const LABEL = /^([^:\n]{2,70}?)\s*:\s+(?=\S)/
/** Longest "Label: text" line still read as a list item rather than a paragraph. */
const LABEL_ITEM_MAX = 700
/** An intro paragraph this short between two headings still leaves the first one a section title. */
const SECTION_INTRO_MAX = 350

/**
 * "גישת רב הונא: ..." → the index just past the colon, if the text opens with
 * a short label. 0 otherwise.
 */
export function labelEndOf(text: string): number {
  const m = LABEL.exec(text)
  if (!m) return 0
  const label = m[1]
  if (wordCount(label) > 7) return 0
  if (/[.!?[\]]/.test(label) || URL_TEST.test(label)) return 0
  const colon = text.indexOf(':', label.length)
  if (colon < 0 || text.length - colon < 13) return 0
  return colon + 1
}

interface NumInfo {
  marker: string
  /** Path of numbers: "5.1" → [5, 1]; roman and Hebrew letters map to their value. */
  path: number[]
  rest: string
  kind: 'arabic' | 'roman' | 'hebrew'
}

const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10 }
function romanValue(r: string): number {
  let total = 0
  for (let i = 0; i < r.length; i++) {
    const v = ROMAN_VALUES[r[i]] ?? 0
    const next = ROMAN_VALUES[r[i + 1]] ?? 0
    total += v < next ? -v : v
  }
  return total
}

function numberedInfo(s: string): NumInfo | null {
  let m = NUMBERED.exec(s)
  if (m) {
    const path = m[1].split('.').filter(Boolean).map(Number)
    return { marker: s.slice(0, m[0].length).trim(), path, rest: s.slice(m[0].length), kind: 'arabic' }
  }
  m = ROMAN.exec(s)
  if (m) {
    return { marker: s.slice(0, m[0].length).trim(), path: [romanValue(m[1])], rest: s.slice(m[0].length), kind: 'roman' }
  }
  m = HEB_LETTER.exec(s)
  if (m) {
    const v = 'אבגדהוזחטיכלמנסעפצקרשת'.indexOf(m[1]) + 1
    if (v > 0 && v <= 10) {
      return { marker: s.slice(0, m[0].length).trim(), path: [v], rest: s.slice(m[0].length), kind: 'hebrew' }
    }
  }
  return null
}

function bulletRest(s: string): { marker: string; rest: string } | null {
  if (SEPARATOR.test(s)) return null
  const m = BULLET.exec(s)
  if (!m || m[0].length === 0 || m[0].length >= s.length) return null
  // "- " must be followed by a space; "*" bullets may hug the text.
  return { marker: m[0], rest: s.slice(m[0].length) }
}

type TableDelim = '|' | '\t'

function tableCells(s: string): { delim: TableDelim; cells: string[] } | null {
  if (s.includes('\t')) {
    const cells = s.split('\t').map(c => c.trim())
    if (cells.filter(Boolean).length >= 2) return { delim: '\t', cells }
  }
  if (!s.includes('|')) return null
  let body = s
  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|')) body = body.slice(0, -1)
  const cells = body.split('|').map(c => c.trim())
  if (cells.length < 2 || cells.filter(Boolean).length < 2) return null
  return { delim: '|', cells }
}

/** "|---|:---:|" — markdown's header rule; markup, not content. */
function isTableRule(cells: string[]): boolean {
  return cells.every(c => /^:?-{2,}:?$/.test(c) || c === '')
}

const RULE_CELL = /^:?-{3,}:?$/

/**
 * A markdown table whose line breaks were lost:
 *   "ציר זמן: | תקופה | אירוע | | :--- | :--- | | 1391 | הגירה | …|"
 * Rows are the runs of cells between empty "| |" gaps; the ":---" rule gives
 * the column count. Returns null unless every data row fits that count.
 */
function flattenedTable(s: string): { intro: string; rows: string[][] } | null {
  const first = s.indexOf('|')
  if (first < 0 || !/\|\s*:?-{3,}:?\s*\|/.test(s) || !/\|\s*$/.test(s)) return null
  const tokens = s.slice(first).split('|').slice(1, -1).map(t => t.trim())
  const groups: string[][] = [[]]
  for (const t of tokens) {
    if (t === '') { if (groups[groups.length - 1].length) groups.push([]) }
    else groups[groups.length - 1].push(t)
  }
  if (!groups[groups.length - 1].length) groups.pop()
  const ruleAt = groups.findIndex(g => g.every(c => RULE_CELL.test(c)))
  if (ruleAt < 0) return null
  const cols = groups[ruleAt].length
  const rows = groups.filter((_, gi) => gi !== ruleAt)
  if (cols < 2 || rows.length < 2 || rows.slice(ruleAt).some(r => r.length !== cols)) return null
  return { intro: s.slice(0, first).trim(), rows }
}

// ── Slugs for anchors ────────────────────────────────────────────────────────

export function slugify(text: string): string {
  const slug = text
    .normalize('NFC')
    .replace(/[֑-ׇ]/g, '') // nikud and cantillation
    .replace(/[״"׳'`’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug.slice(0, 60).replace(/-+$/, '') || 'section'
}

// ── Bibliography regions ─────────────────────────────────────────────────────

interface Line { i: number; s: string }

interface BibRegion {
  start: number // index into lines of the first entry
  end: number // exclusive
  headIdx: number | null
  sepIdx: number | null
}

function findBibRegions(lines: Line[]): BibRegion[] {
  const n = lines.length
  const isUrl = (k: number) => k >= 0 && k < n && URL_TEST.test(lines[k].s)
  const isNum = (k: number) => k < n && /^\d{1,3}[.)]\s+\S/.test(lines[k].s)

  // Extends a run of citation lines starting at `from`. A line without a URL
  // stays in the run only when a URL line follows within two lines — the
  // title half of a "title / URL on the next line" pair, or an entry whose
  // publisher gave no link.
  const extend = (from: number, allowNumbered: boolean): number => {
    let k = from
    let lastGood = from - 1
    while (k < n) {
      const s = lines[k].s
      if (SEPARATOR.test(s) || BIB_HEAD.test(s)) break
      if (isUrl(k) || (allowNumbered && isNum(k))) { lastGood = k; k++; continue }
      if (s.length <= 400 && (isUrl(k + 1) || (isUrl(k + 2) && !isUrl(k + 1) && lines[k + 1].s.length <= 400))) {
        k++
        continue
      }
      break
    }
    return lastGood + 1
  }

  const found: BibRegion[] = []
  for (let k = 0; k < n; k++) {
    const s = lines[k].s
    const head = BIB_HEAD.test(s) && s.length <= 40
    const sep = SEPARATOR.test(s)
    if (!head && !sep) continue
    let start = k + 1
    // "----" then "Sources:" — the heading belongs to the same region.
    let headIdx: number | null = head ? k : null
    const sepIdx: number | null = sep ? k : null
    if (sep && start < n && BIB_HEAD.test(lines[start].s) && lines[start].s.length <= 40) {
      headIdx = start
      start++
    }
    const end = extend(start, true)
    const total = end - start
    if (total <= 0) continue
    let urls = 0
    let nums = 0
    for (let j = start; j < end; j++) {
      if (isUrl(j)) urls++
      if (isNum(j)) nums++
    }
    const reachesEnd = end >= n
    const ok =
      (urls >= 1 && urls * 2 >= total && (headIdx !== null || total >= 2 || reachesEnd)) ||
      (headIdx !== null && (urls + nums) * 2 >= total && total >= 1) ||
      (sepIdx !== null && reachesEnd && nums === total && total >= 3)
    if (ok) found.push({ start, end, headIdx, sepIdx })
  }

  // A trailing run of URL lines with no rule or heading before it.
  let s = n
  while (s > 0) {
    const k = s - 1
    if (isUrl(k)) { s = k; continue }
    if (k > 0 && isUrl(k - 1) && isUrl(k + 1) && lines[k].s.length <= 400) { s = k; continue }
    break
  }
  // Counted per URL, not per line: a list that lost its line breaks is one
  // long line of "title, URL title, URL …".
  let trailingUrls = 0
  for (let j = s; j < n; j++) trailingUrls += (lines[j].s.match(/(?:https?:\/\/|\bwww\.)\S/gi) ?? []).length
  if (trailingUrls >= 3 && !found.some(r => r.end > s)) {
    found.push({ start: s, end: n, headIdx: null, sepIdx: null })
  }

  found.sort((a, b) => a.start - b.start)
  const merged: BibRegion[] = []
  for (const r of found) {
    const prev = merged[merged.length - 1]
    if (prev && r.start < prev.end) continue
    merged.push(r)
  }
  return merged
}

function bibEntries(lines: Line[], r: BibRegion): BibEntry[] {
  const entries: BibEntry[] = []
  let running = 0
  for (let k = r.start; k < r.end; k++) {
    const { i, s } = lines[k]
    const prev = entries[entries.length - 1]
    // A bare URL right under a title line completes that entry.
    if (BARE_URL.test(s) && prev && !prev.urlLine && !URL_TEST.test(prev.text) && prev.line === lines[k - 1].i) {
      prev.urlLine = { line: i, text: s }
      continue
    }
    // Some exports lost the line breaks of the list, leaving every entry on
    // one line; each URL still ends an entry, so split there.
    const ends: number[] = []
    for (const m of s.matchAll(/(?:https?:\/\/|\bwww\.)\S+/gi)) ends.push((m.index ?? 0) + m[0].length)
    const segments: string[] = []
    if (ends.length >= 2) {
      let from = 0
      for (const e of ends) {
        const seg = s.slice(from, e).trim()
        if (seg) segments.push(seg)
        from = e
      }
      const tail = s.slice(from).trim()
      if (tail) segments.push(tail)
    } else {
      segments.push(s)
    }
    for (const seg of segments) {
      const m = /^(\d{1,3})[.)]\s+/.exec(seg)
      if (m) {
        const num = Number(m[1])
        running = num
        entries.push({ line: i, n: num, marker: m[0].trim(), text: seg.slice(m[0].length) })
      } else {
        running++
        entries.push({ line: i, n: running, marker: null, text: seg })
      }
    }
  }
  return entries
}

// ── Main pass ────────────────────────────────────────────────────────────────

interface Draft {
  block: ResearchBlock
  /** Heading level fixed by explicit numbering ("1.", "5.1", "פרק ב"). */
  explicit?: HeadingLevel
}

function parseUnsafe(doc: ResearchDocInput, idPrefix: string): ParsedResearchDoc {
  const content = typeof doc.content === 'string' ? doc.content : ''
  const title = typeof doc.title === 'string' ? doc.title : ''
  const raw = content.split(/\r\n|\r|\n/)
  const lines: Line[] = []
  raw.forEach((s, i) => {
    const t = s.trim()
    if (t && t.replace(INVISIBLE, '').trim()) lines.push({ i, s: t })
  })
  const n = lines.length

  const regions = findBibRegions(lines)
  const regionAt = new Map<number, BibRegion>()
  for (const r of regions) regionAt.set(r.sepIdx ?? r.headIdx ?? r.start, r)

  const drafts: Draft[] = []
  const push = (block: ResearchBlock, explicit?: HeadingLevel) => drafts.push({ block, explicit })

  const usedIds = new Set<string>()
  const makeId = (text: string) => {
    const base = idPrefix + slugify(text)
    let id = base
    for (let d = 2; usedIds.has(id); d++) id = `${base}-${d}`
    usedIds.add(id)
    return id
  }

  // Line 0 is usually the paper's title, repeated once more a line or two
  // later (NotebookLM puts its summary between the two copies).
  let k = 0
  let titleNorm: string | null = null
  if (n > 0) {
    const first = lines[0].s
    const tn = norm(title)
    const fn = norm(first)
    if (tn && fn && (fn === tn || (fn.length >= 8 && (tn.includes(fn) || fn.includes(tn)))) && first.length <= 200) {
      push({ kind: 'title', line: lines[0].i, text: first, duplicate: false })
      titleNorm = fn
      k = 1
    }
  }

  // Heading-like lines that stack three or more deep are a list of names or
  // works whose bullets were lost, not three nested titles.
  const headingRunLength = (from: number): number => {
    let j = from
    while (j < n && !regionAt.has(j) && looksLikeHeading(lines[j].s) && !numberedInfo(lines[j].s) && !bulletRest(lines[j].s)) j++
    return j - from
  }

  const isPlain = (j: number): boolean => {
    if (j >= n || regionAt.has(j)) return false
    const s = lines[j].s
    return !SEPARATOR.test(s) && !bulletRest(s) && !numberedInfo(s) && !tableCells(s) && !PEREK.test(s) && !MD_HEADING.test(s)
  }

  // Items whose bullets were lost, under a line that ends with a colon
  // ("…נחלקו לשלוש קבוצות:"): either all "Label: text" or all short. Returns
  // the index after the list, or `from` unchanged when fewer than two match.
  const listUnderColon = (from: number): number => {
    const items: ListItem[] = []
    let j = from
    let labelled: boolean | null = null
    while (j < n && isPlain(j)) {
      const t = lines[j].s
      if (looksLikeHeading(t) || looksLikeQuote(t)) break
      const le = labelEndOf(t)
      const isLabelled = le > 0 && t.length <= LABEL_ITEM_MAX
      if (labelled === null) labelled = isLabelled
      if (labelled !== isLabelled) break
      if (!isLabelled && t.length > 200) break
      items.push({ line: lines[j].i, marker: null, text: t, labelEnd: le })
      j++
    }
    if (items.length < 2) return from
    push({ kind: 'list', ordered: false, items })
    return j
  }

  let lastK = -1
  while (k < n) {
    // Every branch below consumes at least one line; if one ever fails to,
    // bail out to the plain-paragraph fallback rather than spin.
    if (k === lastK) throw new Error(`researchParse: no progress at line ${lines[k].i}`)
    lastK = k
    const region = regionAt.get(k)
    if (region) {
      const head = region.headIdx !== null ? lines[region.headIdx] : null
      const id = makeId(head ? head.s : 'sources')
      push({
        kind: 'bibliography',
        id,
        heading: head ? { line: head.i, text: head.s } : null,
        separatorLine: region.sepIdx !== null ? lines[region.sepIdx].i : null,
        entries: bibEntries(lines, region),
      })
      k = region.end
      continue
    }

    const { i, s } = lines[k]

    // The title repeated near the top (NotebookLM puts its summary between
    // the two copies) — sometimes the repeated line is the second one.
    if (k <= 4 && (norm(s) === titleNorm || (k >= 2 && lines.slice(0, k).some(l => norm(l.s) === norm(s) && looksLikeHeading(s))))) {
      push({ kind: 'title', line: i, text: s, duplicate: true })
      k++
      continue
    }

    if (SEPARATOR.test(s)) {
      push({ kind: 'separator', line: i, text: s })
      k++
      continue
    }

    const md = MD_HEADING.exec(s)
    if (md) {
      const text = s.slice(md[0].length)
      push({ kind: 'heading', line: i, level: 2, text, id: makeId(text), numbered: false }, md[1].length <= 2 ? 2 : 3)
      k++
      continue
    }

    if (PEREK.test(s) && looksLikeHeading(s)) {
      push({ kind: 'heading', line: i, level: 2, text: s, id: makeId(s), numbered: true }, 2)
      k++
      continue
    }

    const flat = s.includes(':--') || s.includes('| --') || s.includes('|--') ? flattenedTable(s) : null
    if (flat) {
      push({ kind: 'table', lines: [i], rows: flat.rows, ...(flat.intro ? { intro: flat.intro } : {}) })
      k++
      continue
    }

    // Tables: two or more consecutive rows with a consistent cell count.
    const cells = tableCells(s)
    if (cells && !URL_TEST.test(s)) {
      const rows: string[][] = []
      const tl: number[] = []
      let j = k
      let width = 0
      while (j < n && !regionAt.has(j)) {
        const c = tableCells(lines[j].s)
        if (!c || c.delim !== cells.delim) break
        if (URL_TEST.test(lines[j].s) && !isTableRule(c.cells)) break
        if (!isTableRule(c.cells)) {
          if (width && Math.abs(c.cells.length - width) > 1) break
          width = Math.max(width, c.cells.length)
          rows.push(c.cells)
        }
        tl.push(lines[j].i)
        j++
      }
      if (rows.length >= 2) {
        push({ kind: 'table', lines: tl, rows })
        k = j
        continue
      }
    }

    const bullet = bulletRest(s)
    if (bullet) {
      const items: ListItem[] = []
      let j = k
      while (j < n && !regionAt.has(j)) {
        const b = bulletRest(lines[j].s)
        if (!b) break
        items.push({ line: lines[j].i, marker: null, text: b.rest, labelEnd: labelEndOf(b.rest) })
        j++
      }
      push({ kind: 'list', ordered: false, items })
      k = j
      continue
    }

    const num = numberedInfo(s)
    if (num) {
      const next = k + 1 < n && !regionAt.has(k + 1) ? lines[k + 1] : null
      const nextNum = next ? numberedInfo(next.s) : null
      const deeper = !!nextNum && nextNum.path.length > num.path.length
      const restarts = !!nextNum && nextNum.path.length === num.path.length && nextNum.path[nextNum.path.length - 1] === 1
      const headingLike = looksLikeHeading(num.rest) && !num.rest.endsWith(':')
      if (headingLike && next && (!nextNum || deeper || restarts)) {
        push({ kind: 'heading', line: i, level: 2, text: s, id: makeId(num.rest), numbered: true }, num.path.length > 1 ? 3 : 2)
        k++
        continue
      }
      // An ordered list: consecutive numbered lines at the same depth.
      const items: ListItem[] = []
      let j = k
      let prev: NumInfo | null = null
      while (j < n && !regionAt.has(j)) {
        const info = numberedInfo(lines[j].s)
        if (!info || info.kind !== num.kind || info.path.length !== num.path.length) break
        if (prev && info.path[info.path.length - 1] <= prev.path[prev.path.length - 1]) break
        items.push({ line: lines[j].i, marker: info.marker, text: info.rest, labelEnd: labelEndOf(info.rest) })
        prev = info
        j++
      }
      push({ kind: 'list', ordered: true, items })
      k = j
      continue
    }

    if (looksLikeHeading(s) && k + 1 < n) {
      const run = headingRunLength(k)
      if (run >= 3) {
        const items: ListItem[] = []
        for (let j = k; j < k + run; j++) items.push({ line: lines[j].i, marker: null, text: lines[j].s, labelEnd: 0 })
        push({ kind: 'list', ordered: false, items })
        k += run
        continue
      }
      push({ kind: 'heading', line: i, level: 2, text: s, id: makeId(s), numbered: false }, s.endsWith(':') ? 3 : undefined)
      k++
      if (s.endsWith(':')) k = listUnderColon(k)
      continue
    }

    if (looksLikeQuote(s)) {
      push({ kind: 'quote', line: i, text: s })
      k++
      continue
    }

    // Implicit lists: "Label: text" lines in a row, or short items under a
    // line that ends with a colon ("…נחלקו לשלוש קבוצות:").
    const firstLabel = labelEndOf(s)
    if (firstLabel && s.length <= LABEL_ITEM_MAX && isPlain(k) && isPlain(k + 1) && labelEndOf(lines[k + 1].s) && lines[k + 1].s.length <= LABEL_ITEM_MAX && !looksLikeHeading(lines[k + 1].s)) {
      const items: ListItem[] = []
      let j = k
      while (j < n && isPlain(j)) {
        const t = lines[j].s
        const le = labelEndOf(t)
        if (!le || t.length > LABEL_ITEM_MAX || looksLikeHeading(t)) break
        items.push({ line: lines[j].i, marker: null, text: t, labelEnd: le })
        j++
      }
      push({ kind: 'list', ordered: false, items })
      k = j
      continue
    }

    const para: ResearchBlock = { kind: 'paragraph', line: i, text: s }
    const prevDraft = drafts[drafts.length - 1]
    if (prevDraft?.block.kind === 'title' && !prevDraft.block.duplicate && drafts.length === 1) para.lead = true
    push(para)
    k++
    if (s.endsWith(':')) k = listUnderColon(k)
  }

  // Heading levels. Explicit numbering decides when present. Otherwise a
  // heading directly followed by another heading opens a section with
  // subsections; inside such a section, later headings are subsections until
  // a "Conclusions"-type title or the next section-with-subsections.
  let inSubbed = false
  let inNumbered = false
  for (let d = 0; d < drafts.length; d++) {
    const { block, explicit } = drafts[d]
    if (block.kind !== 'heading') continue
    const nextBlock = drafts[d + 1]?.block
    const afterIntro = drafts[d + 2]
    // "Section title / one short intro paragraph / first subsection" counts
    // as directly followed by a heading.
    const nextIsHeading =
      nextBlock?.kind === 'heading' ||
      (nextBlock?.kind === 'paragraph' && nextBlock.text.length <= SECTION_INTRO_MAX &&
        afterIntro?.block.kind === 'heading' && afterIntro.explicit === undefined)
    if (explicit) {
      block.level = explicit
      if (explicit === 2) {
        inNumbered = block.numbered
        inSubbed = nextIsHeading
      }
      continue
    }
    const nextExplicit = nextBlock?.kind === 'heading' ? drafts[d + 1]?.explicit : undefined
    if (nextIsHeading && nextExplicit !== 2) {
      block.level = 2
      inSubbed = true
      inNumbered = false
    } else if (TOP_LEVEL.test(block.text) || (nextIsHeading && nextExplicit === 2)) {
      block.level = 2
      inSubbed = false
      inNumbered = false
    } else {
      block.level = inSubbed || inNumbered ? 3 : 2
    }
  }

  const blocks = drafts.map(d => d.block)
  const toc: TocEntry[] = []
  for (const b of blocks) {
    if (b.kind === 'heading') toc.push({ id: b.id, level: b.level, text: b.text, kind: 'heading' })
    else if (b.kind === 'bibliography') toc.push({ id: b.id, level: 2, text: b.heading?.text ?? null, kind: 'bibliography' })
  }

  const words = typeof doc.word_count === 'number' && doc.word_count > 0 ? doc.word_count : wordCount(content)
  const citationCount = (content.match(new RegExp(INLINE_CITE_TEST.source, 'gi')) ?? []).length

  return {
    title: title || (blocks[0]?.kind === 'title' ? blocks[0].text : ''),
    sourceFile: typeof doc.source_file === 'string' ? doc.source_file : '',
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    dir: scriptDirection(content),
    blocks,
    toc,
    citationCount,
    fallback: false,
  }
}

function scriptDirection(text: string): 'rtl' | 'ltr' {
  const sample = text.replace(/(?:https?:\/\/|www\.)\S+/gi, '').slice(0, 40000)
  const hebrew = (sample.match(/[֐-׿]/g) ?? []).length
  const other = (sample.match(/[A-Za-zЀ-ӿ]/g) ?? []).length
  return hebrew >= other ? 'rtl' : 'ltr'
}

/**
 * Parse one research document. Never throws: on unexpected input it returns
 * every non-empty line as a paragraph, with `fallback: true`.
 * `idPrefix` keeps anchors unique when a page shows several documents.
 */
export function parseResearchDoc(doc: ResearchDocInput | null | undefined, idPrefix = ''): ParsedResearchDoc {
  const safe: ResearchDocInput = doc && typeof doc === 'object' ? doc : {}
  try {
    return parseUnsafe(safe, idPrefix)
  } catch {
    const content = typeof safe.content === 'string' ? safe.content : ''
    const blocks: ResearchBlock[] = []
    content.split(/\r\n|\r|\n/).forEach((s, i) => {
      const t = s.trim()
      if (t) blocks.push({ kind: 'paragraph', line: i, text: t })
    })
    const words = wordCount(content)
    return {
      title: typeof safe.title === 'string' ? safe.title : '',
      sourceFile: typeof safe.source_file === 'string' ? safe.source_file : '',
      wordCount: words,
      readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
      dir: 'rtl',
      blocks,
      toc: [],
      citationCount: 0,
      fallback: true,
    }
  }
}

/** Parse every document of a sage; anchors of the second and later documents get a "d2-" prefix. */
export function parseResearchDocs(docs: unknown): ParsedResearchDoc[] {
  if (!Array.isArray(docs)) return []
  return docs.map((d, i) => parseResearchDoc(d as ResearchDocInput, i === 0 ? '' : `d${i + 1}-`))
}

// ── Inline text ──────────────────────────────────────────────────────────────

export type InlineToken =
  | { kind: 'text'; text: string }
  /** `**bold**`: `inner` is the text between the markers. */
  | { kind: 'strong'; text: string; inner: string }
  /** A citation marker. `prefix` is the "cite: " part, if any; `body` the numbers as written. */
  | { kind: 'cite'; text: string; prefix: string; body: string; nums: number[] }
  | { kind: 'url'; text: string; href: string }

const INLINE = /\*\*(?=\S)([^*\n]{1,400}?)\*\*|\[(cite:\s*)?(\d{1,3}(?:\s*[-–,]\s*\d{1,3})*)\]|(?:https?:\/\/|\bwww\.)[^\s<>"”]+/gi

function citeNumbers(body: string): number[] {
  const out: number[] = []
  for (const part of body.split(',')) {
    const [a, b] = part.split(/[-–]/).map(p => Number(p.trim()))
    if (!Number.isFinite(a)) continue
    if (Number.isFinite(b) && b >= a && b - a <= 30) {
      for (let x = a; x <= b; x++) out.push(x)
    } else {
      out.push(a)
    }
  }
  return out
}

/**
 * Split a line into plain text, **bold**, citation markers and URLs.
 * Concatenating every token's `text` gives back the input exactly.
 */
export function tokenizeInline(text: string): InlineToken[] {
  const out: InlineToken[] = []
  if (!text) return out
  let last = 0
  INLINE.lastIndex = 0
  for (let m = INLINE.exec(text); m; m = INLINE.exec(text)) {
    let whole = m[0]
    const at = m.index
    if (m[1] !== undefined) {
      if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
      out.push({ kind: 'strong', text: whole, inner: m[1] })
    } else if (m[3] !== undefined) {
      if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
      out.push({ kind: 'cite', text: whole, prefix: m[2] ?? '', body: m[3], nums: citeNumbers(m[3]) })
    } else {
      // Trailing sentence punctuation, and a ")" the URL never opened, belong to the prose.
      let trimmed = whole.replace(/[.,;:!?'׳״»]+$/, '')
      while (trimmed.endsWith(')') && (trimmed.match(/\(/g)?.length ?? 0) < (trimmed.match(/\)/g)?.length ?? 0)) {
        trimmed = trimmed.slice(0, -1).replace(/[.,;:!?]+$/, '')
      }
      if (trimmed.length < 8) continue
      whole = trimmed
      if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
      out.push({ kind: 'url', text: whole, href: /^www\./i.test(whole) ? `https://${whole}` : whole })
      INLINE.lastIndex = at + whole.length
    }
    last = at + whole.length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}

/**
 * Where an inline "[n]" in block `blockIndex` should point: entry n of the
 * first bibliography after it, or of the last one when none follows (papers
 * glued together each keep their own list). null when there is no such entry.
 */
export function citeTarget(doc: ParsedResearchDoc, blockIndex: number, n: number): string | null {
  let chosen: Extract<ResearchBlock, { kind: 'bibliography' }> | null = null
  for (let b = 0; b < doc.blocks.length; b++) {
    const block = doc.blocks[b]
    if (block.kind !== 'bibliography') continue
    chosen = block
    if (b > blockIndex) break
  }
  if (!chosen || !chosen.entries.some(e => e.n === n)) return null
  return `${chosen.id}-${n}`
}

/** A URL made readable for display: percent-escapes decoded, scheme dropped. */
export function displayUrl(href: string): string {
  let out = href
  try { out = decodeURI(href) } catch { /* keep as-is */ }
  return out.replace(/^https?:\/\/(?:www\.)?/i, '')
}
