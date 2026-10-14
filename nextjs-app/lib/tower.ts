// The "Tower of Generations": every sage placed in 3D, height by time and direction by region,
// so the movement of Torah between centres (Eretz Israel, Babylon, Spain, Ashkenaz, Eastern
// Europe, back to the Land) shows as a spiral climbing the tower. Pure and deterministic: the
// page computes it on the server and the client only draws it (components/tower/TowerScene.tsx).
import type { Connection, Locale, Period, Region, Sage } from './types'
import { ALL_PERIODS, ERA_COLORS, ERA_LABELS, REGION_LABELS } from './types'
import { regionsOf } from './regions'
import { buildLineageIndex, chronoYear, type LineageKind } from '@/components/viz/lineage'
import { buildSinaiIndex } from './sinaiPath'
import { labelParts } from './displayName'
import { formatYearRangeFor } from './utils'

/** Around the tower, neighbours on the map are neighbours on the circle. */
export const TOWER_REGIONS: Region[] = [
  'eretz-israel', 'mizrach', 'north-africa', 'sefarad', 'provence',
  'tsarfat', 'italy', 'ashkenaz', 'east-europe', 'other',
]

/** Where an undated sage stands: the middle of his era. */
const ERA_YEAR: Record<Period, number> = {
  patriarchs: -1750, exodus: -1300, judges: -1150, kings: -800, 'second-temple': -250,
  tannaim: 100, amoraim: 350, geonim: 800, rishonim: 1250, acharonim: 1650, modern: 1900,
}

/** Undated and placeless sages: the centre of Torah of their era. */
const ERA_REGION: Partial<Record<Period, Region>> = {
  patriarchs: 'eretz-israel', exodus: 'eretz-israel', judges: 'eretz-israel', kings: 'eretz-israel',
  'second-temple': 'eretz-israel', tannaim: 'eretz-israel', amoraim: 'mizrach', geonim: 'mizrach',
}

/**
 * Year → height (0 at Abraham, TOWER_HEIGHT today). Piecewise linear: the 3,700 years are not
 * equally full, so the centuries that hold most of the sages get most of the height.
 */
export const TOWER_HEIGHT = 100
const STOPS: Array<[number, number]> = [
  [-2000, 0], [-1200, 7], [-500, 13], [0, 19], [500, 27], [1000, 35], [1500, 55], [1800, 73], [2030, TOWER_HEIGHT],
]

export function heightOf(year: number): number {
  if (year <= STOPS[0][0]) return 0
  for (let i = 1; i < STOPS.length; i++) {
    const [y1, h1] = STOPS[i]
    if (year <= y1) {
      const [y0, h0] = STOPS[i - 1]
      return h0 + ((year - y0) / (y1 - y0)) * (h1 - h0)
    }
  }
  return TOWER_HEIGHT
}

/** A stable number in [0, 1) from a string, so a sage keeps his place from build to build. */
function hash01(s: string, salt: number): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 100000) / 100000
}

export type TowerLinkKind = 'teacher' | 'family' | 'influence' | 'other'

export interface TowerNode {
  id: string
  name: string
  /** The name without its epithet or subtitle, for the labels in the scene. */
  short: string
  era: Period
  region: Region
  /** The year the tower places him at; `dated` false when it is his era's middle. */
  year: number
  dated: boolean
  years: string
  x: number
  y: number
  z: number
  size: number
  color: string
  degree: number
  research: boolean
  /** Drawn with a name from the start (the most connected sages). */
  landmark: boolean
  /** 1 for the most connected sage, 2 for the next…; 0 when not a landmark. */
  rank: number
  /** Hebrew agrees in gender ("תלמידתו של"): women carry the 'נשים' tag. */
  feminine?: boolean
}

export interface TowerLink {
  /** For a teacher link the teacher, for family the elder, for influence the one who influenced. */
  a: string
  b: string
  kind: TowerLinkKind
}

export interface TowerData {
  nodes: TowerNode[]
  links: TowerLink[]
  eras: Array<{ era: Period; label: string; color: string; from: number; to: number }>
  regions: Array<{ region: Region; label: string; angle: number }>
  minYear: number
  maxYear: number
  /** The road to Sinai (buildTowerRoad), added by the page; absent in a bare layout. */
  road?: TowerRoad
}

/**
 * "הדרך לסיני" in the tower: the same road the sage page's card and the lineage tab draw
 * (lib/sinaiPath.ts), shipped compactly so the scene can fly it for any sage: each sage's next
 * step up, and the stations of the Rambam's chain (with Rav Sherira's continuation).
 */
export interface TowerRoad {
  /** For every sage whose road runs through the archive: the next sage up and the kind of link. */
  up: Record<string, [string, LineageKind]>
  /** Everyone on the chain, by the generation where his road joins it; alongside: named with that station's people. */
  entry: Record<string, [number, boolean]>
  /** Moses first. */
  stations: TowerRoadStation[]
}

export interface TowerRoadStation {
  gen: number
  /** Past Rav Ashi the stations follow Rav Sherira Gaon's epistle, not the Rambam's count. */
  sherira: boolean
  /** The station's name in the page's language ("הלל ושמאי"). */
  name: string
  /** Named for several people, so a sage the road enters through is shown by his own name. */
  group: boolean
  /** The corpus sage at the station, when one is. */
  id: string | null
  /**
   * Where the thread passes the station: the sage's own place, or, for a station nobody in the
   * corpus stands for (Joshua, Eli, Elijah…), a point between its neighbours on the road. Never
   * shown as a date.
   */
  x: number
  y: number
  z: number
}

/** One point of a road as the scene flies it: the sage first, Moses last. */
export interface RoadPoint {
  /** The corpus sage here, or null for a station shown by name only. */
  id: string | null
  name: string
  /** Chain stations: the Rambam's generation (41–45: Rav Sherira's). */
  gen?: number
  sherira?: boolean
  /** How this point received from the next one (the older): 'sinai' at Moses. */
  how: 'sinai' | 'chain' | LineageKind
  /** Where the road joins the chain through someone the Rambam names alongside a station: that station's name. */
  alongside?: string
  /** A chain station named for several people and shown by that name: no one person's years under it. */
  group?: boolean
  x: number
  y: number
  z: number
}

const SECTOR = (2 * Math.PI) / TOWER_REGIONS.length

/** The tower, opened on a sage when one is given: `/he/tower/41`, the link his page and a share carry. */
export function towerPath(locale: Locale, id?: string | null): string {
  return id ? `/${locale}/tower/${encodeURIComponent(id)}` : `/${locale}/tower`
}

/** The angle at the middle of a region's sector. */
export function regionAngle(region: Region): number {
  return TOWER_REGIONS.indexOf(region) * SECTOR
}

/** "הרשב״א (רבי שלמה בן אדרת)" → "הרשב״א"; "The Rashba (Rabbi Shlomo ben Aderet)" → "The Rashba". */
export function shortName(name: string): string {
  const s = name.replace(/\s*\([^)]*\)\s*/g, ' ').split(/\s+[–—-]\s+/)[0].trim()
  return s || name
}

function linkKind(type: Connection['type']): TowerLinkKind {
  if (type === 'teacher' || type === 'student') return 'teacher'
  if (type === 'family') return 'family'
  if (type === 'influence') return 'influence'
  return 'other'
}

export function buildTower(sages: Sage[], connections: Connection[], locale: Locale, landmarks = 16): TowerData {
  const byId = new Map(sages.map(s => [s.id, s]))
  const degree = new Map<string, number>()
  const links: TowerLink[] = []
  const seen = new Set<string>()
  for (const c of connections) {
    if (!byId.has(c.source) || !byId.has(c.target) || c.source === c.target) continue
    const kind = linkKind(c.type)
    // `student` names its source the student: the tower always stores the teacher first
    const [a, b] = c.type === 'student' ? [c.target, c.source] : [c.source, c.target]
    const key = `${kind}|${a}|${b}`
    if (seen.has(key)) continue
    seen.add(key)
    links.push({ a, b, kind })
    degree.set(a, (degree.get(a) ?? 0) + 1)
    degree.set(b, (degree.get(b) ?? 0) + 1)
  }

  const rankOf = new Map(
    [...sages].sort((p, q) => (degree.get(q.id) ?? 0) - (degree.get(p.id) ?? 0) || p.id.localeCompare(q.id))
      .slice(0, landmarks).map((s, i) => [s.id, i + 1]),
  )

  const nodes: TowerNode[] = sages.map(s => {
    const cy = chronoYear(s)
    const year = cy ?? ERA_YEAR[s.period] ?? 1500
    const region = regionsOf(s.location)[0] ?? ERA_REGION[s.period] ?? 'other'
    const y = heightOf(year)
    // a cone that widens with time, as the number of sages does
    const radius = 7 + 0.17 * y + 5 * hash01(s.id, 1)
    const angle = regionAngle(region) + (hash01(s.id, 2) - 0.5) * SECTOR * 0.8
    const deg = degree.get(s.id) ?? 0
    const years = formatYearRangeFor(locale, s.birth_year, s.death_year, s.date_precision)
    const name = labelParts(s.label).name
    return {
      id: s.id,
      name,
      short: shortName(name),
      era: s.period,
      region,
      year,
      dated: cy != null,
      years,
      x: Math.cos(angle) * radius,
      y,
      z: Math.sin(angle) * radius,
      size: 0.32 + 0.11 * Math.sqrt(deg),
      color: ERA_COLORS[s.period] ?? '#c9973a',
      degree: deg,
      research: Boolean(s.has_research),
      landmark: rankOf.has(s.id),
      rank: rankOf.get(s.id) ?? 0,
      ...(s.tags?.includes('נשים') ? { feminine: true } : {}),
    }
  })

  const eras = ALL_PERIODS.map(era => {
    const ys = nodes.filter(n => n.era === era).map(n => n.y)
    return ys.length
      ? { era, label: ERA_LABELS[era][locale], color: ERA_COLORS[era], from: Math.min(...ys), to: Math.max(...ys) }
      : null
  }).filter((e): e is NonNullable<typeof e> => e !== null)

  return {
    nodes,
    links,
    eras,
    regions: TOWER_REGIONS.map(region => ({ region, label: REGION_LABELS[region][locale], angle: regionAngle(region) })),
    minYear: Math.min(...nodes.map(n => n.year)),
    maxYear: Math.max(...nodes.map(n => n.year)),
  }
}

/**
 * A sage's line of transmission: his teachers' teachers up, his students' students down, and
 * his family, as far as `depth` steps. What the tower lights up when a sage is chosen.
 */
export function lineageOf(data: Pick<TowerData, 'links'>, id: string, depth = 3): { up: Set<string>; down: Set<string>; family: Set<string> } {
  const teachersOf = new Map<string, string[]>(), studentsOf = new Map<string, string[]>()
  const family = new Set<string>()
  for (const l of data.links) {
    if (l.kind === 'teacher') {
      (teachersOf.get(l.b) ?? teachersOf.set(l.b, []).get(l.b)!).push(l.a)
      ;(studentsOf.get(l.a) ?? studentsOf.set(l.a, []).get(l.a)!).push(l.b)
    } else if (l.kind === 'family' && (l.a === id || l.b === id)) {
      family.add(l.a === id ? l.b : l.a)
    }
  }
  const walk = (next: Map<string, string[]>) => {
    const out = new Set<string>()
    let frontier = [id]
    for (let d = 0; d < depth && frontier.length; d++) {
      const nxt: string[] = []
      for (const f of frontier) for (const n of next.get(f) ?? []) if (n !== id && !out.has(n)) { out.add(n); nxt.push(n) }
      frontier = nxt
    }
    return out
  }
  return { up: walk(teachersOf), down: walk(studentsOf), family }
}

/** A station named for several people ("Hillel and Shammai"), as components/viz/SinaiPathText.tsx tells them. */
const isGroupName = (en: string) => /,| and /.test(en)

/**
 * The road data for the tower, from the same index the sage page's card uses, so the two always
 * agree. `sages` are the corpus sages (their Hebrew labels resolve the chain's names).
 */
export function buildTowerRoad(data: Pick<TowerData, 'nodes'>, sages: Sage[], connections: Connection[], locale: Locale): TowerRoad {
  const si = buildSinaiIndex(sages, buildLineageIndex(new Map(sages.map(s => [s.id, s])), connections))
  const up: TowerRoad['up'] = {}
  for (const [id, b] of si.best) if (b.up && b.kind) up[id] = [b.up, b.kind]
  const entry: TowerRoad['entry'] = {}
  for (const [id, e] of si.onChain) entry[id] = [e.gen, e.alongside]

  const pos = new Map(data.nodes.map(n => [n.id, n]))
  const stations: TowerRoadStation[] = si.chain.map(st => ({
    gen: st.gen,
    sherira: st.station.source === 'sherira',
    name: st.station.name[locale],
    group: isGroupName(st.station.name.en),
    id: st.ids.find(i => pos.has(i)) ?? null,
    x: 0, y: 0, z: 0,
  }))
  stations.forEach((st, i) => {
    let a = i - 1, b = i + 1
    while (a >= 0 && !stations[a].id) a--
    while (b < stations.length && !stations[b].id) b++
    const here = st.id ? pos.get(st.id)! : null
    const A = a >= 0 ? pos.get(stations[a].id!)! : null
    const B = b < stations.length ? pos.get(stations[b].id!)! : null
    if (here) Object.assign(st, { x: here.x, y: here.y, z: here.z })
    else if (A && B) {
      const t = (i - a) / (b - a)
      Object.assign(st, { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, z: A.z + (B.z - A.z) * t })
    } else if (A ?? B) {
      const P = (A ?? B)!
      Object.assign(st, { x: P.x, y: P.y + (A ? 1 : -1) * (i - (A ? a : b)), z: P.z })
    }
  })
  return { up, entry, stations }
}

/**
 * A sage's road as the scene flies it, the sage first and Moses last: up through the archive's
 * links to where it joins the chain, then down the generations. Null when the archive holds no
 * route to the chain. The same steps as lib/sinaiPath.ts::sinaiPath, in the other order.
 */
export function roadOf(data: Pick<TowerData, 'nodes' | 'road'>, id: string): RoadPoint[] | null {
  const road = data.road
  if (!road || (!road.up[id] && !road.entry[id])) return null
  const node = new Map(data.nodes.map(n => [n.id, n]))
  const points: RoadPoint[] = []
  let cur = id
  for (let guard = 0; road.up[cur] && guard < 1000; guard++) {
    const n = node.get(cur)
    if (!n) return null
    const [next, how] = road.up[cur]
    points.push({ id: cur, name: n.name, how, x: n.x, y: n.y, z: n.z })
    cur = next
  }
  if (!road.entry[cur]) return null
  const [gen, alongside] = road.entry[cur]
  for (let g = gen; g >= 1; g--) {
    const st = road.stations[g - 1]
    const pid = g === gen ? cur : st.id
    const n = pid ? node.get(pid) : undefined
    // a station passed through one of the people named with it, or named for several, shows that person
    const personal = g === gen && (alongside || st.group)
    points.push({
      id: n ? pid : null,
      // the sage's own name where he alone stands for the station (as his label in the scene); a
      // station named for several people keeps its name unless the road enters it through one of them
      name: n && (personal || !st.group) ? n.name : st.name,
      gen: g,
      ...(st.sherira ? { sherira: true } : {}),
      how: g === 1 ? 'sinai' : 'chain',
      ...(personal && n && alongside ? { alongside: st.name } : {}),
      ...(st.group && !(personal && n) ? { group: true } : {}),
      x: n?.x ?? st.x, y: n?.y ?? st.y, z: n?.z ?? st.z,
    })
  }
  return points
}
