'use client'

import { useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
  ERA_COLORS, ERA_LABELS, REGION_COLORS, REGION_LABELS, ALL_PERIODS,
  TAG_FACETS, TAG_FACET_LABELS, isTagFacet,
} from '@/lib/types'
import type { Locale, Period, Region } from '@/lib/types'
import { cn } from '@/lib/utils'

const ERAS: Period[] = ALL_PERIODS
/** Facet chips sit on their own hue so they don't read as an era or a region. */
const FACET_COLOR = '#d16ba5'

const REGIONS: Region[] = [
  'eretz-israel', 'sefarad', 'ashkenaz', 'east-europe',
  'tsarfat', 'provence', 'italy', 'north-africa', 'mizrach',
]

/**
 * פס סינון מהיר מעל רשת הקשרים — לחיצה אחת על תקופה / אזור / תחום מסננת מיד
 * (כמו באתר הקלאסי). ריבוי בחירות נתמך; "נקה" מאפס הכל.
 */
export function FilterChips({ locale }: { locale: Locale }) {
  const {
    sages, filteredSages, filters, availableFields,
    togglePeriodFilter, toggleRegionFilter, toggleFieldFilter, clearFilters,
  } = useAppStore()
  const [showFields, setShowFields] = useState(false)
  const isHe = locale === 'he'

  const activeCount = (filters.period?.length ?? 0) + filters.region.length + filters.field.length
  const topFields = useMemo(() => {
    const counts = new Map<string, number>()
    sages.forEach(s => {
      (s.field || '').split(',').map(f => f.trim()).filter(Boolean)
        .forEach(f => counts.set(f, (counts.get(f) || 0) + 1))
    })
    return [...counts.entries()]
      .filter(([f]) => !isTagFacet(f))   // facets get their own chip in row 1
      .sort((a, b) => b[1] - a[1]).slice(0, 12).map(([f]) => f)
  }, [sages])

  // Curated tag facets (נשים) — hidden when the loaded dataset carries none,
  // so the chip never promises a filter that would come back empty.
  const facets = useMemo(
    () => TAG_FACETS.filter(f => sages.some(s => s.tags?.includes(f))),
    [sages],
  )

  const chip = 'px-2.5 py-1 rounded-full text-[10.5px] font-sans font-semibold border cursor-pointer whitespace-nowrap transition-all select-none'

  if (!sages.length) return null

  return (
    <div className="absolute top-2 inset-x-2 z-[1000] flex flex-col items-center gap-1 pointer-events-none">
      {/* Row 1: eras + regions */}
      <div className="pointer-events-auto glass rounded-xl px-2 py-1.5 flex gap-1 items-center max-w-full overflow-x-auto no-scrollbar">
        {ERAS.map(era => {
          const on = filters.period === null || filters.period.includes(era)
          const c = ERA_COLORS[era]
          return (
            <button key={era} onClick={() => togglePeriodFilter(era)}
              className={chip}
              style={on
                ? { background: c, borderColor: c, color: '#0a0806' }
                : { background: 'transparent', borderColor: c + '66', color: c }}>
              {ERA_LABELS[era]?.[locale] ?? era}
            </button>
          )
        })}
        <span className="w-px h-4 bg-ink-600/50 mx-0.5 flex-shrink-0" />
        {REGIONS.map(region => {
          const on = filters.region.includes(region)
          const c = REGION_COLORS[region]
          return (
            <button key={region} onClick={() => toggleRegionFilter(region)}
              className={chip}
              style={on
                ? { background: c, borderColor: c, color: '#0a0806' }
                : { background: 'transparent', borderColor: c + '66', color: c }}>
              {REGION_LABELS[region]?.[locale] ?? region}
            </button>
          )
        })}
        {facets.length > 0 && (
          <>
            <span className="w-px h-4 bg-ink-600/50 mx-0.5 flex-shrink-0" />
            {facets.map(facet => {
              const on = filters.field.includes(facet)
              const c = FACET_COLOR
              return (
                <button key={facet} onClick={() => toggleFieldFilter(facet)}
                  className={chip}
                  style={on
                    ? { background: c, borderColor: c, color: '#0a0806' }
                    : { background: 'transparent', borderColor: c + '66', color: c }}>
                  {TAG_FACET_LABELS[facet]?.[locale] ?? facet}
                </button>
              )
            })}
          </>
        )}
        <span className="w-px h-4 bg-ink-600/50 mx-0.5 flex-shrink-0" />
        <button onClick={() => setShowFields(v => !v)}
          className={cn(chip, 'border-ink-500/60 text-ink-300', showFields && 'bg-ink-700/60')}>
          {isHe ? 'תחומים' : 'Fields'} {showFields ? '▴' : '▾'}
        </button>
        {activeCount > 0 && (
          <>
            <button onClick={() => { clearFilters(); setShowFields(false) }}
              className={cn(chip, 'border-red-400/60 text-red-300 hover:bg-red-500/15')}>
              ✕ {isHe ? 'נקה' : 'Clear'}
            </button>
            <span className="text-[10px] font-sans text-gold-300 whitespace-nowrap px-1">
              {filteredSages.length}/{sages.length}
            </span>
          </>
        )}
      </div>

      {/* Row 2: fields (on demand) */}
      {showFields && (
        <div className="pointer-events-auto glass rounded-xl px-2 py-1.5 flex gap-1 items-center max-w-full overflow-x-auto no-scrollbar animate-fade-in">
          {topFields.map(field => {
            const on = filters.field.includes(field)
            return (
              <button key={field} onClick={() => toggleFieldFilter(field)}
                className={chip}
                style={on
                  ? { background: '#c9973a', borderColor: '#c9973a', color: '#0a0806' }
                  : { background: 'transparent', borderColor: '#c9973a66', color: '#c9973a' }}>
                {field}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
