'use client'

import { useEffect, useRef } from 'react'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import type { Locale, Period, Sage } from '@/lib/types'
import { cn } from '@/lib/utils'

const ERAS: Period[] = [
  'second-temple', 'tannaim', 'amoraim',
  'geonim', 'rishonim', 'acharonim', 'modern',
]

const ERA_YEARS: Record<Period, [number, number]> = {
  'second-temple': [-516,  70],
  tannaim:         [  10, 220],
  amoraim:         [ 220, 500],
  geonim:          [ 589,1038],
  rishonim:        [1038,1500],
  acharonim:       [1500,1900],
  modern:          [1880,2024],
}

const MIN_YEAR = -600
const MAX_YEAR =  2024
const YEAR_SPAN = MAX_YEAR - MIN_YEAR

const SVG_W    = 9000   // wide scrollable canvas
const BAND_H   = 110    // px per era band
const LABEL_W  = 110    // reserved for era label on left
const DOT_R    = 5
const ROWS     = 4      // stagger rows within band to avoid overlap
const COL_W    = 90     // bucket width for stagger

interface HistoricalEvent {
  year: number
  label: string
}

const HISTORICAL_EVENTS: HistoricalEvent[] = [
  { year:   70, label: 'חורבן בית שני'       },
  { year: 1096, label: 'מסעי הצלב — תתנ"ו'  },
  { year: 1242, label: 'שריפת התלמוד'        },
  { year: 1348, label: 'המגפה השחורה'        },
  { year: 1391, label: 'גזירות קנ"א'         },
  { year: 1492, label: 'גירוש ספרד'          },
  { year: 1648, label: 'גזירות ת"ח ות"ט'    },
  { year: 1939, label: 'השואה'               },
]

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

export function Timeline({ locale }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgElRef     = useRef<SVGSVGElement | null>(null)
  const zoomRef      = useRef<import('d3').ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const { sages, filteredSages, selectedSageId, selectSage } = useAppStore()

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

      // ── Historical event bars ──────────────────────────────
      const totalH  = BAND_H * ERAS.length
      const eventsG = g.append('g').attr('class', 'event-bars').attr('pointer-events', 'none')

      HISTORICAL_EVENTS.forEach((ev, idx) => {
        const x = yearToX(ev.year)
        if (x < LABEL_W) return

        // stagger labels in 4 rows so they don't overlap each other
        const row    = idx % 4
        const labelY = totalH + 8 + row * 13

        eventsG.append('rect')
          .attr('x', x - 2).attr('y', 0)
          .attr('width', 4).attr('height', totalH)
          .attr('rx', 2)
          .attr('fill', '#e53935')
          .attr('opacity', 0.15)

        eventsG.append('line')
          .attr('x1', x).attr('y1', totalH)
          .attr('x2', x).attr('y2', labelY - 2)
          .attr('stroke', '#e57373')
          .attr('stroke-width', 1)
          .attr('opacity', 0.5)

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
          .text(`${ev.label} · ${ev.year}`)
      })

      // ── Year axis ticks ────────────────────────────────────
      const axisY = SVG_H - 28
      g.append('line')
        .attr('x1', LABEL_W).attr('x2', SVG_W)
        .attr('y1', axisY).attr('y2', axisY)
        .attr('stroke', 'rgba(122,101,80,0.3)')
        .attr('stroke-width', 1)

      for (let yr = -400; yr <= 2000; yr += 200) {
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

  // Sync selection ring
  useEffect(() => {
    if (!svgElRef.current) return
    import('d3').then(d3 => {
      d3.select(svgElRef.current).selectAll<SVGCircleElement, any>('.dots circle')
        .attr('stroke',       d => d.sage.id === selectedSageId ? '#c9973a' : '#0a0806')
        .attr('stroke-width', d => d.sage.id === selectedSageId ? 2.5 : 1)
    })
  }, [selectedSageId])

  const zoomBy = (k: number) => {
    if (!svgElRef.current || !zoomRef.current) return
    import('d3').then(d3 => {
      d3.select(svgElRef.current!).transition().duration(300).call(zoomRef.current!.scaleBy, k)
    })
  }

  return (
    <div className="relative w-full h-full overflow-auto">
      {/* Horizontally scrollable SVG container */}
      <div
        ref={containerRef}
        className="min-w-full"
        style={{ height: SVG_H }}
      />

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {locale === 'he' ? 'טוען ציר זמן...' : 'Loading timeline...'}
          </p>
        </div>
      )}

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
      'w-8 h-8 rounded-lg text-sm font-mono',
      'glass border border-ink-600/40',
      'text-ink-300 hover:text-gold-300 hover:border-gold-500/30',
      'transition-all flex items-center justify-center',
    )}>
      {children}
    </button>
  )
}
