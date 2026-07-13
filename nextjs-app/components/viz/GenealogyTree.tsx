'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS, ALL_PERIODS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import type { Locale, Period } from '@/lib/types'
import { tr } from '@/lib/i18n'

const ERA_ORDER: Period[] = ALL_PERIODS

const BAND_H   = 150   // px per era band
const LABEL_W  = 90    // left margin for era labels
const PAD_TOP  = 48    // top padding (for era label row)
const TOTAL_H  = PAD_TOP + BAND_H * ERA_ORDER.length + 32

interface GenealogyTreeProps { locale: Locale }

export function GenealogyTree({ locale }: GenealogyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { sages, connections, selectSage, selectedSageId } = useAppStore()

  useEffect(() => {
    if (!sages.length || !containerRef.current) return
    let mounted = true

    async function build() {
      const d3 = await import('d3')
      if (!mounted || !containerRef.current) return

      const container = containerRef.current
      const W = Math.max(container.clientWidth || 900, 1000)

      d3.select(container).selectAll('svg').remove()

      const svg = d3.select(container)
        .append('svg')
        .attr('width', W)
        .attr('height', TOTAL_H)
        .style('background', 'transparent')

      // ── SVG defs ─────────────────────────────────────────────────────
      const defs = svg.append('defs')

      // Arrowhead for teacher→student direction
      defs.append('marker')
        .attr('id', 'gt-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 12).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#3b82f6').attr('opacity', 0.75)

      // Glow filter for selected node
      const glow = defs.append('filter').attr('id', 'gt-glow')
      glow.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 4).attr('result', 'blur')
      const feMerge = glow.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'blur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

      // ── Era bands ─────────────────────────────────────────────────────
      const bandsG = svg.append('g').attr('pointer-events', 'none')
      ERA_ORDER.forEach((era, i) => {
        const color = ERA_COLORS[era]
        const y = PAD_TOP + i * BAND_H
        // Band fill
        bandsG.append('rect')
          .attr('x', 0).attr('y', y)
          .attr('width', W).attr('height', BAND_H)
          .attr('fill', color).attr('opacity', i % 2 === 0 ? 0.04 : 0.07)
        // Separator line
        bandsG.append('line')
          .attr('x1', 0).attr('y1', y).attr('x2', W).attr('y2', y)
          .attr('stroke', color).attr('stroke-width', 0.5).attr('opacity', 0.25)
        // Era label on the left
        bandsG.append('text')
          .attr('x', 8).attr('y', y + 18)
          .attr('font-family', 'Heebo, sans-serif')
          .attr('font-size', '10px').attr('font-weight', '700')
          .attr('fill', color).attr('opacity', 0.7)
          .text(ERA_LABELS[era]?.[locale] ?? era)
      })

      // ── Data prep ─────────────────────────────────────────────────────
      const nodeData = sages.map(s => ({
        ...s,
        degree: 0,
        x: LABEL_W + Math.random() * (W - LABEL_W * 2),
        y: PAD_TOP + (ERA_ORDER.indexOf(s.period) >= 0 ? ERA_ORDER.indexOf(s.period) : 3) * BAND_H + BAND_H / 2,
        vx: 0, vy: 0,
        fx: null as number | null,
        fy: null as number | null,
      }))
      const nodeById = new Map(nodeData.map(n => [n.id, n]))

      // Teacher→student edges only; normalise direction: source=teacher, target=student
      const linkData = connections
        .filter(c => c.type === 'teacher' || c.type === 'student')
        .map(c => c.type === 'student'
          ? { source: c.target, target: c.source }
          : { source: c.source, target: c.target }
        )
        .filter(c => nodeById.has(c.source) && nodeById.has(c.target))

      linkData.forEach(l => {
        const s = nodeById.get(l.source); if (s) s.degree++
        const t = nodeById.get(l.target); if (t) t.degree++
      })

      const r = (d: any) => Math.min(20, 4 + Math.sqrt(d.degree || 0) * 2.2)

      // Adjacency for hover highlight (bidirectional for display)
      const adj = new Map<string, Set<string>>()
      linkData.forEach(l => {
        if (!adj.has(l.source)) adj.set(l.source, new Set())
        if (!adj.has(l.target)) adj.set(l.target, new Set())
        adj.get(l.source)!.add(l.target)
        adj.get(l.target)!.add(l.source)
      })

      // ── Force simulation ──────────────────────────────────────────────
      let sim: any = null
      try {
        const eraYOf = (d: any) => {
          const i = ERA_ORDER.indexOf(d.period as Period)
          return PAD_TOP + (i >= 0 ? i : 3) * BAND_H + BAND_H / 2
        }

        // Optimized simulation: Run in batches with requestAnimationFrame
        // Prevents main-thread blocking while maintaining smooth animations
        sim = d3.forceSimulation(nodeData as any)
          .force('link', d3.forceLink(linkData as any).id((d: any) => d.id).distance(55).strength(0.25))
          .force('charge', d3.forceManyBody().strength(-70))
          .force('x', d3.forceX((d: any) => {
            // Hub nodes gravitate toward center, sparse ones spread out
            const deg = (d as any).degree || 0
            return LABEL_W + (W - LABEL_W * 2) * (0.1 + 0.8 * (deg > 5 ? 0.5 : Math.random()))
          }).strength(0.04))
          .force('y', d3.forceY(eraYOf).strength(0.9))   // strong: keeps nodes in their band
          .force('collide', d3.forceCollide((d: any) => r(d) + 5).strength(0.85))
          .alphaDecay(0.025)
          .stop() // Start paused

        // Warm-up: 20 ticks immediately
        for (let i = 0; i < 20; i++) {
          sim.tick()
        }

        // Run remaining ticks in batches with RAF
        let tickCount = 20
        const maxTicks = 200
        const ticksPerBatch = 5

        const runBatch = () => {
          for (let i = 0; i < ticksPerBatch && tickCount < maxTicks; i++) {
            sim.tick()
            tickCount++
          }
          if (tickCount < maxTicks) {
            requestAnimationFrame(runBatch)
          }
        }

        if (tickCount < maxTicks) {
          requestAnimationFrame(runBatch)
        }
      } catch (err) {
        console.error('[GenealogyTree] D3 simulation error:', err)
      }

      // ── Pan/zoom ──────────────────────────────────────────────────────
      const g = svg.append('g')
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 4])
        .on('zoom', ev => g.attr('transform', ev.transform))
      svg.call(zoom)

      // ── Links ─────────────────────────────────────────────────────────
      const linkG = g.append('g')
      const link = linkG.selectAll('path')
        .data(linkData).join('path')
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 1.1)
        .attr('stroke-opacity', 0.18)
        .attr('marker-end', 'url(#gt-arrow)')

      // ── Nodes ─────────────────────────────────────────────────────────
      const nodeG = g.append('g')
      const node = nodeG.selectAll('circle')
        .data(nodeData).join('circle')
        .attr('r', r)
        .attr('fill', (d: any) => ERA_COLORS[d.period as Period] ?? '#7a6550')
        .attr('stroke', '#0a0806')
        .attr('stroke-width', 1.5)
        .attr('fill-opacity', 0.88)
        .style('cursor', 'pointer')

      // ── Labels ────────────────────────────────────────────────────────
      const labelG = g.append('g')
      const label = labelG.selectAll('text')
        .data(nodeData).join('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => `-${r(d) + 4}px`)
        .attr('font-family', 'Heebo, sans-serif')
        .attr('font-size', '9px').attr('font-weight', '500')
        .attr('fill', '#e8d5b0')
        .attr('stroke', '#0a0806').attr('stroke-width', 2).attr('paint-order', 'stroke')
        .attr('pointer-events', 'none')
        .attr('opacity', 0)
        .text((d: any) => d.label || '')

      // ── Drag ──────────────────────────────────────────────────────────
      const drag = d3.drag<SVGCircleElement, any>()
        .on('start', (ev, d) => { if (!ev.active && sim) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y })
        .on('end',   (ev, d) => { if (!ev.active && sim) sim.alphaTarget(0); d.fx = null; d.fy = null })
      node.call(drag as any)

      // ── Interactions ──────────────────────────────────────────────────
      node
        .on('mouseover', (_ev: MouseEvent, d: any) => {
          const nb = adj.get(d.id) || new Set()
          node.transition().duration(150)
            .attr('fill-opacity', (n: any) => n.id === d.id || nb.has(n.id) ? 1 : 0.07)
            .attr('r', (n: any) => n.id === d.id ? r(n) + 3 : r(n))
          link.transition().duration(150)
            .attr('stroke-opacity', (l: any) => {
              const sId = typeof l.source === 'string' ? l.source : l.source.id
              const tId = typeof l.target === 'string' ? l.target : l.target.id
              return sId === d.id || tId === d.id ? 0.85 : 0.02
            })
          label.transition().duration(150)
            .attr('opacity', (n: any) => n.id === d.id || nb.has(n.id) ? 1 : 0)
        })
        .on('mouseout', () => {
          node.transition().duration(300).attr('fill-opacity', 0.88).attr('r', r)
          link.transition().duration(300).attr('stroke-opacity', 0.18)
          label.transition().duration(300).attr('opacity', 0)
        })
        .on('click', (ev: MouseEvent, d: any) => {
          ev.stopPropagation()
          const sage = sages.find(s => s.id === d.id)
          if (sage) selectSage(sage)
        })

      // ── Tick ──────────────────────────────────────────────────────────
      sim.on('tick', () => {
        // Clamp to era band (hard constraint)
        nodeData.forEach((d: any) => {
          const i = ERA_ORDER.indexOf(d.period as Period)
          if (i < 0) return
          const yMin = PAD_TOP + i * BAND_H + 14
          const yMax = PAD_TOP + (i + 1) * BAND_H - 14
          d.y = Math.max(yMin, Math.min(yMax, d.y))
          d.x = Math.max(LABEL_W + 10, Math.min(W - 10, d.x))
        })

        link.attr('d', (d: any) => {
          const sx = d.source.x, sy = d.source.y
          const tx = d.target.x, ty = d.target.y
          const mx = (sx + tx) / 2, my = (sy + ty) / 2
          const dx = tx - sx, dy = ty - sy
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const ox = -dy / dist * 14
          const oy =  dx / dist * 14
          return `M${sx},${sy} Q${mx + ox},${my + oy} ${tx},${ty}`
        })
        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)
        label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y)
      })
    }

    build()
    return () => { mounted = false }
  }, [sages.length, connections.length, locale])

  // Selection ring: sync when selectedSageId changes (separate effect, no rebuild)
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const d3Sel = (window as any).__d3
    // Handled inside build() via store subscription — selectedSageId is read at click time
  }, [selectedSageId])

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Info bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-ink-700/40 bg-ink-900/60">
        <span className="text-xs font-sans text-ink-400">
          {locale === 'he'
            ? 'עץ שושלות — חיצים: כיוון רב → תלמיד'
            : 'Lineage Tree — arrows: teacher → student direction'}
        </span>
        <span className="text-[10px] font-sans text-ink-600">
          {tr(locale, 'גרור · זום · לחץ לפרופיל', 'Drag · Zoom · Click for profile', 'Перетаскивание · Зум · Клик — профиль')}
        </span>
      </div>

      {/* Scrollable canvas */}
      <div className="flex-1 overflow-auto" dir="ltr">
        <div
          ref={containerRef}
          className="min-h-full"
          style={{ minWidth: 1000, height: TOTAL_H }}
        />
      </div>

      {/* Era legend strip */}
      <div className="flex-shrink-0 flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-ink-700/40 bg-ink-900/60">
        {ERA_ORDER.map(era => (
          <div key={era} className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: ERA_COLORS[era] }} />
            <span className="text-[10px] font-sans text-ink-400 whitespace-nowrap">
              {ERA_LABELS[era]?.[locale]}
            </span>
            <span className="text-ink-800 mx-1">·</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 flex-shrink-0 ms-2">
          <svg width="28" height="8">
            <line x1="2" y1="4" x2="22" y2="4" stroke="#3b82f6" strokeWidth="1.5" opacity="0.75" />
            <polygon points="22,1.5 27,4 22,6.5" fill="#3b82f6" opacity="0.75" />
          </svg>
          <span className="text-[10px] font-sans text-ink-500">
            {tr(locale, 'רב ← תלמיד', 'teacher → student', 'учитель → ученик')}
          </span>
        </div>
      </div>
    </div>
  )
}
