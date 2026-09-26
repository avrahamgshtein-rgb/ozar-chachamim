'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { ERA_LABELS, ERA_COLORS, REGION_LABELS, REGION_COLORS, ALL_PERIODS } from '@/lib/types'
import type { Locale, Period, Region } from '@/lib/types'
import { UI, tr } from '@/lib/i18n'

const PERIODS: Period[] = ALL_PERIODS
/** Field chips shown before the "more…" control. */
const TOP_FIELDS = 15

const REGIONS: Region[] = [
  'eretz-israel', 'sefarad', 'ashkenaz', 'east-europe',
  'tsarfat', 'provence', 'italy', 'north-africa', 'mizrach', 'other',
]

interface SageFiltersProps {
  locale: Locale
  onClose: () => void
}

export function SageFilters({ locale, onClose }: SageFiltersProps) {
  const t = UI[locale]
  const { filters, togglePeriodFilter, toggleRegionFilter, toggleFieldFilter, clearFilters, setPlaceFocus, filteredSages, sages, availableFields } = useAppStore()
  const [allFields, setAllFields] = useState(false)

  const hasActiveFilters =
    (filters.period !== null && filters.period.length > 0) || filters.region.length > 0 ||
    filters.field.length > 0 || !!filters.place

  // Top fields by frequency, plus any selected one outside the top so it stays visible.
  const shownFields = allFields
    ? availableFields
    : availableFields.filter((f, i) => i < TOP_FIELDS || filters.field.includes(f.name))
  const hiddenCount = availableFields.length - shownFields.length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700/50">
        <h2 className="font-serif text-lg font-semibold text-ink-100">
          {t.advancedSearch}
        </h2>
        <button
          onClick={onClose}
          className="text-ink-400 hover:text-ink-100 transition-colors p-1 rounded"
          aria-label={t.close}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Results count */}
        <div className="text-sm text-ink-400 font-sans">
          {filteredSages.length.toLocaleString('he-IL')} / {sages.length.toLocaleString('he-IL')}{' '}
          {t.sagesLoaded}
        </div>

        {/* Place focus — set by a map cluster click; shown here so it can be
            removed from any tab, not only the map */}
        {filters.place && (
          <div>
            <p className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-400 mb-3">
              {tr(locale, 'מקום', 'Place', 'Место')}
            </p>
            <button
              onClick={() => setPlaceFocus(null)}
              aria-label={tr(locale, `הסר סינון מקום: ${filters.place}`, `Remove place filter: ${filters.place}`, `Убрать фильтр места: ${filters.place}`)}
              className="px-3 py-1.5 rounded-full text-xs font-sans transition-all border bg-gold-500/20 border-gold-500/60 text-gold-300 hover:bg-gold-500/30"
            >
              📍 {filters.place} ✕
            </button>
          </div>
        )}

        {/* Period filter */}
        <div>
          <p className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-400 mb-3">
            {t.period}
          </p>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(period => {
              const label  = ERA_LABELS[period]?.[locale] ?? period
              const color  = ERA_COLORS[period]
              // Inclusive like the region chips: nothing is lit until an era is chosen.
              const active = filters.period?.includes(period) ?? false

              return (
                <button
                  key={period}
                  onClick={() => togglePeriodFilter(period)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-all',
                    active
                      ? 'border-2'
                      : 'border border-opacity-40 opacity-60 hover:opacity-100',
                  )}
                  style={{
                    background: active ? `${color}22` : 'transparent',
                    borderColor: color,
                    color: active ? color : 'var(--ink-300)',
                  }}
                >
                  <span
                    className="era-dot"
                    style={{ background: color, width: 6, height: 6 }}
                  />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Region filter */}
        <div>
          <p className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-400 mb-3">
            {tr(locale, 'אזור גיאוגרפי', 'Region', 'Регион')}
          </p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(region => {
              const label  = REGION_LABELS[region]?.[locale] ?? region
              const color  = REGION_COLORS[region]
              const active = filters.region.includes(region)

              return (
                <button
                  key={region}
                  onClick={() => toggleRegionFilter(region)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-all',
                    active
                      ? 'border-2'
                      : 'border border-opacity-40 opacity-60 hover:opacity-100',
                  )}
                  style={{
                    background: active ? `${color}22` : 'transparent',
                    borderColor: color,
                    color: active ? color : 'var(--ink-300)',
                  }}
                >
                  <span
                    className="era-dot"
                    style={{ background: color, width: 6, height: 6 }}
                  />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        {/* Field filter */}
        {availableFields.length > 0 && (
          <div>
            <p className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-400 mb-3">
              {tr(locale, 'תחום', 'Field', 'Область')}
            </p>
            <div className="flex flex-wrap gap-2">
              {shownFields.map(({ name, count }) => {
                const active = filters.field.includes(name)
                return (
                  <button
                    key={name}
                    onClick={() => toggleFieldFilter(name)}
                    aria-pressed={active}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-sans transition-all border',
                      active
                        ? 'bg-gold-500/20 border-gold-500/60 text-gold-300'
                        : 'border-ink-600/40 text-ink-400 hover:text-ink-200 hover:border-ink-500/60',
                    )}
                  >
                    {name} <span className="opacity-60 tabular-nums">{count}</span>
                  </button>
                )
              })}
              {(hiddenCount > 0 || allFields) && (
                <button
                  onClick={() => setAllFields(v => !v)}
                  className="px-3 py-1.5 rounded-full text-xs font-sans transition-all border border-ink-500/60 text-ink-300 hover:bg-ink-700/60"
                >
                  {allFields
                    ? tr(locale, 'פחות ▴', 'Less ▴', 'Меньше ▴')
                    : tr(locale, `עוד… (${hiddenCount})`, `More… (${hiddenCount})`, `Ещё… (${hiddenCount})`)}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {hasActiveFilters && (
        <div className="px-5 py-4 border-t border-ink-700/50">
          <button
            onClick={clearFilters}
            className={cn(
              'w-full py-2 rounded-lg text-sm font-sans font-medium',
              'bg-ink-700/50 text-ink-300 hover:bg-ink-700 transition-colors',
            )}
          >
            {t.clearFilters}
          </button>
        </div>
      )}
    </div>
  )
}
