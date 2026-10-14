// The kids' journey flown in the Tower of Generations ("מכונת הזמן"): the stations of a route from the
// owner's books, in the book's order, each at the place in the tower of the sage it meets. Saltiel's
// route jumps back and forth in time (950 → 70 → 300 → 1538 …), so the flight climbs and drops through
// the centuries; Shira's climbs the generations in order and her bag fills on the way. Only what the
// /he/kids page already publishes travels here: the travel card, never the story. Pure: the page
// computes it on the server, components/tower/TowerScene.tsx flies it.
import type { RoadPoint, TowerData } from './tower'
import { KIDS_ROUTES, KIDS_PATH, stationAnchor, type KidsImage, type RouteKey } from './kidsJourney'

export interface KidsTourStation {
  n: number
  title: string
  place: string
  when: string
  who: Array<{ name: string; id?: string }>
  image?: KidsImage
  object?: { name: string; icon: string }
  /** The station on the kids' page: its game, task and quiz. */
  href: string
  /** Years from the previous station, by the books' own dates (their "when"): negative is back in time. */
  jump?: number
}

export interface KidsTour {
  route: RouteKey
  title: string
  traveller: string
  guide: string
  /** The other route, for the last card. */
  other: { route: RouteKey; title: string }
  /** The colour of the trail: gold for Saltiel, rose for Shira. */
  color: string
  stations: KidsTourStation[]
  /** One point per station, in the book's order. */
  points: RoadPoint[]
}

export const KIDS_TOUR_ROUTES: RouteKey[] = ['saltiel', 'shira']

export const kidsTourPath = (route: RouteKey) => `${KIDS_PATH}/journey/${route}`

/** The route as the tower flies it, or null for a route that is not one of the books'. */
export function kidsTour(data: Pick<TowerData, 'nodes'>, route: string): KidsTour | null {
  const r = KIDS_ROUTES.find(x => x.key === route)
  const other = KIDS_ROUTES.find(x => x.key !== route)
  if (!r || !other) return null
  const node = new Map(data.nodes.map(n => [n.id, n]))
  const stations: KidsTourStation[] = []
  const points: RoadPoint[] = []
  let prev: number | null = null
  for (const s of r.stations) {
    const n = s.who.map(p => (p.id ? node.get(p.id) : undefined)).find(Boolean)
    if (!n) continue
    const year = bookYear(s.when)
    const jump = prev != null && year != null ? year - prev : undefined
    stations.push({
      n: s.n, title: s.title, place: s.place, when: s.when, who: s.who,
      ...(s.image ? { image: s.image } : {}),
      ...(s.object ? { object: s.object } : {}),
      href: `${KIDS_PATH}#${stationAnchor(r.key, s.n)}`,
      ...(jump != null ? { jump } : {}),
    })
    points.push({ id: n.id, name: s.title, label: `${s.n} · ${s.who[0].name}`, how: 'teacher', x: n.x, y: n.y, z: n.z })
    prev = year
  }
  return {
    route: r.key, title: r.title, traveller: r.traveller, guide: r.guide,
    other: { route: other.key, title: other.title },
    color: r.key === 'shira' ? '#f0a6c0' : '#ffd98a',
    stations, points,
  }
}

/** "חזרנו בזמן כ־880 שנה" / "קפצנו קדימה כ־230 שנה", rounded as the guess it is. */
export function jumpLabel(years: number): string {
  const a = Math.abs(years)
  const r = a >= 1000 ? Math.round(a / 50) * 50 : a >= 100 ? Math.round(a / 10) * 10 : a
  const span = r === 1 ? 'שנה אחת' : `${r.toLocaleString('he-IL')} שנה`
  return years < 0 ? `⏪ חזרנו אחורה בזמן, כ־${span}` : `⏩ קפצנו קדימה בזמן, כ־${span}`
}

/**
 * The civil year a station's card gives in brackets: "סביב ד׳תש״י (950 לספירה)" → 950,
 * "ב׳תמ״ח (1313 לפנה״ס)" → -1313, "ה׳תש״ב–ה׳תשל״א (1942–1971)" → 1942; null when the card names an age only.
 */
export function bookYear(when: string): number | null {
  const m = /\(([^)]*\d[^)]*)\)/.exec(when)
  const y = m && /\d{1,4}/.exec(m[1])
  if (!m || !y) return null
  return /לפנה״ס|לפני הספירה/.test(m[1]) ? -Number(y[0]) : Number(y[0])
}
