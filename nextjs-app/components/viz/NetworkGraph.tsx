'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn, formatYearRangeFor } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS, REGION_COLORS, REGION_LABELS, CONNECTION_LABELS, ALL_PERIODS } from '@/lib/types'
import { tr } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import { PathFinder, CONNECTION_COLORS, relationPhrase } from '@/components/viz/PathFinder'
import type { GraphPath } from '@/components/viz/PathFinder'
import type { Locale, Period, Region } from '@/lib/types'
import { locationToRegion, regionsOf } from '@/lib/regions'
import { displayName, displayNameShort, labelParts } from '@/lib/displayName'

type ColorMode = 'era' | 'region'

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
 * Types with a direction. Every one is drawn from the end that gives to the
 * end that receives, so an arrowhead always means "taught / influenced /
 * preceded": `teacher` runs source → target (source taught target),
 * `influence` and `predecessor` likewise, and `student` (source studied under
 * target) is drawn target → source.
 */
const FLOW_TYPES = new Set(['teacher', 'student', 'influence', 'predecessor'])
/**
 * Arrowheads shown at rest: the lineage links only. Influence is ~90% of all
 * edges, and 430 arrowheads would bury the graph; it gets its arrows in focus,
 * hover and paths, where there are few.
 */
const IDLE_ARROWS = new Set(['teacher', 'student', 'predecessor'])

const endId = (e: any): string => (typeof e === 'object' && e ? e.id : e)
const flowFrom = (l: any) => (l.type === 'student' ? l.target : l.source)
const flowTo   = (l: any) => (l.type === 'student' ? l.source : l.target)
const linkKey  = (l: { source: any; target: any; type: string }) => `${endId(l.source)}|${endId(l.target)}|${l.type}`

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

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// ── Label level of detail ───────────────────────────────────────────────────
// Labels live in a screen-space layer above the zoomed scene, so they keep a
// readable size at every zoom. Which ones show is recomputed on zoom end (and
// a few times a second while zooming or settling), never per frame: the
// candidates are the nodes in view, most-connected first; a label whose box
// overlaps one already placed is skipped, then tried below its node.

/**
 * How many labels the idle graph may show, by how far it is zoomed in beyond
 * "everything fits" (`rel` = 1): the hubs only when far out, more with every
 * step in. Collision avoidance decides the rest.
 */
function labelQuota(rel: number, area: number): number {
  // ...and never more than the screen can hold without a wall of text
  return Math.max(10, Math.min(Math.round(12 * rel * rel), Math.round(area / 7000)))
}

/**
 * The name as a graph label: the acronym or name before a parenthesised full
 * name ("רש״י (רבי שלמה יצחקי)" → "רש״י"). A lone plain word keeps its
 * parenthesis, which is what tells "שמואל (האמורא)" from the prophet.
 */
function graphLabel(label: string): string {
  const name = displayName(label)
  const m = name.match(/^(.+?)\s*\([^)]*\)\s*$/)
  if (!m) return name
  const head = m[1].trim()
  return /\s|[״"׳']/.test(head) ? head : name
}

/** Smallest on-screen node radius, so a far-out view still shows dots you can hit. */
const MIN_SCREEN_R = 2.6
/**
 * Reach of the many-body repulsion. Unbounded, it pushed the ~150 loosely
 * connected sages into a wide halo and the fit-all view down to ~0.28×,
 * where a node is a 1px speck.
 */
const CHARGE_RANGE = 320
const LABEL_FONT = 11
const LABEL_FONT_HUB = 12.5
const LABEL_FONT_PRIMARY = 13.5
/** Degree from which an idle label is set a size up. */
const HUB_DEGREE = 12

interface LabelSpot { d: any; text: string; fs: number; side: -1 | 1; kind: 'primary' | 'hub' | 'plain' }

const UI_TEXT = {
  focus:       { he: 'מיקוד',  en: 'Focus', ru: 'Фокус' },
  twoHops:     { he: '2 צעדים', en: '2 hops', ru: '2 шага' },
  twoHopsHint: { he: 'הצג גם את מי שקשור לשכנים', en: 'Also show the neighbours’ neighbours', ru: 'Показать и соседей соседей' },
  exitFocus:   { he: 'יציאה ממיקוד (Esc)', en: 'Exit focus (Esc)', ru: 'Выйти из фокуса (Esc)' },
  arrows:      { he: 'החצים: מהרב לתלמיד, מהמשפיע למושפע', en: 'Arrows: teacher → student, influencer → influenced', ru: 'Стрелки: учитель → ученик, влияющий → испытавший влияние' },
  zoomIn:      { he: 'הגדלה', en: 'Zoom in', ru: 'Приблизить' },
  zoomOut:     { he: 'הקטנה', en: 'Zoom out', ru: 'Отдалить' },
  fit:         { he: 'התאם לתצוגה', en: 'Fit to view', ru: 'Вписать в экран' },
  pathFinder:  { he: 'מוצא מסלול', en: 'Path Finder', ru: 'Поиск пути' },
  links:       { he: 'קשרים', en: 'links', ru: 'связей' },
} satisfies Record<string, Record<Locale, string>>

interface FitRequest { ids: Set<string> | null; pad: number; maxScale: number }

interface Mode {
  hoverId: string | null
  focusId: string | null
  depth: 1 | 2
  path: GraphPath | null
}

interface NetworkGraphProps { locale: Locale }

export function NetworkGraph({ locale }: NetworkGraphProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const svgElRef      = useRef<SVGSVGElement | null>(null)
  const simRef        = useRef<import('d3').Simulation<any, any> | null>(null)
  const zoomRef       = useRef<import('d3').ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const nodeSelRef    = useRef<import('d3').Selection<any, any, any, any> | null>(null)
  const colorModeRef  = useRef<ColorMode>('region')
  const filteredIdsRef = useRef<Set<string> | null>(null)   // hover restores per-filter dim
  const dimsRef = useRef<{ W: number; H: number }>({ W: 800, H: 600 })
  const eraGuidesRef  = useRef<import('d3').Selection<any, any, any, any> | null>(null)
  const tooltipRef    = useRef<HTMLDivElement | null>(null)
  const pendingFitRef = useRef<FitRequest | null>(null)
  /**
   * The reader has panned or zoomed since the camera last framed something.
   * Until they do, the view is framed again when the layout settles: a fit
   * taken while the simulation still moves (a deep link, the first seconds)
   * leaves nodes drifting under the tab bar.
   */
  const userMovedRef  = useRef(false)
  const pathPanelRef  = useRef<HTMLDivElement | null>(null)
  /** Everything the D3 closures read about the current emphasis. */
  const modeRef       = useRef<Mode>({ hoverId: null, focusId: null, depth: 1, path: null })
  const selectedIdRef = useRef<string | null>(null)
  /** Graph helpers installed by the build: restyle, relabel, redraw the path. */
  const apiRef = useRef<{
    restyle: () => void
    relabel: () => void
    drawPath: (animate: boolean) => void
    hood: (id: string, depth: 1 | 2) => { ring1: Set<string>; ring2: Set<string> }
  } | null>(null)

  const [colorMode, setColorMode] = useState<ColorMode>('region')
  const [showPathFinder, setShowPathFinder] = useState(false)
  // Clicked edge → relationship detail card (masterplan §2: clickable edges)
  const [edgeInfo, setEdgeInfo] = useState<{ sourceId: string; targetId: string; type: string } | null>(null)
  // Bumped when an async build finishes, so the filter and selection effects
  // re-apply to the fresh selections (they may have run before the build did).
  const [graphVersion, setGraphVersion] = useState(0)
  // Focus mode: the selected sage and their neighbourhood, everything else
  // dimmed. It outlives the drawer (closing the card keeps the focus, so the
  // neighbourhood can be read); Esc, ✕ or a click on empty canvas ends it.
  const [focusId, setFocusId] = useState<string | null>(null)
  const [focusDepth, setFocusDepth] = useState<1 | 2>(1)
  const [path, setPath] = useState<GraphPath | null>(null)

  const { sages, connections, selectSage, filteredSages, selectedSageId, sageMap, activeTab } = useAppStore()

  // Mirror state → ref so D3 closures always read the latest value
  useEffect(() => { colorModeRef.current = colorMode }, [colorMode])

  /**
   * Room the overlays leave free, in px from each container edge: the filter
   * chips on top, the tab bar at the bottom, the sage drawer (desktop) and the
   * path finder panel on the end side. A fit that ignores them centres the
   * neighbourhood under a panel.
   */
  const freeInsets = () => {
    const c = containerRef.current
    const desktop = window.innerWidth >= 768
    // bottom: the tab bar, and on phones the round search/chat buttons above it
    const ins = { top: 56, right: 0, bottom: desktop ? 96 : 152, left: 0 }
    if (!c) return ins
    const chips = parseFloat(getComputedStyle(c).getPropertyValue('--filter-chips-h'))
    if (chips > 0) ins.top = chips + 8
    const rtl = locale === 'he'
    const endSide = (w: number) => { if (rtl) ins.left = Math.max(ins.left, w); else ins.right = Math.max(ins.right, w) }
    // the zoom cluster runs up the end edge
    endSide(desktop ? 52 : 64)
    if (desktop && useAppStore.getState().isDrawerOpen) endSide(Math.min(420, c.clientWidth * 0.45))
    const panel = pathPanelRef.current?.getBoundingClientRect()
    if (panel && panel.width) {
      if (desktop) endSide(panel.width + 24)
      else ins.top = Math.max(ins.top, panel.bottom - c.getBoundingClientRect().top + 8)
    }
    return ins
  }

  /**
   * Zoom so the given nodes (all when `ids` is null) fill the free viewport.
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
      const pts = (nodeSel.data() as any[]).filter(d => (!req.ids || req.ids.has(d.id)) && isFinite(d.x) && isFinite(d.y))
      if (!pts.length) return
      // Node radius plus room for a label above it
      const x0 = Math.min(...pts.map(d => d.x - d.r)), x1 = Math.max(...pts.map(d => d.x + d.r))
      const y0 = Math.min(...pts.map(d => d.y - d.r - 14)), y1 = Math.max(...pts.map(d => d.y + d.r))
      let ins = freeInsets()
      // A panel that leaves too little room is ignored rather than squeezing the fit
      if (cW - ins.left - ins.right - req.pad * 2 < 160 || cH - ins.top - ins.bottom - req.pad * 2 < 160) {
        ins = { top: ins.top, bottom: ins.bottom, left: 0, right: 0 }
      }
      const pad = Math.min(req.pad, cW / 8, cH / 8)
      const availW = Math.max(80, cW - ins.left - ins.right - pad * 2)
      const availH = Math.max(80, cH - ins.top - ins.bottom - pad * 2)
      const scale = Math.min(availW / Math.max(1, x1 - x0), availH / Math.max(1, y1 - y0), req.maxScale)
      const tx = ins.left + pad + availW / 2 - scale * (x0 + x1) / 2
      const ty = ins.top + pad + availH / 2 - scale * (y0 + y1) / 2
      const target = d3.zoomIdentity.translate(tx, ty).scale(scale)
      const sel = d3.select(svgEl)
      if (duration <= 0 || reducedMotion()) {
        sel.interrupt().call(zoom.transform, target)
      } else {
        sel.transition().duration(duration).ease(d3.easeCubicInOut).call(zoom.transform, target)
      }
    })
  }

  /** Fit whatever is in front: the focus neighbourhood, the path, the filter, or everything. */
  const fitCurrent = (duration: number) => {
    const m = modeRef.current
    if (m.focusId && apiRef.current) {
      const { ring1, ring2 } = apiRef.current.hood(m.focusId, m.depth)
      fitTo({ ids: new Set([m.focusId, ...ring1, ...ring2]), pad: 60, maxScale: 2.6 }, duration)
    } else if (m.path) {
      fitTo({ ids: new Set(m.path.ids), pad: 70, maxScale: 2.6 }, duration)
    } else {
      const ids = filteredIdsRef.current
      fitTo(ids && ids.size > 0 && ids.size < sages.length * 0.5
        ? { ids, pad: 80, maxScale: 3 }
        : { ids: null, pad: 40, maxScale: 1.4 }, duration)
    }
  }

  // ── Build graph ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sages.length || !containerRef.current) return
    let mounted = true
    let onFontsLoaded: (() => void) | null = null
    let resizeObs: ResizeObserver | null = null

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
        .attr('class', 'ng-root')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('background', 'transparent')
        // Pinch and pan belong to d3-zoom, not to the page
        .style('touch-action', 'none')

      svgElRef.current = svg.node()

      // ── SVG defs: arrowheads + gradients ────────────────────────────────
      const defs = svg.append('defs')

      // One arrowhead per directed type, in the type's colour. Sized in user
      // space, so a thicker focus edge doesn't balloon its arrow.
      FLOW_TYPES.forEach(type => {
        defs.append('marker')
          .attr('id',          `arrow-${type}`)
          .attr('viewBox',     '0 -5 10 10')
          .attr('refX',        9)
          .attr('refY',        0)
          .attr('markerUnits', 'userSpaceOnUse')
          .attr('markerWidth', 9)
          .attr('markerHeight',9)
          .attr('orient',      'auto')
          .append('path')
          .attr('d',    'M0,-4.5L10,0L0,4.5Z')
          .attr('fill', CONNECTION_COLORS[type] || '#5a4a38')
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

      const g = svg.append('g').attr('class', 'ng-scene')

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
        .map(l => ({ ...l })) as any[]
      const degree = degreeMap(links)
      const r = (deg: number) => Math.min(22, 5 + Math.sqrt(deg || 0) * 2.2)
      const nodes = sages.map(s => {
        const deg = degree.get(s.id) ?? 0
        // label texts, worked out once rather than on every relabel
        return { ...s, degree: deg, r: r(deg),
          _lbl: displayNameShort(graphLabel(s.label), 24), _lblFull: displayNameShort(s.label, 40) }
      }) as any[]
      const nodeById = new Map<string, any>(nodes.map(n => [n.id, n]))
      // Label candidates, most-connected first; the shorter name wins a tie
      const byDegree = [...nodes].sort((a, b) =>
        b.degree - a.degree || displayName(a.label).length - displayName(b.label).length)

      // The filter effect sets the real value once the build has finished
      filteredIdsRef.current = null

      const adj = new Map<string, Set<string>>()
      links.forEach(l => {
        if (!adj.has(l.source)) adj.set(l.source, new Set())
        if (!adj.has(l.target)) adj.set(l.target, new Set())
        adj.get(l.source)!.add(l.target)
        adj.get(l.target)!.add(l.source)
      })
      const linkByKey = new Map<string, any>(links.map(l => [linkKey(l), l]))

      /** The sage's neighbours, and with depth 2 their neighbours too. */
      const hood = (id: string, depth: 1 | 2) => {
        const ring1 = adj.get(id) ?? new Set<string>()
        const ring2 = new Set<string>()
        if (depth === 2) {
          ring1.forEach(n => adj.get(n)?.forEach(m => { if (m !== id && !ring1.has(m)) ring2.add(m) }))
        }
        return { ring1, ring2 }
      }

      const eraX = (period: string) => eraXAt(period, W)

      // ── Force simulation ─────────────────────────────────────────────────
      const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(75).strength(LINK_STRENGTH_IDLE))
        .force('charge', d3.forceManyBody().strength(-120).distanceMax(CHARGE_RANGE))
        .force('x', d3.forceX((d: any) => eraX(d.period)).strength(ERA_PULL_IDLE))
        .force('y', d3.forceY(H / 2).strength(0.05))
        .force('collide', d3.forceCollide((d: any) => d.r + 5).strength(0.9))

      simRef.current = sim

      // ── Links ────────────────────────────────────────────────────────────
      const linkG = g.append('g').attr('class', 'links')
      const link  = linkG.selectAll<SVGPathElement, any>('path.ng-link')
        .data(links).join('path')
        .attr('class', 'ng-link')
        .attr('fill', 'none')
        .attr('stroke', (d: any) => CONNECTION_COLORS[d.type] || '#5a4a38')
        .attr('stroke-dasharray', (d: any) => CONNECTION_DASH[d.type] || null)
        .style('stroke-width', 1.2)
        .style('stroke-opacity', 0.22)

      // Invisible wide hit-area paths — make edges hoverable & clickable.
      // pointer-events="stroke" hit-tests the 13px stroke without painting it.
      const hitLink = linkG.selectAll<SVGPathElement, any>('path.hit')
        .data(links).join('path')
        .attr('class', 'hit')
        .attr('fill', 'none')
        .attr('stroke', 'none')
        .attr('stroke-width', 13)
        .attr('pointer-events', 'stroke')
        .style('cursor', 'pointer')

      // Path overlay: drawn above the edges, below the nodes
      const pathG = g.append('g').attr('class', 'ng-path').attr('pointer-events', 'none')

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
        .attr('class', 'ng-node')
        .attr('data-id', (d: any) => d.id)
        .attr('r', (d: any) => d.r)
        .attr('fill', fillOf)
        .style('stroke', 'var(--ink-900)')
        .style('stroke-width', 1.5)
        .style('fill-opacity', 0.88)
        .style('cursor', 'pointer')

      nodeSelRef.current = node

      // Step numbers of a found path, on top of the nodes
      const badgeG = g.append('g').attr('class', 'ng-badges').attr('pointer-events', 'none')

      // ── Labels (screen space, above everything) ──────────────────────────
      const labelLayer = svg.append('g').attr('class', 'ng-labels').attr('pointer-events', 'none')
      let transform = d3.zoomIdentity
      const measureCtx = document.createElement('canvas').getContext('2d')
      const widthCache = new Map<string, number>()
      const measure = (text: string, fs: number, weight: number) => {
        const key = `${fs}|${weight}|${text}`
        let w = widthCache.get(key)
        if (w == null) {
          if (measureCtx) {
            measureCtx.font = `${weight} ${fs}px Heebo, sans-serif`
            w = measureCtx.measureText(text).width
          } else {
            w = text.length * fs * 0.55
          }
          widthCache.set(key, w)
        }
        return w
      }
      // Web fonts arrive after the first measurement; measure again then
      onFontsLoaded = () => { widthCache.clear(); if (mounted) relabel() }
      document.fonts?.addEventListener?.('loadingdone', onFontsLoaded)

      const labelY = (p: LabelSpot) => {
        const rr = Math.max(p.d.r * transform.k, MIN_SCREEN_R)
        const sy = transform.applyY(p.d.y)
        return p.side < 0 ? sy - rr - 4 : sy + rr + p.fs + 1
      }
      const positionLabels = () => {
        labelLayer.selectAll<SVGTextElement, LabelSpot>('text')
          .attr('x', p => transform.applyX(p.d.x))
          .attr('y', labelY)
      }

      /** The zoom at which the whole graph fits the container. */
      const fitScale = (cW: number, cH: number) => {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
        for (const n of nodes) {
          if (!isFinite(n.x)) continue
          if (n.x < x0) x0 = n.x; if (n.x > x1) x1 = n.x
          if (n.y < y0) y0 = n.y; if (n.y > y1) y1 = n.y
        }
        if (!isFinite(x0)) return 1
        return Math.min(cW / Math.max(1, x1 - x0), cH / Math.max(1, y1 - y0))
      }

      // The box size comes from a ResizeObserver and the filter bar's edge from
      // the inline custom property FilterChips writes on an ancestor: reading
      // clientWidth or getComputedStyle here forced a style and layout pass on
      // every relabel, a few times a second while zooming.
      let frame = { w: container.clientWidth, h: container.clientHeight }
      const chipsBottom = () => {
        for (let el: HTMLElement | null = container; el; el = el.parentElement) {
          const v = el.style.getPropertyValue('--filter-chips-h')
          if (v) return parseFloat(v) || 0
        }
        return 0
      }
      resizeObs = new ResizeObserver(([e]) => {
        frame = { w: e.contentRect.width, h: e.contentRect.height }
        if (mounted) relabel()
      })
      resizeObs.observe(container)
      const relabel = () => {
        const cW = frame.w, cH = frame.h
        if (!cW || !cH) return
        const m = modeRef.current
        const fIds = filteredIdsRef.current
        const k = transform.k

        // Who deserves a label, in priority order
        let wanted: Array<{ d: any; primary: boolean }>
        let quota = Infinity
        if (m.hoverId && nodeById.has(m.hoverId)) {
          const nb = adj.get(m.hoverId) ?? new Set<string>()
          wanted = [{ d: nodeById.get(m.hoverId), primary: true },
            ...byDegree.filter(n => nb.has(n.id)).map(d => ({ d, primary: false }))]
        } else if (m.focusId && nodeById.has(m.focusId)) {
          const { ring1, ring2 } = hood(m.focusId, m.depth)
          wanted = [{ d: nodeById.get(m.focusId), primary: true },
            ...byDegree.filter(n => ring1.has(n.id)).map(d => ({ d, primary: false })),
            ...byDegree.filter(n => ring2.has(n.id)).map(d => ({ d, primary: false }))]
        } else if (m.path) {
          const last = m.path.ids.length - 1
          wanted = m.path.ids
            .map((id, i) => ({ d: nodeById.get(id), primary: i === 0 || i === last }))
            .filter(w => w.d)
            // the two ends first, so they win any collision
            .sort((a, b) => Number(b.primary) - Number(a.primary))
        } else {
          wanted = byDegree
            .filter(n => !fIds || fIds.has(n.id))
            .map(d => ({ d, primary: false }))
          quota = labelQuota(k / fitScale(cW, cH), cW * cH)
        }

        // Labels stay whole and clear of the filter bar
        const top = chipsBottom() + 2
        // Placed boxes in an 80px grid, so a candidate is tested only against
        // its neighbours, not against every label already placed
        type Box = [number, number, number, number]
        const CELL = 80
        const grid = new Map<number, Box[]>()
        const cells = (b: Box) => {
          const out: number[] = []
          for (let x = Math.floor(b[0] / CELL); x <= Math.floor(b[2] / CELL); x++)
            for (let y = Math.floor(b[1] / CELL); y <= Math.floor(b[3] / CELL); y++) out.push(x * 1024 + y)
          return out
        }
        const hits = (b: Box) => cells(b).some(c =>
          grid.get(c)?.some(o => o[0] < b[2] && b[0] < o[2] && o[1] < b[3] && b[1] < o[3]))
        const spots: LabelSpot[] = []
        // Idle view: stop looking once a few times the quota has been tried;
        // the rest are lesser nodes crowded out anyway
        const maxTries = quota === Infinity ? Infinity : quota * 4 + 20
        let tries = 0
        for (const { d, primary } of wanted) {
          if (spots.length >= quota || tries >= maxTries) break
          if (!isFinite(d.x)) continue
          const sx = transform.applyX(d.x), sy = transform.applyY(d.y)
          if (sx < -60 || sx > cW + 60 || sy < -30 || sy > cH + 30) continue
          tries++
          const kind: LabelSpot['kind'] = primary ? 'primary' : d.degree >= HUB_DEGREE ? 'hub' : 'plain'
          const fs = kind === 'primary' ? LABEL_FONT_PRIMARY : kind === 'hub' ? LABEL_FONT_HUB : LABEL_FONT
          const text: string = primary ? d._lblFull : d._lbl
          const w = measure(text, fs, kind === 'plain' ? 500 : 700) + 6
          const rr = Math.max(d.r * k, MIN_SCREEN_R)
          for (const side of [-1, 1] as const) {
            const base = side < 0 ? sy - rr - 4 : sy + rr + fs + 1
            // glyph box plus the 3px halo: ascenders to descenders is ~1.35×fs
            const box: Box = [sx - w / 2, base - fs - 2, sx + w / 2, base + fs * 0.35 + 2]
            if (box[0] < 2 || box[2] > cW - 2 || box[1] < top || box[3] > cH - 2) continue
            if (hits(box)) continue
            cells(box).forEach(c => { const list = grid.get(c); if (list) list.push(box); else grid.set(c, [box]) })
            spots.push({ d, text, fs, side, kind })
            break
          }
        }

        labelLayer.selectAll<SVGTextElement, LabelSpot>('text')
          .data(spots, p => p.d.id)
          .join(enter => enter.append('text').attr('text-anchor', 'middle'))
          // touch text and class only when they change: rewriting them re-lays
          // out every label, a few times a second while zooming
          .each(function (p) {
            const el = this as SVGTextElement & { _t?: string; _k?: string }
            if (el._t !== p.text) { el.textContent = p.text; el._t = p.text }
            if (el._k !== p.kind) {
              el.setAttribute('font-size', String(p.fs))
              el.setAttribute('font-weight', p.kind === 'plain' ? '500' : '700')
              el.setAttribute('class', `ng-label ng-label-${p.kind}`)
              el._k = p.kind
            }
          })
          .attr('x', p => transform.applyX(p.d.x))
          .attr('y', labelY)
      }

      // ── Zoom ─────────────────────────────────────────────────────────────
      let lastRelabel = 0
      /** The zoom the node radii were last sized for. */
      let radiusK = 1
      const rOf = (n: any) => Math.max(n.r, MIN_SCREEN_R / radiusK)
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 4])
        // a finger never lands perfectly still; a small wobble is still a tap
        .clickDistance(6)
        .on('zoom', ev => {
          // Hit-testing off only once the view really moves: d3-zoom also
          // "starts" on the mouse event a tap emulates, and turning targets
          // off there sent a tapped node's click to the canvas instead.
          if (ev.sourceEvent) { svg.classed('ng-zooming', true); userMovedRef.current = true }
          transform = ev.transform
          g.attr('transform', ev.transform)
          positionLabels()
          const now = performance.now()
          if (now - lastRelabel > 220) { lastRelabel = now; relabel() }
        })
        .on('end', () => {
          svg.classed('ng-zooming', false)
          // far out, dots grow to a hittable minimum; once per gesture, not per frame
          if (Math.abs(transform.k - radiusK) / radiusK > 0.08) { radiusK = transform.k; restyle() }
          relabel()
        })
      svg.call(zoom)
      // Double-click is for opening a sage, not for zooming under it
      svg.on('dblclick.zoom', null)
      zoomRef.current = zoom

      // ── Emphasis: hover > focus > path > filter ──────────────────────────
      const restyle = () => {
        const m = modeRef.current
        const fIds = filteredIdsRef.current
        const inF = (id: string) => !fIds || fIds.has(id)
        const sel = selectedIdRef.current
        const pathLinks = m.path ? new Set(m.path.links.map(linkKey)) : null

        let nodeOp: (n: any) => number
        // [opacity, width, arrowhead]
        let linkSt: (l: any) => [number, number, boolean]

        if (m.hoverId && nodeById.has(m.hoverId)) {
          const h = m.hoverId, nb = adj.get(h) ?? new Set<string>()
          nodeOp = n => (n.id === h || nb.has(n.id) ? (inF(n.id) ? 1 : 0.35) : 0.05)
          linkSt = l => (endId(l.source) === h || endId(l.target) === h ? [0.85, 1.8, true] : [0.02, 1.2, false])
        } else if (m.focusId && nodeById.has(m.focusId)) {
          const f = m.focusId
          const { ring1, ring2 } = hood(f, m.depth)
          nodeOp = n => (n.id === f || ring1.has(n.id) ? (inF(n.id) ? 1 : 0.55) : ring2.has(n.id) ? 0.62 : 0.06)
          linkSt = l => {
            const s = endId(l.source), t = endId(l.target)
            if (s === f || t === f) return [0.92, 2.2, true]
            const near = (x: string) => ring1.has(x) || ring2.has(x)
            if (m.depth === 2 && near(s) && near(t) && (ring1.has(s) || ring1.has(t))) return [0.32, 1.2, true]
            return [0.02, 1.2, false]
          }
        } else if (m.path) {
          const ids = new Set(m.path.ids)
          nodeOp = n => (ids.has(n.id) ? 1 : 0.07)
          // the overlay draws the path's own edges
          linkSt = l => (pathLinks!.has(linkKey(l)) ? [0, 1.2, false] : [0.025, 1.2, false])
        } else {
          nodeOp = n => (inF(n.id) ? 0.88 : 0.06)
          linkSt = l => {
            if (!fIds) return [0.22, 1.2, IDLE_ARROWS.has(l.type)]
            const on = fIds.has(endId(l.source)) && fIds.has(endId(l.target))
            return [on ? 0.5 : 0.03, 1.2, on && IDLE_ARROWS.has(l.type)]
          }
        }

        const ringed = (id: string) => id === sel || id === m.focusId
        node
          .style('fill-opacity', nodeOp)
          // the rim fades with the fill, or a dimmed node leaves a ring on a lit edge
          .style('stroke-opacity', (n: any) => (ringed(n.id) ? 1 : Math.min(1, nodeOp(n) * 1.15)))
          .style('stroke', (n: any) => (ringed(n.id) ? 'var(--gold-500)' : 'var(--ink-900)'))
          .style('stroke-width', (n: any) => (ringed(n.id) ? 3 : 1.5))
          .attr('r', (n: any) => (n.id === m.hoverId ? rOf(n) + 3 : rOf(n)))
        link.each(function (l: any) {
          const [op, w, arrow] = linkSt(l)
          this.style.strokeOpacity = String(op)
          this.style.strokeWidth = String(w)
          // a faded edge can't be clicked: in focus, a tap on "empty" canvas
          // must clear the focus, not open a card for an edge you can't see
          l._hit = op >= 0.15 || (pathLinks?.has(linkKey(l)) ?? false)
          // An SVG marker ignores its path's stroke-opacity, so a faded edge
          // must lose its arrowhead or it leaves a full-strength triangle.
          if (arrow && FLOW_TYPES.has(l.type)) this.setAttribute('marker-end', `url(#arrow-${l.type})`)
          else this.removeAttribute('marker-end')
        })
        hitLink.attr('pointer-events', (l: any) => (l._hit ? 'stroke' : 'none'))
      }

      // ── Path overlay ─────────────────────────────────────────────────────
      let pathSegs: Array<{ l: any; reversed: boolean }> = []
      const drawPath = (animate: boolean) => {
        pathG.interrupt().selectAll('*').interrupt().remove()
        badgeG.selectAll('*').interrupt().remove()
        const p = modeRef.current.path
        if (!p) { pathSegs = []; return }
        pathSegs = p.links.flatMap((pl, i) => {
          const l = linkByKey.get(linkKey(pl))
          // drawn giving → receiving; reversed when that runs against the walk
          return l ? [{ l, reversed: endId(flowFrom(l)) !== p.ids[i] }] : []
        })
        const glow = pathG.selectAll<SVGPathElement, any>('path.glow').data(pathSegs).join('path')
          .attr('class', 'glow')
          .attr('fill', 'none')
          .attr('stroke', 'var(--gold-400)')
          .attr('stroke-width', 9)
          .attr('stroke-linecap', 'round')
          .attr('stroke-opacity', 0.28)
          .attr('d', s => s.l._d ?? '')
        const core = pathG.selectAll<SVGPathElement, any>('path.core').data(pathSegs).join('path')
          .attr('class', 'core')
          .attr('fill', 'none')
          .attr('stroke', s => CONNECTION_COLORS[s.l.type] ?? '#c9973a')
          .attr('stroke-width', 2.8)
          .attr('stroke-linecap', 'round')
          .attr('d', s => s.l._d ?? '')
        const arrowOn = (el: SVGPathElement, s: any) => {
          if (FLOW_TYPES.has(s.l.type)) el.setAttribute('marker-end', `url(#arrow-${s.l.type})`)
        }

        const steps = p.ids.map((id, i) => ({ d: nodeById.get(id), i })).filter(s => s.d)
        const badge = badgeG.selectAll<SVGGElement, any>('g').data(steps).join('g')
          .attr('class', 'ng-badge')
          .attr('transform', s => `translate(${s.d.x + s.d.r * 0.75},${s.d.y - s.d.r * 0.75})`)
        badge.append('circle').attr('r', 7.5)
        badge.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').text(s => String(s.i + 1))

        if (!animate || reducedMotion()) {
          core.each(function (s) { arrowOn(this, s) })
          return
        }
        // Draw the path in walking order: segment by segment, a spark leading
        // each stroke, the step numbers lighting up as it arrives.
        const STEP = 520
        const segEls = core.nodes()
        ;[glow, core].forEach(sel => sel.each(function (s, i) {
          const L = this.getTotalLength() || 1
          d3.select(this)
            .attr('stroke-dasharray', `${L} ${L}`)
            .attr('stroke-dashoffset', s.reversed ? -L : L)
            .transition().delay(STEP * 0.6 + i * STEP).duration(STEP).ease(d3.easeCubicInOut)
            .attr('stroke-dashoffset', 0)
            .on('end', function () {
              d3.select(this).attr('stroke-dasharray', null).attr('stroke-dashoffset', null)
              if (sel === core) arrowOn(this as SVGPathElement, s)
            })
        }))
        badge.style('opacity', 0)
          .transition().delay(s => s.i * STEP + STEP * 0.5).duration(220)
          .style('opacity', 1)
        const spark = pathG.append('circle').attr('class', 'ng-spark').attr('r', 5).style('opacity', 0)
        let chain: any = spark.transition().delay(STEP * 0.6).duration(0).style('opacity', 1)
        segEls.forEach((el, i) => {
          const rev = pathSegs[i].reversed
          chain = chain.transition().duration(STEP).ease(d3.easeCubicInOut)
            .attrTween('transform', () => (t: number) => {
              const L = el.getTotalLength()
              const pt = el.getPointAtLength(rev ? L * (1 - t) : L * t)
              return `translate(${pt.x},${pt.y})`
            })
        })
        chain.transition().duration(260).style('opacity', 0).remove()
      }

      // ── Drag ─────────────────────────────────────────────────────────────
      const drag = d3.drag<SVGCircleElement, any>()
        // Mouse only. A finger that lands on a node would be taken by the drag
        // and hidden from d3-zoom, turning a pinch into a pan; on touch, nodes
        // are for tapping and the canvas for pinching and panning.
        .filter((ev: any) => !ev.ctrlKey && !ev.button && ev.type !== 'touchstart')
        .clickDistance(6)
        .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y })
        .on('end',   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      node.call(drag as any)

      // ── Hover (mouse only) + tooltip ─────────────────────────────────────
      const showTooltip = (ev: PointerEvent, d: any) => {
        const tip = tooltipRef.current
        if (!tip) return
        const color  = ERA_COLORS[d.period as Period] ?? '#7a6550'
        const deg    = d.degree ?? 0
        const parts  = labelParts(d.label)
        const years  = formatYearRangeFor(locale, d.birth_year, d.death_year, d.date_precision)
        tip.innerHTML = `
          <div style="font-family:'Frank Ruhl Libre',serif;font-size:15px;font-weight:700;
               color:var(--ink-100);margin-bottom:2px;line-height:1.25">${escapeHtml(parts.name)}</div>
          ${parts.fullName ? `<div style="font-size:11px;color:var(--ink-300);margin-bottom:3px">${escapeHtml(parts.fullName)}</div>` : ''}
          ${d.name_en ? `<div style="font-size:11px;color:var(--ink-300);margin-bottom:5px;">${escapeHtml(d.name_en)}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;">
            <span style="font-size:10px;padding:1px 7px;border-radius:9999px;
              background:${color}22;color:${color};border:1px solid ${color}44;">
              ${escapeHtml(ERA_LABELS[d.period as Period]?.[locale] ?? d.period)}
            </span>
            ${deg ? `<span style="font-size:10px;padding:1px 7px;border-radius:9999px;
              background:rgba(201,151,58,0.15);color:var(--gold-400);border:1px solid rgba(201,151,58,0.3);">
              ${deg} ${UI_TEXT.links[locale]}</span>` : ''}
          </div>
          ${years ? `<div style="font-size:10px;color:var(--ink-400);">${escapeHtml(years)}</div>` : ''}
          ${d.location ? `<div style="font-size:10px;color:var(--ink-400);">📍 ${escapeHtml(d.location)}</div>` : ''}
          ${parts.tagline ? `<div style="font-size:10px;color:var(--ink-500);margin-top:3px;font-style:italic;line-height:1.35">${escapeHtml(parts.tagline)}</div>` : ''}
        `
        tip.style.display = 'block'
        placeTooltip(ev)
      }
      const placeTooltip = (ev: PointerEvent) => {
        const tip = tooltipRef.current
        if (!tip) return
        // flip to the other side of the pointer near the window edge
        const w = tip.offsetWidth, h = tip.offsetHeight
        const x = ev.clientX + 14 + w > window.innerWidth ? ev.clientX - 14 - w : ev.clientX + 14
        const y = Math.min(ev.clientY - 10, window.innerHeight - h - 8)
        tip.style.left = `${Math.max(8, x)}px`
        tip.style.top  = `${Math.max(8, y)}px`
      }
      const hideTooltip = () => {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none'
      }
      const setHover = (id: string | null) => {
        if (modeRef.current.hoverId === id) return
        modeRef.current = { ...modeRef.current, hoverId: id }
        restyle()
        relabel()
      }

      node
        .on('pointerenter', (ev: PointerEvent, d: any) => {
          if (ev.pointerType !== 'mouse') return
          setHover(d.id)
          showTooltip(ev, d)
        })
        .on('pointermove', (ev: PointerEvent) => { if (ev.pointerType === 'mouse') placeTooltip(ev) })
        .on('pointerleave', (ev: PointerEvent) => {
          if (ev.pointerType !== 'mouse') return
          setHover(null)
          hideTooltip()
        })
        .on('click', (ev: MouseEvent, d: any) => {
          ev.stopPropagation()
          hideTooltip()
          setHover(null)
          const sage = sages.find(s => s.id === d.id)
          if (sage) selectSage(sage)
        })

      // ── Edge hover + click (relationship details) ────────────────────────
      hitLink
        .on('pointerenter', (ev: PointerEvent, d: any) => {
          if (ev.pointerType !== 'mouse') return
          link
            .style('stroke-opacity', (l: any) => (l === d ? 0.95 : 0.04))
            .style('stroke-width', (l: any) => (l === d ? 2.6 : 1.2))
            .attr('marker-end', (l: any) => (l === d && FLOW_TYPES.has(l.type) ? `url(#arrow-${l.type})` : null))
          node.style('fill-opacity', (n: any) => (n.id === d.source.id || n.id === d.target.id ? 1 : 0.08))
        })
        .on('pointerleave', (ev: PointerEvent) => {
          if (ev.pointerType !== 'mouse') return
          restyle()
        })
        .on('click', (ev: MouseEvent, d: any) => {
          ev.stopPropagation()
          setEdgeInfo({ sourceId: endId(d.source), targetId: endId(d.target), type: d.type })
        })

      // A click (or tap) on empty canvas ends focus mode
      svg.on('click.focus', () => {
        setEdgeInfo(null)
        setFocusId(null)
      })

      // ── Tick ─────────────────────────────────────────────────────────────
      const round = (v: number) => Math.round(v * 10) / 10
      /**
       * A gentle curve from the giving end to the receiving end, trimmed to the
       * two node rims so an arrowhead lands on the circle, not under it.
       */
      const linkPath = (l: any) => {
        const a = flowFrom(l), b = flowTo(l)
        const ax = a.x, ay = a.y, bx = b.x, by = b.y
        const dx = bx - ax, dy = by - ay
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const cx = (ax + bx) / 2 - dy / dist * 18
        const cy = (ay + by) / 2 + dx / dist * 18
        const ra = a.r + 1, rb = b.r + 2
        if (dist <= ra + rb) return `M${round(ax)},${round(ay)}L${round(bx)},${round(by)}`
        const ul = Math.hypot(cx - ax, cy - ay) || 1
        const vl = Math.hypot(cx - bx, cy - by) || 1
        return `M${round(ax + (cx - ax) / ul * ra)},${round(ay + (cy - ay) / ul * ra)}` +
          `Q${round(cx)},${round(cy)} ${round(bx + (cx - bx) / vl * rb)},${round(by + (cy - by) / vl * rb)}`
      }
      let lastTickLabels = 0
      sim.on('tick', () => {
        link.each(function (l: any) { l._d = linkPath(l); this.setAttribute('d', l._d) })
        hitLink.attr('d', (l: any) => l._d)
        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)
        if (pathSegs.length) {
          pathG.selectAll<SVGPathElement, any>('path').attr('d', s => s.l._d)
          badgeG.selectAll<SVGGElement, any>('g')
            .attr('transform', s => `translate(${s.d.x + s.d.r * 0.75},${s.d.y - s.d.r * 0.75})`)
        }
        positionLabels()
        const now = performance.now()
        if (now - lastTickLabels > 400) { lastTickLabels = now; relabel() }
      })
      sim.on('end', () => {
        relabel()
        if (!userMovedRef.current && !container.closest('.hidden')) fitCurrent(600)
      })

      apiRef.current = { restyle, relabel, drawPath, hood }
      if (mounted) setGraphVersion(v => v + 1)
    }

    build()

    // Zoom-to-fit once after simulation settles (~2s) — to whatever is in
    // front: a deep-linked sage's neighbourhood, a filter subset, or all.
    const fitTimer = setTimeout(() => {
      if (!mounted) return
      fitCurrent(800)
    }, 2000)

    return () => {
      mounted = false
      simRef.current?.stop()
      clearTimeout(fitTimer)
      apiRef.current = null
      if (onFontsLoaded) document.fonts?.removeEventListener?.('loadingdone', onFontsLoaded)
      resizeObs?.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length, connections.length])

  // ── Sync color mode (no graph rebuild) ──────────────────────────────────
  useEffect(() => {
    if (!nodeSelRef.current) return
    nodeSelRef.current.transition().duration(reducedMotion() ? 0 : 400)
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
    if (pendingFitRef.current) pendingFitRef.current = { ids: null, pad: 40, maxScale: 1.4 }
    apiRef.current?.restyle()
    apiRef.current?.relabel()

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
        sim.force('charge', d3.forceManyBody().distanceMax(CHARGE_RANGE).strength((d: any) =>
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

    // Zoom-to-fit when filter narrows down to a manageable subset — unless a
    // focus or a path holds the camera.
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    const held = !!(modeRef.current.focusId || modeRef.current.path)
    if (!held && !noFilter && filteredSages.length > 0 && filteredSages.length < sages.length * 0.5) {
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
    if (activeTab !== 'graph') return
    // labels were measured against a 0×0 box while hidden
    requestAnimationFrame(() => apiRef.current?.relabel())
    if (!pendingFitRef.current) return
    const req = pendingFitRef.current
    pendingFitRef.current = null
    fitTo(req, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // The path panel folding or growing changes the free room: frame the path again
  useEffect(() => {
    const el = pathPanelRef.current
    if (!showPathFinder || !el || typeof ResizeObserver === 'undefined') return
    let t: ReturnType<typeof setTimeout> | undefined
    const ro = new ResizeObserver(() => {
      clearTimeout(t)
      t = setTimeout(() => { if (modeRef.current.path && !userMovedRef.current) fitCurrent(500) }, 120)
    })
    ro.observe(el)
    return () => { ro.disconnect(); clearTimeout(t) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPathFinder])

  // ── Selection → focus ────────────────────────────────────────────────────
  useEffect(() => {
    selectedIdRef.current = selectedSageId
    // While a path is on show, opening one of its sages keeps the path
    if (selectedSageId && !modeRef.current.path) setFocusId(selectedSageId)
    apiRef.current?.restyle()
  }, [selectedSageId, graphVersion])

  // A new focus starts at one hop
  useEffect(() => { setFocusDepth(1) }, [focusId])

  // The card covered part of the view when the focus was framed; once it
  // closes, frame the neighbourhood again in the whole canvas.
  const isDrawerOpen = useAppStore(s => s.isDrawerOpen)
  const drawerWasOpen = useRef(false)
  useEffect(() => {
    if (drawerWasOpen.current && !isDrawerOpen && modeRef.current.focusId && activeTab === 'graph') fitCurrent(600)
    drawerWasOpen.current = isDrawerOpen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawerOpen])

  // ── Focus / path → emphasis, labels, camera ─────────────────────────────
  useEffect(() => {
    modeRef.current = { ...modeRef.current, focusId, depth: focusDepth, path }
    apiRef.current?.restyle()
    apiRef.current?.relabel()
  }, [focusId, focusDepth, path, graphVersion])

  useEffect(() => {
    if (!focusId || !apiRef.current) return
    userMovedRef.current = false
    fitCurrent(750)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusDepth, graphVersion])

  // A found path takes the stage from any focus, draws itself, and is framed
  useEffect(() => {
    if (!apiRef.current) return
    if (path) setFocusId(null)
    modeRef.current = { ...modeRef.current, path, focusId: path ? null : modeRef.current.focusId }
    apiRef.current.drawPath(true)
    apiRef.current.restyle()
    apiRef.current.relabel()
    if (path) { userMovedRef.current = false; fitCurrent(750) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, graphVersion])

  // Esc leaves focus (then the path) — after the drawer or filters, which
  // close on the same key: the capture phase sees them still open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const st = useAppStore.getState()
      if (st.activeTab !== 'graph') return
      if (st.isDrawerOpen || st.isFiltersOpen || st.isComparatorOpen) return
      const el = e.target as HTMLElement | null
      if (el?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (document.querySelector('[aria-modal="true"]')) return
      if (modeRef.current.focusId) setFocusId(null)
      else if (modeRef.current.path) setShowPathFinder(false)
      setEdgeInfo(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const zoomBy = (k: number) => {
    if (!svgElRef.current || !zoomRef.current) return
    import('d3').then(d3 =>
      d3.select(svgElRef.current!).transition().duration(reducedMotion() ? 0 : 300).call(zoomRef.current!.scaleBy, k))
  }

  const focusSage = focusId ? sageMap.get(focusId) ?? null : null
  // Neighbour counts for the focus chip, over the edges the graph draws
  const focusCounts = useMemo(() => {
    if (!focusId) return { ring1: 0, ring2: 0 }
    const adj = new Map<string, Set<string>>()
    connections.forEach(c => {
      if (!sageMap.has(c.source) || !sageMap.has(c.target)) return
      if (!adj.has(c.source)) adj.set(c.source, new Set())
      if (!adj.has(c.target)) adj.set(c.target, new Set())
      adj.get(c.source)!.add(c.target)
      adj.get(c.target)!.add(c.source)
    })
    const ring1 = adj.get(focusId) ?? new Set<string>()
    const ring2 = new Set<string>()
    ring1.forEach(n => adj.get(n)?.forEach(m => { if (m !== focusId && !ring1.has(m)) ring2.add(m) }))
    return { ring1: ring1.size, ring2: ring2.size }
  }, [focusId, connections, sageMap])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Scene styles: soft emphasis changes, labels with a halo that reads on either theme */}
      <style>{`
        .ng-root .ng-node { transition: fill-opacity .18s ease, stroke-opacity .18s ease, stroke-width .18s ease; }
        .ng-root .ng-link { transition: stroke-opacity .18s ease, stroke-width .18s ease; }
        /* Mid-gesture nothing is hit-tested: the edges' wide invisible hit
           strokes carry their own pointer-events, and testing ~500 curves on
           every move cost a zoomed-in pan two thirds of its frames. */
        .ng-root.ng-zooming .ng-scene, .ng-root.ng-zooming .ng-scene .hit { pointer-events: none; }
        .ng-root .ng-label {
          fill: var(--ink-100); stroke: var(--ink-900); stroke-width: 3px; stroke-linejoin: round;
          paint-order: stroke; font-family: Heebo, sans-serif; animation: fadeIn .2s ease-out both;
        }
        .ng-root .ng-label-hub { fill: var(--ink-50); }
        .ng-root .ng-label-primary { fill: var(--gold-300); stroke-width: 4px; }
        .ng-root .ng-badge circle { fill: var(--gold-400); stroke: var(--ink-900); stroke-width: 1.5px; }
        .ng-root .ng-badge text { fill: var(--ink-900); font: 700 9px Heebo, sans-serif; }
        .ng-root .ng-spark { fill: var(--gold-300); filter: drop-shadow(0 0 4px var(--gold-400)); }
      `}</style>

      {/* Tooltip — positioned by D3 pointer events */}
      <div
        ref={tooltipRef}
        style={{ display: 'none', position: 'fixed', zIndex: 50, pointerEvents: 'none',
          maxWidth: 260, padding: '8px 12px',
          background: 'var(--ink-850)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(201,151,58,0.2)', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
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

      {/* Focus chip. Desktop: top centre under the filter bar. Phone: in the
          row of the round search/chat buttons, between them. */}
      {focusSage && (
        <div
          role="status"
          className={cn(
            'absolute z-20 left-1/2 -translate-x-1/2 animate-fade-in',
            'glass rounded-2xl border border-gold-500/30 shadow-glass-lg',
            'flex flex-col items-stretch gap-1 px-2 py-1.5',
            // centred on the 56px search/chat buttons' row (5.75rem up)
            'bottom-[6.25rem] max-w-[calc(100vw-10.5rem)]',
            'md:bottom-auto md:top-[var(--ng-chip-top)] md:max-w-[min(34rem,calc(100vw-24rem))]',
          )}
          style={{ ['--ng-chip-top' as string]: BELOW_CHIPS }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="era-dot" style={{ background: ERA_COLORS[focusSage.period] ?? '#7a6550' }} aria-hidden />
            <span className="hidden sm:inline text-[11px] font-sans text-ink-400 flex-shrink-0">{UI_TEXT.focus[locale]}:</span>
            <button
              onClick={() => selectSage(focusSage)}
              className="text-sm font-serif font-bold text-gold-300 hover:text-gold-200 truncate min-w-0"
              title={displayName(focusSage.label)}
            >
              {displayName(focusSage.label)}
            </button>
            <span className="text-[10px] font-mono text-ink-500 flex-shrink-0 tabular-nums">
              {focusCounts.ring1}{focusDepth === 2 && focusCounts.ring2 ? `+${focusCounts.ring2}` : ''}
            </span>
            {focusCounts.ring2 > 0 && (
              <button
                onClick={() => setFocusDepth(d => (d === 1 ? 2 : 1))}
                aria-pressed={focusDepth === 2}
                title={UI_TEXT.twoHopsHint[locale]}
                className={cn(
                  'flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold border transition-colors whitespace-nowrap',
                  focusDepth === 2
                    ? 'bg-gold-500/25 border-gold-500/50 text-gold-200'
                    : 'border-ink-600/50 text-ink-400 hover:text-ink-200',
                )}
              >
                {UI_TEXT.twoHops[locale]}
              </button>
            )}
            <button
              onClick={() => setFocusId(null)}
              aria-label={UI_TEXT.exitFocus[locale]}
              title={UI_TEXT.exitFocus[locale]}
              className="flex-shrink-0 w-7 h-7 -me-0.5 rounded-full flex items-center justify-center text-ink-400 hover:text-ink-100 hover:bg-ink-700/60 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="hidden md:block text-[10px] font-sans text-ink-500 px-1 pb-0.5">{UI_TEXT.arrows[locale]}</p>
        </div>
      )}

      {/* Edge relationship card — opens on edge click */}
      {edgeInfo && (() => {
        const src = sageMap.get(edgeInfo.sourceId)
        const tgt = sageMap.get(edgeInfo.targetId)
        if (!src || !tgt) return null
        const typeColor = CONNECTION_COLORS[edgeInfo.type] ?? '#c9973a'
        const typeLabel = CONNECTION_LABELS[edgeInfo.type as keyof typeof CONNECTION_LABELS]?.[locale] ?? edgeInfo.type
        const phrase = relationPhrase({ source: edgeInfo.sourceId, target: edgeInfo.targetId, type: edgeInfo.type as any }, src.id, locale)
        return (
          <div className="absolute top-[var(--ng-card-top)] md:top-auto md:bottom-24 left-1/2 -translate-x-1/2 z-20 glass rounded-xl border border-gold-500/25 shadow-glass-lg px-4 py-3 w-[340px] max-w-[calc(100vw-32px)] animate-fade-in"
            style={{ ['--ng-card-top' as string]: BELOW_CHIPS }}>
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
              <span className="ms-2 normal-case tracking-normal font-medium" style={{ color: typeColor }}>{typeLabel}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { selectSage(src); setEdgeInfo(null) }}
                className="flex-1 min-w-0 text-start px-2.5 py-1.5 rounded-lg bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/40 transition-colors"
              >
                <span className="text-sm font-serif text-ink-100 truncate block">{displayName(src.label)}</span>
              </button>
              <span
                className="flex-shrink-0 text-[10px] font-sans font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                style={{ background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}55` }}
              >
                {phrase}
              </span>
              <button
                onClick={() => { selectSage(tgt); setEdgeInfo(null) }}
                className="flex-1 min-w-0 text-start px-2.5 py-1.5 rounded-lg bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/40 transition-colors"
              >
                <span className="text-sm font-serif text-ink-100 truncate block">{displayName(tgt.label)}</span>
              </button>
            </div>
          </div>
        )
      })()}

      {/* PathFinder panel — top-end corner, below the filter chip bar */}
      {showPathFinder && (
        <div ref={pathPanelRef} className="absolute end-4 z-20 animate-fade-in" style={{ top: BELOW_CHIPS }}>
          <PathFinder
            locale={locale}
            onClose={() => setShowPathFinder(false)}
            onPath={setPath}
            initialFrom={focusSage}
          />
        </div>
      )}

      {/* Zoom + PathFinder toggle cluster. On mobile the search FAB (FAB.tsx,
          fixed bottom-[5.75rem] end-4, 56px, so up to 9.25rem) owns this
          corner, so the cluster starts above it; from md up the FAB is hidden. */}
      <div data-tour="graph-tools" className="absolute bottom-[10rem] md:bottom-20 end-4 z-10 flex flex-col gap-1.5">
        <ZoomBtn onClick={() => zoomBy(1.5)} label={UI_TEXT.zoomIn[locale]}>+</ZoomBtn>
        <ZoomBtn onClick={() => fitCurrent(500)} label={UI_TEXT.fit[locale]}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </ZoomBtn>
        <ZoomBtn onClick={() => zoomBy(0.67)} label={UI_TEXT.zoomOut[locale]}>−</ZoomBtn>
        <div className="h-px bg-ink-700/50 my-0.5" />
        <button
          onClick={() => setShowPathFinder(p => !p)}
          aria-label={UI_TEXT.pathFinder[locale]}
          aria-expanded={showPathFinder}
          title={UI_TEXT.pathFinder[locale]}
          className={cn(
            'w-11 h-11 md:w-8 md:h-8 rounded-lg text-xs font-mono glass border transition-all',
            'flex items-center justify-center',
            showPathFinder
              ? 'bg-gold-500/20 border-gold-500/50 text-gold-300 shadow-gold-glow'
              : 'border-ink-600/40 text-ink-300 hover:text-gold-300 hover:border-gold-500/30',
          )}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
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
    <button onClick={onClick} aria-label={label} title={label} className={cn(
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
        aria-expanded={!collapsed}
        className="flex items-center justify-between gap-3 px-3 py-2 text-start hover:bg-ink-700/30 transition-colors"
      >
        <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-400">
          {tr(locale, 'מקרא', 'Legend', 'Легенда')}
        </span>
        <span className="text-ink-600 text-xs" aria-hidden>{collapsed ? '▸' : '▾'}</span>
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
                aria-pressed={colorMode === mode}
                className={cn(
                  'flex-1 text-[10px] font-sans font-semibold rounded-md px-2 py-1 transition-all',
                  colorMode === mode
                    ? 'bg-gold-500/25 text-gold-300 shadow-inner'
                    : 'text-ink-500 hover:text-ink-200',
                )}
              >
                {mode === 'era' ? tr(locale, 'תקופה', 'Era', 'Эпоха') : tr(locale, 'אזור', 'Region', 'Регион')}
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
                <span className="text-[10px] font-sans text-ink-400 leading-tight">{tr(locale, 'חכם נודד', 'Migrating', 'Странствующий')}</span>
              </div>
            </>
          )}

          {/* Connection types */}
          <div className="border-t border-ink-700/40 pt-2 mt-1 space-y-1.5">
            <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-600 mb-1">
              {tr(locale, 'סוגי קשרים', 'Links', 'Связи')}
            </p>
            {(Object.entries(CONNECTION_COLORS) as [string, string][])
              .map(([type, color]) => {
                const dash = CONNECTION_DASH[type]
                const directed = FLOW_TYPES.has(type)
                return (
                  <div key={type} className="flex items-center gap-2">
                    {/* drawn in reading direction: the arrow points where the relation flows */}
                    <svg width="28" height="10" className="flex-shrink-0" style={{ overflow: 'visible', transform: locale === 'he' ? 'scaleX(-1)' : undefined }} aria-hidden>
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
            <p className="text-[9.5px] font-sans text-ink-500 leading-snug pt-1 max-w-[12rem]">
              {UI_TEXT.arrows[locale]}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
