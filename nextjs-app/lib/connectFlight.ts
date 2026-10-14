// A path between two sages flown in the Tower of Generations ("שישה צעדים"): the stations of the
// path in order, each at the place in the tower of the sage it names, and the sentence that says how
// each sage is linked to the one before him ("תלמידו של רש״י"). The path itself (which sages, which
// caption, which links are only influence) comes from lib/connect.ts; this file turns it into what
// components/tower/TowerScene.tsx flies and components/connect/FlightPanel.tsx shows. Pure: the tower
// page computes it on the server, nothing here reads a file, the DOM or a dataset.
import type { Locale, Period } from './types'
import { ERA_LABELS } from './types'
import type { RoadPoint, TowerData } from './tower'

/** One step of a path as the flight takes it: the link from the PREVIOUS sage into this one. */
export interface FlightStepInput {
  id: string
  /** How this sage is linked to the previous one ("תלמידו של …"); null on the first. */
  caption: string | null
  /** The link into this sage is influence, not a person-to-person tie: the thread to him is dotted. */
  dotted: boolean
}

/** A road point of the flight. `dotted`: the thread from this point to the next one is dotted. */
export interface FlightPoint extends RoadPoint {
  dotted?: boolean
}

export interface FlightStation {
  id: string
  name: string
  years: string
  /** His era, in the page's language. */
  era: string
  period: Period
  /** The colour of his era, as in the tower. */
  color: string
  caption: string | null
}

export interface ConnectFlight {
  from: string
  to: string
  /** The colour of the trail: teal, apart from the road to Sinai's gold and the kids' tours' gold and rose. */
  color: string
  /** One point per station, in the order of the path. */
  points: FlightPoint[]
  /** The same stations as the panel tells them. */
  stations: FlightStation[]
  /** This flight's address, with no query (`?via=` says only where the visitor came from). */
  href: string
  /** The connect page with this pair filled in. */
  connectHref: string
}

export const FLIGHT_COLOR = '#5fd4d0'

/** The tower opened on a path: `/he/tower/path/594/41`. */
export const flightHref = (locale: Locale, from: string, to: string): string =>
  `/${locale}/tower/path/${encodeURIComponent(from)}/${encodeURIComponent(to)}`

/** The connect page, with the pair filled in as far as it is known: `/he/connect`, `?from=594`, `?from=594&to=41`. */
export function connectHref(locale: Locale, from?: string | null, to?: string | null): string {
  const q: string[] = []
  if (from) q.push(`from=${encodeURIComponent(from)}`)
  if (to) q.push(`to=${encodeURIComponent(to)}`)
  return `/${locale}/connect${q.length ? `?${q.join('&')}` : ''}`
}

/**
 * The path as the tower flies it, or null when there is nothing to fly: fewer than two steps, or a
 * sage the tower does not hold. The stations keep the order of `steps`; each point stands where its
 * sage stands in the tower, labelled with its number as the kids' tours do.
 */
export function buildFlight(data: Pick<TowerData, 'nodes' | 'eras'>, locale: Locale, steps: FlightStepInput[]): ConnectFlight | null {
  if (steps.length < 2) return null
  const node = new Map(data.nodes.map(n => [n.id, n]))
  const points: FlightPoint[] = []
  const stations: FlightStation[] = []
  for (let i = 0; i < steps.length; i++) {
    const n = node.get(steps[i].id)
    if (!n) return null
    // the thread from this point to the next is the link into the next sage
    const dotted = i + 1 < steps.length && steps[i + 1].dotted
    points.push({ id: n.id, name: n.name, label: `${i + 1} · ${n.short}`, how: 'teacher', x: n.x, y: n.y, z: n.z, ...(dotted ? { dotted: true } : {}) })
    stations.push({
      id: n.id,
      name: n.name,
      years: n.years,
      era: data.eras.find(e => e.era === n.era)?.label ?? ERA_LABELS[n.era]?.[locale] ?? '',
      period: n.era,
      color: n.color,
      // the first sage has no one before him
      caption: i === 0 ? null : steps[i].caption,
    })
  }
  const from = steps[0].id, to = steps[steps.length - 1].id
  return {
    from, to,
    color: FLIGHT_COLOR,
    points, stations,
    href: flightHref(locale, from, to),
    connectHref: connectHref(locale, from, to),
  }
}
