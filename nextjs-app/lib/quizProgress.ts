// The visitor's journey passport: the best result of each quiz they played, kept in this browser
// only (no account, nothing sent anywhere). One localStorage key; a blocked storage just means no
// passport, never a broken quiz.
import { starsFor } from './quiz'

const KEY = 'ozar-quiz-progress'

export interface QuizResult {
  best: number
  stars: number
  /** ISO date of the best result. */
  at: string
}

export function readProgress(): Record<string, QuizResult> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

/** Keep a finished game. Returns whether it beat the visitor's previous best for this sage. */
export function recordResult(sageId: string, score: number): { improved: boolean; previous: QuizResult | null } {
  const all = readProgress()
  const previous = all[sageId] ?? null
  const improved = !previous || score > previous.best
  if (improved) {
    all[sageId] = { best: score, stars: starsFor(score), at: new Date().toISOString().slice(0, 10) }
    try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* storage blocked */ }
  }
  return { improved, previous }
}

/** The passport's totals: how many sages have at least one star, and the stars collected. */
export function passportTotals(progress: Record<string, QuizResult> = readProgress()): { sages: number; stars: number } {
  let sages = 0
  let stars = 0
  for (const r of Object.values(progress)) {
    if (r.stars > 0) sages++
    stars += r.stars
  }
  return { sages, stars }
}
