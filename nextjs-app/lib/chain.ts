// "שרשרת החכמים" (the sage chain): a daily game. Two sages, A and B, are given; the chain starts at A and the
// player names sages one at a time, each of whom must be directly linked to the chain's current end, to
// reach B in as few steps as possible. A sage who is not linked is a miss; five misses lose.
//
// Pure (no server imports, no DOM), so the page, the game and the tests share it; also bundled for the
// browser. It knows nothing of the graph: the caller says whether two sages are linked (`applyMove`'s
// `linked`), and the server hands over the day's pair and its optimal route (`ChainDay`).
import type { Locale } from './types'
import { RIDDLE_EPOCH } from './riddle'
import { sageOfTheDay } from './today'

export const CHAIN_STORE_KEY = 'ozar-chain'
/** The fifth miss ends the game as a loss. */
export const MAX_MISSES = 5
/** A pair of the day is this many links apart on the optimal route, no fewer (too easy) and no more (too long). */
export const CHAIN_MIN_BEST = 3
export const CHAIN_MAX_BEST = 5
/** A hint for the era of the next sage on the optimal route comes with this many misses, one for his field with that many. */
export const HINT_ERA_AT = 2
export const HINT_FIELD_AT = 4
/** No honest chain is longer than the roster; a stored one longer than this is damaged. */
const MAX_CHAIN = 500

export const CHAIN_TITLE: Record<Locale, string> = { he: 'שרשרת החכמים', en: 'Sage Chain', ru: 'Цепочка мудрецов' }

/** 1 on the first chain (15 Oct 2026, the same epoch as the riddle); 0 or less before it. */
export const chainNumber = (day: number): number => day - RIDDLE_EPOCH + 1

/* ── The pair of the day ──────────────────────────────────────────────── */

/** Two sages and the number of links on the optimal route between them. */
export interface ChainPair {
  a: string
  b: string
  best: number
}

const byId = (x: string, y: string) => (Number(x) - Number(y)) || (x < y ? -1 : x > y ? 1 : 0)
const byPair = (p: ChainPair, q: ChainPair) => byId(p.a, q.a) || byId(p.b, q.b)

/**
 * The pair of day `day`: a stable walk through `pairs` sorted by (a, b), one a day and every pair once a cycle,
 * the same for every visitor (`sageOfTheDay` over the pairs' positions). When the pair holds a sage of `avoid`
 * (the riddle's answer of the day, say) the walk takes the next pair, in that order, that holds none.
 * `null` when there are no pairs, or every pair holds one.
 */
export function dailyPair(pairs: readonly ChainPair[], day: number, avoid?: ReadonlySet<string>): ChainPair | null {
  const n = pairs.length
  if (n === 0) return null
  let sorted = pairs
  for (let i = 1; i < n; i++) {
    if (byPair(pairs[i - 1], pairs[i]) > 0) { sorted = [...pairs].sort(byPair); break }
  }
  const start = Number(sageOfTheDay(Array.from({ length: n }, (_, i) => String(i)), day - RIDDLE_EPOCH))
  for (let k = 0; k < n; k++) {
    const p = sorted[(start + k) % n]
    if (!avoid || !(avoid.has(p.a) || avoid.has(p.b))) return p
  }
  return null
}

/** What the page hands the game for one day. */
export interface ChainDay {
  day: number
  number: number
  a: string
  b: string
  /** Links on the optimal route. */
  best: number
  /** The optimal chain, A to B, ids. */
  route: string[]
  /** For each sage strictly between A and B on the route: his field in the page's language ('' if none). */
  fields: Record<string, string>
}

/* ── What the browser keeps ───────────────────────────────────────────── */

export interface ChainStats {
  played: number
  won: number
  /** The run of consecutive days won, as of the last finished game (see `currentChainStreak`). */
  streak: number
  maxStreak: number
  /** The day of the last finished game, and whether it was won: the streak lives on only from yesterday's win. */
  lastDay: number | null
  lastWon: boolean
}

export interface ChainState {
  /** The day being played; 0 for a browser that has played none. */
  day: number
  /** A, then each sage named and linked, in order. */
  chain: string[]
  misses: number
  /** The sages named since the last hit who were not linked to the chain's end: naming one again is refused, free. */
  missed: string[]
  /** One letter per move: `h` a hit, `m` a miss. What the share text is drawn from. */
  moves: string
  done: boolean
  won: boolean
  stats: ChainStats
}

export function emptyChainStats(): ChainStats {
  return { played: 0, won: 0, streak: 0, maxStreak: 0, lastDay: null, lastWon: false }
}

export function emptyChainState(): ChainState {
  return { day: 0, chain: [], misses: 0, missed: [], moves: '', done: false, won: false, stats: emptyChainStats() }
}

const count = (v: unknown, max = 1_000_000): number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : 0

const isId = (v: unknown): v is string => typeof v === 'string' && /^[\w.-]{1,16}$/.test(v)
const countOf = (s: string, ch: string) => s.split(ch).length - 1

/** The saved state from its text; anything unreadable is a browser that has not played, and a damaged one is repaired. Never throws. */
export function parseChainState(raw: string | null | undefined): ChainState {
  try {
    const o = JSON.parse(raw ?? '')
    if (!o || typeof o !== 'object' || !Number.isInteger(o.day) || o.day < 0) return emptyChainState()
    const s = o.stats && typeof o.stats === 'object' ? o.stats : {}
    const played = count(s.played)
    const ids = (v: unknown, max: number): string[] => (Array.isArray(v) ? [...new Set<string>(v.filter(isId))].slice(0, max) : [])
    const chain = ids(o.chain, MAX_CHAIN)
    const hits = Math.max(chain.length - 1, 0)
    // the moves are the record; the miss count is read from them, or from `misses` when they are gone (more than five is absurd: none)
    const written = typeof o.moves === 'string' ? o.moves.replace(/[^hm]/g, '') : ''
    const missCount = written ? countOf(written, 'm') : count(o.misses)
    const misses = missCount <= MAX_MISSES ? missCount : 0
    const moves = countOf(written, 'h') === hits && countOf(written, 'm') === misses ? written : 'm'.repeat(misses) + 'h'.repeat(hits)
    const missed = ids(o.missed, MAX_MISSES).filter(id => !chain.includes(id)).slice(0, misses)
    const won = o.won === true && hits >= 1 && misses < MAX_MISSES
    const streak = count(s.streak)
    return {
      day: o.day,
      chain,
      misses,
      missed,
      moves,
      won,
      done: won || misses >= MAX_MISSES,
      stats: {
        played,
        won: Math.min(count(s.won), played),
        streak,
        maxStreak: Math.max(count(s.maxStreak), streak),
        lastDay: Number.isInteger(s.lastDay) && s.lastDay >= 0 ? s.lastDay : null,
        lastWon: s.lastWon === true,
      },
    }
  } catch {
    return emptyChainState()
  }
}

/**
 * Opening on another day starts a new game at A and keeps the stats. The same day with the same A restores the
 * game (also a finished one); the same day with another A (the pair changed after a deploy, or the state is
 * damaged) starts over too.
 */
export function startChainDay(s: ChainState, day: number, a: string): ChainState {
  return s.day === day && s.chain[0] === a ? s : { ...s, day, chain: [a], misses: 0, missed: [], moves: '', done: false, won: false }
}

/** The streak as it stands on `day`: kept only if the last finished game was yesterday's or today's, and won (as the riddle's). */
export function currentChainStreak(stats: ChainStats, day: number): number {
  return stats.lastWon && stats.lastDay !== null && stats.lastDay >= day - 1 ? stats.streak : 0
}

/* ── The rules ────────────────────────────────────────────────────────── */

export type MoveOutcome = 'hit' | 'miss' | 'refused'

/** Closes the game, counting it once in the stats. */
function finish(s: ChainState, won: boolean): ChainState {
  const t = s.stats
  const continues = t.lastWon && t.lastDay === s.day - 1
  const streak = won ? (continues ? t.streak : 0) + 1 : 0
  return {
    ...s,
    done: true,
    won,
    stats: { played: t.played + 1, won: t.won + (won ? 1 : 0), streak, maxStreak: Math.max(t.maxStreak, streak), lastDay: s.day, lastWon: won },
  }
}

/**
 * The player names a sage. `linked(x, y)` says whether two sages are directly linked.
 * - `refused` (changes nothing, costs nothing): the game is over, the sage is already on the chain, he was
 *   already named since the last hit (a miss is not charged twice), or the state is not this day's game
 *   (call `startChainDay` first).
 * - `hit`: he is linked to the chain's current end, so he joins the chain and the misses so far are forgotten
 *   (a sage who was not linked to the old end may be linked to the new one). Reaching B wins.
 * - `miss`: he is not linked. The fifth miss loses.
 */
export function applyMove(
  s: ChainState,
  id: string,
  day: Pick<ChainDay, 'day' | 'a' | 'b'>,
  linked: (x: string, y: string) => boolean,
): { state: ChainState; outcome: MoveOutcome } {
  const end = s.chain[s.chain.length - 1]
  if (s.done || s.day !== day.day || s.chain[0] !== day.a || s.chain.includes(id) || s.missed.includes(id)) {
    return { state: s, outcome: 'refused' }
  }
  if (!linked(end, id)) {
    const next = { ...s, misses: s.misses + 1, missed: [...s.missed, id], moves: `${s.moves}m` }
    return { state: next.misses >= MAX_MISSES ? finish(next, false) : next, outcome: 'miss' }
  }
  const next = { ...s, chain: [...s.chain, id], missed: [], moves: `${s.moves}h` }
  return { state: id === day.b ? finish(next, true) : next, outcome: 'hit' }
}

/** The links made so far. */
export const chainSteps = (s: ChainState): number => Math.max(s.chain.length - 1, 0)

export interface ChainHint {
  kind: 'era' | 'field'
  /** The sage the hint is about: the first one strictly between A and B on the optimal route who is not yet on the chain. */
  id: string
}

/** The hints the misses have earned: his era from the 2nd miss, his field also from the 4th. */
export function chainHints(s: ChainState, day: Pick<ChainDay, 'route'>): ChainHint[] {
  const id = day.route.slice(1, -1).find(x => !s.chain.includes(x))
  if (id === undefined) return []
  const out: ChainHint[] = []
  if (s.misses >= HINT_ERA_AT) out.push({ kind: 'era', id })
  if (s.misses >= HINT_FIELD_AT) out.push({ kind: 'field', id })
  return out
}

/* ── Share ────────────────────────────────────────────────────────────── */

/**
 * The result as text for a chat: the title, number and steps over the best (`4/3`, `✗/3` on a loss), one row
 * with an emoji per move (🟩 hit, ⬜ miss, 🎯 for the hit that reached B), and the link. Never a name or an id.
 */
export function chainShareText({ locale, number, url, moves, won, best }: {
  locale: Locale; number: number; url: string; moves: string; won: boolean; best: number
}): string {
  const letters = [...moves].filter(c => c === 'h' || c === 'm')
  const steps = letters.filter(c => c === 'h').length
  const head = `${CHAIN_TITLE[locale]}${number >= 1 ? ` #${number}` : ''} 🔗 ${won ? steps : '✗'}/${best}`
  const row = letters.map((c, i) => (c === 'm' ? '⬜' : won && i === letters.length - 1 ? '🎯' : '🟩')).join('')
  return [head, ...(row ? [row] : []), url].join('\n')
}
