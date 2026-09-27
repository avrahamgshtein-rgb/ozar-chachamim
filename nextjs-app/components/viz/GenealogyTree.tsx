'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { interpolate, select, zoom as d3zoom, zoomIdentity } from 'd3'
import type { ZoomBehavior, ZoomTransform } from 'd3'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import type { Locale, Sage } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatYearRangeFor } from '@/lib/utils'
import { displayName } from '@/lib/displayName'
import { normalizeHe } from '@/lib/search'
import { tr } from '@/lib/i18n'
import {
  LINEAGE_KINDS, buildLineageIndex, buildLineageTree, chronoYear, degreeOf,
  layoutTree, lineagePresets, nearbyWithLineage,
} from './lineage'
import type { LNode, Layout, LayoutMode, LineageKind, PlacedEdge, PlacedNode } from './lineage'
import { buildSinaiIndex } from '@/lib/sinaiPath'
import { SinaiPath } from './SinaiPath'
import { SP } from './SinaiPathText'

/*
 * עץ שושלות — a lineage explorer centred on one sage.
 *
 * Teachers, and those who influenced them, stack upwards; students and the
 * influenced hang below. The tree is rebuilt around whichever sage is in focus
 * (the selected sage, a search result, a preset, or any node clicked), and the
 * move is animated: nodes that stay keep their element and glide to their new
 * place while the camera recentres, so the reader never loses their bearings.
 *
 * Layout is d3.hierarchy-free but hierarchical: `lineage.ts` builds the tree
 * (walking out a generation at a time, so a sage reached twice is drawn once
 * and referenced after that, and cycles cannot loop) and lays it out as a tidy
 * top-down tree on wide screens or an indented outline on phones. D3 here only
 * joins, transitions and zooms. No force simulation runs in this tab.
 */

const KIND_LABEL: Record<LineageKind, Record<Locale, string>> = {
  teacher:     { he: 'רב ותלמיד',  en: 'Teacher & student', ru: 'Учитель и ученик' },
  influence:   { he: 'השפעה',      en: 'Influence',         ru: 'Влияние' },
  family:      { he: 'משפחה',      en: 'Family',            ru: 'Семья' },
  predecessor: { he: 'רצף הנהגה', en: 'Succession',        ru: 'Преемственность' },
}
const LEGEND_ORDER: LineageKind[] = ['teacher', 'influence', 'family', 'predecessor']

/** How the node relates to its tree parent, from the node's side. [masculine, feminine] in Hebrew. */
const RELATION: Record<'up' | 'down', Record<LineageKind, { he: [string, string]; en: string; ru: string }>> = {
  up: {
    teacher:     { he: ['רבו של', 'מורתו של'], en: 'Teacher of', ru: 'Учитель для:' },
    influence:   { he: ['השפיע על', 'השפיעה על'], en: 'Influenced', ru: 'Повлиял(а) на:' },
    predecessor: { he: ['קודמו של', 'קודמתו של'], en: 'Preceded', ru: 'Предшествовал(а):' },
    family:      { he: ['קרוב משפחה של', 'קרובת משפחה של'], en: 'Relative of', ru: 'Родственник:' },
  },
  down: {
    teacher:     { he: ['תלמידו של', 'תלמידתו של'], en: 'Student of', ru: 'Учился(-ась) у:' },
    influence:   { he: ['הושפע מ', 'הושפעה מ'], en: 'Influenced by', ru: 'Под влиянием:' },
    predecessor: { he: ['ממשיכו של', 'ממשיכתו של'], en: 'Successor of', ru: 'Преемник после:' },
    family:      { he: ['קרוב משפחה של', 'קרובת משפחה של'], en: 'Relative of', ru: 'Родственник:' },
  },
}

const DEPTHS = [1, 2, 3, 4] as const
/** Children shown per node before the rest fold into a "+N" chip. */
const capFor = (gen: number) => (gen === 1 ? 8 : 5)

type CameraIntent = 'fit' | 'recenter' | 'keep'

/** The tab's two panes: the lineage tree/outline, or the road to Sinai (?view=sinai). */
type Pane = 'lineage' | 'sinai'
const readURLPane = (): Pane =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'sinai' ? 'sinai' : 'lineage'

interface GenealogyTreeProps { locale: Locale }

export function GenealogyTree({ locale }: GenealogyTreeProps) {
  const sages          = useAppStore(s => s.sages)
  const connections    = useAppStore(s => s.connections)
  const sageMap        = useAppStore(s => s.sageMap)
  const filteredSages  = useAppStore(s => s.filteredSages)
  const selectedSageId = useAppStore(s => s.selectedSageId)
  const selectSage     = useAppStore(s => s.selectSage)

  const rtl = locale === 'he'
  const nameOf = useCallback((id: string) => displayName(sageMap.get(id)?.label), [sageMap])
  const yearsOf = useCallback((s: Sage | undefined) =>
    s ? formatYearRangeFor(locale, s.birth_year, s.death_year, s.date_precision) : '', [locale])

  // ── Lineage index ────────────────────────────────────────────────────────
  const idx = useMemo(() => buildLineageIndex(sageMap, connections), [sageMap, connections])
  const presets = useMemo(() => lineagePresets(idx), [idx])

  // ── View state ───────────────────────────────────────────────────────────
  const [focusId, setFocusId] = useState<string | null>(null)
  const [trail, setTrail] = useState<string[]>([])
  const [depth, setDepth] = useState(2)
  const [kinds, setKinds] = useState<Set<LineageKind>>(() => new Set(LINEAGE_KINDS))
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [modePref, setModePref] = useState<'auto' | LayoutMode>('auto')
  const [size, setSize] = useState({ w: 0, h: 0 })
  // Unset: open on wide screens (floating), closed on phones (a drop-down).
  const [legendPref, setLegendOpen] = useState<boolean | null>(null)
  const [fontsReady, setFontsReady] = useState(0)
  const [pane, setPane] = useState<Pane>(readURLPane)

  const focusRef = useRef<string | null>(null)
  focusRef.current = focusId
  const camera = useRef<CameraIntent>('fit')

  const narrow = size.w > 0 && size.w < 700
  const legendOpen = legendPref ?? !narrow
  const mode: LayoutMode = modePref === 'auto' ? (narrow ? 'outline' : 'tree') : modePref

  const refocus = useCallback((id: string) => {
    if (!sageMap.has(id) || id === focusRef.current) return
    camera.current = focusRef.current ? 'recenter' : 'fit'
    focusRef.current = id
    setFocusId(id)
    setTrail(t => {
      const at = t.indexOf(id)
      return at >= 0 ? t.slice(0, at + 1) : [...t, id].slice(-12)
    })
    setExpanded(new Set())
    // An open card follows the focus; a closed one stays closed.
    const st = useAppStore.getState()
    if (st.isDrawerOpen && st.selectedSageId !== id) st.selectSage(sageMap.get(id)!)
  }, [sageMap])

  // First focus: the selected sage, else the richest lineage.
  useEffect(() => {
    if (focusId || !sageMap.size) return
    const start = selectedSageId && sageMap.has(selectedSageId) ? selectedSageId : presets[0]
    if (start) refocus(start)
  }, [sageMap, presets, selectedSageId, focusId, refocus])

  // Selecting a sage anywhere (search bar, card links) moves the focus to it,
  // except a station opened from the Sinai river: that shows its card and
  // keeps the road on screen.
  const keepFocusFor = useRef<string | null>(null)
  useEffect(() => {
    if (selectedSageId && selectedSageId === keepFocusFor.current) { keepFocusFor.current = null; return }
    if (selectedSageId && focusId && selectedSageId !== focusId) refocus(selectedSageId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSageId])

  const openCard = useCallback((id: string) => {
    const s = sageMap.get(id)
    if (s) selectSage(s)
  }, [sageMap, selectSage])

  // ── Road to Sinai ────────────────────────────────────────────────────────
  // The view lives in ?view=sinai next to the app's ?tab=&sage=, so the sage
  // page can link straight to it; it leaves the URL with the tab.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (pane === 'sinai') url.searchParams.set('view', 'sinai')
    else url.searchParams.delete('view')
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  }, [pane])
  useEffect(() => () => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('view')) return
    url.searchParams.delete('view')
    window.history.replaceState(window.history.state, '', url)
  }, [])
  // Arriving from a sage page's "road to Sinai" link: ?sage= opens that sage's
  // card, which would cover the road it came to see. Close it once.
  const arrivalSage = useRef(pane === 'sinai' ? new URLSearchParams(window.location.search).get('sage') : null)
  const isDrawerOpen = useAppStore(s => s.isDrawerOpen)
  useEffect(() => {
    if (!arrivalSage.current || !isDrawerOpen || selectedSageId !== arrivalSage.current) return
    arrivalSage.current = null
    useAppStore.getState().closeDrawer()
  }, [isDrawerOpen, selectedSageId])

  const sinai = useMemo(() => (pane === 'sinai' && sages.length ? buildSinaiIndex(sages, idx) : null), [pane, sages, idx])
  const sinaiPresets = useMemo(() => {
    if (!sinai) return []
    return [...sinai.best.keys()]
      .filter(id => !sinai.onChain.has(id))
      .sort((a, b) => (idx.degree.get(b) ?? 0) - (idx.degree.get(a) ?? 0))
      .slice(0, 8)
  }, [sinai, idx])
  const openFromRiver = useCallback((id: string) => {
    if (id !== focusRef.current) keepFocusFor.current = id
    openCard(id)
  }, [openCard])
  const switchPane = (p: Pane) => {
    if (p === pane) return
    if (p === 'lineage') camera.current = 'fit'
    setPane(p)
  }

  // ── Tree + layout ────────────────────────────────────────────────────────
  const tree = useMemo(() => {
    if (!focusId || !sageMap.has(focusId)) return null
    return buildLineageTree(idx, focusId, {
      depth, kinds, expanded, cap: capFor,
      weight: id => idx.degree.get(id) ?? 0,
      chrono: id => chronoYear(sageMap.get(id)),
      name: nameOf,
    })
  }, [idx, focusId, depth, kinds, expanded, sageMap, nameOf])

  const hasLineage = !!tree && (tree.up.children.length + tree.down.children.length) > 0

  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const viewportRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      setSize(s => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Text is measured for wrapping; re-measure once the web font has loaded.
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady(n => n + 1)).catch(() => {})
  }, [])
  const measure = useMemo(() => {
    const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
    const cache = new Map<string, number>()
    return (text: string, font: string) => {
      const k = font + '|' + text
      let w = cache.get(k)
      if (w == null) {
        if (ctx) { ctx.font = font; w = ctx.measureText(text).width } else w = text.length * 7
        cache.set(k, w)
      }
      return w
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsReady])

  const layout = useMemo<Layout | null>(() => {
    if (!tree || !hasLineage || !size.w || pane === 'sinai') return null
    const family = (wrapRef.current && getComputedStyle(wrapRef.current).fontFamily) || 'Heebo, sans-serif'
    return layoutTree(tree, {
      mode, rtl, width: size.w, measure,
      label: n => n.type === 'more'
        ? tr(locale, `+${n.hidden} נוספים`, `+${n.hidden} more`, `+${n.hidden} ещё`)
        : n.type === 'repeat' ? `↺ ${nameOf(n.id)}` : nameOf(n.id),
      fonts: { name: `600 13px ${family}`, focus: `700 15px ${family}`, stub: `500 12px ${family}` },
    })
  }, [tree, hasLineage, size.w, mode, rtl, measure, locale, nameOf, pane])

  // Mode switches refit the camera.
  const lastMode = useRef<LayoutMode | null>(null)
  useEffect(() => {
    if (lastMode.current && lastMode.current !== mode) camera.current = 'fit'
    lastMode.current = mode
  }, [mode])

  // ── Zoom (set up once) ───────────────────────────────────────────────────
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const tRef = useRef<ZoomTransform>(zoomIdentity)
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const svg = select(svgEl)
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 2.5])
      // Plain wheel pans (below); ctrl/⌘ + wheel and trackpad pinch zoom.
      .filter((ev: any) => (ev.type === 'wheel' ? ev.ctrlKey || ev.metaKey : !ev.ctrlKey && !ev.button))
      .on('zoom', ev => {
        tRef.current = ev.transform
        viewportRef.current?.setAttribute('transform', ev.transform.toString())
      })
    svg.call(z).on('dblclick.zoom', null)
    svg.on('wheel.pan', (ev: WheelEvent) => {
      if (ev.ctrlKey || ev.metaKey) return
      ev.preventDefault()
      const k = tRef.current.k
      z.translateBy(svg, -ev.deltaX / k, -ev.deltaY / k)
    }, { passive: false })
    zoomRef.current = z
    return () => { svg.on('.zoom', null).on('wheel.pan', null) }
  }, [])

  // The usable part of the canvas: the fixed tab bar (and on phones the
  // search/chat buttons) cover the bottom; the floating legend covers one side.
  const view = useMemo<View>(() => ({
    w: size.w, h: size.h,
    bottom: narrow ? 150 : 96,
    left: !narrow && legendOpen && rtl ? 290 : 0,
    right: !narrow && legendOpen && !rtl ? 290 : 0,
  }), [size, narrow, legendOpen, rtl])

  const zoomBy = (f: number) => {
    const svgEl = svgRef.current, z = zoomRef.current
    if (!svgEl || !z) return
    select(svgEl).transition().duration(reducedMotion() ? 0 : 250).call(z.scaleBy, f)
  }
  const fit = () => {
    const svgEl = svgRef.current, z = zoomRef.current
    if (!svgEl || !z || !layout) return
    select(svgEl).transition().duration(reducedMotion() ? 0 : 450)
      .call(z.transform, cameraFor(layout, view, undefined, true))
  }

  // ── Render (D3 join + transitions) ───────────────────────────────────────
  const filteredIds = useMemo(
    () => (filteredSages.length < sages.length ? new Set(filteredSages.map(s => s.id)) : null),
    [filteredSages, sages.length])

  const actRef = useRef<(d: PlacedNode) => void>(() => {})
  actRef.current = (d: PlacedNode) => {
    if (d.node.type === 'more') {
      setExpanded(s => new Set(s).add(`${d.node.side}:${d.parentKey}`))
      camera.current = 'keep'
    } else if (d.node.type === 'focus') openCard(d.node.id)
    else refocus(d.node.id)
  }
  const describeRef = useRef<(d: PlacedNode) => string>(() => '')
  describeRef.current = (d: PlacedNode) => describe(d, locale, sageMap, nameOf, yearsOf)

  const edgePts = useRef(new Map<string, [number, number][]>())
  const byKeyRef = useRef(new Map<string, PlacedNode>())
  byKeyRef.current = useMemo(() => new Map((layout?.nodes ?? []).map(n => [n.key, n])), [layout])
  // Read by node event handlers, which are bound once per element.
  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => {
    const svgEl = svgRef.current, vp = viewportRef.current, z = zoomRef.current
    if (!svgEl || !vp || !z) return
    const svg = select(svgEl)
    // The pointer may rest where a node used to be; no mouseleave will come.
    clearChain(vp)
    const nodesG = select(vp).select<SVGGElement>('g.lt-nodes')
    const edgesG = select(vp).select<SVGGElement>('g.lt-edges')

    if (!layout) {
      nodesG.selectAll('*').remove()
      edgesG.selectAll('*').remove()
      edgePts.current.clear()
      return
    }

    const dur = reducedMotion() ? 0 : 640
    const intent = camera.current
    camera.current = 'keep'
    const old = tRef.current
    let target = old
    if (intent === 'fit') target = cameraFor(layout, view)
    else if (intent === 'recenter') target = cameraFor(layout, view, old.k)

    // Recentring keeps the scale, so the camera can jump while every node is
    // shifted to compensate, then glide home: on screen, each node travels in
    // a straight line from where it was to where it ends up.
    const shift: [number, number] = intent === 'recenter'
      ? [(old.x - target.x) / target.k, (old.y - target.y) / target.k]
      : [0, 0]
    const fresh = nodesG.select('g.lt-node[data-key]').empty()
    // A pan or zoom still in flight would keep steering the camera afterwards.
    if (intent !== 'keep') svg.interrupt()
    // A first tree grows out of the focus in place; only a refit of an
    // existing tree (mode switch) pans the camera visibly.
    if (intent === 'recenter' || (intent === 'fit' && fresh)) svg.call(z.transform, target)
    else if (intent === 'fit') svg.transition().duration(dur).call(z.transform, target)

    // Where each surviving element is right now (mid-transition included).
    const current = new Map<string, [number, number]>()
    nodesG.selectAll<SVGGElement, PlacedNode>('g.lt-node').each(function () {
      const k = this.getAttribute('data-key'), m = /translate\(([-\d.e]+),\s*([-\d.e]+)\)/.exec(this.getAttribute('transform') ?? '')
      if (k && m) current.set(k, [+m[1] + shift[0], +m[2] + shift[1]])
    })
    const byKey = new Map(layout.nodes.map(n => [n.key, n]))
    const startCache = new Map<string, [number, number]>()
    const startOf = (key: string | null): [number, number] => {
      if (!key) return [0, 0]
      const hit = startCache.get(key)
      if (hit) return hit
      const cur = current.get(key)
      const n = byKey.get(key)
      const s: [number, number] = cur ?? (n?.parentKey ? startOf(n.parentKey) : [n?.x ?? 0, n?.y ?? 0])
      startCache.set(key, s)
      return s
    }

    // Edges
    const eSel = edgesG.selectAll<SVGPathElement, PlacedEdge>('path').data(layout.edges, d => d.key)
    eSel.exit<PlacedEdge>()
      .each(function (d) {
        const pts = edgePts.current.get(d.key)
        if (pts) this.setAttribute('d', pathOf(pts.map(([x, y]) => [x + shift[0], y + shift[1]]), d.curve))
      })
      .transition().duration(dur * 0.4).attr('opacity', 0).remove()
    const eAll = eSel.enter().append('path').attr('opacity', 0).merge(eSel)
    eAll
      .attr('class', d => cn(d.kind ? 'lt-edge k-' + d.kind : 'lt-stem', filteredIds && d.childKey && !isIn(byKey.get(d.childKey), filteredIds) && 'lt-out-edge'))
      .attr('data-child', d => d.childKey ?? '')
      .transition().duration(dur)
      .attr('opacity', 1)
      .attrTween('d', d => {
        const prev = edgePts.current.get(d.key)
        const from = prev
          ? prev.map(([x, y]) => [x + shift[0], y + shift[1]] as [number, number])
          : d.pts.map(() => startOf(d.parentKey))
        const it = interpolate(from, d.pts)
        return t => pathOf(it(t) as [number, number][], d.curve)
      })
    edgePts.current = new Map(layout.edges.map(e => [e.key, e.pts]))

    // Nodes
    const nSel = nodesG.selectAll<SVGGElement, PlacedNode>('g.lt-node').data(layout.nodes, d => d.key)
    nSel.exit()
      .attr('data-key', null)
      .each(function () {
        const m = /translate\(([-\d.e]+),\s*([-\d.e]+)\)/.exec(this.getAttribute('transform') ?? '')
        if (m) this.setAttribute('transform', `translate(${+m[1] + shift[0]},${+m[2] + shift[1]})`)
      })
      .transition().duration(dur * 0.4).attr('opacity', 0).remove()

    const nEnter = nSel.enter().append('g').attr('opacity', 0)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .on('click', (ev: MouseEvent, d) => { ev.stopPropagation(); actRef.current(d) })
      .on('keydown', (ev: KeyboardEvent, d) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); actRef.current(d) }
      })
      .on('mouseenter', (_ev, d) => highlightChain(vp, d, byKeyRef.current))
      .on('mouseleave', () => clearChain(vp))
      .on('focus', function (_ev, d) {
        highlightChain(vp, d, byKeyRef.current)
        // Keyboard focus only: a click also focuses, and must not pan first.
        if (this.matches(':focus-visible')) revealNode(svgEl, z, tRef.current, d, viewRef.current)
      })
      .on('blur', () => clearChain(vp))

    const nAll = nEnter.merge(nSel)
    nAll
      .attr('data-key', d => d.key)
      .attr('class', d => cn('lt-node', 'lt-' + d.node.type, filteredIds && !isIn(d, filteredIds) && 'lt-out'))
      .attr('aria-label', d => describeRef.current(d))
      .style('--c', d => ERA_COLORS[sageMap.get(d.node.id)?.period ?? 'rishonim'] ?? '#7a6550')
      .each(function (d) { drawNode(this, d, rtl, sageMap, yearsOf, describeRef.current(d)) })
    nAll.attr('transform', d => { const [x, y] = startOf(d.key); return `translate(${x},${y})` })
      .transition().duration(dur)
      .attr('opacity', 1)
      .attr('transform', d => `translate(${d.x},${d.y})`)
    // Tab order: the focus, then ancestors, then descendants (see lineage.ts finish()).
    nAll.order()
  }, [layout, view, rtl, filteredIds, sageMap, yearsOf])

  // ── Derived UI data ──────────────────────────────────────────────────────
  const focus = focusId ? sageMap.get(focusId) : undefined
  const kindCounts = useMemo(() => {
    const c: Record<LineageKind, number> = { teacher: 0, predecessor: 0, family: 0, influence: 0 }
    layout?.edges.forEach(e => { if (e.kind) c[e.kind]++ })
    return c
  }, [layout])
  const hiddenKinds = useMemo(() => {
    if (!focusId) return [] as LineageKind[]
    const all = [...(idx.up.get(focusId) ?? []), ...(idx.down.get(focusId) ?? [])]
    return LINEAGE_KINDS.filter(k => !kinds.has(k) && all.some(r => r.kind === k))
  }, [idx, focusId, kinds])
  const nearby = useMemo(
    () => (focus && !hasLineage ? nearbyWithLineage(focus, sages, idx, kinds) : []),
    [focus, hasLineage, sages, idx, kinds])

  const crumbsRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const last = crumbsRef.current?.querySelector('[aria-current="true"]')
    last?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [trail, focusId])

  const otherLinks = useMemo(
    () => !!focusId && connections.some(c => (c.source === focusId && sageMap.has(c.target)) || (c.target === focusId && sageMap.has(c.source))),
    [connections, focusId, sageMap])

  const toggleKind = (k: LineageKind) => setKinds(prev => {
    const next = new Set(prev)
    if (next.has(k)) { if (next.size > 1) next.delete(k) } else next.add(k)
    return next
  })

  const loading = !sages.length

  // ── UI ───────────────────────────────────────────────────────────────────
  // In the Sinai pane the picker ranks, and marks, the sages whose road is recorded.
  const picker = (className: string) => (
    <SagePicker
      locale={locale}
      sages={sages}
      degree={sinai ? (id => (sinai.best.has(id) ? 60 : 0) + Math.min(degreeOf(idx, id, kinds), 30)) : (id => degreeOf(idx, id, kinds))}
      badge={sinai ? (id => sinai.best.has(id)
        ? { on: true, text: tr(locale, 'דרך לסיני', 'reaches Sinai', 'путь к Синаю') }
        : { on: false, text: tr(locale, 'ללא דרך מתועדת', 'no recorded road', 'путь не записан') }) : undefined}
      placeholder={sinai ? tr(locale, 'הדרך לסיני של…', 'The road to Sinai of…', 'Путь к Синаю для…') : undefined}
      yearsOf={yearsOf}
      onPick={id => refocus(id)}
      className={className}
    />
  )
  const depthControl = (
    <div role="group" aria-label={tr(locale, 'מספר דורות', 'Generations', 'Поколения')} className="flex items-center gap-1.5 flex-shrink-0">
      <span className="text-[11px] font-sans text-ink-400 hidden lg:inline">{tr(locale, 'דורות', 'Generations', 'Поколения')}</span>
      <div className="flex rounded-lg border border-ink-700 overflow-hidden">
        {DEPTHS.map(d => (
          <button
            key={d}
            onClick={() => { camera.current = 'keep'; setDepth(d) }}
            aria-pressed={depth === d}
            aria-label={generations(d, locale)}
            className={cn(
              'w-8 h-8 text-xs font-sans font-semibold tabular-nums transition-colors',
              depth === d ? 'bg-gold-500/20 text-gold-300' : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800',
            )}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )

  const zoomControls = (vertical: boolean) => (
    <div className={cn('flex rounded-lg border border-ink-700 bg-ink-900/85 backdrop-blur-sm overflow-hidden', vertical && 'flex-col')}>
      <IconBtn label={tr(locale, 'התקרב', 'Zoom in', 'Приблизить')} onClick={() => zoomBy(1.3)}>+</IconBtn>
      <IconBtn label={tr(locale, 'התרחק', 'Zoom out', 'Отдалить')} onClick={() => zoomBy(1 / 1.3)}>−</IconBtn>
      <IconBtn label={tr(locale, 'התאם למסך', 'Fit to screen', 'По размеру экрана')} onClick={fit}>⤢</IconBtn>
    </div>
  )

  const viewSwitch = (
    <div role="group" aria-label={tr(locale, 'תצוגה', 'View', 'Вид')} className="flex rounded-lg border border-ink-700 overflow-hidden flex-shrink-0">
      {(['tree', 'outline'] as const).map(m => (
        <button
          key={m}
          onClick={() => { setModePref(m); switchPane('lineage') }}
          aria-pressed={pane === 'lineage' && mode === m}
          className={cn(
            'h-8 px-3 text-xs font-sans font-semibold transition-colors',
            pane === 'lineage' && mode === m ? 'bg-gold-500/20 text-gold-300' : 'text-ink-400 hover:text-ink-100 hover:bg-ink-800',
          )}
        >
          {m === 'tree' ? tr(locale, 'עץ', 'Tree', 'Дерево') : tr(locale, 'רשימה', 'Outline', 'Список')}
        </button>
      ))}
      {!narrow && (
        <button
          onClick={() => switchPane('sinai')}
          aria-pressed={pane === 'sinai'}
          className={cn(
            'h-8 px-3 flex items-center gap-1.5 text-xs font-sans font-semibold border-s border-ink-700 transition-colors',
            pane === 'sinai' ? 'bg-gold-500/20 text-gold-300' : 'text-ink-300 hover:text-gold-300 hover:bg-ink-800',
          )}
        >
          <MountainIcon className="w-4 h-4" />
          {SP.title[locale]}
        </button>
      )}
    </div>
  )

  // Phones: the road to Sinai gets its own toggle in the top row (the tree /
  // outline switch lives in the legend panel there).
  const sinaiToggle = (
    <button
      onClick={() => switchPane(pane === 'sinai' ? 'lineage' : 'sinai')}
      aria-pressed={pane === 'sinai'}
      aria-label={SP.title[locale]}
      title={SP.title[locale]}
      className={cn(
        'flex-shrink-0 h-10 px-2.5 rounded-lg border flex items-center gap-1 text-xs font-sans font-semibold transition-colors',
        pane === 'sinai' ? 'border-gold-500/60 text-gold-300 bg-gold-500/10' : 'border-ink-700 text-ink-300',
      )}
    >
      <MountainIcon className="w-5 h-5" />
      <span aria-hidden>{tr(locale, 'סיני', 'Sinai', 'Синай')}</span>
    </button>
  )

  const legend = (
    <div className="space-y-2">
      <p className="text-[11px] font-sans font-semibold text-ink-300 pe-7">
        {tr(locale, 'סוגי קשר', 'Link types', 'Типы связей')}
        <span className="font-normal text-ink-500"> · {tr(locale, 'לחץ להסתרה', 'click to hide', 'нажмите, чтобы скрыть')}</span>
      </p>
      <div className="grid grid-cols-2 gap-1">
        {LEGEND_ORDER.map(k => {
          const on = kinds.has(k)
          return (
            <button
              key={k}
              onClick={() => { camera.current = 'keep'; toggleKind(k) }}
              aria-pressed={on}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-1.5 h-8 text-start transition-colors border',
                on ? 'text-ink-100 border-ink-700/70 hover:bg-ink-800/70' : 'text-ink-500 border-transparent line-through decoration-ink-600 hover:bg-ink-800/50',
              )}
            >
              <svg width="22" height="10" aria-hidden className={cn('flex-shrink-0', !on && 'opacity-40')}>
                <line x1="2" y1="5" x2="20" y2="5" className={`lt-edge k-${k}`} />
              </svg>
              <span className="text-[11px] font-sans flex-1 truncate">{KIND_LABEL[k][locale]}</span>
              {on && layout && <span className="text-[10px] font-sans text-ink-500 tabular-nums">{kindCounts[k]}</span>}
            </button>
          )
        })}
      </div>
      <p className="text-[10.5px] leading-snug font-sans text-ink-400">
        <span aria-hidden className="text-ink-300">↑ </span>
        {tr(locale, 'רבותיו ומי שהשפיע עליו', 'teachers and influences', 'учителя и повлиявшие')}
        <span aria-hidden className="text-ink-600"> · </span>
        <span aria-hidden className="text-ink-300">↓ </span>
        {tr(locale, 'תלמידיו ומי שהושפע ממנו', 'students and the influenced', 'ученики и испытавшие влияние')}
        <span aria-hidden className="text-ink-600"> · </span>
        <span aria-hidden className="text-ink-300">↺ </span>
        {tr(locale, 'מופיע כבר בעץ', 'already in the tree', 'уже в дереве')}
      </p>
      <p className="text-[10.5px] leading-snug font-sans text-ink-400">
        {narrow
          ? tr(locale,
              'הקש על חכם כדי להתמקד בו, ועל המוקד כדי לפתוח את הכרטיס. צבוט לזום.',
              'Tap a sage to refocus, and the focus to open its card. Pinch to zoom.',
              'Коснитесь мудреца для фокуса, центра — чтобы открыть карточку. Щипок — масштаб.')
          : tr(locale,
              'לחץ על חכם כדי להתמקד בו, ועל המוקד כדי לפתוח את הכרטיס. גלגלת לגלילה, Ctrl+גלגלת לזום.',
              'Click a sage to refocus, and the focus to open its card. Wheel pans; Ctrl+wheel zooms.',
              'Нажмите на мудреца для фокуса, на центр — чтобы открыть карточку. Колесо прокручивает, Ctrl+колесо — масштаб.')}
      </p>
      {(idx.reoriented > 0 || filteredIds) && (
        <p className="text-[10px] leading-snug font-sans text-ink-500 pt-1.5 border-t border-ink-700/60">
          {idx.reoriented > 0 && tr(locale,
            `${idx.reoriented} קשרים שכיוונם בנתונים סותר את סדר הזמנים מוצגים לפי הכרונולוגיה. `,
            `${idx.reoriented} links stored against the chronology are drawn in date order. `,
            `${idx.reoriented} связей, записанных против хронологии, показаны по датам. `)}
          {filteredIds && tr(locale, 'חכמים מחוץ לסינון הכללי מוצגים בעמעום.', 'Sages outside the global filters are dimmed.', 'Мудрецы вне общих фильтров приглушены.')}
        </p>
      )}
      {narrow && <div className="pt-1.5 border-t border-ink-700/60">{viewSwitch}</div>}
    </div>
  )

  const crumbs = (
    <nav ref={crumbsRef} aria-label={tr(locale, 'היסטוריית מיקוד', 'Focus history', 'История фокуса')} className="flex items-center gap-1 min-w-0 overflow-x-auto lt-noscroll">
      {trail.length > 1 && (
        <button
          onClick={() => refocus(trail[trail.length - 2])}
          aria-label={tr(locale, 'חזרה למוקד הקודם', 'Back to previous focus', 'Назад')}
          className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-ink-300 hover:text-gold-300 hover:bg-ink-800"
        >
          {rtl ? '→' : '←'}
        </button>
      )}
      <ol className="flex items-center gap-1 min-w-0">
        {trail.map((id, i) => {
          const current = i === trail.length - 1
          return (
            <li key={id} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && <span aria-hidden className="text-ink-600 text-xs">{rtl ? '‹' : '›'}</span>}
              <button
                onClick={() => refocus(id)}
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'px-2 h-7 rounded-md text-xs font-sans whitespace-nowrap transition-colors',
                  current ? 'text-gold-300 bg-gold-500/10 font-semibold' : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800',
                )}
              >
                {shortName(sageMap.get(id)?.label, 22)}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )

  const presetChips = (
    <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto lt-noscroll" role="group"
      aria-label={tr(locale, 'נקודות פתיחה', 'Starting points', 'С чего начать')}>
      {(pane === 'sinai' ? sinaiPresets : presets).map(id => (
        <button
          key={id}
          onClick={() => refocus(id)}
          aria-pressed={id === focusId}
          className={cn(
            'flex-shrink-0 h-7 px-2.5 rounded-full text-xs font-sans whitespace-nowrap border transition-colors',
            id === focusId
              ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
              : 'border-ink-700 text-ink-300 hover:border-gold-500/40 hover:text-ink-100',
          )}
        >
          {shortName(sageMap.get(id)?.label, 20)}
        </button>
      ))}
    </div>
  )

  const counts = tree && (
    <span className="text-[11px] font-sans text-ink-400 whitespace-nowrap tabular-nums">
      <span title={tr(locale, 'רבותיו ומשפיעיו בעץ', 'Ancestors in view', 'Предки в дереве')}>↑ {tree.counts.up}</span>
      <span className="mx-1.5 text-ink-600">·</span>
      <span title={tr(locale, 'תלמידיו ומושפעיו בעץ', 'Descendants in view', 'Потомки в дереве')}>↓ {tree.counts.down}</span>
    </span>
  )

  return (
    <div className="lt-root absolute inset-0 flex flex-col" dir={rtl ? 'rtl' : 'ltr'}>
      <style>{TREE_CSS}</style>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="relative z-20 flex-shrink-0 border-b border-ink-700/50 bg-ink-900/85 backdrop-blur-sm px-3 md:px-4 py-2 space-y-2">
        <div className="flex items-center gap-2 md:gap-3">
          {picker('flex-1 md:flex-none md:w-72 min-w-0')}
          {!narrow && (
            <>
              <span className="text-[11px] font-sans text-ink-500 whitespace-nowrap hidden xl:inline">
                {tr(locale, 'נקודות פתיחה:', 'Start with:', 'Начать с:')}
              </span>
              <div className="flex-1 min-w-0">{presetChips}</div>
            </>
          )}
          {narrow && sinaiToggle}
          {pane === 'sinai' ? (!narrow && viewSwitch) : narrow ? (
            <label className="flex-shrink-0">
              <span className="sr-only">{tr(locale, 'מספר דורות', 'Generations', 'Поколения')}</span>
              <select
                value={depth}
                onChange={e => { camera.current = 'keep'; setDepth(+e.target.value) }}
                className="h-10 rounded-lg bg-ink-800/70 border border-ink-700 text-ink-100 text-sm font-sans px-2 focus:outline-none focus:border-gold-500/60"
              >
                {DEPTHS.map(d => (
                  <option key={d} value={d}>{generations(d, locale)}</option>
                ))}
              </select>
            </label>
          ) : (
            <>
              {depthControl}
              {viewSwitch}
            </>
          )}
          {narrow && pane === 'lineage' && (
            <button
              onClick={() => setLegendOpen(o => !o)}
              aria-expanded={legendOpen}
              aria-controls="lt-legend"
              aria-label={tr(locale, 'מקרא וסוגי קשר', 'Legend and link types', 'Легенда и типы связей')}
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center transition-colors',
                legendOpen ? 'border-gold-500/60 text-gold-300 bg-gold-500/10' : 'border-ink-700 text-ink-300',
              )}
            >
              <svg aria-hidden className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth={2} d="M4 7h4m4 0h8M4 12h2m3 0h2m3 0h2m3 0h1M4 17h1.5m3 0h1.5m3 0h1.5m3 0h1.5" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 min-h-[28px]">
          <div className="flex-1 min-w-0">{narrow && trail.length < 2 ? presetChips : crumbs}</div>
          {!narrow && hasLineage && pane === 'lineage' && counts}
          {!narrow && focus && (
            <button
              onClick={() => openCard(focus.id)}
              className="flex-shrink-0 h-7 px-2.5 rounded-md text-xs font-sans font-semibold text-gold-300 border border-gold-500/40 hover:bg-gold-500/10 transition-colors"
            >
              {tr(locale, 'פתח כרטיס', 'Open card', 'Открыть карточку')}
            </button>
          )}
          {narrow && pane === 'lineage' && zoomControls(false)}
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div ref={wrapRef} className="relative flex-1 min-h-0 overflow-hidden">
        <svg
          ref={svgRef}
          className={cn('lt-svg absolute inset-0 w-full h-full', pane === 'sinai' && 'invisible')}
          role="group"
          aria-label={focus
            ? tr(locale, `עץ השושלת של ${displayName(focus.label)}`, `Lineage of ${displayName(focus.label)}`, `Линия преемственности: ${displayName(focus.label)}`)
            : tr(locale, 'עץ שושלות', 'Lineage tree', 'Древо преемственности')}
        >
          <g ref={viewportRef}>
            <g className="lt-edges" />
            <g className="lt-nodes" />
          </g>
        </svg>

        {/* Legend: floating on wide screens, a drop-down panel on phones */}
        {pane === 'sinai' ? null : legendOpen ? (
          <div
            id="lt-legend"
            className={cn(
              'absolute z-10 glass rounded-xl shadow-glass p-3 animate-fade-in',
              narrow ? 'top-2 inset-x-3 max-h-[calc(100%-10rem)] overflow-y-auto' : 'top-3 end-3 w-[17rem]',
            )}
          >
            {!narrow && (
              <button
                onClick={() => setLegendOpen(false)}
                aria-label={tr(locale, 'הסתר מקרא', 'Hide legend', 'Скрыть легенду')}
                className="absolute top-1.5 end-1.5 w-7 h-7 rounded-md flex items-center justify-center text-ink-400 hover:text-gold-300 hover:bg-ink-800"
              >
                ×
              </button>
            )}
            {narrow && trail.length > 1 && (
              <div className="mb-3 pb-3 border-b border-ink-700/60">
                <p className="text-[11px] font-sans font-semibold text-ink-300 mb-1.5">{tr(locale, 'נקודות פתיחה', 'Starting points', 'С чего начать')}</p>
                <div className="flex flex-wrap gap-1.5 [&>div]:flex-wrap [&>div]:overflow-visible">{presetChips}</div>
              </div>
            )}
            {legend}
          </div>
        ) : !narrow && (
          <button
            onClick={() => setLegendOpen(true)}
            aria-expanded={false}
            aria-controls="lt-legend"
            className="absolute top-3 end-3 z-10 h-8 px-3 rounded-lg glass text-xs font-sans text-ink-200 hover:text-gold-300"
          >
            {tr(locale, 'מקרא', 'Legend', 'Легенда')}
          </button>
        )}

        {!narrow && pane === 'lineage' && <div className="absolute bottom-6 end-4 z-10">{zoomControls(true)}</div>}

        {pane === 'sinai' && sinai && (
          <SinaiPath
            locale={locale}
            sageId={focusId}
            si={sinai}
            idx={idx}
            sages={sages}
            sageMap={sageMap}
            onOpen={openFromRiver}
            onPick={refocus}
            picker={picker('w-full')}
          />
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-sans text-ink-400">
            {tr(locale, 'טוען נתונים…', 'Loading…', 'Загрузка…')}
          </div>
        )}

        {focus && !hasLineage && !loading && pane === 'lineage' && (
          <EmptyLineage
            locale={locale}
            focus={focus}
            years={yearsOf(focus)}
            nearby={nearby}
            hiddenKinds={hiddenKinds}
            yearsOf={yearsOf}
            onShowAll={() => setKinds(new Set(LINEAGE_KINDS))}
            onPick={refocus}
            onOpenCard={() => openCard(focus.id)}
            onShowInGraph={otherLinks ? () => { useAppStore.getState().setActiveTab('graph'); openCard(focus.id) } : undefined}
          />
        )}
      </div>
    </div>
  )
}

/* ── Drawing helpers ──────────────────────────────────────────────────── */

/** A chip-sized name: drops a trailing parenthetical ("רש״י (רבי שלמה יצחקי)" → "רש״י"). */
function shortName(label: string | undefined, max: number): string {
  const n = displayName(label)
  const s = /^(.{3,}?)\s*\([^)]*\)$/.exec(n)?.[1] ?? n
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function pathOf(pts: [number, number][], curve: boolean): string {
  const p = (q: [number, number]) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`
  if (curve && pts.length === 4) return `M${p(pts[0])}C${p(pts[1])} ${p(pts[2])} ${p(pts[3])}`
  return 'M' + pts.map(p).join('L')
}

function isIn(n: PlacedNode | undefined, ids: Set<string>): boolean {
  return !n || n.node.type === 'more' || ids.has(n.node.id)
}

interface View { w: number; h: number; left: number; right: number; bottom: number }

/**
 * Where the camera should sit. Without `k`, fit the whole tree (never below
 * a readable scale unless `fitAll`, and at 1:1 for the outline); then centre on the tree
 * while keeping the focus node well inside the usable part of the canvas.
 */
function cameraFor(layout: Layout, v: View, k?: number, fitAll = false): ZoomTransform {
  const uw = Math.max(200, v.w - v.left - v.right), uh = Math.max(200, v.h - v.bottom)
  const { x0, y0, x1, y1 } = layout.bbox
  const outline = layout.mode === 'outline'
  const pad = outline ? 12 : 36
  const bw = x1 - x0 + pad * 2, bh = y1 - y0 + pad * 2
  // Opening views stay legible (a reader can pan); the fit button shows the
  // whole tree. The outline only ever fits its width: it is read by scrolling.
  const scale = k ?? (outline
    ? Math.min(1, uw / bw)
    : Math.max(fitAll ? 0.2 : 0.78, Math.min(1, uw / bw, uh / bh)))
  const f = layout.nodes.find(n => n.node.type === 'focus')
  const fx = f?.x ?? 0, fy = f?.y ?? 0
  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
  const limX = (uw * 0.34) / scale, limY = (uh * 0.3) / scale
  const cx = clamp((x0 + x1) / 2, fx - limX, fx + limX)
  const cy = outline && bh * scale > uh
    ? fy + (uh * 0.12) / scale   // focus row at ~38% from the top
    : clamp((y0 + y1) / 2, fy - limY, fy + limY)
  return zoomIdentity.translate(v.left + uw / 2 - scale * cx, uh / 2 - scale * cy).scale(scale)
}

/** Pan just enough to bring a keyboard-focused node into view. */
function revealNode(
  svgEl: SVGSVGElement, z: ZoomBehavior<SVGSVGElement, unknown>, t: ZoomTransform, d: PlacedNode, v: View,
) {
  const m = 24
  const sx = t.applyX(d.x), sy = t.applyY(d.y)
  const hw = (d.w * t.k) / 2, hh = (d.h * t.k) / 2
  let dx = 0, dy = 0
  if (sx - hw < v.left + m) dx = v.left + m - (sx - hw)
  else if (sx + hw > v.w - v.right - m) dx = v.w - v.right - m - (sx + hw)
  if (sy - hh < m) dy = m - (sy - hh)
  else if (sy + hh > v.h - v.bottom) dy = v.h - v.bottom - (sy + hh)
  if (!dx && !dy) return
  select(svgEl).transition().duration(reducedMotion() ? 0 : 220).call(z.translateBy, dx / t.k, dy / t.k)
}

function highlightChain(vp: SVGGElement, d: PlacedNode, byKey: Map<string, PlacedNode>) {
  const chain = new Set<string>()
  let cur: PlacedNode | undefined = d
  while (cur) {
    chain.add(cur.key)
    cur = cur.parentKey ? byKey.get(cur.parentKey) : undefined
  }
  vp.classList.add('lt-hovering')
  vp.querySelectorAll<SVGGElement>('g.lt-node').forEach(el => el.classList.toggle('lt-hot', chain.has(el.getAttribute('data-key') ?? '')))
  vp.querySelectorAll<SVGPathElement>('path.lt-edge').forEach(el => el.classList.toggle('lt-hot', chain.has(el.getAttribute('data-child') ?? '')))
}

function clearChain(vp: SVGGElement) {
  vp.classList.remove('lt-hovering')
  vp.querySelectorAll('.lt-hot').forEach(el => el.classList.remove('lt-hot'))
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** (Re)build one node's contents. Plain DOM: ~100 nodes, rebuilt only when the layout changes. */
function drawNode(
  g: SVGGElement, d: PlacedNode, rtl: boolean, sageMap: Map<string, Sage>,
  yearsOf: (s: Sage | undefined) => string, title: string,
) {
  while (g.firstChild) g.removeChild(g.firstChild)
  const el = (tag: string, attrs: Record<string, string | number>, parent: Element = g) => {
    const e = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
    parent.appendChild(e)
    return e
  }
  const { w, h, node } = d
  el('title', {}).textContent = title
  if (node.type === 'focus') el('rect', { class: 'lt-halo', x: -w / 2 - 5, y: -h / 2 - 5, width: w + 10, height: h + 10, rx: 15 })
  el('rect', { class: 'lt-box', x: -w / 2, y: -h / 2, width: w, height: h, rx: node.type === 'sage' || node.type === 'focus' ? 11 : h / 2 })

  const dir = rtl ? 'rtl' : 'ltr'
  const edge = rtl ? w / 2 : -w / 2
  const inward = rtl ? -1 : 1

  if (node.type === 'more' || node.type === 'repeat') {
    const t = el('text', { class: 'lt-name', x: edge + inward * 14, y: 4, direction: dir, 'text-anchor': 'start' })
    t.textContent = d.lines[0] ?? ''
    return
  }

  const sage = sageMap.get(node.id)
  const years = yearsOf(sage)
  const lines = d.lines.length ? d.lines : ['']
  const lh = node.type === 'focus' ? 17 : 15
  const block = lines.length * lh + (years ? 14 : 0)
  let y = -block / 2 + lh - 3
  el('circle', { class: 'lt-dot', cx: edge + inward * 13, cy: y - 4.5, r: node.type === 'focus' ? 4.5 : 3.5 })
  const name = el('text', { class: 'lt-name', direction: dir, 'text-anchor': 'start' })
  lines.forEach((ln, i) => {
    const ts = el('tspan', { x: edge + inward * 24, y: y + i * lh }, name)
    ts.textContent = ln
  })
  y += (lines.length - 1) * lh
  if (years) {
    const yt = el('text', { class: 'lt-years', x: edge + inward * 24, y: y + 15, direction: dir, 'text-anchor': 'start' })
    yt.textContent = years
  }
}

/** Screen-reader label and tooltip: name, years and how the node relates to its tree parent. */
function describe(
  d: PlacedNode, locale: Locale, sageMap: Map<string, Sage>,
  nameOf: (id: string) => string, yearsOf: (s: Sage | undefined) => string,
): string {
  const n = d.node
  if (n.type === 'more') {
    return tr(locale, `הצג עוד ${n.hidden} קשרים של ${nameOf(n.id)}`, `Show ${n.hidden} more of ${nameOf(n.id)}`, `Показать ещё ${n.hidden}: ${nameOf(n.id)}`)
  }
  const sage = sageMap.get(n.id)
  const full = sage?.label ?? ''
  const years = yearsOf(sage)
  const head = years ? `${full} · ${years}` : full
  if (n.type === 'focus') {
    return `${head}\n${tr(locale, 'במוקד העץ — לחץ לפתיחת הכרטיס', 'In focus — activate to open the card', 'В центре — нажмите, чтобы открыть карточку')}`
  }
  const parent = n.parent ? nameOf(n.parent.id) : ''
  let rel = ''
  if (n.kind && (n.side === 'up' || n.side === 'down')) {
    const r = RELATION[n.side][n.kind]
    const fem = sage?.tags?.includes('נשים') ? 1 : 0
    rel = locale === 'he'
      ? (r.he[fem].endsWith('מ') ? `${r.he[fem]}${parent}` : `${r.he[fem]} ${parent}`)
      : `${locale === 'ru' ? r.ru : r.en} ${parent}`
  }
  const tail = n.type === 'repeat'
    ? tr(locale, 'מופיע כבר בעץ — לחץ כדי להתמקד בו', 'Already in the tree — activate to focus', 'Уже в дереве — нажмите для фокуса')
    : tr(locale, 'לחץ כדי להתמקד', 'Activate to focus', 'Нажмите для фокуса')
  return [head, rel, tail].filter(Boolean).join('\n')
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

/** Russian plural: 1 связь, 2 связи, 5 связей. */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
}

function linksLabel(n: number, locale: Locale): string {
  if (locale === 'he') return n === 1 ? 'קשר אחד' : `${n} קשרים`
  if (locale === 'en') return n === 1 ? '1 link' : `${n} links`
  return `${n} ${ruPlural(n, 'связь', 'связи', 'связей')}`
}

function generations(n: number, locale: Locale): string {
  if (locale === 'he') return n === 1 ? 'דור אחד' : `${n} דורות`
  if (locale === 'en') return n === 1 ? '1 generation' : `${n} generations`
  return `${n} ${ruPlural(n, 'поколение', 'поколения', 'поколений')}`
}

function MountainIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
      <path d="M2.5 20 10 8.5l3.2 4.8 2.3-3L21.5 20z" />
      <path d="M12 3.5v2.2M7.4 5.3l1.1 1.6M16.6 5.3l-1.1 1.6" />
    </svg>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 flex items-center justify-center text-base font-sans text-ink-300 hover:text-gold-300 hover:bg-ink-800 transition-colors"
    >
      {children}
    </button>
  )
}

/** Combobox over every sage; those with lineage links rank first. */
function SagePicker({ locale, sages, degree, badge, placeholder, yearsOf, onPick, className }: {
  locale: Locale
  sages: Sage[]
  degree: (id: string) => number
  /** Replaces the lineage-count badge on each result. */
  badge?: (id: string) => { text: string; on: boolean }
  placeholder?: string
  yearsOf: (s: Sage | undefined) => string
  onPick: (id: string) => void
  className?: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const listId = useId()
  const results = useMemo(() => {
    const nq = normalizeHe(q)
    if (!nq) return []
    const scored: { s: Sage; score: number }[] = []
    for (const s of sages) {
      const name = normalizeHe(displayName(s.label))
      const label = normalizeHe(s.label ?? '')
      const en = normalizeHe(s.name_en ?? '')
      let score = -1
      if (name === nq) score = 0
      else if (name.startsWith(nq)) score = 1
      else if (name.includes(nq)) score = 2
      else if (label.includes(nq)) score = 3
      else if (en.includes(nq)) score = 3
      if (score < 0) continue
      scored.push({ s, score: score * 100 - Math.min(degree(s.id), 60) })
    }
    return scored.sort((a, b) => a.score - b.score).slice(0, 8).map(x => x.s)
  }, [q, sages, degree])

  const choose = (s: Sage) => {
    onPick(s.id)
    setQ('')
    setOpen(false)
  }

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi(i => Math.min(results.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && results[hi]) { e.preventDefault(); choose(results[hi]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  const expanded = open && q.length > 0
  return (
    <div className={cn('relative', className)}>
      <svg aria-hidden className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-ink-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
      </svg>
      <input
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && results[hi] ? `${listId}-${hi}` : undefined}
        aria-label={tr(locale, 'בחר חכם למיקוד העץ', 'Choose a sage to focus', 'Выберите мудреца')}
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKey}
        placeholder={placeholder ?? tr(locale, 'מקד את העץ בחכם…', 'Focus the tree on a sage…', 'Сфокусировать на мудреце…')}
        className={cn(
          'w-full h-10 rounded-lg ps-9 pe-3 text-sm font-sans',
          'bg-ink-800/70 border border-ink-700 text-ink-100 placeholder:text-ink-500',
          'focus:outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20 transition-colors',
        )}
      />
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 top-full mt-1 inset-x-0 md:w-96 max-h-80 overflow-y-auto rounded-xl glass shadow-glass p-1"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs font-sans text-ink-400">{tr(locale, 'לא נמצא חכם בשם זה', 'No sage by that name', 'Мудрец не найден')}</li>
          )}
          {results.map((s, i) => {
            const n = degree(s.id)
            const b = badge?.(s.id) ?? { on: n > 0, text: n ? linksLabel(n, locale) : tr(locale, 'ללא שושלת', 'no lineage', 'нет связей') }
            return (
              <li
                key={s.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === hi}
                onMouseDown={e => { e.preventDefault(); choose(s) }}
                onMouseEnter={() => setHi(i)}
                className={cn('flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer', i === hi && 'bg-ink-700/60')}
              >
                <span aria-hidden className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ERA_COLORS[s.period] }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-sans text-ink-100 truncate">{displayName(s.label)}</span>
                  <span className="block text-[11px] font-sans text-ink-500 truncate">
                    {[ERA_LABELS[s.period]?.[locale], yearsOf(s)].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className={cn('flex-shrink-0 text-[10px] font-sans px-1.5 py-0.5 rounded-full tabular-nums',
                  b.on ? 'bg-gold-500/15 text-gold-300' : 'text-ink-600')}>
                  {b.text}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function EmptyLineage({ locale, focus, years, nearby, hiddenKinds, yearsOf, onShowAll, onPick, onOpenCard, onShowInGraph }: {
  locale: Locale
  focus: Sage
  years: string
  nearby: Sage[]
  hiddenKinds: LineageKind[]
  yearsOf: (s: Sage | undefined) => string
  onShowAll: () => void
  onPick: (id: string) => void
  onOpenCard: () => void
  /** Set when the sage has non-lineage links (colleagues, opponents) the network tab can show. */
  onShowInGraph?: () => void
}) {
  const name = displayName(focus.label)
  const color = ERA_COLORS[focus.period]
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="min-h-full flex items-start md:items-center justify-center px-4 pt-6 pb-40 md:pb-28">
        <div className="w-full max-w-md glass rounded-2xl shadow-glass p-5 md:p-6 text-center animate-fade-in">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center border" style={{ borderColor: `${color}66`, background: `${color}1a` }}>
            <svg aria-hidden className="w-6 h-6" fill="none" stroke={color} viewBox="0 0 24 24">
              <circle cx="12" cy="6" r="2.2" strokeWidth={1.6} />
              <circle cx="6" cy="18" r="2.2" strokeWidth={1.6} strokeDasharray="2 2" />
              <circle cx="18" cy="18" r="2.2" strokeWidth={1.6} strokeDasharray="2 2" />
              <path d="M12 8.5v4M12 12.5l-5 3.5M12 12.5l5 3.5" strokeWidth={1.4} strokeDasharray="2 2" />
            </svg>
          </div>
          <h2 className="font-serif text-xl text-ink-50">{name}</h2>
          <p className="text-xs font-sans text-ink-400 mt-1">
            {[ERA_LABELS[focus.period]?.[locale], years].filter(Boolean).join(' · ')}
          </p>
          <p className="text-sm font-sans text-ink-200 leading-relaxed mt-4">
            {hiddenKinds.length
              ? tr(locale,
                  `ל${name} יש קשרים מסוג ${hiddenKinds.map(k => KIND_LABEL[k].he).join(', ')}, אך סוג זה מוסתר כעת.`,
                  `${name} has ${hiddenKinds.map(k => KIND_LABEL[k].en.toLowerCase()).join(', ')} links, but that type is hidden.`,
                  `У «${name}» есть связи типа «${hiddenKinds.map(k => KIND_LABEL[k].ru).join(', ')}», но этот тип скрыт.`)
              : tr(locale,
                  'עדיין לא תועדו במאגר רבותיו, תלמידיו או מי שהשפיע עליו. אפשר להמשיך מאחד החכמים הסמוכים לו בזמן ובמקום, שיש להם שושלת:',
                  'The archive doesn’t yet record teachers, students or influences for this sage. Carry on from a sage close to them in time and place:',
                  'В архиве пока нет учителей, учеников или влияний этого мудреца. Продолжите с близкого к нему по времени и месту:')}
          </p>
          {hiddenKinds.length > 0 && (
            <button onClick={onShowAll} className="mt-3 h-9 px-4 rounded-lg text-sm font-sans font-semibold bg-gold-500/20 text-gold-300 border border-gold-500/40 hover:bg-gold-500/30">
              {tr(locale, 'הצג את כל סוגי הקשר', 'Show all link types', 'Показать все типы')}
            </button>
          )}
          {!hiddenKinds.length && nearby.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-start">
              {nearby.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => onPick(s.id)}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 border border-ink-700 hover:border-gold-500/50 hover:bg-gold-500/5 transition-colors"
                  >
                    <span aria-hidden className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ERA_COLORS[s.period] }} />
                    <span className="min-w-0">
                      <span className="block text-sm font-sans text-ink-100 truncate">{displayName(s.label)}</span>
                      <span className="block text-[11px] font-sans text-ink-500 truncate">{yearsOf(s) || ERA_LABELS[s.period]?.[locale]}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <button onClick={onOpenCard} className="text-xs font-sans text-ink-400 hover:text-gold-300 underline underline-offset-4">
              {tr(locale, `פתח את הכרטיס של ${name}`, `Open ${name}’s card`, `Открыть карточку: ${name}`)}
            </button>
            {onShowInGraph && (
              <button onClick={onShowInGraph} className="text-xs font-sans text-ink-400 hover:text-gold-300 underline underline-offset-4">
                {tr(locale, 'קשרים אחרים ברשת הקשרים', 'Other links in the network', 'Другие связи в сети')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* Everything reads theme variables, so the light theme needs no re-render.
   Era colours arrive per node as --c. Content dims live on children so they
   never fight D3's enter/exit opacity on the node group itself. */
const TREE_CSS = `
.lt-root { --lt-teacher: var(--gold-400); --lt-pred: #4fb3a9; --lt-family: #d98ca0; --lt-infl: rgb(var(--ink-300-rgb)); }
[data-theme='light'] .lt-root { --lt-pred: #1d7a70; --lt-family: #a4466a; --lt-infl: rgb(var(--ink-400-rgb)); }
.lt-root .lt-noscroll { scrollbar-width: none; }
.lt-root .lt-noscroll::-webkit-scrollbar { display: none; }
.lt-root .lt-svg { cursor: grab; touch-action: none; }
.lt-root .lt-svg:active { cursor: grabbing; }
.lt-root .lt-edge { fill: none; stroke-linecap: round; stroke-linejoin: round; transition: stroke-opacity .18s, stroke-width .18s; }
.lt-root .lt-edge.k-teacher { stroke: var(--lt-teacher); stroke-width: 2.2px; }
.lt-root .lt-edge.k-predecessor { stroke: var(--lt-pred); stroke-width: 2px; stroke-dasharray: 11 4 2 4; }
.lt-root .lt-edge.k-family { stroke: var(--lt-family); stroke-width: 2.4px; stroke-dasharray: 0.5 5; }
.lt-root .lt-edge.k-influence { stroke: var(--lt-infl); stroke-width: 1.5px; stroke-dasharray: 6 5; stroke-opacity: .8; }
.lt-root .lt-stem { fill: none; stroke: rgb(var(--ink-500-rgb) / .5); stroke-width: 1.2px; }
.lt-root .lt-node { cursor: pointer; outline: none; }
.lt-root .lt-box { fill: rgb(var(--ink-850-rgb)); stroke: var(--c); stroke-opacity: .6; stroke-width: 1.3px; transition: stroke-width .15s, stroke-opacity .15s; }
.lt-root .lt-dot { fill: var(--c); }
.lt-root .lt-name { fill: var(--ink-100); font-size: 13px; font-weight: 600; }
.lt-root .lt-years { fill: var(--ink-400); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.lt-root .lt-focus .lt-box { stroke: var(--gold-400); stroke-opacity: 1; stroke-width: 2.2px; }
.lt-root .lt-focus .lt-halo { fill: none; stroke: rgb(var(--gold-500-rgb) / .28); stroke-width: 6px; }
.lt-root .lt-focus .lt-name { fill: var(--ink-50); font-size: 15px; font-weight: 700; }
.lt-root .lt-focus .lt-years { fill: var(--ink-300); font-size: 11px; }
.lt-root .lt-repeat .lt-box { fill: rgb(var(--ink-800-rgb) / .55); stroke: rgb(var(--ink-500-rgb)); stroke-opacity: .8; stroke-dasharray: 3 3; }
.lt-root .lt-repeat .lt-name { fill: var(--ink-300); font-size: 12px; font-weight: 500; }
.lt-root .lt-more .lt-box { fill: rgb(var(--gold-500-rgb) / .1); stroke: rgb(var(--gold-500-rgb) / .55); stroke-opacity: 1; }
.lt-root .lt-more .lt-name { fill: var(--gold-300); font-size: 12px; font-weight: 700; }
.lt-root .lt-node:hover .lt-box, .lt-root .lt-node:focus-visible .lt-box { stroke: var(--gold-300); stroke-opacity: 1; stroke-width: 2.4px; }
.lt-root .lt-node:focus-visible .lt-box { stroke-width: 3px; }
.lt-root .lt-out > * { opacity: .38; }
.lt-root .lt-out-edge { stroke-opacity: .3; }
.lt-root .lt-hovering .lt-node:not(.lt-hot) > * { opacity: .42; }
.lt-root .lt-hovering .lt-edge:not(.lt-hot), .lt-root .lt-hovering .lt-stem { stroke-opacity: .15; }
.lt-root .lt-hovering .lt-edge.lt-hot { stroke-width: 3.2px; stroke-opacity: 1; }
@supports (color: color-mix(in srgb, red, blue)) {
  .lt-root .lt-box { fill: color-mix(in srgb, var(--c) 11%, rgb(var(--ink-850-rgb))); }
  .lt-root .lt-focus .lt-box { fill: color-mix(in srgb, var(--c) 20%, rgb(var(--ink-850-rgb))); }
  [data-theme='light'] .lt-root .lt-box { fill: color-mix(in srgb, var(--c) 9%, #fffdf8); stroke: color-mix(in srgb, var(--c), #000 20%); }
  [data-theme='light'] .lt-root .lt-dot { fill: color-mix(in srgb, var(--c), #000 18%); }
  [data-theme='light'] .lt-root .lt-focus .lt-box { fill: color-mix(in srgb, var(--c) 16%, #fffdf8); stroke: var(--gold-400); }
  [data-theme='light'] .lt-root .lt-repeat .lt-box { fill: rgb(var(--ink-800-rgb) / .55); stroke: rgb(var(--ink-500-rgb)); }
  [data-theme='light'] .lt-root .lt-more .lt-box { fill: rgb(var(--gold-500-rgb) / .1); stroke: rgb(var(--gold-500-rgb) / .55); }
}
`
