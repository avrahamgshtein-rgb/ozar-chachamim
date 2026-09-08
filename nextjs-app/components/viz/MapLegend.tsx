'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ERA_COLORS, ERA_LABELS, REGION_COLORS, REGION_LABELS, ALL_PERIODS } from '@/lib/types'
import type { Locale, Period, Region } from '@/lib/types'
import { cn } from '@/lib/utils'

const ERAS: Period[] = ALL_PERIODS
const REGIONS: Region[] = [
  'eretz-israel', 'sefarad', 'ashkenaz', 'east-europe',
  'tsarfat', 'provence', 'italy', 'north-africa', 'mizrach',
]

/**
 * מקרא למפה — צבעי הסמנים לפי תקופה + אזורים, לחיצה על שורה מסננת
 * (מתואם עם מנוע הסינון הכללי — אותו סינון חל גם על רשת הקשרים).
 */
export function MapLegend({ locale }: { locale: Locale }) {
  const isHe = locale === 'he'
  const [collapsed, setCollapsed] = useState(false)
  const { filters, togglePeriodFilter, toggleRegionFilter, clearFilters, filteredSages, sages } = useAppStore()
  const active = (filters.period?.length ?? 0) + filters.region.length + filters.field.length > 0

  const Row = ({ color, label, on, onClick }: {
    color: string; label: string; on: boolean; onClick: () => void
  }) => (
    <button onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-1.5 py-0.5 rounded-md text-start transition-all',
        on ? 'bg-gold-500/20' : 'hover:bg-ink-700/40',
      )}>
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border"
        style={{ background: color, borderColor: on ? 'var(--gold-500)' : 'transparent' }} />
      <span className={cn('text-[10.5px] font-sans whitespace-nowrap',
        on ? 'text-gold-300 font-bold' : 'text-ink-300')}>{label}</span>
    </button>
  )

  return (
    <div className="absolute bottom-6 start-4 z-20 glass rounded-xl overflow-hidden min-w-[150px] max-h-[70vh] flex flex-col">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between gap-3 px-3 py-2 text-start hover:bg-ink-700/30 transition-colors flex-shrink-0"
      >
        <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-400">
          {isHe ? 'מקרא וסינון' : 'Legend & Filter'}
        </span>
        <span className="text-ink-600 text-xs">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="px-2 pb-2.5 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-600 px-1.5 pt-1">
            {isHe ? 'תקופות' : 'Eras'}
          </p>
          {ERAS.map(era => (
            <Row key={era} color={ERA_COLORS[era]} label={ERA_LABELS[era]?.[locale] ?? era}
              on={filters.period === null || filters.period.includes(era)} onClick={() => togglePeriodFilter(era)} />
          ))}
          <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-600 px-1.5 pt-2 border-t border-ink-700/40 mt-1">
            {isHe ? 'בתי מדרש ואזורים' : 'Regions'}
          </p>
          {REGIONS.map(region => (
            <Row key={region} color={REGION_COLORS[region]} label={REGION_LABELS[region]?.[locale] ?? region}
              on={filters.region.includes(region)} onClick={() => toggleRegionFilter(region)} />
          ))}
          {active && (
            <button onClick={clearFilters}
              className="mt-2 text-[10px] font-sans font-bold text-red-300 border border-red-400/50 rounded-lg px-2 py-1 hover:bg-red-500/15 transition-all">
              ✕ {isHe ? `נקה סינון (${filteredSages.length}/${sages.length})` : `Clear (${filteredSages.length}/${sages.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
