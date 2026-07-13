'use client'

import { useEffect, useRef, useState, memo } from 'react'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Locale, Period, Sage } from '@/lib/types'
import { cn } from '@/lib/utils'

import { ALL_PERIODS } from '@/lib/types'
import { tr } from '@/lib/i18n'

const ERAS: Period[] = ALL_PERIODS

const ERA_YEARS: Record<Period, [number, number]> = {
  patriarchs:      [-1850,-1500],
  exodus:          [-1500,-1200],
  judges:          [-1200,-1020],
  kings:           [-1020,-586],
  'second-temple': [-516,  70],
  tannaim:         [  10, 220],
  amoraim:         [ 220, 500],
  geonim:          [ 589,1038],
  rishonim:        [1038,1500],
  acharonim:       [1500,1900],
  modern:          [1880,2024],
}

const MIN_YEAR = -1900
const MAX_YEAR =  2024
const YEAR_SPAN = MAX_YEAR - MIN_YEAR

const SVG_W    = 9000   // wide scrollable canvas
const BAND_H   = 110    // px per era band
const LABEL_W  = 110    // reserved for era label on left
const DOT_R    = 5
const ROWS     = 4      // stagger rows within band to avoid overlap
const COL_W    = 90     // bucket width for stagger

// Historical milestones — shared module (lib/milestones.ts), Masterplan §8
import { MILESTONES } from '@/lib/milestones'
import type { Milestone } from '@/lib/milestones'

interface TimelineProps {
  locale: Locale
}

function sageYear(sage: Sage): number {
  if (sage.birth_year) return sage.birth_year
  if (sage.death_year) return sage.death_year - 60
  const [s, e] = ERA_YEARS[sage.period] ?? [1000, 1500]
  // deterministic jitter from id
  let h = 0
  for (const c of String(sage.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return s + (h % 1000) / 1000 * (e - s)
}

function yearToX(year: number): number {
  return LABEL_W + ((year - MIN_YEAR) / YEAR_SPAN) * (SVG_W - LABEL_W)
}

function TimelineComponent({ locale }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const svgElRef     = useRef<SVGSVGElement | null>(null)
  const zoomRef      = useRef<import('d3').ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [viewport, setViewport] = useState({ start: 0, width: 0.1 }) // minimap indicator (0..1)
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null)

  const { sages, filteredSages, selectedSageId, selectSage, connections } = useAppStore()

  // Extra 90px: 4-row staggered event labels (4×13px) + year axis (28px) + padding
  const SVG_H = BAND_H * ERAS.length + 90

  useEffect(() => {
    if (!sages.length || !containerRef.current) return
    let mounted = true

    async function build() {
      const d3 = await import('d3')
      if (!mounted || !containerRef.current) return

      const container = containerRef.current
      d3.select(container).selectAll('svg').remove()

      const svg = d3.select(container)
        .append('svg')
        .attr('width', SVG_W)
        .attr('height', SVG_H)

      svgElRef.current = svg.node()

      // Zoom (horizontal only)
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 8])
        .on('zoom', ev => {
          const t = ev.transform
          // restrict to horizontal pan only; keep y fixed
          g.attr('transform', `translate(${t.x},0) scale(${t.k},1)`)
        })
      svg.call(zoom)
      zoomRef.current = zoom

      const g = svg.append('g')

      // ── Era bands ──────────────────────────────────────────
      ERAS.forEach((era, eraIdx) => {
        const y    = eraIdx * BAND_H
        const color = ERA_COLORS[era] ?? '#7a6550'

        // Band background (alternating subtle shade)
        g.append('rect')
          .attr('x', 0).attr('y', y)
          .attr('width', SVG_W).attr('height', BAND_H)
          .attr('fill', eraIdx % 2 === 0 ? 'rgba(26,20,12,0.4)' : 'rgba(18,14,8,0.4)')

        // Era year range highlight
        const [start, end] = ERA_YEARS[era]
        const rx = yearToX(start)
        const rw = yearToX(end) - rx
        g.append('rect')
          .attr('x', rx).attr('y', y + 2)
          .attr('width', Math.max(0, rw)).attr('height', BAND_H - 4)
          .attr('fill', color)
          .attr('opacity', 0.05)
          .attr('rx', 4)

        // Band separator line
        g.append('line')
          .attr('x1', 0).attr('x2', SVG_W)
          .attr('y1', y + BAND_H).attr('y2', y + BAND_H)
          .attr('stroke', 'rgba(58,50,38,0.4)')
          .attr('stroke-width', 1)

        // Era label (fixed left)
        g.append('rect')
          .attr('x', 0).attr('y', y)
          .attr('width', LABEL_W).attr('height', BAND_H)
          .attr('fill', `${color}12`)

        g.append('text')
          .attr('x', LABEL_W / 2).attr('y', y + BAND_H / 2 + 1)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', 'Heebo, sans-serif')
          .attr('font-size', 11)
          .attr('font-weight', '600')
          .attr('fill', color)
          .attr('pointer-events', 'none')
          .text(ERA_LABELS[era]?.[locale] ?? era)
      })

      // ── Historical milestone bars (Masterplan §8) ──────────
      // Background layer; always visible (independent of sage filters);
      // clickable → impact summary card.
      const totalH  = BAND_H * ERAS.length
      const eventsG = g.append('g').attr('class', 'event-bars')

      MILESTONES.forEach((ev, idx) => {
        const x = yearToX(ev.year)
        if (x < LABEL_W) return

        // stagger labels in 4 rows so they don't overlap each other
        const row    = idx % 4
        const labelY = totalH + 8 + row * 13

        // Prominent full-height dashed line — the event is a visual marker
        // on the timeline itself, not just a caption below it
        eventsG.append('rect')
          .attr('x', x - 3).attr('y', 0)
          .attr('width', 6).attr('height', totalH)
          .attr('rx', 3)
          .attr('fill', '#e53935')
          .attr('opacity', 0.10)
          .attr('pointer-events', 'none')

        eventsG.append('line')
          .attr('x1', x).attr('y1', 0)
          .attr('x2', x).attr('y2', labelY - 2)
          .attr('stroke', '#e53935')
          .attr('stroke-width', 1.8)
          .attr('stroke-dasharray', '7 5')
          .attr('opacity', 0.65)
          .attr('pointer-events', 'none')

        // Diamond marker at the top of the line
        eventsG.append('path')
          .attr('d', `M ${x} 2 l 5 6 l -5 6 l -5 -6 Z`)
          .attr('fill', '#e53935')
          .attr('opacity', 0.85)
          .attr('stroke', '#0a0806')
          .attr('stroke-width', 1)
          .attr('pointer-events', 'none')

        eventsG.append('text')
          .attr('x', x).attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'hanging')
          .attr('font-family', 'Heebo, sans-serif')
          .attr('font-size', 9)
          .attr('font-weight', '700')
          .attr('fill', '#c62828')
          .attr('stroke', '#0a0806')
          .attr('stroke-width', 2.5)
          .attr('paint-order', 'stroke')
          .attr('pointer-events', 'none')
          .text(`${ev.label[locale]} · ${Math.abs(ev.year)}${ev.year < 0 ? tr(locale, ' לפנה"ס', ' BCE', ' до н.э.') : ''}`)

        // Invisible wide hit area — the whole vertical bar is clickable
        eventsG.append('rect')
          .attr('x', x - 7).attr('y', 0)
          .attr('width', 14).attr('height', totalH + 8 + 4 * 13)
          .attr('fill', 'transparent')
          .style('cursor', 'pointer')
          .on('click', () => setActiveMilestone(ev))
      })

      // ── Year axis ticks ────────────────────────────────────
      const axisY = SVG_H - 28
      g.append('line')
        .attr('x1', LABEL_W).attr('x2', SVG_W)
        .attr('y1', axisY).attr('y2', axisY)
        .attr('stroke', 'rgba(122,101,80,0.3)')
        .attr('stroke-width', 1)

      for (let yr = -1800; yr <= 2000; yr += 200) {
        const x = yearToX(yr)
        g.append('line')
          .attr('x1', x).attr('x2', x)
          .attr('y1', axisY - 4).attr('y2', axisY + 4)
          .attr('stroke', 'rgba(122,101,80,0.4)')
          .attr('stroke-width', 1)
        g.append('text')
          .attr('x', x).attr('y', axisY + 14)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'Heebo, sans-serif')
          .attr('font-size', 9)
          .attr('fill', '#5a4a38')
          .text(yr < 0 ? `${Math.abs(yr)} לפנה"ס` : `${yr}`)
      }

      // ── Place sage dots ────────────────────────────────────
      // For each era, bucket sages into column slots and stagger rows
      const colBuckets = new Map<string, number>() // `${eraIdx}-${col}` → next row

      const filteredIds = new Set(filteredSages.map(s => s.id))

      // Notable sages (highest connection degree) get always-visible labels —
      // fixes the "empty view" feel (masterplan §4: data density)
      const degree = new Map<string, number>()
      connections.forEach(c => {
        degree.set(c.source, (degree.get(c.source) ?? 0) + 1)
        degree.set(c.target, (degree.get(c.target) ?? 0) + 1)
      })
      const notableIds = new Set(
        [...sages]
          .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
          .slice(0, 48)
          .map(s => s.id),
      )

      const dotData = sages.map(sage => {
        const eraIdx = ERAS.indexOf(sage.period)
        if (eraIdx < 0) return null
        const year   = sageYear(sage)
        const x      = yearToX(year)
        const col    = Math.floor((x - LABEL_W) / COL_W)
        const key    = `${eraIdx}-${col}`
        const row    = (colBuckets.get(key) ?? 0) % ROWS
        colBuckets.set(key, row + 1)
        const baseY  = eraIdx * BAND_H
        const cy     = baseY + 15 + row * ((BAND_H - 30) / ROWS)
        return { sage, x, cy, eraIdx, row }
      }).filter(Boolean) as Array<{ sage: Sage; x: number; cy: number; eraIdx: number; row: number }>

      const dotsG = g.append('g').attr('class', 'dots')
      const dots  = dotsG.selectAll<SVGCircleElement, typeof dotData[0]>('circle')
        .data(dotData)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.cy)
        .attr('r',  DOT_R)
        .attr('fill',         d => ERA_COLORS[d.sage.period] ?? '#7a6550')
        .attr('stroke',       d => d.sage.id === selectedSageId ? '#c9973a' : '#0a0806')
        .attr('stroke-width', d => d.sage.id === selectedSageId ? 2.5 : 1)
        .attr('fill-opacity', d => filteredIds.has(d.sage.id) ? 0.85 : 0.1)
        .style('cursor', 'pointer')

      // Labels (hidden until hover)
      const labelsG = g.append('g').attr('class', 'dot-labels').attr('pointer-events', 'none')

      // Always-visible labels + years for notable sages
      const staticLabelsG = g.append('g').attr('class', 'static-labels').attr('pointer-events', 'none')
      dotData
        .filter(d => notableIds.has(d.sage.id))
        .forEach(d => {
          const years = [d.sage.birth_year, d.sage.death_year].filter(Boolean).join('–')
          const yBase = d.cy - DOT_R - 4
          const bandY = d.eraIdx * BAND_H
          const flip  = yBase < bandY + 16
          staticLabelsG.append('text')
            .attr('x', d.x)
            .attr('y', flip ? d.cy + DOT_R + 4 : yBase)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', flip ? 'hanging' : 'auto')
            .attr('font-family', 'Heebo, sans-serif')
            .attr('font-size', 9.5)
            .attr('font-weight', '600')
            .attr('fill', 'var(--ink-200)')
            .attr('stroke', 'var(--ink-900)')
            .attr('stroke-width', 2.5)
            .attr('paint-order', 'stroke')
            .text(years ? `${d.sage.label} · ${years}` : d.sage.label)
        })

      dots
        .on('mouseover', (ev, d) => {
          d3.select(ev.currentTarget)
            .attr('r', DOT_R + 3)
            .attr('fill-opacity', 1)

          const lbl = labelsG.append('text')
            .attr('id', `lbl-${d.sage.id}`)
            .attr('x', d.x)
            .attr('y', d.cy - DOT_R - 4)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Heebo, sans-serif')
            .attr('font-size', 10)
            .attr('fill', '#e8d5b0')
            .attr('stroke', '#0a0806')
            .attr('stroke-width', 2.5)
            .attr('paint-order', 'stroke')
            .text(d.sage.label)

          // Keep label within band
          const bandY = d.eraIdx * BAND_H
          const lblY  = d.cy - DOT_R - 4
          if (lblY < bandY + 8) {
            lbl.attr('y', d.cy + DOT_R + 12).attr('dominant-baseline', 'hanging')
          }
        })
        .on('mouseout', (ev, d) => {
          d3.select(ev.currentTarget)
            .attr('r', DOT_R)
            .attr('fill-opacity', filteredIds.has(d.sage.id) ? 0.85 : 0.1)
          labelsG.select(`#lbl-${d.sage.id}`).remove()
        })
        .on('click', (_ev, d) => {
          selectSage(d.sage)
        })
    }

    build()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length])

  // Auto-scroll to the densest region on first render — fixes the
  // "empty view" issue (previously opened on sparse ancient centuries)
  useEffect(() => {
    if (!sages.length || !scrollRef.current) return
    const el = scrollRef.current
    const years = sages.map(sageYear).sort((a, b) => a - b)
    const median = years[Math.floor(years.length / 2)] ?? 1200
    const t = setTimeout(() => {
      el.scrollLeft = Math.max(0, yearToX(median) - el.clientWidth / 2)
    }, 60)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length])

  // Escape dismisses the milestone card
  useEffect(() => {
    if (!activeMilestone) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveMilestone(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeMilestone])

  // Track scroll → minimap viewport indicator
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setViewport({
      start: el.scrollLeft / SVG_W,
      width: el.clientWidth / SVG_W,
    })
  }

  // Minimap click → jump scroll
  const jumpTo = (ratio: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: ratio * SVG_W - el.clientWidth / 2, behavior: 'smooth' })
  }

  // Sync filter dim
  useEffect(() => {
    if (!svgElRef.current) return
    import('d3').then(d3 => {
      const ids      = new Set(filteredSages.map(s => s.id))
      const noFilter = ids.size === sages.length
      d3.select(svgElRef.current).selectAll<SVGCircleElement, any>('.dots circle')
        .transition().duration(250)
        .attr('fill-opacity', d => noFilter || ids.has(d.sage.id) ? 0.85 : 0.1)
    })
  }, [filteredSages, sages.length])

  // Sync selection ring + scroll the selected sage into view
  useEffect(() => {
    if (!svgElRef.current) return
    import('d3').then(d3 => {
      d3.select(svgElRef.current).selectAll<SVGCircleElement, any>('.dots circle')
        .attr('stroke',       d => d.sage.id === selectedSageId ? '#c9973a' : '#0a0806')
        .attr('stroke-width', d => d.sage.id === selectedSageId ? 2.5 : 1)
    })
    if (selectedSageId && scrollRef.current) {
      const sage = sages.find(s => s.id === selectedSageId)
      if (sage) {
        const el = scrollRef.current
        el.scrollTo({
          left: Math.max(0, yearToX(sageYear(sage)) - el.clientWidth / 2),
          behavior: 'smooth',
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSageId])

  const zoomBy = (k: number) => {
    if (!svgElRef.current || !zoomRef.current) return
    import('d3').then(d3 => {
      d3.select(svgElRef.current!).transition().duration(300).call(zoomRef.current!.scaleBy, k)
    })
  }

  return (
    <div
      ref={scrollRef}
      dir="ltr"
      onScroll={onScroll}
      className="relative w-full h-full overflow-auto"
    >
      {/* Horizontally scrollable SVG container */}
      <div
        ref={containerRef}
        className="min-w-full"
        style={{ height: SVG_H }}
      />

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {tr(locale, 'טוען ציר זמן...', 'Loading timeline...', 'Загрузка хронологии...')}
          </p>
        </div>
      )}

      {sages.length > 0 && filteredSages.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-5">
          <EmptyState
            locale={locale}
            icon="calendar"
            action={{
              label: tr(locale, 'איפוס פילטרים', 'Reset Filters', 'Сбросить фильтры'),
              onClick: () => useAppStore.getState().resetFilters(),
            }}
          />
        </div>
      )}

      {/* Milestone impact summary card (Masterplan §8: click → summary) */}
      {activeMilestone && (
        <div
          dir={locale === 'he' ? 'rtl' : 'ltr'}
          className="fixed bottom-[120px] left-1/2 -translate-x-1/2 z-30 glass rounded-xl border border-red-500/25 px-4 py-3 shadow-glass-lg animate-fade-in"
          style={{ width: 'min(440px, calc(100vw - 32px))' }}
          role="dialog"
          aria-label={activeMilestone.label[locale]}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-serif text-sm font-bold text-red-300">
              {activeMilestone.label[locale]}
              <span className="font-mono text-xs text-ink-400 font-normal">
                {' · '}{Math.abs(activeMilestone.year)}{activeMilestone.year < 0 ? tr(locale, ' לפנה"ס', ' BCE', ' до н.э.') : ''}
              </span>
            </p>
            <button
              onClick={() => setActiveMilestone(null)}
              className="text-ink-500 hover:text-ink-100 transition-colors flex-shrink-0 -mt-0.5"
              aria-label={tr(locale, 'סגור', 'Close', 'Закрыть')}
            >
              ✕
            </button>
          </div>
          <p className="font-sans text-xs text-ink-200 leading-relaxed mt-1.5">
            {activeMilestone.summary[locale]}
          </p>
        </div>
      )}

      {/* Minimap navigator — click to jump across centuries */}
      <div
        dir="ltr"
        className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-20 glass rounded-lg px-1.5 py-1.5 hidden sm:block"
        style={{ width: 'min(480px, calc(100vw - 140px))' }}
        role="slider"
        aria-label={tr(locale, 'ניווט מהיר בציר הזמן', 'Timeline quick navigation', 'Быстрая навигация по хронологии')}
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={Math.round(MIN_YEAR + (viewport.start + viewport.width / 2) * YEAR_SPAN)}
        tabIndex={0}
        onClick={e => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          jumpTo((e.clientX - r.left) / r.width)
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') jumpTo(viewport.start + viewport.width * 1.5)
          if (e.key === 'ArrowLeft')  jumpTo(Math.max(0, viewport.start - viewport.width * 0.5))
        }}
      >
        <div className="relative h-4 rounded overflow-hidden cursor-pointer">
          {/* Era segments */}
          {ERAS.map(era => {
            const [s, e] = ERA_YEARS[era]
            const left  = ((yearToX(s) / SVG_W) * 100)
            const width = (((yearToX(e) - yearToX(s)) / SVG_W) * 100)
            return (
              <div
                key={era}
                className="absolute top-0 bottom-0"
                title={ERA_LABELS[era]?.[locale]}
                style={{ left: `${left}%`, width: `${width}%`, background: ERA_COLORS[era], opacity: 0.45 }}
              />
            )
          })}
          {/* Viewport indicator */}
          <div
            className="absolute top-0 bottom-0 rounded-sm pointer-events-none transition-all duration-150"
            style={{
              left:  `${viewport.start * 100}%`,
              width: `${Math.max(2, viewport.width * 100)}%`,
              border: '1.5px solid var(--gold-500, #c9973a)',
              background: 'rgba(201,151,58,0.18)',
            }}
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="fixed bottom-20 end-4 z-10 flex flex-col gap-1.5">
        <ZBtn onClick={() => zoomBy(1.5)}>+</ZBtn>
        <ZBtn onClick={() => zoomBy(0.67)}>−</ZBtn>
      </div>
    </div>
  )
}

function ZBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      'w-11 h-11 md:w-8 md:h-8 rounded-lg text-sm font-mono',
      'glass border border-ink-600/40',
      'text-ink-300 hover:text-gold-300 hover:border-gold-500/30',
      'transition-all flex items-center justify-center',
    )}>
      {children}
    </button>
  )
}

// Memoize to prevent re-renders when parent state changes but props are same
export const Timeline = memo(TimelineComponent)
