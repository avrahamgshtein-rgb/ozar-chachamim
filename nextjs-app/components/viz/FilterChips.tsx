'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
  ERA_COLORS, ERA_LABELS, REGION_COLORS, REGION_LABELS, ALL_PERIODS,
  TAG_FACETS, TAG_FACET_LABELS, isTagFacet,
} from '@/lib/types'
import type { Locale, Period, Region } from '@/lib/types'
import { tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const ERAS: Period[] = ALL_PERIODS
/** Facet chips sit on their own hue so they don't read as an era or a region. */
const FACET_COLOR = '#d16ba5'
const FIELD_COLOR = '#c9973a'
const PLACE_COLOR = '#c9973a'
/** Field chips shown before the "more…" control. */
const TOP_FIELDS = 15

const REGIONS: Region[] = [
  'eretz-israel', 'sefarad', 'ashkenaz', 'east-europe',
  'tsarfat', 'provence', 'italy', 'north-africa', 'mizrach',
]

/**
 * פס סינון מהיר מעל רשת הקשרים — לחיצה אחת על תקופה / אזור / תחום מסננת מיד
 * (כמו באתר הקלאסי). ריבוי בחירות נתמך; "נקה" מאפס הכל.
 *
 * הפס מודד את גובהו וכותב אותו ל-`--filter-chips-h` על ההורה, כדי שהמקרא
 * ומוצא המסלול של הרשת ייפתחו מתחתיו ולא יוסתרו על ידו.
 */
export function FilterChips({ locale }: { locale: Locale }) {
  const {
    sages, filteredSages, filters, availableFields,
    togglePeriodFilter, toggleRegionFilter, toggleFieldFilter, clearFilters, setPlaceFocus,
  } = useAppStore()
  const [showFields, setShowFields] = useState(false)
  const [allFields, setAllFields] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const isHe = locale === 'he'

  const activeCount =
    (filters.period?.length ?? 0) + filters.region.length + filters.field.length + (filters.place ? 1 : 0)

  // Facets get their own chip in row 1, so they're left out of the field list.
  const fieldOptions = useMemo(
    () => availableFields.filter(f => !isTagFacet(f.name)),
    [availableFields],
  )
  // Top fields, plus any selected field outside the top so its chip stays visible.
  const shownFields = allFields
    ? fieldOptions
    : fieldOptions.filter((f, i) => i < TOP_FIELDS || filters.field.includes(f.name))
  const hiddenCount = fieldOptions.length - shownFields.length

  // Curated tag facets (נשים) — hidden when the loaded dataset carries none,
  // so the chip never promises a filter that would come back empty.
  const facets = useMemo(
    () => TAG_FACETS.filter(f => sages.some(s => s.tags?.includes(f))),
    [sages],
  )

  // Publish the bar's bottom edge to the parent so overlays can sit below it.
  useEffect(() => {
    const el = rootRef.current
    const parent = el?.parentElement
    if (!el || !parent) return
    const publish = () => {
      const h = el.offsetHeight
      if (h > 0) parent.style.setProperty('--filter-chips-h', `${el.offsetTop + h}px`)
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sages.length])

  const chip = 'px-2.5 py-1 rounded-full text-[10.5px] font-sans font-semibold border cursor-pointer whitespace-nowrap transition-all select-none'
  const chipStyle = (on: boolean, c: string) => on
    ? { background: c, borderColor: c, color: '#0a0806' }
    : { background: 'transparent', borderColor: c + '66', color: c }

  if (!sages.length) return null

  return (
    <div ref={rootRef} className="absolute top-2 inset-x-2 z-[1000] flex flex-col items-center gap-1 pointer-events-none">
      {/* Row 1: place focus + eras + regions */}
      <div className="pointer-events-auto glass rounded-xl px-2 py-1.5 flex gap-1 items-center max-w-full overflow-x-auto no-scrollbar">
        {/* A map-cluster click narrows everything to one place — surface it
            here so it can be seen and removed from any tab that has this bar. */}
        {filters.place && (
          <>
            <button onClick={() => setPlaceFocus(null)}
              className={chip}
              style={chipStyle(true, PLACE_COLOR)}
              aria-label={tr(locale, `הסר סינון מקום: ${filters.place}`, `Remove place filter: ${filters.place}`, `Убрать фильтр места: ${filters.place}`)}>
              📍 {filters.place} ✕
            </button>
            <span className="w-px h-4 bg-ink-600/50 mx-0.5 flex-shrink-0" />
          </>
        )}
        {ERAS.map(era => {
          const on = filters.period?.includes(era) ?? false
          return (
            <button key={era} onClick={() => togglePeriodFilter(era)}
              aria-pressed={on}
              className={chip}
              style={chipStyle(on, ERA_COLORS[era])}>
              {ERA_LABELS[era]?.[locale] ?? era}
            </button>
          )
        })}
        <span className="w-px h-4 bg-ink-600/50 mx-0.5 flex-shrink-0" />
        {REGIONS.map(region => {
          const on = filters.region.includes(region)
          return (
            <button key={region} onClick={() => toggleRegionFilter(region)}
              aria-pressed={on}
              className={chip}
              style={chipStyle(on, REGION_COLORS[region])}>
              {REGION_LABELS[region]?.[locale] ?? region}
            </button>
          )
        })}
        {facets.length > 0 && (
          <>
            <span className="w-px h-4 bg-ink-600/50 mx-0.5 flex-shrink-0" />
            {facets.map(facet => {
              const on = filters.field.includes(facet)
              return (
                <button key={facet} onClick={() => toggleFieldFilter(facet)}
                  aria-pressed={on}
                  className={chip}
                  style={chipStyle(on, FACET_COLOR)}>
                  {TAG_FACET_LABELS[facet]?.[locale] ?? facet}
                </button>
              )
            })}
          </>
        )}
        <span className="w-px h-4 bg-ink-600/50 mx-0.5 flex-shrink-0" />
        <button onClick={() => setShowFields(v => !v)}
          aria-expanded={showFields}
          className={cn(chip, 'border-ink-500/60 text-ink-300', showFields && 'bg-ink-700/60')}>
          {isHe ? 'תחומים' : 'Fields'} {showFields ? '▴' : '▾'}
        </button>
        {activeCount > 0 && (
          <>
            <button onClick={() => { clearFilters(); setShowFields(false); setAllFields(false) }}
              className={cn(chip, 'border-red-400/60 text-red-300 hover:bg-red-500/15')}>
              ✕ {isHe ? 'נקה' : 'Clear'}
            </button>
            <span className="text-[10px] font-sans text-gold-300 whitespace-nowrap px-1">
              {filteredSages.length}/{sages.length}
            </span>
          </>
        )}
      </div>

      {/* Row 2: fields (on demand) — top fields, the rest behind "more…" */}
      {showFields && (
        <div className={cn(
          'pointer-events-auto glass rounded-xl px-2 py-1.5 flex gap-1 items-center max-w-full animate-fade-in',
          allFields
            ? 'flex-wrap justify-center max-h-[40vh] overflow-y-auto'
            : 'overflow-x-auto no-scrollbar',
        )}>
          {shownFields.map(({ name, count }) => {
            const on = filters.field.includes(name)
            return (
              <button key={name} onClick={() => toggleFieldFilter(name)}
                aria-pressed={on}
                className={chip}
                style={chipStyle(on, FIELD_COLOR)}>
                {name} <span className="opacity-70 font-normal tabular-nums">{count}</span>
              </button>
            )
          })}
          {(hiddenCount > 0 || allFields) && (
            <button onClick={() => setAllFields(v => !v)}
              className={cn(chip, 'border-ink-500/60 text-ink-300 hover:bg-ink-700/60')}>
              {allFields
                ? tr(locale, 'פחות ▴', 'Less ▴', 'Меньше ▴')
                : tr(locale, `עוד… (${hiddenCount})`, `More… (${hiddenCount})`, `Ещё… (${hiddenCount})`)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
