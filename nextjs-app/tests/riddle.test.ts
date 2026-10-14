/**
 * The sage riddle (lib/riddle.ts, lib/riddleServer.ts, components/riddle/RiddleGame.tsx): the same sage for
 * every visitor on a day, changing at midnight in Israel and never the one the Today page features; at least
 * four clues in each language, vague to specific, none holding the answer's name; the feedback on a guess; a
 * shared result that does not give the sage away; the streak rules; the entry points and the analytics names.
 * Runs on the real corpus, with no network.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getAllSages } from '../lib/serverData'
import { getSefaria } from '../lib/sefaria'
import { wikiLinks } from '../lib/wikipedia'
import { localizeSage } from '../lib/serverDataTranslator'
import { dayNumber } from '../lib/today'
import { todayFeature } from '../lib/todayServer'
import { labelParts } from '../lib/displayName'
import { clipBio, riddleContext, riddleOn, riddlePayload, riddlePoolIds } from '../lib/riddleServer'
import {
  CLUE_ORDER, MAX_GUESSES, MIN_CLUES, MIN_FAME, RIDDLE_EPOCH, SHARE_TITLE, fameScore, applyGuess, buildLinkIndex, compareGuess, currentStreak, dateOfDay,
  emptyState, factsOf, formatCountdown, hasHebrew, maskName, nameVariants, nextRiddleAt, parseState, plainName, riddleClues, riddleIdOn,
  riddleNumber, shareRow, shareText, startDay, visibleClues,
  type GuessFeedback, type RiddleState,
} from '../lib/riddle'
import type { Locale, Sage } from '../lib/types'
import sitemap from '../app/sitemap'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const app = path.join(__dirname, '..')
const read = (rel: string) => fs.readFileSync(path.join(app, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const ctx = riddleContext()
const pool = riddlePoolIds()
const sage = (id: string): Sage => {
  const s = ctx.byId.get(id)
  assert.ok(s, `no sage ${id}`)
  return s
}
const at = (iso: string) => new Date(iso)

console.log(`\nthe pool: ${pool.length} sages`)

test('the pool is at least 100 sages and every member has what a riddle needs, fame included', () => {
  assert.ok(pool.length >= 100, `only ${pool.length}`)
  assert.equal(new Set(pool).size, pool.length)
  assert.deepEqual(pool, [...pool].sort((a, b) => Number(a) - Number(b)))
  for (const id of pool) {
    const s = sage(id)
    assert.ok(s.has_research, `${id} has no research paper`)
    assert.ok(s.location?.trim() && s.field?.trim() && s.core_concept?.trim(), `${id} lacks place, field or core idea`)
    assert.notEqual(localizeSage(s, 'en').label, s.label, `${id} has no English name`)
    assert.notEqual(localizeSage(s, 'ru').label, s.label, `${id} has no Russian name`)
    const { teachers, students, family } = ctx.links
    assert.ok(teachers.has(id) || students.has(id) || family.has(id), `${id} has no teacher, student or relative on the roster`)
    assert.ok(factsOf(s).regions !== 0, `${id}: his place maps to no region`)
    assert.ok(ctx.fame(id) >= MIN_FAME, `${id} (${s.label}): fame ${ctx.fame(id)} is below ${MIN_FAME}`)
  }
})

test('fame: links, plus 3 for a Hebrew article, 2 for an English one, plus one per Sefaria work up to 5', () => {
  assert.equal(MIN_FAME, 8)
  assert.equal(fameScore({ degree: 4, hebrewArticle: true, englishArticle: true, works: 2 }), 11)
  assert.equal(fameScore({ degree: 4, hebrewArticle: true, englishArticle: false, works: 9 }), 12)
  assert.equal(fameScore({ degree: 0, hebrewArticle: false, englishArticle: true, works: 0 }), 2)
  assert.equal(fameScore({ degree: 1, hebrewArticle: false, englishArticle: false, works: 0 }), 1)
  // the server's score is that formula over the real files: Wikipedia through wikiLinks, Sefaria's `total`
  const rashi = [...ctx.byId.values()].find(s => s.label === 'רש"י (רבי שלמה יצחקי)')!
  const w = wikiLinks(rashi.id, getSefaria(rashi.id))
  assert.equal(ctx.fame(rashi.id), fameScore({
    degree: ctx.links.degree.get(rashi.id) ?? 0, hebrewArticle: !!w.he, englishArticle: !!w.en, works: getSefaria(rashi.id)?.total ?? 0,
  }))
})

test('the well known are in the pool and the obscure are not (found by label, not by id)', () => {
  const byLabel = (label: string) => {
    const s = [...ctx.byId.values()].find(x => x.label === label)
    assert.ok(s, `no sage labelled ${label}`)
    return s.id
  }
  for (const label of ['רש"י (רבי שלמה יצחקי)', 'הרמב"ם', 'הרמב"ן (רבי משה בן נחמן)', 'רבי עקיבא בן יוסף']) {
    assert.ok(pool.includes(byLabel(label)), `${label} is not in the pool`)
  }
  for (const label of ['הרב אברהם כהן דה־הירירה', 'רבי יעקב בן חננאל סיקילי']) {
    assert.ok(!pool.includes(byLabel(label)), `${label} is in the pool`)
  }
})

console.log('\nthe day and the pick')

test('riddle #1 is 15 October 2026 in Israel, and the number counts days', () => {
  assert.equal(RIDDLE_EPOCH, dayNumber(at('2026-10-15T09:00:00Z')))
  assert.equal(riddleNumber(RIDDLE_EPOCH), 1)
  assert.equal(riddleNumber(RIDDLE_EPOCH + 11), 12)
  assert.equal(riddleNumber(RIDDLE_EPOCH - 1), 0)
  assert.equal(dayNumber(dateOfDay(RIDDLE_EPOCH + 40)), RIDDLE_EPOCH + 40)
})

test('the riddle is the same all day for every visitor and changes at midnight in Israel', () => {
  // 15 Oct 2026 in Israel is UTC+3: its midnight is 21:00 UTC the evening before
  const early = riddleOn(at('2026-10-14T21:00:01Z'))
  const late = riddleOn(at('2026-10-15T20:59:59Z'))
  assert.equal(early.number, 1)
  assert.equal(early.sage.id, late.sage.id)
  const next = riddleOn(at('2026-10-15T21:00:00Z'))
  assert.equal(next.number, 2)
  assert.notEqual(next.sage.id, early.sage.id)
  assert.ok(pool.includes(early.sage.id) && pool.includes(next.sage.id))
})

test('the countdown ends at the next Israeli midnight, also on a day a clock change makes 25 hours long', () => {
  assert.equal(new Date(nextRiddleAt(at('2026-10-15T09:00:00Z'))).toISOString().slice(0, 19), '2026-10-15T21:00:00')
  // Israel's summer time ends on Sunday 25 Oct 2026 (02:00 → 01:00): that day's midnight is at 22:00 UTC
  assert.equal(new Date(nextRiddleAt(at('2026-10-25T10:00:00Z'))).toISOString().slice(0, 19), '2026-10-25T22:00:00')
  assert.equal(formatCountdown(3_723_000), '01:02:03')
  assert.equal(formatCountdown(-5), '00:00:00')
})

test('the riddle is never the sage the Today page features that day (500 days), and every day has one', () => {
  for (let i = 0; i < 500; i++) {
    const day = RIDDLE_EPOCH + i
    const t = riddleOn(dateOfDay(day))
    assert.equal(t.day, day)
    assert.equal(t.featuredId, todayFeature(dateOfDay(day)).featured.id)
    assert.notEqual(t.sage.id, t.featuredId, `day ${day}: the riddle is the featured sage`)
  }
})

test('the walk visits every sage of the pool once a cycle; a clash with the Today page takes the next sage of the pool', () => {
  const seen = new Set(pool.map((_, k) => riddleIdOn(pool, RIDDLE_EPOCH + k)))
  assert.equal(seen.size, pool.length)
  assert.deepEqual([...seen].sort((a, b) => Number(a) - Number(b)), pool)
  // the same cycle again, later: same order
  assert.equal(riddleIdOn(pool, RIDDLE_EPOCH + 7), riddleIdOn(pool, RIDDLE_EPOCH + 7 + pool.length))
  const natural = riddleIdOn(pool, RIDDLE_EPOCH + 3)!
  const avoided = riddleIdOn(pool, RIDDLE_EPOCH + 3, natural)!
  assert.notEqual(avoided, natural)
  assert.equal(avoided, pool[(pool.indexOf(natural) + 1) % pool.length])
  assert.equal(riddleIdOn([], RIDDLE_EPOCH), null)
  assert.equal(riddleIdOn(['5'], RIDDLE_EPOCH, '5'), '5')
})

test('over three years the pick differs from the walk only on the days it avoids the Today page', () => {
  let clashes = 0
  for (let i = 0; i < 1100; i++) {
    const day = RIDDLE_EPOCH + i
    const t = riddleOn(dateOfDay(day))
    const natural = riddleIdOn(pool, day)
    if (natural === t.featuredId) {
      clashes++
      assert.notEqual(t.sage.id, natural)
    } else {
      assert.equal(t.sage.id, natural)
    }
  }
  console.log(`       (${clashes} clashes with the Today page in 1100 days, all avoided)`)
})

console.log('\nthe clues')

test('every pool sage has at least four clues in each language, in the order of the design, none longer than six', () => {
  for (const id of pool) {
    for (const l of LOCALES) {
      const kinds = riddleClues(sage(id), ctx, l).map(c => c.kind)
      assert.ok(kinds.length >= MIN_CLUES && kinds.length <= 6, `${id}/${l}: ${kinds.length} clues`)
      const ranks = kinds.map(k => CLUE_ORDER.indexOf(k))
      assert.ok(ranks.every(r => r >= 0), `${id}/${l}: unknown kind in ${kinds}`)
      assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), `${id}/${l}: out of order: ${kinds}`)
      assert.equal(new Set(kinds).size, kinds.length, `${id}/${l}: a kind twice`)
      assert.equal(kinds[0], 'era', `${id}/${l}: the first clue is the era`)
    }
  }
})

const norm = (s: string) => s.replace(/[״”“]/g, '"').replace(/[׳’]/g, "'").toLowerCase()
/** A name is in the text as a substring, or, if it is short (it would sit inside other words), as a whole word. */
const mentions = (text: string, name: string) => {
  const n = norm(name).trim(), t = norm(text)
  if (n.length < 3) return false
  return n.length >= 4 ? t.includes(n) : new RegExp(`(?<![\\p{L}\\p{M}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{M}])`, 'u').test(t)
}

test('no clue holds the answer\'s name: the Hebrew label, the name without its subtitle, the language\'s label, the English name (whole pool × 3 languages)', () => {
  for (const id of pool) {
    const s = sage(id)
    for (const l of LOCALES) {
      const shown = localizeSage(s, l)
      const names = [s.label, labelParts(s.label).name, plainName(s.label), shown.label, labelParts(shown.label).name, plainName(shown.label), s.name_en ?? '']
      for (const c of riddleClues(s, ctx, l)) {
        for (const n of names) assert.ok(!mentions(c.text, n), `${id}/${l}/${c.kind}: "${c.text}" holds "${n}"`)
        // every written form the clue builder hides, too; the era is one of eleven fixed labels ("Amoraim" holds the "Amora" of "Shmuel (the Amora)")
        if (c.kind !== 'era') for (const v of nameVariants(s, shown)) assert.ok(!mentions(c.text, v), `${id}/${l}/${c.kind}: "${c.text}" holds the variant "${v}"`)
      }
    }
  }
})

test('the English and Russian clues are in their language, not Hebrew', () => {
  for (const id of pool) for (const l of ['en', 'ru'] as const) {
    for (const c of riddleClues(sage(id), ctx, l)) assert.ok(!hasHebrew(`${c.label} ${c.text}`), `${id}/${l}/${c.kind}: Hebrew in "${c.text}"`)
  }
})

test('the core idea has the name replaced by …: quotes written either way, bracketed forms, titles, the article, Russian endings', () => {
  const v = nameVariants({ id: 'x', label: 'הרמב"ם', period: 'rishonim' } as Sage)
  assert.equal(maskName('הרמב״ם כתב את משנה תורה, ואצל הרמב"ם הדין ברור.', v, 'he'), '… כתב את משנה תורה, ואצל … הדין ברור.')
  assert.equal(maskName('בשם רמב״ם ובשם הרמבם', v, 'he'), 'בשם … ובשם הרמבם', 'only the written forms of the name')
  const rashi = nameVariants({ id: 'y', label: 'רש"י (רבי שלמה יצחקי)', period: 'rishonim' } as Sage)
  assert.equal(maskName('רש״י (רבי שלמה יצחקי) פירש. רבי שלמה יצחקי חי בטרואה.', rashi, 'he'), '… פירש. … חי בטרואה.')
  const en = nameVariants({ id: 'z', label: 'הרב קוק', period: 'modern' } as Sage, { id: 'z', label: 'Rabbi Kook (Rav Kook)', period: 'modern' } as Sage)
  assert.equal(maskName('Rav Kook taught that Rabbi Kook’s Torah is broad.', en, 'en'), '… taught that …’s Torah is broad.')
  const ru = nameVariants({ id: 'w', label: 'הרמב"ם', period: 'rishonim' } as Sage, { id: 'w', label: 'Рамбам', period: 'rishonim' } as Sage)
  assert.equal(maskName('Рамбам и Рамбама, о Рамбаме.', ru, 'ru'), '… и …, о ….')
  assert.equal(maskName('רבא אמר, ורבאי לא', ['רבא'], 'he'), '… אמר, ורבאי לא', 'a three-letter name is a whole word')
  // a real one: a core idea of the corpus that holds its sage's name now shows "…" in its place
  const masked = pool.flatMap(id => LOCALES.map(l => riddleClues(sage(id), ctx, l).find(c => c.kind === 'concept')?.text ?? '')).filter(t => t.includes('…'))
  assert.ok(masked.length >= 3, `only ${masked.length} masked core ideas in the corpus`)
})

test('the related clue follows the direction of the link: a teacher is the source of `teacher` and the target of `student`', () => {
  const idx = buildLinkIndex([
    { source: 'a', target: 'b', type: 'teacher' }, { source: 'c', target: 'd', type: 'student' },
    { source: 'e', target: 'f', type: 'family' }, { source: 'g', target: 'h', type: 'colleague' }, { source: 'i', target: 'j', type: 'influence' },
    { source: 'a', target: 'zz', type: 'teacher' },
  ], new Set('abcdefghij'.split('')))
  assert.deepEqual([...(idx.teachers.get('b') ?? [])], ['a'])
  assert.deepEqual([...(idx.students.get('a') ?? [])], ['b'])
  assert.deepEqual([...(idx.teachers.get('c') ?? [])], ['d'])
  assert.deepEqual([...(idx.students.get('d') ?? [])], ['c'])
  assert.ok(idx.family.get('e')?.has('f') && idx.family.get('f')?.has('e'))
  assert.ok(idx.linked.get('g')?.has('h') && !idx.linked.has('i'), 'colleague counts as linked; influence does not')
  assert.ok(!idx.linked.get('a')?.has('zz'), 'a sage off the roster is not linked')
  // in the corpus: the sage named by a "teacher" clue is one of his teachers, a "student" clue one of his students
  for (const id of pool) {
    const s = sage(id)
    const named = (set?: Set<string>) => new Set([...(set ?? [])].map(o => plainName(ctx.byId.get(o)!.label)))
    const clue = riddleClues(s, ctx, 'he').find(c => c.kind === 'related')
    if (!clue) continue
    const [teach, stud, fam] = [named(ctx.links.teachers.get(id)), named(ctx.links.students.get(id)), named(ctx.links.family.get(id))]
    if (clue.label.startsWith('מרבות')) assert.ok(teach.has(clue.text), `${id}: ${clue.text} is not his teacher`)
    else if (clue.label.startsWith('מתלמיד')) assert.ok(stud.has(clue.text), `${id}: ${clue.text} is not his student`)
    else assert.ok(fam.has(clue.text), `${id}: ${clue.text} is not family`)
  }
})

test('visibleClues: one at the start, one more per guess, all of them once the game is over', () => {
  assert.equal(visibleClues(6, 0, false), 1)
  assert.equal(visibleClues(6, 3, false), 4)
  assert.equal(visibleClues(6, 5, false), 6)
  assert.equal(visibleClues(5, 5, false), 5)
  assert.equal(visibleClues(6, 2, true), 6)
})

console.log('\nthe feedback on a guess')

const f = (id: string) => factsOf(sage(id))
const linkedTo = (id: string) => ctx.links.linked.get(id) ?? new Set<string>()
const LABELS: Record<string, string> = { '594': 'רש"י', '41': 'הרמב"ם', '391': 'רב מימון', '583': 'רבי יצחק הלוי', '12': 'בחיי', '486': 'יונה', '202': 'עקיבא איגר', '4': 'עקיבא', '102': 'החת"ם' }
test('the sages the cases below are about are still those sages (ids drift, names do not)', () => {
  for (const [id, part] of Object.entries(LABELS)) assert.ok(sage(id).label.includes(part), `${id} is now ${sage(id).label}`)
})

test('Rashi (594) and the Rambam (41): the Rambam lived later, in another region, and they are not linked', () => {
  assert.deepEqual(compareGuess(f('594'), f('41'), linkedTo('41')), { era: 'later', region: 'other', linked: false })
  assert.deepEqual(compareGuess(f('41'), f('594'), linkedTo('594')), { era: 'earlier', region: 'other', linked: false })
})

test('the same period and the same region, within 50 years, is "same" on both', () => {
  assert.deepEqual(compareGuess(f('12'), f('486'), linkedTo('486')), { era: 'same', region: 'same', linked: false })
  assert.deepEqual(compareGuess(f('391'), f('41'), linkedTo('41')), { era: 'same', region: 'same', linked: true })
})

test('a different period decides the era; in one period more than 50 years apart decides it, fewer does not', () => {
  assert.equal(compareGuess(f('4'), f('41'), new Set()).era, 'later')
  assert.equal(compareGuess(f('41'), f('4'), new Set()).era, 'earlier')
  const mk = (id: string, period: number, year: number | null): ReturnType<typeof f> => ({ id, period, regions: 1, year })
  assert.equal(compareGuess(mk('a', 8, 1100), mk('b', 8, 1151), new Set()).era, 'later')
  assert.equal(compareGuess(mk('a', 8, 1100), mk('b', 8, 1150), new Set()).era, 'same')
  assert.equal(compareGuess(mk('a', 8, 1151), mk('b', 8, 1100), new Set()).era, 'earlier')
  assert.equal(compareGuess(mk('a', 8, null), mk('b', 8, 1500), new Set()).era, 'same', 'an undated sage: the period decides')
})

test('the teacher and the student of a pair are linked either way round; a place that maps to no region is "unknown", not "other"', () => {
  assert.equal(compareGuess(f('583'), f('594'), linkedTo('594')).linked, true)
  assert.equal(compareGuess(f('594'), f('583'), linkedTo('583')).linked, true)
  assert.equal(compareGuess(f('202'), f('102'), new Set()).region, 'unknown')
  assert.equal(compareGuess(f('102'), f('202'), new Set()).region, 'unknown')
})

console.log('\nthe result to share')

const fb = (era: GuessFeedback['era'], region: GuessFeedback['region'], linked = false): GuessFeedback => ({ era, region, linked })
const URL_HE = 'https://example.org/he/riddle'

test('shareText has the format of the design: title, number, score, one row per guess, 🎯 on the win, the link', () => {
  const text = shareText({
    locale: 'he', number: 12, url: URL_HE, won: true,
    feedback: [fb('earlier', 'other'), fb('same', 'same', true), fb('later', 'same'), fb('same', 'same')],
  })
  assert.equal(text, ['חידת החכם #12 🧩 4/6', '🔽⬜', '🟩🟩🔥', '🔼🟩', '🎯', URL_HE].join('\n'))
})

test('a loss is X/6 with six rows and no 🎯; a first-guess win is 1/6; before launch there is no number', () => {
  const six = Array.from({ length: 6 }, () => fb('later', 'unknown'))
  const lost = shareText({ locale: 'en', number: 3, url: 'u', won: false, feedback: six })
  assert.equal(lost.split('\n')[0], 'Sage Riddle #3 🧩 X/6')
  assert.equal(lost.split('\n').length, 1 + 6 + 1)
  assert.ok(!lost.includes('🎯'))
  assert.equal(shareText({ locale: 'ru', number: 1, url: 'u', won: true, feedback: [fb('same', 'same')] }), 'Загадка мудреца #1 🧩 1/6\n🎯\nu')
  assert.equal(shareText({ locale: 'he', number: 0, url: 'u', won: false, feedback: six }).split('\n')[0], 'חידת החכם 🧩 X/6')
  assert.equal(shareRow(fb('same', 'unknown', true)), '🟩⬜🔥')
})

test('a shared result holds nothing but the title, the number, the score, emoji and the link: no name, no id (whole pool × 3 languages)', () => {
  for (const l of LOCALES) {
    const shape = new RegExp(`^${SHARE_TITLE[l]} #\\d+ 🧩 [1-6X]/6\\n(?:(?:[🟩🔼🔽][🟩⬜]🔥?|🎯)\\n)+https://example\\.org/${l}/riddle$`, 'u')
    for (const id of pool) {
      const answer = f(id)
      // a game against the answer: guess the sages in the order of the roster until the sixth or the answer
      const guesses = [...ctx.byId.keys()].filter(g => g !== id).slice(0, 6)
      for (const win of [true, false]) {
        const seq = win ? [...guesses.slice(0, 2), id] : guesses
        const feedback = seq.map(g => compareGuess(factsOf(sage(g)), answer, linkedTo(id)))
        const text = shareText({ locale: l, number: 7, url: `https://example.org/${l}/riddle`, won: win, feedback })
        assert.match(text, shape, `${id}/${l}:\n${text}`)
        for (const n of [sage(id).label, plainName(sage(id).label), plainName(localizeSage(sage(id), l).label)]) assert.ok(!mentions(text, n), `${id}: "${n}" in the result`)
      }
    }
  }
})

console.log('\nwhat the browser keeps')

const D = RIDDLE_EPOCH + 10
/** A finished game on `day`: won on the third guess, or lost. */
function play(state: RiddleState, day: number, win: boolean): RiddleState {
  let s = startDay(state, day)
  const wrong = win ? 2 : 6
  for (let i = 0; i < wrong; i++) s = applyGuess(s, `w${i}`, 'answer')
  return win ? applyGuess(s, 'answer', 'answer') : s
}

test('anything unreadable is a browser that has not played', () => {
  const fresh = emptyState()
  for (const raw of [null, undefined, '', 'garbage', '{', '[]', '{}', 'null', '5', '"x"', '{"day":"x"}', '{"day":-3}', '{"day":1.5}', '{"guesses":["a"]}']) {
    assert.deepEqual(parseState(raw as string), fresh, `raw: ${String(raw)}`)
  }
})

test('a damaged state is repaired, never trusted: bad guesses, too many guesses, absurd counts, a win with no guess', () => {
  const s = parseState(JSON.stringify({
    day: D, guesses: ['1', 1, '1', '<script>', '2', '3', '4', '5', '6', '7', '8'], done: false, won: true,
    stats: { played: 3, won: 9, streak: -4, maxStreak: 'x', dist: [1, 'q', 2], lastDay: 'y', lastWon: 1 },
  }))
  assert.deepEqual(s.guesses, ['1', '2', '3', '4', '5', '6'])
  assert.ok(s.done, 'six guesses end the game')
  assert.equal(s.stats.won, 3, 'wins cannot exceed games played')
  assert.equal(s.stats.streak, 0)
  assert.deepEqual(s.stats.dist, [1, 0, 2, 0, 0, 0])
  assert.equal(s.stats.lastDay, null)
  assert.equal(s.stats.lastWon, false)
  assert.equal(parseState(JSON.stringify({ day: D, guesses: [], won: true })).won, false)
})

test('the same day restores the game, a finished game stays finished, and a new day starts a new game with the stats kept', () => {
  let s = startDay(emptyState(), D)
  s = applyGuess(s, '10', '99')
  s = applyGuess(s, '11', '99')
  const restored = startDay(parseState(JSON.stringify(s)), D)
  assert.deepEqual(restored, s)
  assert.ok(!restored.done)
  const over = play(emptyState(), D, true)
  assert.ok(over.done && over.won && over.guesses.length === 3)
  const again = startDay(parseState(JSON.stringify(over)), D)
  assert.deepEqual(again, over)
  assert.equal(applyGuess(again, 'zzz', 'answer'), again, 'no more guesses after the end')
  const tomorrow = startDay(parseState(JSON.stringify(over)), D + 1)
  assert.deepEqual([tomorrow.day, tomorrow.guesses, tomorrow.done, tomorrow.won], [D + 1, [], false, false])
  assert.deepEqual(tomorrow.stats, over.stats)
})

test('a guess is counted once; the game ends on the right sage or on the sixth guess', () => {
  let s = startDay(emptyState(), D)
  s = applyGuess(s, 'a', 'x')
  assert.equal(applyGuess(s, 'a', 'x'), s, 'the same sage twice changes nothing')
  for (const g of ['b', 'c', 'd', 'e']) s = applyGuess(s, g, 'x')
  assert.ok(!s.done && s.guesses.length === 5)
  const lost = applyGuess(s, 'f', 'x')
  assert.ok(lost.done && !lost.won && lost.guesses.length === MAX_GUESSES)
  assert.deepEqual([lost.stats.played, lost.stats.won, lost.stats.streak], [1, 0, 0])
  const won = applyGuess(s, 'x', 'x')
  assert.ok(won.done && won.won)
  assert.deepEqual(won.stats.dist, [0, 0, 0, 0, 0, 1])
})

test('the streak: +1 for a win the day after a win; a skipped day or a loss ends it; the best is kept; the distribution counts the guesses', () => {
  let s = play(emptyState(), D, true)
  assert.deepEqual([s.stats.streak, s.stats.maxStreak, s.stats.played, s.stats.won], [1, 1, 1, 1])
  assert.deepEqual(s.stats.dist, [0, 0, 1, 0, 0, 0])
  s = play(s, D + 1, true)
  s = play(s, D + 2, true)
  assert.deepEqual([s.stats.streak, s.stats.maxStreak], [3, 3])
  assert.equal(currentStreak(s.stats, D + 2), 3)
  assert.equal(currentStreak(s.stats, D + 3), 3, 'opening the next morning: still alive until it is played')
  assert.equal(currentStreak(s.stats, D + 4), 0, 'a day skipped: gone')
  const skipped = play(s, D + 4, true)
  assert.deepEqual([skipped.stats.streak, skipped.stats.maxStreak], [1, 3])
  const lost = play(s, D + 3, false)
  assert.deepEqual([lost.stats.streak, lost.stats.maxStreak, lost.stats.played, lost.stats.won], [0, 3, 4, 3])
  assert.equal(currentStreak(lost.stats, D + 3), 0)
  const afterLoss = play(lost, D + 4, true)
  assert.equal(afterLoss.stats.streak, 1, 'a win after a loss starts again at 1')
  const sameDayAgain = parseState(JSON.stringify(afterLoss))
  assert.deepEqual(sameDayAgain.stats, afterLoss.stats)
})

test('the page and the game: storage is read and written inside try, so a blocked storage only means no record', () => {
  const src = read('components/riddle/RiddleGame.tsx')
  assert.match(src, /try \{ raw = window\.localStorage\.getItem\(STORE_KEY\) \} catch/)
  assert.match(src, /try \{ window\.localStorage\.setItem\(STORE_KEY, JSON\.stringify\(next\)\) \} catch/)
  assert.match(src, /^'use client'/)
  assert.match(read('lib/riddle.ts'), /ozar-riddle/)
})

console.log('\nwhat the page hands the game')

test('the payload: the same answer in every language, a small candidate list with no bios, the card for the end screen', () => {
  const payloads = LOCALES.map(l => riddlePayload(l, at('2026-10-15T09:00:00Z')))
  assert.equal(new Set(payloads.map(p => p.answer)).size, 1)
  assert.ok(payloads.every(p => p.number === 1 && p.day === RIDDLE_EPOCH))
  const roster = getAllSages().length
  for (const [i, p] of payloads.entries()) {
    assert.equal(p.candidates.length, roster)
    assert.ok(p.candidates.some(c => c.id === p.answer))
    assert.ok(p.clues.length >= MIN_CLUES)
    assert.equal(p.candidates.filter(c => c.linked).length, linkedTo(p.answer).size)
    assert.ok(p.candidates.every(c => c.name && !('bio' in c)))
    const bytes = Buffer.byteLength(JSON.stringify(p))
    assert.ok(bytes < 60_000, `${LOCALES[i]}: ${bytes} bytes`)
    assert.equal(p.card.id, p.answer)
    assert.equal(p.card.sageHref, `/${LOCALES[i]}/sage/${p.answer}`)
    assert.equal(p.card.towerHref, `/${LOCALES[i]}/tower/${p.answer}`)
    assert.ok(p.card.quizHref === null || p.card.quizHref === `/${LOCALES[i]}/sage/${p.answer}#quiz`)
  }
  console.log(`       (he ${Buffer.byteLength(JSON.stringify(payloads[0]))} bytes)`)
})

test('the end screen\'s bio keeps whole sentences when it must be cut, and a short bio as it is', () => {
  const two = 'First sentence is here. Second sentence goes on and on and on and on and on and on and on and on and on.'
  assert.equal(clipBio(two, 40), 'First sentence is here.')
  assert.equal(clipBio('Short. Bio.', 100), 'Short. Bio.')
  const noStop = 'word '.repeat(80)
  assert.ok(clipBio(noStop, 60).endsWith('…') && clipBio(noStop, 60).length <= 60)
  for (const l of LOCALES) assert.ok(riddlePayload(l, at('2026-10-15T09:00:00Z')).card.bio.length <= 260)
})

test('an English or Russian name is shown in its language in the candidate list', () => {
  const en = riddlePayload('en', at('2026-10-15T09:00:00Z')).candidates
  const ru = riddlePayload('ru', at('2026-10-15T09:00:00Z')).candidates
  assert.ok(en.filter(c => hasHebrew(c.name)).length === 0)
  assert.ok(ru.filter(c => hasHebrew(c.name)).length === 0)
})

console.log('\nentry points and measurement')

test('the header has 🧩 on the desktop and in the mobile menu, both to /{locale}/riddle; the Today page links to it', () => {
  const header = read('components/layout/Header.tsx')
  assert.equal((header.match(/href=\{`\/\$\{locale\}\/riddle`\}/g) ?? []).length, 2)
  assert.equal((header.match(/🧩/g) ?? []).length, 2)
  assert.match(header, /href=\{`\/\$\{locale\}\/riddle`\} className=\{cn\(pill, 'hidden md:grid/, 'the desktop icon: from 768px, where the header row has room')
  assert.match(header, /RIDDLE_LABEL/)
  assert.match(header, /RIDDLE_MENU/)
  const today = read('app/[locale]/today/page.tsx')
  assert.match(today, /<a\s+href=\{`\/\$\{loc\}\/riddle`\}/, 'a plain <a>: a <Link> would prefetch the riddle payload for every visitor of the Today page')
  assert.doesNotMatch(today, /<Link\s+href=\{`\/\$\{loc\}\/riddle`\}/)
})

test('the sitemap lists /riddle in he, en and ru', () => {
  const urls = sitemap().map(e => e.url)
  for (const l of LOCALES) assert.ok(urls.some(u => u.endsWith(`/${l}/riddle`)), `no /${l}/riddle`)
})

test('the page is rebuilt every half hour, is valid only for the three languages, and is not hidden from search', () => {
  const page = read('app/[locale]/riddle/page.tsx')
  assert.match(page, /export const revalidate = 1800/)
  assert.match(page, /if \(!isValidLocale\(locale\)\) notFound\(\)/)
  assert.match(page, /path: '\/riddle'/)
  assert.doesNotMatch(page, /noindex|robots/)
  assert.match(page, /<SiteTopBar locale=\{loc\} path="\/riddle" \/>/)
})

test('the direction chips are neutral: "Later" / "Earlier" say nothing false across eras or within one, and name no gender', () => {
  const game = read('components/riddle/RiddleGame.tsx')
  assert.match(game, /eraLater: \{ he: 'מאוחר יותר', en: 'Later', ru: 'Позже' \}/)
  assert.match(game, /eraEarlier: \{ he: 'מוקדם יותר', en: 'Earlier', ru: 'Раньше' \}/)
  assert.match(game, /eraSame: \{ he: 'אותה תקופה', en: 'Same era', ru: 'Та же эпоха' \}/)
  // and the how-to says the rule the chip follows: another era, or more than 50 years apart within one
  assert.match(game, /50 years apart within the same era/)
  assert.match(game, /יותר מ־50 שנה באותה תקופה/)
  assert.match(game, /более 50 лет в той же эпохе/)
  assert.doesNotMatch(game, /lived in a later|תקופה מאוחרת יותר|Эпоха позже/)
})

test('the new analytics names are in AnalyticsEvent and their properties carry no name, id or guess', () => {
  const analytics = read('lib/analytics.ts')
  for (const name of ['riddle_start', 'riddle_complete', 'riddle_share']) assert.match(analytics, new RegExp(`\\| '${name}'`))
  const game = read('components/riddle/RiddleGame.tsx')
  const calls = [...game.matchAll(/track\('(riddle_\w+)', (\{[^}]*\})\)/g)]
  assert.deepEqual(calls.map(m => m[1]).sort(), ['riddle_complete', 'riddle_share', 'riddle_share', 'riddle_share', 'riddle_start'])
  const allowed = new Set(['locale', 'won', 'tries', 'method'])
  for (const m of calls) {
    const keys = [...m[2].matchAll(/[{,]\s*(\w+)\s*(?=[:,}])/g)].map(k => k[1])
    assert.ok(keys.length > 0)
    for (const k of keys) assert.ok(allowed.has(k), `${m[1]} carries "${k}"`)
    assert.doesNotMatch(m[2], /payload|card|answer|query|\.id\b|name/)
  }
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
