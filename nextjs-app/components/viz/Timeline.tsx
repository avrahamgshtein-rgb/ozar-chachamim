'use client'

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Delaunay, scaleLinear, zoomIdentity } from 'd3'
import { ALL_PERIODS, ERA_COLORS, ERA_LABELS } from '@/lib/types'
import type { Locale, Period, Sage } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatYear, formatYearRangeFor } from '@/lib/utils'
import { tr } from '@/lib/i18n'
// Historical milestones — shared module (lib/milestones.ts), Masterplan §8
import { ALL_MILESTONES } from '@/lib/milestones'
import type { Milestone } from '@/lib/milestones'

/*
 * שלשלת הקבלה — one band per era, time running left to right.
 *
 * Layout rules, each one the fix for a way the old chart read as empty:
 *  - The whole chart fits the viewport on open (zoom k = 1): band heights are
 *    weighted by sage count with a floor, so the busy late eras are on screen.
 *  - The x-axis is era-weighted, not linear: each era's stretch of the axis is
 *    proportional to how many sages sit there (with a floor). A linear scale
 *    gave the BCE millennia half the width for a twelfth of the people.
 *  - Zoom is semantic: positions are rescaled and the canvas grows, marks keep
 *    their size. Native scrolling pans; the era column and year axis are sticky.
 *  - No two dots overlap: each band is packed as a beeswarm. A dot whose date is
 *    only a century (or only the era) may sit anywhere in that window, which is
 *    both honest and what makes room.
 */

const ERAS: Period[] = ALL_PERIODS

/** Conventional span of each era. Tints the era's stretch of its own band and
 *  bounds where an undated sage may sit: the era is all that is known of them. */
const ERA_WINDOW: Record<Period, [number, number]> = {
  patriarchs:      [-1850, -1500],
  exodus:          [-1500, -1200],
  judges:          [-1200, -1020],
  kings:           [-1020,  -586],
  'second-temple': [ -516,    70],
  tannaim:         [   10,   220],
  amoraim:         [  220,   500],
  geonim:          [  589,  1038],
  rishonim:        [ 1038,  1500],
  acharonim:       [ 1500,  1880],
  modern:          [ 1880,  2024],
}

/** Edges of the 11 contiguous axis segments, one per era, in ALL_PERIODS order. */
const SEG_BREAKS = [-1900, -1500, -1200, -1000, -540, 10, 220, 500, 1038, 1500, 1880, 2030]

const K_MAX = 24
const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]

type DateKind = 'exact' | 'century' | 'undated'

interface Metrics {
  compact: boolean
  labelW: number      // sticky era column
  headerH: number     // sticky milestone + year-axis header
  msRows: number      // milestone label rows in the header
  padL: number
  padR: number
  bottomPad: number   // keeps the last band clear of the fixed tab bar
  r: number           // dot radius — fixed at every zoom
  gap: number         // minimum gap between dots
  hit: number         // hit radius: a 24px target around every dot
  font: number        // sage label size
  segFloor: number    // minimum weight of an axis segment
  minBand: number     // minimum band height
  bandPow: number     // band height ∝ count^bandPow — below 1 so small eras keep room
  alwaysLabel: number // top-N by degree, labelled at every zoom
  baseLabels: number  // further labels at k = 1; grows with zoom
  tickGap: number     // minimum spacing between year ticks
}

function metricsFor(width: number): Metrics {
  return width < 640
    ? { compact: true,  labelW: 72,  headerH: 40, msRows: 1, padL: 8,  padR: 10, bottomPad: 92,
        r: 3,   gap: 0.8, hit: 12, font: 9.5,  segFloor: 24, minBand: 24, bandPow: 0.85, alwaysLabel: 8,  baseLabels: 10, tickGap: 52 }
    : { compact: false, labelW: 104, headerH: 56, msRows: 2, padL: 12, padR: 20, bottomPad: 92,
        r: 4.5, gap: 1.5, hit: 12, font: 10.5, segFloor: 24, minBand: 34, bandPow: 0.6,  alwaysLabel: 20, baseLabels: 40, tickGap: 72 }
}

interface DotModel {
  sage: Sage
  band: number
  kind: DateKind
  bx: number   // base (k = 1) x of the year, or of the window's centre
  blo: number  // base x of the window's start (= bx for an exact date)
  bhi: number
  degree: number
  short: string
  full: string // label + years, for the selected sage
}

interface BandModel { era: Period; top: number; h: number; dots: number[] }

interface Model {
  m: Metrics
  basePlotW: number
  bandsH: number
  segX: number[]                 // base x of every SEG_BREAKS entry
  base: (year: number) => number // year → base x, era-weighted
  dots: DotModel[]
  bands: BandModel[]
  index: Map<string, number>
  byDegree: number[]
}

interface BandPlacement { nudge: Float64Array; t: Float64Array; y: Float64Array; over: number }

interface Positions { xs: Float64Array; ys: Float64Array }

/* ── Dating ─────────────────────────────────────────────────────────────── */

/** Where a sage belongs on the axis: a point for an exact lifespan, otherwise
 *  the window the source vouches for (a century, or only the era). */
function dating(sage: Sage): { kind: DateKind; lo: number; mid: number; hi: number } {
  const b = sage.birth_year
  const d = sage.death_year
  if (sage.date_precision === 'century' && b != null) {
    const hi = d != null && d > b ? d : b + 100
    return { kind: 'century', lo: b, mid: (b + hi) / 2, hi }
  }
  if (b != null || d != null) {
    // Mid-life for a known span: when the sage was active, not when born.
    const y = b != null && d != null ? (b + d) / 2 : b != null ? Math.min(b + 35, new Date().getFullYear()) : d! - 30
    return { kind: 'exact', lo: y, mid: y, hi: y }
  }
  const [lo, hi] = ERA_WINDOW[sage.period]
  return { kind: 'undated', lo, mid: (lo + hi) / 2, hi }
}

/** Display name without the essay-title tail some labels carry
 *  ("הרב חיים דרוקמן – מנהיג ציונות דתית בדורנו" → "הרב חיים דרוקמן"). */
function shortLabel(label: string): string {
  let s = label.split(/\s+[–—-]\s+/)[0].trim()
  s = s.replace(/\s*\([^)]*\d[^)]*\)/g, '').trim()           // "(910–970)"
  if (s.length > 24) s = s.replace(/\s*\([^)]*\)\s*/g, ' ').trim() // long: drop the parenthetical
  return s.length > 26 ? s.slice(0, 25).trimEnd() + '…' : s
}

/* ── Text measurement ───────────────────────────────────────────────────── */

let measureCtx: CanvasRenderingContext2D | null = null
const widthCache = new Map<string, number>()

function textWidth(text: string, font: string): number {
  const key = font + '|' + text
  const hit = widthCache.get(key)
  if (hit != null) return hit
  if (!measureCtx && typeof document !== 'undefined') measureCtx = document.createElement('canvas').getContext('2d')
  let w = text.length * 6
  if (measureCtx) { measureCtx.font = font; w = measureCtx.measureText(text).width }
  widthCache.set(key, w)
  return w
}

/* ── Layout ─────────────────────────────────────────────────────────────── */

function buildModel(
  sages: Sage[], degree: Map<string, number>, width: number, height: number, locale: Locale,
): Model {
  const m = metricsFor(width)
  const basePlotW = Math.max(220, width - m.labelW - m.padL - m.padR)

  const dates = sages.map(dating)

  // Era-weighted axis: segment width ∝ max(sages whose date falls in it, floor)
  const segCount = new Array(ERAS.length).fill(0)
  dates.forEach(dt => {
    let i = 0
    while (i < ERAS.length - 1 && dt.mid >= SEG_BREAKS[i + 1]) i++
    segCount[i]++
  })
  const segWeight = segCount.map(c => Math.max(c, m.segFloor))
  const wSum = segWeight.reduce((a, b) => a + b, 0)
  const segX = [0]
  segWeight.forEach(w => segX.push(segX[segX.length - 1] + (w / wSum) * basePlotW))
  const scale = scaleLinear().domain(SEG_BREAKS).range(segX).clamp(true)
  const base = (year: number) => scale(year)

  // Bands: height weighted by sage count (softened), never below the floor
  const bandCount = ERAS.map(era => sages.filter(s => s.period === era).length)
  const bandsH = Math.max(height - m.headerH - m.bottomPad, ERAS.length * m.minBand)
  const bw = bandCount.map(c => Math.pow(c, m.bandPow))
  const bwSum = bw.reduce((a, b) => a + b, 0) || 1
  const spare = bandsH - ERAS.length * m.minBand
  const bands: BandModel[] = []
  let top = 0
  ERAS.forEach((era, i) => {
    const h = m.minBand + (spare * bw[i]) / bwSum
    bands.push({ era, top, h, dots: [] })
    top += h
  })

  const dots: DotModel[] = []
  const index = new Map<string, number>()
  sages.forEach((sage, i) => {
    const band = ERAS.indexOf(sage.period)
    if (band < 0) return
    const dt = dates[i]
    const years = formatYearRangeFor(locale, sage.birth_year, sage.death_year, sage.date_precision)
    const short = shortLabel(sage.label)
    index.set(sage.id, dots.length)
    bands[band].dots.push(dots.length)
    dots.push({
      sage, band, kind: dt.kind,
      bx: base(dt.mid), blo: base(dt.lo), bhi: base(dt.hi),
      degree: degree.get(sage.id) ?? 0,
      short,
      full: years ? `${short} · ${years}` : short,
    })
  })

  const byDegree = dots.map((_, i) => i).sort((a, b) =>
    dots[b].degree - dots[a].degree ||
    Number(!!dots[b].sage.has_research) - Number(!!dots[a].sage.has_research) || a - b)

  return { m, basePlotW, bandsH, segX, base, dots, bands, index, byDegree }
}

/**
 * Beeswarm one band at zoom `kb`. Dots are placed one by one at the free spot
 * nearest their ideal position: an exact date may only shift a dot a hair
 * sideways, while a century (or era-only) date lets it slide anywhere inside
 * its window — cheap sideways, costly vertically.
 */
function placeBand(model: Model, b: number, kb: number): BandPlacement {
  const { m } = model
  const band = model.bands[b]
  const n = band.dots.length
  const out: BandPlacement = { nudge: new Float64Array(n), t: new Float64Array(n).fill(0.5), y: new Float64Array(n), over: 0 }
  const D = 2 * m.r + m.gap
  const cy0 = band.top + band.h / 2
  const maxDy = Math.max(0, band.h / 2 - m.r - 1.5)
  const ySlots = [0]
  for (let s = D / 3; s <= maxDy + 1e-6; s += D / 3) ySlots.push(s, -s)

  const order = band.dots.map((_, j) => j).sort((p, q) => {
    const a = model.dots[band.dots[p]], c = model.dots[band.dots[q]]
    return (a.bhi - a.blo) - (c.bhi - c.blo) || a.bx - c.bx
  })

  const px: number[] = [], py: number[] = []
  const grid = new Map<string, number[]>()
  const cellKey = (x: number, y: number) => `${Math.floor(x / D)}:${Math.floor(y / D)}`
  const nearest = (x: number, y: number, stopBelow: number) => {
    let best = Infinity
    const gx = Math.floor(x / D), gy = Math.floor(y / D)
    for (let i = gx - 1; i <= gx + 1; i++) {
      for (let j = gy - 1; j <= gy + 1; j++) {
        const list = grid.get(`${i}:${j}`)
        if (!list) continue
        for (const q of list) {
          const d2 = (px[q] - x) ** 2 + (py[q] - y) ** 2
          if (d2 < best) { best = d2; if (best < stopBelow) return best }
        }
      }
    }
    return best
  }

  for (const j of order) {
    const d = model.dots[band.dots[j]]
    const xs: number[] = []
    const spill: number[] = [] // just past the allowed range, used only when it is full
    let wx: number
    if (d.kind === 'exact') {
      const x0 = kb * d.bx
      xs.push(x0)
      for (let s = D / 2; s <= 1.5 * D + 1e-6; s += D / 2) xs.push(x0 + s, x0 - s)
      for (let s = 2 * D; s <= 3 * D + 1e-6; s += D / 2) spill.push(x0 + s, x0 - s)
      wx = 3
    } else {
      const c = kb * d.bx
      const lo = kb * d.blo + m.r, hi = Math.max(lo, kb * d.bhi - m.r)
      xs.push(c)
      for (let s = D / 2; c + s <= hi || c - s >= lo; s += D / 2) {
        if (c + s <= hi) xs.push(c + s)
        if (c - s >= lo) xs.push(c - s)
      }
      for (let s = D / 2; s <= 2 * D + 1e-6; s += D / 2) spill.push(hi + s, lo - s)
      wx = d.kind === 'century' ? 0.2 : 0.12
    }

    const free = (x: number, y: number) => nearest(x, y, D * D - 1e-6) >= D * D - 1e-6
    let bx = xs[0], by = cy0, bestCost = Infinity
    for (const x of xs) {
      const cx = Math.abs(x - xs[0]) * wx
      if (cx >= bestCost) break
      for (const dy of ySlots) {
        const cost = cx + Math.abs(dy)
        if (cost >= bestCost) break
        if (free(x, cy0 + dy)) { bx = x; by = cy0 + dy; bestCost = cost; break }
      }
    }
    if (bestCost === Infinity) {
      // The range is full at this zoom. First let dots touch (no gap) inside
      // it; failing that, step just outside it rather than cover another dot.
      // Either way the band is re-packed at a deeper zoom, where it fits.
      out.over++
      const touch = (2 * m.r + 0.3) ** 2
      for (const x of xs) {
        for (const dy of ySlots) {
          if (nearest(x, cy0 + dy, touch) >= touch) { bx = x; by = cy0 + dy; bestCost = 0; break }
        }
        if (bestCost === 0) break
      }
    }
    if (bestCost === Infinity) {
      for (const x of spill) {
        for (const dy of ySlots) {
          if (free(x, cy0 + dy)) { bx = x; by = cy0 + dy; bestCost = 0; break }
        }
        if (bestCost === 0) break
      }
    }
    if (bestCost === Infinity) {
      // Still nothing: take the least-crowded spot rather than stacking
      let room = -1
      for (const x of [...xs, ...spill]) for (const dy of ySlots) {
        const d2 = nearest(x, cy0 + dy, -1)
        if (d2 > room) { room = d2; bx = x; by = cy0 + dy }
      }
    }

    const q = px.length
    px.push(bx); py.push(by)
    const key = cellKey(bx, by)
    const list = grid.get(key)
    if (list) list.push(q); else grid.set(key, [q])

    out.y[j] = by
    if (d.kind === 'exact') out.nudge[j] = bx - kb * d.bx
    else out.t[j] = d.bhi > d.blo ? (bx - kb * d.blo) / (kb * (d.bhi - d.blo)) : 0.5
  }
  return out
}

/* ── Labels ─────────────────────────────────────────────────────────────── */

interface Box { x: number; y: number; w: number; h: number }
interface LabelOut extends Box { i: number; text: string; strong: boolean }

function overlaps(a: Box, b: Box, pad = 2): boolean {
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad
}

/**
 * Greedy label placement: the selected sage first, then by degree. The top-N
 * are always attempted and may sit over a dot if nothing cleaner fits; the
 * rest need a spot clear of every dot and label. The budget grows with zoom.
 */
function placeLabels(
  model: Model, pos: Positions, k: number, canvasW: number, font: string,
  inFilter: Uint8Array | null, pinned: number[],
): LabelOut[] {
  const { m, dots } = model
  const h = m.font + 3
  const cell = 24
  const grid = new Map<string, number[]>()
  dots.forEach((_, i) => {
    const key = `${Math.floor(pos.xs[i] / cell)}:${Math.floor(pos.ys[i] / cell)}`
    const list = grid.get(key)
    if (list) list.push(i); else grid.set(key, [i])
  })
  const dotHits = (b: Box, self: number) => {
    let hits = 0
    const r = m.r + 1
    for (let gx = Math.floor((b.x - r) / cell); gx <= Math.floor((b.x + b.w + r) / cell); gx++) {
      for (let gy = Math.floor((b.y - r) / cell); gy <= Math.floor((b.y + b.h + r) / cell); gy++) {
        for (const j of grid.get(`${gx}:${gy}`) ?? []) {
          if (j === self) continue
          const cx = Math.max(b.x, Math.min(pos.xs[j], b.x + b.w))
          const cy = Math.max(b.y, Math.min(pos.ys[j], b.y + b.h))
          if ((cx - pos.xs[j]) ** 2 + (cy - pos.ys[j]) ** 2 < r * r) hits++
        }
      }
    }
    return hits
  }

  const placed: LabelOut[] = []
  const tryPlace = (i: number, text: string, relaxed: boolean, strong: boolean) => {
    const w = textWidth(text, font) + 2
    const x = pos.xs[i], y = pos.ys[i], r = m.r
    const band = model.bands[dots[i].band]
    const cands: [number, number][] = [
      [x + r + 3, y - h / 2], [x - r - 3 - w, y - h / 2],
      [x - w / 2, y - r - 2 - h], [x - w / 2, y + r + 2],
      [x + r, y - r - h + 1], [x - r - w, y - r - h + 1],
      [x + r, y + r - 1], [x - r - w, y + r - 1],
    ]
    let best: Box | null = null
    let bestHits = Infinity
    for (const [bx, by] of cands) {
      if (by < band.top + 1 || by + h > band.top + band.h - 1 || bx < 1 || bx + w > canvasW - 1) continue
      const box = { x: bx, y: by, w, h }
      if (placed.some(p => overlaps(p, box))) continue
      const hits = dotHits(box, i)
      if (hits === 0) { best = box; bestHits = 0; break }
      if (relaxed && hits < bestHits) { best = box; bestHits = hits }
    }
    if (!best) return false
    placed.push({ ...best, i, text, strong })
    return true
  }

  pinned.forEach(i => tryPlace(i, dots[i].full, true, true))
  const budget = m.alwaysLabel + Math.round(m.baseLabels * k)
  let n = 0
  for (const i of model.byDegree) {
    if (n >= budget) break
    if (pinned.includes(i) || (inFilter && !inFilter[i])) continue
    if (tryPlace(i, dots[i].short, n < m.alwaysLabel, false)) n++
  }
  return placed
}

/* ── Axis ticks ─────────────────────────────────────────────────────────── */

interface Tick { year: number; x: number; text: string }

function niceness(y: number): number {
  const i = [1000, 500, 100, 50, 10, 5].findIndex(s => y % s === 0)
  return i < 0 ? 9 : i
}

function buildTicks(model: Model, xOf: (y: number) => number, k: number, locale: Locale, font: string): Tick[] {
  const cands: Tick[] = []
  for (let i = 0; i < ERAS.length; i++) {
    const a = SEG_BREAKS[i], b = SEG_BREAKS[i + 1]
    const pxPerYear = (k * (model.segX[i + 1] - model.segX[i])) / (b - a)
    const step = NICE_STEPS.find(s => s * pxPerYear >= model.m.tickGap) ?? 1000
    for (let y = Math.ceil(a / step) * step; y < b; y += step) {
      if (y === 0) continue
      cands.push({ year: y, x: xOf(y), text: formatYear(y, locale) })
    }
  }
  // Roundest years claim their spot first; a tick that would crowd one is dropped
  cands.sort((p, q) => niceness(p.year) - niceness(q.year) || p.year - q.year)
  const taken: Box[] = []
  const out: Tick[] = []
  for (const t of cands) {
    const w = textWidth(t.text, font)
    const box = { x: t.x - w / 2, y: 0, w, h: 1 }
    if (taken.some(b => overlaps(b, box, 12))) continue
    taken.push(box)
    out.push(t)
  }
  return out.sort((p, q) => p.x - q.x)
}

/* ── Milestones in the header ───────────────────────────────────────────── */

interface MsOut { ms: Milestone; x: number; x2: number; row: number | null; text: string; w: number }

function milestoneYears(ms: Milestone, locale: Locale): string {
  const a = `${ms.circa ? '~' : ''}${formatYear(ms.year, locale)}`
  return ms.endYear != null ? `${a}–${formatYear(ms.endYear, locale)}` : a
}

function placeMilestones(xOf: (y: number) => number, canvasW: number, rows: number, locale: Locale, font: string): MsOut[] {
  // Links in the chain first, then the history around it
  const order = [...ALL_MILESTONES].sort((a, b) =>
    Number(a.kind !== 'transmission') - Number(b.kind !== 'transmission') || a.year - b.year)
  const taken: Box[][] = Array.from({ length: rows }, () => [])
  return order.map(ms => {
    const x = xOf(ms.year)
    const x2 = ms.endYear != null ? xOf(ms.endYear) : x
    const text = `${ms.label[locale]} · ${milestoneYears(ms, locale)}`
    const w = textWidth(text, font)
    const cx = (x + x2) / 2
    const box = { x: Math.max(2, Math.min(canvasW - w - 2, cx - w / 2)), y: 0, w, h: 1 }
    let row: number | null = null
    for (let r = rows - 1; r >= 0; r--) {
      const b = { ...box, y: r }
      if (!taken[r].some(t => overlaps(t, b, 8))) { taken[r].push(b); row = r; break }
    }
    return { ms, x, x2, row, text, w }
  })
}

/* ── Component ──────────────────────────────────────────────────────────── */

interface TimelineProps {
  locale: Locale
}

export function Timeline({ locale }: TimelineProps) {
  const rootRef   = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const plotRef   = useRef<SVGSVGElement>(null)

  const sages          = useAppStore(s => s.sages)
  const connections    = useAppStore(s => s.connections)
  const filteredSages  = useAppStore(s => s.filteredSages)
  const selectedSageId = useAppStore(s => s.selectedSageId)
  const selectSage     = useAppStore(s => s.selectSage)

  const [size, setSize] = useState({ w: 0, h: 0 })
  const [k, setK] = useState(1)
  const [fontFamily, setFontFamily] = useState('Heebo, sans-serif')
  const [hover, setHover] = useState<number | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [viewMid, setViewMid] = useState<number | null>(null) // base x at the centre of the view
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const [focusTick, setFocusTick] = useState(0)

  const kRef = useRef(1)
  const pendingScroll = useRef<{ left?: number; top?: number } | null>(null)
  const rafRef = useRef(0)
  const scrollRafRef = useRef(0)
  // A sage to centre once the chart exists: the tab can open for a selection
  // made elsewhere ("הצג בציר הזמן") before any layout has been computed.
  const pendingFocusRef = useRef<string | null>(selectedSageId)
  const selfSelectRef = useRef(false)

  // ── Size & fonts ─────────────────────────────────────────────
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => {
      // offsetHeight, not clientHeight: a horizontal scrollbar appearing on zoom
      // must not re-flow the bands (the bottom padding absorbs it).
      const w = el.clientWidth, h = el.offsetHeight
      setSize(s => (s.w === w && s.h === h ? s : { w, h }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    const read = () => {
      if (!alive || !rootRef.current) return
      widthCache.clear()
      setFontFamily(getComputedStyle(rootRef.current).fontFamily || 'Heebo, sans-serif')
    }
    read()
    document.fonts?.ready.then(read).catch(() => {})
    return () => { alive = false }
  }, [])

  // ── Model ────────────────────────────────────────────────────
  const degree = useMemo(() => {
    const deg = new Map<string, number>()
    connections.forEach(c => {
      deg.set(c.source, (deg.get(c.source) ?? 0) + 1)
      deg.set(c.target, (deg.get(c.target) ?? 0) + 1)
    })
    return deg
  }, [connections])

  const model = useMemo(
    () => (sages.length && size.w > 0 && size.h > 0 ? buildModel(sages, degree, size.w, size.h, locale) : null),
    [sages, degree, size.w, size.h, locale],
  )
  const modelRef = useRef<Model | null>(null)
  modelRef.current = model

  // Per-band layouts, cached per zoom bucket. A band is only re-packed at a
  // deeper bucket if it could not fit without overlap at the shallower one, so
  // bands that already fit never jump as you zoom.
  const bandCache = useMemo(() => new Map<string, BandPlacement>(), [model])
  const bandAt = useCallback((b: number, kb: number) => {
    const key = `${b}:${kb}`
    let p = bandCache.get(key)
    if (!p && model) { p = placeBand(model, b, kb); bandCache.set(key, p) }
    return p!
  }, [bandCache, model])

  const buckets = model
    ? model.bands.map((_, b) => {
        let kb = 1
        while (kb * Math.SQRT2 <= k + 1e-9 && kb < 16 && bandAt(b, kb).over > 0) kb *= Math.SQRT2
        return kb
      })
    : []
  const bucketsKey = buckets.join(',')

  // x of a base coordinate at the current zoom. Native scroll carries the
  // translation, so the transform is a pure scale — rescaleX keeps it semantic.
  const zx = useMemo(() => {
    const w = model?.basePlotW ?? 1
    return zoomIdentity.scale(k).rescaleX(scaleLinear().domain([0, w]).range([0, w]))
  }, [model, k])

  const m = model?.m ?? metricsFor(size.w || 1024)
  const canvasW = model ? m.padL + zx(model.basePlotW) + m.padR : 0
  const xOf = useCallback((year: number) => (model ? m.padL + zx(model.base(year)) : 0), [model, m.padL, zx])

  const pos = useMemo<Positions | null>(() => {
    if (!model) return null
    const xs = new Float64Array(model.dots.length)
    const ys = new Float64Array(model.dots.length)
    model.bands.forEach((band, b) => {
      const pl = bandAt(b, buckets[b])
      band.dots.forEach((di, j) => {
        const d = model.dots[di]
        xs[di] = d.kind === 'exact'
          ? m.padL + zx(d.bx) + pl.nudge[j]
          : m.padL + zx(d.blo + pl.t[j] * (d.bhi - d.blo))
        ys[di] = pl.y[j]
      })
    })
    return { xs, ys }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, bucketsKey, zx, bandAt, m.padL])

  const delaunay = useMemo(() => {
    if (!pos || !pos.xs.length) return null
    const pts: number[] = []
    for (let i = 0; i < pos.xs.length; i++) pts.push(pos.xs[i], pos.ys[i])
    return new Delaunay(Float64Array.from(pts))
  }, [pos])

  const inFilter = useMemo(() => {
    if (!model || filteredSages.length === sages.length) return null
    const ids = new Set(filteredSages.map(s => s.id))
    return Uint8Array.from(model.dots.map(d => (ids.has(d.sage.id) ? 1 : 0)))
  }, [model, filteredSages, sages.length])

  const selectedIdx = selectedSageId && model ? model.index.get(selectedSageId) ?? -1 : -1
  const focusIdx = focusId && model ? model.index.get(focusId) ?? -1 : -1

  const labelFont = `600 ${m.font}px ${fontFamily}`
  const labels = useMemo(() => {
    if (!model || !pos) return []
    const pinned = [selectedIdx, focusIdx].filter((i, n, a) => i >= 0 && a.indexOf(i) === n)
    return placeLabels(model, pos, k, canvasW, labelFont, inFilter, pinned)
  }, [model, pos, k, canvasW, labelFont, inFilter, selectedIdx, focusIdx])

  const tickFont = `500 ${m.compact ? 9 : 10}px ${fontFamily}`
  const ticks = useMemo(
    () => (model ? buildTicks(model, xOf, k, locale, tickFont) : []),
    [model, xOf, k, locale, tickFont],
  )

  const msFont = `600 ${m.compact ? 9 : 9.5}px ${fontFamily}`
  const milestones = useMemo(
    () => (model ? placeMilestones(xOf, canvasW, m.msRows, locale, msFont) : []),
    [model, xOf, canvasW, m.msRows, locale, msFont],
  )

  // ── Zoom & scroll ────────────────────────────────────────────
  const updateViewMid = useCallback(() => {
    const el = scrollRef.current, md = modelRef.current
    if (!el || !md) return
    const mid = (el.scrollLeft + (md.m.labelW + el.clientWidth) / 2 - md.m.labelW - md.m.padL) / kRef.current
    setViewMid(mid)
  }, [])

  const commit = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const el = scrollRef.current
      flushSync(() => setK(kRef.current))
      const p = pendingScroll.current
      pendingScroll.current = null
      if (el && p) {
        if (p.left != null) el.scrollLeft = p.left
        if (p.top != null) el.scrollTop = p.top
      }
      updateViewMid()
    })
  }, [updateViewMid])

  /** Zoom to `target`, keeping the year under screen-x `clientX` still. */
  const zoomTo = useCallback((target: number, clientX?: number) => {
    const el = scrollRef.current, md = modelRef.current
    if (!el || !md) return
    const { labelW, padL } = md.m
    const k0 = kRef.current
    const k1 = Math.max(1, Math.min(K_MAX, target))
    if (Math.abs(k1 - k0) < 1e-4) return
    const rect = el.getBoundingClientRect()
    const sx = Math.max(labelW, clientX != null ? clientX - rect.left : (labelW + el.clientWidth) / 2)
    const left0 = pendingScroll.current?.left ?? el.scrollLeft
    const b = (left0 + sx - labelW - padL) / k0
    kRef.current = k1
    pendingScroll.current = { ...pendingScroll.current, left: Math.max(0, labelW + padL + b * k1 - sx) }
    commit()
  }, [commit])

  /** Zoom so base range [b0, b1] fills the view, and bring band `band` into view. */
  const frame = useCallback((b0: number, b1: number, band?: number) => {
    const el = scrollRef.current, md = modelRef.current
    if (!el || !md) return
    const { labelW, padL, padR, headerH, bottomPad } = md.m
    const visW = el.clientWidth - labelW - padL - padR
    const k1 = Math.max(1, Math.min(K_MAX, visW / Math.max(1, (b1 - b0) * 1.1)))
    kRef.current = k1
    const next: { left: number; top?: number } = {
      left: Math.max(0, labelW + padL + k1 * ((b0 + b1) / 2) - (labelW + el.clientWidth) / 2),
    }
    if (band != null) {
      const bd = md.bands[band]
      const visH = el.clientHeight - headerH - bottomPad
      next.top = Math.max(0, bd.top + bd.h / 2 - visH / 2)
    }
    pendingScroll.current = next
    commit()
  }, [commit])

  const fitAll = useCallback(() => {
    kRef.current = 1
    pendingScroll.current = { left: 0, top: 0 }
    commit()
  }, [commit])

  const zoomToEra = useCallback((era: Period) => {
    const md = modelRef.current
    if (!md) return
    const i = ERAS.indexOf(era)
    frame(md.segX[i], md.segX[i + 1], i)
  }, [frame])

  // Ctrl/⌘ + wheel and trackpad pinch zoom; a plain wheel scrolls. A vertical
  // wheel over a chart that has nothing to scroll vertically pans in time.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
        zoomTo(kRef.current * Math.pow(2, Math.max(-1, Math.min(1, -dy * 0.005))), e.clientX)
        return
      }
      const canY = el.scrollHeight > el.clientHeight + 1
      const canX = el.scrollWidth > el.clientWidth + 1
      if (!canY && canX && !e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      }
    }

    // Two-finger pinch on touch screens. touch-action on the scroller leaves
    // one-finger panning to the browser and hands pinches to us.
    let pinch: { d0: number; k0: number; b: number } | null = null
    const span = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const midX = (t: TouchList) => (t[0].clientX + t[1].clientX) / 2
    const onTouchStart = (e: TouchEvent) => {
      const md = modelRef.current
      if (e.touches.length !== 2 || !md) return
      const sx = Math.max(md.m.labelW, midX(e.touches) - el.getBoundingClientRect().left)
      pinch = { d0: span(e.touches) || 1, k0: kRef.current, b: (el.scrollLeft + sx - md.m.labelW - md.m.padL) / kRef.current }
    }
    const onTouchMove = (e: TouchEvent) => {
      const md = modelRef.current
      if (!pinch || e.touches.length !== 2 || !md) return
      if (e.cancelable) e.preventDefault()
      const k1 = Math.max(1, Math.min(K_MAX, pinch.k0 * (span(e.touches) / pinch.d0)))
      const sx = Math.max(md.m.labelW, midX(e.touches) - el.getBoundingClientRect().left)
      kRef.current = k1
      pendingScroll.current = { left: Math.max(0, md.m.labelW + md.m.padL + pinch.b * k1 - sx) }
      commit()
    }
    const onTouchEnd = (e: TouchEvent) => { if (e.touches.length < 2) pinch = null }

    // Safari trackpad pinch arrives as gesture events rather than ctrl+wheel
    let g0 = 1
    const onGestureStart = (e: Event) => { e.preventDefault(); g0 = kRef.current }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const ge = e as Event & { scale: number; clientX: number }
      zoomTo(g0 * ge.scale, ge.clientX)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    el.addEventListener('gesturestart', onGestureStart)
    el.addEventListener('gesturechange', onGestureChange)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('gesturestart', onGestureStart)
      el.removeEventListener('gesturechange', onGestureChange)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [zoomTo, commit])

  const onScroll = () => {
    if (hover != null) setHover(null)
    if (scrollRafRef.current) return
    scrollRafRef.current = requestAnimationFrame(() => { scrollRafRef.current = 0; updateViewMid() })
  }

  // ── Locating a sage ──────────────────────────────────────────
  // A selection made elsewhere (drawer, search, URL) is centred and pulsed.
  // A click on a dot here is already under the pointer, so it only rings.
  useEffect(() => {
    if (!selectedSageId) return
    if (selfSelectRef.current) { selfSelectRef.current = false; return }
    pendingFocusRef.current = selectedSageId
    setFocusTick(t => t + 1) // re-run the consumer below even if nothing else changed
  }, [selectedSageId])

  useLayoutEffect(() => {
    const id = pendingFocusRef.current
    const el = scrollRef.current
    if (!id || !model || !pos || !el) return
    const idx = model.index.get(id)
    if (idx == null) { pendingFocusRef.current = null; return }
    const d = model.dots[idx]
    // Zoom until the sage's era spans most of the view, and far enough that
    // the dot is not pinned against either end of the axis (never zoom out)
    const s = ERAS.indexOf(d.sage.period)
    const visW = el.clientWidth - m.labelW
    const b = (pos.xs[idx] - m.padL) / kRef.current
    const target = Math.min(12, Math.max(
      Math.min(8, (visW * 0.8) / (model.segX[s + 1] - model.segX[s])),
      (visW / 2 - m.padL) / Math.max(1, b),
      (visW / 2 - m.padR) / Math.max(1, model.basePlotW - b),
      2,
    ))
    if (kRef.current < target - 1e-3) {
      kRef.current = target
      setK(target)
      return // this effect runs again once the zoomed layout is in place
    }
    const visH = el.clientHeight - m.headerH - m.bottomPad
    el.scrollLeft = Math.max(0, m.labelW + pos.xs[idx] - (m.labelW + el.clientWidth) / 2)
    el.scrollTop = Math.max(0, pos.ys[idx] - visH / 2)
    pendingFocusRef.current = null
    setFocusId(id)
    updateViewMid()
  }, [model, pos, focusTick, m.labelW, m.padL, m.padR, m.headerH, m.bottomPad, updateViewMid])

  // ── Pointer ──────────────────────────────────────────────────
  const hitTest = (clientX: number, clientY: number): number | null => {
    const svg = plotRef.current
    if (!svg || !delaunay || !pos) return null
    const r = svg.getBoundingClientRect()
    const x = clientX - r.left, y = clientY - r.top
    const i = delaunay.find(x, y)
    if (i < 0) return null
    return (pos.xs[i] - x) ** 2 + (pos.ys[i] - y) ** 2 <= m.hit * m.hit ? i : null
  }

  const onPlotMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    const i = hitTest(e.clientX, e.clientY)
    if (i !== hover) setHover(i)
  }

  const onPlotClick = (e: React.MouseEvent) => {
    const i = hitTest(e.clientX, e.clientY)
    if (i == null || !model) { setFocusId(null); return }
    selfSelectRef.current = model.dots[i].sage.id !== selectedSageId
    setFocusId(null)
    selectSage(model.dots[i].sage)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(kRef.current * 1.5) }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomTo(kRef.current / 1.5) }
    else if (e.key === '0') { e.preventDefault(); fitAll() }
  }

  // Escape dismisses the milestone card
  useEffect(() => {
    if (!activeMilestone) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveMilestone(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeMilestone])

  // ── Chips ────────────────────────────────────────────────────
  let activeEra: Period | 'all' | null = null
  if (model) {
    if (k < 1.05 || viewMid == null) activeEra = 'all'
    else {
      const next = model.segX.findIndex(x => x > viewMid)
      activeEra = ERAS[Math.max(0, Math.min(ERAS.length - 1, (next < 0 ? ERAS.length : next) - 1))]
    }
  }

  // ── Render ───────────────────────────────────────────────────
  const hoverDot = hover != null && model ? model.dots[hover] : null
  const ringIdx = [selectedIdx, focusIdx, hover ?? -1]
  const plotRect = plotRef.current?.getBoundingClientRect()
  const rootRect = rootRef.current?.getBoundingClientRect()

  return (
    <div ref={rootRef} className="tl-root relative w-full h-full flex flex-col overflow-hidden bg-ink-900" dir="ltr">
      <style>{TIMELINE_CSS}</style>

      {/* Toolbar: era chips (chronological, like the axis), legend, zoom */}
      <div className="relative z-10 flex items-center gap-2 h-11 flex-shrink-0 px-2 sm:px-3 border-b border-ink-800 bg-ink-900">
        <div
          className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="toolbar"
          aria-label={tr(locale, 'מעבר בין תקופות', 'Jump to era', 'Переход к эпохе')}
        >
          <Chip active={activeEra === 'all'} onClick={fitAll}>
            {tr(locale, 'הכל', 'All', 'Все')}
          </Chip>
          {ERAS.map(era => (
            <Chip key={era} active={activeEra === era} color={ERA_COLORS[era]} onClick={() => zoomToEra(era)}>
              {ERA_LABELS[era][locale]}
            </Chip>
          ))}
        </div>

        <Legend locale={locale} className="hidden xl:flex" />
        <div className="relative xl:hidden flex-shrink-0">
          <ToolBtn
            onClick={() => setLegendOpen(o => !o)}
            label={tr(locale, 'מקרא', 'Legend', 'Легенда')}
            pressed={legendOpen}
          >
            ⓘ
          </ToolBtn>
          {legendOpen && (
            <div className="absolute top-full end-0 mt-1.5 z-20 glass rounded-lg p-2.5 shadow-glass animate-fade-in">
              <Legend locale={locale} className="flex flex-col items-start gap-1.5" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <ToolBtn onClick={() => zoomTo(kRef.current / 1.6)} label={tr(locale, 'הקטן', 'Zoom out', 'Уменьшить')} disabled={k <= 1.001}>−</ToolBtn>
          <ToolBtn onClick={() => zoomTo(kRef.current * 1.6)} label={tr(locale, 'הגדל', 'Zoom in', 'Увеличить')} disabled={k >= K_MAX - 0.001}>+</ToolBtn>
          <ToolBtn onClick={fitAll} label={tr(locale, 'הצג את כל הציר', 'Fit whole timeline', 'Показать всю шкалу')} disabled={k <= 1.001}>⤢</ToolBtn>
        </div>
      </div>

      <div
        ref={scrollRef}
        dir="ltr"
        tabIndex={0}
        role="region"
        aria-label={tr(locale,
          'ציר הזמן של חכמי ישראל. Ctrl עם גלגלת או צביטה להגדלה.',
          'Timeline of the sages. Ctrl + wheel or pinch to zoom.',
          'Хронология мудрецов. Ctrl + колесо или щипок для масштаба.')}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="tl-scroll relative flex-1 min-h-0 overflow-auto outline-none"
        style={{ touchAction: 'pan-x pan-y', overscrollBehavior: 'contain' }}
      >
        {model && pos && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `${m.labelW}px ${canvasW}px`,
              // The last row is 16px short of the tab-bar clearance so a horizontal
              // scrollbar (appears when zoomed) never creates vertical overflow.
              gridTemplateRows: `${m.headerH}px ${model.bandsH}px ${m.bottomPad - 16}px`,
              width: m.labelW + canvasW,
            }}
          >
            {/* Corner */}
            <div
              className="flex items-end justify-end pe-2.5 pb-2 bg-ink-900 border-e border-b border-ink-800"
              style={{ position: 'sticky', top: 0, left: 0, zIndex: 4, gridRow: 1, gridColumn: 1 }}
            >
              <span className="text-[9px] font-sans text-ink-500 tracking-wide">
                {tr(locale, 'תקופה', 'Era', 'Эпоха')}
              </span>
            </div>

            {/* Sticky header: milestones + year axis */}
            <div style={{ position: 'sticky', top: 0, zIndex: 3, gridRow: 1, gridColumn: 2 }}>
              <AxisHeader
                model={model} m={m} canvasW={canvasW} ticks={ticks} milestones={milestones}
                xOf={xOf} locale={locale} onMilestone={setActiveMilestone}
              />
            </div>

            {/* Sticky era column */}
            <div style={{ position: 'sticky', left: 0, zIndex: 2, gridRow: 2, gridColumn: 1 }}>
              <EraColumn model={model} m={m} locale={locale} />
            </div>

            {/* Plot */}
            <div style={{ gridRow: 2, gridColumn: 2, position: 'relative' }}>
              <svg
                ref={plotRef}
                width={canvasW}
                height={model.bandsH}
                className={cn('block select-none', locale === 'he' && 'tl-rtl')}
                style={{ cursor: hover != null ? 'pointer' : 'default' }}
                onPointerMove={onPlotMove}
                onPointerLeave={() => setHover(null)}
                onClick={onPlotClick}
              >
                <PlotBackdrop model={model} m={m} canvasW={canvasW} xOf={xOf} />
                <DotsLayer model={model} pos={pos} inFilter={inFilter} />

                {/* Date window of the dot in focus: a century, or the whole era */}
                {ringIdx.filter((i, n, a) => i >= 0 && a.indexOf(i) === n).map(i => {
                  const d = model.dots[i]
                  if (d.kind === 'exact') return null
                  const x1 = m.padL + zx(d.blo), x2 = m.padL + zx(d.bhi), y = pos.ys[i]
                  return (
                    <g key={`win-${i}`} className="tl-window" style={{ '--c': ERA_COLORS[d.sage.period] } as CSSProperties} pointerEvents="none">
                      <line x1={x1} x2={x2} y1={y} y2={y} />
                      <line x1={x1} x2={x1} y1={y - 4} y2={y + 4} />
                      <line x1={x2} x2={x2} y1={y - 4} y2={y + 4} />
                    </g>
                  )
                })}

                <LabelsLayer labels={labels} fontSize={m.font} />

                <g pointerEvents="none">
                  {selectedIdx >= 0 && (
                    <circle className="tl-ring" cx={pos.xs[selectedIdx]} cy={pos.ys[selectedIdx]} r={m.r + 3.5} />
                  )}
                  {focusIdx >= 0 && (
                    <circle key={focusId ?? ''} className="tl-pulse" cx={pos.xs[focusIdx]} cy={pos.ys[focusIdx]} r={m.r + 3} />
                  )}
                  {hover != null && hover !== selectedIdx && (
                    <circle className="tl-hover" cx={pos.xs[hover]} cy={pos.ys[hover]} r={m.r + 2.5} />
                  )}
                </g>
              </svg>
            </div>
          </div>
        )}
      </div>

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {tr(locale, 'טוען ציר זמן...', 'Loading timeline...', 'Загрузка хронологии...')}
          </p>
        </div>
      )}

      {/* Hover card */}
      {hoverDot && pos && plotRect && rootRect && hover != null && (
        <HoverCard
          sage={hoverDot.sage}
          kind={hoverDot.kind}
          locale={locale}
          x={plotRect.left - rootRect.left + pos.xs[hover]}
          y={plotRect.top - rootRect.top + pos.ys[hover]}
          rootW={rootRect.width}
        />
      )}

      {/* Milestone impact summary card (Masterplan §8: click → summary) */}
      {activeMilestone && (
        <div
          dir={locale === 'he' ? 'rtl' : 'ltr'}
          className={cn(
            'fixed bottom-[120px] left-1/2 -translate-x-1/2 z-30 glass rounded-xl border px-4 py-3 shadow-glass-lg animate-fade-in',
            activeMilestone.kind === 'transmission' && 'border-gold-500/35',
          )}
          style={{
            width: 'min(440px, calc(100vw - 32px))',
            ...(activeMilestone.kind === 'history' ? { borderColor: 'rgba(201,107,96,0.4)' } : {}),
          }}
          role="dialog"
          aria-label={activeMilestone.label[locale]}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="font-serif text-sm font-bold"
                style={{ color: activeMilestone.kind === 'transmission' ? 'var(--tl-trans)' : 'var(--tl-hist)' }}
              >
                {activeMilestone.label[locale]}
                <span className="font-mono text-xs text-ink-400 font-normal">
                  {' · '}{milestoneYears(activeMilestone, locale)}
                </span>
              </p>
              <p className="text-[10px] font-sans text-ink-500 mt-0.5">
                {activeMilestone.kind === 'transmission'
                  ? tr(locale, 'חוליה בשלשלת המסורה', 'A link in the chain of transmission', 'Звено в цепи передачи')
                  : tr(locale, 'אירוע היסטורי', 'Historical event', 'Историческое событие')}
              </p>
            </div>
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
    </div>
  )
}

/* ── Layers (memoised: a hover or scroll must not repaint 450 dots) ──────── */

const DotsLayer = memo(function DotsLayer({ model, pos, inFilter }: {
  model: Model; pos: Positions; inFilter: Uint8Array | null
}) {
  const r = model.m.r
  return (
    <g>
      {model.dots.map((d, i) => (
        <circle
          key={d.sage.id}
          cx={pos.xs[i]}
          cy={pos.ys[i]}
          r={d.kind === 'exact' ? r : r - 0.5}
          className={cn('tl-dot', d.kind !== 'exact' && `tl-${d.kind}`, inFilter && !inFilter[i] && 'tl-dim')}
          style={{ '--c': ERA_COLORS[d.sage.period] } as CSSProperties}
        />
      ))}
    </g>
  )
})

const LabelsLayer = memo(function LabelsLayer({ labels, fontSize }: { labels: LabelOut[]; fontSize: number }) {
  return (
    <g pointerEvents="none">
      {labels.map(l => (
        <text
          key={l.i}
          x={l.x + l.w / 2}
          y={l.y + l.h / 2 + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          className={cn('tl-label', l.strong && 'tl-label-strong')}
          style={{ fontSize }}
        >
          {l.text}
        </text>
      ))}
    </g>
  )
})

const PlotBackdrop = memo(function PlotBackdrop({ model, m, canvasW, xOf }: {
  model: Model; m: Metrics; canvasW: number; xOf: (y: number) => number
}) {
  const H = model.bandsH
  return (
    <g pointerEvents="none">
      {model.bands.map((b, i) => {
        const [s, e] = ERA_WINDOW[b.era]
        return (
          <g key={b.era}>
            <rect x={0} y={b.top} width={canvasW} height={b.h} className={i % 2 ? 'tl-band-b' : 'tl-band-a'} />
            {/* The era's own stretch of its band */}
            <rect
              x={xOf(s)} y={b.top + 2} width={Math.max(0, xOf(e) - xOf(s))} height={b.h - 4} rx={4}
              className="tl-tint" style={{ '--c': ERA_COLORS[b.era] } as CSSProperties}
            />
            <line x1={0} x2={canvasW} y1={b.top + b.h} y2={b.top + b.h} className="tl-sep" />
          </g>
        )
      })}

      {/* Scale breaks: the axis changes pace at every era boundary */}
      {SEG_BREAKS.slice(1, -1).map(y => (
        <line key={`brk-${y}`} x1={xOf(y)} x2={xOf(y)} y1={0} y2={H} className="tl-break" />
      ))}

      {/* Milestones: thin, behind the dots */}
      {ALL_MILESTONES.map(ms => {
        const x = xOf(ms.year)
        const cls = ms.kind === 'transmission' ? 'tl-ms-trans' : 'tl-ms-hist'
        if (ms.endYear != null) {
          const x2 = xOf(ms.endYear)
          return (
            <g key={`ms-${ms.year}`}>
              <rect x={x} y={0} width={Math.max(1, x2 - x)} height={H} className={`${cls}-span`} />
              <line x1={x} x2={x} y1={0} y2={H} className={cls} />
              <line x1={x2} x2={x2} y1={0} y2={H} className={cls} />
            </g>
          )
        }
        return <line key={`ms-${ms.year}`} x1={x} x2={x} y1={0} y2={H} className={cls} />
      })}
    </g>
  )
})

const AxisHeader = memo(function AxisHeader({ model, m, canvasW, ticks, milestones, xOf, locale, onMilestone }: {
  model: Model; m: Metrics; canvasW: number; ticks: Tick[]; milestones: MsOut[]
  xOf: (y: number) => number; locale: Locale; onMilestone: (ms: Milestone) => void
}) {
  const H = m.headerH
  const ribbonY = H - 4
  const tickY = H - 8
  const tickTextY = m.compact ? H - 12 : H - 14
  const markerY = m.compact ? 15 : 31
  const rowY = (r: number) => (m.compact ? 10 : 11 + r * 13)
  return (
    <svg width={canvasW} height={H} className={cn('block', locale === 'he' && 'tl-rtl')}>
      <rect x={0} y={0} width={canvasW} height={H} className="tl-bg" />

      {/* Era ribbon, broken at each boundary — the scale changes there */}
      {ERAS.map((era, i) => {
        const x1 = xOf(SEG_BREAKS[i]), x2 = xOf(SEG_BREAKS[i + 1])
        return (
          <rect key={era} x={x1 + 1} y={ribbonY} width={Math.max(0, x2 - x1 - 2)} height={4} rx={1}
            className="tl-ribbon" style={{ '--c': ERA_COLORS[era] } as CSSProperties}>
            <title>{ERA_LABELS[era][locale]}</title>
          </rect>
        )
      })}
      {SEG_BREAKS.slice(1, -1).map(y => {
        const x = xOf(y)
        return <path key={`b-${y}`} d={`M${x - 3.5},${ribbonY + 5} L${x - 0.5},${ribbonY - 3} M${x + 0.5},${ribbonY + 5} L${x + 3.5},${ribbonY - 3}`} className="tl-break-mark" />
      })}

      {ticks.map(t => (
        <g key={t.year}>
          <line x1={t.x} x2={t.x} y1={tickY} y2={ribbonY} className="tl-axis" />
          <text x={t.x} y={tickTextY} textAnchor="middle" className="tl-tick" style={{ fontSize: m.compact ? 9 : 10 }}>
            {t.text}
          </text>
        </g>
      ))}

      {milestones.map(({ ms, x, x2, row, text, w }) => {
        const trans = ms.kind === 'transmission'
        const cx = (x + x2) / 2
        const lx = Math.max(2, Math.min(canvasW - w - 2, cx - w / 2))
        return (
          <g
            key={`${ms.year}-${ms.kind}`}
            className="tl-ms-hit"
            role="button"
            tabIndex={-1}
            onClick={() => onMilestone(ms)}
          >
            <title>{text}</title>
            {x2 > x + 1 && <rect x={x} y={markerY + 1} width={x2 - x} height={3} className={trans ? 'tl-ms-fill-trans' : 'tl-ms-fill-hist'} />}
            <path d={`M${cx - 4},${markerY} L${cx + 4},${markerY} L${cx},${markerY + 6} Z`} className={trans ? 'tl-ms-fill-trans' : 'tl-ms-fill-hist'} />
            {row != null && (
              <text x={lx + w / 2} y={rowY(row)} textAnchor="middle" className={trans ? 'tl-ms-text-trans' : 'tl-ms-text-hist'}
                style={{ fontSize: m.compact ? 9 : 9.5 }}>
                {text}
              </text>
            )}
            {/* Invisible hit areas: the marker, and the label when shown */}
            <rect x={cx - 8} y={markerY - 3} width={16} height={12} fill="transparent" />
            {row != null && <rect x={lx} y={rowY(row) - 10} width={w} height={13} fill="transparent" />}
          </g>
        )
      })}
      <line x1={0} x2={canvasW} y1={H - 0.5} y2={H - 0.5} className="tl-sep" />
    </svg>
  )
})

const EraColumn = memo(function EraColumn({ model, m, locale }: { model: Model; m: Metrics; locale: Locale }) {
  // Right-aligned against the plot: in RTL the text's start is its right edge
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const anchor = locale === 'he' ? 'start' : 'end'
  return (
    <svg width={m.labelW} height={model.bandsH} className="block">
      <rect x={0} y={0} width={m.labelW} height={model.bandsH} className="tl-bg" />
      {model.bands.map((b, i) => {
        const color = ERA_COLORS[b.era]
        const showCount = b.h >= (m.compact ? 30 : 34)
        // Tall bands carry their label near the top, clear of the floating
        // chat / search buttons that sit over the bottom corners
        const cy = b.top + Math.min(b.h / 2, 32)
        return (
          <g key={b.era} style={{ '--c': color } as CSSProperties}>
            <rect x={0} y={b.top} width={m.labelW} height={b.h} className={i % 2 ? 'tl-band-b' : 'tl-band-a'} />
            <rect x={m.labelW - 3} y={b.top + 2} width={3} height={Math.max(0, b.h - 4)} rx={1.5} className="tl-ribbon" />
            <text
              x={m.labelW - 9} y={showCount ? cy - 6 : cy + 0.5} textAnchor={anchor} dominantBaseline="central"
              className="tl-era-name" style={{ fontSize: m.compact ? 10 : 11.5, direction: dir }}
            >
              {ERA_LABELS[b.era][locale]}
            </text>
            {showCount && (
              <text x={m.labelW - 9} y={cy + 8} textAnchor={anchor} dominantBaseline="central" className="tl-era-count"
                style={{ fontSize: m.compact ? 8.5 : 9.5, direction: dir }}>
                {tr(locale, `${b.dots.length} חכמים`, `${b.dots.length} sages`, `${b.dots.length} мудр.`)}
              </text>
            )}
            <line x1={0} x2={m.labelW} y1={b.top + b.h} y2={b.top + b.h} className="tl-sep" />
          </g>
        )
      })}
      <line x1={m.labelW - 0.5} x2={m.labelW - 0.5} y1={0} y2={model.bandsH} className="tl-sep" />
    </svg>
  )
})

/* ── Small pieces ───────────────────────────────────────────────────────── */

function HoverCard({ sage, kind, locale, x, y, rootW }: {
  sage: Sage; kind: DateKind; locale: Locale; x: number; y: number; rootW: number
}) {
  const years = formatYearRangeFor(locale, sage.birth_year, sage.death_year, sage.date_precision)
  const note = kind === 'undated'
    ? tr(locale, 'ללא תאריך ידוע · ממוקם בטווח התקופה', 'No known date · placed within its era', 'Дата неизвестна · в пределах эпохи')
    : kind === 'century'
      ? tr(locale, 'מאה משוערת · ממוקם בטווח המאה', 'Century only · placed within it', 'Известен лишь век · в его пределах')
      : null
  const W = 240
  const left = Math.max(8, Math.min(rootW - W - 8, x - W / 2))
  const above = y > 96
  return (
    <div
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      className="absolute z-20 pointer-events-none glass rounded-lg px-3 py-2 shadow-glass"
      style={{ left, width: W, ...(above ? { top: y - 12, transform: 'translateY(-100%)' } : { top: y + 14 }) }}
    >
      <p className="font-serif text-[13px] font-bold text-ink-100 leading-snug">{sage.label}</p>
      <p className="font-sans text-[11px] text-ink-300 mt-0.5 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: ERA_COLORS[sage.period] }} />
        <span>{ERA_LABELS[sage.period][locale]}</span>
        {years && <><span className="text-ink-600">·</span><span>{years}</span></>}
      </p>
      {note && <p className="font-sans text-[10px] text-ink-500 mt-0.5">{note}</p>}
    </div>
  )
}

function Legend({ locale, className }: { locale: Locale; className?: string }) {
  const item = (icon: ReactNode, text: string) => (
    <span className="flex items-center gap-1.5 whitespace-nowrap">{icon}<span>{text}</span></span>
  )
  const dot = (cls: string) => (
    <svg width="12" height="12" aria-hidden className="flex-shrink-0">
      <circle cx="6" cy="6" r={cls === 'tl-dot' ? 4.5 : 4} className={cls} style={{ '--c': '#27ae60' } as CSSProperties} />
    </svg>
  )
  const line = (cls: string) => (
    <svg width="14" height="12" aria-hidden className="flex-shrink-0">
      <line x1="7" x2="7" y1="0" y2="12" className={cls} style={{ strokeWidth: 2, opacity: 1 }} />
    </svg>
  )
  return (
    <div dir={locale === 'he' ? 'rtl' : 'ltr'} className={cn('items-center gap-3 text-[10px] font-sans text-ink-400 flex-shrink-0', className)}>
      {item(dot('tl-dot'), tr(locale, 'תאריך ידוע', 'Known dates', 'Известные даты'))}
      {item(dot('tl-dot tl-century'), tr(locale, 'מאה בלבד', 'Century only', 'Лишь век'))}
      {item(dot('tl-dot tl-undated'), tr(locale, 'ללא תאריך', 'Undated', 'Без даты'))}
      {item(line('tl-ms-trans'), tr(locale, 'שלשלת המסורה', 'Transmission', 'Передача'))}
      {item(line('tl-ms-hist'), tr(locale, 'היסטוריה', 'History', 'История'))}
    </div>
  )
}

function Chip({ active, color, onClick, children }: {
  active: boolean; color?: string; onClick: () => void; children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[11px] font-sans whitespace-nowrap flex-shrink-0',
        'border transition-colors',
        active
          ? 'bg-gold-500/15 border-gold-500/50 text-gold-300'
          : 'border-ink-700 text-ink-300 hover:text-ink-100 hover:border-ink-600',
      )}
    >
      {color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} aria-hidden />}
      {children}
    </button>
  )
}

function ToolBtn({ onClick, label, disabled, pressed, children }: {
  onClick: () => void; label: string; disabled?: boolean; pressed?: boolean; children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'w-9 h-9 rounded-lg text-sm font-mono flex items-center justify-center',
        'border border-ink-700 text-ink-300 hover:text-gold-300 hover:border-gold-500/40',
        'disabled:opacity-35 disabled:pointer-events-none transition-colors',
        pressed && 'text-gold-300 border-gold-500/40',
      )}
    >
      {children}
    </button>
  )
}

/* Theme-aware colours: everything reads CSS variables, so the light theme
   needs no re-render. Era colours are darkened a notch on the light ground. */
const TIMELINE_CSS = `
.tl-root { --tl-dark: 0%; --tl-hist: #c96b60; --tl-trans: var(--gold-400); font-family: var(--font-heebo), Heebo, sans-serif; }
[data-theme='light'] .tl-root { --tl-dark: 24%; --tl-hist: #a2463c; }
.tl-root .tl-bg { fill: rgb(var(--ink-900-rgb)); }
.tl-root .tl-band-a { fill: rgb(var(--ink-800-rgb) / .38); }
.tl-root .tl-band-b { fill: transparent; }
.tl-root .tl-sep { stroke: rgb(var(--ink-600-rgb) / .35); stroke-width: 1px; }
.tl-root .tl-break { stroke: rgb(var(--ink-500-rgb) / .22); stroke-width: 1px; stroke-dasharray: 2 5; }
.tl-root .tl-break-mark { stroke: rgb(var(--ink-400-rgb)); stroke-width: 1.2px; fill: none; }
.tl-root .tl-tint { fill: var(--c); fill-opacity: .07; }
.tl-root .tl-ribbon { fill: var(--c); opacity: .75; }
.tl-root .tl-axis { stroke: rgb(var(--ink-500-rgb) / .7); stroke-width: 1px; }
.tl-root .tl-tick { fill: var(--ink-400); font-weight: 500; }
.tl-root .tl-dot { fill: var(--c); stroke: rgb(var(--ink-900-rgb)); stroke-width: 1px; }
.tl-root .tl-dot.tl-century, .tl-root .tl-dot.tl-undated { fill: rgb(var(--ink-900-rgb)); stroke: var(--c); stroke-width: 1.6px; }
.tl-root .tl-dot.tl-undated { stroke-dasharray: 2.2 1.6; }
.tl-root .tl-dim { opacity: .12; }
.tl-root .tl-window line { stroke: var(--c); stroke-width: 2px; opacity: .6; }
.tl-root .tl-label { fill: var(--ink-200); stroke: rgb(var(--ink-900-rgb)); stroke-width: 3px; paint-order: stroke; stroke-linejoin: round; font-weight: 600; }
.tl-root .tl-label-strong { fill: var(--gold-300); font-weight: 700; }
.tl-root .tl-era-name { fill: var(--c); font-weight: 700; }
.tl-root .tl-era-count { fill: var(--ink-500); }
.tl-root .tl-ms-trans { stroke: var(--tl-trans); stroke-width: 1px; opacity: .6; }
.tl-root .tl-ms-hist { stroke: var(--tl-hist); stroke-width: 1px; opacity: .5; stroke-dasharray: 4 3; }
.tl-root .tl-ms-trans-span { fill: var(--tl-trans); opacity: .07; }
.tl-root .tl-ms-hist-span { fill: var(--tl-hist); opacity: .08; }
.tl-root .tl-ms-fill-trans { fill: var(--tl-trans); }
.tl-root .tl-ms-fill-hist { fill: var(--tl-hist); }
.tl-root .tl-ms-text-trans { fill: var(--tl-trans); font-weight: 700; }
.tl-root .tl-ms-text-hist { fill: var(--tl-hist); font-weight: 700; }
.tl-root .tl-ms-hit { cursor: pointer; }
.tl-root .tl-ms-hit:hover text { text-decoration: underline; }
.tl-root .tl-rtl text { direction: rtl; }
.tl-root .tl-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
.tl-root .tl-ring { fill: none; stroke: var(--gold-400); stroke-width: 2px; }
.tl-root .tl-hover { fill: none; stroke: var(--ink-100); stroke-width: 1.5px; opacity: .8; }
@keyframes tl-pulse { from { transform: scale(1); opacity: .95; } to { transform: scale(2.8); opacity: 0; } }
.tl-root .tl-pulse { fill: none; stroke: var(--gold-400); stroke-width: 2.5px; transform-box: fill-box; transform-origin: center; animation: tl-pulse 1.5s ease-out infinite; }
@supports (color: color-mix(in srgb, red, blue)) {
  .tl-root .tl-dot { fill: color-mix(in srgb, var(--c), #000 var(--tl-dark)); }
  .tl-root .tl-dot.tl-century, .tl-root .tl-dot.tl-undated { fill: rgb(var(--ink-900-rgb)); stroke: color-mix(in srgb, var(--c), #000 var(--tl-dark)); }
  .tl-root .tl-era-name { fill: color-mix(in srgb, var(--c), #000 var(--tl-dark)); }
  .tl-root .tl-window line { stroke: color-mix(in srgb, var(--c), #000 var(--tl-dark)); }
}
`
