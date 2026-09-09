/**
 * Who was where, and who overlapped with whom.
 *
 * A sage is tied to a place two ways: their `location` field (where they were
 * based) and any stop on their `migration_path` (where they passed through or
 * settled). Both count as presence, but they are labelled separately so the UI
 * can say which it is.
 *
 * Place names come from LOCATION_COORDS, used here as a controlled vocabulary.
 * That keeps this index speaking the same names as the map, and avoids
 * inventing a second gazetteer that would drift from it.
 */

import { LOCATION_COORDS } from './locationCoords'
import type { Sage } from './types'

export type PresenceKind = 'residence' | 'migration'

export interface Presence {
  sage: Sage
  kind: PresenceKind
  /** Position along the migration chain, when kind is 'migration'. */
  stopIndex?: number
}

/** Gazetteer keys, longest first so "ארץ ישראל" wins over "ישראל". */
const PLACE_KEYS = Object.keys(LOCATION_COORDS).sort((a, b) => b.length - a.length)

/**
 * Canonical places named in a free-text location string.
 *
 * Matching is longest-first and consumes the matched span, so "ירושלים; מצרים"
 * yields both, while "ארץ ישראל" yields only that and not a spurious "ישראל".
 */
export function placesIn(text: string | undefined | null): string[] {
  if (!text) return []
  let rest = text
  const found: string[] = []
  for (const key of PLACE_KEYS) {
    if (rest.includes(key)) {
      found.push(key)
      rest = rest.split(key).join(' ')
    }
  }
  return found
}

/** place → everyone recorded there, by residence or by migration stop. */
export function buildPlaceIndex(sages: Sage[]): Map<string, Presence[]> {
  const index = new Map<string, Presence[]>()
  const add = (place: string, p: Presence) => {
    const bucket = index.get(place)
    if (bucket) {
      // A sage who both lived somewhere and passed through it appears once,
      // as a resident — the stronger claim.
      if (bucket.some(e => e.sage.id === p.sage.id)) return
      bucket.push(p)
    } else index.set(place, [p])
  }

  for (const sage of sages) {
    for (const place of placesIn(sage.location)) {
      add(place, { sage, kind: 'residence' })
    }
    const mp = sage.migration_path
    if (mp) {
      const stops = [mp.from, ...(mp.intermediate ?? []), mp.to]
      stops.forEach((stop, i) => {
        for (const place of placesIn(stop)) {
          add(place, { sage, kind: 'migration', stopIndex: i })
        }
      })
    }
  }
  return index
}

export type Overlap = 'certain' | 'possible' | 'unknown'

/**
 * Whether two sages were alive at the same time.
 *
 * 'certain'  — both have exact dates and the spans intersect
 * 'possible' — spans intersect but at least one is century-precision, so the
 *              overlap cannot be asserted
 * 'unknown'  — one of them has no usable years
 *
 * The distinction matters: a sage known only as "16th century" must never be
 * presented as a confirmed contemporary of someone with real dates.
 */
export function overlapOf(a: Sage, b: Sage): Overlap {
  if (a.birth_year == null || a.death_year == null) return 'unknown'
  if (b.birth_year == null || b.death_year == null) return 'unknown'
  const intersects = a.birth_year <= b.death_year && b.birth_year <= a.death_year
  if (!intersects) return 'unknown'
  return a.date_precision === 'exact' && b.date_precision === 'exact'
    ? 'certain'
    : 'possible'
}

export interface PlaceCohort {
  place: string
  /** Everyone recorded at the place, earliest period first. */
  present: Presence[]
  /** Overlap verdict against the anchor sage, keyed by sage id. */
  overlap: Map<string, Overlap>
}

/**
 * Everyone at `place`, ordered chronologically, each judged against `anchor`.
 *
 * Sorting uses birth year where known and falls back to the period ordinal, so
 * undated sages still land in a sensible band rather than at the end.
 */
export function cohortAt(
  index: Map<string, Presence[]>,
  place: string,
  anchor: Sage | null,
  periodOrder: readonly string[],
): PlaceCohort {
  const present = [...(index.get(place) ?? [])].sort((x, y) => {
    const bx = x.sage.birth_year ?? null
    const by = y.sage.birth_year ?? null
    if (bx != null && by != null) return bx - by
    const px = periodOrder.indexOf(x.sage.period)
    const py = periodOrder.indexOf(y.sage.period)
    if (px !== py) return px - py
    return (bx ?? 0) - (by ?? 0)
  })

  const overlap = new Map<string, Overlap>()
  if (anchor) {
    for (const p of present) {
      overlap.set(p.sage.id, p.sage.id === anchor.id ? 'certain' : overlapOf(anchor, p.sage))
    }
  }
  return { place, present, overlap }
}
