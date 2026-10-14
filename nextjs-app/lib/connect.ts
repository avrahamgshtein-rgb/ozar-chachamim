// "שישה צעדים": the shortest chain of recorded relations between any two sages (teacher, family, successor,
// colleague, disputant, influence), the words for each link in three languages, and the compact net the
// connect page and the game ship to the browser. Pure (no server imports, no DOM, no dataset), so the page,
// the game, the tower flight and the tests share it.
//
// One edge per pair of roster sages, keeping the strongest kind the data holds for the pair; `student`
// (source is the student of target) is stored as `teacher` the other way round, and `contemporary` is not a
// relation. The search is Dijkstra over the kinds' weights (a teacher link is the surest road; an
// influence link is a leap), and ties go to the path with fewer links. A path is computed from the end
// that comes first in id order and reversed for the other, so b to a is always a to b read backwards, ties
// included.
import { ALL_PERIODS } from './types'
import type { Connection, Locale, Period } from './types'

/** The kinds a path may use, strongest first (a pair with several links keeps the first of its kinds). */
export const CONNECT_KINDS = ['teacher', 'family', 'predecessor', 'colleague', 'oppose', 'influence'] as const
export type ConnectKind = (typeof CONNECT_KINDS)[number]

/** 'up': the PREVIOUS sage is this one's teacher / elder relative / predecessor / influencer; 'down': the reverse; 'none': no direction (colleague, disputant). */
export type StepDir = 'up' | 'down' | 'none'
export interface ConnectVia { kind: ConnectKind; dir: StepDir }
/** One sage on a path; `via` is how he is linked to the previous one, and is absent on the first step. */
export interface PathStep { id: string; via?: ConnectVia }
export interface ConnectPath { steps: PathStep[]; weight: number; links: number }

/** What one link costs the search: the lower, the surer the road. */
export const KIND_WEIGHT: Record<ConnectKind, number> = {
  teacher: 1, family: 2, predecessor: 2, colleague: 2.5, oppose: 3, influence: 4,
}
/** Kinds that name who stands above whom; colleague and oppose have no direction. */
const DIRECTED: Record<ConnectKind, boolean> = {
  teacher: true, family: true, predecessor: true, colleague: false, oppose: false, influence: true,
}

/* ── The graph ────────────────────────────────────────────────────────── */

/** A link seen from one end: where it goes, what it is, and the direction as `ConnectVia.dir` reads it. */
interface Arc { to: number; kind: number; dir: StepDir }
/** A link as the data stores it: `a` is the teacher / elder / influencer / predecessor (the source), or just the source. */
interface Edge { a: number; b: number; kind: number }

/** Opaque: build it with `buildConnectGraph` or `graphFromNet` and read it through the functions below. */
export interface ConnectGraph {
  /** @internal ids in id order */
  readonly ids: readonly string[]
  /** @internal */
  readonly index: ReadonlyMap<string, number>
  /** @internal one per pair, sorted by (smaller end, larger end) */
  readonly edges: readonly Edge[]
  /** @internal each sage's links, sorted by the other end */
  readonly adj: readonly (readonly Arc[])[]
}

/** Numeric ids by number, then any other by text: a total order, so the same graph is built from any listing of the same sages. */
export function compareIds(x: string, y: string): number {
  const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y)
  if (nx && ny) return Number(x) - Number(y) || (x < y ? -1 : x > y ? 1 : 0)
  if (nx !== ny) return nx ? -1 : 1
  return x < y ? -1 : x > y ? 1 : 0
}

const DIR_OF = (kind: number, fromEnd: 'a' | 'b'): StepDir =>
  !DIRECTED[CONNECT_KINDS[kind]] ? 'none' : fromEnd === 'a' ? 'up' : 'down'

function makeGraph(ids: readonly string[], edgeList: readonly Edge[]): ConnectGraph {
  const index = new Map(ids.map((id, i) => [id, i]))
  const edges = [...edgeList].sort((p, q) => Math.min(p.a, p.b) - Math.min(q.a, q.b) || Math.max(p.a, p.b) - Math.max(q.a, q.b))
  const adj: Arc[][] = ids.map(() => [])
  for (const e of edges) {
    // going a to b, the previous sage (a) stands above b; going b to a, the previous sage (b) stands below
    adj[e.a].push({ to: e.b, kind: e.kind, dir: DIR_OF(e.kind, 'a') })
    adj[e.b].push({ to: e.a, kind: e.kind, dir: DIR_OF(e.kind, 'b') })
  }
  for (const list of adj) list.sort((p, q) => p.to - q.to)
  return { ids, index, edges, adj }
}

function kindIndex(type: Connection['type']): number | null {
  if (type === 'student') return 0
  const k = (CONNECT_KINDS as readonly string[]).indexOf(type)
  return k < 0 ? null : k
}

/** The graph over `ids` (the roster): links to a sage not in `ids`, to himself, and `contemporary` ones are dropped. */
export function buildConnectGraph(ids: Iterable<string>, connections: readonly Connection[]): ConnectGraph {
  const sorted = [...new Set(ids)].sort(compareIds)
  const index = new Map(sorted.map((id, i) => [id, i]))
  const n = sorted.length
  const best = new Map<number, Edge>()
  for (const c of connections) {
    const kind = kindIndex(c.type)
    if (kind === null) continue
    const [from, to] = c.type === 'student' ? [c.target, c.source] : [c.source, c.target]
    const a = index.get(from), b = index.get(to)
    if (a === undefined || b === undefined || a === b) continue
    const key = a < b ? a * n + b : b * n + a
    const prev = best.get(key)
    if (!prev || kind < prev.kind) best.set(key, { a, b, kind })
  }
  return makeGraph(sorted, [...best.values()])
}

/** Is there a link between these two roster sages? */
export function linkBetween(g: ConnectGraph, x: string, y: string): ConnectVia | null {
  const i = g.index.get(x), j = g.index.get(y)
  if (i === undefined || j === undefined) return null
  const arc = g.adj[i].find(a => a.to === j)
  return arc ? { kind: CONNECT_KINDS[arc.kind], dir: arc.dir } : null
}

/** How many sages he is linked to. */
export function degreeOf(g: ConnectGraph, id: string): number {
  const i = g.index.get(id)
  return i === undefined ? 0 : g.adj[i].length
}

/* ── Paths ────────────────────────────────────────────────────────────── */

/** Shortest paths from one sage: for each sage the cheapest weight, then the fewest links, and the last link used. */
interface Tree {
  weight: Float64Array
  links: Int32Array
  prev: Int32Array
  via: (Arc | null)[]
}

const trees = new WeakMap<ConnectGraph, Map<number, Tree>>()

/** A binary min-heap of [weight, links, index] triples, ordered by those three. */
class Heap {
  private w: number[] = []
  private l: number[] = []
  private i: number[] = []
  get size() { return this.w.length }
  private less(p: number, q: number) {
    return this.w[p] - this.w[q] || this.l[p] - this.l[q] || this.i[p] - this.i[q]
  }
  private swap(p: number, q: number) {
    ;[this.w[p], this.w[q]] = [this.w[q], this.w[p]]
    ;[this.l[p], this.l[q]] = [this.l[q], this.l[p]]
    ;[this.i[p], this.i[q]] = [this.i[q], this.i[p]]
  }
  push(w: number, l: number, i: number) {
    this.w.push(w); this.l.push(l); this.i.push(i)
    for (let k = this.w.length - 1; k > 0;) {
      const up = (k - 1) >> 1
      if (this.less(k, up) >= 0) break
      this.swap(k, up)
      k = up
    }
  }
  pop(): [number, number, number] {
    const top: [number, number, number] = [this.w[0], this.l[0], this.i[0]]
    const last = this.w.length - 1
    this.swap(0, last)
    this.w.pop(); this.l.pop(); this.i.pop()
    for (let k = 0; ;) {
      const a = 2 * k + 1, b = a + 1
      let m = k
      if (a < last && this.less(a, m) < 0) m = a
      if (b < last && this.less(b, m) < 0) m = b
      if (m === k) break
      this.swap(k, m)
      k = m
    }
    return top
  }
}

function treeFrom(g: ConnectGraph, src: number): Tree {
  let mine = trees.get(g)
  if (!mine) trees.set(g, (mine = new Map()))
  const hit = mine.get(src)
  if (hit) return hit
  const n = g.ids.length
  const t: Tree = {
    weight: new Float64Array(n).fill(Infinity),
    links: new Int32Array(n),
    prev: new Int32Array(n).fill(-1),
    via: new Array<Arc | null>(n).fill(null),
  }
  const done = new Uint8Array(n)
  const heap = new Heap()
  t.weight[src] = 0
  heap.push(0, 0, src)
  while (heap.size) {
    const [w, l, u] = heap.pop()
    if (done[u]) continue
    done[u] = 1
    for (const arc of g.adj[u]) {
      const v = arc.to
      if (done[v]) continue
      const nw = w + KIND_WEIGHT[CONNECT_KINDS[arc.kind]], nl = l + 1
      if (nw < t.weight[v] || (nw === t.weight[v] && nl < t.links[v])) {
        t.weight[v] = nw
        t.links[v] = nl
        t.prev[v] = u
        t.via[v] = arc
        heap.push(nw, nl, v)
      }
    }
  }
  mine.set(src, t)
  return t
}

const flip = (d: StepDir): StepDir => (d === 'up' ? 'down' : d === 'down' ? 'up' : 'none')

/** The path src to `dst` in the tree, steps from src. */
function walk(g: ConnectGraph, t: Tree, src: number, dst: number): ConnectPath {
  const steps: PathStep[] = []
  for (let cur = dst; cur !== src; cur = t.prev[cur]) {
    const arc = t.via[cur]!
    steps.push({ id: g.ids[cur], via: { kind: CONNECT_KINDS[arc.kind], dir: arc.dir } })
  }
  steps.push({ id: g.ids[src] })
  steps.reverse()
  return { steps, weight: t.weight[dst], links: t.links[dst] }
}

/** The same path read from the other end: steps in the opposite order, each link seen from its other side. */
function reversed(p: ConnectPath): ConnectPath {
  const n = p.steps.length
  const steps = p.steps.map((_, j) => {
    const id = p.steps[n - 1 - j].id
    return j === 0 ? { id } : { id, via: { kind: p.steps[n - j].via!.kind, dir: flip(p.steps[n - j].via!.dir) } }
  })
  return { steps, weight: p.weight, links: p.links }
}

/**
 * The cheapest chain of recorded relations from `from` to `to`: Dijkstra over `KIND_WEIGHT`, then fewer
 * links. Null when a sage is unknown or the two are in different components; a sage to himself is a path
 * of one step. Computed from the end that comes first in id order and reversed for the other, so the path
 * b to a is the path a to b read backwards.
 */
export function shortestPath(g: ConnectGraph, from: string, to: string): ConnectPath | null {
  const i = g.index.get(from), j = g.index.get(to)
  if (i === undefined || j === undefined) return null
  if (i === j) return { steps: [{ id: from }], weight: 0, links: 0 }
  const lo = Math.min(i, j), hi = Math.max(i, j)
  const t = treeFrom(g, lo)
  if (t.weight[hi] === Infinity) return null
  const p = walk(g, t, lo, hi)
  return i < j ? p : reversed(p)
}

/** `shortestPath(g, from, x)` for every other sage `x` he can reach. */
export function shortestPathsFrom(g: ConnectGraph, from: string): Map<string, ConnectPath> {
  const out = new Map<string, ConnectPath>()
  const i = g.index.get(from)
  if (i === undefined) return out
  const own = treeFrom(g, i)
  for (let j = 0; j < g.ids.length; j++) {
    if (j === i || own.weight[j] === Infinity) continue
    const p = shortestPath(g, from, g.ids[j])
    if (p) out.set(g.ids[j], p)
  }
  return out
}

/** The fewest links from `from` to each sage he can reach (breadth first, whatever the kinds), himself at 0. */
export function hopDistancesFrom(g: ConnectGraph, from: string): Map<string, number> {
  const out = new Map<string, number>()
  const i = g.index.get(from)
  if (i === undefined) return out
  const dist = new Int32Array(g.ids.length).fill(-1)
  dist[i] = 0
  const queue = [i]
  for (let k = 0; k < queue.length; k++) {
    const u = queue[k]
    out.set(g.ids[u], dist[u])
    for (const arc of g.adj[u]) {
      if (dist[arc.to] >= 0) continue
      dist[arc.to] = dist[u] + 1
      queue.push(arc.to)
    }
  }
  return out
}

/* ── Words ────────────────────────────────────────────────────────────── */

// A caption says what THIS sage is to the previous one, in front of the previous one's name. Hebrew agrees
// with the described sage (the `F` forms are for a woman); a family tie is not directed in words, as the data
// does not say whether he is a son or a grandson. Russian puts the name after a colon, unlike the Hebrew and
// English phrases, because a name in a case ending (Раши, Рамбам) cannot be declined by rule.
const S = {
  studentOf:      { he: 'תלמידו של ', en: 'Student of ', ru: 'Учился у: ' },
  studentOfF:     { he: 'תלמידתו של ', en: 'Student of ', ru: 'Училась у: ' },
  teacherOf:      { he: 'רבו של ', en: 'Teacher of ', ru: 'Учил: ' },
  teacherOfF:     { he: 'מורתו של ', en: 'Teacher of ', ru: 'Учила: ' },
  relativeOf:     { he: 'בן משפחתו של ', en: 'Relative of ', ru: 'Родственник: ' },
  relativeOfF:    { he: 'בת משפחתו של ', en: 'Relative of ', ru: 'Родственница: ' },
  successorOf:    { he: 'ממשיכו של ', en: 'Successor of ', ru: 'Преемник: ' },
  successorOfF:   { he: 'ממשיכתו של ', en: 'Successor of ', ru: 'Преемница: ' },
  predecessorOf:  { he: 'קודמו של ', en: 'Predecessor of ', ru: 'Предшественник: ' },
  predecessorOfF: { he: 'קודמתו של ', en: 'Predecessor of ', ru: 'Предшественница: ' },
  colleagueOf:    { he: 'חברו של ', en: 'Colleague of ', ru: 'Коллега: ' },
  colleagueOfF:   { he: 'חברתו של ', en: 'Colleague of ', ru: 'Коллега: ' },
  disputantOf:    { he: 'בר־פלוגתא של ', en: 'Disputant of ', ru: 'Оппонент: ' },
  disputantOfF:   { he: 'בת־פלוגתא של ', en: 'Disputant of ', ru: 'Оппонент: ' },
  influencedBy:   { he: 'הושפע מ־', en: 'Influenced by ', ru: 'Под влиянием: ' },
  influencedByF:  { he: 'הושפעה מ־', en: 'Influenced by ', ru: 'Под влиянием: ' },
  influenced:     { he: 'השפיע על ', en: 'Influenced ', ru: 'Повлиял на: ' },
  influencedF:    { he: 'השפיעה על ', en: 'Influenced ', ru: 'Повлияла на: ' },
} satisfies Record<string, Record<Locale, string>>

type CaptionKey = Exclude<keyof typeof S, `${string}F`>

/** Which phrase says this link, going from the previous sage to this one. */
const PHRASE: Record<ConnectKind, Record<StepDir, CaptionKey>> = {
  teacher:     { up: 'studentOf',   down: 'teacherOf',     none: 'studentOf' },
  family:      { up: 'relativeOf',  down: 'relativeOf',    none: 'relativeOf' },
  predecessor: { up: 'successorOf', down: 'predecessorOf', none: 'successorOf' },
  colleague:   { up: 'colleagueOf', down: 'colleagueOf',   none: 'colleagueOf' },
  oppose:      { up: 'disputantOf', down: 'disputantOf',   none: 'disputantOf' },
  influence:   { up: 'influencedBy', down: 'influenced',   none: 'influencedBy' },
}

/**
 * What a sage is to the previous one on a path ("Student of Rashi", "תלמידו של רש״י"). `prevName` is the
 * previous sage's name in `locale`; `feminine` is true when the sage being described is a woman.
 */
export function stepCaption(via: ConnectVia, prevName: string, locale: Locale, feminine = false): string {
  const key = PHRASE[via.kind][via.dir]
  const phrase = feminine ? S[`${key}F` as keyof typeof S] : S[key]
  return phrase[locale] + prevName
}

/* ── The net the browser holds ────────────────────────────────────────── */

/**
 * The sages that have at least one link, in id order, and the links between them. `period` is an index in
 * `ALL_PERIODS`, `kind` an index in `CONNECT_KINDS`; an edge's ends are indices into `sages`, in the data's
 * direction (the first is the teacher / elder / influencer / predecessor). `woman` is 1 for a woman.
 */
export interface ConnectNet {
  sages: Array<[id: string, name: string, period: number, woman?: 1]>
  edges: Array<[a: number, b: number, kind: number]>
}

/** The net of the sages `info` knows, minus those with no link. */
export function netFromGraph(g: ConnectGraph, info: (id: string) => { name: string; period: Period; woman?: boolean }): ConnectNet {
  const slot = new Map<number, number>()
  const sages: ConnectNet['sages'] = []
  g.ids.forEach((id, i) => {
    if (!g.adj[i].length) return
    const s = info(id)
    slot.set(i, sages.length)
    const period = Math.max(0, ALL_PERIODS.indexOf(s.period))
    sages.push(s.woman ? [id, s.name, period, 1] : [id, s.name, period])
  })
  const edges: ConnectNet['edges'] = g.edges.map(e => [slot.get(e.a)!, slot.get(e.b)!, e.kind])
  return { sages, edges }
}

/** The graph the net describes (a net with no sage twice and its edges' ends in range). */
export function graphFromNet(net: ConnectNet): ConnectGraph {
  const order = net.sages.map((_, i) => i).sort((p, q) => compareIds(net.sages[p][0], net.sages[q][0]))
  const slot = new Map(order.map((old, i) => [old, i]))
  const ids = order.map(old => net.sages[old][0])
  const edges: Edge[] = []
  for (const [x, y, kind] of net.edges) {
    const a = slot.get(x), b = slot.get(y)
    if (a === undefined || b === undefined || a === b || !CONNECT_KINDS[kind]) continue
    edges.push({ a, b, kind })
  }
  return makeGraph(ids, edges)
}

/** A sage on a path as the screens show him. */
export interface PathView { id: string; name: string; period: Period; caption: string | null; dotted: boolean }

/** A path as the screens show it: names and eras from the net, a caption for every step but the first, and whether the way in is an influence (drawn dotted). */
export function describePath(net: ConnectNet, path: ConnectPath, locale: Locale): PathView[] {
  const at = new Map(net.sages.map((s, i) => [s[0], i]))
  const row = (id: string) => {
    const i = at.get(id)
    if (i === undefined) throw new Error(`describePath: ${id} is not in the net`)
    return net.sages[i]
  }
  return path.steps.map((step, k) => {
    const [id, name, period, woman] = row(step.id)
    const prev = k > 0 ? row(path.steps[k - 1].id) : null
    return {
      id,
      name,
      period: ALL_PERIODS[period] ?? ALL_PERIODS[0],
      caption: step.via && prev ? stepCaption(step.via, prev[1], locale, woman === 1) : null,
      dotted: step.via?.kind === 'influence',
    }
  })
}
