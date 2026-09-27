'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { Locale } from '@/lib/types'

const STORAGE_KEY = 'ozar-tour-v1'

interface TourStep {
  /**
   * Where to point: CSS selectors, first visible match wins (the desktop
   * search box and the phone's search button are different elements).
   * null = a centred card.
   */
  target: string[] | null
  title: Record<Locale, string>
  body:  Record<Locale, string>
}

const STEPS: TourStep[] = [
  {
    target: null,
    title: { he: 'ברוכים הבאים לאוצר חכמים', en: 'Welcome to Ozar Chachamim', ru: 'Добро пожаловать в Оцар Хахамим' },
    body: {
      he: 'מפת הידע האינטראקטיבית של חכמי ישראל לדורותיהם — רשת קשרים, מפה גיאוגרפית, ציר זמן ועוד. סיור קצר של דקה יראה לכם את העיקר.',
      en: 'The interactive knowledge map of Jewish sages across the generations — a connection network, geographic map, timeline and more. A one-minute tour shows you the essentials.',
      ru: 'Интерактивная карта знаний еврейских мудрецов всех поколений — сеть связей, географическая карта, хронология и многое другое. Минутный тур покажет главное.',
    },
  },
  {
    target: ['[data-tour="search"]', '[data-tour="search-fab"]'],
    title: { he: 'חיפוש חכם', en: 'Smart search', ru: 'Умный поиск' },
    body: {
      he: 'הקלידו שם, ראשי תיבות, תקופה או מקום. החיפוש סלחני לכתיב — "רמבם" ימצא את הרמב״ם, וגם "Maimonides". אפשר גם Ctrl+K.',
      en: 'Type a name, an acronym, an era or a place. Search is spelling-tolerant — "rambam" or "Maimonides" finds the Rambam. Ctrl+K works too.',
      ru: 'Введите имя, аббревиатуру, эпоху или место. Поиск терпим к написанию — «rambam» или «Maimonides» найдёт Рамбама. Работает и Ctrl+K.',
    },
  },
  {
    target: ['[data-tour="tabs"]'],
    title: { he: 'התצוגות', en: 'The views', ru: 'Представления' },
    body: {
      he: 'רשת קשרים, גיאוגרפיה, מסורות, טבלה, ציר זמן ועץ שושלות. בחירת חכם באחת התצוגות תסומן גם בשאר.',
      en: 'Network, geography, traditions, table, timeline and lineage tree. Selecting a sage in one view highlights it in the others.',
      ru: 'Сеть, география, традиции, таблица, хронология и древо династий. Выбор мудреца в одном виде подсвечивает его в остальных.',
    },
  },
  {
    target: ['[data-tour="legend"]'],
    title: { he: 'מקרא וצבעים', en: 'Legend & colors', ru: 'Легенда и цвета' },
    body: {
      he: 'צבעי הצמתים לפי תקופה או אזור, וסוגי הקשרים לפי סגנון הקו. החצים מצביעים מהרב לתלמיד ומהמשפיע למושפע.',
      en: 'Node colors follow era or region; line styles encode connection types. Arrows point from teacher to student, from influencer to influenced.',
      ru: 'Цвета узлов — по эпохе или региону; стили линий — типы связей. Стрелки идут от учителя к ученику, от влияющего к испытавшему влияние.',
    },
  },
  {
    target: ['[data-tour="graph-tools"]'],
    title: { he: 'מיקוד ומסלולים', en: 'Focus & paths', ru: 'Фокус и пути' },
    body: {
      he: 'לחיצה על חכם ממקדת את הרשת בו ובשכניו (Esc או לחיצה על רקע ריק יוצאים). כפתור המפה כאן מוצא את שרשרת הקשרים בין שני חכמים ומצייר אותה.',
      en: 'Click a sage to focus the network on them and their neighbours (Esc or a click on empty space exits). The map button here finds the chain of links between two sages and draws it.',
      ru: 'Клик по мудрецу фокусирует сеть на нём и его соседях (Esc или клик по пустому месту — выход). Кнопка-карта здесь находит цепочку связей между двумя мудрецами и рисует её.',
    },
  },
  {
    target: ['[data-tour="header-actions"]'],
    title: { he: 'סינון, ערכת נושא ושפה', en: 'Filters, theme & language', ru: 'Фильтры, тема и язык' },
    body: {
      he: 'סינון מתקדם לפי תקופה/אזור/תחום, מעבר בין מצב כהה לבהיר, והחלפת שפה עברית/אנגלית/רוסית.',
      en: 'Advanced filtering by era/region/field, dark-light theme toggle, and Hebrew/English/Russian switching.',
      ru: 'Расширенная фильтрация по эпохе/региону/области, переключение тёмной и светлой темы, выбор языка — иврит/английский/русский.',
    },
  },
]

const T: Record<Locale, { step: (x: number, y: number) => string; next: string; back: string; skip: string; done: string; label: string }> = {
  he: { step: (x, y) => `שלב ${x} מתוך ${y}`, next: 'הבא', back: 'הקודם', skip: 'דלג', done: 'סיימנו — קדימה!', label: 'סיור מודרך' },
  en: { step: (x, y) => `Step ${x} of ${y}`, next: 'Next', back: 'Back', skip: 'Skip', done: 'Done — let’s go!', label: 'Guided tour' },
  ru: { step: (x, y) => `Шаг ${x} из ${y}`, next: 'Далее', back: 'Назад', skip: 'Пропустить', done: 'Готово — вперёд!', label: 'Обучающий тур' },
}

interface Rect { top: number; left: number; width: number; height: number }

/** First element matching any selector that is actually on screen. */
function findTarget(selectors: string[]): Element | null {
  for (const sel of selectors) {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
        && r.bottom > 0 && r.top < window.innerHeight) return el
    }
  }
  return null
}

const FOCUSABLE = 'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'

export function OnboardingTour({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(false)
  const [steps, setSteps]   = useState<TourStep[]>(STEPS)
  const [step, setStep]     = useState(0)
  const [rect, setRect]     = useState<Rect | null>(null)
  const [cardH, setCardH]   = useState(240)
  const cardRef   = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const isLoaded = useAppStore(s => s.isLoaded)
  const isHe = locale === 'he'
  const t = T[locale]
  const titleId = useId()
  const bodyId = useId()

  /** Only the steps whose target is on screen now: never point at nothing. */
  const start = useCallback(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null
    setSteps(STEPS.filter(s => !s.target || findTarget(s.target)))
    setStep(0)
    setActive(true)
  }, [])

  // Launch on first visit (after data settles) or via the header help button
  useEffect(() => {
    let seen = true
    try { seen = localStorage.getItem(STORAGE_KEY) === '1' } catch { /* noop */ }
    if (!seen && isLoaded) {
      const timer = setTimeout(start, 900)
      return () => clearTimeout(timer)
    }
  }, [isLoaded, start])

  useEffect(() => {
    window.addEventListener('ozar-start-tour', start)
    return () => window.removeEventListener('ozar-start-tour', start)
  }, [start])

  // Measure spotlight target
  const measure = useCallback(() => {
    const sel = steps[step]?.target
    const el = sel ? findTarget(sel) : null
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 })
  }, [step, steps])

  useEffect(() => {
    if (!active) return
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, measure])

  // The card's real height decides whether it fits below the target
  useLayoutEffect(() => {
    if (active && cardRef.current) setCardH(cardRef.current.offsetHeight)
  }, [active, step, locale])

  // Focus the main action on every step
  useEffect(() => {
    if (active) primaryRef.current?.focus()
  }, [active, step])

  const finish = useCallback(() => {
    setActive(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
    returnFocusRef.current?.focus?.()
  }, [])

  // Keyboard: Esc closes, arrows step (in reading direction), Tab stays inside
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        finish()
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const fwd = isHe ? e.key === 'ArrowLeft' : e.key === 'ArrowRight'
        setStep(s => Math.max(0, Math.min(steps.length - 1, s + (fwd ? 1 : -1))))
        return
      }
      if (e.key === 'Tab' && cardRef.current) {
        const items = [...cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
        if (!items.length) return
        const first = items[0], last = items[items.length - 1]
        const inside = cardRef.current.contains(document.activeElement)
        if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus() }
      }
    }
    // capture: the tour is on top, so its Esc must not also close what's under it
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [active, finish, isHe, steps.length])

  if (!active || !steps.length) return null

  const s      = steps[Math.min(step, steps.length - 1)]
  const isLast = step >= steps.length - 1

  // Card position: below the spotlight when it fits, else above; centred otherwise
  const vw = window.innerWidth, vh = window.innerHeight
  const cardW = Math.min(340, vw - 32)
  let cardStyle: React.CSSProperties
  if (rect) {
    const below = rect.top + rect.height + 14
    const top = below + cardH <= vh - 12
      ? below
      : Math.max(12, rect.top - 14 - cardH)
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - cardW / 2, vw - cardW - 16))
    cardStyle = { position: 'fixed', top, left, width: cardW }
  } else {
    cardStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: cardW }
  }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true"
      aria-labelledby={titleId} aria-describedby={bodyId}>
      {/* Backdrop with spotlight hole */}
      {rect ? (
        <div
          className="fixed rounded-2xl transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top, left: rect.left, width: rect.width, height: rect.height,
            boxShadow: '0 0 0 9999px rgba(5,4,2,0.72)',
            border: '1.5px solid rgba(201,151,58,0.6)',
          }}
        />
      ) : (
        <div className="fixed inset-0" style={{ background: 'rgba(5,4,2,0.72)' }} onClick={finish} />
      )}

      {/* Step card */}
      <div
        ref={cardRef}
        className="glass rounded-2xl border border-gold-500/30 shadow-glass-lg p-5 animate-fade-in"
        style={cardStyle}
        dir={isHe ? 'rtl' : 'ltr'}
      >
        <p className="text-[10px] font-sans font-semibold tracking-wide text-gold-400 mb-1.5" aria-live="polite">
          {t.step(step + 1, steps.length)}
        </p>
        <h2 id={titleId} className="font-serif text-lg font-bold text-ink-50 mb-2">{s.title[locale]}</h2>
        <p id={bodyId} className="text-sm font-sans text-ink-300 leading-relaxed mb-4">{s.body[locale]}</p>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-4" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={cn(
              'h-1.5 rounded-full transition-all',
              i === step ? 'w-5 bg-gold-400' : 'w-1.5 bg-ink-600',
            )} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            ref={primaryRef}
            onClick={() => isLast ? finish() : setStep(x => x + 1)}
            className="flex-1 py-2 rounded-xl text-sm font-sans font-medium bg-gold-500/20 border border-gold-500/40 text-gold-300 hover:bg-gold-500/30 transition-all"
          >
            {isLast ? t.done : t.next}
          </button>
          {step > 0 && (
            <button
              onClick={() => setStep(x => Math.max(0, x - 1))}
              className="px-4 py-2 rounded-xl text-sm font-sans border border-ink-600/40 text-ink-300 hover:text-ink-100 transition-all"
            >
              {t.back}
            </button>
          )}
          {!isLast && (
            <button
              onClick={finish}
              className="px-3 py-2 text-xs font-sans text-ink-500 hover:text-ink-300 transition-colors"
            >
              {t.skip}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
