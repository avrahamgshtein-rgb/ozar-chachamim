'use client'

// The quiz player: one question at a time, each answered with its explanation; 100 points in all and up
// to three stars. Nothing is fetched until the visitor starts, and the best result stays in this browser
// (lib/quizProgress.ts). Used by the sage page (20 questions from the research) and by the stations of
// the kids' journey (10 questions from the books).
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import type { Locale } from '@/lib/types'
import {
  QUIZ_TOTAL_POINTS, isTrueFalse, scoreQuiz, shuffleForPlay, starsFor, validateQuiz,
  type QuizFile, type QuizQuestion,
} from '@/lib/quiz'
import { passportTotals, readProgress, recordResult, type QuizResult } from '@/lib/quizProgress'

const S = {
  start: { he: 'התחילו את החידון', en: 'Start the quiz', ru: 'Начать викторину' },
  again: { he: 'שחקו שוב', en: 'Play again', ru: 'Сыграть ещё раз' },
  best: { he: 'השיא שלכם: {n}', en: 'Your best: {n}', ru: 'Ваш рекорд: {n}' },
  loading: { he: 'טוען את השאלות…', en: 'Loading the questions…', ru: 'Загружаем вопросы…' },
  failed: { he: 'לא הצלחנו לטעון את החידון. נסו שוב.', en: 'The quiz could not be loaded. Please try again.', ru: 'Не удалось загрузить викторину. Попробуйте ещё раз.' },
  retry: { he: 'ניסיון נוסף', en: 'Try again', ru: 'Повторить' },
  progress: { he: 'שאלה {i} מתוך {n}', en: 'Question {i} of {n}', ru: 'Вопрос {i} из {n}' },
  points: { he: '{n} נק׳', en: '{n} pts', ru: '{n} очк.' },
  trueFalse: { he: 'נכון או לא נכון?', en: 'True or false?', ru: 'Верно или неверно?' },
  right: { he: 'נכון! +{n}', en: 'Correct! +{n}', ru: 'Верно! +{n}' },
  wrong: { he: 'לא הפעם.', en: 'Not this time.', ru: 'Не в этот раз.' },
  next: { he: 'לשאלה הבאה', en: 'Next question', ru: 'Следующий вопрос' },
  finish: { he: 'לתוצאה', en: 'See your result', ru: 'К результату' },
  score: { he: 'הניקוד שלכם', en: 'Your score', ru: 'Ваш результат' },
  starsLabel: { he: '{n} מתוך 3 כוכבים', en: '{n} of 3 stars', ru: '{n} из 3 звёзд' },
  newBest: { he: 'שיא חדש!', en: 'New best!', ru: 'Новый рекорд!' },
  verdict: {
    he: ['כדאי לקרוא את המחקר ולנסות שוב.', 'התחלה טובה! עוד קצת ותגיעו לכוכב השני.', 'יפה מאוד! אתם מכירים את החכם היטב.', 'מצוין! אתם כבר מומחים.'],
    en: ['Read the research and try again.', 'A good start! A little more for the second star.', 'Very good! You know this sage well.', 'Excellent! You are an expert already.'],
    ru: ['Прочитайте исследование и попробуйте снова.', 'Хорошее начало! Ещё немного до второй звезды.', 'Очень хорошо! Вы хорошо знаете этого мудреца.', 'Отлично! Вы уже знаток.'],
  },
  review: { he: 'השאלות שכדאי לחזור אליהן ({n})', en: 'Questions to revisit ({n})', ru: 'Вопросы, к которым стоит вернуться ({n})' },
  answer: { he: 'התשובה:', en: 'Answer:', ru: 'Ответ:' },
} satisfies Record<string, Record<Locale, string | string[]>>

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))

const ruPlural = new Intl.PluralRules('ru')
/** The passport line, with the nouns in the number they need (one sage, 2 stars). */
function passportLine(locale: Locale, { stars, sages }: { stars: number; sages: number }): string {
  if (locale === 'he') {
    return `בדרכון המסע שלכם: ${stars === 1 ? 'כוכב אחד' : `${stars} כוכבים`} אצל ${sages === 1 ? 'חכם אחד' : `${sages} חכמים`}`
  }
  if (locale === 'ru') {
    const star = { one: 'звезда', few: 'звезды' }[ruPlural.select(stars) as 'one' | 'few'] ?? 'звёзд'
    return `В вашем паспорте путешествия: ${stars} ${star} у ${sages} ${ruPlural.select(sages) === 'one' ? 'мудреца' : 'мудрецов'}`
  }
  return `In your journey passport: ${stars} ${stars === 1 ? 'star' : 'stars'} from ${sages} ${sages === 1 ? 'sage' : 'sages'}`
}

type Phase = 'intro' | 'loading' | 'error' | 'play' | 'done'

export interface QuizPlayerProps {
  /** The section's id, for links to it. */
  anchor: string
  /** Where the quiz file is served. */
  src: string
  /** The key the best result is kept under, and the passport it belongs to. */
  progressKey: string
  store?: string
  title: string
  subtitle: string
  locale: Locale
  /** How many questions the file must hold. */
  length: number
  headingLevel?: 'h2' | 'h3'
  /** What to say for 0, 1, 2 and 3 stars, when the default (written for the sage quiz) does not fit. */
  verdicts?: string[]
  /** Show the sage-quiz passport line on the result. */
  showPassport?: boolean
  /** Where to go after a game ("read the research"). */
  footerLink?: { href: string; label: string }
  /** For the analytics events. */
  kind: 'sage' | 'kids'
  onComplete?: (score: number, stars: number) => void
}

export function QuizPlayer({
  anchor, src, progressKey, store, title, subtitle, locale, length, headingLevel = 'h2',
  verdicts, showPassport, footerLink, kind, onComplete,
}: QuizPlayerProps) {
  const Heading = headingLevel
  const Question = headingLevel === 'h2' ? 'h3' : 'h4'
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Array<number | null>>([])
  const [current, setCurrent] = useState(0)
  const [saved, setSaved] = useState<QuizResult | null>(null)
  /** A new best beats an earlier game; the first game is not "a new best". */
  const [newBest, setNewBest] = useState(false)
  const [passport, setPassport] = useState({ sages: 0, stars: 0 })
  const source = useRef<QuizQuestion[] | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The visitor's earlier best, read after hydration (the server has no browser storage)
  useEffect(() => { setSaved(readProgress(store)[progressKey] ?? null) }, [progressKey, store])

  const answered = answers[current] ?? null
  const q = questions[current]
  const score = scoreQuiz(questions, answers)

  // Keyboard and screen-reader users land on what changed: the explanation's button, or the new question
  useEffect(() => {
    if (phase !== 'play') return
    if (answered !== null) nextRef.current?.focus()
    else headingRef.current?.focus()
  }, [phase, answered, current])

  async function start() {
    track('quiz_start', { locale, kind })
    setNewBest(false)
    if (!source.current) {
      setPhase('loading')
      try {
        const res = await fetch(src)
        if (!res.ok) throw new Error(String(res.status))
        const file = (await res.json()) as QuizFile
        if (validateQuiz(file, length).length > 0) throw new Error('invalid quiz')
        source.current = file.questions
      } catch {
        setPhase('error')
        return
      }
    }
    const play = shuffleForPlay(source.current)
    setQuestions(play)
    setAnswers(play.map(() => null))
    setCurrent(0)
    setPhase('play')
  }

  function choose(i: number) {
    if (answered !== null) return
    setAnswers(prev => prev.map((a, k) => (k === current ? i : a)))
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      return
    }
    const result = recordResult(progressKey, score, store)
    setNewBest(result.improved && result.previous !== null)
    const progress = readProgress(store)
    setSaved(progress[progressKey] ?? null)
    setPassport(passportTotals(progress))
    track('quiz_complete', { locale, kind, score, stars: starsFor(score) })
    onComplete?.(score, starsFor(score))
    setPhase('done')
  }

  const missed = questions.map((item, i) => ({ item, i })).filter(({ item, i }) => answers[i] !== item.correctIndex)

  return (
    <section id={anchor} aria-labelledby={`${anchor}-title`} className="scroll-mt-20 rounded-2xl border border-gold-500/25 bg-gold-500/[0.04] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading id={`${anchor}-title`} className="font-serif text-xl font-bold text-gold-300">{title}</Heading>
          <p className="mt-1 text-sm text-ink-400">{subtitle}</p>
        </div>
        {saved && phase !== 'done' && (
          <div className="flex items-center gap-2 text-sm text-ink-300">
            <Stars n={saved.stars} label={fill(S.starsLabel[locale], { n: saved.stars })} />
            <span>{fill(S.best[locale], { n: saved.best })}</span>
          </div>
        )}
      </div>

      {(phase === 'intro' || phase === 'error') && (
        <div className="mt-5">
          {phase === 'error' && <p role="alert" className="mb-3 text-sm text-red-300 [[data-theme=light]_&]:text-red-700">{S.failed[locale]}</p>}
          <button type="button" onClick={start} className={primary}>
            {phase === 'error' ? S.retry[locale] : saved ? S.again[locale] : S.start[locale]}
          </button>
        </div>
      )}

      {phase === 'loading' && <p role="status" className="mt-5 text-sm text-ink-400">{S.loading[locale]}</p>}

      {phase === 'play' && q && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span>{fill(S.progress[locale], { i: current + 1, n: questions.length })}</span>
            <span dir="ltr" className="tabular-nums">{score} / {QUIZ_TOTAL_POINTS}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700/50" aria-hidden>
            <div className="h-full rounded-full bg-gold-400 transition-all duration-300" style={{ width: `${((current + (answered !== null ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs">
            {isTrueFalse(q) && <span className="rounded-full border border-ink-600/60 px-2 py-0.5 text-ink-300">{S.trueFalse[locale]}</span>}
            <span className="rounded-full bg-gold-500/15 px-2 py-0.5 tabular-nums text-gold-300">{fill(S.points[locale], { n: q.points })}</span>
          </div>
          <Question ref={headingRef} tabIndex={-1} dir="auto" className="mt-3 font-serif text-lg leading-relaxed text-ink-50 outline-none md:text-xl">{q.question}</Question>

          <ul className={cn('mt-4 grid gap-2', isTrueFalse(q) ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
            {q.options.map((option, i) => {
              const isRight = answered !== null && i === q.correctIndex
              const isWrongPick = answered === i && i !== q.correctIndex
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    disabled={answered !== null}
                    aria-pressed={answered === i}
                    dir="auto"
                    className={cn(
                      'flex h-full w-full items-start gap-2 rounded-xl border px-4 py-3 text-start text-[15px] leading-snug transition-colors',
                      answered === null && 'border-ink-600/60 bg-ink-800/40 text-ink-100 hover:border-gold-500/50 hover:bg-gold-500/10',
                      answered !== null && !isRight && !isWrongPick && 'border-ink-700/40 text-ink-400',
                      isRight && 'border-emerald-400/60 bg-emerald-500/15 text-ink-50',
                      isWrongPick && 'border-red-400/60 bg-red-500/15 text-ink-100',
                    )}
                  >
                    <span aria-hidden className="w-4 flex-shrink-0 font-bold">
                      {isRight ? <span className="text-emerald-400 [[data-theme=light]_&]:text-emerald-700">✓</span> : isWrongPick ? <span className="text-red-400 [[data-theme=light]_&]:text-red-700">✗</span> : ''}
                    </span>
                    <span>{option}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          {answered !== null && (
            <div aria-live="polite" className="mt-4 rounded-xl border border-ink-700/50 bg-ink-800/50 p-4">
              <p className={cn('font-semibold', answered === q.correctIndex ? 'text-emerald-400 [[data-theme=light]_&]:text-emerald-700' : 'text-red-300 [[data-theme=light]_&]:text-red-700')}>
                {answered === q.correctIndex ? fill(S.right[locale], { n: q.points }) : S.wrong[locale]}
              </p>
              <p dir="auto" className="mt-1.5 text-[15px] leading-relaxed text-ink-200">{q.explanation}</p>
              <button ref={nextRef} type="button" onClick={next} className={cn(primary, 'mt-4')}>
                {current < questions.length - 1 ? S.next[locale] : S.finish[locale]}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="mt-5" aria-live="polite">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-500">{S.score[locale]}</p>
              <p dir="ltr" className="font-serif text-4xl font-bold tabular-nums text-ink-50">{score}<span className="text-xl text-ink-500"> / {QUIZ_TOTAL_POINTS}</span></p>
            </div>
            <Stars n={starsFor(score)} big label={fill(S.starsLabel[locale], { n: starsFor(score) })} />
            {newBest && <span className="rounded-full bg-gold-500/20 px-3 py-1 text-sm font-semibold text-gold-300">{S.newBest[locale]}</span>}
          </div>
          <p className="mt-3 text-[15px] text-ink-200">{(verdicts ?? S.verdict[locale])[starsFor(score)]}</p>
          {showPassport && passport.stars > 0 && <p className="mt-2 text-sm text-ink-400">{passportLine(locale, passport)}</p>}

          {missed.length > 0 && (
            <details className="mt-4 rounded-xl border border-ink-700/40 bg-ink-800/30 p-4">
              <summary className="cursor-pointer text-sm text-ink-200">{fill(S.review[locale], { n: missed.length })}</summary>
              <ol className="mt-3 space-y-3">
                {missed.map(({ item, i }) => (
                  <li key={i} dir="auto" className="text-sm leading-relaxed">
                    <p className="text-ink-100">{item.question}</p>
                    <p className="mt-0.5 text-ink-300"><span className="text-emerald-400 [[data-theme=light]_&]:text-emerald-700">{S.answer[locale]}</span> {item.options[item.correctIndex]}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={start} className={primary}>{S.again[locale]}</button>
            {footerLink && <a href={footerLink.href} className={secondary}>{footerLink.label}</a>}
          </div>
        </div>
      )}
    </section>
  )
}

const primary = 'inline-flex items-center gap-2 rounded-full border border-gold-500/60 bg-gold-500/20 px-5 py-2.5 text-sm font-semibold text-gold-300 transition-colors hover:bg-gold-500/30 focus-visible:outline-offset-4'
const secondary = 'inline-flex items-center gap-2 rounded-full border border-ink-600/60 px-5 py-2.5 text-sm text-ink-200 transition-colors hover:border-gold-500/50 hover:text-gold-300'

function Stars({ n, big, label }: { n: number; big?: boolean; label: string }) {
  return (
    <span role="img" aria-label={label} className={cn('inline-flex gap-0.5', big ? 'text-3xl' : 'text-base')}>
      {[0, 1, 2].map(i => (
        <span key={i} aria-hidden className={i < n ? 'text-gold-400' : 'text-ink-700'}>★</span>
      ))}
    </span>
  )
}
