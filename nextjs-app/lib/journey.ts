// מסע התורה — where the centres of Torah stood, year by year.
//
// Pure logic, no DOM: the Journey overlay on the geography map calls these
// functions once per animation frame, and the audit script calls them to print
// the centres for a given year. Everything here is derived from three things
// the data actually holds — a sage's years, the place the map pins them to, and
// their documented migration path or teacher→student links — and nothing else.
//
// ── Who is "active" at year Y ──────────────────────────────────────────────
//   exact    (date_precision 'exact'): alive, birth ≤ Y ≤ death.
//   century  (date_precision 'century'): Y inside the window the source gives
//            (a century, sometimes two or three). The sage lived somewhere in
//            it; we do not know when.
//   era      (no years at all, 41 sages): Y inside the conventional span of
//            their era, the same spans Timeline.tsx uses to place an undated
//            dot. Included rather than dropped, so the biblical and Second
//            Temple eras are not emptied, and always flagged as approximate.
//
// A window wider than a life cannot mean "alive for all of it". Each sage
// therefore carries a *presence* weight: the share of the window a typical
// life would fill, min(1, L / window), where L is the median exact lifespan in
// the data (74 years). An exact sage counts 1; a 12th-century sage 0.74 across
// that century; an undated Rishon (1038–1500) 0.16 across the era. A centre's
// weight is the sum of its active sages' presence, i.e. the expected number of
// sages alive there, which is what the glow is sized by.
//
// ── Centres ────────────────────────────────────────────────────────────────
// One per place, the place the map pins a sage to: lib/locationCoords.ts
// `primaryPlaceOf` (city over region over country, first mentioned wins).
// Each sage counts once, at that one place — the data gives no dates for the
// stops of a journey, so a sage is never moved along it by guesswork.
//
// ── Flows (the arcs) ───────────────────────────────────────────────────────
// Centre weights rise and fall between consecutive epochs (EPOCH_YEARS
// apart); `trend` reports that change for every centre. But a fall in one
// place and a rise in another do not show that anyone went from one to the
// other, so an arc is never drawn from weights alone. An arc A → B exists only
// where the data documents a movement between the two places:
//   'migration' — consecutive stops A, B of a sage's `migration_path`. Shown
//                 while that sage is active: the stops carry no dates, so the
//                 claim is "this person, alive now, travelled A → B in their
//                 lifetime", nothing narrower.
//   'teaching'  — a teacher pinned at A and a student pinned at B (a
//                 `teacher`/`student` link, direction read per CLAUDE.md).
//                 Shown while both lives overlap, the only time the teaching
//                 can have happened.
// Location lists ("בבל, טבריה") are not used: their order of mention is not a
// chronology, so they give no direction. Undated (era) sages draw no arc: a
// window of centuries cannot place a movement in time. Places closer than
// MIN_FLOW_KM are the same area named twice ("ספרד" → "טולדו"), not a move.
import type { Connection, Period, Sage } from './types'
import { ALL_PERIODS } from './types'
import { canonicalPlace, coordsForName, primaryPlaceOf, resolveCoords } from './locationCoords'

export const JOURNEY_START = -1500
export const JOURNEY_END = 2025
/** Distance between the two epochs a centre's trend compares. */
export const EPOCH_YEARS = 50
/** An arc fades in and out over this many years either side of its window. */
export const FLOW_FADE_YEARS = 12
const MIN_FLOW_KM = 120
/** Used when the data has no exact lifespans to take the median of. */
const FALLBACK_LIFESPAN = 70

/**
 * Conventional span of each era, for sages with no years. The same spans as
 * Timeline.tsx's ERA_WINDOW, which places undated dots the same way; the two
 * tables must move together.
 */
export const JOURNEY_ERA_WINDOW: Record<Period, [number, number]> = {
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

export type DatingKind = 'exact' | 'century' | 'era'

export interface LatLng { lat: number; lng: number }

/** A sage as the journey sees them: when, where, and how surely. */
export interface JourneyFigure {
  sage: Sage
  kind: DatingKind
  /** First and last year the sage counts as active. */
  from: number
  to: number
  /** Expected share of [from, to] the sage was alive: 1 for exact dates. */
  presence: number
  /** Centre key: the canonical place the map pins the sage to. */
  place: string
  pos: LatLng
  /** Ordering for "top sages": documented links, then research, then dating. */
  prominence: number
}

export interface JourneyCentre {
  key: string
  pos: LatLng
  /** Σ presence of the active sages: the expected number alive here. */
  weight: number
  /** Active sages here, however surely dated. */
  count: number
  /** How many of them are dated only by century or era. */
  approxCount: number
  /** Active sages here, most prominent first. */
  figures: JourneyFigure[]
  /** The era most of the weight belongs to (the glow's colour). */
  period: Period
  /** weight now − weight one epoch (EPOCH_YEARS) earlier. */
  trend: number
}

export type FlowKind = 'migration' | 'teaching'

/** One documented movement between two places. */
export interface JourneyEvidence {
  kind: FlowKind
  /** The travelling sage, or the student. */
  sageId: string
  /** The teacher, for 'teaching'. */
  teacherId?: string
  from: string
  to: string
  a: LatLng
  b: LatLng
  /** Years the movement is shown (see the header). */
  start: number
  end: number
  /** Rests on a century window rather than exact dates. */
  approx: boolean
}

/** Every documented movement A → B visible at a year, gathered into one arc. */
export interface JourneyFlow {
  key: string
  from: string
  to: string
  a: LatLng
  b: LatLng
  kind: FlowKind
  evidence: JourneyEvidence[]
  /** Σ visibility of its evidence at the year (0…n); drives the arc's opacity. */
  strength: number
  /** True when every piece of evidence rests on a century window. */
  approx: boolean
}

export interface JourneyModel {
  figures: JourneyFigure[]
  evidence: JourneyEvidence[]
  /** Median exact lifespan, the L in the presence weight. */
  lifespan: number
  byId: Map<string, JourneyFigure>
}

export interface JourneySnapshot {
  year: number
  centres: JourneyCentre[]
  flows: JourneyFlow[]
  /** Every active sage, most prominent first. */
  active: JourneyFigure[]
  /** Σ weight over all centres. */
  total: number
}

/* ── Building ─────────────────────────────────────────────────────────── */

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function median(xs: number[]): number {
  if (!xs.length) return FALLBACK_LIFESPAN
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/** The window a sage is active in, and how it was known. */
function datingOf(sage: Sage): { kind: DatingKind; from: number; to: number } {
  const b = sage.birth_year
  const d = sage.death_year
  if (sage.date_precision === 'century' && b != null) {
    return { kind: 'century', from: b, to: d != null && d > b ? d : b + 100 }
  }
  if (b != null && d != null) return { kind: 'exact', from: Math.min(b, d), to: Math.max(b, d) }
  // One year only (none in the current data): treat it as a lifespan around it.
  if (b != null) return { kind: 'exact', from: b, to: b + FALLBACK_LIFESPAN }
  if (d != null) return { kind: 'exact', from: d - FALLBACK_LIFESPAN, to: d }
  const [from, to] = JOURNEY_ERA_WINDOW[sage.period]
  return { kind: 'era', from, to }
}

export function buildJourney(sages: Sage[], connections: Connection[]): JourneyModel {
  const degree = new Map<string, number>()
  for (const c of connections) {
    degree.set(c.source, (degree.get(c.source) ?? 0) + 1)
    degree.set(c.target, (degree.get(c.target) ?? 0) + 1)
  }

  const lifespan = median(
    sages
      .filter(s => s.date_precision === 'exact' && s.birth_year != null && s.death_year != null)
      .map(s => (s.death_year as number) - (s.birth_year as number))
      .filter(n => n > 0),
  )

  const figures: JourneyFigure[] = []
  const byId = new Map<string, JourneyFigure>()
  for (const sage of sages) {
    const pos = resolveCoords(sage)
    if (!pos) continue
    const place = primaryPlaceOf(sage) ?? `${pos.lat.toFixed(3)},${pos.lng.toFixed(3)}`
    const { kind, from, to } = datingOf(sage)
    const span = Math.max(1, to - from)
    const presence = kind === 'exact' ? 1 : Math.min(1, lifespan / span)
    const prominence = (degree.get(sage.id) ?? 0) + (sage.has_research ? 1.5 : 0) + (kind === 'exact' ? 0.5 : 0)
    const f: JourneyFigure = { sage, kind, from, to, presence, place, pos, prominence }
    figures.push(f)
    byId.set(sage.id, f)
  }

  const evidence: JourneyEvidence[] = []

  // Migration paths: one piece of evidence per leg between distinct places.
  for (const f of figures) {
    const path = f.sage.migration_path
    if (!path || f.kind === 'era') continue
    const stops = [path.from, ...(path.intermediate ?? []), path.to]
      .map(name => ({ name: canonicalPlace(name), c: coordsForName(name) }))
      .filter((s): s is { name: string; c: LatLng } => !!s.name && !!s.c)
    for (let i = 1; i < stops.length; i++) {
      const p = stops[i - 1]
      const q = stops[i]
      if (p.name === q.name || haversineKm(p.c, q.c) < MIN_FLOW_KM) continue
      evidence.push({
        kind: 'migration', sageId: f.sage.id, from: p.name, to: q.name, a: p.c, b: q.c,
        start: f.from, end: f.to, approx: f.kind !== 'exact',
      })
    }
  }

  // Teacher → student across places, while both were alive.
  const seenPair = new Set<string>()
  for (const c of connections) {
    if (c.type !== 'teacher' && c.type !== 'student') continue
    const teacherId = c.type === 'teacher' ? c.source : c.target
    const studentId = c.type === 'teacher' ? c.target : c.source
    const pair = `${teacherId}>${studentId}`
    if (seenPair.has(pair)) continue
    seenPair.add(pair)
    const t = byId.get(teacherId)
    const s = byId.get(studentId)
    if (!t || !s || t.kind === 'era' || s.kind === 'era') continue
    if (t.place === s.place || haversineKm(t.pos, s.pos) < MIN_FLOW_KM) continue
    const start = Math.max(t.from, s.from)
    const end = Math.min(t.to, s.to)
    if (start > end) continue
    evidence.push({
      kind: 'teaching', sageId: studentId, teacherId, from: t.place, to: s.place, a: t.pos, b: s.pos,
      start, end, approx: t.kind !== 'exact' || s.kind !== 'exact',
    })
  }

  return { figures, evidence, lifespan, byId }
}

/* ── Reading a year ───────────────────────────────────────────────────── */

export function isActive(f: JourneyFigure, year: number): boolean {
  return f.from <= year && year <= f.to
}

/** Weight per centre at a year, without building full centre objects. */
function weightsAt(model: JourneyModel, year: number): Map<string, number> {
  const w = new Map<string, number>()
  for (const f of model.figures) {
    if (isActive(f, year)) w.set(f.place, (w.get(f.place) ?? 0) + f.presence)
  }
  return w
}

export function centresAt(model: JourneyModel, year: number): JourneyCentre[] {
  const groups = new Map<string, JourneyFigure[]>()
  for (const f of model.figures) {
    if (!isActive(f, year)) continue
    const g = groups.get(f.place)
    if (g) g.push(f)
    else groups.set(f.place, [f])
  }
  const before = weightsAt(model, year - EPOCH_YEARS)

  const centres: JourneyCentre[] = []
  groups.forEach((figs, key) => {
    figs.sort(byProminence)
    let weight = 0
    let approxCount = 0
    const perEra = new Map<Period, number>()
    for (const f of figs) {
      weight += f.presence
      if (f.kind !== 'exact') approxCount++
      perEra.set(f.sage.period, (perEra.get(f.sage.period) ?? 0) + f.presence)
    }
    let period: Period = figs[0].sage.period
    let best = -1
    perEra.forEach((w, p) => { if (w > best) { best = w; period = p } })
    centres.push({
      key, pos: figs[0].pos, weight, count: figs.length, approxCount, figures: figs, period,
      trend: weight - (before.get(key) ?? 0),
    })
  })
  return centres.sort((a, b) => b.weight - a.weight || b.count - a.count || a.key.localeCompare(b.key))
}

function byProminence(a: JourneyFigure, b: JourneyFigure): number {
  return b.prominence - a.prominence || b.presence - a.presence || a.sage.label.localeCompare(b.sage.label)
}

/** 1 inside the evidence window, fading to 0 over FLOW_FADE_YEARS outside it. */
export function evidenceVisibility(e: JourneyEvidence, year: number): number {
  if (year >= e.start && year <= e.end) return 1
  const dist = year < e.start ? e.start - year : year - e.end
  return Math.max(0, 1 - dist / FLOW_FADE_YEARS)
}

/** Arcs visible at a year: documented movements only (see the header). */
export function flowsAt(model: JourneyModel, year: number): JourneyFlow[] {
  const flows = new Map<string, JourneyFlow>()
  for (const e of model.evidence) {
    const v = evidenceVisibility(e, year)
    if (v <= 0) continue
    const key = `${e.kind}:${e.from}>${e.to}`
    const fl = flows.get(key)
    if (fl) {
      fl.evidence.push(e)
      fl.strength += v
      fl.approx = fl.approx && e.approx
    } else {
      flows.set(key, { key, from: e.from, to: e.to, a: e.a, b: e.b, kind: e.kind, evidence: [e], strength: v, approx: e.approx })
    }
  }
  return [...flows.values()].sort((a, b) => b.strength - a.strength)
}

/**
 * The documented movements between two consecutive epochs, with the weight
 * change of each end over the same interval. The overlay reads a single year;
 * this is the epoch-to-epoch view the audit script prints, so that each arc
 * can be checked against whether its destination actually grew.
 */
export function flowsBetween(model: JourneyModel, y0: number, y1: number): Array<JourneyFlow & { originChange: number; destChange: number }> {
  const w0 = weightsAt(model, y0)
  const w1 = weightsAt(model, y1)
  const flows = new Map<string, JourneyFlow>()
  for (const e of model.evidence) {
    if (e.end < y0 || e.start > y1) continue
    const key = `${e.kind}:${e.from}>${e.to}`
    const fl = flows.get(key)
    if (fl) { fl.evidence.push(e); fl.strength += 1; fl.approx = fl.approx && e.approx }
    else flows.set(key, { key, from: e.from, to: e.to, a: e.a, b: e.b, kind: e.kind, evidence: [e], strength: 1, approx: e.approx })
  }
  return [...flows.values()].map(fl => ({
    ...fl,
    originChange: (w1.get(fl.from) ?? 0) - (w0.get(fl.from) ?? 0),
    destChange: (w1.get(fl.to) ?? 0) - (w0.get(fl.to) ?? 0),
  }))
}

export function snapshotAt(model: JourneyModel, year: number): JourneySnapshot {
  const centres = centresAt(model, year)
  const active = centres.flatMap(c => c.figures).sort(byProminence)
  const total = centres.reduce((s, c) => s + c.weight, 0)
  return { year, centres, flows: flowsAt(model, year), active, total }
}

/* ── Framing and eras ─────────────────────────────────────────────────── */

/**
 * Where the action is around a year: the smallest box holding 85% of the
 * weight, over a short look-ahead so the camera leads rather than lags.
 * Never smaller than a region, so a single-city era does not zoom to streets.
 */
export function framingBounds(model: JourneyModel, year: number): [[number, number], [number, number]] | null {
  const w = new Map<string, { pos: LatLng; weight: number }>()
  for (const y of [year - 20, year, year + 20, year + 40]) {
    for (const f of model.figures) {
      if (!isActive(f, y)) continue
      const c = w.get(f.place)
      if (c) c.weight += f.presence
      else w.set(f.place, { pos: f.pos, weight: f.presence })
    }
  }
  const pts = [...w.values()].sort((a, b) => b.weight - a.weight)
  if (!pts.length) return null
  const total = pts.reduce((s, p) => s + p.weight, 0)
  let acc = 0
  let s = 90, n = -90, west = 180, east = -180
  for (const p of pts) {
    s = Math.min(s, p.pos.lat); n = Math.max(n, p.pos.lat)
    west = Math.min(west, p.pos.lng); east = Math.max(east, p.pos.lng)
    acc += p.weight
    if (acc >= total * 0.85) break
  }
  const MIN_LAT = 9, MIN_LNG = 14
  if (n - s < MIN_LAT) { const m = (n + s) / 2; s = m - MIN_LAT / 2; n = m + MIN_LAT / 2 }
  if (east - west < MIN_LNG) { const m = (east + west) / 2; west = m - MIN_LNG / 2; east = m + MIN_LNG / 2 }
  return [[s - 1.5, west - 2], [n + 1.5, east + 2]]
}

/**
 * The era a year falls in by convention, the earlier one where two overlap
 * (10–70 CE is still the Second Temple). Null in the gaps no era covers: the
 * Babylonian exile (586–516 BCE) and the Savoraim (500–589).
 */
export function eraAt(year: number): Period | null {
  for (const p of ALL_PERIODS) {
    const [lo, hi] = JOURNEY_ERA_WINDOW[p]
    if (year >= lo && year <= hi) return p
  }
  return null
}

export function clampYear(y: number): number {
  return Math.max(JOURNEY_START, Math.min(JOURNEY_END, y))
}
