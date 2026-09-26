'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS, REGION_COLORS, REGION_LABELS, CONNECTION_LABELS, ALL_PERIODS } from '@/lib/types'
import { tr } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import { PathFinder } from '@/components/viz/PathFinder'
import type { Locale, Period, Region } from '@/lib/types'
import { locationToRegion, regionsOf } from '@/lib/regions'

type ColorMode = 'era' | 'region'

const CONNECTION_COLORS: Record<string, string> = {
  student:      '#3b82f6',
  teacher:      '#3b82f6',
  influence:    '#f59e0b',
  colleague:    '#22c55e',
  oppose:       '#ef4444',
  family:       '#a855f7',
  contemporary: '#14b8a6',
  predecessor:  '#64748b',
}

const CONNECTION_DASH: Record<string, string | null> = {
  student:      null,
  teacher:      null,
  influence:    '7,4',
  colleague:    '3,4',
  oppose:       '3,3',
  contemporary: '2,4',
  predecessor:  null,
}

const ERA_ORDER: Record<string, number> = {
  patriarchs: 0, exodus: 1, judges: 2, kings: 3,
  'second-temple': 4, tannaim: 5, amoraim: 6, geonim: 7,
  rishonim: 8, acharonim: 9, modern: 10,
}
const ERA_COUNT = 11

/**
 * x של עמודת התקופה על ציר הזמן (שמאל→ימין, כרונולוגי).
 * מוגדר ברמת המודול כי גם ה-build וגם אפקט הסינון צריכים אותו — הסינון
 * מחליף את forceX ולכן חייב לחשב את אותן קואורדינטות בדיוק.
 */
function eraXAt(period: string, W: number): number {
  const idx = ERA_ORDER[period] ?? 5
  return (W * 0.05) + idx * (W * 0.9 / (ERA_COUNT - 1))
}

/** משיכת ציר-הזמן: רופפת במצב חופשי, חזקה כשיש סינון (עמודות ברורות). */
const ERA_PULL_IDLE     = 0.14
const ERA_PULL_FILTERED = 0.9
const ERA_PULL_DIMMED   = 0.06
/** כוח הקשתות — מרופף בזמן סינון כדי שהכרונולוגיה תנצח את הקליקות. */
const LINK_STRENGTH_IDLE     = 0.35
const LINK_STRENGTH_FILTERED = 0.04

/**
 * שקיפות בסיס של קשת לפי הסינון הפעיל. בלי זה מאות הקשתות של החכמים
 * המעומעמים ממשיכות להיצבע ב-0.22 ומכסות על העיגולים שנותרו — ואז לא רואים
 * שהם מסודרים בעמודות. `ids === null` פירושו "אין סינון".
 */
function linkOpacityFor(l: any, ids: Set<string> | null): number {
  if (!ids) return 0.22
  const s = typeof l.source === 'object' ? l.source.id : l.source
  const t = typeof l.target === 'object' ? l.target.id : l.target
  return ids.has(s) && ids.has(t) ? 0.5 : 0.03
}

const DIRECTED = new Set(['teacher', 'student', 'predecessor'])

/**
 * Arrowhead for a directed edge, or none when the edge is dimmed: an SVG
 * marker ignores its path's stroke-opacity, so a faded edge would otherwise
 * keep a full-strength arrowhead — dozens of stray triangles once a filter
 * zooms in. `ids === null` means no filter.
 */
function linkMarkerFor(l: any, ids: Set<string> | null): string | null {
  if (!DIRECTED.has(l.type)) return null
  if (ids) {
    const s = typeof l.source === 'object' ? l.source.id : l.source
    const t = typeof l.target === 'object' ? l.target.id : l.target
    if (!ids.has(s) || !ids.has(t)) return null
  }
  return `url(#arrow-${l.type})`
}

function nodeColor(d: any, mode: ColorMode): string {
  const eraColor = ERA_COLORS[d.period as Period] ?? '#7a6550'
  if (mode === 'era') return eraColor
  const region: Region | null = d.region ?? locationToRegion(d.location)
  return (region && REGION_COLORS[region]) ? REGION_COLORS[region] : eraColor
}

function gradId(id: string) { return `grad-mig-${id}` }

/** Edges per sage, counted over the full (uncapped) edge list. */
function degreeMap(connections: { source: string; target: string }[]): Map<string, number> {
  const m = new Map<string, number>()
  connections.forEach(c => {
    m.set(c.source, (m.get(c.source) ?? 0) + 1)
    m.set(c.target, (m.get(c.target) ?? 0) + 1)
  })
  return m
}

interface FitRequest { ids: Set<string> | null; pad: number; maxScale: number }

interface NetworkGraphProps { locale: Locale }

export function NetworkGraph({ locale }: NetworkGraphProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const svgElRef      = useRef<SVGSVGElement | null>(null)
  const simRef        = useRef<import('d3').Simulation<any, any> | null>(null)
  const zoomRef       = useRef<import('d3').ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const nodeSelRef    = useRef<import('d3').Selection<any, any, any, any> | null>(null)
  const linkSelRef    = useRef<import('d3').Selection<any, any, any, any> | null>(null)
  const labelSelRef   = useRef<import('d3').Selection<any, any, any, any> | null>(null)
  const colorModeRef  = useRef<ColorMode>('region')
  const filteredIdsRef = useRef<Set<string> | null>(null)   // hover restores per-filter dim
  const dimsRef = useRef<{ W: number; H: number }>({ W: 800, H: 600 })
  const eraGuidesRef  = useRef<import('d3').Selection<any, any, any, any> | null>(null)
  const tooltipRef    = useRef<HTMLDivElement | null>(null)
  const pendingFitRef = useRef<FitRequest | null>(null)

  const [colorMode, setColorMode] = useState<ColorMode>('region')
  const [showPathFinder, setShowPathFinder] = useState(false)
  // Clicked edge → relationship detail card (masterplan §2: clickable edges)
  const [edgeInfo, setEdgeInfo] = useState<{ sourceId: string; targetId: string; type: string } | null>(null)
  // Bumped when an async build finishes, so the filter and selection effects
  // re-apply to the fresh selections (they may have run before the build did).
  const [graphVersion, setGraphVersion] = useState(0)

  const { sages, connections, selectSage, filteredSages, selectedSageId, sageMap, activeTab } = useAppStore()

  // Mirror state → ref so D3 closures always read the latest value
  useEffect(() => { colorModeRef.current = colorMode }, [colorMode])

  /**
   * Zoom so the given nodes (all when `ids` is null) fill the viewport.
   * The graph stays mounted but display:none on other tabs, and a d3-zoom
   * transition on a 0×0 svg interpolates to translate(NaN,NaN) — so while
   * hidden the request is parked and replayed when the tab is shown again.
   */
  const fitTo = (req: FitRequest, duration: number) => {
    const container = containerRef.current
    if (!container || !svgElRef.current || !zoomRef.current || !nodeSelRef.current) return
    if (!container.clientWidth || !container.clientHeight) { pendingFitRef.current = req; return }
    import('d3').then(d3 => {
      const svgEl = svgElRef.current, zoom = zoomRef.current, nodeSel = nodeSelRef.current
      const cW = containerRef.current?.clientWidth ?? 0
      const cH = containerRef.current?.clientHeight ?? 0
      if (!svgEl || !zoom || !nodeSel) return
      if (!cW || !cH) { pendingFitRef.current = req; return }
      const pts = (nodeSel.data() as any[]).filter(d => !req.ids || req.ids.has(d.id))
      const xs  = pts.map(d => d.x as number).filter(isFinite)
      const ys  = pts.map(d => d.y as number).filter(isFinite)
      if (xs.length < 2) return
      const x0 = Math.min(...xs), x1 = Math.max(...xs)
      const y0 = Math.min(...ys), y1 = Math.max(...ys)
      const scale = Math.min(
        (cW - req.pad * 2) / Math.max(1, x1 - x0),
        (cH - req.pad * 2) / Math.max(1, y1 - y0),
        req.maxScale,
      )
      const tx = cW / 2 - scale * (x0 + x1) / 2
      const ty = cH / 2 - scale * (y0 + y1) / 2
      d3.select(svgEl)
        .transition().duration(duration)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
    })
  }

  // ── Build graph ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sages.length || !containerRef.current) return
    let mounted = true

    async function build() {
      const d3 = await import('d3')
      if (!mounted || !containerRef.current) return

      const container = containerRef.current
      const W = container.clientWidth  || 800
      const H = container.clientHeight || 600
      dimsRef.current = { W, H }

      d3.select(container).selectAll('svg').remove()
      simRef.current?.stop()

      const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('background', 'transparent')

      svgElRef.current = svg.node()

      // ── SVG defs: arrowheads + gradients ────────────────────────────────
      const defs = svg.append('defs')

      // Arrowhead marker for directed links (teacher→student, predecessor)
      const arrowTypes = ['student', 'teacher', 'predecessor'] as const
      arrowTypes.forEach(type => {
        const color = CONNECTION_COLORS[type] || '#5a4a38'
        defs.append('marker')
          .attr('id',          `arrow-${type}`)
          .attr('viewBox',     '0 -5 10 10')
          .attr('refX',        14)
          .attr('refY',        0)
          .attr('markerWidth', 6)
          .attr('markerHeight',6)
          .attr('orient',      'auto')
          .append('path')
          .attr('d',    'M0,-5L10,0L0,5')
          .attr('fill', color)
          .attr('opacity', 0.8)
      })
      sages.forEach(sage => {
        // דו-צבעי: migration_path אם קיים, אחרת אזורים מתוך טקסט המיקום
        let fromR = sage.migration_path ? locationToRegion(sage.migration_path.from) : null
        let toR   = sage.migration_path ? locationToRegion(sage.migration_path.to)   : null
        if (!fromR || !toR || fromR === toR) {
          const regs = regionsOf(sage.location)
          if (regs.length >= 2) { fromR = regs[0]; toR = regs[regs.length - 1] }
        }
        if (!fromR || !toR || fromR === toR) return
        const c0 = REGION_COLORS[fromR]
        const c1 = REGION_COLORS[toR]

        const grad = defs.append('linearGradient')
          .attr('id', gradId(sage.id))
          .attr('gradientUnits', 'objectBoundingBox')
          .attr('x1', '0').attr('y1', '0')
          .attr('x2', '0').attr('y2', '1')
        // 50/50 hard split — מוצא למעלה, יעד למטה (כמו בטבלה המודפסת)
        grad.append('stop').attr('offset', '50%').attr('stop-color', c0)
        grad.append('stop').attr('offset', '50%').attr('stop-color', c1)
      })

      const g = svg.append('g')

      // No historical-event bars here: in this free force layout x is not
      // time, so a dated vertical line only cut through arbitrary nodes. The
      // timeline tab carries the milestones on a real time axis.

      // ── Era columns ──────────────────────────────────────────────────────
      // קווי עזר אנכיים בעמודות התקופות, בצבעי המקרא. מוסתרים כשאין סינון
      // (אז הרשת אורגנית), ונחשפים ברגע שמסננים — יחד עם forceX המוגבר הם
      // מראים שהעיגולים מסודרים משמאל לימין לפי סדר הזמן.
      const eraGuidesG = g.append('g')
        .attr('class', 'era-guides')
        .attr('pointer-events', 'none')
        .style('opacity', 0)
      eraGuidesRef.current = eraGuidesG
      ALL_PERIODS.forEach(p => {
        const x = eraXAt(p, W)
        eraGuidesG.append('line')
          .attr('x1', x).attr('y1', -H * 2).attr('x2', x).attr('y2', H * 3)
          .attr('stroke', ERA_COLORS[p])
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '2,8')
          .attr('opacity', 0.4)
      })

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 4])
        .on('zoom', ev => g.attr('transform', ev.transform))
      svg.call(zoom)
      zoomRef.current = zoom

      // ── Data prep ────────────────────────────────────────────────────────
      // Every sage becomes a node and every connection an edge: filters only
      // dim (see the filter effect), they never remove. An earlier top-400
      // cut, taken before filtering, dropped 42% of the links — every family,
      // oppose, colleague, contemporary and predecessor edge — and left half
      // the nodes unconnected. ~650 edges draw comfortably.
      const sageIds = new Set(sages.map(s => s.id))
      // Only edges whose both ends are loaded sages; the degree comes from
      // this same list so the tooltip matches the drawer's related count.
      const links = connections
        .filter(l => sageIds.has(l.source) && sageIds.has(l.target))
        .map(l => ({ ...l }))
      const degree = degreeMap(links)
      const nodes = sages.map(s => ({ ...s, degree: degree.get(s.id) ?? 0 }))

      // The filter effect sets the real value once the build has finished
      filteredIdsRef.current = null

      const adj = new Map<string, Set<string>>()
      links.forEach(l => {
        if (!adj.has(l.source)) adj.set(l.source, new Set())
        if (!adj.has(l.target)) adj.set(l.target, new Set())
        adj.get(l.source)!.add(l.target)
        adj.get(l.target)!.add(l.source)
      })

      const r = (d: any) => Math.min(22, 5 + Math.sqrt(d.degree || 0) * 2.2)

      const eraX = (period: string) => eraXAt(period, W)

      // ── Force simulation ─────────────────────────────────────────────────
      const sim = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(75).strength(LINK_STRENGTH_IDLE))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('x', d3.forceX((d: any) => eraX(d.period)).strength(ERA_PULL_IDLE))
        .force('y', d3.forceY(H / 2).strength(0.05))
        .force('collide', d3.forceCollide((d: any) => r(d) + 5).strength(0.9))

      simRef.current = sim

      // ── Links ────────────────────────────────────────────────────────────
      const linkG = g.append('g').attr('class', 'links')
      const link  = linkG.selectAll('path')
        .data(links).join('path')
        .attr('fill', 'none')
        .attr('stroke', (d: any) => CONNECTION_COLORS[d.type] || '#5a4a38')
        .attr('stroke-width', 1.2)
        .attr('stroke-opacity', 0.22)
        .attr('stroke-dasharray', (d: any) => CONNECTION_DASH[d.type] || null)
        .attr('marker-end', (d: any) => linkMarkerFor(d, null))

      linkSelRef.current = link

      // Invisible wide hit-area paths — make edges hoverable & clickable
      const hitLink = linkG.selectAll<SVGPathElement, any>('path.hit')
        .data(links).join('path')
        .attr('class', 'hit')
        .attr('fill', 'none')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 13)
        .style('cursor', 'pointer')

      // Color fill helper (reads from colorModeRef so no rebuild needed on toggle)
      const isMigrant = (d: any): boolean => {
        if (d.migration_path) {
          const fromR = locationToRegion(d.migration_path.from)
          const toR   = locationToRegion(d.migration_path.to)
          if (fromR && toR && fromR !== toR) return true
        }
        return regionsOf(d.location).length >= 2
      }
      const fillOf = (d: any) => {
        const mode = colorModeRef.current
        if (mode === 'region' && isMigrant(d)) return `url(#${gradId(d.id)})`
        return nodeColor(d, mode)
      }

      // ── Nodes ────────────────────────────────────────────────────────────
      const nodeG = g.append('g').attr('class', 'nodes')
      const node  = nodeG.selectAll<SVGCircleElement, any>('circle')
        .data(nodes).join('circle')
        .attr('r', r)
        .attr('fill', fillOf)
        .style('stroke', 'var(--ink-900)')
        .attr('stroke-width', 1.5)
        .attr('fill-opacity', 0.88)
        .style('cursor', 'pointer')

      nodeSelRef.current = node

      // ── Labels ───────────────────────────────────────────────────────────
      const labelG = g.append('g').attr('class', 'labels')
      const label  = labelG.selectAll('text')
        .data(nodes).join('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => `-${r(d) + 4}px`)
        .attr('font-family', 'Heebo, sans-serif')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .style('fill', 'var(--ink-100)')
        .style('stroke', 'var(--ink-900)')
        .attr('stroke-width', 2.5)
        .attr('paint-order', 'stroke')
        .attr('pointer-events', 'none')
        .attr('opacity', 0)
        .text((d: any) => {
          // שנים לצד השם — "סימון שנים ברשת הקשרים"
          const y = [d.birth_year, d.death_year].filter(Boolean)
            .map((v: number) => v < 0 ? `${Math.abs(v)}${tr(locale, ' לפנה"ס', ' BCE', ' до н.э.')}` : `${v}`)
          return y.length ? `${d.label || ''} · ${y.join('–')}` : (d.label || '')
        })

      labelSelRef.current = label

      // ── Drag ─────────────────────────────────────────────────────────────
      const drag = d3.drag<SVGCircleElement, any>()
        .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y })
        .on('end',   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      node.call(drag as any)

      // ── Hover (Connected Papers style) + tooltip ─────────────────────────
      const showTooltip = (ev: MouseEvent, d: any) => {
        const tip = tooltipRef.current
        if (!tip) return
        const color  = ERA_COLORS[d.period as Period] ?? '#7a6550'
        const degree = d.degree ?? 0
        const years  = [d.birth_year, d.death_year].filter(Boolean)
        tip.innerHTML = `
          <div style="font-family:'Frank Ruhl Libre',serif;font-size:15px;font-weight:700;
               color:var(--ink-100);margin-bottom:3px;">${d.label ?? ''}</div>
          ${d.name_en ? `<div style="font-size:11px;color:var(--ink-300);margin-bottom:5px;">${d.name_en}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
            <span style="font-size:10px;padding:1px 7px;border-radius:9999px;
              background:${color}22;color:${color};border:1px solid ${color}44;">
              ${ERA_LABELS[d.period as Period]?.[locale] ?? d.period}
            </span>
            ${degree ? `<span style="font-size:10px;padding:1px 7px;border-radius:9999px;
              background:rgba(201,151,58,0.15);color:#c9973a;border:1px solid rgba(201,151,58,0.3);">
              ${degree} ${tr(locale, 'קשרים', 'links', 'связей')}</span>` : ''}
          </div>
          ${d.location ? `<div style="font-size:10px;color:var(--ink-400);">📍 ${d.location}</div>` : ''}
          ${d.field    ? `<div style="font-size:10px;color:var(--ink-400);">◈ ${d.field}</div>` : ''}
          ${years.length ? `<div style="font-size:10px;color:var(--ink-500);margin-top:2px;">${years.join(' – ')}</div>` : ''}
        `
        tip.style.display = 'block'
        tip.style.left = `${ev.clientX + 14}px`
        tip.style.top  = `${ev.clientY - 10}px`
      }

      const hideTooltip = () => {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none'
      }

      // דהיית בסיס לפי הסינון הפעיל — hover לא מאפס את הסינון
      const baseOpacity = (n: any) =>
        !filteredIdsRef.current || filteredIdsRef.current.has(n.id) ? 0.88 : 0.06

      node
        .on('mouseover', (ev: MouseEvent, d: any) => {
          const nb = adj.get(d.id) || new Set()
          node.transition().duration(150)
            .attr('fill-opacity', (n: any) => {
              const inFilter = !filteredIdsRef.current || filteredIdsRef.current.has(n.id)
              if (n.id === d.id || nb.has(n.id)) return inFilter ? 1 : 0.3
              return 0.05
            })
            .attr('r',            (n: any) => n.id === d.id ? r(n) + 3 : r(n))
          link
            .attr('marker-end', (l: any) =>
              l.source.id === d.id || l.target.id === d.id ? linkMarkerFor(l, null) : null)
            .transition().duration(150)
            .attr('stroke-opacity', (l: any) =>
              l.source.id === d.id || l.target.id === d.id ? 0.85 : 0.02)
          label.transition().duration(150)
            .attr('opacity', (n: any) => n.id === d.id || nb.has(n.id) ? 1 : 0)
          showTooltip(ev, d)
        })
        .on('mousemove', (ev: MouseEvent) => {
          const tip = tooltipRef.current
          if (!tip) return
          tip.style.left = `${ev.clientX + 14}px`
          tip.style.top  = `${ev.clientY - 10}px`
        })
        .on('mouseout', () => {
          // משחזר את מצב הסינון (לא מאפס ל-0.88 גורף)
          node.transition().duration(300).attr('fill-opacity', (n: any) => baseOpacity(n)).attr('r', r)
          link
            .attr('marker-end', (l: any) => linkMarkerFor(l, filteredIdsRef.current))
            .transition().duration(300)
            .attr('stroke-opacity', (l: any) => linkOpacityFor(l, filteredIdsRef.current))
          label.transition().duration(300).attr('opacity', 0)
          hideTooltip()
        })
        .on('click', (ev: MouseEvent, d: any) => {
          ev.stopPropagation()
          hideTooltip()
          const sage = sages.find(s => s.id === d.id)
          if (sage) selectSage(sage)
        })

      // ── Edge hover + click (relationship details) ────────────────────────
      hitLink
        .on('mouseover', (_ev: MouseEvent, d: any) => {
          link
            .attr('marker-end', (l: any) => l === d ? linkMarkerFor(l, null) : null)
            .transition().duration(120)
            .attr('stroke-opacity', (l: any) => l === d ? 0.95 : 0.04)
            .attr('stroke-width',   (l: any) => l === d ? 2.6  : 1.2)
          node.transition().duration(120)
            .attr('fill-opacity', (n: any) =>
              n.id === d.source.id || n.id === d.target.id ? 1 : 0.08)
          label.transition().duration(120)
            .attr('opacity', (n: any) =>
              n.id === d.source.id || n.id === d.target.id ? 1 : 0)
        })
        .on('mouseout', () => {
          link
            .attr('marker-end', (l: any) => linkMarkerFor(l, filteredIdsRef.current))
            .transition().duration(250)
            .attr('stroke-opacity', (l: any) => linkOpacityFor(l, filteredIdsRef.current))
            .attr('stroke-width', 1.2)
          node.transition().duration(250)
            .attr('fill-opacity', (n: any) => baseOpacity(n))
          label.transition().duration(250).attr('opacity', 0)
        })
        .on('click', (ev: MouseEvent, d: any) => {
          ev.stopPropagation()
          setEdgeInfo({
            sourceId: typeof d.source === 'object' ? d.source.id : d.source,
            targetId: typeof d.target === 'object' ? d.target.id : d.target,
            type: d.type,
          })
        })

      // ── Tick ─────────────────────────────────────────────────────────────
      const linkPath = (d: any) => {
        const sx = d.source.x, sy = d.source.y
        const tx = d.target.x, ty = d.target.y
        const mx = (sx + tx) / 2, my = (sy + ty) / 2
        const dx = tx - sx, dy = ty - sy
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const ox = -dy / dist * 18
        const oy =  dx / dist * 18
        return `M${sx},${sy} Q${mx + ox},${my + oy} ${tx},${ty}`
      }
      sim.on('tick', () => {
        link.attr('d', linkPath)
        hitLink.attr('d', linkPath)
        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)
        label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y)
      })

      if (mounted) setGraphVersion(v => v + 1)
    }

    build()

    // Zoom-to-fit once after simulation settles (~2s) — to the filtered
    // subset when the app opened with a filter (e.g. from ?periods=)
    const fitTimer = setTimeout(() => {
      if (!mounted) return
      const ids = filteredIdsRef.current
      fitTo(ids && ids.size > 0
        ? { ids, pad: 80, maxScale: 3 }
        : { ids: null, pad: 60, maxScale: 1.2 }, 800)
    }, 2000)

    return () => { mounted = false; simRef.current?.stop(); clearTimeout(fitTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length, connections.length])

  // ── Sync color mode (no graph rebuild) ──────────────────────────────────
  useEffect(() => {
    if (!nodeSelRef.current) return
    nodeSelRef.current.transition().duration(400)
      .attr('fill', (d: any) => {
        if (colorMode === 'region') {
          const mig = d.migration_path
          const fromR = mig ? locationToRegion(mig.from) : null
          const toR   = mig ? locationToRegion(mig.to)   : null
          if ((fromR && toR && fromR !== toR) || regionsOf(d.location).length >= 2) {
            return `url(#${gradId(d.id)})`
          }
        }
        return nodeColor(d, colorMode)
      })
  }, [colorMode])

  // ── Sync filter dim + zoom-to-fit ────────────────────────────────────────
  useEffect(() => {
    if (!nodeSelRef.current) return
    const ids      = new Set(filteredSages.map(s => s.id))
    const noFilter = ids.size === sages.length
    filteredIdsRef.current = noFilter ? null : ids
    // A subset fit parked while hidden belongs to the previous filter; fall
    // back to fitting everything (a narrower fit below replaces this again).
    if (pendingFitRef.current) pendingFitRef.current = { ids: null, pad: 60, maxScale: 1.2 }
    nodeSelRef.current.transition().duration(250)
      .attr('fill-opacity', (d: any) => noFilter || ids.has(d.id) ? 0.88 : 0.06)
    linkSelRef.current
      ?.attr('marker-end', (l: any) => linkMarkerFor(l, filteredIdsRef.current))
      .transition().duration(250)
      .attr('stroke-opacity', (l: any) => linkOpacityFor(l, filteredIdsRef.current))

    // קווי עזר של התקופות — נחשפים רק כשיש סינון
    eraGuidesRef.current?.transition().duration(300).style('opacity', noFilter ? 0 : 1)

    // ריכוז למרכז (כמו באתר הקלאסי): המסוננים נמשכים לרצועת האמצע,
    // ציר התקופות (forceX) נשמר — כך הקבוצה מתקבצת אך לא מאבדת כרונולוגיה.
    // בזמן סינון המשיכה לציר מתחזקת (0.14 → 0.9) והקשתות מתרופפות, כך
    // שהעיגולים שנותרו נערכים בעמודות ברורות משמאל לימין לפי סדר התקופות.
    if (simRef.current) {
      import('d3').then(d3 => {
        const sim = simRef.current
        if (!sim) return
        const { W, H } = dimsRef.current
        sim.force('y', d3.forceY(H / 2).strength((d: any) =>
          noFilter ? 0.05 : ids.has(d.id) ? 0.28 : 0.02))
        sim.force('charge', d3.forceManyBody().strength((d: any) =>
          noFilter ? -120 : ids.has(d.id) ? -160 : -40))
        sim.force('x', d3.forceX((d: any) => eraXAt(d.period, W)).strength((d: any) =>
          noFilter ? ERA_PULL_IDLE : ids.has(d.id) ? ERA_PULL_FILTERED : ERA_PULL_DIMMED))
        // forceLink נבנה ב-build עם מערך הקשתות; כאן רק מכווננים עוצמה
        const linkForce = sim.force('link') as { strength?: (v: number) => unknown } | undefined
        linkForce?.strength?.(noFilter ? LINK_STRENGTH_IDLE : LINK_STRENGTH_FILTERED)
        // Never cool a simulation that is still settling (e.g. right after build)
        sim.alpha(Math.max(sim.alpha(), 0.45)).restart()
      })
    }

    // Zoom-to-fit when filter narrows down to a manageable subset
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    if (!noFilter && filteredSages.length > 0 && filteredSages.length < sages.length * 0.5) {
      const req: FitRequest = { ids, pad: 80, maxScale: 3 }
      fitTo(req, 700)
      // המדידה הראשונה נעשית לפי המיקומים הישנים; אחרי שהסימולציה מסדרת
      // את העמודות הכרונולוגיות ממסגרים מחדש כדי שכל הטווח ייכנס לתצוגה.
      settleTimer = setTimeout(() => fitTo(req, 600), 1200)
    }
    return () => { if (settleTimer) clearTimeout(settleTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSages, sages.length, graphVersion])

  // ── Replay a fit that was parked while the tab was hidden ────────────────
  useEffect(() => {
    if (activeTab !== 'graph' || !pendingFitRef.current) return
    const req = pendingFitRef.current
    pendingFitRef.current = null
    fitTo(req, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // ── Sync selection ring ──────────────────────────────────────────────────
  useEffect(() => {
    if (!nodeSelRef.current) return
    nodeSelRef.current
      .style('stroke',      (d: any) => d.id === selectedSageId ? 'var(--gold-500)' : 'var(--ink-900)')
      .attr('stroke-width', (d: any) => d.id === selectedSageId ? 3 : 1.5)
    labelSelRef.current?.attr('opacity', (d: any) => d.id === selectedSageId ? 1 : 0)
  }, [selectedSageId, graphVersion])

  const zoomBy = (k: number) => {
    if (!svgElRef.current || !zoomRef.current) return
    import('d3').then(d3 =>
      d3.select(svgElRef.current!).transition().duration(300).call(zoomRef.current!.scaleBy, k))
  }
  const zoomReset = () => {
    if (!svgElRef.current || !zoomRef.current) return
    import('d3').then(d3 =>
      d3.select(svgElRef.current!).transition().duration(500).call(zoomRef.current!.transform, d3.zoomIdentity))
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Tooltip — positioned by D3 mouse events */}
      <div
        ref={tooltipRef}
        style={{ display: 'none', position: 'fixed', zIndex: 50, pointerEvents: 'none',
          maxWidth: 220, padding: '8px 12px',
          background: 'var(--ink-850)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(201,151,58,0.2)', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      />

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {tr(locale, 'טוען רשת...', 'Loading network...', 'Загрузка сети...')}
          </p>
        </div>
      )}

      <GraphLegend locale={locale} colorMode={colorMode} setColorMode={setColorMode} />

      {/* Edge relationship card — opens on edge click */}
      {edgeInfo && (() => {
        const src = sageMap.get(edgeInfo.sourceId)
        const tgt = sageMap.get(edgeInfo.targetId)
        if (!src || !tgt) return null
        const typeColor = CONNECTION_COLORS[edgeInfo.type] ?? '#c9973a'
        const typeLabel = CONNECTION_LABELS[edgeInfo.type as keyof typeof CONNECTION_LABELS]?.[locale] ?? edgeInfo.type
        return (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 glass rounded-xl border border-gold-500/25 shadow-glass-lg px-4 py-3 w-[340px] max-w-[calc(100vw-32px)] animate-fade-in">
            <button
              onClick={() => setEdgeInfo(null)}
              className="absolute top-2 end-2 text-ink-500 hover:text-ink-200 transition-colors"
              aria-label={tr(locale, 'סגור', 'Close', 'Закрыть')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-500 mb-2">
              {tr(locale, 'מהות הקשר', 'Relationship', 'Характер связи')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { selectSage(src); setEdgeInfo(null) }}
                className="flex-1 min-w-0 text-start px-2.5 py-1.5 rounded-lg bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/40 transition-colors"
              >
                <span className="text-sm font-serif text-ink-100 truncate block">{src.label}</span>
              </button>
              <span
                className="flex-shrink-0 text-[10px] font-sans font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                style={{ background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}55` }}
              >
                {typeLabel}
              </span>
              <button
                onClick={() => { selectSage(tgt); setEdgeInfo(null) }}
                className="flex-1 min-w-0 text-start px-2.5 py-1.5 rounded-lg bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/40 transition-colors"
              >
                <span className="text-sm font-serif text-ink-100 truncate block">{tgt.label}</span>
              </button>
            </div>
          </div>
        )
      })()}

      {/* PathFinder panel — top-end corner, below the filter chip bar */}
      {showPathFinder && (
        <div className="absolute end-4 z-20 animate-fade-in" style={{ top: BELOW_CHIPS }}>
          <PathFinder locale={locale} onClose={() => setShowPathFinder(false)} />
        </div>
      )}

      {/* Zoom + PathFinder toggle cluster. On mobile the search FAB (FAB.tsx,
          fixed bottom-20 end-4, 56px) owns this corner, so the cluster starts
          above it; from md up the FAB is hidden. */}
      <div className="absolute bottom-[9.5rem] md:bottom-20 end-4 z-10 flex flex-col gap-1.5">
        <ZoomBtn onClick={() => zoomBy(1.5)} label="+">+</ZoomBtn>
        <ZoomBtn onClick={zoomReset} label="⊙">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </ZoomBtn>
        <ZoomBtn onClick={() => zoomBy(0.67)} label="−">−</ZoomBtn>
        <div className="h-px bg-ink-700/50 my-0.5" />
        <button
          onClick={() => setShowPathFinder(p => !p)}
          aria-label={tr(locale, 'מוצא מסלול', 'Path Finder', 'Поиск пути')}
          title={tr(locale, 'מוצא מסלול', 'Path Finder', 'Поиск пути')}
          className={cn(
            'w-11 h-11 md:w-8 md:h-8 rounded-lg text-xs font-mono glass border transition-all',
            'flex items-center justify-center',
            showPathFinder
              ? 'bg-gold-500/20 border-gold-500/50 text-gold-300 shadow-gold-glow'
              : 'border-ink-600/40 text-ink-300 hover:text-gold-300 hover:border-gold-500/30',
          )}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ZoomBtn({ onClick, children, label }: {
  onClick: () => void; children: React.ReactNode; label: string
}) {
  return (
    <button onClick={onClick} aria-label={label} className={cn(
      'w-11 h-11 md:w-8 md:h-8 rounded-lg text-sm font-mono glass border border-ink-600/40',
      'text-ink-300 hover:text-gold-300 hover:border-gold-500/30',
      'transition-all flex items-center justify-center',
    )}>
      {children}
    </button>
  )
}

const ERAS_LIST: Period[] = ALL_PERIODS
const REGIONS_LIST: Region[] = [
  'eretz-israel', 'sefarad', 'ashkenaz', 'east-europe',
  'tsarfat', 'provence', 'italy', 'north-africa', 'mizrach', 'other',
]

/**
 * Top offset for overlays that share the graph's top edge with FilterChips.
 * The chip bar publishes its bottom edge as --filter-chips-h on the shared
 * parent (and it grows when the fields row opens), so these never sit under it.
 */
const BELOW_CHIPS = 'calc(var(--filter-chips-h, 3rem) + 0.5rem)'

function GraphLegend({ locale, colorMode, setColorMode }: {
  locale: Locale; colorMode: ColorMode; setColorMode: (m: ColorMode) => void
}) {
  const isHe = locale === 'he'
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div
      data-tour="legend"
      className={cn(
        'absolute start-4 z-10',
        'glass rounded-xl overflow-hidden',
        'flex flex-col min-w-[140px]',
      )}
      style={{ top: BELOW_CHIPS }}>
      {/* Title bar (always visible) */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between gap-3 px-3 py-2 text-start hover:bg-ink-700/30 transition-colors"
      >
        <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-400">
          {isHe ? 'מקרא' : 'Legend'}
        </span>
        <span className="text-ink-600 text-xs">{collapsed ? '▸' : '▾'}</span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-1.5 overflow-y-auto"
          style={{ maxHeight: 'calc(100dvh - var(--header-h, 64px) - var(--filter-chips-h, 3rem) - 9rem)' }}>
          {/* Color mode toggle */}
          <div className="flex gap-1 bg-ink-800/60 rounded-lg p-0.5 mb-0.5">
            {(['era', 'region'] as ColorMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setColorMode(mode)}
                className={cn(
                  'flex-1 text-[10px] font-sans font-semibold rounded-md px-2 py-1 transition-all',
                  colorMode === mode
                    ? 'bg-gold-500/25 text-gold-300 shadow-inner'
                    : 'text-ink-500 hover:text-ink-200',
                )}
              >
                {mode === 'era' ? (isHe ? 'תקופה' : 'Era') : (isHe ? 'אזור' : 'Region')}
              </button>
            ))}
          </div>

          {/* Era legend */}
          {colorMode === 'era' && ERAS_LIST.map(era => (
            <div key={era} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ERA_COLORS[era] }} />
              <span className="text-[10px] font-sans text-ink-300 whitespace-nowrap">{ERA_LABELS[era]?.[locale]}</span>
            </div>
          ))}

          {/* Region legend */}
          {colorMode === 'region' && (
            <>
              {REGIONS_LIST.map(region => (
                <div key={region} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: REGION_COLORS[region] }} />
                  <span className="text-[10px] font-sans text-ink-300 whitespace-nowrap">{REGION_LABELS[region]?.[locale]}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 border-t border-ink-700/40 pt-1.5 mt-0.5">
                <span className="w-2.5 h-3.5 rounded-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(to bottom, #1e88e5 0%, #43a047 100%)' }} />
                <span className="text-[10px] font-sans text-ink-400 leading-tight">{isHe ? 'חכם נודד' : 'Migrating'}</span>
              </div>
            </>
          )}

          {/* Connection types */}
          <div className="border-t border-ink-700/40 pt-2 mt-1 space-y-1.5">
            <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-600 mb-1">
              {isHe ? 'סוגי קשרים' : 'Links'}
            </p>
            {(Object.entries(CONNECTION_COLORS) as [string, string][])
              .map(([type, color]) => {
                const dash = CONNECTION_DASH[type]
                const directed = type === 'teacher' || type === 'student' || type === 'predecessor'
                return (
                  <div key={type} className="flex items-center gap-2">
                    <svg width="28" height="10" className="flex-shrink-0" style={{ overflow: 'visible' }}>
                      <line x1="2" y1="5" x2={directed ? 22 : 26} y2="5"
                        stroke={color} strokeWidth="1.5" opacity="0.75"
                        strokeDasharray={dash ?? undefined} />
                      {directed && <polygon points="22,2.5 27,5 22,7.5" fill={color} opacity="0.75" />}
                    </svg>
                    <span className="text-[10px] font-sans text-ink-400 whitespace-nowrap">
                      {CONNECTION_LABELS[type as keyof typeof CONNECTION_LABELS]?.[locale] ?? type}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
