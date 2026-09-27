'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ERA_COLORS } from '@/lib/types'
import type { Locale } from '@/lib/types'
import type { JourneyCentre, JourneyFigure } from '@/lib/journey'
import { useJourneyStore } from '@/lib/journeyStore'
import { placeName } from '@/lib/journeyPlaces'
import { displayName } from '@/lib/displayName'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatYear, formatYearRangeFor } from '@/lib/utils'
import { tr } from '@/lib/i18n'

const TOP_CENTRES = 5
const TOP_SAGES = 8

/**
 * Who is active at the current year: the leading centres (a click focuses one
 * and lists everyone there) and the most connected sages (a click opens their
 * card). On phones it folds into a pill until opened.
 */
export function JourneyPanel({ locale, compact, filtered, onFocusCentre }: {
  locale: Locale
  compact: boolean
  /** A filter narrows the journey to part of the corpus. */
  filtered: boolean
  onFocusCentre: (centre: JourneyCentre) => void
}) {
  const snapshot = useJourneyStore(s => s.snapshot)
  const focus = useJourneyStore(s => s.focus)
  const setFocus = useJourneyStore(s => s.setFocus)
  const selectSage = useAppStore(s => s.selectSage)
  const selectedSageId = useAppStore(s => s.selectedSageId)
  const [open, setOpen] = useState(!compact)

  // A centre tapped on the map opens the folded panel on phones.
  useEffect(() => { if (focus && compact) setOpen(true) }, [focus, compact])
  useEffect(() => { setOpen(!compact) }, [compact])

  if (!snapshot) return null
  const focused = focus ? snapshot.centres.find(c => c.key === focus) ?? null : null
  const count = snapshot.active.length

  const panelId = 'journey-panel-body'

  return (
    <div
      className={cn(
        'absolute z-[1002] start-3 md:start-4 glass rounded-xl border border-ink-700/50 shadow-glass flex flex-col overflow-hidden',
        compact
          ? cn('top-[8.75rem] max-h-[calc(100%-8.75rem-20.5rem)]', open ? 'w-[min(15.5rem,calc(100%-1.5rem))]' : 'w-auto')
          : 'top-[8.25rem] w-64 max-h-[calc(100%-8.25rem-12.75rem)]',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center justify-between gap-2 px-3 py-2 text-start hover:bg-ink-700/30 transition-colors flex-shrink-0"
      >
        <span className="text-[11px] font-sans font-bold text-gold-300">
          <Heading locale={locale} />
          <span className="ms-1.5 text-ink-400 font-normal">({count})</span>
          {filtered && <span className="ms-1.5 text-ink-500 font-normal">{tr(locale, '· מסונן', '· filtered', '· с фильтром')}</span>}
        </span>
        <span className="text-ink-500 text-xs" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div id={panelId} className="px-2 pb-2.5 overflow-y-auto overscroll-contain">
          {focus ? (
            <FocusedCentre
              locale={locale}
              place={focus}
              centre={focused}
              selectedSageId={selectedSageId}
              onBack={() => setFocus(null)}
              onSage={f => selectSage(f.sage)}
            />
          ) : count === 0 ? (
            <p className="px-1.5 py-2 text-[11px] font-sans text-ink-500 leading-relaxed">
              {tr(locale,
                'אין במאגר חכמים הפעילים בשנה זו.',
                'No sage in the corpus is active in this year.',
                'В базе нет мудрецов, активных в этом году.')}
            </p>
          ) : (
            <>
              <SectionTitle>{tr(locale, 'מרכזים', 'Centres', 'Центры')}</SectionTitle>
              <ul className="space-y-0.5">
                {snapshot.centres.slice(0, TOP_CENTRES).map(c => (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => { setFocus(c.key); onFocusCentre(c) }}
                      className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-start hover:bg-ink-700/40 transition-colors"
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ERA_COLORS[c.period] }} aria-hidden="true" />
                      <span className="flex-1 min-w-0 truncate font-serif text-[13px] text-ink-100">{placeName(c.key, locale)}</span>
                      <span className="font-sans text-[11px] tabular-nums text-ink-300">{c.count}</span>
                      <Trend locale={locale} trend={c.trend} />
                    </button>
                  </li>
                ))}
              </ul>
              <SectionTitle>{tr(locale, 'חכמים', 'Sages', 'Мудрецы')}</SectionTitle>
              <SageList locale={locale} figures={snapshot.active.slice(0, TOP_SAGES)} selectedSageId={selectedSageId} onSage={f => selectSage(f.sage)} showPlace />
              {count > TOP_SAGES && (
                <p className="px-1.5 pt-1 text-[10px] font-sans text-ink-500">
                  {tr(locale, `ועוד ${count - TOP_SAGES}; בחרו מרכז כדי לראות את כולם`, `and ${count - TOP_SAGES} more; pick a centre to see everyone`, `и ещё ${count - TOP_SAGES}; выберите центр, чтобы увидеть всех`)}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** "Active in 1200": follows the slider even while the cast is unchanged. */
function Heading({ locale }: { locale: Locale }) {
  const y = formatYear(useJourneyStore(s => Math.round(s.year)), locale)
  return <>{tr(locale, `פעילים ב־${y}`, `Active in ${y}`, `Активны в ${y}`)}</>
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="px-1.5 pt-2 pb-1 text-[9.5px] font-sans font-semibold uppercase tracking-widest text-ink-500">{children}</p>
  )
}

function Trend({ locale, trend }: { locale: Locale; trend: number }) {
  if (Math.abs(trend) < 0.5) return <span className="w-3" aria-hidden="true" />
  const up = trend > 0
  const label = up
    ? tr(locale, 'בעלייה לעומת 50 שנה קודם', 'rising against 50 years earlier', 'растёт по сравнению с 50 годами ранее')
    : tr(locale, 'בירידה לעומת 50 שנה קודם', 'falling against 50 years earlier', 'убывает по сравнению с 50 годами ранее')
  return (
    <span className={cn('w-3 text-[11px] font-bold', up ? 'text-emerald-400' : 'text-ink-500')} title={label}>
      <span aria-hidden="true">{up ? '↑' : '↓'}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

function SageList({ locale, figures, selectedSageId, onSage, showPlace }: {
  locale: Locale
  figures: JourneyFigure[]
  selectedSageId: string | null
  onSage: (f: JourneyFigure) => void
  showPlace?: boolean
}) {
  return (
    <ul className="space-y-0.5">
      {figures.map(f => {
        const approx = f.kind !== 'exact'
        const years = f.kind === 'era'
          ? tr(locale, 'ללא שנים; לפי התקופה', 'no years; by era', 'без дат; по эпохе')
          : formatYearRangeFor(locale, f.sage.birth_year, f.sage.death_year, f.sage.date_precision)
        return (
          <li key={f.sage.id}>
            <button
              type="button"
              onClick={() => onSage(f)}
              aria-current={selectedSageId === f.sage.id ? 'true' : undefined}
              className={cn(
                'w-full flex items-start gap-2 px-1.5 py-1 rounded-md text-start transition-colors',
                selectedSageId === f.sage.id ? 'bg-gold-500/20' : 'hover:bg-ink-700/40',
              )}
            >
              <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: ERA_COLORS[f.sage.period] }} aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block truncate font-serif text-[13px] text-ink-100">{displayName(f.sage.label)}</span>
                <span className="block truncate font-sans text-[10.5px] text-ink-400">
                  {showPlace && <>{placeName(f.place, locale)} · </>}
                  {approx && (
                    <span title={tr(locale, 'תיארוך משוער', 'approximate dating', 'приблизительная датировка')}>~ </span>
                  )}
                  {years}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function FocusedCentre({ locale, place, centre, selectedSageId, onBack, onSage }: {
  locale: Locale
  place: string
  centre: JourneyCentre | null
  selectedSageId: string | null
  onBack: () => void
  onSage: (f: JourneyFigure) => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mt-1 mb-1 px-1.5 py-0.5 rounded-md text-[11px] font-sans text-ink-400 hover:text-gold-300 transition-colors"
      >
        <span aria-hidden="true">{locale === 'he' ? '→' : '←'}</span> {tr(locale, 'כל המרכזים', 'All centres', 'Все центры')}
      </button>
      <p className="px-1.5 font-serif font-bold text-[15px] text-ink-100">
        {placeName(place, locale)}
        {centre && <span className="ms-1.5 font-sans text-[11px] font-normal text-ink-400">{centre.count}</span>}
      </p>
      {centre ? (
        <div className="mt-1">
          <SageList locale={locale} figures={centre.figures} selectedSageId={selectedSageId} onSage={onSage} />
        </div>
      ) : (
        <p className="px-1.5 py-2 text-[11px] font-sans text-ink-500 leading-relaxed">
          {tr(locale, 'אין כאן חכמים פעילים בשנה זו.', 'No sage is active here in this year.', 'Здесь в этом году нет активных мудрецов.')}
        </p>
      )}
    </div>
  )
}
