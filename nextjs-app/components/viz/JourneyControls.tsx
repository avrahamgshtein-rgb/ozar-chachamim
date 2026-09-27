'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ALL_PERIODS, ERA_COLORS, ERA_LABELS } from '@/lib/types'
import type { Locale } from '@/lib/types'
import { ALL_MILESTONES } from '@/lib/milestones'
import { JOURNEY_END, JOURNEY_ERA_WINDOW, JOURNEY_START, clampYear, eraAt } from '@/lib/journey'
import { JOURNEY_SPEEDS, useJourneyStore } from '@/lib/journeyStore'
import { cn, formatYear } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import { REDUCED_STEP_YEARS } from './JourneyLayer'

const SPAN = JOURNEY_END - JOURNEY_START
const pct = (y: number) => ((clampYear(y) - JOURNEY_START) / SPAN) * 100

/** Years a keyboard arrow or a step button moves; Shift (or PageUp/Down) moves more. */
export const KEY_STEP = 10
export const KEY_BIG_STEP = 100

/**
 * The dock under the map: play/pause, steps, the time slider (era bands and
 * milestone ticks under a native range input, so it keeps its keyboard and
 * screen-reader behaviour), speed, follow-camera and the legend.
 *
 * Time runs left to right here in every locale, like the Timeline tab.
 */
export function JourneyControls({ locale, compact, reducedMotion }: {
  locale: Locale
  compact: boolean
  reducedMotion: boolean
}) {
  const year = useJourneyStore(s => Math.round(s.year))
  const playing = useJourneyStore(s => s.playing)
  const speed = useJourneyStore(s => s.speed)
  const follow = useJourneyStore(s => s.follow)
  const { setYear, setPlaying, setSpeed, setFollow } = useJourneyStore.getState()
  const [legendOpen, setLegendOpen] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackW, setTrackW] = useState(0)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setTrackW(el.clientWidth))
    ro.observe(el)
    setTrackW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const step = reducedMotion ? REDUCED_STEP_YEARS : KEY_STEP
  const stepBy = (d: number) => {
    setPlaying(false)
    const y = useJourneyStore.getState().year
    setYear(reducedMotion ? Math.round((y + d) / REDUCED_STEP_YEARS) * REDUCED_STEP_YEARS : Math.round(y + d))
  }
  const togglePlay = () => {
    const s = useJourneyStore.getState()
    if (!s.playing && s.year >= JOURNEY_END) setYear(JOURNEY_START)
    setPlaying(!s.playing)
  }
  const nextSpeed = () => {
    const i = JOURNEY_SPEEDS.indexOf(speed as (typeof JOURNEY_SPEEDS)[number])
    setSpeed(JOURNEY_SPEEDS[(i + 1) % JOURNEY_SPEEDS.length])
  }

  const era = eraAt(year)
  const valueText = `${formatYear(year, locale)}${era ? `, ${ERA_LABELS[era][locale]}` : ''}`
  const speedLabel = `${speed === 0.5 ? '½' : speed}×`

  const btn = 'flex items-center justify-center rounded-full transition-colors text-ink-300 hover:text-gold-300 hover:bg-ink-700/50'

  return (
    <div
      className={cn(
        'absolute z-[1003] inset-x-3 mx-auto journey-glass rounded-2xl border border-ink-700/50 shadow-glass',
        compact ? 'bottom-[12.4rem] px-3 pt-2 pb-2' : 'bottom-[6.25rem] max-w-3xl px-4 pt-2.5 pb-2.5',
      )}
      role="group"
      aria-label={tr(locale, 'בקרת מסע התורה', 'Torah journey controls', 'Управление путешествием Торы')}
    >
      {legendOpen && <JourneyLegend locale={locale} onClose={() => setLegendOpen(false)} />}

      <div className={cn('flex items-center', compact ? 'flex-col gap-1.5' : 'gap-3')}>
        {/* Transport */}
        <div className={cn('flex items-center gap-1', compact && 'order-2 w-full justify-between')} dir="ltr">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => stepBy(-5 * step)} className={cn(btn, 'w-8 h-8')}
              aria-label={tr(locale, `אחורה ${5 * step} שנה`, `Back ${5 * step} years`, `Назад на ${5 * step} лет`)}>
              <Icon d="M11 7l-5 5 5 5M18 7l-5 5 5 5" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-pressed={playing}
              aria-label={playing ? tr(locale, 'השהה', 'Pause', 'Пауза') : tr(locale, 'נגן', 'Play', 'Воспроизвести')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gold-500 text-ink-900 hover:bg-gold-400 shadow-glass transition-colors"
            >
              {playing
                ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                : <svg viewBox="0 0 24 24" className="w-4 h-4 translate-x-[1px]" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>}
            </button>
            <button type="button" onClick={() => stepBy(5 * step)} className={cn(btn, 'w-8 h-8')}
              aria-label={tr(locale, `קדימה ${5 * step} שנה`, `Forward ${5 * step} years`, `Вперёд на ${5 * step} лет`)}>
              <Icon d="M6 7l5 5-5 5M13 7l5 5-5 5" />
            </button>
          </div>
          {compact && extras()}
        </div>

        {/* Track */}
        <div className={cn('relative flex-1 min-w-0', compact && 'order-1 w-full')} dir="ltr">
          <div ref={trackRef} className="relative h-9">
            {/* Milestone ticks above the bands */}
            {ALL_MILESTONES.map(m => (
              <button
                key={`${m.year}-${m.label.en}`}
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => { setPlaying(false); setYear(m.year) }}
                title={`${m.circa ? '~' : ''}${formatYear(m.year, locale)} · ${m.label[locale]}`}
                className="absolute top-0 -translate-x-1/2 w-3 h-3.5 flex justify-center group"
                style={{ left: `${pct(m.year)}%` }}
              >
                <span className={cn('block w-[2px] h-2.5 rounded-full transition-all group-hover:h-3.5',
                  m.kind === 'transmission' ? 'bg-gold-400' : 'bg-ink-400')} />
              </button>
            ))}
            {/* Era bands */}
            <div className="absolute inset-x-0 top-[15px] h-[7px] rounded-full bg-ink-700/60 overflow-hidden pointer-events-none">
              {ALL_PERIODS.map(p => {
                const [lo, hi] = JOURNEY_ERA_WINDOW[p]
                if (hi <= JOURNEY_START) return null
                return (
                  <span key={p} className="absolute inset-y-0 opacity-80"
                    style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%`, background: ERA_COLORS[p] }} />
                )
              })}
              <span className="absolute inset-y-0 left-0 bg-ink-100/15" style={{ width: `${pct(year)}%` }} />
            </div>
            {/* Era names where there is room */}
            {!compact && trackW > 0 && ALL_PERIODS.map(p => {
              const [lo, hi] = JOURNEY_ERA_WINDOW[p]
              if (hi <= JOURNEY_START) return null
              const w = ((pct(hi) - pct(lo)) / 100) * trackW
              const label = ERA_LABELS[p][locale]
              if (w < label.length * 5.6 + 6) return null
              return (
                <span key={p} className="absolute top-[24px] text-[9.5px] font-sans text-ink-400 text-center truncate pointer-events-none"
                  style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }}
                  dir={locale === 'he' ? 'rtl' : 'ltr'}>
                  {label}
                </span>
              )
            })}
            <input
              type="range"
              min={JOURNEY_START}
              max={JOURNEY_END}
              step={reducedMotion ? REDUCED_STEP_YEARS : 1}
              value={year}
              aria-label={tr(locale, 'שנה', 'Year', 'Год')}
              aria-valuetext={valueText}
              onChange={e => { setPlaying(false); setYear(Number(e.target.value)) }}
              onPointerDown={() => { setPlaying(false); setScrubbing(true) }}
              onPointerUp={() => setScrubbing(false)}
              onPointerCancel={() => setScrubbing(false)}
              onBlur={() => setScrubbing(false)}
              onKeyDown={e => {
                // Our own steps, so arrows move the same distance everywhere.
                const big = e.shiftKey ? KEY_BIG_STEP : step
                const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? big
                  : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -big
                  : e.key === 'PageUp' ? KEY_BIG_STEP : e.key === 'PageDown' ? -KEY_BIG_STEP : 0
                if (d) { e.preventDefault(); e.stopPropagation(); stepBy(d) }
              }}
              className="journey-range absolute inset-x-0 top-[5px] w-full h-7 cursor-pointer"
            />
            {(scrubbing || !compact) && (
              <span
                className={cn('absolute -translate-x-1/2 pointer-events-none font-sans font-bold tabular-nums whitespace-nowrap',
                  scrubbing ? 'top-[-1.35rem] text-[11px] text-gold-300 journey-glass rounded-md px-1.5 py-0.5' : 'hidden')}
                style={{ left: `${pct(year)}%` }}
              >
                {formatYear(year, locale)}
              </span>
            )}
          </div>
          <div className="flex justify-between text-[9.5px] font-sans text-ink-500 -mt-0.5 pointer-events-none">
            <span>{formatYear(JOURNEY_START, locale)}</span>
            <span>{formatYear(JOURNEY_END, locale)}</span>
          </div>
        </div>

        {!compact && extras()}
      </div>
    </div>
  )

  function extras() {
    return (
      <div className="flex items-center gap-1" dir="ltr">
        <button type="button" onClick={nextSpeed}
          className={cn(btn, 'h-8 min-w-[2.5rem] px-2 text-[11px] font-sans font-bold tabular-nums border border-ink-700/60')}
          aria-label={tr(locale, `מהירות ${speedLabel}. לחצו לשינוי`, `Speed ${speedLabel}. Click to change`, `Скорость ${speedLabel}. Нажмите, чтобы изменить`)}>
          {speedLabel}
        </button>
        {!reducedMotion && (
          <button type="button" onClick={() => setFollow(!follow)} aria-pressed={follow}
            className={cn(btn, 'w-8 h-8', follow && 'text-gold-300 bg-gold-500/15')}
            title={tr(locale, 'המצלמה עוקבת אחרי המרכזים', 'Camera follows the centres', 'Камера следует за центрами')}
            aria-label={tr(locale, 'מעקב מצלמה', 'Follow camera', 'Следовать камерой')}>
            <Icon d="M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </button>
        )}
        <button type="button" onClick={() => setLegendOpen(o => !o)} aria-expanded={legendOpen}
          className={cn(btn, 'w-8 h-8', legendOpen && 'text-gold-300 bg-gold-500/15')}
          aria-label={tr(locale, 'מקרא: מה רואים במפה', 'Legend: what the map shows', 'Легенда: что показывает карта')}>
          <Icon d="M12 11v5M12 8h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
        </button>
      </div>
    )
  }
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

/** What every mark on the journey means, stated as narrowly as the data allows. */
function JourneyLegend({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const rows: Array<{ mark: ReactNode; text: string }> = [
    {
      mark: <span className="block w-4 h-4 rounded-full bg-gold-400/40 ring-2 ring-gold-400/60" />,
      text: tr(locale,
        'מרכז: מקום שבו פעלו חכמים בשנה זו, בגודל לפי מספרם. כל חכם נספר פעם אחת, במקום שבו המפה מציבה אותו.',
        'Centre: a place where sages were active in this year, sized by how many. Each sage counts once, at the place the map pins them to.',
        'Центр: место, где в этом году действовали мудрецы; размер по их числу. Каждый мудрец учтён один раз, там, где его ставит карта.'),
    },
    {
      mark: <span className="block w-4 h-4 rounded-full border border-dashed border-ink-300" />,
      text: tr(locale,
        'טבעת מקווקוות: כל החכמים במרכז מתוארכים רק למאה או לתקופה, ולכן נספרים במשקל מופחת.',
        'Dashed ring: every sage there is dated only to a century or an era, so they count at reduced weight.',
        'Пунктирное кольцо: все мудрецы центра датированы лишь веком или эпохой и учитываются с меньшим весом.'),
    },
    {
      mark: <span className="block w-5 h-0 border-t-2 border-gold-400" />,
      text: tr(locale,
        'קשת זהובה: נדידה מתועדת. חכם שמסלול חייו עבר בין שני המקומות, בכיוון החץ. מוצגת בשנות חייו, כי לתחנות אין תאריכים.',
        'Gold arc: a documented migration. A sage whose life path ran between the two places, in the arrow’s direction. Shown during their lifetime, since the stops carry no dates.',
        'Золотая дуга: задокументированное переселение. Путь мудреца между двумя местами, по стрелке. Показана в годы его жизни: у остановок нет дат.'),
    },
    {
      mark: <span className="block w-5 h-0 border-t-2 border-dashed border-blue-400" />,
      text: tr(locale,
        'קשת כחולה מקווקוות: רב במקום אחד ותלמידו במקום אחר, בשנים שבהן חייהם חופפים.',
        'Dashed blue arc: a teacher in one place and his student in another, during the years their lives overlap.',
        'Синяя пунктирная дуга: учитель в одном месте и его ученик в другом, в годы, когда их жизни пересекаются.'),
    },
    {
      mark: <span className="text-emerald-400 font-bold text-sm">↑</span>,
      text: tr(locale,
        'חץ ברשימה: המרכז גדל או קטן לעומת 50 שנה קודם. קשת לעולם אינה נגזרת מגדילה וקטנה בלבד.',
        'Arrow in the list: the centre grew or shrank against 50 years earlier. No arc is ever inferred from growth and decline alone.',
        'Стрелка в списке: центр вырос или уменьшился по сравнению с 50 годами ранее. Дуги никогда не выводятся только из роста и спада.'),
    },
  ]
  return (
    <div className="absolute bottom-full mb-2 inset-x-0 mx-auto max-w-md journey-glass rounded-xl border border-ink-700/50 shadow-glass p-3 z-10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-sans font-bold text-gold-300">{tr(locale, 'מה רואים במפה', 'What the map shows', 'Что показывает карта')}</p>
        <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-100 text-sm px-1"
          aria-label={tr(locale, 'סגור מקרא', 'Close legend', 'Закрыть легенду')}>✕</button>
      </div>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="w-5 flex-shrink-0 flex justify-center pt-0.5" aria-hidden="true">{r.mark}</span>
            <span className="text-[11px] leading-snug font-sans text-ink-300">{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
