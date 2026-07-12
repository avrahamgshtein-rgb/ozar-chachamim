'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { Locale } from '@/lib/types'

const STORAGE_KEY = 'ozar-tour-v1'

interface TourStep {
  /** CSS selector of the element to spotlight; null = centered card */
  target: string | null
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
    target: '[data-tour="search"]',
    title: { he: 'חיפוש חכם', en: 'Smart search', ru: 'Умный поиск' },
    body: {
      he: 'הקלידו שם, תקופה או מקום. החיפוש סלחני לכתיב — "רמבם" ימצא את הרמב״ם. אפשר גם Ctrl+K.',
      en: 'Type a name, era or place. Search is spelling-tolerant — "rambam" finds Maimonides. Ctrl+K works too.',
      ru: 'Введите имя, эпоху или место. Поиск терпим к написанию — «рамбам» найдёт Маймонида. Работает и Ctrl+K.',
    },
  },
  {
    target: '[data-tour="tabs"]',
    title: { he: 'שש תצוגות', en: 'Six views', ru: 'Шесть представлений' },
    body: {
      he: 'רשת קשרים, גיאוגרפיה, מסורות, טבלה, שלשלת הקבלה ועץ שושלות. בחירת חכם באחת התצוגות תסומן גם בשאר.',
      en: 'Network, geography, traditions, table, timeline and lineage tree. Selecting a sage in one view highlights it in the others.',
      ru: 'Сеть, география, традиции, таблица, хронология и древо династий. Выбор мудреца в одном виде подсвечивает его в остальных.',
    },
  },
  {
    target: '[data-tour="legend"]',
    title: { he: 'מקרא וצבעים', en: 'Legend & colors', ru: 'Легенда и цвета' },
    body: {
      he: 'צבעי הצמתים לפי תקופה או אזור, וסוגי הקשרים לפי סגנון הקו. לחיצה על צומת פותחת תיק חכם מלא; לחיצה על קו מציגה את מהות הקשר.',
      en: 'Node colors follow era or region; line styles encode connection types. Click a node for the full sage dossier; click an edge to see the relationship.',
      ru: 'Цвета узлов — по эпохе или региону; стили линий — типы связей. Клик по узлу открывает досье мудреца; клик по линии — характер связи.',
    },
  },
  {
    target: '[data-tour="header-actions"]',
    title: { he: 'סינון, ערכת נושא ושפה', en: 'Filters, theme & language', ru: 'Фильтры, тема и язык' },
    body: {
      he: 'סינון מתקדם לפי תקופה/אזור/תחום, מעבר בין מצב כהה לבהיר, והחלפת שפה עברית/אנגלית/רוסית.',
      en: 'Advanced filtering by era/region/field, dark-light theme toggle, and Hebrew/English/Russian switching.',
      ru: 'Расширенная фильтрация по эпохе/региону/области, переключение тёмной и светлой темы, выбор языка — иврит/английский/русский.',
    },
  },
]

interface Rect { top: number; left: number; width: number; height: number }

export function OnboardingTour({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(false)
  const [step, setStep]     = useState(0)
  const [rect, setRect]     = useState<Rect | null>(null)
  const isLoaded = useAppStore(s => s.isLoaded)
  const isHe = locale === 'he'

  // Launch on first visit (after data settles) or via the header help button
  useEffect(() => {
    let seen = true
    try { seen = localStorage.getItem(STORAGE_KEY) === '1' } catch { /* noop */ }
    if (!seen && isLoaded) {
      const t = setTimeout(() => { setStep(0); setActive(true) }, 900)
      return () => clearTimeout(t)
    }
  }, [isLoaded])

  useEffect(() => {
    const start = () => { setStep(0); setActive(true) }
    window.addEventListener('ozar-start-tour', start)
    return () => window.removeEventListener('ozar-start-tour', start)
  }, [])

  // Measure spotlight target
  const measure = useCallback(() => {
    const sel = STEPS[step]?.target
    if (!sel) { setRect(null); return }
    const el = document.querySelector(sel)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 })
  }, [step])

  useEffect(() => {
    if (!active) return
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, measure])

  const finish = useCallback(() => {
    setActive(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const fwd = isHe ? e.key === 'ArrowLeft' : e.key === 'ArrowRight'
        setStep(s => Math.max(0, Math.min(STEPS.length - 1, s + (fwd ? 1 : -1))))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish, isHe])

  if (!active) return null

  const s      = STEPS[step]
  const isLast = step === STEPS.length - 1

  // Card position: below the spotlight when anchored, centered otherwise
  const cardStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: Math.min(rect.top + rect.height + 14, window.innerHeight - 240),
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 356)),
      }
    : {
        position: 'fixed',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true"
      aria-label={isHe ? 'סיור מודרך' : 'Guided tour'}>
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
        className="glass rounded-2xl border border-gold-500/30 shadow-glass-lg p-5 w-[340px] max-w-[calc(100vw-32px)] animate-fade-in"
        style={cardStyle}
        dir={isHe ? 'rtl' : 'ltr'}
      >
        <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-gold-400 mb-1.5">
          {step + 1} / {STEPS.length}
        </p>
        <h2 className="font-serif text-lg font-bold text-ink-50 mb-2">{s.title[locale]}</h2>
        <p className="text-sm font-sans text-ink-300 leading-relaxed mb-4">{s.body[locale]}</p>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-4" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={cn(
              'h-1.5 rounded-full transition-all',
              i === step ? 'w-5 bg-gold-400' : 'w-1.5 bg-ink-600',
            )} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => isLast ? finish() : setStep(x => x + 1)}
            className="flex-1 py-2 rounded-xl text-sm font-sans font-medium bg-gold-500/20 border border-gold-500/40 text-gold-300 hover:bg-gold-500/30 transition-all"
          >
            {isLast ? (isHe ? 'סיימנו — קדימה!' : 'Done — let’s go!') : (isHe ? 'הבא' : 'Next')}
          </button>
          {step > 0 && (
            <button
              onClick={() => setStep(x => Math.max(0, x - 1))}
              className="px-4 py-2 rounded-xl text-sm font-sans border border-ink-600/40 text-ink-300 hover:text-ink-100 transition-all"
            >
              {isHe ? 'הקודם' : 'Back'}
            </button>
          )}
          {!isLast && (
            <button
              onClick={finish}
              className="px-3 py-2 text-xs font-sans text-ink-500 hover:text-ink-300 transition-colors"
            >
              {isHe ? 'דלג' : 'Skip'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
