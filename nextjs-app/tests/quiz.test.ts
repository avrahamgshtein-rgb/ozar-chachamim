/**
 * The sage quiz: every quiz file keeps the rules (20 questions, 2 to 4 options, a real correct answer,
 * 100 points in all), the index matches the files, and each file still belongs to the sage it was
 * written for. Quiz files are per-id side files, so an id that moves to another sage would quietly
 * put one sage's questions on another's page; the label check is what catches that.
 * Imports the real production modules.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import graph from '../public/data.json'
import supplement from '../public/data-supplement.json'
import supplement2 from '../public/data-supplement-2.json'
import ancient from '../public/data-ancient.json'
import {
  QUIZ_LENGTH, QUIZ_TOTAL_POINTS, hasQuiz, isTrueFalse, quizIndexEntries, quizUrl, scoreQuiz,
  shuffleForPlay, starsFor, validateQuiz, type QuizFile, type QuizQuestion,
} from '../lib/quiz'
import { passportTotals } from '../lib/quizProgress'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok  ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL ${name}`)
    console.log(`       ${(e as Error).message}`)
    failed++
  }
}

const dir = path.join(__dirname, '..', 'public', 'quiz')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as QuizFile
// The roster the site shows: data.json first, then the supplements it merges (as scripts/build_quiz.py reads it)
const labels = new Map<string, string>()
for (const set of [graph, supplement, supplement2, ancient] as unknown as Array<{ nodes?: Array<{ id: string | number; label: string }> }>) {
  for (const n of set.nodes ?? []) if (!labels.has(String(n.id))) labels.set(String(n.id), n.label)
}
const TF: Record<string, string[]> = { he: ['נכון', 'לא נכון'], en: ['True', 'False'], ru: ['Верно', 'Неверно'] }
const langOf = (f: string) => /\.(en|ru)\.json$/.exec(f)?.[1] ?? 'he'
const idOf = (f: string) => f.replace(/(\.(en|ru))?\.json$/, '')

test('there are quiz files, and the index lists exactly them', () => {
  assert.ok(files.length > 0)
  const listed = quizIndexEntries().flatMap(([id, e]) => e.langs.map(l => (l === 'he' ? `${id}.json` : `${id}.${l}.json`)))
  assert.deepEqual([...listed].sort(), [...files].sort())
})

test('every quiz file keeps the rules', () => {
  for (const f of files) assert.deepEqual(validateQuiz(read(f)), [], f)
})

test('every quiz belongs to the sage its id names now', () => {
  for (const f of files) {
    const id = idOf(f)
    assert.ok(labels.has(id), `${f}: id ${id} is not in the roster`)
    assert.equal(read(f).label, labels.get(id), `${f} was written for another sage`)
  }
})

test('true/false questions offer exactly "true", "false" in the quiz language', () => {
  for (const f of files) {
    for (const q of read(f).questions.filter(isTrueFalse)) assert.deepEqual(q.options, TF[langOf(f)], `${f}: ${q.question}`)
  }
})

test('a quiz of 20 is mostly multiple choice, with some true/false', () => {
  for (const f of files) {
    const qs = read(f).questions
    const tf = qs.filter(isTrueFalse).length
    assert.ok(tf >= 3 && tf <= 10, `${f}: ${tf} true/false questions`)
  }
})

test('the right answer is not always in the same place', () => {
  for (const f of files) {
    const positions = read(f).questions.filter(q => !isTrueFalse(q)).map(q => q.correctIndex)
    const most = Math.max(...[0, 1, 2, 3].map(i => positions.filter(p => p === i).length))
    assert.ok(most <= positions.length / 2, `${f}: one position holds ${most} of ${positions.length} answers`)
  }
})

test('hasQuiz and quizUrl follow the index, one language at a time', () => {
  const [id, entry] = quizIndexEntries()[0]
  assert.equal(hasQuiz(id, entry.langs[0]), true)
  assert.equal(hasQuiz('no-such-sage', 'he'), false)
  assert.equal(quizUrl('41', 'he'), '/quiz/41.json')
  assert.equal(quizUrl('41', 'ru'), '/quiz/41.ru.json')
  for (const l of ['he', 'en', 'ru'] as const) {
    if (!entry.langs.includes(l)) assert.equal(hasQuiz(id, l), false, `no ${l} quiz, so none is shown`)
  }
})

// ── Scoring and stars ─────────────────────────────────────────────────────────

const sample: QuizQuestion[] = Array.from({ length: QUIZ_LENGTH }, (_, i) => ({
  question: `q${i}`,
  options: i < 6 ? ['נכון', 'לא נכון'] : ['a', 'b', 'c', 'd'],
  correctIndex: i < 6 ? i % 2 : i % 4,
  explanation: 'e',
  points: i < 6 ? 3 : i < 16 ? 5 : 8,
}))

test('the score is the points of the questions answered correctly', () => {
  assert.equal(sample.reduce((s, q) => s + q.points, 0), QUIZ_TOTAL_POINTS)
  assert.equal(scoreQuiz(sample, sample.map(q => q.correctIndex)), 100)
  assert.equal(scoreQuiz(sample, sample.map(() => null)), 0)
  const allButHard = sample.map((q, i) => (i >= 16 ? (q.correctIndex + 1) % 4 : q.correctIndex))
  assert.equal(scoreQuiz(sample, allButHard), 68)
})

test('stars: 0 below 50, 1 from 50, 2 from 75, 3 from 90', () => {
  assert.deepEqual([0, 49, 50, 74, 75, 89, 90, 100].map(starsFor), [0, 0, 1, 1, 2, 2, 3, 3])
})

test('shuffling moves the options of a multiple-choice question, never the right answer', () => {
  let seed = 7
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const played = shuffleForPlay(sample, random)
  let moved = 0
  played.forEach((q, i) => {
    assert.equal(q.options[q.correctIndex], sample[i].options[sample[i].correctIndex], `question ${i}`)
    assert.deepEqual([...q.options].sort(), [...sample[i].options].sort())
    if (q.options.join() !== sample[i].options.join()) moved++
  })
  assert.ok(moved > 0, 'some options moved')
  played.filter(isTrueFalse).forEach((q, i) => assert.deepEqual(q.options, sample[i].options, 'true/false keeps its order'))
})

test('the validator catches what would break a game', () => {
  const ok: QuizFile = { label: 'x', questions: sample }
  assert.deepEqual(validateQuiz(ok), [])
  const bad = (change: (q: QuizQuestion[]) => void) => {
    const qs = sample.map(q => ({ ...q, options: [...q.options] }))
    change(qs)
    return validateQuiz({ label: 'x', questions: qs })
  }
  assert.ok(bad(qs => { qs[0].points = 4 }).some(e => e.includes('add up to')))
  assert.ok(bad(qs => { qs[7].correctIndex = 4 }).some(e => e.includes('correctIndex')))
  assert.ok(bad(qs => { qs[7].options.push('e') }).some(e => e.includes('options')))
  assert.ok(bad(qs => { qs[7].options = ['a'] }).some(e => e.includes('options')))
  assert.ok(bad(qs => { qs[8].options[1] = qs[8].options[0] }).some(e => e.includes('same')))
  assert.ok(bad(qs => { qs[9].question = qs[10].question }).some(e => e.includes('repeats')))
  assert.ok(bad(qs => { qs.pop() }).some(e => e.includes('questions, expected')))
  assert.ok(validateQuiz({ questions: sample }).includes('label is missing'))
})

test('the passport counts sages with a star and the stars collected', () => {
  assert.deepEqual(passportTotals({}), { sages: 0, stars: 0 })
  assert.deepEqual(passportTotals({
    '41': { best: 95, stars: 3, at: '2026-10-12' },
    '594': { best: 40, stars: 0, at: '2026-10-12' },
    '198': { best: 80, stars: 2, at: '2026-10-12' },
  }), { sages: 2, stars: 5 })
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
