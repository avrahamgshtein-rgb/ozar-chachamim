'use client'

import { useState, useMemo, memo } from 'react'
import { ERA_COLORS, ERA_LABELS, CONNECTION_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { formatYearRange } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Locale, Period, Sage } from '@/lib/types'

type SortKey = 'label' | 'period' | 'location' | 'field' | 'birth_year' | 'connections'
type SortDir = 'asc' | 'desc'

interface SagesTableProps { locale: Locale }

function SagesTableComponent({ locale }: SagesTableProps) {
  const { filteredSages, connections, selectSage, sages } = useAppStore()
  const isHe = locale === 'he'

  const [sortKey, setSortKey]   = useState<SortKey>('period')
  const [sortDir, setSortDir]   = useState<SortDir>('asc')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Degree map for connection count column
  const degreeMap = useMemo(() => {
    const m = new Map<string, number>()
    connections.forEach(c => {
      m.set(c.source, (m.get(c.source) ?? 0) + 1)
      m.set(c.target, (m.get(c.target) ?? 0) + 1)
    })
    return m
  }, [connections])

  const ERA_ORDER: Record<Period, number> = {
    patriarchs: 0, exodus: 1, judges: 2, kings: 3,
    'second-temple': 4, tannaim: 5, amoraim: 6, geonim: 7,
    rishonim: 8, acharonim: 9, modern: 10,
  }

  const sorted = useMemo(() => {
    return [...filteredSages].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'label':
          cmp = (a.label ?? '').localeCompare(b.label ?? '', 'he')
          break
        case 'period':
          cmp = (ERA_ORDER[a.period] ?? 9) - (ERA_ORDER[b.period] ?? 9)
          break
        case 'location':
          cmp = (a.location ?? '').localeCompare(b.location ?? '', 'he')
          break
        case 'field':
          cmp = (a.field ?? '').localeCompare(b.field ?? '', 'he')
          break
        case 'birth_year':
          cmp = (a.birth_year ?? a.death_year ?? 9999) - (b.birth_year ?? b.death_year ?? 9999)
          break
        case 'connections':
          cmp = (degreeMap.get(b.id) ?? 0) - (degreeMap.get(a.id) ?? 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredSages, sortKey, sortDir, degreeMap])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const columns: Array<{ key: SortKey; labelHe: string; labelEn: string; labelRu: string; className?: string }> = [
    { key: 'period',      labelHe: 'תקופה',   labelEn: 'Era',         labelRu: 'Эпоха',   className: 'w-[120px]' },
    { key: 'label',       labelHe: 'שם',       labelEn: 'Name',        labelRu: 'Имя',     className: 'min-w-[160px]' },
    { key: 'location',    labelHe: 'מיקום',    labelEn: 'Location',    labelRu: 'Место',   className: 'w-[130px] hidden sm:table-cell' },
    { key: 'field',       labelHe: 'תחום',     labelEn: 'Field',       labelRu: 'Область', className: 'w-[130px] hidden md:table-cell' },
    { key: 'birth_year',  labelHe: 'שנים',     labelEn: 'Years',       labelRu: 'Годы',    className: 'w-[110px] hidden sm:table-cell' },
    { key: 'connections', labelHe: 'קשרים',    labelEn: 'Links',       labelRu: 'Связи',   className: 'w-[72px] text-center' },
  ]

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (col !== sortKey) return <span className="text-ink-700 ms-1">⇅</span>
    return <span className="text-gold-400 ms-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Stats bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-ink-700/40 bg-ink-900/60">
        <span className="text-xs font-sans text-ink-400">
          {isHe
            ? `${filteredSages.length.toLocaleString('he-IL')} מתוך ${sages.length.toLocaleString('he-IL')} חכמים`
            : `${filteredSages.length} of ${sages.length} sages`}
        </span>
        {filteredSages.length < sages.length && (
          <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/25">
            {isHe ? 'מסונן' : 'filtered'}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm font-sans" dir={isHe ? 'rtl' : 'ltr'}>
          <thead className="sticky top-0 z-10 bg-ink-900/95 backdrop-blur-sm">
            <tr className="border-b border-ink-700/50">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    'px-3 py-2.5 text-start select-none cursor-pointer',
                    'text-[11px] font-semibold uppercase tracking-widest',
                    'text-ink-400 hover:text-ink-200 transition-colors',
                    'border-b border-ink-700/40',
                    col.className,
                  )}
                >
                  {isHe ? col.labelHe : locale === 'ru' ? col.labelRu : col.labelEn}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((sage, idx) => {
              const color  = ERA_COLORS[sage.period] ?? '#7a6550'
              const degree = degreeMap.get(sage.id) ?? 0
              const years  = formatYearRange(sage.birth_year, sage.death_year)
              const isHovered = hoveredId === sage.id

              return (
                <tr
                  key={sage.id}
                  onClick={() => selectSage(sage)}
                  onMouseEnter={() => setHoveredId(sage.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'cursor-pointer border-b border-ink-800/60 transition-colors',
                    isHovered ? 'bg-ink-700/40' : idx % 2 === 0 ? 'bg-transparent' : 'bg-ink-900/30',
                  )}
                >
                  {/* Era chip */}
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      {ERA_LABELS[sage.period]?.[locale]}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2">
                    <p className="font-serif text-sm font-semibold text-ink-100 leading-snug">
                      {sage.label}
                    </p>
                    {sage.name_en && (
                      <p className="text-[11px] text-ink-500 mt-0.5 truncate max-w-[180px]">
                        {sage.name_en}
                      </p>
                    )}
                  </td>

                  {/* Location */}
                  <td className="px-3 py-2 hidden sm:table-cell">
                    {sage.location && (
                      <span className="text-xs text-ink-400 truncate block max-w-[120px]">
                        {sage.location}
                      </span>
                    )}
                  </td>

                  {/* Field */}
                  <td className="px-3 py-2 hidden md:table-cell">
                    {sage.field && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: `${color}12`, color }}
                      >
                        {sage.field}
                      </span>
                    )}
                  </td>

                  {/* Years */}
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <span className="text-[11px] text-ink-500 tabular-nums">
                      {years ?? '—'}
                    </span>
                  </td>

                  {/* Connection count */}
                  <td className="px-3 py-2 text-center">
                    {degree > 0 && (
                      <span
                        className="inline-block text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: `${color}18`, color }}
                      >
                        {degree}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-ink-600 font-sans">
                  {isHe ? 'אין חכמים התואמים לפילטר הנוכחי' : 'No sages match current filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const SagesTable = memo(SagesTableComponent)
