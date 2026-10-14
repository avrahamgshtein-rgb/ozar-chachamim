/**
 * The sage chain's rules (lib/chain.ts) and its sage field (components/connect/SageCombobox.tsx): the pair
 * of the day (the same for every visitor, every pair once a cycle, never a sage the caller avoids), the game
 * (a hit appends, a miss counts, the fifth miss loses, reaching B wins, a repeat is refused, the hints at the
 * second and fourth miss), what the browser keeps (a damaged state is repaired, a new day keeps the stats, the
 * streak as the riddle's) and the shared result (no name, no id). Runs on small invented worlds: no corpus, no
 * network. The corpus half (the real pairs, the server glue) is tests/chainServer.test.ts.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { RIDDLE_EPOCH, riddleNumber } from '../lib/riddle'
import { dayNumber } from '../lib/today'
import {
  CHAIN_MAX_BEST, CHAIN_MIN_BEST, CHAIN_STORE_KEY, CHAIN_TITLE, MAX_MISSES,
  applyMove, chainHints, chainNumber, chainShareText, chainSteps, currentChainStreak, dailyPair, emptyChainState,
  parseChainState, startChainDay,
  type ChainDay, type ChainPair, type ChainState,
} from '../lib/chain'
import type { Locale } from '../lib/types'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const app = path.join(__dirname, '..')
const read = (rel: string) => fs.readFileSync(path.join(app, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const D0 = RIDDLE_EPOCH

/* ── The pair of the day ──────────────────────────────────────────────── */

/** n distinct pairs with ids of different lengths (so a text sort and a numeric sort disagree), in a scrambled order. */
function makePairs(n: number): ChainPair[] {
  const pairs: ChainPair[] = Array.from({ length: n }, (_, i) => ({ a: String(5 + ((i * 7) % 97)), b: String(200 + i), best: 3 + (i % 3) }))
  let seed = 12345
  for (let i = n - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    const j = seed % (i + 1)
    ;[pairs[i], pairs[j]] = [pairs[j], pairs[i]]
  }
  return pairs
}
const key = (p: ChainPair) => `${p.a}-${p.b}`
const numeric = (x: ChainPair, y: ChainPair) => Number(x.a) - Number(y.a) || Number(x.b) - Number(y.b)

console.log('\nthe pair of the day')

test('the constants of the design', () => {
  assert.equal(CHAIN_STORE_KEY, 'ozar-chain')
  assert.equal(MAX_MISSES, 5)
  assert.equal(CHAIN_MIN_BEST, 3)
  assert.equal(CHAIN_MAX_BEST, 5)
  for (const l of LOCALES) assert.ok(CHAIN_TITLE[l].length > 3)
  assert.equal(CHAIN_TITLE.he, 'שרשרת החכמים')
})

test('chain #1 is 15 October 2026 in Israel, the riddle\'s day, and the number counts days', () => {
  assert.equal(chainNumber(D0), 1)
  assert.equal(chainNumber(D0 + 9), 10)
  assert.equal(chainNumber(D0 - 1), 0)
  assert.equal(chainNumber(D0), riddleNumber(D0))
  assert.equal(chainNumber(dayNumber(new Date('2026-10-14T20:59:00Z'))), 0) // 23:59 on the 14th in Israel
  assert.equal(chainNumber(dayNumber(new Date('2026-10-14T21:01:00Z'))), 1) // 00:01 on the 15th
})

test('no pairs, no pair of the day', () => {
  assert.equal(dailyPair([], D0), null)
  assert.equal(dailyPair([], D0, new Set(['1'])), null)
})

test('the first chain is the first pair in numeric order of (a, b), however the list came', () => {
  const pairs = [{ a: '100', b: '7', best: 3 }, { a: '9', b: '20', best: 4 }, { a: '9', b: '3', best: 3 }, { a: '10', b: '1', best: 5 }]
  assert.deepEqual(dailyPair(pairs, D0), { a: '9', b: '3', best: 3 }) // a text sort would put "10" first
  assert.deepEqual(dailyPair([...pairs].reverse(), D0), { a: '9', b: '3', best: 3 })
})

test('the same pair for every visitor on a day, whatever order or copy of the list they hold; the next day another one', () => {
  const pairs = makePairs(61)
  const shuffled = [...pairs].reverse()
  for (let d = D0 - 20; d < D0 + 200; d++) {
    const p = dailyPair(pairs, d)!
    assert.deepEqual(p, dailyPair(shuffled, d))
    assert.deepEqual(p, dailyPair(pairs.map(x => ({ ...x })), d))
    assert.notDeepEqual(p, dailyPair(pairs, d + 1))
  }
})

test('every pair comes once in a cycle, whatever the number of pairs; the cycle then starts over', () => {
  for (const n of [1, 2, 3, 4, 10, 36, 37, 100, 361, 997, 1000]) {
    const pairs = makePairs(n)
    const seen = new Set<string>()
    for (let k = 0; k < n; k++) seen.add(key(dailyPair(pairs, D0 + k)!))
    assert.equal(seen.size, n, `${n} pairs: ${seen.size} different in a cycle`)
    for (let k = 0; k < Math.min(n, 40); k++) assert.deepEqual(dailyPair(pairs, D0 + k), dailyPair(pairs, D0 + k + n))
  }
})

test('a sage to avoid is never in the pair; with nothing to avoid on that day the walk is untouched', () => {
  const pairs = makePairs(120)
  const sorted = [...pairs].sort(numeric)
  const avoid = new Set([pairs[3].a, pairs[40].b])
  let clashes = 0
  for (let d = D0 - 30; d < D0 + 400; d++) {
    const plain = dailyPair(pairs, d)!
    const p = dailyPair(pairs, d, avoid)!
    assert.ok(!avoid.has(p.a) && !avoid.has(p.b), `day ${d}: ${key(p)} holds a sage to avoid`)
    if (!avoid.has(plain.a) && !avoid.has(plain.b)) assert.deepEqual(p, plain)
    else {
      // the next pair after the clashing one, in the sorted order, that holds none
      clashes++
      let i = sorted.findIndex(x => key(x) === key(plain))
      do i = (i + 1) % sorted.length
      while (avoid.has(sorted[i].a) || avoid.has(sorted[i].b))
      assert.deepEqual(p, sorted[i], `day ${d}`)
    }
  }
  assert.ok(clashes > 0, 'the test never met a clash')
  assert.deepEqual(dailyPair(pairs, D0 + 5, new Set()), dailyPair(pairs, D0 + 5))
})

test('with a sage to avoid, every pair that does not hold him still comes within a cycle; when every pair holds him there is none', () => {
  const pairs = makePairs(80)
  const avoid = new Set([pairs[0].a])
  const seen = new Set<string>()
  for (let k = 0; k < pairs.length; k++) seen.add(key(dailyPair(pairs, D0 + k, avoid)!))
  for (const p of pairs) if (!avoid.has(p.a) && !avoid.has(p.b)) assert.ok(seen.has(key(p)), `${key(p)} never came`)
  const star = [{ a: '1', b: '2', best: 3 }, { a: '1', b: '3', best: 4 }, { a: '1', b: '4', best: 5 }]
  assert.equal(dailyPair(star, D0, new Set(['1'])), null)
  assert.deepEqual(dailyPair(star, D0, new Set(['9'])), dailyPair(star, D0))
})

/* ── The game ─────────────────────────────────────────────────────────── */

/** A small world: the route 10 - 11 - 12 - 13, a few side links, and sages (30, 31) who are linked to none of it. */
const EDGES = [['10', '11'], ['11', '12'], ['12', '13'], ['10', '20'], ['11', '21'], ['12', '22'], ['13', '23'], ['20', '21'], ['30', '31']]
const adj = new Map<string, Set<string>>()
for (const [x, y] of EDGES) {
  adj.set(x, (adj.get(x) ?? new Set()).add(y))
  adj.set(y, (adj.get(y) ?? new Set()).add(x))
}
const linked = (x: string, y: string) => adj.get(x)?.has(y) ?? false
const DAY: Pick<ChainDay, 'day' | 'a' | 'b'> & Pick<ChainDay, 'route'> = { day: D0 + 4, a: '10', b: '13', route: ['10', '11', '12', '13'] }
const fresh = (): ChainState => startChainDay(emptyChainState(), DAY.day, DAY.a)

/** Plays the ids in order; every move must be of the outcome given (default: any). */
function play(state: ChainState, ids: string[], day: typeof DAY = DAY): ChainState {
  let s = state
  for (const id of ids) s = applyMove(s, id, day, linked).state
  return s
}
const UNLINKED_FROM_A = ['12', '13', '21', '22', '23', '30', '31'] // none is linked to 10

console.log('\nthe game')

test('a new game is at A with nothing yet', () => {
  const s = fresh()
  assert.deepEqual(s.chain, ['10'])
  assert.deepEqual([s.misses, s.missed, s.moves, s.done, s.won], [0, [], '', false, false])
  assert.equal(chainSteps(s), 0)
})

test('a sage linked to the chain\'s end is appended (a hit); the state before is not touched', () => {
  const before = fresh()
  const r = applyMove(before, '11', DAY, linked)
  assert.equal(r.outcome, 'hit')
  assert.deepEqual(r.state.chain, ['10', '11'])
  assert.equal(r.state.moves, 'h')
  assert.equal(r.state.misses, 0)
  assert.equal(chainSteps(r.state), 1)
  assert.deepEqual(before.chain, ['10'])
  // the next must be linked to the new end, not to A: 20 is linked to 10 only
  assert.equal(applyMove(r.state, '20', DAY, linked).outcome, 'miss')
  assert.equal(applyMove(r.state, '12', DAY, linked).outcome, 'hit')
})

test('a sage who is not linked is a miss: counted, remembered, the chain unchanged', () => {
  const r = applyMove(fresh(), '21', DAY, linked)
  assert.equal(r.outcome, 'miss')
  assert.deepEqual([r.state.misses, r.state.missed, r.state.moves, r.state.chain, r.state.done], [1, ['21'], 'm', ['10'], false])
})

test('naming B before he is linked to the end is a miss, not a win', () => {
  const r = applyMove(fresh(), '13', DAY, linked)
  assert.equal(r.outcome, 'miss')
  assert.equal(r.state.won, false)
  assert.equal(r.state.done, false)
})

test('a sage already on the chain is refused, free; so is one who was a miss since the last hit', () => {
  let s = play(fresh(), ['21'])
  for (const id of ['10', '21']) {
    const r = applyMove(s, id, DAY, linked)
    assert.equal(r.outcome, 'refused', id)
    assert.equal(r.state, s, `${id} changed the state`)
  }
  s = play(s, ['11'])
  const r = applyMove(s, '11', DAY, linked)
  assert.equal(r.outcome, 'refused')
  assert.equal(r.state, s)
  assert.equal(s.misses, 1)
})

test('a hit forgets the misses: a sage who was not linked to the old end may be linked to the new one', () => {
  let s = play(fresh(), ['12']) // a miss at 10
  assert.deepEqual(s.missed, ['12'])
  s = play(s, ['11'])
  assert.deepEqual(s.missed, [])
  assert.equal(s.misses, 1, 'the miss still counts')
  assert.equal(applyMove(s, '12', DAY, linked).outcome, 'hit')
})

test('reaching B wins: done, won, the stats counted once, nothing more is accepted', () => {
  const s = play(fresh(), ['11', '12', '13'])
  assert.deepEqual([s.done, s.won, s.moves, s.chain], [true, true, 'hhh', ['10', '11', '12', '13']])
  assert.equal(chainSteps(s), 3)
  assert.deepEqual(s.stats, { played: 1, won: 1, streak: 1, maxStreak: 1, lastDay: DAY.day, lastWon: true })
  for (const id of ['20', '30', '10']) {
    const r = applyMove(s, id, DAY, linked)
    assert.equal(r.outcome, 'refused')
    assert.equal(r.state, s)
  }
  assert.equal(s.stats.played, 1)
})

test('the fifth miss loses (the fourth does not): done, not won, the stats counted once, the streak ends', () => {
  const four = play(fresh(), UNLINKED_FROM_A.slice(0, 4))
  assert.deepEqual([four.misses, four.done, four.won], [4, false, false])
  const s = play(four, [UNLINKED_FROM_A[4]])
  assert.deepEqual([s.misses, s.done, s.won, s.moves, s.chain], [5, true, false, 'mmmmm', ['10']])
  assert.deepEqual(s.stats, { played: 1, won: 0, streak: 0, maxStreak: 0, lastDay: DAY.day, lastWon: false })
  // not even the right sage is accepted once it is over
  const r = applyMove(s, '11', DAY, linked)
  assert.equal(r.outcome, 'refused')
  assert.equal(r.state, s)
})

test('a win with four misses is a win; the misses are in the moves, in order', () => {
  const s = play(fresh(), ['22', '23', '11', '30', '12', '31', '13'])
  assert.deepEqual([s.done, s.won, s.misses, s.moves], [true, true, 4, 'mmhmhmh'])
  assert.equal(chainSteps(s), 3)
  assert.equal(s.stats.won, 1)
})

test('a state of another day, or of another A, takes no moves (start the day first)', () => {
  const s = fresh()
  for (const day of [{ ...DAY, day: DAY.day + 1 }, { ...DAY, a: '20' }]) {
    const r = applyMove(s, '11', day, linked)
    assert.equal(r.outcome, 'refused')
    assert.equal(r.state, s)
  }
  assert.equal(applyMove(emptyChainState(), '11', DAY, linked).outcome, 'refused')
})

test('hints: nothing before the 2nd miss; his era from the 2nd, his field also from the 4th', () => {
  assert.deepEqual(chainHints(fresh(), DAY), [])
  const one = play(fresh(), UNLINKED_FROM_A.slice(0, 1))
  assert.deepEqual(chainHints(one, DAY), [])
  const two = play(fresh(), UNLINKED_FROM_A.slice(0, 2))
  assert.deepEqual(chainHints(two, DAY), [{ kind: 'era', id: '11' }])
  const three = play(fresh(), UNLINKED_FROM_A.slice(0, 3))
  assert.deepEqual(chainHints(three, DAY), [{ kind: 'era', id: '11' }])
  const four = play(fresh(), UNLINKED_FROM_A.slice(0, 4))
  assert.deepEqual(chainHints(four, DAY), [{ kind: 'era', id: '11' }, { kind: 'field', id: '11' }])
})

test('hints are about the next sage of the optimal route who is not yet on the chain, never A or B', () => {
  let s = play(fresh(), ['21', '22']) // two misses, at 10
  s = play(s, ['11']) // a hit, still on the route
  assert.deepEqual(chainHints(s, DAY), [{ kind: 'era', id: '12' }])
  s = play(s, ['12'])
  assert.deepEqual(chainHints(s, DAY), [], 'no sage between the chain\'s end and B is left')
  assert.deepEqual(chainHints(play(fresh(), UNLINKED_FROM_A.slice(0, 4)), { route: ['10', '13'] }), [])
  // a chain that left the route: the first route sage not on it is still the one
  const away = play(fresh(), ['22', '23', '20'])
  assert.deepEqual(away.chain, ['10', '20'])
  assert.deepEqual(chainHints(away, DAY), [{ kind: 'era', id: '11' }])
})

/* ── What the browser keeps ───────────────────────────────────────────── */

console.log('\nwhat the browser keeps')

test('anything unreadable is a browser that has not played', () => {
  for (const raw of [null, undefined, '', 'nope', '[]', '"x"', '{}', '{"day":-1}', '{"day":1.5}', '{"day":"3"}', 'null']) {
    assert.deepEqual(parseChainState(raw as string | null | undefined), emptyChainState(), String(raw))
  }
})

test('a finished game written and read back is the same game', () => {
  for (const ids of [['11', '12', '13'], ['22', '11', '30', '12', '13'], UNLINKED_FROM_A.slice(0, 5), ['21', '11']]) {
    const s = play(fresh(), ids)
    assert.deepEqual(parseChainState(JSON.stringify(s)), s, ids.join())
  }
})

test('a damaged state is repaired, never trusted', () => {
  const ok = JSON.parse(JSON.stringify(play(fresh(), ['21', '11'])))
  const fix = (patch: Record<string, unknown>) => parseChainState(JSON.stringify({ ...ok, ...patch }))
  // ids that are not ids, repeats, ids of a misses list that are on the chain
  assert.deepEqual(fix({ chain: ['10', 7, 'a b', 'x'.repeat(40), '11', '11', null, {}] }).chain, ['10', '11'])
  assert.deepEqual(fix({ missed: ['21', '10', '21', 'sp ace'] }).missed, ['21'])
  // too long a chain is cut
  const long = Array.from({ length: 900 }, (_, i) => String(1000 + i))
  assert.ok(fix({ chain: long, moves: 'h'.repeat(499) }).chain.length <= 500)
  // the moves are the record of the misses; where they disagree with the chain they are rebuilt from it; stray letters are dropped
  assert.deepEqual([fix({ moves: 'hhhhhh' }).moves, fix({ moves: 'hhhhhh' }).misses], ['h', 0])
  assert.equal(fix({ moves: 'x-m h' }).moves, 'mh')
  assert.deepEqual([fix({ moves: 'mmh' }).moves, fix({ moves: 'mmh' }).misses], ['mmh', 2])
  assert.deepEqual([fix({ moves: 'mmmmmmmmh' }).moves, fix({ moves: 'mmmmmmmmh' }).misses], ['h', 0], 'eight misses is absurd')
  assert.deepEqual([fix({ moves: 'mmmmmh' }).moves, fix({ moves: 'mmmmmh' }).done], ['mmmmmh', true], 'five is a lost game')
  assert.deepEqual([fix({ moves: undefined, misses: 3 }).moves, fix({ moves: undefined, misses: 3 }).misses], ['mmmh', 3])
  assert.equal(fix({ moves: undefined, misses: 99 }).misses, 0, 'an absurd count is zero')
  // a game that says it is over but is not
  assert.deepEqual([fix({ done: true }).done, fix({ done: true }).won], [false, false])
  // a win with nothing on the chain, or with five misses, is no win; five misses is over
  const onlyA = fix({ chain: ['10'], moves: 'm', won: true })
  assert.deepEqual([onlyA.won, onlyA.done], [false, false])
  const fiveAndWon = fix({ chain: ['10', '11'], moves: 'mmmmmh', won: true })
  assert.deepEqual([fiveAndWon.won, fiveAndWon.done, fiveAndWon.misses], [false, true, 5])
  assert.deepEqual([fix({ won: true }).won, fix({ won: true }).done], [true, true])
  // absurd counts are zero, the best streak is never below the current one, wins never above games played
  const stats = fix({ stats: { played: -4, won: 99, streak: 3, maxStreak: 1, lastDay: -2, lastWon: 'yes' } }).stats
  assert.deepEqual(stats, { played: 0, won: 0, streak: 3, maxStreak: 3, lastDay: null, lastWon: false })
  assert.deepEqual(fix({ stats: 'x' }).stats, emptyChainState().stats)
  assert.equal(fix({ stats: { played: 2, won: 9 } }).stats.won, 2)
})

test('the same day restores the game, a finished one stays finished; a new day starts a new game and keeps the stats', () => {
  const mid = play(fresh(), ['21', '11'])
  assert.equal(startChainDay(mid, DAY.day, DAY.a), mid)
  const won = play(fresh(), ['11', '12', '13'])
  assert.equal(startChainDay(won, DAY.day, DAY.a), won)
  assert.equal(startChainDay(parseChainState(JSON.stringify(won)), DAY.day, DAY.a).done, true)
  const next = startChainDay(won, DAY.day + 1, '30')
  assert.deepEqual([next.day, next.chain, next.misses, next.missed, next.moves, next.done, next.won], [DAY.day + 1, ['30'], 0, [], '', false, false])
  assert.deepEqual(next.stats, won.stats)
  // the day's pair changed (or the state is damaged): the same day starts over at the new A
  const changed = startChainDay(mid, DAY.day, '20')
  assert.deepEqual([changed.chain, changed.misses, changed.moves], [['20'], 0, ''])
  assert.deepEqual(changed.stats, mid.stats)
  // a browser that has played nothing
  assert.deepEqual(startChainDay(emptyChainState(), 77, '5').chain, ['5'])
  assert.equal(startChainDay(emptyChainState(), 77, '5').day, 77)
})

/** One finished game on `day`: the route when won, five misses when lost. */
function playDay(state: ChainState, day: number, win: boolean): ChainState {
  const d = { ...DAY, day }
  return play(startChainDay(state, day, d.a), win ? ['11', '12', '13'] : UNLINKED_FROM_A.slice(0, 5), d)
}

test('the streak: +1 for a win the day after a win; a skipped day or a loss ends it; the best is kept', () => {
  let s = playDay(emptyChainState(), 100, true)
  assert.equal(s.stats.streak, 1)
  s = playDay(s, 101, true)
  assert.deepEqual([s.stats.streak, s.stats.maxStreak], [2, 2])
  s = playDay(s, 102, true)
  assert.deepEqual([s.stats.streak, s.stats.maxStreak], [3, 3])
  s = playDay(s, 104, true) // a day skipped
  assert.deepEqual([s.stats.streak, s.stats.maxStreak], [1, 3])
  s = playDay(s, 105, false)
  assert.deepEqual([s.stats.streak, s.stats.maxStreak, s.stats.played, s.stats.won], [0, 3, 5, 4])
  s = playDay(s, 106, true) // the day after a loss
  assert.equal(s.stats.streak, 1)
})

test('currentChainStreak: alive today after yesterday\'s or today\'s win, gone after a skipped day or a loss', () => {
  let s = playDay(playDay(emptyChainState(), 100, true), 101, true)
  assert.equal(currentChainStreak(s.stats, 101), 2, 'the day itself')
  assert.equal(currentChainStreak(s.stats, 102), 2, 'the day after: not yet lost')
  assert.equal(currentChainStreak(s.stats, 103), 0, 'a day skipped')
  assert.equal(currentChainStreak(emptyChainState().stats, 5), 0)
  s = playDay(s, 102, false)
  assert.equal(currentChainStreak(s.stats, 102), 0)
  assert.equal(currentChainStreak(s.stats, 103), 0)
  assert.equal(s.stats.maxStreak, 2)
})

/* ── Share ────────────────────────────────────────────────────────────── */

console.log('\nthe shared result')

const URL_OF = (l: Locale) => `https://ozar.example/${l}/connect`

test('the text of the design: title, number, steps over the best, one row with an emoji per move, 🎯 on the winning hit, the link', () => {
  assert.equal(
    chainShareText({ locale: 'he', number: 3, url: URL_OF('he'), moves: 'hmhhh', won: true, best: 3 }),
    'שרשרת החכמים #3 🔗 4/3\n🟩⬜🟩🟩🎯\nhttps://ozar.example/he/connect',
  )
  assert.equal(
    chainShareText({ locale: 'en', number: 12, url: URL_OF('en'), moves: 'hhh', won: true, best: 3 }),
    'Sage Chain #12 🔗 3/3\n🟩🟩🎯\nhttps://ozar.example/en/connect',
  )
  assert.equal(
    chainShareText({ locale: 'ru', number: 1, url: URL_OF('ru'), moves: 'mmhmmm', won: false, best: 4 }),
    'Цепочка мудрецов #1 🔗 ✗/4\n⬜⬜🟩⬜⬜⬜\nhttps://ozar.example/ru/connect',
  )
})

test('a loss is ✗ and has no 🎯; before launch there is no number; other letters in the moves are ignored', () => {
  const lost = chainShareText({ locale: 'en', number: 2, url: 'u', moves: 'mmmmm', won: false, best: 5 })
  assert.equal(lost, 'Sage Chain #2 🔗 ✗/5\n⬜⬜⬜⬜⬜\nu')
  assert.ok(!lost.includes('🎯'))
  assert.equal(chainShareText({ locale: 'en', number: 0, url: 'u', moves: 'h', won: true, best: 3 }), 'Sage Chain 🔗 1/3\n🎯\nu')
  assert.equal(chainShareText({ locale: 'en', number: -4, url: 'u', moves: 'h', won: true, best: 3 }), 'Sage Chain 🔗 1/3\n🎯\nu')
  assert.equal(chainShareText({ locale: 'en', number: 1, url: 'u', moves: 'hxm-h', won: true, best: 3 }), 'Sage Chain #1 🔗 2/3\n🟩⬜🎯\nu')
})

test('a shared result holds nothing but the title, the number, the score, emoji and the link: no name, no id (200 days × 3 languages)', () => {
  const pairs = makePairs(250)
  for (const locale of LOCALES) {
    for (let k = 0; k < 200; k++) {
      const day = D0 + k
      const pair = dailyPair(pairs, day)!
      // a game played out in the world above, with the day's best taken from the pair
      const won = k % 3 !== 2
      const s = playDay(emptyChainState(), day, won)
      const url = URL_OF(locale)
      const text = chainShareText({ locale, number: chainNumber(day), url, moves: s.moves, won: s.won, best: pair.best })
      const [head, ...rest] = text.split('\n')
      assert.match(head, new RegExp(`^${CHAIN_TITLE[locale]} #${chainNumber(day)} 🔗 (?:\\d+|✗)/${pair.best}$`), head)
      assert.equal(rest.pop(), url)
      assert.equal(rest.length, 1, 'one row')
      assert.match(rest[0], /^(?:🟩|⬜|🎯)+$/u)
      assert.equal(s.won, won)
      assert.equal((rest[0].match(/🎯/gu) ?? []).length, won ? 1 : 0)
      assert.equal([...rest[0].matchAll(/🟩|⬜|🎯/gu)].length, s.moves.length)
      // none of the pair's ids, nor of the world's, are anywhere but in the number and the score
      const bare = text.replace(url, '').replace(CHAIN_TITLE[locale], '').replace(/#\d+/, '').replace(/(?:\d+|✗)\/\d+/, '').replace(/[🔗🟩⬜🎯✗\s]/gu, '')
      assert.equal(bare, '', `left over in "${text}"`)
    }
  }
})

/* ── The sources ──────────────────────────────────────────────────────── */

console.log('\nthe sources')

test('lib/chain.ts is pure and bundled for the browser: it imports no server module, no fs, and touches no storage', () => {
  const src = read('lib/chain.ts')
  const imports = [...src.matchAll(/^import .*? from '([^']+)'/gm)].map(m => m[1])
  assert.deepEqual([...new Set(imports)].sort(), ['./riddle', './today', './types'])
  assert.doesNotMatch(src, /localStorage|sessionStorage|document\.|window\.|node:|require\(|serverData|process\./)
})

test('SageCombobox: the riddle\'s field made controlled: a ranked search, a combobox with a listbox of 44 px options, the keys, the list above the field', () => {
  const src = read('components/connect/SageCombobox.tsx')
  assert.match(src, /^'use client'/)
  assert.match(src, /searchSagesRanked\(/)
  assert.match(src, /loadEnglishNames\(\)/)
  assert.match(src, /locale === 'he'/)
  assert.match(src, /role="combobox"/)
  assert.match(src, /role="listbox"/)
  assert.match(src, /role="option"/)
  assert.match(src, /min-h-\[44px\]/)
  assert.match(src, /ERA_LABELS/)
  for (const k of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape']) assert.match(src, new RegExp(`'${k}'`))
  assert.match(src, /visualViewport/)
  assert.match(src, /'bottom-full mb-1'/)
  // controlled: a pick reports the id, an edit after it reports null, a parent's value is followed
  assert.match(src, /onChange\(id\)/)
  assert.match(src, /report\(null\)/)
  assert.match(src, /value !== synced/)
  // the interface the other packages code against
  assert.match(src, /export interface ComboSage \{\s*id: string\s*name: string\s*\/\*\* Index in ALL_PERIODS\. \*\/\s*period: number\s*\}/)
  assert.match(src, /export function SageCombobox\(/)
  assert.doesNotMatch(src, /localStorage|sessionStorage/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
