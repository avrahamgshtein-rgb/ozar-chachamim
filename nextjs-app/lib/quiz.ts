// The sage quiz: twenty questions on one sage, drawn from his research paper, worth 100 points in
// all. Pure and shared by the server (which decides whether a page has a quiz), the client (which
// plays it) and the tests (which validate every quiz file).
//
// public/quiz/<id>.json (Hebrew), <id>.en.json, <id>.ru.json hold the questions; public/data-quiz.json
// is the index of which sage has a quiz in which language, bundled at build time. Both are written by
// scripts/build_quiz.py, which also validates them by the same rules as validateQuiz below.
import quizIndex from '../public/data-quiz.json'
import type { Locale } from './types'

/** One question, as the quiz files hold it. Two options make a true/false question. */
export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  points: number
}

export interface QuizFile {
  /** The roster label the quiz was written for; guards against ids drifting. */
  label: string
  questions: QuizQuestion[]
}

export const QUIZ_TOTAL_POINTS = 100
export const QUIZ_LENGTH = 20
/** A station quiz of the kids' journey is shorter. */
export const KIDS_QUIZ_LENGTH = 10
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 4

/** Stars by final score: the score must reach the threshold. Three stars is the most. */
export const STAR_THRESHOLDS = [50, 75, 90] as const

interface IndexEntry { label: string; langs: Locale[] }
const index = (quizIndex as unknown as { sages: Record<string, IndexEntry> }).sages

export function quizIndexEntries(): Array<[string, IndexEntry]> {
  return Object.entries(index)
}

/** Whether the sage has a quiz in this language. A quiz is never shown in another language. */
export function hasQuiz(sageId: string, locale: Locale): boolean {
  return index[sageId]?.langs.includes(locale) ?? false
}

/** Where the quiz file is served. */
export function quizUrl(sageId: string, locale: Locale): string {
  return `/quiz/${encodeURIComponent(sageId)}${locale === 'he' ? '' : `.${locale}`}.json`
}

/** Where a kids' station quiz is served (beside the sage quizzes, so the service worker keeps it fresh). */
export function kidsQuizUrl(route: string, n: number): string {
  return `/quiz/kids/${route}-${n}.json`
}

/** Every rule a quiz file must keep; an empty list means it is valid. `length`: the sage quiz's 20, or the kids' 10. */
export function validateQuiz(quiz: unknown, length: number = QUIZ_LENGTH): string[] {
  const errors: string[] = []
  const q = quiz as Partial<QuizFile> | null
  if (!q || typeof q !== 'object') return ['not an object']
  if (typeof q.label !== 'string' || !q.label.trim()) errors.push('label is missing')
  if (!Array.isArray(q.questions)) return [...errors, 'questions is not a list']
  if (q.questions.length !== length) errors.push(`${q.questions.length} questions, expected ${length}`)
  let total = 0
  const seen = new Set<string>()
  q.questions.forEach((item, i) => {
    const at = `question ${i + 1}`
    if (!item || typeof item !== 'object') { errors.push(`${at}: not an object`); return }
    const { question, options, correctIndex, explanation, points } = item as QuizQuestion
    if (typeof question !== 'string' || !question.trim()) errors.push(`${at}: no question text`)
    else if (seen.has(question.trim())) errors.push(`${at}: repeats an earlier question`)
    else seen.add(question.trim())
    if (!Array.isArray(options) || options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
      errors.push(`${at}: needs ${MIN_OPTIONS} to ${MAX_OPTIONS} options`)
    } else {
      if (options.some(o => typeof o !== 'string' || !o.trim())) errors.push(`${at}: an empty option`)
      if (new Set(options.map(o => String(o).trim())).size !== options.length) errors.push(`${at}: two options are the same`)
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        errors.push(`${at}: correctIndex ${correctIndex} is not an option`)
      }
    }
    if (typeof explanation !== 'string' || !explanation.trim()) errors.push(`${at}: no explanation`)
    if (!Number.isInteger(points) || points <= 0) errors.push(`${at}: points must be a positive whole number`)
    else total += points
  })
  if (total !== QUIZ_TOTAL_POINTS) errors.push(`points add up to ${total}, expected ${QUIZ_TOTAL_POINTS}`)
  return errors
}

/** A true/false question: two options. Their order is kept when playing ("true" first). */
export const isTrueFalse = (q: QuizQuestion) => q.options.length === 2

/** The score: the points of every question answered correctly. `answers[i]` is the chosen option of question i. */
export function scoreQuiz(questions: QuizQuestion[], answers: Array<number | null | undefined>): number {
  return questions.reduce((sum, q, i) => (answers[i] === q.correctIndex ? sum + q.points : sum), 0)
}

/** 0 to 3 stars for a score out of 100. */
export function starsFor(score: number): 0 | 1 | 2 | 3 {
  let stars = 0
  for (const t of STAR_THRESHOLDS) if (score >= t) stars++
  return stars as 0 | 1 | 2 | 3
}

/**
 * The questions as one game shows them: the options of a multiple-choice question in a new order
 * each game (so the place of the right answer teaches nothing), true/false kept as written.
 * `random` is injectable for tests.
 */
export function shuffleForPlay(questions: QuizQuestion[], random: () => number = Math.random): QuizQuestion[] {
  return questions.map(q => {
    if (isTrueFalse(q)) return q
    const order = q.options.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return { ...q, options: order.map(i => q.options[i]), correctIndex: order.indexOf(q.correctIndex) }
  })
}
