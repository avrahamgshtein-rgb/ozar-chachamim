// "הדרך לסיני": the path of transmission from any sage back to Moses at Sinai.
//
// Two parts, kept apart because they rest on different authority:
//   1. From the sage up to the nearest person on the Rambam's chain
//      (lib/sinaiChain.ts), over the archive's own lineage links, oriented
//      upper → lower by components/viz/lineage.ts.
//   2. From that station up to Moses, along the Rambam's forty generations.
// Part 1 is chosen, so it is labelled as such: of all the recorded routes to
// the chain it takes the most trustworthy one, where a teacher link counts as
// transmission and an influence link only as inspiration (see WEIGHT).
// Nothing here adds a relation the data doesn't hold.
// Pure functions only: no React, no DOM, so it can run on the server (the sage
// page card), in the browser (the lineage tab) and from a script.

import type { Period, Sage } from './types'
import { chronoYear } from '@/components/viz/lineage'
import type { LineageIndex, LineageKind, Rel } from '@/components/viz/lineage'
import { SINAI_CHAIN, type ChainStation } from './sinaiChain'

/** How a step received from the step above it. `sinai` is Moses at the top. */
export type SinaiStepKind = 'sinai' | 'chain' | LineageKind

export interface SinaiStep {
  kind: SinaiStepKind
  /**
   * The corpus sage at this step. On a chain station: the person the path runs
   * through, else the station's own person; null when nobody named at the
   * station is in the corpus (it is then shown by name only).
   */
  id: string | null
  /** The Rambam's generation (1 = Moses … 40 = Rav Ashi), on chain stations only. */
  gen?: number
  /** The link was stored against the chronology and is read in date order. */
  reoriented?: boolean
}

export interface SinaiPath {
  sageId: string
  /** Top-down: Moses at Sinai first, the sage last. */
  steps: SinaiStep[]
  /** Where the path joins the Rambam's chain, and through whom. */
  entry: { gen: number; id: string; alongside: boolean }
  /** Archive links between the sage and the chain (0 when the sage is on it). */
  hops: number
  /** Links below the chain by kind. */
  byKind: Record<LineageKind, number>
  /** Every archive link on the path is teacher → student (the chain itself is the Rambam's). */
  direct: boolean
}

export interface ResolvedStation {
  gen: number
  station: ChainStation
  /** Corpus ids of the people the station names. */
  ids: string[]
  /** Those the Rambam names alongside, each group with its corpus ids. */
  alongside: { name: ChainStation['name']; ids: string[] }[]
}

export interface SinaiIndex {
  chain: ResolvedStation[]
  /** Chain person → { generation, named alongside rather than at the station }. */
  onChain: Map<string, { gen: number; alongside: boolean }>
  /** For each sage that reaches the chain: its next step up the chosen path. */
  best: Map<string, Best>
  /** Moses's corpus id, when he is in the corpus. */
  moses: string | null
  /** The weight of one lineage link from `up` down to `r.id`. */
  weigh: (up: string, r: Rel) => number
  /** A sortable year for weighing leaps (era middle when undated); never shown. */
  year: (id: string) => number | null
}

interface Best {
  /** Summed link weight to the chain. */
  cost: number
  hops: number
  /** The generation the path enters the chain at; later is preferred on a tie. */
  gen: number
  /** The next sage up (null on the chain itself). */
  up: string | null
  kind: LineageKind | null
  reoriented: boolean
}

/**
 * Link weights. A teacher link is transmission; succession in office and
 * family come next; influence is inspiration, not transmission, so even a
 * short one costs four teacher links. Every link but a teacher link also
 * costs per century it bridges: of two inspirations, the shorter leap is the
 * likelier channel. A link the data stored against the chronology costs a
 * little more, being less certain.
 */
const WEIGHT: Record<LineageKind, number> = { teacher: 1, predecessor: 2, family: 2.5, influence: 4 }
const PER_CENTURY: Record<LineageKind, number> = { teacher: 0, predecessor: 0.25, family: 0.25, influence: 1 }
const REORIENTED_PENALTY = 0.5
/**
 * Between routes otherwise equal, the one through better-documented sages
 * (more recorded lineage links) wins: a nudge far below any real weight.
 */
const obscurity = (degree: number) => 0.1 / (1 + degree)

/** Only for weighing a leap that involves an undated sage; never shown. The middle of each era, roughly. */
const ERA_MID: Record<Period, number> = {
  patriarchs: -1800, exodus: -1300, judges: -1150, kings: -800, 'second-temple': -300,
  tannaim: 100, amoraim: 350, geonim: 800, rishonim: 1250, acharonim: 1650, modern: 1900,
}

const zeroKinds = (): Record<LineageKind, number> => ({ teacher: 0, predecessor: 0, family: 0, influence: 0 })

/** The label a name-keyed lookup must use: the Hebrew one, even under an en/ru overlay. */
const hebrewLabel = (s: Sage) => (s.label_he ?? s.label ?? '').trim()

/** Resolve the chain's names against the loaded corpus, by label (never by id). */
export function resolveChain(sages: Iterable<Sage>): ResolvedStation[] {
  const byLabel = new Map<string, string>()
  for (const s of sages) byLabel.set(hebrewLabel(s), s.id)
  const ids = (labels: string[]) => labels.map(l => byLabel.get(l.trim())).filter((x): x is string => !!x)
  return SINAI_CHAIN.map(station => ({
    gen: station.gen,
    station,
    ids: ids(station.match),
    alongside: (station.alongside ?? []).map(a => ({ name: a.name, ids: ids(a.match) })),
  }))
}

/**
 * Find the best path to the chain for every sage at once: a Dijkstra run
 * outward from the chain's people along the links downward (teacher → student),
 * which is the reverse of each sage's walk upward. Paths compare by weight,
 * then by fewer links, then by the later entry into the chain (the Rambam's
 * list then carries more of the way). A few hundred sages and links: the
 * whole corpus takes a few milliseconds.
 */
export function buildSinaiIndex(sages: Iterable<Sage>, idx: LineageIndex): SinaiIndex {
  const all = [...sages]
  const chain = resolveChain(all)
  const byId = new Map(all.map(s => [s.id, s]))
  const year = (id: string) => {
    const s = byId.get(id)
    return s ? chronoYear(s) ?? ERA_MID[s.period] ?? null : null
  }
  const weigh = (up: string, r: Rel) => {
    const a = year(up), b = year(r.id)
    const centuries = a == null || b == null ? 0 : Math.max(0, b - a) / 100
    return WEIGHT[r.kind] + PER_CENTURY[r.kind] * centuries
      + (r.reoriented ? REORIENTED_PENALTY : 0) + obscurity(idx.degree.get(up) ?? 0)
  }

  const onChain = new Map<string, { gen: number; alongside: boolean }>()
  for (const st of chain) {
    // A person named at two stations belongs to the later one.
    for (const id of st.ids) onChain.set(id, { gen: st.gen, alongside: false })
    for (const a of st.alongside) for (const id of a.ids) {
      if (!onChain.has(id) || onChain.get(id)!.gen < st.gen) onChain.set(id, { gen: st.gen, alongside: true })
    }
  }

  const best = new Map<string, Best>()
  const better = (a: Best, b: Best | undefined) =>
    !b || a.cost - b.cost < -1e-9 || (Math.abs(a.cost - b.cost) <= 1e-9 && (a.hops - b.hops || b.gen - a.gen) < 0)
  for (const [id, { gen }] of onChain) best.set(id, { cost: 0, hops: 0, gen, up: null, kind: null, reoriented: false })

  // A linear scan for the next-closest is plenty at this size.
  const open = new Set(best.keys())
  const done = new Set<string>()
  while (open.size) {
    let u = ''
    for (const id of open) if (!u || better(best.get(id)!, best.get(u))) u = id
    open.delete(u)
    done.add(u)
    const bu = best.get(u)!
    for (const r of idx.down.get(u) ?? []) {
      if (done.has(r.id)) continue
      const cand: Best = { cost: bu.cost + weigh(u, r), hops: bu.hops + 1, gen: bu.gen, up: u, kind: r.kind, reoriented: r.reoriented }
      if (better(cand, best.get(r.id))) {
        best.set(r.id, cand)
        open.add(r.id)
      }
    }
  }

  return { chain, onChain, best, moses: chain[0]?.ids[0] ?? null, weigh, year }
}

/** The path from `sageId` to Sinai, or null when the archive holds no route to the chain. */
export function sinaiPath(si: SinaiIndex, sageId: string): SinaiPath | null {
  if (!si.best.has(sageId)) return null

  // Up from the sage to the chain.
  const below: SinaiStep[] = []
  const byKind = zeroKinds()
  let cur = sageId
  for (let guard = 0; guard < 1000; guard++) {
    const b = si.best.get(cur)!
    if (b.up === null) break
    below.push({ kind: b.kind!, id: cur, ...(b.reoriented ? { reoriented: true } : {}) })
    byKind[b.kind!]++
    cur = b.up
  }
  const entryId = cur
  const { gen: entryGen, alongside } = si.onChain.get(entryId)!

  // Down the chain from Moses to the entry station.
  const steps: SinaiStep[] = []
  for (const st of si.chain) {
    if (st.gen > entryGen) break
    const id = st.gen === entryGen ? entryId : (st.ids[0] ?? null)
    steps.push({ kind: st.gen === 1 ? 'sinai' : 'chain', id, gen: st.gen })
  }
  steps.push(...below.reverse())

  return {
    sageId,
    steps,
    entry: { gen: entryGen, id: entryId, alongside },
    hops: below.length,
    byKind,
    direct: below.every(s => s.kind === 'teacher'),
  }
}

/**
 * For a sage with no route to the chain: how far back the archive's record
 * does go. Walks up from the sage with the same weights and returns the best
 * route to the earliest ancestor reached, top-down (that ancestor first, the
 * sage last), or just the sage when nobody above is recorded.
 */
export function sinaiTrail(si: SinaiIndex, idx: LineageIndex, sageId: string): SinaiStep[] {
  const dist = new Map<string, number>([[sageId, 0]])
  const via = new Map<string, { down: string; kind: LineageKind; reoriented: boolean }>()
  const open = new Set([sageId])
  const done = new Set<string>()
  while (open.size) {
    let u = ''
    for (const id of open) if (!u || dist.get(id)! < dist.get(u)!) u = id
    open.delete(u)
    done.add(u)
    for (const r of idx.up.get(u) ?? []) {
      if (done.has(r.id)) continue
      const d = dist.get(u)! + si.weigh(r.id, { id: u, kind: r.kind, reoriented: r.reoriented })
      if (d < (dist.get(r.id) ?? Infinity)) {
        dist.set(r.id, d)
        via.set(r.id, { down: u, kind: r.kind, reoriented: r.reoriented })
        open.add(r.id)
      }
    }
  }
  // The earliest ancestor; on a tie, the cheaper route.
  let top = sageId
  for (const id of done) {
    const y = si.year(id) ?? Infinity, ty = si.year(top) ?? Infinity
    if (y < ty || (y === ty && dist.get(id)! < dist.get(top)!)) top = id
  }
  // Top-down. The top step has no link above it in the archive: its kind is
  // only a placeholder, and the view draws a gap there.
  const steps: SinaiStep[] = [{ kind: 'influence', id: top }]
  for (let cur = top, guard = 0; via.has(cur) && guard < 1000; guard++) {
    const v = via.get(cur)!
    steps.push({ kind: v.kind, id: v.down, ...(v.reoriented ? { reoriented: true } : {}) })
    cur = v.down
  }
  return steps
}

/**
 * The centuries a link bridges, rounded, when both ends carry dates and they
 * are at least a hundred years apart: "a leap of about nine centuries". Shows
 * an inspiration across the ages for what it is.
 */
export function leapCenturies(upper: Sage | undefined, lower: Sage | undefined): number | null {
  const a = chronoYear(upper), b = chronoYear(lower)
  if (a == null || b == null || b - a < 100) return null
  return Math.round((b - a) / 100)
}

/** Lived before the Torah was given: the patriarchs' era. */
export function beforeSinai(s: Sage | undefined): boolean {
  return s?.period === 'patriarchs'
}
