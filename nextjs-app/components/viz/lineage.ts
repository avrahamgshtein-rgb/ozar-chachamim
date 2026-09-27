// Lineage model for the "עץ שושלות" tab: which links count as lineage, which
// way each one points, the focus-centred tree built from them, and the two
// layouts (a tidy top-down tree, and an indented outline for narrow screens).
// Pure functions only: no React, no DOM, so it can be exercised from a script.

import type { Connection, Sage } from '@/lib/types'
import { ALL_PERIODS } from '@/lib/types'
import { regionsOf } from '@/lib/regions'

/** The four link types that describe descent. `student` folds into `teacher`. */
export type LineageKind = 'teacher' | 'predecessor' | 'family' | 'influence'
export const LINEAGE_KINDS: LineageKind[] = ['teacher', 'predecessor', 'family', 'influence']
const RANK: Record<LineageKind, number> = { teacher: 0, predecessor: 1, family: 2, influence: 3 }
const ERA_INDEX = new Map(ALL_PERIODS.map((p, i) => [p, i]))

/** A neighbour one generation up or down, and the kind of link to it. */
export interface Rel {
  id: string
  kind: LineageKind
  /** The data had this link pointing back in time; it is shown in chronological order. */
  reoriented: boolean
}

export interface LineageIndex {
  /** Who stands above a sage: teachers, influencers, predecessors, elder relatives. */
  up: Map<string, Rel[]>
  /** Who stands below: students, the influenced, successors, younger relatives. */
  down: Map<string, Rel[]>
  /** Distinct lineage neighbours per sage, over all kinds. */
  degree: Map<string, number>
  /** Links whose stored direction contradicted the sages' dates. */
  reoriented: number
}

/**
 * A single sortable year for a sage, or null when undated. A century-only
 * date is a window, so its middle is the fair point; a lone death year stands
 * in for a birth a lifetime earlier.
 */
export function chronoYear(s: Sage | undefined): number | null {
  if (!s) return null
  const b = s.birth_year, d = s.death_year
  if (b == null && d == null) return null
  if (s.date_precision === 'century') {
    if (b != null && d != null) return (b + d) / 2
    return (b ?? d!) + 50
  }
  if (b != null) return b
  return d! - 60
}

/** More than a generation apart: close enough to be contemporaries otherwise. */
const GENERATION = 25

/**
 * Orient every lineage link as upper → lower.
 *
 *   teacher      source is the teacher of target      → source above
 *   student      source is the student of target      → target above
 *   influence    source influenced target             → source above
 *   predecessor  source preceded target (succession)  → source above
 *   family       source is the elder relative         → source above
 *
 * Influence links are often stored the wrong way round (the spreadsheet
 * records "who influenced this sage" and "whom this sage influenced" in the
 * same column), so a link whose upper end was born more than a generation
 * after its lower end (or, when either is undated, belongs to a later era)
 * is drawn in chronological order instead. Nothing is
 * added or dropped: only the direction of a link the data already holds.
 * When one pair has several links, the strongest kind wins (teacher first).
 */
export function buildLineageIndex(sageMap: Map<string, Sage>, connections: Connection[]): LineageIndex {
  const pairs = new Map<string, { up: string; down: string; kind: LineageKind; reoriented: boolean }>()
  for (const c of connections) {
    let kind: LineageKind
    let up = c.source, down = c.target
    switch (c.type) {
      case 'teacher': kind = 'teacher'; break
      case 'student': kind = 'teacher'; up = c.target; down = c.source; break
      case 'influence':
      case 'predecessor':
      case 'family': kind = c.type; break
      default: continue
    }
    if (up === down || !sageMap.has(up) || !sageMap.has(down)) continue
    const su = sageMap.get(up)!, sd = sageMap.get(down)!
    const yu = chronoYear(su), yd = chronoYear(sd)
    const reoriented = yu != null && yd != null
      ? yu - yd > GENERATION
      // Undated: fall back to the era order (Ruth stands above King David).
      : (ERA_INDEX.get(su.period) ?? 0) > (ERA_INDEX.get(sd.period) ?? 0)
    if (reoriented) [up, down] = [down, up]
    const key = up < down ? `${up}|${down}` : `${down}|${up}`
    const prev = pairs.get(key)
    if (!prev || RANK[kind] < RANK[prev.kind]) pairs.set(key, { up, down, kind, reoriented })
  }

  const up = new Map<string, Rel[]>(), down = new Map<string, Rel[]>(), degree = new Map<string, number>()
  let reoriented = 0
  const push = (m: Map<string, Rel[]>, k: string, r: Rel) => {
    const list = m.get(k)
    if (list) list.push(r)
    else m.set(k, [r])
  }
  for (const p of pairs.values()) {
    push(up, p.down, { id: p.up, kind: p.kind, reoriented: p.reoriented })
    push(down, p.up, { id: p.down, kind: p.kind, reoriented: p.reoriented })
    degree.set(p.up, (degree.get(p.up) ?? 0) + 1)
    degree.set(p.down, (degree.get(p.down) ?? 0) + 1)
    if (p.reoriented) reoriented++
  }
  return { up, down, degree, reoriented }
}

/** Lineage degree counting only the enabled kinds. */
export function degreeOf(idx: LineageIndex, id: string, kinds: Set<LineageKind>): number {
  let n = 0
  for (const r of idx.up.get(id) ?? []) if (kinds.has(r.kind)) n++
  for (const r of idx.down.get(id) ?? []) if (kinds.has(r.kind)) n++
  return n
}

/* ── Tree ─────────────────────────────────────────────────────────────── */

export type NodeType = 'focus' | 'sage' | 'repeat' | 'more'
export type Side = 'up' | 'down' | 'root'

export interface LNode {
  /** Unique render key. A sage shown in full is keyed by its id, so it keeps its element across refocus. */
  key: string
  /** The sage (for 'more', the sage whose extra relations are folded away). */
  id: string
  type: NodeType
  side: Side
  /** The link to the tree parent (the neighbour one step closer to the focus). */
  kind: LineageKind | null
  depth: number
  parent: LNode | null
  children: LNode[]
  /** 'more' only: how many relations are folded. */
  hidden?: number
}

export interface LineageTree {
  focus: string
  up: LNode
  down: LNode
  /** Sages shown in full above / below the focus. */
  counts: { up: number; down: number; repeats: number }
  /** The focus's own relations by kind (enabled kinds only). */
  direct: { up: Record<LineageKind, number>; down: Record<LineageKind, number> }
}

export interface TreeOptions {
  depth: number
  kinds: Set<LineageKind>
  /** "+N" groups the reader opened, keyed `${side}:${parentKey}`. */
  expanded: Set<string>
  /** How many children a node shows before folding the rest into "+N". */
  cap: (generation: number) => number
  /** Tie-break for which relations stay visible: richer lineage first. */
  weight: (id: string) => number
  chrono: (id: string) => number | null
  name: (id: string) => string
}

const zeroKinds = (): Record<LineageKind, number> => ({ teacher: 0, predecessor: 0, family: 0, influence: 0 })

/**
 * Walk out from the focus one generation at a time, up and down in step, so
 * the closer relation always claims a sage first. A sage reached a second time
 * (a DAG merge, or a cycle back to someone already shown) becomes a small
 * "repeat" reference and is not expanded again, so the walk always ends.
 */
export function buildLineageTree(idx: LineageIndex, focus: string, o: TreeOptions): LineageTree {
  const seen = new Set<string>([focus])
  const root = (): LNode => ({ key: focus, id: focus, type: 'focus', side: 'root', kind: null, depth: 0, parent: null, children: [] })
  const upRoot = root(), downRoot = root()
  const counts = { up: 0, down: 0, repeats: 0 }
  const direct = { up: zeroKinds(), down: zeroKinds() }
  for (const r of idx.up.get(focus) ?? []) if (o.kinds.has(r.kind)) direct.up[r.kind]++
  for (const r of idx.down.get(focus) ?? []) if (o.kinds.has(r.kind)) direct.down[r.kind]++

  const grow = (front: LNode[], side: 'up' | 'down', gen: number): LNode[] => {
    const next: LNode[] = []
    for (const p of front) {
      const rels = ((side === 'up' ? idx.up : idx.down).get(p.id) ?? []).filter(r => o.kinds.has(r.kind))
      if (!rels.length) continue
      // Who stays visible: new sages before repeats, strong links before
      // influence, then the richest lineage.
      const ranked = rels
        .map(r => ({ r, fresh: !seen.has(r.id) }))
        .sort((a, b) =>
          Number(b.fresh) - Number(a.fresh) ||
          RANK[a.r.kind] - RANK[b.r.kind] ||
          o.weight(b.r.id) - o.weight(a.r.id))
      const groupKey = `${side}:${p.key}`
      const cap = o.expanded.has(groupKey) ? Infinity : Math.max(2, o.cap(gen))
      // A folded group keeps one slot for its "+N" chip, so it never exceeds the cap.
      const shown = ranked.length > cap ? ranked.slice(0, cap - 1) : ranked
      const folded = ranked.length - shown.length

      // Display order: strong links first, then oldest to youngest.
      shown.sort((a, b) =>
        RANK[a.r.kind] - RANK[b.r.kind] ||
        (o.chrono(a.r.id) ?? Infinity) - (o.chrono(b.r.id) ?? Infinity) ||
        o.name(a.r.id).localeCompare(o.name(b.r.id), 'he'))

      for (const { r } of shown) {
        if (!seen.has(r.id)) {
          seen.add(r.id)
          const n: LNode = { key: r.id, id: r.id, type: 'sage', side, kind: r.kind, depth: gen, parent: p, children: [] }
          p.children.push(n)
          next.push(n)
          counts[side]++
        } else {
          p.children.push({ key: `r:${side}:${p.key}:${r.id}`, id: r.id, type: 'repeat', side, kind: r.kind, depth: gen, parent: p, children: [] })
          counts.repeats++
        }
      }
      if (folded > 0) {
        p.children.push({ key: `m:${groupKey}`, id: p.id, type: 'more', side, kind: null, depth: gen, parent: p, children: [], hidden: folded })
      }
    }
    return next
  }

  let fu = [upRoot], fd = [downRoot]
  for (let g = 1; g <= o.depth; g++) {
    fu = grow(fu, 'up', g)
    fd = grow(fd, 'down', g)
  }
  return { focus, up: upRoot, down: downRoot, counts, direct }
}

/* ── Layout ───────────────────────────────────────────────────────────── */

export type LayoutMode = 'tree' | 'outline'

export interface PlacedNode {
  key: string
  node: LNode
  /** Box centre. */
  x: number
  y: number
  w: number
  h: number
  /** The name, wrapped to fit the box. */
  lines: string[]
  parentKey: string | null
}

export interface PlacedEdge {
  /** Keyed by the child it leads to; stems by `s:` + their parent. */
  key: string
  kind: LineageKind | null
  childKey: string | null
  parentKey: string
  /** A polyline, or a cubic Bézier when `curve` (exactly four points). */
  pts: [number, number][]
  curve: boolean
}

export interface Layout {
  mode: LayoutMode
  nodes: PlacedNode[]
  edges: PlacedEdge[]
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

export interface LayoutOptions {
  mode: LayoutMode
  rtl: boolean
  /** Canvas width; the outline sizes its rows to it. */
  width: number
  /** Width of `text` in the given CSS font. */
  measure: (text: string, font: string) => number
  label: (n: LNode) => string
  fonts: { name: string; focus: string; stub: string }
}

// Tree metrics
const T = {
  w: 176, h: 58, fw: 212, fh: 68, sw: 148, sh: 36,
  hgap: 18, vgap: 72,
  stackMin: 3, stackRows: 4, stackGap: 10, rail: 18,
}
// Outline metrics
const O = { indent: 26, rowGap: 8, h: 44, fh: 54, sh: 34, maxW: 380, spine: 11 }

/** Greedy word wrap into at most `max` lines; the last line ellipsised if it overflows. */
function wrap(text: string, width: number, max: number, font: string, measure: LayoutOptions['measure']): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (let i = 0; i < words.length; i++) {
    const trial = cur ? `${cur} ${words[i]}` : words[i]
    if (measure(trial, font) <= width || !cur) {
      cur = trial
      continue
    }
    lines.push(cur)
    cur = words[i]
    if (lines.length === max - 1) {
      cur = words.slice(i).join(' ')
      break
    }
  }
  if (cur) lines.push(cur)
  // The last line holds the remainder, and a single word can outrun any line.
  return lines.slice(0, max).map(line => {
    if (measure(line, font) <= width) return line
    let s = line
    while (s.length > 1 && measure(s + '…', font) > width) s = s.slice(0, -1)
    return s.trimEnd() + '…'
  })
}

interface Box { w: number; h: number; lines: string[] }

function treeBox(n: LNode, o: LayoutOptions): Box {
  if (n.type === 'focus') return { w: T.fw, h: T.fh, lines: wrap(o.label(n), T.fw - 40, 2, o.fonts.focus, o.measure) }
  if (n.type === 'sage') return { w: T.w, h: T.h, lines: wrap(o.label(n), T.w - 36, 2, o.fonts.name, o.measure) }
  return { w: T.sw, h: T.sh, lines: wrap(o.label(n), T.sw - 24, 1, o.fonts.stub, o.measure) }
}

export function layoutTree(t: LineageTree, o: LayoutOptions): Layout {
  return o.mode === 'outline' ? layoutOutline(t, o) : layoutTidy(t, o)
}

/**
 * Top-down tidy tree, ancestors mirrored above the focus. Each subtree is as
 * wide as its children's row; a node with more than a few childless children
 * stacks them in columns hanging off a rail (org-chart style), which keeps a
 * sage with forty students from turning into one 7,000px row.
 */
function layoutTidy(t: LineageTree, o: LayoutOptions): Layout {
  const boxes = new Map<LNode, Box>()
  const width = new Map<LNode, number>()
  const stacked = new Map<LNode, { leaves: LNode[]; branches: LNode[]; cols: number; rows: number; w: number }>()
  const nodes: PlacedNode[] = []
  const edges: PlacedEdge[] = []
  const step = T.h + T.vgap

  const measureSub = (n: LNode): number => {
    const box = treeBox(n, o)
    boxes.set(n, box)
    if (!n.children.length) {
      width.set(n, box.w)
      return box.w
    }
    n.children.forEach(measureSub)
    const leaves = n.children.filter(c => !c.children.length)
    const branches = n.children.filter(c => c.children.length)
    let row = 0, items = 0
    if (leaves.length >= T.stackMin) {
      const cols = Math.ceil(leaves.length / T.stackRows)
      const rows = Math.ceil(leaves.length / cols)
      const w = cols * (T.rail + T.w) + (cols - 1) * T.hgap
      stacked.set(n, { leaves, branches, cols, rows, w })
      row += w
      items++
      for (const b of branches) { row += width.get(b)!; items++ }
    } else {
      for (const c of n.children) { row += width.get(c)!; items++ }
    }
    row += Math.max(0, items - 1) * T.hgap
    const w = Math.max(box.w, row)
    width.set(n, w)
    return w
  }

  // Stacked leaves hang below their generation's row, so `y` is passed in.
  const place = (n: LNode, cx: number, y: number, sign: 1 | -1, parentKey: string | null) => {
    const box = boxes.get(n)!
    if (n.type !== 'focus' || sign === 1) {
      nodes.push({ key: n.key, node: n, x: cx, y, w: box.w, h: box.h, lines: box.lines, parentKey })
    }
    if (!n.children.length) return
    const edgeY = y + sign * box.h / 2
    const st = stacked.get(n)
    let cursor = cx - rowWidth(n) / 2
    const curveTo = (c: LNode, ccx: number) => {
      const cb = boxes.get(c)!
      const cy = sign * c.depth * step
      const y0 = edgeY, y3 = cy - sign * cb.h / 2, mid = (y0 + y3) / 2
      edges.push({ key: `e:${c.key}`, kind: c.kind, childKey: c.key, parentKey: n.key, curve: true, pts: [[cx, y0], [cx, mid], [ccx, mid], [ccx, y3]] })
    }
    const kids = st ? st.branches : n.children
    for (const c of kids) {
      const cw = width.get(c)!
      const ccx = cursor + cw / 2
      curveTo(c, ccx)
      place(c, ccx, sign * c.depth * step, sign, n.key)
      cursor += cw + T.hgap
    }
    if (st) {
      const busY = edgeY + sign * T.vgap / 2
      const rails: number[] = []
      st.leaves.forEach((leaf, i) => {
        const col = Math.floor(i / st.rows), r = i % st.rows
        const slotX = cursor + col * (T.rail + T.w + T.hgap)
        const lb = boxes.get(leaf)!
        const railX = slotX + T.rail / 2
        const lx = slotX + T.rail + lb.w / 2
        const ly = sign * ((n.depth + 1) * step + r * (T.h + T.stackGap))
        rails[col] = railX
        const from = r === 0 ? busY : sign * ((n.depth + 1) * step + (r - 1) * (T.h + T.stackGap))
        edges.push({ key: `e:${leaf.key}`, kind: leaf.kind, childKey: leaf.key, parentKey: n.key, curve: false,
          pts: [[railX, from], [railX, ly], [slotX + T.rail, ly]] })
        place(leaf, lx, ly, sign, n.key)
      })
      // The shared stem and bus, drawn once in a neutral stroke.
      const xs = [cx, ...rails]
      edges.push({ key: `s:${sign}:${n.key}`, kind: null, childKey: null, parentKey: n.key, curve: false,
        pts: [[cx, edgeY], [cx, busY], [Math.min(...xs), busY], [Math.max(...xs), busY]] })
    }
  }

  const rowWidth = (n: LNode): number => {
    const st = stacked.get(n)
    const items = st ? [st.w, ...st.branches.map(b => width.get(b)!)] : n.children.map(c => width.get(c)!)
    return items.reduce((s, w) => s + w, 0) + Math.max(0, items.length - 1) * T.hgap
  }

  measureSub(t.up)
  measureSub(t.down)
  place(t.down, 0, 0, 1, null)
  place(t.up, 0, 0, -1, null)
  return finish('tree', nodes, edges, o.rtl)
}

/**
 * Indented outline for narrow screens: one row per sage, generations stepping
 * inwards. Ancestors are mirrored: each teacher's own teachers sit just above
 * him, one step further in, so the focus is the only row flush to the margin.
 * Every child's connector starts where its previous sibling's ended, so dashed
 * and dotted links never overdraw each other on the shared spine.
 */
function layoutOutline(t: LineageTree, o: LayoutOptions): Layout {
  const avail = Math.max(240, o.width - 24)
  const nodes: PlacedNode[] = []
  const edges: PlacedEdge[] = []
  const rows: { n: LNode; parentKey: string | null }[] = []

  const emitUp = (n: LNode, parentKey: string) => {
    for (const c of n.children) emitUp(c, n.key)
    rows.push({ n, parentKey })
  }
  const emitDown = (n: LNode, parentKey: string) => {
    rows.push({ n, parentKey })
    for (const c of n.children) emitDown(c, n.key)
  }
  for (const c of t.up.children) emitUp(c, t.focus)
  const focusRow = rows.length
  rows.push({ n: t.down, parentKey: null })
  for (const c of t.down.children) emitDown(c, t.focus)

  const heightOf = (n: LNode) => (n.type === 'focus' ? O.fh : n.type === 'sage' ? O.h : O.sh)
  // Row centres, measured from the focus row.
  const ys: number[] = new Array(rows.length)
  ys[focusRow] = 0
  for (let i = focusRow + 1; i < rows.length; i++) {
    ys[i] = ys[i - 1] + heightOf(rows[i - 1].n) / 2 + O.rowGap + heightOf(rows[i].n) / 2
  }
  for (let i = focusRow - 1; i >= 0; i--) {
    ys[i] = ys[i + 1] - heightOf(rows[i + 1].n) / 2 - O.rowGap - heightOf(rows[i].n) / 2
  }

  const placed = new Map<string, PlacedNode>()
  rows.forEach(({ n, parentKey }, i) => {
    const x0 = n.depth * O.indent
    const room = Math.min(O.maxW, avail - x0)
    const h = heightOf(n)
    let w: number
    let lines: string[]
    if (n.type === 'focus' || n.type === 'sage') {
      const font = n.type === 'focus' ? o.fonts.focus : o.fonts.name
      w = room
      lines = wrap(o.label(n), w - 36, 1, font, o.measure)
    } else {
      lines = wrap(o.label(n), Math.min(room, 240) - 24, 1, o.fonts.stub, o.measure)
      w = Math.min(room, Math.max(96, o.measure(lines[0] ?? '', o.fonts.stub) + 30))
    }
    const p: PlacedNode = { key: n.key, node: n, x: x0 + w / 2, y: ys[i], w, h, lines, parentKey }
    nodes.push(p)
    placed.set(n.key, p)
  })

  // Connectors: spine at the parent's inner margin, a tick into each child.
  const link = (parent: LNode, sign: 1 | -1) => {
    const pp = placed.get(parent.key)!
    const spineX = parent.depth * O.indent + O.spine
    // Down: children run top to bottom. Up: the nearest child is the last one.
    const kids = sign === 1 ? parent.children : [...parent.children].reverse()
    let from = pp.y + sign * pp.h / 2
    for (const c of kids) {
      const cp = placed.get(c.key)!
      edges.push({ key: `e:${c.key}`, kind: c.kind, childKey: c.key, parentKey: parent.key, curve: false,
        pts: [[spineX, from], [spineX, cp.y], [c.depth * O.indent, cp.y]] })
      from = cp.y
      link(c, sign)
    }
  }
  link(t.up, -1)
  link(t.down, 1)
  return finish('outline', nodes, edges, o.rtl)
}

/** Mirror for RTL, order for keyboard (focus, ancestors, descendants), measure the bounds. */
function finish(mode: LayoutMode, nodes: PlacedNode[], edges: PlacedEdge[], rtl: boolean): Layout {
  const rank = (n: PlacedNode) => (n.node.type === 'focus' ? 0 : n.node.side === 'up' ? 1 : 2)
  nodes.sort((a, b) => rank(a) - rank(b))
  if (rtl) {
    for (const n of nodes) n.x = -n.x
    for (const e of edges) e.pts = e.pts.map(([x, y]) => [-x, y] as [number, number])
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const n of nodes) {
    x0 = Math.min(x0, n.x - n.w / 2); x1 = Math.max(x1, n.x + n.w / 2)
    y0 = Math.min(y0, n.y - n.h / 2); y1 = Math.max(y1, n.y + n.h / 2)
  }
  if (!nodes.length) x0 = y0 = x1 = y1 = 0
  return { mode, nodes, edges, bbox: { x0, y0, x1, y1 } }
}

/* ── Suggestions ──────────────────────────────────────────────────────── */

/**
 * Sages near `focus` (same era and region first, then closest in time) who do
 * have lineage links, for the empty state.
 */
export function nearbyWithLineage(focus: Sage, sages: Sage[], idx: LineageIndex, kinds: Set<LineageKind>, limit = 6): Sage[] {
  const fy = chronoYear(focus)
  const fe = ERA_INDEX.get(focus.period) ?? 0
  const fr = new Set(regionsOf(focus.location))
  if (focus.region) fr.add(focus.region)
  return sages
    .filter(s => s.id !== focus.id && degreeOf(idx, s.id, kinds) > 0)
    .map(s => {
      const y = chronoYear(s)
      const eraGap = Math.abs((ERA_INDEX.get(s.period) ?? 0) - fe)
      const years = fy != null && y != null ? Math.abs(fy - y) : 150 + eraGap * 200
      const sameRegion = regionsOf(s.location).some(r => fr.has(r)) || (!!s.region && fr.has(s.region))
      return { s, score: eraGap * 400 + years - (sameRegion ? 120 : 0) - Math.min(degreeOf(idx, s.id, kinds), 10) * 4 }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(x => x.s)
}

/**
 * Starting points for the preset chips: the richest lineages, plus the longest
 * teacher/succession/family chains (which influence counts alone would bury).
 */
export function lineagePresets(idx: LineageIndex, limit = 8): string[] {
  const strong = new Set<LineageKind>(['teacher', 'predecessor', 'family'])
  const score = (id: string) => {
    let s = 0
    for (const r of [...(idx.up.get(id) ?? []), ...(idx.down.get(id) ?? [])]) s += strong.has(r.kind) ? 3 : 1
    return s
  }
  const reach = (id: string) => {
    const seen = new Set([id])
    for (const m of [idx.up, idx.down]) {
      let front = [id]
      for (let g = 0; g < 4; g++) {
        const next: string[] = []
        for (const x of front) for (const r of m.get(x) ?? []) {
          if (strong.has(r.kind) && !seen.has(r.id)) { seen.add(r.id); next.push(r.id) }
        }
        front = next
      }
    }
    return seen.size - 1
  }
  const ids = [...idx.degree.keys()]
  const rich = [...ids].sort((a, b) => score(b) - score(a)).slice(0, limit - 2)
  const chains = [...ids]
    .filter(id => !rich.includes(id))
    .map(id => ({ id, r: reach(id) }))
    .filter(x => x.r >= 3)
    // The best-known member of each chain: King David rather than Deborah.
    .sort((a, b) => score(b.id) - score(a.id) || b.r - a.r)
  // One chip per chain: skip a sage already reachable from a chosen one.
  const picked: string[] = []
  for (const c of chains) {
    if (picked.length >= limit - rich.length) break
    const covered = [...rich, ...picked].some(p => sharesChain(idx, p, c.id))
    if (!covered) picked.push(c.id)
  }
  return [...rich, ...picked]
}

function sharesChain(idx: LineageIndex, a: string, b: string): boolean {
  const strong = new Set<LineageKind>(['teacher', 'predecessor', 'family'])
  const seen = new Set([a])
  let front = [a]
  for (let g = 0; g < 6 && front.length; g++) {
    const next: string[] = []
    for (const x of front) for (const r of [...(idx.up.get(x) ?? []), ...(idx.down.get(x) ?? [])]) {
      if (strong.has(r.kind) && !seen.has(r.id)) { seen.add(r.id); next.push(r.id) }
    }
    front = next
  }
  return seen.has(b)
}
