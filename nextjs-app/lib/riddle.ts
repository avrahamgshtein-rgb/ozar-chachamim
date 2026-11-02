// "חידת החכם" (the sage riddle): one hidden sage a day, the same for every visitor, found from clues that
// come one at a time, each wrong guess adding the next. Pure (no server imports, no DOM), so the page, the
// game, and the tests share it.
//
// The module is also bundled for the browser (the game scores a guess, writes the share text, keeps the
// streak), so it imports no overlay or dataset: the server hands it already-localized sages through a
// `RiddleContext` (lib/riddleServer.ts builds one from the corpus).
import { ALL_PERIODS, ERA_LABELS } from './types'
import type { Connection, Locale, Period, Region, Sage } from './types'
import { regionsOf } from './regions'
import { labelParts } from './displayName'
import { formatYearRangeFor } from './utils'
import { chronoYear } from '@/components/viz/lineage'
import { dayNumber, sageOfTheDay } from './today'

export const MAX_GUESSES = 6
/** A sage needs this many clues in every language to be a riddle; the game shows at most MAX_CLUES. */
export const MIN_CLUES = 4
export const MAX_CLUES = 6
/** Riddle #1 is 15 October 2026 (Israel). */
export const RIDDLE_EPOCH = Date.UTC(2026, 9, 15) / 86_400_000
export const STORE_KEY = 'ozar-riddle'
/** Within one period, two sages this many years apart are "the same era" for the feedback. */
export const SAME_ERA_YEARS = 50

const LOCALES: Locale[] = ['he', 'en', 'ru']
const HEBREW = /[֐-׿]/
export const hasHebrew = (s: string) => HEBREW.test(s)

/* ── Day and number ───────────────────────────────────────────────────── */

/** 1 on the first riddle (15 Oct 2026); 0 or less before it. */
export function riddleNumber(day: number): number {
  return day - RIDDLE_EPOCH + 1
}

/** A moment inside the Israeli day `day` (noon UTC is 14:00 or 15:00 there), for the functions that take a Date. */
export function dateOfDay(day: number): Date {
  return new Date(day * 86_400_000 + 12 * 3_600_000)
}

/** The instant the next riddle opens: the next midnight in Israel (found by bisection, so a clock change is no problem). */
export function nextRiddleAt(now: Date = new Date()): number {
  const today = dayNumber(now)
  let lo = now.getTime()
  let hi = lo + 26 * 3_600_000
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2)
    if (dayNumber(new Date(mid)) > today) hi = mid
    else lo = mid
  }
  return hi
}

/** "05:12:09" */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`
}

/* ── Links ────────────────────────────────────────────────────────────── */

export interface LinkIndex {
  /** Who taught a sage (CLAUDE.md: `teacher` source = the teacher, `student` source = the student). */
  teachers: Map<string, Set<string>>
  students: Map<string, Set<string>>
  /** Relatives, either way round. */
  family: Map<string, Set<string>>
  /** Direct teacher, student, family and colleague neighbours: what the feedback's 🔥 means. */
  linked: Map<string, Set<string>>
  /** Distinct neighbours over every kind of link: the better known a sage, the better a hint he makes. */
  degree: Map<string, number>
}

function put(m: Map<string, Set<string>>, key: string, value: string) {
  const set = m.get(key)
  if (set) set.add(value)
  else m.set(key, new Set([value]))
}

/** The links between roster sages, by the relations a riddle uses. */
export function buildLinkIndex(connections: Connection[], ids: ReadonlySet<string>): LinkIndex {
  const idx: LinkIndex = { teachers: new Map(), students: new Map(), family: new Map(), linked: new Map(), degree: new Map() }
  const neighbours = new Map<string, Set<string>>()
  for (const c of connections) {
    const a = c.source, b = c.target
    if (a === b || !ids.has(a) || !ids.has(b)) continue
    put(neighbours, a, b)
    put(neighbours, b, a)
    switch (c.type) {
      case 'teacher': put(idx.students, a, b); put(idx.teachers, b, a); break
      case 'student': put(idx.teachers, a, b); put(idx.students, b, a); break
      case 'family': put(idx.family, a, b); put(idx.family, b, a); break
      case 'colleague': break
      default: continue
    }
    put(idx.linked, a, b)
    put(idx.linked, b, a)
  }
  for (const [id, set] of neighbours) idx.degree.set(id, set.size)
  return idx
}

/** What the server gives the clue builder: the roster, its links, and how to show a sage in a language. */
export interface RiddleContext {
  byId: ReadonlyMap<string, Sage>
  links: LinkIndex
  localize: (sage: Sage, locale: Locale) => Sage
  /** How well known a sage is (`fameScore`): the server reads the Wikipedia and Sefaria files, this module reads none. */
  fame: (id: string) => number
}

/** A sage needs at least this much fame to be a riddle: a game whose answer most players never heard of loses them in days. */
export const MIN_FAME = 8

/**
 * How well known a sage is: his distinct links on the roster, plus 3 for a Hebrew Wikipedia article, 2 for an English one,
 * and one for each work Sefaria lists under his name (at most 5).
 */
export function fameScore({ degree, hebrewArticle, englishArticle, works }: {
  degree: number; hebrewArticle: boolean; englishArticle: boolean; works: number
}): number {
  return degree + (hebrewArticle ? 3 : 0) + (englishArticle ? 2 : 0) + Math.min(Math.max(works, 0), 5)
}

/* ── Names ────────────────────────────────────────────────────────────── */

const TITLES = /^(?:הרב|רבי|רבנו|רבינו|רבן|רב|מרן|הגאון|ר[׳'’]|rabbi|rav|reb|the|рабби|рав|реб)\s+/iu
const ACRONYM_ARTICLE = /^ה(?=[֐-׿]*["״”])/

/** "Maimonides (Rambam)" → "Maimonides"; a name with no brackets is its own plain name. */
export function plainName(label: string | undefined | null): string {
  const name = labelParts(label).name
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim() || name
}

/**
 * Every way the answer's own name is written, for hiding it: the roster label and the language's label,
 * each as a whole, outside and inside its brackets, without its title (רבי, Rabbi, Рабби) and, for an
 * acronym, without the article (הרמב״ם → רמב״ם). Short pieces are dropped: a two-letter word is no name.
 */
export function nameVariants(sage: Sage, shown?: Sage): string[] {
  const out = new Set<string>()
  const forms = (name: string | undefined | null) => {
    const raw = (name ?? '').trim()
    if (!raw) return
    const parts = labelParts(raw)
    for (const whole of [raw, parts.name, parts.fullName ?? '']) {
      if (!whole) continue
      const m = whole.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
      for (const piece of (m ? [whole, m[1], m[2]] : [whole]).map(p => p.trim()).filter(Boolean)) {
        const noTitle = piece.replace(TITLES, '').trim()
        for (const p of [piece, noTitle]) {
          out.add(p)
          out.add(p.replace(ACRONYM_ARTICLE, ''))
        }
      }
    }
  }
  forms(sage.label)
  forms(sage.name_en)
  if (shown) forms(shown.label)
  return [...out].filter(v => v.length >= 3 && /\p{L}/u.test(v)).sort((a, b) => b.length - a.length)
}

const QUOTE_CLASS = '[״”“"]'
const APOS_CLASS = "[׳’']"
const NOT_LETTER_BEFORE = '(?<![\\p{L}\\p{M}])'
const NOT_LETTER_AFTER = '(?![\\p{L}\\p{M}])'

/** The pattern for one variant: quotes, apostrophes and spaces match however they are written. */
function variantSource(variant: string, locale: Locale): string {
  const body = Array.from(variant).map(ch => {
    if (/[״”“"]/.test(ch)) return QUOTE_CLASS
    if (/[׳’']/.test(ch)) return APOS_CLASS
    if (/\s/.test(ch)) return '\\s+'
    return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }).join('')
  // a short name is a whole word (a three-letter name sits inside many longer words)
  if (variant.length < 4) return `${NOT_LETTER_BEFORE}${body}${NOT_LETTER_AFTER}`
  // a Russian name takes a case ending (Рамбама, Рамбаму)
  return locale === 'ru' && /[а-яё]$/i.test(variant) ? `${body}[а-яё]{0,3}` : body
}

/** `text` with every written form of the name replaced by "…". */
export function maskName(text: string, variants: string[], locale: Locale): string {
  if (variants.length === 0) return text
  const re = new RegExp(variants.map(v => variantSource(v, locale)).join('|'), 'giu')
  return text
    .replace(re, '…')
    .replace(/\(\s*…\s*\)/g, '')
    .replace(/…(?:[\s,;·–—-]*…)+/g, '…')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

/** Whether `text` still holds one of the name's written forms (the same rules as the mask). */
export function holdsName(text: string, variants: string[], locale: Locale): boolean {
  return variants.length > 0 && new RegExp(variants.map(v => variantSource(v, locale)).join('|'), 'iu').test(text)
}

/* ── Clues ────────────────────────────────────────────────────────────── */

/** From vague to specific: the order the clues are revealed in. */
export const CLUE_ORDER = ['era', 'field', 'place', 'time', 'related', 'concept'] as const
export type ClueKind = (typeof CLUE_ORDER)[number]

export interface Clue {
  kind: ClueKind
  /** What the clue is about ("Era", "מרבותיו"). */
  label: string
  /** The clue itself. */
  text: string
}

const CLUE_LABEL: Record<Exclude<ClueKind, 'related'>, Record<Locale, string>> = {
  era: { he: 'תקופה', en: 'Era', ru: 'Эпоха' },
  field: { he: 'תחום', en: 'Field', ru: 'Область' },
  place: { he: 'מקום', en: 'Place', ru: 'Место' },
  time: { he: 'זמן', en: 'When', ru: 'Когда' },
  concept: { he: 'הרעיון המרכזי', en: 'Core idea', ru: 'Главная идея' },
}

const RELATED_LABEL = {
  teacher: { he: ['מרבותיו', 'מרבותיה'], en: ['A teacher', 'A teacher'], ru: ['Один из учителей', 'Один из учителей'] },
  student: { he: ['מתלמידיו', 'מתלמידיה'], en: ['A student', 'A student'], ru: ['Один из учеников', 'Один из учеников'] },
  family: { he: ['מבני משפחתו', 'מבני משפחתה'], en: ['A relative', 'A relative'], ru: ['Родственник', 'Родственница'] },
} as const

/** Hebrew agrees in gender: women carry the 'נשים' tag (see TAG_FACETS). */
const isWoman = (s: Sage) => !!s.tags?.includes('נשים')

/** The text a clue shows in `locale`, or '' when it is only in Hebrew (an untranslated place, say). */
function inLanguage(text: string | undefined, locale: Locale): string {
  const t = (text ?? '').trim()
  return t && (locale === 'he' || !hasHebrew(t)) ? t : ''
}

function relatedClue(sage: Sage, ctx: RiddleContext, locale: Locale, variants: string[]): Clue | null {
  const kinds: Array<['teacher' | 'student' | 'family', Map<string, Set<string>>]> = [
    ['teacher', ctx.links.teachers], ['student', ctx.links.students], ['family', ctx.links.family],
  ]
  for (const [kind, map] of kinds) {
    const ids = [...(map.get(sage.id) ?? [])].sort((a, b) =>
      (ctx.links.degree.get(b) ?? 0) - (ctx.links.degree.get(a) ?? 0) || Number(a) - Number(b))
    for (const id of ids) {
      const other = ctx.byId.get(id)
      if (!other) continue
      const name = inLanguage(plainName(ctx.localize(other, locale).label), locale)
      if (!name || holdsName(name, variants, locale)) continue
      const labels = RELATED_LABEL[kind][locale]
      return { kind: 'related', label: isWoman(sage) ? labels[1] : labels[0], text: name }
    }
  }
  return null
}

/**
 * The riddle's clues for one sage in one language, vague to specific:
 * era, field, place, time, a relative (a teacher, else a student, else family), the core idea.
 * Never his own name: the core idea has it replaced by "…", and any other clue that holds it is left out.
 */
export function riddleClues(sage: Sage, ctx: RiddleContext, locale: Locale): Clue[] {
  const shown = ctx.localize(sage, locale)
  const variants = nameVariants(sage, shown)
  const clues: Clue[] = []
  const add = (kind: Exclude<ClueKind, 'related'>, text: string, mask = false) => {
    let t = text
    if (mask) t = maskName(t, variants, locale)
    // the era is one of eleven fixed labels, never a name: "Shmuel (the Amora)" must not lose his "Amoraim"
    else if (kind !== 'era' && holdsName(t, variants, locale)) t = ''
    // a core idea that is mostly masks says nothing
    if (kind === 'concept' && t.replace(/[…\s\p{P}]/gu, '').length < 15) t = ''
    if (t) clues.push({ kind, label: CLUE_LABEL[kind][locale], text: t })
  }

  const era = ERA_LABELS[sage.period]?.[locale]
  if (era) add('era', era)
  add('field', inLanguage(locale === 'he' ? sage.field : shown.field_label, locale))
  add('place', inLanguage(locale === 'he' ? sage.location : shown.location_label, locale))
  add('time', formatYearRangeFor(locale, sage.birth_year, sage.death_year, sage.date_precision))
  const related = relatedClue(sage, ctx, locale, variants)
  if (related) clues.push(related)
  add('concept', inLanguage(shown.core_concept, locale), true)
  return clues.slice(0, MAX_CLUES)
}

/* ── The pool and the pick ────────────────────────────────────────────── */

const byNumber = (a: string, b: string) => Number(a) - Number(b)

/**
 * The sages a riddle may be about: a research paper to send the player to, a name in English and Russian,
 * a known era, place (that maps to a region, or the region hint would be a guess), field and core idea,
 * a teacher, student or relative on the roster, at least MIN_CLUES clues in every language, and
 * a fame of at least MIN_FAME (the answer should be someone the player may have heard of).
 */
export function riddlePool(sages: Sage[], ctx: RiddleContext): string[] {
  return sages
    .filter(s => {
      if (!s.has_research || !ALL_PERIODS.includes(s.period)) return false
      if (!s.location?.trim() || !s.field?.trim() || !s.core_concept?.trim() || regionsOf(s.location).length === 0) return false
      const { teachers, students, family } = ctx.links
      if (!teachers.has(s.id) && !students.has(s.id) && !family.has(s.id)) return false
      if (ctx.localize(s, 'en').label === s.label || ctx.localize(s, 'ru').label === s.label) return false
      if (ctx.fame(s.id) < MIN_FAME) return false
      return LOCALES.every(l => riddleClues(s, ctx, l).length >= MIN_CLUES)
    })
    .map(s => s.id)
    .sort(byNumber)
}

/**
 * The sage of riddle `day`: a stable walk through the pool (every sage once a cycle, the same for every
 * visitor), except that it never lands on `avoidId`, the sage the Today page features that day: the walk
 * then takes the next sage of the pool instead.
 */
export function riddleIdOn(pool: string[], day: number, avoidId: string | null = null): string | null {
  const id = sageOfTheDay(pool, day - RIDDLE_EPOCH)
  if (id === null || id !== avoidId || pool.length < 2) return id
  const sorted = [...pool].sort(byNumber)
  return sorted[(sorted.indexOf(id) + 1) % sorted.length]
}

/* ── Guesses ──────────────────────────────────────────────────────────── */

/** The order of keys in a candidate's `regions` bit mask (north-america was appended last, so no earlier bit moved). */
export const REGION_ORDER: Region[] = [
  'eretz-israel', 'mizrach', 'north-africa', 'sefarad', 'provence', 'tsarfat', 'italy', 'ashkenaz', 'east-europe', 'other', 'north-america',
]

export function regionMask(location: string | undefined): number {
  return regionsOf(location).reduce((m, r) => m | (1 << REGION_ORDER.indexOf(r)), 0)
}

/** What a guess is compared on. */
export interface RiddleFacts {
  id: string
  /** Index in ALL_PERIODS. */
  period: number
  /** Bit mask over REGION_ORDER; 0 when his place maps to no region. */
  regions: number
  /** chronoYear: one sortable year, null when undated. */
  year: number | null
}

export interface RiddleCandidate extends RiddleFacts {
  name: string
  /** Linked to today's answer (teacher, student, family or colleague). */
  linked: boolean
}

export function factsOf(sage: Sage): RiddleFacts {
  return { id: sage.id, period: ALL_PERIODS.indexOf(sage.period), regions: regionMask(sage.location), year: chronoYear(sage) }
}

export type EraHint = 'same' | 'earlier' | 'later'
export type RegionHint = 'same' | 'other' | 'unknown'

export interface GuessFeedback {
  /** The answer's era relative to the guess. */
  era: EraHint
  /** `unknown` when either place maps to no region. */
  region: RegionHint
  /** A direct teacher, student, family or colleague link between the two. */
  linked: boolean
}

export function compareGuess(guess: RiddleFacts, answer: RiddleFacts, linkedIds: ReadonlySet<string>): GuessFeedback {
  let era: EraHint = 'same'
  if (answer.period !== guess.period) era = answer.period > guess.period ? 'later' : 'earlier'
  else if (answer.year !== null && guess.year !== null && Math.abs(answer.year - guess.year) > SAME_ERA_YEARS) {
    era = answer.year > guess.year ? 'later' : 'earlier'
  }
  const region: RegionHint = guess.regions === 0 || answer.regions === 0 ? 'unknown' : (guess.regions & answer.regions) !== 0 ? 'same' : 'other'
  return { era, region, linked: linkedIds.has(guess.id) }
}

/** How many clues are showing: the first at the start, one more for each guess, all of them once it is over. */
export function visibleClues(total: number, guesses: number, done: boolean): number {
  return done ? total : Math.min(total, 1 + guesses)
}

/* ── Share ────────────────────────────────────────────────────────────── */

export const SHARE_TITLE: Record<Locale, string> = { he: 'חידת החכם', en: 'Sage Riddle', ru: 'Загадка мудреца' }
const ERA_EMOJI: Record<EraHint, string> = { same: '🟩', later: '🔼', earlier: '🔽' }
const REGION_EMOJI: Record<RegionHint, string> = { same: '🟩', other: '⬜', unknown: '⬜' }

/** One guess as a row of emoji: era, region, and 🔥 when linked. Says nothing of who he was. */
export function shareRow(f: GuessFeedback): string {
  return `${ERA_EMOJI[f.era]}${REGION_EMOJI[f.region]}${f.linked ? '🔥' : ''}`
}

/**
 * The result as text for a chat: the title, number and score, one row per guess (the winning guess is 🎯),
 * and the link. Never the sage's name or id.
 */
export function shareText({ locale, number, url, feedback, won }: {
  locale: Locale; number: number; url: string; feedback: GuessFeedback[]; won: boolean
}): string {
  const score = `${won ? feedback.length : 'X'}/${MAX_GUESSES}`
  const head = `${SHARE_TITLE[locale]}${number >= 1 ? ` #${number}` : ''} 🧩 ${score}`
  const rows = feedback.map((f, i) => (won && i === feedback.length - 1 ? '🎯' : shareRow(f)))
  return [head, ...rows, url].join('\n')
}

/* ── What the browser keeps ───────────────────────────────────────────── */

export interface RiddleStats {
  played: number
  won: number
  /** The run of consecutive days won, as of the last finished game (see `currentStreak`). */
  streak: number
  maxStreak: number
  /** Wins by number of guesses: dist[0] is a win on the first guess. */
  dist: number[]
  /** The day of the last finished game, and whether it was won: the streak lives on only from yesterday's win. */
  lastDay: number | null
  lastWon: boolean
}

export interface RiddleState {
  /** The day of the riddle being played; 0 for a browser that has played none. */
  day: number
  guesses: string[]
  done: boolean
  won: boolean
  stats: RiddleStats
}

export function emptyStats(): RiddleStats {
  return { played: 0, won: 0, streak: 0, maxStreak: 0, dist: Array(MAX_GUESSES).fill(0), lastDay: null, lastWon: false }
}

export function emptyState(): RiddleState {
  return { day: 0, guesses: [], done: false, won: false, stats: emptyStats() }
}

const count = (v: unknown, max = 1_000_000): number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : 0

/** The saved state from its text; anything unreadable is a browser that has not played. Never throws. */
export function parseState(raw: string | null | undefined): RiddleState {
  try {
    const o = JSON.parse(raw ?? '')
    if (!o || typeof o !== 'object' || !Number.isInteger(o.day) || o.day < 0) return emptyState()
    const s = o.stats && typeof o.stats === 'object' ? o.stats : {}
    const dist = Array.isArray(s.dist) ? s.dist : []
    const played = count(s.played)
    const won = Math.min(count(s.won), played)
    const guesses: string[] = Array.isArray(o.guesses)
      ? [...new Set<string>(o.guesses.filter((g: unknown): g is string => typeof g === 'string' && /^[\w.-]{1,16}$/.test(g)))].slice(0, MAX_GUESSES)
      : []
    const wonToday = o.won === true && guesses.length > 0
    return {
      day: o.day,
      guesses,
      won: wonToday,
      done: wonToday || guesses.length >= MAX_GUESSES,
      stats: {
        played,
        won,
        streak: count(s.streak),
        maxStreak: Math.max(count(s.maxStreak), count(s.streak)),
        dist: Array.from({ length: MAX_GUESSES }, (_, i) => count(dist[i])),
        lastDay: Number.isInteger(s.lastDay) && s.lastDay >= 0 ? s.lastDay : null,
        lastWon: s.lastWon === true,
      },
    }
  } catch {
    return emptyState()
  }
}

/** Opening on another day starts a new game and keeps the stats. */
export function startDay(state: RiddleState, day: number): RiddleState {
  return state.day === day ? state : { ...state, day, guesses: [], done: false, won: false }
}

/** The streak as it stands on `day`: kept only if the last finished game was yesterday's or today's, and won. */
export function currentStreak(stats: RiddleStats, day: number): number {
  return stats.lastWon && stats.lastDay !== null && stats.lastDay >= day - 1 ? stats.streak : 0
}

/** One more guess. A repeated guess, or one after the game ended, changes nothing. The game ends on the right sage or the sixth guess. */
export function applyGuess(state: RiddleState, guess: string, answer: string): RiddleState {
  if (state.done || state.guesses.includes(guess) || state.guesses.length >= MAX_GUESSES) return state
  const guesses = [...state.guesses, guess]
  const won = guess === answer
  if (!won && guesses.length < MAX_GUESSES) return { ...state, guesses }
  const s = state.stats
  const continues = s.lastWon && s.lastDay === state.day - 1
  const streak = won ? (continues ? s.streak : 0) + 1 : 0
  const dist = [...s.dist]
  if (won) dist[guesses.length - 1]++
  return {
    ...state,
    guesses,
    done: true,
    won,
    stats: {
      played: s.played + 1, won: s.won + (won ? 1 : 0), streak, maxStreak: Math.max(s.maxStreak, streak), dist,
      lastDay: state.day, lastWon: won,
    },
  }
}

/* ── What the page hands the game ─────────────────────────────────────── */

/**
 * The sage's portrait for the end screen, as ready-made strings: the server (lib/riddleServer.ts) holds the portraits
 * data file, the browser never imports it. `kind` is the portrait's kind (`illustration` | `photo`, as in lib/portraits.ts),
 * which already picked the wording of `alt` and `credit`. Shown only once the game is over, never before.
 */
export interface RiddlePortrait {
  src: string
  alt: string
  credit: string
  /** The episode section of the sage's page. */
  href: string
  kind: 'illustration' | 'photo'
}

/** The sage once the game is over: what the end screen shows. */
export interface RiddleCard {
  id: string
  name: string
  tagline: string | null
  years: string
  period: Period
  bio: string
  sageHref: string
  towerHref: string
  quizHref: string | null
  /** null when the sage has no portrait: the end screen then looks as it did before portraits. */
  portrait: RiddlePortrait | null
}

export interface RiddlePayload {
  day: number
  number: number
  /** The sage's id. The check is in the browser (no accounts, no server state): this is a game, not a vault. */
  answer: string
  clues: Clue[]
  candidates: RiddleCandidate[]
  card: RiddleCard
}
