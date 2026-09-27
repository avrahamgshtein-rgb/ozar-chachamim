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

import type { Sage } from './types'
import type { LineageIndex, LineageKind } from '@/components/viz/lineage'
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
  moses: string | null
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
 * family come next; influence is inspiration across any span of time, so one
 * influence link costs as much as six teacher links. A link the data stored
 * against the chronology costs a little more, being less certain.
 */
const WEIGHT: Record<LineageKind, number> = { teacher: 1, predecessor: 2, family: 3, influence: 6 }
const REORIENTED_PENALTY = 0.5

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
 * list then carries more of the way, and the archive's leap is shorter).
 */
export function buildSinaiIndex(sages: Iterable<Sage>, idx: LineageIndex): SinaiIndex {
  const chain = resolveChain(sages)
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

  // A few hundred sages: a linear scan for the next-closest is plenty.
  const open = new Set(best.keys())
  const done = new Set<string>()
  while (open.size) {
    let u: string | null = null
    for (const id of open) if (u === null || better(best.get(id)!, best.get(u))) u = id
    open.delete(u!)
    done.add(u!)
    const bu = best.get(u!)!
    for (const r of idx.down.get(u!) ?? []) {
      if (done.has(r.id)) continue
      const cand: Best = {
        cost: bu.cost + WEIGHT[r.kind] + (r.reoriented ? REORIENTED_PENALTY : 0),
        hops: bu.hops + 1,
        gen: bu.gen,
        up: u,
        kind: r.kind,
        reoriented: r.reoriented,
      }
      if (better(cand, best.get(r.id))) {
        best.set(r.id, cand)
        open.add(r.id)
      }
    }
  }

  const moses = chain[0]?.ids[0] ?? null
  return { chain, onChain, best, moses }
}

/** The path from `sageId` to Sinai, or null when the archive holds no route to the chain. */
export function sinaiPath(si: SinaiIndex, sageId: string): SinaiPath | null {
  if (!si.best.has(sageId)) return null

  // Up from the sage to the chain.
  const below: SinaiStep[] = []
  const byKind = zeroKinds()
  let cur = sageId
  for (let guard = 0; guard < 500; guard++) {
    const b = si.best.get(cur)!
    if (b.up === null) break
    below.push({ kind: b.kind!, id: cur, reoriented: b.reoriented || undefined })
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

/** The station a chain step stands at. */
export function stationOf(si: SinaiIndex, gen: number): ResolvedStation | undefined {
  return si.chain[gen - 1]?.gen === gen ? si.chain[gen - 1] : si.chain.find(s => s.gen === gen)
}
