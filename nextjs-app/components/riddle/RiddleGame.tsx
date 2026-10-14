'use client'

// The sage riddle (lib/riddle.ts): clues one at a time, six guesses chosen from a search over the roster,
// feedback on each wrong guess (earlier or later, same region, directly linked), then the sage's card, a
// result to share that does not give him away, and the streak. Everything the player did stays in this
// browser (localStorage `ozar-riddle`); a blocked storage only means no record is kept.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import { loadEnglishNames, searchSagesRanked } from '@/lib/search'
import { ALL_PERIODS, ERA_LABELS } from '@/lib/types'
import type { Locale, Sage } from '@/lib/types'
import {
  MAX_GUESSES, STORE_KEY, applyGuess, compareGuess, currentStreak, emptyState, formatCountdown, nextRiddleAt, parseState,
  shareText, startDay, visibleClues,
  type GuessFeedback, type RiddleCandidate, type RiddlePayload, type RiddleState, type RiddleStats,
} from '@/lib/riddle'
import { EraChip } from '@/components/ui/EraChip'
import { copyText, showToast } from '@/components/sages/Toast'

const S = {
  status: { he: 'ניחוש {i} מתוך {n}', en: 'Guess {i} of {n}', ru: 'Попытка {i} из {n}' },
  streak: { he: 'רצף: {n} ימים', en: 'Streak: {n} days', ru: 'Серия: {n} дн.' },
  waiting: { he: 'עוד {n} רמזים ממתינים', en: '{n} more clues waiting', ru: 'Ещё подсказок: {n}' },
  cluesHeading: { he: 'הרמזים', en: 'Clues', ru: 'Подсказки' },
  placeholder: { he: 'הקלידו שם של חכם…', en: 'Type a sage’s name…', ru: 'Введите имя мудреца…' },
  inputLabel: { he: 'מי החכם? בחרו שם מהרשימה', en: 'Who is the sage? Pick a name from the list', ru: 'Кто этот мудрец? Выберите имя из списка' },
  guess: { he: 'ניחוש', en: 'Guess', ru: 'Угадать' },
  noMatch: { he: 'לא נמצא חכם בשם הזה', en: 'No sage by that name', ru: 'Мудрец с таким именем не найден' },
  historyHeading: { he: 'הניחושים שלכם', en: 'Your guesses', ru: 'Ваши попытки' },
  historyHint: {
    he: 'הסימנים מתארים את החכם הנסתר ביחס לניחוש.',
    en: 'The marks describe the hidden sage compared with your guess.',
    ru: 'Значки описывают скрытого мудреца по сравнению с вашей попыткой.',
  },
  // not gendered (the hidden sage's gender is hidden too) and true both across eras and, within one era, 50+ years apart
  eraSame: { he: 'אותה תקופה', en: 'Same era', ru: 'Та же эпоха' },
  eraLater: { he: 'מאוחר יותר', en: 'Later', ru: 'Позже' },
  eraEarlier: { he: 'מוקדם יותר', en: 'Earlier', ru: 'Раньше' },
  regionSame: { he: 'אותו אזור', en: 'Same region', ru: 'Тот же регион' },
  regionOther: { he: 'אזור אחר', en: 'Other region', ru: 'Другой регион' },
  regionUnknown: { he: 'אזור לא ידוע', en: 'Region unknown', ru: 'Регион неизвестен' },
  linked: { he: 'קשר ישיר', en: 'Directly linked', ru: 'Прямая связь' },
  found: { he: 'מצאתם!', en: 'You got it!', ru: 'Вы угадали!' },
  foundIn: { he: '{n} מתוך {m} ניחושים', en: '{n} of {m} guesses', ru: '{n} из {m} попыток' },
  lost: { he: 'הפעם לא הצלחתם', en: 'Not this time', ru: 'В этот раз не получилось' },
  lostSub: { he: 'החכם הנסתר היה:', en: 'The hidden sage was:', ru: 'Скрытым мудрецом был:' },
  openPage: { he: 'לעמוד החכם', en: 'Open the page', ru: 'Открыть страницу' },
  inTower: { he: 'במגדל הדורות', en: 'In the Tower of Generations', ru: 'В Башне поколений' },
  otherGame: { he: 'משחק נוסף: שרשרת החכמים', en: 'Another game: Sage Chain', ru: 'Ещё одна игра: Цепочка мудрецов' },
  otherGameBody: {
    he: 'שני חכמים בכל יום, ומטרה אחת: לחבר ביניהם בשרשרת של חכמים קשורים, בכמה שפחות צעדים.',
    en: 'Two sages every day, one goal: connect them through a chain of linked sages in as few steps as you can.',
    ru: 'Каждый день два мудреца и одна цель: соединить их цепочкой связанных мудрецов, сделав как можно меньше шагов.',
  },
  otherGameGo: { he: 'לשרשרת החכמים', en: 'Play Sage Chain', ru: 'К цепочке мудрецов' },
  quiz: { he: 'חידון על החכם', en: 'Quiz on this sage', ru: 'Викторина о мудреце' },
  shareHeading: { he: 'שתפו את התוצאה', en: 'Share your result', ru: 'Поделитесь результатом' },
  share: { he: 'שיתוף', en: 'Share', ru: 'Поделиться' },
  whatsapp: { he: 'שליחה בוואטסאפ', en: 'Send on WhatsApp', ru: 'Отправить в WhatsApp' },
  copied: { he: 'התוצאה הועתקה', en: 'Result copied', ru: 'Результат скопирован' },
  copyFailed: { he: 'לא ניתן להעתיק את התוצאה', en: 'Could not copy the result', ru: 'Не удалось скопировать результат' },
  shareNote: { he: 'התוצאה לא חושפת את שם החכם.', en: 'The result does not give the sage away.', ru: 'Результат не выдаёт имя мудреца.' },
  statsHeading: { he: 'הסטטיסטיקה שלכם', en: 'Your statistics', ru: 'Ваша статистика' },
  played: { he: 'משחקים', en: 'Played', ru: 'Игр' },
  winPct: { he: 'אחוז הצלחה', en: 'Win %', ru: '% побед' },
  current: { he: 'רצף נוכחי', en: 'Current streak', ru: 'Текущая серия' },
  best: { he: 'רצף שיא', en: 'Best streak', ru: 'Лучшая серия' },
  distribution: { he: 'הצלחות לפי מספר ניחושים', en: 'Wins by number of guesses', ru: 'Победы по числу попыток' },
  next: { he: 'החידה הבאה בעוד', en: 'Next riddle in', ru: 'Следующая загадка через' },
  newReady: { he: 'יש חידה חדשה!', en: 'A new riddle is ready!', ru: 'Новая загадка готова!' },
  reload: { he: 'לרענון הדף', en: 'Reload the page', ru: 'Обновить страницу' },
  stale: {
    he: 'כבר שיחקתם בחידה חדשה יותר מזו שבדף. רעננו את הדף כדי לראות אותה.',
    en: 'You have already played a newer riddle than the one on this page. Reload to see it.',
    ru: 'Вы уже играли в более новую загадку, чем на этой странице. Обновите страницу, чтобы увидеть её.',
  },
  howTo: { he: 'איך משחקים?', en: 'How to play', ru: 'Как играть' },
  howToLines: {
    he: [
      'בכל יום מסתתר חכם אחד, אותו חכם לכל המבקרים. מתחילים ברמז אחד, ויש שישה ניחושים.',
      'בחרו חכם מהרשימה. אם טעיתם, נחשף רמז נוסף, ומתקבלים סימנים על החכם הנסתר ביחס לניחוש שלכם:',
      '🔼 / 🔽 החכם הנסתר מאוחר / מוקדם יותר מהניחוש שלכם (בתקופה אחרת, או בהפרש של יותר מ־50 שנה באותה תקופה) · 🟩 אותה תקופה או אותו אזור · ⬜ אזור אחר · 🔥 קשר ישיר: מורה, תלמיד, קרוב משפחה או חבר.',
      'בסוף אפשר לשתף את התוצאה כשורות של סימנים, בלי לגלות את התשובה.',
    ],
    en: [
      'Every day one sage is hidden, the same one for every visitor. You start with one clue and have six guesses.',
      'Pick a sage from the list. If you are wrong, another clue appears and you get marks describing the hidden sage compared with your guess:',
      '🔼 / 🔽 the hidden sage came after / before your guess (in another era, or more than 50 years apart within the same era) · 🟩 same era or same region · ⬜ other region · 🔥 directly linked: teacher, student, relative or colleague.',
      'At the end you can share your result as rows of marks, without giving the answer away.',
    ],
    ru: [
      'Каждый день скрыт один мудрец, один и тот же для всех посетителей. Вы начинаете с одной подсказки, попыток шесть.',
      'Выберите мудреца из списка. Если ошиблись, появится новая подсказка и значки, описывающие скрытого мудреца по сравнению с вашей попыткой:',
      '🔼 / 🔽 скрытый мудрец позже / раньше вашей попытки (в другую эпоху или с разницей более 50 лет в той же эпохе) · 🟩 та же эпоха или тот же регион · ⬜ другой регион · 🔥 прямая связь: учитель, ученик, родственник или соратник.',
      'В конце результатом можно поделиться в виде строк значков, не выдавая ответа.',
    ],
  },
} satisfies Record<string, Record<Locale, string | string[]>>

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))

const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-900 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'inline-flex items-center justify-center gap-2 rounded-lg border border-gold-500/40 px-4 py-2 text-sm text-gold-200 transition-colors hover:bg-gold-500/10'
/** The most the guess list may be tall, and the sticky top bar above the page's content. */
const LIST_MAX = 288
const TOP_BAR = 56
const chipBase = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs'
const chipHit = 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200 [[data-theme=light]_&]:text-emerald-800'
const chipDirection = 'border-gold-500/40 bg-gold-500/10 text-gold-300'
const chipNeutral = 'border-ink-600/50 text-ink-300'
const chipLinked = 'border-orange-400/50 bg-orange-500/15 text-orange-200 [[data-theme=light]_&]:text-orange-800'

export function RiddleGame({ locale, payload, pageUrl }: { locale: Locale; payload: RiddlePayload; pageUrl: string }) {
  const [state, setState] = useState<RiddleState>(() => startDay(emptyState(), payload.day))
  // the browser holds a newer day than this (cached) page: play nothing, and leave what it holds alone
  const [stale, setStale] = useState(false)
  const endRef = useRef<HTMLElement>(null)

  const byId = useMemo(() => new Map(payload.candidates.map(c => [c.id, c])), [payload.candidates])
  const linkedIds = useMemo(() => new Set(payload.candidates.filter(c => c.linked).map(c => c.id)), [payload.candidates])
  const answer = byId.get(payload.answer)

  // What this browser played before (the server has no storage to read)
  useEffect(() => {
    let raw: string | null = null
    try { raw = window.localStorage.getItem(STORE_KEY) } catch { /* storage blocked: no record is kept */ }
    const saved = parseState(raw)
    if (saved.day > payload.day) setStale(true)
    else setState(startDay(saved, payload.day))
  }, [payload.day])

  const feedback = useMemo(
    () => state.guesses.map(id => {
      const guess = byId.get(id)
      return guess && answer ? compareGuess(guess, answer, linkedIds) : null
    }),
    [state.guesses, byId, answer, linkedIds],
  )

  const submit = useCallback((id: string) => {
    if (stale || state.done) return
    const next = applyGuess(state, id, payload.answer)
    if (next === state) return
    if (state.guesses.length === 0) track('riddle_start', { locale })
    setState(next)
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(next)) } catch { /* storage blocked */ }
    if (next.done) {
      track('riddle_complete', { locale, won: next.won, tries: next.guesses.length })
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }), 60)
    }
  }, [stale, state, payload.answer, locale])

  const shown = visibleClues(payload.clues.length, state.guesses.length, state.done)
  const streak = currentStreak(state.stats, payload.day)

  const clues = (
    <section aria-labelledby="riddle-clues" className="mt-8">
      <h2 id="riddle-clues" className="text-xs font-semibold uppercase tracking-widest text-ink-400">{S.cluesHeading[locale]}</h2>
      <ol className="mt-3 space-y-2">
        {payload.clues.slice(0, shown).map((c, i) => (
          <li
            key={c.kind}
            className={cn(
              'rounded-xl border border-gold-500/25 bg-gold-500/[0.05] px-4 py-3',
              i === shown - 1 && !state.done && i > 0 && 'animate-fade-in',
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-400">{i + 1}. {c.label}</p>
            <p dir={c.kind === 'time' ? undefined : 'auto'} className="mt-1 font-serif text-lg leading-snug text-ink-50">{c.text}</p>
          </li>
        ))}
        {!state.done && shown < payload.clues.length && (
          <li className="rounded-xl border border-dashed border-ink-600/50 px-4 py-2.5 text-sm text-ink-400">
            <span aria-hidden>🔒</span> {fill(S.waiting[locale], { n: payload.clues.length - shown })}
          </li>
        )}
      </ol>
    </section>
  )

  const history = state.guesses.length > 0 && (
    <section aria-labelledby="riddle-history" className="mt-8">
      <h2 id="riddle-history" className="text-xs font-semibold uppercase tracking-widest text-ink-400">{S.historyHeading[locale]}</h2>
      <p className="mt-1 text-xs text-ink-500">{S.historyHint[locale]}</p>
      <ol aria-live="polite" className="mt-3 space-y-2">
        {state.guesses.map((id, i) => ({ id, i })).reverse().map(({ id, i }) => (
          <GuessRow
            key={id}
            locale={locale}
            index={i}
            candidate={byId.get(id)}
            feedback={feedback[i]}
            correct={state.won && i === state.guesses.length - 1}
          />
        ))}
      </ol>
    </section>
  )

  return (
    <div>
      {stale && <p role="status" className="mt-6 rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-ink-100">{S.stale[locale]}</p>}

      {state.done ? (
        <>
          <EndScreen
            sectionRef={endRef}
            locale={locale}
            payload={payload}
            state={state}
            feedback={feedback}
            pageUrl={pageUrl}
          />
          {history}
          {clues}
        </>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-300">
            <span>{fill(S.status[locale], { i: state.guesses.length + 1, n: MAX_GUESSES })}</span>
            {streak > 0 && <span className="rounded-full bg-gold-500/15 px-3 py-0.5 text-gold-300">🔥 {fill(S.streak[locale], { n: streak })}</span>}
          </div>
          {clues}
          {!stale && (
            <GuessInput
              locale={locale}
              candidates={payload.candidates}
              guessed={state.guesses}
              onSubmit={submit}
            />
          )}
          {history}
        </>
      )}

      <details className="mt-8 rounded-xl border border-ink-700/50 bg-ink-800/30 px-4 py-3">
        <summary className="cursor-pointer text-sm text-ink-200">{S.howTo[locale]}</summary>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-300">
          {S.howToLines[locale].map(line => <li key={line}>{line}</li>)}
        </ul>
      </details>
    </div>
  )
}

/* ── A guess and what it told ─────────────────────────────────────────── */

function GuessRow({ locale, index, candidate, feedback, correct }: {
  locale: Locale; index: number; candidate?: RiddleCandidate; feedback: GuessFeedback | null; correct: boolean
}) {
  return (
    <li className={cn(
      'rounded-xl border px-4 py-3',
      correct ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-ink-700/50 bg-ink-800/40',
    )}>
      <div className="flex items-baseline justify-between gap-3">
        <span dir="auto" className="font-serif text-lg text-ink-50">{correct && <span aria-hidden>🎯 </span>}{candidate?.name ?? '—'}</span>
        <span className="flex-shrink-0 text-xs tabular-nums text-ink-500" dir="ltr">{index + 1}/{MAX_GUESSES}</span>
      </div>
      {!correct && feedback && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={cn(chipBase, feedback.era === 'same' ? chipHit : chipDirection)}>
            <span aria-hidden>{feedback.era === 'same' ? '🟩' : feedback.era === 'later' ? '🔼' : '🔽'}</span>
            {feedback.era === 'same' ? S.eraSame[locale] : feedback.era === 'later' ? S.eraLater[locale] : S.eraEarlier[locale]}
          </span>
          <span className={cn(chipBase, feedback.region === 'same' ? chipHit : chipNeutral)}>
            <span aria-hidden>{feedback.region === 'same' ? '🟩' : '⬜'}</span>
            {feedback.region === 'same' ? S.regionSame[locale] : feedback.region === 'other' ? S.regionOther[locale] : S.regionUnknown[locale]}
          </span>
          {feedback.linked && (
            <span className={cn(chipBase, chipLinked)}><span aria-hidden>🔥</span>{S.linked[locale]}</span>
          )}
        </div>
      )}
    </li>
  )
}

/* ── The guess box: a search over the roster ──────────────────────────── */

function Highlighted({ text, range }: { text: string; range: [number, number] | null }) {
  if (!range) return <>{text}</>
  return (
    <>
      {text.slice(0, range[0])}
      <mark className="rounded-sm bg-gold-500/20 px-px text-gold-200">{text.slice(range[0], range[1])}</mark>
      {text.slice(range[1])}
    </>
  )
}

function GuessInput({ locale, candidates, guessed, onSubmit }: {
  locale: Locale; candidates: RiddleCandidate[]; guessed: string[]; onSubmit: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  /** The sage chosen from the list, not yet guessed. */
  const [picked, setPicked] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  // The roster as the search wants it: a name and an era is all it reads here.
  const pool = useMemo<Sage[]>(
    () => candidates.filter(c => !guessed.includes(c.id)).map(c => ({ id: c.id, label: c.name, period: ALL_PERIODS[c.period] ?? 'modern' })),
    [candidates, guessed],
  )
  const hits = useMemo(() => (query.trim() ? searchSagesRanked(pool, query, { limit: 7 }) : []), [pool, query])
  const showList = open && query.trim().length > 0 && picked === null

  // English names (so "Maimonides" finds the Rambam in the Hebrew page) load on first use; they add aliases only
  const loadAliases = useCallback(() => { if (locale === 'he') void loadEnglishNames() }, [locale])

  // Where the list goes: below the field, or above it when the visible screen (the keyboard takes part of it
  // on a phone) leaves less room below than above. Measured whenever the list opens or changes.
  const [place, setPlace] = useState({ up: false, max: LIST_MAX })
  useLayoutEffect(() => {
    const field = inputRef.current
    if (!showList || !field) return
    const vv = window.visualViewport
    const rect = field.getBoundingClientRect()
    const below = (vv ? vv.offsetTop + vv.height : window.innerHeight) - rect.bottom - 12
    const above = rect.top - (vv?.offsetTop ?? 0) - TOP_BAR - 12
    const up = below < Math.min(LIST_MAX, hits.length * 52 + 8) && above > below
    setPlace({ up, max: Math.max(120, Math.min(LIST_MAX, up ? above : below)) })
  }, [showList, hits.length])

  function pick(id: string, name: string) {
    setPicked(id)
    setQuery(name)
    setOpen(false)
  }

  function submit(id: string) {
    onSubmit(id)
    setQuery('')
    setPicked(null)
    setOpen(false)
    setActive(0)
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (hits.length === 0) return
      e.preventDefault()
      setOpen(true)
      setActive(a => (e.key === 'ArrowDown' ? (a + 1) % hits.length : (a - 1 + hits.length) % hits.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (picked) submit(picked)
      else if (showList && hits[active]) submit(hits[active].sage.id)
    } else if (e.key === 'Escape') {
      if (showList) setOpen(false)
      else { setQuery(''); setPicked(null) }
    }
  }

  return (
    <div className="relative mt-6">
      <label htmlFor={`${listId}-input`} className="sr-only">{S.inputLabel[locale]}</label>
      <div className="flex gap-2">
        <input
          id={`${listId}-input`}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? `${listId}-list` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits[active] ? `${listId}-opt-${hits[active].sage.id}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          dir={query ? 'auto' : locale === 'he' ? 'rtl' : 'ltr'}
          value={query}
          placeholder={S.placeholder[locale]}
          onChange={e => { setQuery(e.target.value); setPicked(null); setActive(0); setOpen(true) }}
          onFocus={() => { loadAliases(); setOpen(true) }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 rounded-xl border border-ink-600/60 bg-ink-800/60 px-4 py-3 text-base text-ink-50 placeholder:text-ink-500 focus:border-gold-500/60 focus:outline-none focus:ring-1 focus:ring-gold-500/40"
        />
        <button type="button" disabled={!picked} onClick={() => picked && submit(picked)} className={cn(primary, 'px-5')}>
          {S.guess[locale]}
        </button>
      </div>

      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          // pressing a name must not blur the field first, or the list would close before the press lands
          onMouseDown={e => e.preventDefault()}
          style={{ maxHeight: place.max }}
          className={cn(
            'absolute inset-x-0 z-20 overflow-y-auto rounded-xl border border-ink-600/50 bg-ink-800 py-1 shadow-glass-lg',
            place.up ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {hits.length === 0 && <li className="px-4 py-3 text-sm text-ink-400">{S.noMatch[locale]}</li>}
          {hits.map((h, i) => {
            const c = candidates.find(x => x.id === h.sage.id)
            return (
              <li
                key={h.sage.id}
                id={`${listId}-opt-${h.sage.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h.sage.id, h.sage.label)}
                className={cn(
                  'flex min-h-[44px] cursor-pointer items-center justify-between gap-3 px-4 py-2',
                  i === active ? 'bg-gold-500/15' : 'hover:bg-ink-700/40',
                )}
              >
                <span className="min-w-0">
                  <span dir="auto" className="block truncate font-serif text-base text-ink-50"><Highlighted text={h.sage.label} range={h.nameRange} /></span>
                  {h.via && <span dir="auto" className="block truncate text-xs text-ink-400">{h.via}</span>}
                </span>
                {c && <span className="flex-shrink-0 text-xs text-ink-400">{ERA_LABELS[ALL_PERIODS[c.period]]?.[locale]}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ── The end: the sage, the share, the statistics, the countdown ──────── */

function EndScreen({ sectionRef, locale, payload, state, feedback, pageUrl }: {
  sectionRef: React.RefObject<HTMLElement | null>
  locale: Locale
  payload: RiddlePayload
  state: RiddleState
  feedback: (GuessFeedback | null)[]
  pageUrl: string
}) {
  const { card } = payload
  const text = useMemo(
    () => shareText({
      locale, number: payload.number, url: pageUrl, won: state.won,
      feedback: feedback.map(f => f ?? { era: 'same', region: 'other', linked: false }),
    }),
    [locale, payload.number, pageUrl, state.won, feedback],
  )

  async function share() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean }
    const data: ShareData = { text }
    if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare(data))) {
      try {
        await nav.share(data)
        track('riddle_share', { locale, method: 'share' })
        return
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return // the sheet was closed
      }
    }
    const ok = await copyText(text)
    showToast(ok ? S.copied[locale] : S.copyFailed[locale])
    if (ok) track('riddle_share', { locale, method: 'copy' })
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="riddle-end"
      className={cn(
        'mt-6 scroll-mt-20 rounded-2xl border p-5 sm:p-7',
        state.won ? 'border-emerald-400/40 bg-emerald-500/[0.07]' : 'border-gold-500/30 bg-gold-500/[0.06]',
      )}
    >
      <p className="text-sm font-semibold text-gold-300">
        <span aria-hidden>{state.won ? '🎯' : '🧩'}</span>{' '}
        <span id="riddle-end">{state.won ? S.found[locale] : S.lost[locale]}</span>
        {state.won
          ? <span className="text-ink-300"> · {fill(S.foundIn[locale], { n: state.guesses.length, m: MAX_GUESSES })}</span>
          : <span className="text-ink-300"> · {S.lostSub[locale]}</span>}
      </p>

      <h2 className="mt-3 font-serif text-3xl font-bold leading-tight text-ink-50 md:text-4xl">
        <a href={card.sageHref} className="hover:text-gold-300">{card.name}</a>
      </h2>
      {card.tagline && <p className="mt-1 font-serif text-lg text-gold-300">{card.tagline}</p>}
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-300">
        <EraChip period={card.period} locale={locale} size="sm" />
        {card.years && <span className="tabular-nums">{card.years}</span>}
      </p>
      {card.bio && <p className="mt-4 leading-relaxed text-ink-200">{card.bio}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <a href={card.sageHref} className={primary}>{S.openPage[locale]}</a>
        <a href={card.towerHref} className={secondary}>{S.inTower[locale]}</a>
        {card.quizHref && <a href={card.quizHref} className={secondary}>{S.quiz[locale]}</a>}
      </div>

      <div className="mt-7 border-t border-ink-700/50 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-400">{S.shareHeading[locale]}</h3>
        <pre
          dir="ltr"
          data-testid="riddle-share-text"
          className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-ink-700/50 bg-ink-800/50 px-4 py-3 font-sans text-sm leading-relaxed text-ink-100"
        >{text}</pre>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={share} className={primary}><span aria-hidden>📤</span>{S.share[locale]}</button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('riddle_share', { locale, method: 'whatsapp' })}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-600/50 px-4 py-2 text-sm text-ink-200 transition-colors hover:border-gold-500/40 hover:text-ink-50"
          >
            <span aria-hidden>💬</span>{S.whatsapp[locale]}
          </a>
        </div>
        <p className="mt-2 text-xs text-ink-500">{S.shareNote[locale]}</p>
      </div>

      <Stats locale={locale} stats={state.stats} day={payload.day} guesses={state.won ? state.guesses.length : 0} />
      <Countdown locale={locale} />

      {/* the other daily game; a plain link, as the connect page ships a net of its own */}
      <div data-testid="riddle-other-game" className="mt-7 rounded-xl border border-gold-500/30 bg-gold-500/[0.05] p-4">
        <p className="font-serif text-lg font-bold text-ink-50"><span aria-hidden>🔗</span> {S.otherGame[locale]}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-300">{S.otherGameBody[locale]}</p>
        <a href={`/${locale}/connect`} className={cn(primary, 'mt-3')}>{S.otherGameGo[locale]}</a>
      </div>
    </section>
  )
}

function Stats({ locale, stats, day, guesses }: { locale: Locale; stats: RiddleStats; day: number; guesses: number }) {
  const max = Math.max(1, ...stats.dist)
  const pct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0
  const cells: Array<[string, string | number]> = [
    [S.played[locale], stats.played], [S.winPct[locale], `${pct}%`],
    [S.current[locale], currentStreak(stats, day)], [S.best[locale], stats.maxStreak],
  ]
  return (
    <div className="mt-7 border-t border-ink-700/50 pt-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-400">{S.statsHeading[locale]}</h3>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {cells.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-ink-700/50 bg-ink-800/40 px-1 py-2.5">
            <dd className="font-serif text-2xl font-bold tabular-nums text-ink-50" dir="ltr">{value}</dd>
            <dt className="mt-0.5 text-[11px] leading-tight text-ink-400">{label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-ink-500">{S.distribution[locale]}</p>
      <ol className="mt-2 space-y-1" dir="ltr">
        {stats.dist.map((n, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-end tabular-nums text-ink-400">{i + 1}</span>
            <span className="flex-1">
              <span
                className={cn('block min-w-[1.5rem] rounded-sm px-1.5 py-0.5 text-end tabular-nums', i + 1 === guesses ? 'bg-emerald-500/70 text-ink-900' : 'bg-ink-600/60 text-ink-50')}
                style={{ width: `${Math.max(8, (n / max) * 100)}%` }}
              >{n}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** The time to the next riddle, ticking; at zero the page offers a reload (it is rebuilt every half hour). */
function Countdown({ locale }: { locale: Locale }) {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const target = nextRiddleAt(new Date())
    const tick = () => setLeft(Math.max(0, target - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  if (left === null) return null
  return (
    <div className="mt-7 border-t border-ink-700/50 pt-5 text-center">
      {left > 0 ? (
        <>
          <p className="text-xs uppercase tracking-widest text-ink-400">{S.next[locale]}</p>
          <p dir="ltr" className="mt-1 font-serif text-3xl font-bold tabular-nums text-gold-300">{formatCountdown(left)}</p>
        </>
      ) : (
        <>
          <p className="font-semibold text-gold-300">{S.newReady[locale]}</p>
          <button type="button" onClick={() => window.location.reload()} className={cn(primary, 'mt-3')}>{S.reload[locale]}</button>
        </>
      )}
    </div>
  )
}
