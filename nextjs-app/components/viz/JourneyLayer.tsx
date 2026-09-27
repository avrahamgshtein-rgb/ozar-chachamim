'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LeafletMouseEvent } from 'leaflet'
import { ERA_COLORS } from '@/lib/types'
import type { Locale, Period } from '@/lib/types'
import {
  JOURNEY_END, JOURNEY_START, framingBounds, snapshotAt,
  type JourneyFlow, type JourneyModel, type JourneySnapshot, type LatLng,
} from '@/lib/journey'
import { useJourneyStore } from '@/lib/journeyStore'
import { placeName } from '@/lib/journeyPlaces'
import { displayName } from '@/lib/displayName'
import { useAppStore } from '@/store/useAppStore'
import { tr } from '@/lib/i18n'

/*
 * The מסע התורה overlay: one <canvas> over the Leaflet map, redrawn every
 * animation frame from lib/journey.ts. A few dozen centres and arcs per frame
 * are cheap on canvas, where hundreds of Leaflet markers re-laid out per frame
 * are not. The canvas ignores the pointer; clicks and hovers arrive through
 * the map's own events and are hit-tested against the last drawn frame.
 *
 * Playback also runs here, so the year, the drawing and the camera share one
 * clock. The pace adapts to the data: sparse centuries pass quickly, crowded
 * ones slowly, so the eye gets time where there is something to read.
 */

/** Seconds between steps when motion is reduced (the slider moves in steps). */
const REDUCED_STEP_SECONDS = 1.4
export const REDUCED_STEP_YEARS = 25
/** How often the camera reconsiders its framing during playback. */
const FOLLOW_EVERY_MS = 1600
/** A paused year must hold this long before the camera follows it. */
const FOLLOW_SETTLE_MS = 350
/** Snapshots reach the React panels at most this often during playback. */
const PANEL_EVERY_MS = 220

/** Years per second at 1×: fast through empty centuries, slow through busy ones. */
function pace(active: number): number {
  return 16 + 44 / (1 + active / 3)
}

type RGB = [number, number, number]

function hexRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function mix(c: RGB, d: RGB, t: number): RGB {
  return [c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t, c[2] + (d[2] - c[2]) * t]
}
function rgba(c: RGB, a: number): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}
/** Stable 0…1 per key, so pulses and comets do not march in step. */
function phaseOf(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

interface Palette {
  dark: boolean
  era: (p: Period) => RGB
  migration: RGB
  teaching: RGB
  label: string
  halo: string
  focus: RGB
}

function paletteFor(theme: 'dark' | 'light'): Palette {
  const dark = theme === 'dark'
  const cache = new Map<Period, RGB>()
  return {
    dark,
    // Era colours as the rest of the app uses them, lifted on the dark map so
    // the slate of the Kings or the brown of the Patriarchs still glows.
    era: p => {
      let c = cache.get(p)
      if (!c) {
        const base = hexRgb(ERA_COLORS[p] ?? '#c9973a')
        c = dark ? mix(base, [255, 255, 255], 0.3) : mix(base, [0, 0, 0], 0.12)
        cache.set(p, c)
      }
      return c
    },
    migration: dark ? [232, 184, 75] : [138, 98, 20],
    teaching: dark ? [140, 180, 255] : [37, 99, 235],
    label: dark ? '#f5eed8' : '#241b10',
    halo: dark ? 'rgba(10,8,6,0.88)' : 'rgba(250,247,240,0.92)',
    focus: dark ? [255, 236, 190] : [109, 79, 18],
  }
}

interface ShownCentre {
  key: string
  pos: LatLng
  period: Period
  count: number
  weight: number
  approxOnly: boolean
  r: number        // displayed radius, eased toward the target
  alpha: number    // eased 0…1
  labelAlpha: number
  target: number   // target radius (0 once the centre is gone)
  // screen position of the last frame, for hit-testing
  x: number
  y: number
}

interface ShownFlow { flow: JourneyFlow; alpha: number; target: number }

export interface JourneyFramePadding {
  topLeft: [number, number]
  bottomRight: [number, number]
}

interface JourneyLayerProps {
  L: typeof import('leaflet')
  map: LeafletMap
  model: JourneyModel
  locale: Locale
  theme: 'dark' | 'light'
  reducedMotion: boolean
  compact: boolean
  /** The map tab is showing: the loop sleeps otherwise. */
  visible: boolean
  padding: JourneyFramePadding
}

export function JourneyLayer({ L, map, model, locale, theme, reducedMotion, compact, visible, padding }: JourneyLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; key: string } | null>(null)

  // Everything the frame loop reads, refreshed on each render without
  // restarting the loop.
  const live = useRef({ model, locale, theme, reducedMotion, compact, padding })
  live.current = { model, locale, theme, reducedMotion, compact, padding }

  const centresRef = useRef(new Map<string, ShownCentre>())
  const flowsRef = useRef(new Map<string, ShownFlow>())
  const snapRef = useRef<JourneySnapshot | null>(null)
  const dirtyRef = useRef(true)

  // A new model (filters changed) resets the eased state rather than morphing
  // between two unrelated datasets.
  useEffect(() => {
    snapRef.current = null
    dirtyRef.current = true
  }, [model])

  useEffect(() => { dirtyRef.current = true }, [theme, locale, compact])

  /* ── Camera ───────────────────────────────────────────────────────── */
  const programmaticRef = useRef(false)
  useEffect(() => {
    const onUserMove = () => {
      if (!programmaticRef.current && useJourneyStore.getState().follow) useJourneyStore.getState().setFollow(false)
    }
    const onMoveEnd = () => { programmaticRef.current = false }
    const container = map.getContainer()
    // dragstart is always the user; a zoom by wheel, pinch or the +/- buttons
    // is the user unless we started a camera move ourselves.
    map.on('dragstart', onUserMove)
    map.on('zoomstart', onUserMove)
    map.on('moveend', onMoveEnd)
    const markDirty = () => { dirtyRef.current = true }
    map.on('move zoom resize', markDirty)
    return () => {
      map.off('dragstart', onUserMove)
      map.off('zoomstart', onUserMove)
      map.off('moveend', onMoveEnd)
      map.off('move zoom resize', markDirty)
      container.style.cursor = ''
    }
  }, [map])

  /** Move the camera toward the action around `year`, gently. */
  const frameTo = (year: number, animate: boolean) => {
    const { model: m, padding: pad } = live.current
    const b = framingBounds(m, year)
    const size = map.getSize()
    if (!b || size.x < 50 || size.y < 50) return
    // Never let the overlays' padding eat more than 60% of the map.
    const fit = (v: number, total: number, room: number) => (total > room ? (v * room) / total : v)
    const px = pad.topLeft[0] + pad.bottomRight[0]
    const py = pad.topLeft[1] + pad.bottomRight[1]
    const tl = L.point(fit(pad.topLeft[0], px, size.x * 0.6), fit(pad.topLeft[1], py, size.y * 0.6))
    const br = L.point(fit(pad.bottomRight[0], px, size.x * 0.6), fit(pad.bottomRight[1], py, size.y * 0.6))
    // Leaflet's own fitBounds arithmetic (getBoundsZoom, then the centre of
    // the padded box), done here so the move can be a gentle pan or a fly.
    const bounds = L.latLngBounds(b[0], b[1])
    const zoom = Math.max(2, Math.min(6, map.getBoundsZoom(bounds, false, tl.add(br))))
    const swP = map.project(bounds.getSouthWest(), zoom)
    const neP = map.project(bounds.getNorthEast(), zoom)
    const centre = map.unproject(swP.add(neP).divideBy(2).add(br.subtract(tl).divideBy(2)), zoom)

    const cur = map.getCenter()
    const curZoom = map.getZoom()
    const shift = map.project(centre, curZoom).distanceTo(map.project(cur, curZoom))
    const zoomChange = Math.abs(zoom - curZoom)
    if (zoomChange < 1 && shift < Math.min(size.x, size.y) * 0.12) return
    programmaticRef.current = true
    if (!animate) map.setView(centre, zoom, { animate: false })
    else if (zoomChange >= 1) map.flyTo(centre, zoom, { duration: 2.2, easeLinearity: 0.2 })
    else map.panTo(centre, { animate: true, duration: 1.6, easeLinearity: 0.2 })
    // A move too small for Leaflet to animate ends without a moveend.
    window.setTimeout(() => { programmaticRef.current = false }, 2600)
  }

  /* ── Pointer: hover and click on centres ─────────────────────────── */
  useEffect(() => {
    const hitAt = (x: number, y: number): ShownCentre | null => {
      let best: ShownCentre | null = null
      let bestD = Infinity
      centresRef.current.forEach(c => {
        if (c.target <= 0 || c.alpha < 0.3) return
        const d = Math.hypot(c.x - x, c.y - y)
        const reach = Math.max(14, c.r * 0.9)
        if (d <= reach && d < bestD) { best = c; bestD = d }
      })
      return best
    }
    const onMove = (e: LeafletMouseEvent) => {
      const hit = hitAt(e.containerPoint.x, e.containerPoint.y)
      map.getContainer().style.cursor = hit ? 'pointer' : ''
      setHover(prev => {
        if (!hit) return prev ? null : prev
        if (prev && prev.key === hit.key && Math.abs(prev.x - hit.x) < 1 && Math.abs(prev.y - hit.y) < 1) return prev
        return { x: hit.x, y: hit.y, key: hit.key }
      })
    }
    const onOut = () => { setHover(null); map.getContainer().style.cursor = '' }
    const onClick = (e: LeafletMouseEvent) => {
      const hit = hitAt(e.containerPoint.x, e.containerPoint.y)
      const st = useJourneyStore.getState()
      if (hit) st.setFocus(st.focus === hit.key ? null : hit.key)
      dirtyRef.current = true
    }
    map.on('mousemove', onMove)
    map.on('mouseout', onOut)
    map.on('click', onClick)
    return () => {
      map.off('mousemove', onMove)
      map.off('mouseout', onOut)
      map.off('click', onClick)
    }
  }, [map])

  /* ── The frame loop ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!visible) {
      // Leaving the tab pauses playback: nobody is watching it.
      if (useJourneyStore.getState().playing) useJourneyStore.getState().setPlaying(false)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let stepClock = 0
    let smoothActive = 0
    let lastFollow = 0
    let lastPanelPush = 0
    let lastSig = ''
    let settledYear = NaN
    let yearChangedAt = 0
    let lastYear = NaN
    let firstFrame = true
    let cssW = 0, cssH = 0, dpr = 1

    const resize = () => {
      const el = canvas.parentElement
      if (!el) return
      cssW = el.clientWidth
      cssH = el.clientHeight
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(cssW * dpr))
      canvas.height = Math.max(1, Math.round(cssH * dpr))
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      dirtyRef.current = true
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const unsub = useJourneyStore.subscribe((s, prev) => {
      if (s.year !== prev.year || s.focus !== prev.focus) dirtyRef.current = true
    })
    const unsubApp = useAppStore.subscribe((s, prev) => {
      if (s.selectedSageId !== prev.selectedSageId) dirtyRef.current = true
    })

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) { last = now; return }
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const { model: m, reducedMotion: reduced, compact: small, locale: loc, theme: th } = live.current
      const st = useJourneyStore.getState()

      // Advance the clock.
      let year = st.year
      if (st.playing) {
        if (year >= JOURNEY_END) year = JOURNEY_START
        if (reduced) {
          stepClock += dt
          if (stepClock >= REDUCED_STEP_SECONDS) {
            stepClock = 0
            year = Math.min(JOURNEY_END, Math.floor(year / REDUCED_STEP_YEARS) * REDUCED_STEP_YEARS + REDUCED_STEP_YEARS)
          }
        } else {
          const active = snapRef.current?.active.length ?? 0
          smoothActive += (active - smoothActive) * Math.min(1, dt * 2)
          year = Math.min(JOURNEY_END, year + dt * pace(smoothActive) * st.speed)
        }
        if (year !== st.year) st.setYear(year)
        if (year >= JOURNEY_END) st.setPlaying(false)
      }

      // Read the model at this year.
      if (!snapRef.current || snapRef.current.year !== year) {
        snapRef.current = snapshotAt(m, year)
        dirtyRef.current = true
      }
      const snap = snapRef.current

      // Hand the snapshot to the panels when the cast changes.
      const sig = snap.active.map(f => f.sage.id).join(',') + '|' +
        snap.centres.slice(0, 6).map(c => `${c.key}${Math.sign(Math.round(c.trend * 2))}`).join(',')
      if (sig !== lastSig && (!st.playing || now - lastPanelPush > PANEL_EVERY_MS)) {
        lastSig = sig
        lastPanelPush = now
        st.setSnapshot(snap)
      }

      // Camera.
      if (Math.round(year) !== lastYear) { lastYear = Math.round(year); yearChangedAt = now }
      if (!reduced && st.follow) {
        if (firstFrame) {
          frameTo(year, false)
          settledYear = Math.round(year)
        } else if (st.playing) {
          if (now - lastFollow > FOLLOW_EVERY_MS) { lastFollow = now; frameTo(year, true) }
        } else if (Math.round(year) !== settledYear && now - yearChangedAt > FOLLOW_SETTLE_MS) {
          settledYear = Math.round(year)
          frameTo(year, true)
        }
      }
      firstFrame = false

      // Ease centres and flows toward their targets.
      const k = reduced ? 1 : 1 - Math.exp(-dt * 7)
      const scale = small ? 0.8 : 1
      const seen = new Set<string>()
      for (const c of snap.centres) {
        seen.add(c.key)
        const target = scale * Math.min(48, 5 + 8.5 * Math.sqrt(c.weight))
        let s = centresRef.current.get(c.key)
        if (!s) {
          s = { key: c.key, pos: c.pos, period: c.period, count: c.count, weight: c.weight,
            approxOnly: c.approxCount === c.count, r: reduced ? target : target * 0.4,
            alpha: reduced ? 1 : 0, labelAlpha: 0, target, x: 0, y: 0 }
          centresRef.current.set(c.key, s)
        }
        s.period = c.period; s.count = c.count; s.weight = c.weight
        s.approxOnly = c.approxCount === c.count
        s.target = target
      }
      let animating = false
      centresRef.current.forEach((s, key) => {
        if (!seen.has(key)) s.target = 0
        const wantAlpha = s.target > 0 ? 1 : 0
        if (s.target > 0) s.r += (s.target - s.r) * k
        s.alpha += (wantAlpha - s.alpha) * k
        if (Math.abs(s.target - s.r) > 0.2 || Math.abs(wantAlpha - s.alpha) > 0.01) animating = true
        if (s.target === 0 && s.alpha < 0.01) centresRef.current.delete(key)
      })
      const seenF = new Set<string>()
      for (const f of snap.flows) {
        seenF.add(f.key)
        const target = Math.min(1, f.strength) * (f.approx ? 0.55 : 1)
        const s = flowsRef.current.get(f.key)
        if (s) { s.flow = f; s.target = target }
        else flowsRef.current.set(f.key, { flow: f, alpha: reduced ? target : 0, target })
      }
      flowsRef.current.forEach((s, key) => {
        if (!seenF.has(key)) s.target = 0
        s.alpha += (s.target - s.alpha) * k
        if (Math.abs(s.target - s.alpha) > 0.01) animating = true
        if (s.target === 0 && s.alpha < 0.01) flowsRef.current.delete(key)
      })

      // Reduced motion draws only when something changed; otherwise the
      // pulses and comets keep the map alive.
      if (reduced && !dirtyRef.current && !animating) return
      dirtyRef.current = false
      if (cssW < 10 || cssH < 10) return
      draw(ctx, now, paletteFor(th), loc, small, reduced, st.focus)
    }

    const draw = (ctx: CanvasRenderingContext2D, now: number, pal: Palette, loc: Locale, small: boolean, reduced: boolean, focus: string | null) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)
      const pt = (p: LatLng) => map.latLngToContainerPoint([p.lat, p.lng])
      const t = now / 1000

      // ── Arcs ──
      ctx.lineCap = 'round'
      flowsRef.current.forEach(({ flow, alpha }) => {
        if (alpha < 0.02) return
        const p0 = pt(flow.a)
        const p1 = pt(flow.b)
        const dx = p1.x - p0.x, dy = p1.y - p0.y
        const len = Math.hypot(dx, dy)
        if (len < 6) return
        // Bend to the left of travel, so A→B and B→A are two arcs, not one.
        const cx = (p0.x + p1.x) / 2 + (dy / len) * len * 0.2
        const cy = (p0.y + p1.y) / 2 - (dx / len) * len * 0.2
        const col = flow.kind === 'teaching' ? pal.teaching : pal.migration
        const n = flow.evidence.length
        const g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y)
        g.addColorStop(0, rgba(col, 0.12 * alpha))
        g.addColorStop(1, rgba(col, (pal.dark ? 0.8 : 0.9) * alpha))
        ctx.strokeStyle = g
        ctx.lineWidth = Math.min(4, 1.2 + 0.6 * (n - 1)) * (small ? 0.9 : 1)
        ctx.setLineDash(flow.kind === 'teaching' ? [5, 5] : [])
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.quadraticCurveTo(cx, cy, p1.x, p1.y)
        ctx.stroke()
        ctx.setLineDash([])

        // Arrowhead just short of the destination, along the curve's tangent.
        const at = 0.93
        const ax = (1 - at) ** 2 * p0.x + 2 * (1 - at) * at * cx + at * at * p1.x
        const ay = (1 - at) ** 2 * p0.y + 2 * (1 - at) * at * cy + at * at * p1.y
        const tx = 2 * (1 - at) * (cx - p0.x) + 2 * at * (p1.x - cx)
        const ty = 2 * (1 - at) * (cy - p0.y) + 2 * at * (p1.y - cy)
        const ang = Math.atan2(ty, tx)
        const hs = small ? 5 : 6
        ctx.fillStyle = rgba(col, 0.9 * alpha)
        ctx.beginPath()
        ctx.moveTo(ax + Math.cos(ang) * hs, ay + Math.sin(ang) * hs)
        ctx.lineTo(ax + Math.cos(ang + 2.5) * hs, ay + Math.sin(ang + 2.5) * hs)
        ctx.lineTo(ax + Math.cos(ang - 2.5) * hs, ay + Math.sin(ang - 2.5) * hs)
        ctx.closePath()
        ctx.fill()

        // A comet running origin → destination says which way at a glance.
        if (!reduced && alpha > 0.15) {
          const u = (t / 2.6 + phaseOf(flow.key)) % 1
          ctx.globalCompositeOperation = pal.dark ? 'lighter' : 'source-over'
          for (let i = 0; i < 6; i++) {
            const v = u - i * 0.018
            if (v < 0) break
            const bx = (1 - v) ** 2 * p0.x + 2 * (1 - v) * v * cx + v * v * p1.x
            const by = (1 - v) ** 2 * p0.y + 2 * (1 - v) * v * cy + v * v * p1.y
            ctx.fillStyle = rgba(col, alpha * (1 - i / 6) * 0.9)
            ctx.beginPath()
            ctx.arc(bx, by, (small ? 2.2 : 2.6) * (1 - i / 8), 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalCompositeOperation = 'source-over'
        }
      })

      // ── Centres ──
      const shown = [...centresRef.current.values()].sort((a, b) => a.r - b.r)
      const selectedId = useAppStore.getState().selectedSageId
      const selectedPlace = selectedId ? live.current.model.byId.get(selectedId)?.place ?? null : null
      for (const c of shown) {
        const p = pt(c.pos)
        c.x = p.x; c.y = p.y
        const R = c.r * 2.2
        if (p.x < -R || p.y < -R || p.x > cssW + R || p.y > cssH + R) continue
        const col = pal.era(c.period)
        const a = c.alpha
        // Glow: additive on the dark map, so neighbouring centres merge into
        // one warm region; plain alpha on the light one, where adding goes white.
        ctx.globalCompositeOperation = pal.dark ? 'lighter' : 'source-over'
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R)
        g.addColorStop(0, rgba(col, (pal.dark ? 0.5 : 0.42) * a))
        g.addColorStop(0.35, rgba(col, (pal.dark ? 0.22 : 0.2) * a))
        g.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, R, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalCompositeOperation = 'source-over'

        // Pulse: a ring breathing outward from every living centre.
        if (!reduced && c.target > 0) {
          const ph = (t / 2.4 + phaseOf(c.key)) % 1
          ctx.strokeStyle = rgba(col, (1 - ph) * 0.55 * a)
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(p.x, p.y, c.r * (0.45 + 0.95 * ph), 0, Math.PI * 2)
          ctx.stroke()
        }

        // Core.
        const core = Math.max(2.5, c.r * 0.3)
        ctx.fillStyle = rgba(pal.dark ? mix(col, [255, 255, 255], 0.35) : col, 0.95 * a)
        ctx.strokeStyle = pal.halo
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, core, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Every sage here dated only by century or era: a dashed ring says so.
        if (c.approxOnly && c.target > 0) {
          ctx.setLineDash([3, 3])
          ctx.strokeStyle = rgba(col, 0.8 * a)
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(p.x, p.y, core + 4, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
        }

        if (c.key === focus || c.key === selectedPlace) {
          ctx.strokeStyle = rgba(pal.focus, 0.95 * a)
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(p.x, p.y, Math.max(core + 7, c.r * 0.75), 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // ── Labels for the heaviest centres, without collisions ──
      const maxLabels = small ? 5 : 9
      const ranked = shown.filter(c => c.target > 0).sort((a, b) => b.weight - a.weight)
      const boxes: Array<[number, number, number, number]> = []
      const k2 = reduced ? 1 : 0.18
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.direction = loc === 'he' ? 'rtl' : 'ltr'
      let labelled = 0
      const want = new Set<string>()
      for (const c of ranked) {
        if (labelled >= maxLabels && c.key !== focus) continue
        const size = labelled < 3 ? (small ? 13 : 15) : (small ? 11.5 : 13)
        ctx.font = `700 ${size}px "Frank Ruhl Libre", "David Libre", Georgia, serif`
        const text = `${placeName(c.key, loc)} · ${c.count}`
        const w = ctx.measureText(text).width
        const x0 = c.x - w / 2 - 3
        const y0 = c.y + Math.max(6, c.r * 0.45)
        const box: [number, number, number, number] = [x0, y0, x0 + w + 6, y0 + size + 4]
        if (box[2] < 0 || box[0] > cssW || box[3] < 0 || box[1] > cssH) continue
        if (boxes.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue
        boxes.push(box)
        want.add(c.key)
        labelled++
      }
      centresRef.current.forEach(c => {
        c.labelAlpha += ((want.has(c.key) ? 1 : 0) - c.labelAlpha) * k2
        if (c.labelAlpha < 0.03) return
        const i = ranked.indexOf(c)
        const size = i >= 0 && i < 3 ? (small ? 13 : 15) : (small ? 11.5 : 13)
        ctx.font = `700 ${size}px "Frank Ruhl Libre", "David Libre", Georgia, serif`
        const text = `${placeName(c.key, loc)} · ${c.count}`
        const y0 = c.y + Math.max(6, c.r * 0.45)
        ctx.globalAlpha = Math.min(c.alpha, c.labelAlpha)
        ctx.lineJoin = 'round'
        ctx.lineWidth = 4
        ctx.strokeStyle = pal.halo
        ctx.strokeText(text, c.x, y0)
        ctx.fillStyle = pal.label
        ctx.fillText(text, c.x, y0)
        ctx.globalAlpha = 1
      })
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsub()
      unsubApp()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, visible])

  // Hover card: the place, how many are active there, and the first names.
  const hovered = hover ? useJourneyStore.getState().snapshot?.centres.find(c => c.key === hover.key) : null
  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 z-[450] pointer-events-none"
      />
      {hover && hovered && (
        <div
          className="absolute z-[1004] pointer-events-none glass rounded-lg px-2.5 py-1.5 text-[11px] font-sans text-ink-200 shadow-glass max-w-[15rem]"
          style={{ left: hover.x, top: hover.y, transform: 'translate(-50%, calc(-100% - 14px))' }}
        >
          <div className="font-serif font-bold text-[13px] text-ink-100">
            {placeName(hovered.key, locale)}
            <span className="ms-1.5 text-gold-300 font-sans text-[11px]">{hovered.count}</span>
          </div>
          <div className="text-ink-400 truncate">
            {hovered.figures.slice(0, 3).map(f => displayName(f.sage.label)).join(' · ')}
            {hovered.count > 3 ? ` ${tr(locale, `ועוד ${hovered.count - 3}`, `+${hovered.count - 3} more`, `и ещё ${hovered.count - 3}`)}` : ''}
          </div>
        </div>
      )}
    </>
  )
}
