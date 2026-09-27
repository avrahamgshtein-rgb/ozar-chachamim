import type { Sage } from './types'
import { displayName, labelParts } from './displayName'

/**
 * Hebrew-aware fuzzy normalization.
 * "רמבם" ↔ "רמב״ם", strips nikud, quotes, geresh/gershayim,
 * unifies final letters, collapses whitespace.
 */
export function normalizeHe(s: string): string {
  return s
    .replace(/[֑-ׇ]/g, '')          // nikud + cantillation
    .replace(/[״"“”'’׳`]/g, '')               // gershayim / geresh / quotes
    .replace(/[-–—_.,()]/g, ' ')              // separators → space
    .toLowerCase()
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fuzzyIncludes(text: string | undefined | null, normQuery: string): boolean {
  if (!text || !normQuery) return false
  return normalizeHe(text).includes(normQuery)
}

// ── Index-preserving normalization (for highlighting) ──────────────────────

const DROP = /[֑-ׇ״"“”'’׳`]/
const SEP  = /[-–—_.,()]/
const FINALS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }

/**
 * `normalizeHe`, char by char, remembering for every output char the index of
 * the input char it came from — so a match found in normalized text can be
 * highlighted in the original ("רמבם" lights up "רמב״ם" in "הרמב״ם").
 */
export function normalizeWithMap(s: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (DROP.test(c)) continue
    const lower = SEP.test(c) ? ' ' : c.toLowerCase()
    for (const ch of lower) {
      const out = FINALS[ch] ?? ch
      if (/\s/.test(out)) {
        if (!norm.length || norm.endsWith(' ')) continue
        norm += ' '
      } else {
        norm += out
      }
      map.push(i)
    }
  }
  if (norm.endsWith(' ')) { norm = norm.slice(0, -1); map.pop() }
  return { norm, map }
}

/**
 * Where `normQueries` (already normalized, longest first is best) occur in
 * `text`, as a [start, end) range of the original string, or null.
 */
export function highlightRange(text: string, normQueries: string[]): [number, number] | null {
  if (!text) return null
  const { norm, map } = normalizeWithMap(text)
  for (const q of normQueries) {
    if (!q) continue
    const i = norm.indexOf(q)
    if (i < 0) continue
    return [map[i], map[i + q.length - 1] + 1]
  }
  return null
}

// ── Names the way people type them ─────────────────────────────────────────

/** Titles a reader leaves out: "משה פיינשטיין" should find "הרב משה פיינשטיין". Normalized. */
const HONORIFICS = new Set([
  'הרב', 'רבי', 'רב', 'רבנו', 'רבינו', 'ר', 'רבן', 'מרן', 'חכם', 'הרבנית', 'דר', 'פרופ',
  'rabbi', 'rav', 'rabbenu', 'rabbeinu', 'r', 'the', 'rebbe', 'reb',
])

function stripHonorifics(norm: string): string {
  const words = norm.split(' ')
  let i = 0
  while (i < words.length - 1 && HONORIFICS.has(words[i])) i++
  return words.slice(i).join(' ')
}

/**
 * The definite article on an acronym: people type "רמבם" for "הרמב״ם" and
 * "מהרל" for "המהר״ל". Only a first word carrying gershayim/geresh counts as an
 * acronym, so "הלל הזקן" never turns into "לל".
 */
function stripAcronymArticle(raw: string): string | null {
  const m = raw.trim().match(/^ה(\S*[״"׳'][^\s]*)(.*)$/)
  return m ? m[1] + m[2] : null
}

/**
 * The article on any first word of a multi-word name ("הבעל שם טוב",
 * "החפץ חיים"), weaker than the acronym rule: kept for words of three
 * letters or more after the ה, so "הלל הזקן" stays whole. Normalized input.
 */
function stripArticle(norm: string): string | null {
  const m = norm.match(/^ה(\S{3,}) (.+)$/)
  return m ? `${m[1]} ${m[2]}` : null
}

/** A normalized form and how far it is from what was actually written. */
interface Form { n: string; pen: number }

function addForm(forms: Form[], n: string | null, pen: number) {
  if (!n) return
  const at = forms.findIndex(f => f.n === n)
  if (at < 0) forms.push({ n, pen })
  else if (forms[at].pen > pen) forms[at].pen = pen
}

/**
 * Well-known names that appear in no label: acronyms and the names English
 * readers use. Keyed by the sage's normalized display name, never by id — ids
 * are the join key that drifts (see CLAUDE.md), names are not. A key that
 * matches no sage is simply inert.
 */
const CURATED_ALIASES: Record<string, string[]> = {
  [normalizeHe('רש"י (רבי שלמה יצחקי)')]: ['Rashi', 'Shlomo Yitzchaki', 'Solomon ben Isaac'],
  [normalizeHe('רבי אליהו בן שלמה זלמן')]: ['הגר״א', 'הגאון מווילנה', 'Vilna Gaon', 'Gra', 'Elijah of Vilna'],
  [normalizeHe('הבעל שם טוב (רבי ישראל בעש"ט)')]: ['Baal Shem Tov', 'Besht'],
  [normalizeHe('האר״י הקדוש')]: ['האריז״ל', 'רבי יצחק לוריא', 'Ari', 'Arizal', 'Isaac Luria'],
  [normalizeHe('רבי משה חיים לוצאטו (הרמח״ל)')]: ['Ramchal', 'Luzzatto'],
  [normalizeHe('רבי יצחק אלפסי (הרי"ף)')]: ['Rif', 'Alfasi'],
  [normalizeHe('רבי יהודה הלוי (ריה"ל)')]: ['Yehuda Halevi', 'Judah Halevi'],
  [normalizeHe('רבי יהודה הנשיא')]: ['Rebbi', 'Judah the Prince', 'Yehuda HaNasi'],
  [normalizeHe('רבי שמעון בר יוחאי')]: ['רשב״י', 'Rashbi', 'Shimon bar Yochai'],
  [normalizeHe('רבי משה קורדובירו (הרמ״ק)')]: ['Ramak', 'Cordovero'],
  [normalizeHe('הרלב״ג')]: ['Ralbag', 'Gersonides', 'Levi ben Gershon'],
  [normalizeHe('רבי דוד קמחי')]: ['רד״ק', 'Radak', 'Kimchi'],
  [normalizeHe('רבי יוסף קארו')]: ['מרן', 'הבית יוסף', 'השולחן ערוך', 'Shulchan Aruch', 'Caro'],
  [normalizeHe('החת"ם סופר (הרב משה סופר)')]: ['Chatam Sofer', 'Moses Sofer'],
  [normalizeHe('רבי חיים ויטאל')]: ['Chaim Vital'],
  [normalizeHe('רבי שמשון רפאל הירש')]: ['Samson Raphael Hirsch'],
  [normalizeHe('רבי שלמה אבן גבירול')]: ['Ibn Gabirol', 'Solomon ibn Gabirol'],
  [normalizeHe('רבי חיים מוולוז\'ין')]: ['Chaim of Volozhin'],
  [normalizeHe('רבי חיים בן עטר (בעל אור החיים)')]: ['Or HaChaim', 'Ohr HaChaim'],
  [normalizeHe('הצמח צדק (רבי מנחם מנדל שניאורסון)')]: ['Tzemach Tzedek'],
  [normalizeHe('רבי נתן מברסלב (מנמירוב)')]: ['Nathan of Breslov'],
  [normalizeHe('הרב לורד יונתן זקס')]: ['Jonathan Sacks'],
  [normalizeHe('הרב אריה קפלן')]: ['Aryeh Kaplan'],
  [normalizeHe('משה רבנו')]: ['Moses', 'Moshe Rabbenu'],
  [normalizeHe('אברהם אבינו')]: ['Abraham'],
  [normalizeHe('יצחק אבינו')]: ['Isaac'],
  [normalizeHe('יעקב אבינו')]: ['Jacob'],
  [normalizeHe('דוד המלך')]: ['King David'],
  [normalizeHe('שלמה המלך')]: ['King Solomon'],
  [normalizeHe('רבן יוחנן בן זכאי')]: ['Yochanan ben Zakkai'],
  [normalizeHe('ישעיהו הנביא')]: ['Isaiah'],
  [normalizeHe('שמואל הנביא')]: ['Samuel the Prophet'],
}

// English names from the en content overlay (public/i18n/sages.en.json),
// loaded once and shared by every search box. In the Hebrew UI they are what
// lets "Maimonides" and "rambam" find הרמב״ם; in the English UI they are the
// labels already, so loading them again costs nothing but a cached fetch.
let englishNames: Map<string, string> | null = null
let englishNamesPromise: Promise<void> | null = null
let aliasVersion = 0

/** Fetch the English names once; resolves when they are usable (or failed). */
export function loadEnglishNames(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  englishNamesPromise ??= fetch('/i18n/sages.en.json')
    .then(r => (r.ok ? r.json() : null))
    .then((data: Record<string, { label?: string }> | null) => {
      if (!data) return
      englishNames = new Map(
        Object.entries(data).flatMap(([id, e]) => (e?.label ? [[id, e.label] as [string, string]] : [])),
      )
      aliasVersion++
    })
    .catch(() => { /* search still works on Hebrew names */ })
  return englishNamesPromise
}

interface Candidate {
  /** Original text of this form. */
  text: string
  /** The whole name this form was cut from ("Maimonides (Rambam)" for "Rambam"), for display. */
  display: string
  /** Normalized variants: as written, without titles, without the article. */
  norms: Form[]
  /** 'name' candidates are the sage's own name; 'alias' is another way to write it. */
  kind: 'name' | 'alias'
}

interface SageIndex {
  version: number
  candidates: Candidate[]
  /** The whole label, subtitle included — matched only as a substring. */
  labelNorm: string
}

const indexCache = new WeakMap<Sage, SageIndex>()

/** "רש״י (רבי שלמה יצחקי)" → ["רש״י (רבי שלמה יצחקי)", "רש״י", "רבי שלמה יצחקי"]. */
function nameForms(name: string): string[] {
  const out = [name]
  const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (m) {
    if (m[1].trim()) out.push(m[1].trim())
    out.push(m[2].trim())
  }
  return out
}

function candidate(text: string, kind: Candidate['kind'], display = text): Candidate {
  const norms: Form[] = []
  const add = (raw: string | null, pen: number) => {
    const n = raw ? normalizeHe(raw) : ''
    if (!n) return
    addForm(norms, n, pen)
    addForm(norms, stripHonorifics(n), pen + 1)
    addForm(norms, stripArticle(n), pen + 2)
  }
  add(text, 0)
  // "רמבם" is how הרמב״ם is typed, so this form counts as written
  add(stripAcronymArticle(text), 0)
  return { text, display, norms, kind }
}

/** One candidate per form of `name`, each remembering the whole name. */
function candidates(name: string, kind: Candidate['kind']): Candidate[] {
  return nameForms(name).map(n => candidate(n, kind, name))
}

function indexOf(sage: Sage): SageIndex {
  const cached = indexCache.get(sage)
  if (cached && cached.version === aliasVersion) return cached

  const parts = labelParts(sage.label)
  const list: Candidate[] = [...candidates(parts.name, 'name')]
  if (parts.fullName) list.push(candidate(parts.fullName, 'name'))
  if (sage.name_en) list.push(...candidates(sage.name_en, 'alias'))
  const en = englishNames?.get(sage.id)
  if (en && en !== sage.label) list.push(...candidates(displayName(en), 'alias'))
  CURATED_ALIASES[normalizeHe(parts.name)]?.forEach(a => list.push(candidate(a, 'alias')))

  const index = { version: aliasVersion, candidates: list, labelNorm: normalizeHe(sage.label ?? '') }
  indexCache.set(sage, index)
  return index
}

// ── Scoring ────────────────────────────────────────────────────────────────

/** Levenshtein distance, stopping early once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      rowMin = Math.min(rowMin, cur[j])
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

export const SCORE = {
  exact: 100,
  prefix: 80,
  wordPrefix: 70,
  substring: 60,
  label: 55,
  fuzzy: 40,
  field: 30,
  location: 25,
  tag: 20,
} as const

export interface SearchHit {
  sage: Sage
  score: number
  /**
   * Set when the match came from another way of writing the name (an English
   * name, an acronym, the full name) rather than the displayed name: shown
   * under the name so the reader sees why this sage came up.
   */
  via: string | null
  /** [start, end) of the match within `displayName(sage.label)`, if it lies there. */
  nameRange: [number, number] | null
  /** [start, end) of the match within `via`, if any. */
  viaRange: [number, number] | null
}

/**
 * The query in every form worth trying, as typed first. A form the reader
 * didn't type (titles dropped) scores a little lower, so "רבי עקיבא" ranks
 * רבי עקיבא above הרב עקיבא איגר, which only shares "עקיבא".
 */
function queryForms(query: string): Form[] {
  const q = normalizeHe(query)
  if (!q) return []
  const forms: Form[] = [{ n: q, pen: 0 }]
  addForm(forms, stripHonorifics(q), 2)
  const noArticle = stripAcronymArticle(query)
  if (noArticle) addForm(forms, normalizeHe(noArticle), 1)
  return forms
}

/** Best tier for one candidate, less the penalties of the forms that met. */
function scoreCandidate(c: Candidate, qs: Form[]): number {
  let best = 0
  for (const { n, pen: np } of c.norms) {
    for (const { n: q, pen: qp } of qs) {
      const tier =
        n === q ? SCORE.exact :
        n.startsWith(q) ? SCORE.prefix :
        n.split(' ').some(w => w.startsWith(q)) ? SCORE.wordPrefix :
        n.includes(q) ? SCORE.substring : 0
      if (tier) best = Math.max(best, tier - np - qp)
    }
  }
  return best
}

/** Close spelling (one typo, two for long words) against a whole name or one of its words. */
function fuzzyScore(c: Candidate, q: string): number {
  if (q.length < 4) return 0
  const max = q.length >= 7 ? 2 : 1
  let best = max + 1
  for (const { n } of c.norms) {
    best = Math.min(best, editDistance(q, n, max))
    // typing in progress: compare with a same-length prefix of each word
    for (const w of n.split(' ')) {
      if (w.length < 3) continue
      best = Math.min(best, editDistance(q, w, max), editDistance(q, w.slice(0, q.length), max))
    }
    if (best === 0) break
  }
  return best <= max ? SCORE.fuzzy - best * 5 : 0
}

/** Score one sage against prepared query forms; 0 means no match. */
function scoreSage(sage: Sage, forms: Form[]): { score: number; hit: Candidate | null; fuzzy: boolean } {
  const idx = indexOf(sage)
  let best = 0
  let hit: Candidate | null = null
  for (const c of idx.candidates) {
    const s = scoreCandidate(c, forms)
    // A name match beats an alias match of the same tier
    if (s > best || (s === best && s > 0 && hit?.kind === 'alias' && c.kind === 'name')) { best = s; hit = c }
  }
  if (best > 0) return { score: best, hit, fuzzy: false }
  const qs = forms.map(f => f.n)
  if (qs.some(q => idx.labelNorm.includes(q))) return { score: SCORE.label, hit: null, fuzzy: false }

  for (const c of idx.candidates) {
    const s = fuzzyScore(c, qs[0])
    if (s > best) { best = s; hit = c }
  }
  if (best > 0) return { score: best, hit, fuzzy: true }

  if (qs.some(q => fuzzyIncludes(sage.field, q)))                return { score: SCORE.field, hit: null, fuzzy: false }
  if (qs.some(q => fuzzyIncludes(sage.location, q)))             return { score: SCORE.location, hit: null, fuzzy: false }
  if (sage.tags?.some(t => qs.some(q => fuzzyIncludes(t, q))))   return { score: SCORE.tag, hit: null, fuzzy: false }
  return { score: 0, hit: null, fuzzy: false }
}

/**
 * Ranked client-side search: exact name > name prefix > word prefix >
 * substring > fuzzy spelling > field / place / tag. Names are matched as
 * written, without titles (הרב, רבי, ר׳…), without the article on an acronym,
 * by full name, and by English name when those are loaded. Ties go to the
 * better-connected sage (`degree`), then to the shorter name.
 */
export function searchSagesRanked(
  sages: Sage[],
  query: string,
  { limit = 8, degree }: { limit?: number; degree?: Map<string, number> } = {},
): SearchHit[] {
  const forms = queryForms(query)
  if (!forms.length) return []
  // longest first, so a highlight covers as much of what was typed as it can
  const qs = forms.map(f => f.n).sort((a, b) => b.length - a.length)

  const scored: Array<{ sage: Sage; score: number; hit: Candidate | null; fuzzy: boolean }> = []
  for (const sage of sages) {
    const r = scoreSage(sage, forms)
    if (r.score > 0) scored.push({ sage, ...r })
  }

  scored.sort((a, b) =>
    b.score - a.score ||
    (degree?.get(b.sage.id) ?? 0) - (degree?.get(a.sage.id) ?? 0) ||
    displayName(a.sage.label).length - displayName(b.sage.label).length ||
    a.sage.label.localeCompare(b.sage.label, 'he'))

  return scored.slice(0, limit).map(({ sage, score, hit, fuzzy }) => {
    const name = displayName(sage.label)
    const nameRange = fuzzy ? null : highlightRange(name, qs)
    // Show the alias the match came from when the name itself doesn't carry it
    const via = hit && (fuzzy ? hit.kind === 'alias' : !nameRange) && hit.display !== name ? hit.display : null
    return {
      sage,
      score,
      via,
      nameRange,
      viaRange: via && !fuzzy ? highlightRange(via, qs) : null,
    }
  })
}

/** The best matches as plain sages (kept for existing callers). */
export function searchSagesLocal(sages: Sage[], query: string, limit = 8): Sage[] {
  return searchSagesRanked(sages, query, { limit }).map(h => h.sage)
}

/**
 * A predicate for the free-text filter, matching exactly what the search box
 * suggests — so typing "rambam" dims the graph to הרמב״ם instead of to nothing.
 */
export function sageQueryMatcher(query: string): (sage: Sage) => boolean {
  const forms = queryForms(query)
  if (!forms.length) return () => true
  return sage => scoreSage(sage, forms).score > 0
}
