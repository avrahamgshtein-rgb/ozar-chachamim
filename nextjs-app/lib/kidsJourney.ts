// The children's journey: two routes through the generations, from the owner's books "היכן החכמה מתגוררת".
// Content lives in lib/kidsJourneyContent.ts; this module holds its shape and the lookups the site needs.
import { KIDS_ROUTES } from './kidsJourneyContent'

export type RouteKey = 'saltiel' | 'shira'

export interface KidsImage {
  src: string
  width: number
  height: number
}

export interface JourneyPerson {
  name: string
  /** The sage's id in the roster, when he or she has a page. */
  id?: string
}

export interface JourneyTask {
  /** "משחק …" or "משימת …", as the book names it. */
  name: string
  text: string
}

export interface JourneyStation {
  n: number
  title: string
  /** Shira's stations are each "the secret of…". */
  secret?: string
  place: string
  when: string
  who: JourneyPerson[]
  keywords: string[]
  /** What happens at the station, in a few lines (not the story itself). */
  summary: string
  image?: KidsImage
  /** What Shira takes into her bag at the station. */
  object?: { name: string; icon: string }
  /** The book's "game and task" page for the station. */
  tasks: JourneyTask[]
}

export interface JourneyRoute {
  key: RouteKey
  book: string
  title: string
  subtitle: string
  traveller: string
  guide: string
  intro: string
  cover: KidsImage
  stations: JourneyStation[]
}

export { KIDS_ROUTES }

export const stationAnchor = (route: RouteKey, n: number) => `${route}-${n}`

/** Where the kids' track lives. Hebrew only: the books are in Hebrew. */
export const KIDS_PATH = '/he/kids'

/** The stations at which a sage appears: his page links to them. */
export function stationsOfSage(sageId: string): Array<{ route: JourneyRoute; station: JourneyStation }> {
  const out: Array<{ route: JourneyRoute; station: JourneyStation }> = []
  for (const route of KIDS_ROUTES) {
    for (const station of route.stations) {
      if (station.who.some(p => p.id === sageId)) out.push({ route, station })
    }
  }
  return out
}
