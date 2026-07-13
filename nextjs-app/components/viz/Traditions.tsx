'use client'

import Link from 'next/link'
import { useState, memo } from 'react'
import { ERA_COLORS, ERA_LABELS, ALL_PERIODS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatYearRange } from '@/lib/utils'
import type { Locale, Period, Sage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

const ERAS: Period[] = ALL_PERIODS

interface TraditionsProps {
  locale: Locale
}

function TraditionsComponent({ locale }: TraditionsProps) {
  const { filteredSages, selectSage } = useAppStore()
  const [expanded, setExpanded] = useState<Set<Period>>(new Set(ERAS))

  const toggle = (era: Period) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(era) ? next.delete(era) : next.add(era)
      return next
    })

  // Group sages by period
  const byEra = new Map<Period, typeof filteredSages>()
  ERAS.forEach(e => byEra.set(e, []))
  filteredSages.forEach(sage => {
    const bucket = byEra.get(sage.period)
    if (bucket) bucket.push(sage)
  })

  if (filteredSages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          locale={locale}
          icon="filter"
          action={{
            label: tr(locale, 'איפוס פילטרים', 'Reset Filters', 'Сбросить фильтры'),
            onClick: () => useAppStore.getState().clearFilters(),
          }}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 md:px-8 py-6 space-y-4">
      {ERAS.map(era => {
        const color   = ERA_COLORS[era] ?? '#7a6550'
        const label   = ERA_LABELS[era]?.[locale] ?? era
        const sages   = byEra.get(era) ?? []
        const isOpen  = expanded.has(era)

        return (
          <section
            key={era}
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: `${color}28` }}
          >
            {/* Era header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 transition-colors"
              style={{ background: `${color}12` }}
              onClick={() => toggle(era)}
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <h2 className="font-serif text-lg font-bold" style={{ color }}>
                  {label}
                </h2>
                <span
                  className="text-xs font-sans px-2 py-0.5 rounded-full"
                  style={{ background: `${color}22`, color }}
                >
                  {sages.length.toLocaleString('he-IL')}
                </span>
              </div>
              <svg
                className="w-4 h-4 transition-transform duration-200"
                style={{ color, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Sage grid */}
            {isOpen && (
              <div
                className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                style={{ background: 'rgba(15,12,8,0.6)' }}
              >
                {sages.length === 0 ? (
                  <p className="col-span-full text-center text-sm text-ink-600 py-4 font-sans">
                    {tr(locale, 'אין חכמים בפילטר הנוכחי', 'No sages match current filters', 'Нет мудрецов по текущим фильтрам')}
                  </p>
                ) : (
                  sages.map(sage => (
                    <SageCard
                      key={sage.id}
                      sage={sage}
                      locale={locale}
                      accentColor={color}
                      onSelect={() => selectSage(sage)}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function SageCard({
  sage, locale, accentColor, onSelect,
}: {
  sage: Sage
  locale: Locale
  accentColor: string
  onSelect: () => void
}) {
  const yearRange = formatYearRange(sage.birth_year, sage.death_year)

  return (
    <div
      className="group rounded-xl p-3 border border-ink-700/40 hover:border-ink-600/60 bg-ink-800/30 hover:bg-ink-700/40 transition-all cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-serif text-sm font-semibold text-ink-100 group-hover:text-gold-300 transition-colors leading-snug">
          {sage.label}
        </p>
        <Link
          href={`/${locale}/sage/${sage.id}`}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 text-ink-600 hover:text-gold-400 transition-colors p-0.5 rounded"
          title={tr(locale, 'דף מלא', 'Full page', 'Полная страница')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      </div>

      {sage.name_en && (
        <p className="text-[11px] font-sans text-ink-500 mb-1.5 truncate">{sage.name_en}</p>
      )}

      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {yearRange && (
          <span className="text-[10px] font-sans text-ink-500">{yearRange}</span>
        )}
        {sage.field && (
          <span
            className="text-[10px] font-sans px-1.5 py-0.5 rounded"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            {sage.field}
          </span>
        )}
      </div>
    </div>
  )
}

export const Traditions = memo(TraditionsComponent)
