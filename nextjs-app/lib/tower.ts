// The "Tower of Generations": every sage placed in 3D, height by time and direction by region,
// so the movement of Torah between centres (Eretz Israel, Babylon, Spain, Ashkenaz, Eastern
// Europe, back to the Land) shows as a spiral climbing the tower. Pure and deterministic: the
// page computes it on the server and the client only draws it (components/tower/TowerScene.tsx).
import type { Connection, Locale, Period, Region, Sage } from './types'
import { ALL_PERIODS, ERA_COLORS, ERA_LABELS, REGION_LABELS } from './types'
import { regionsOf } from './regions'
import { chronoYear } from '@/components/viz/lineage'
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
}

const SECTOR = (2 * Math.PI) / TOWER_REGIONS.length

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
