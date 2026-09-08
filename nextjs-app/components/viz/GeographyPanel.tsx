'use client'

import { useState, useMemo, useEffect } from 'react'
import { ALL_PERIODS, ERA_LABELS, ERA_COLORS, type Region, type Connection } from '@/lib/types'
import { regionsOf } from '@/lib/regions'
import { tr } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import type { Locale, Sage, Period } from '@/lib/types'
import { cn } from '@/lib/utils'

const ALL_REGIONS: Region[] = [
  'eretz-israel', 'mizrach', 'sefarad', 'ashkenaz', 'tsarfat', 'provence',
  'italy', 'north-africa', 'east-europe', 'other'
]

const REGION_LABELS: Record<Region, Record<Locale, string>> = {
  'eretz-israel': { he: 'ארץ ישראל', en: 'Eretz Israel', ru: 'Святая земля' },
  'mizrach': { he: 'מזרח', en: 'East', ru: 'Восток' },
  'sefarad': { he: 'ספרד', en: 'Sefardi', ru: 'Сефардская диаспора' },
  'ashkenaz': { he: 'אשכנז', en: 'Ashkenazi', ru: 'Ашкеназская диаспора' },
  'tsarfat': { he: 'צרפת', en: 'France', ru: 'Франция' },
  'provence': { he: 'פרובנס', en: 'Provence', ru: 'Прованс' },
  'italy': { he: 'איטליה', en: 'Italy', ru: 'Италия' },
  'north-africa': { he: 'צפון אפריקה', en: 'North Africa', ru: 'Северная Африка' },
  'east-europe': { he: 'מזרח אירופה', en: 'Eastern Europe', ru: 'Восточная Европа' },
  'other': { he: 'אחר', en: 'Other', ru: 'Другое' },
}

const RELATIONSHIP_LABELS: Record<string, Record<Locale, string>> = {
  'student': { he: 'תלמיד', en: 'Student of', ru: 'Ученик' },
  'teacher': { he: 'רב', en: 'Teacher of', ru: 'Учитель' },
  'colleague': { he: 'עמית', en: 'Colleague', ru: 'Коллега' },
  'influence': { he: 'השפעה', en: 'Influenced', ru: 'Влияние' },
  'oppose': { he: 'מתנגד', en: 'Opposed', ru: 'Противник' },
  'predecessor': { he: 'קדמון', en: 'Preceded', ru: 'Предшественник' },
  'contemporary': { he: 'בן דור', en: 'Contemporary', ru: 'Современник' },
  'family': { he: 'משפחה', en: 'Family', ru: 'Семья' },
}

interface GeographyPanelProps {
  locale: Locale
  isMobile?: boolean
  onClose?: () => void
}

export function GeographyPanel({ locale, isMobile = false, onClose }: GeographyPanelProps) {
  const { sages, sageMap, connections, selectSage, selectedSageId, filters, toggleRegionFilter, togglePeriodFilter } = useAppStore()
  const selectedRegions = new Set(filters.region)
  const selectedPeriods = new Set(filters.period.length > 0 ? filters.period : ALL_PERIODS)

  // Sages active in selected regions during selected periods
  const regionalSages = useMemo(() => {
    if (selectedRegions.size === 0) return []

    return sages.filter(sage => {
      const sageRegions = regionsOf(sage.location)
      const inRegion = [...selectedRegions].some(r => sageRegions.includes(r))
      const inPeriod = selectedPeriods.has(sage.period)
      return inRegion && inPeriod
    })
  }, [sages, selectedRegions, selectedPeriods])

  // Group by period
  const sagesByPeriod = useMemo(() => {
    const grouped = new Map<Period, Sage[]>()
    ALL_PERIODS.forEach(p => grouped.set(p, []))
    regionalSages.forEach(s => {
      const group = grouped.get(s.period) || []
      group.push(s)
      grouped.set(s.period, group)
    })
    return grouped
  }, [regionalSages])

  // Relationships within/across selected regions, with source/target names
  const regionalConnections = useMemo(() => {
    const sageIds = new Set(regionalSages.map(s => s.id))
    return connections
      .filter(c => sageIds.has(c.source) && sageIds.has(c.target))
      .map(c => ({
        ...c,
        sourceLabel: sageMap.get(c.source)?.label || c.source,
        targetLabel: sageMap.get(c.target)?.label || c.target,
        sourceRegions: regionsOf(sageMap.get(c.source)?.location ?? ''),
        targetRegions: regionsOf(sageMap.get(c.target)?.location ?? ''),
      }))
  }, [regionalSages, connections, sageMap])

  // Relationships involving the selected sage (including outside-region)
  const selectedSageRelationships = useMemo(() => {
    if (!selectedSageId || selectedRegions.size === 0) return []
    const regionalSageIds = new Set(regionalSages.map(s => s.id))

    return connections
      .filter(c => c.source === selectedSageId || c.target === selectedSageId)
      .map(c => {
        const isOutgoing = c.source === selectedSageId
        const otherSageId = isOutgoing ? c.target : c.source
        const otherSage = sageMap.get(otherSageId)
        const otherRegions = otherSage ? regionsOf(otherSage.location) : []
        const isInRegion = regionalSageIds.has(otherSageId)
        const isCrossRegion = !isInRegion && selectedRegions.size > 0

        return {
          source: c.source,
          target: c.target,
          type: c.type,
          sourceLabel: sageMap.get(c.source)?.label || c.source,
          targetLabel: sageMap.get(c.target)?.label || c.target,
          sourceRegions: regionsOf(sageMap.get(c.source)?.location ?? ''),
          targetRegions: regionsOf(sageMap.get(c.target)?.location ?? ''),
          isInRegion,
          isCrossRegion,
        }
      })
  }, [selectedSageId, selectedRegions, regionalSages, connections, sageMap])

  // Use store actions — state updates sync to URL via AppShell effect
  const handleToggleRegion = (region: Region) => toggleRegionFilter(region)
  const handleTogglePeriod = (period: Period) => togglePeriodFilter(period)

  return (
    <div className="flex flex-col h-full bg-ink-950 border-e border-ink-800">
      {/* Header */}
      <div className="p-3 border-b border-ink-800">
        <h3 className="text-sm font-sans font-bold text-gold-300 mb-3">
          {tr(locale, 'גיאוגרפיה', 'Geography', 'География')}
        </h3>

        {/* Region Filter */}
        <div className="mb-4">
          <label className="text-xs font-sans font-semibold text-ink-400 block mb-2">
            {tr(locale, 'אזורים', 'Regions', 'Регионы')}
          </label>
          <div className="space-y-1 max-h-[140px] overflow-y-auto">
            {ALL_REGIONS.map(region => (
              <button
                key={region}
                onClick={() => handleToggleRegion(region)}
                className={cn(
                  'w-full text-xs text-left px-2 py-1.5 rounded-md transition-colors font-sans',
                  selectedRegions.has(region)
                    ? 'bg-gold-500/30 text-gold-200 border border-gold-500/50'
                    : 'bg-ink-800/30 text-ink-400 hover:bg-ink-700/30'
                )}
              >
                {REGION_LABELS[region]?.[locale] || region}
              </button>
            ))}
          </div>
        </div>

        {/* Period Filter */}
        <div>
          <label className="text-xs font-sans font-semibold text-ink-400 block mb-2">
            {tr(locale, 'תקופות', 'Periods', 'Периоды')}
          </label>
          <div className="space-y-1 max-h-[140px] overflow-y-auto">
            {ALL_PERIODS.map(period => (
              <button
                key={period}
                onClick={() => handleTogglePeriod(period)}
                className={cn(
                  'w-full text-xs text-left px-2 py-1.5 rounded-md transition-colors font-sans',
                  'flex items-center gap-2',
                  selectedPeriods.has(period)
                    ? 'bg-opacity-30'
                    : 'bg-ink-800/30 text-ink-400 hover:bg-ink-700/30'
                )}
                style={selectedPeriods.has(period) ? {
                  backgroundColor: ERA_COLORS[period] + '30',
                  color: ERA_COLORS[period],
                  borderColor: ERA_COLORS[period] + '50',
                } : undefined}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ERA_COLORS[period] }}
                />
                {ERA_LABELS[period]?.[locale] || period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3 text-xs font-sans text-ink-300">
        {selectedRegions.size === 0 ? (
          <p className="text-ink-500">{tr(locale, 'בחר אזור כדי להתחיל', 'Select a region to start', 'Выберите регион')}</p>
        ) : regionalSages.length === 0 ? (
          <p className="text-ink-500">{tr(locale, 'אין חכמים בתקופה זו', 'No sages in this period', 'Нет мудрецов в этом периоде')}</p>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="text-ink-400 space-y-1 pb-3 border-b border-ink-800">
              <p>🧑 {regionalSages.length} {tr(locale, 'חכמים', 'sages', 'мудрецов')}</p>
              <p>🔗 {regionalConnections.length} {tr(locale, 'קשרים', 'connections', 'связей')}</p>
            </div>

            {/* Selected Sage Relationships */}
            {selectedSageId && selectedSageRelationships.length > 0 && (
              <div className="pb-3 border-b border-ink-800">
                <h4 className="text-xs font-bold mb-2 text-gold-300">{tr(locale, 'קשרים', 'Connections', 'Связи')}</h4>
                <div className="space-y-2">
                  {selectedSageRelationships.map((rel, i) => {
                    const isOutgoing = rel.source === selectedSageId
                    const otherSage = isOutgoing ? rel.targetLabel : rel.sourceLabel
                    const relType = RELATIONSHIP_LABELS[rel.type]?.[locale] || rel.type

                    return (
                      <div
                        key={`${rel.source}-${rel.target}-${rel.type}-${i}`}
                        className={cn(
                          'text-[10px] px-2 py-1 rounded-md transition-colors cursor-pointer hover:opacity-80',
                          rel.isCrossRegion ? 'bg-ink-800/50 text-ink-400' : 'bg-gold-500/10 text-gold-200'
                        )}
                        onClick={() => {
                          const targetSageId = isOutgoing ? rel.target : rel.source
                          const targetSage = sageMap.get(targetSageId)
                          if (targetSage) selectSage(targetSage)
                        }}
                        title={rel.isCrossRegion ? tr(locale, 'קשר חיצוני', 'external connection', 'внешняя связь') : ''}
                      >
                        <div className="truncate">
                          {isOutgoing ? '→' : '←'} <strong>{otherSage}</strong>
                        </div>
                        <div className="text-ink-500 truncate">{relType}</div>
                        {rel.isCrossRegion && <div className="text-ink-600 text-[9px]">♦ {tr(locale, 'חוץ לאזור', 'outside region', 'внешняя связь')}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* By Period */}
            {ALL_PERIODS.map(period => {
              const sagesInPeriod = sagesByPeriod.get(period) || []
              if (sagesInPeriod.length === 0) return null
              return (
                <div key={period}>
                  <h4 className="text-xs font-bold mb-2 flex items-center gap-2"
                    style={{ color: ERA_COLORS[period] }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ERA_COLORS[period] }} />
                    {ERA_LABELS[period]?.[locale]} ({sagesInPeriod.length})
                  </h4>
                  <div className="space-y-1">
                    {sagesInPeriod.map(sage => (
                      <button
                        key={sage.id}
                        onClick={() => selectSage(sage)}
                        className={cn(
                          'w-full text-left px-2 py-1 rounded-md transition-colors text-xs',
                          'text-ink-300 hover:bg-ink-700/40 hover:text-ink-100',
                          selectedSageId === sage.id && 'bg-gold-500/20 text-gold-200 border border-gold-500/40'
                        )}
                        title={sage.label}
                      >
                        <div className="truncate font-serif">{sage.label}</div>
                        {sage.name_en && <div className="truncate text-ink-500 text-[10px]">{sage.name_en}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
