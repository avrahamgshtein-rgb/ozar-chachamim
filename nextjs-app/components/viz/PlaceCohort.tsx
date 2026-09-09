'use client'

/**
 * Who was at one place, across time.
 *
 * Opened by clicking a stop on a sage's migration path. Lists everyone
 * recorded at that place in chronological order, and — when the click came
 * from a particular sage's journey — marks who could actually have met them.
 *
 * The certain/possible split is load-bearing, not decoration: a sage known
 * only as "16th century" must never be presented as a confirmed contemporary
 * of someone with real dates, so century-precision records can never reach
 * 'certain'. See overlapOf in lib/placeIndex.
 */

import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { buildPlaceIndex, cohortAt, type Overlap } from '@/lib/placeIndex'
import { ERA_COLORS, ERA_LABELS, ALL_PERIODS } from '@/lib/types'
import { formatYearRange, cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

const BADGE: Record<Exclude<Overlap, 'unknown'>, { he: string; en: string; ru: string; cls: string }> = {
  certain:  { he: 'בן זמנו',        en: 'contemporary',  ru: 'современник', cls: 'bg-gold-500/20 text-gold-300 border-gold-500/40' },
  possible: { he: 'ייתכן שחפף',     en: 'possibly',      ru: 'возможно',    cls: 'bg-ink-700/40 text-ink-300 border-ink-600/50' },
}

interface Props { locale: Locale }

export function PlaceCohort({ locale }: Props) {
  const sages        = useAppStore(s => s.sages)
  const place        = useAppStore(s => s.filters.place)
  const anchorId     = useAppStore(s => s.placeAnchorId)
  const sageMap      = useAppStore(s => s.sageMap)
  const setPlaceFocus = useAppStore(s => s.setPlaceFocus)
  const selectSage   = useAppStore(s => s.selectSage)

  // Indexing all sages is O(n × gazetteer); memoised on the dataset so it runs
  // once per load rather than on every focus change.
  const index  = useMemo(() => buildPlaceIndex(sages), [sages])
  const anchor = anchorId ? sageMap.get(anchorId) ?? null : null
  const cohort = useMemo(
    () => (place ? cohortAt(index, place, anchor, ALL_PERIODS) : null),
    [index, place, anchor],
  )

  if (!place || !cohort) return null

  const stops = anchor?.migration_path
    ? [anchor.migration_path.from, ...(anchor.migration_path.intermediate ?? []), anchor.migration_path.to]
    : []

  const certainCount = [...cohort.overlap.values()].filter(v => v === 'certain').length

  return (
    // z-[1000]: Leaflet paints its own panes at 200–800 in this stacking
    // context, so anything lower renders behind the tiles — invisible but
    // still clickable.
    <div className="absolute bottom-6 end-4 z-[1000] w-72 max-h-[70vh] glass border border-ink-700/50 rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-ink-700/40">
        <div className="min-w-0">
          <p className="font-display text-sm text-gold-300 truncate">{place}</p>
          <p className="text-[11px] text-ink-400">
            {cohort.present.length} {tr(locale, 'חכמים', 'sages', 'мудрецов')}
            {anchor && certainCount > 0 && (
              <> · {certainCount} {tr(locale, 'בני זמנו', 'contemporaries', 'современников')}</>
            )}
          </p>
        </div>
        <button
          onClick={() => setPlaceFocus(null)}
          aria-label={tr(locale, 'סגור', 'Close', 'Закрыть')}
          className="text-ink-400 hover:text-ink-100 text-xs leading-none px-1"
        >
          ✕
        </button>
      </div>

      {stops.length > 1 && (
        <div className="px-3 py-2 border-b border-ink-700/40">
          <p className="text-[10px] text-ink-500 mb-1">
            {tr(locale, 'מסעו של', 'Journey of', 'Путь')} {anchor?.label}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {stops.map((stop, i) => (
              <span key={`${stop}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-ink-600 text-[10px]">←</span>}
                <button
                  onClick={() => setPlaceFocus(stop, anchorId)}
                  className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded border transition-colors',
                    stop === place
                      ? 'bg-gold-500/20 border-gold-500/50 text-gold-200'
                      : 'border-ink-700/50 text-ink-300 hover:text-ink-100 hover:border-ink-600',
                  )}
                >
                  {stop}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <ul className="overflow-y-auto flex-1 divide-y divide-ink-800/40">
        {cohort.present.map(({ sage, kind }) => {
          const verdict = cohort.overlap.get(sage.id)
          const badge = verdict === 'certain' || verdict === 'possible' ? BADGE[verdict] : null
          const years = formatYearRange(sage.birth_year, sage.death_year, sage.date_precision)
          return (
            <li key={sage.id}>
              <button
                onClick={() => selectSage(sage)}
                className="w-full text-start px-3 py-1.5 hover:bg-ink-800/50 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: ERA_COLORS[sage.period] ?? '#7a6550' }}
                    aria-hidden
                  />
                  <span className="text-[12px] text-ink-100 truncate flex-1">{sage.label}</span>
                  {kind === 'migration' && (
                    <span className="text-[9px] text-ink-500 shrink-0" title={tr(locale, 'הגיע בהגירה', 'arrived by migration', 'прибыл')}>
                      ⇢
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 ps-3 mt-0.5">
                  <span className="text-[10px] text-ink-500">
                    {ERA_LABELS[sage.period]?.[locale] ?? sage.period}
                    {years && <> · {years}</>}
                  </span>
                  {badge && (
                    <span className={cn('text-[9px] px-1 py-px rounded border', badge.cls)}>
                      {badge[locale]}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
