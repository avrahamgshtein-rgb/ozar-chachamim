/**
 * Stage 4 — pure geometry//grouping logic for the 3D categorical time-layer view.
 *
 * Deliberately free of React and of any 3D library so it can be unit-tested
 * directly. The rendering layer consumes these plain values.
 *
 * Two hard rules encoded here:
 *  1. Periods are CATEGORICAL. Layers are equally spaced by ordinal index, never
 *     by year. `layerIndex` is an position in ALL_PERIODS, not a date.
 *  2. Records we cannot place are never invented. A sage whose location does not
 *     resolve gets `placed: false` and no x/y, and is reported separately.
 */

import { ALL_PERIODS } from './types'
import { resolveCoords } from './locationCoords'
import type { Period, Sage } from './types'

/** Longitude/latitude window a layer plate covers. */
export interface GeoExtent {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
}

/** A sage positioned on one layer plate, in 0..1 plate-relative units. */
export interface PlacedSage {
  sage: Sage
  /** 0 = west edge, 1 = east edge. */
  x: number
  /** 0 = north edge, 1 = south edge. */
  y: number
  lat: number
  lng: number
}

export interface PeriodLayer {
  period: Period
  /** Ordinal position in ALL_PERIODS — the vertical axis is categorical. */
  layerIndex: number
  placed: PlacedSage[]
  /** Sages in this period whose location could not be resolved to coordinates. */
  unplaceable: Sage[]
  /** True when the period has no records at all under the current filters. */
  empty: boolean
}

export interface LayerModel {
  layers: PeriodLayer[]
  extent: GeoExtent
  totalPlaced: number
  /** Every sage that has a period but no resolvable location, across all layers. */
  totalUnplaceable: number
  /** Sages whose period is missing/unrecognised — never assigned a layer. */
  undated: Sage[]
}

/** Padding added around the data extent so edge markers are not clipped. */
const EXTENT_PADDING_DEG = 4

/** Fallback window (roughly Europe→Mesopotamia) when no sage can be placed. */
const DEFAULT_EXTENT: GeoExtent = { minLng: -10, maxLng: 50, minLat: 20, maxLat: 60 }

/**
 * Equirectangular projection onto the unit square.
 *
 * Equirectangular is a deliberate choice: each layer is a flat plate viewed at a
 * fixed tilt, so a linear lng→x / lat→y mapping keeps every plate in the stack
 * mutually registered. A conformal projection would misalign plates vertically.
 */
export function projectToUnit(
  lat: number,
  lng: number,
  extent: GeoExtent,
): { x: number; y: number } {
  const lngSpan = extent.maxLng - extent.minLng
  const latSpan = extent.maxLat - extent.minLat
  return {
    x: lngSpan === 0 ? 0.5 : (lng - extent.minLng) / lngSpan,
    y: latSpan === 0 ? 0.5 : (extent.maxLat - lat) / latSpan,
  }
}

/** Bounding window of every sage that resolves to coordinates. */
export function computeExtent(sages: Sage[]): GeoExtent {
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  let found = 0

  for (const sage of sages) {
    const coords = resolveCoords(sage)
    if (!coords) continue
    found++
    if (coords.lng < minLng) minLng = coords.lng
    if (coords.lng > maxLng) maxLng = coords.lng
    if (coords.lat < minLat) minLat = coords.lat
    if (coords.lat > maxLat) maxLat = coords.lat
  }

  if (found === 0) return DEFAULT_EXTENT

  return {
    minLng: minLng - EXTENT_PADDING_DEG,
    maxLng: maxLng + EXTENT_PADDING_DEG,
    minLat: minLat - EXTENT_PADDING_DEG,
    maxLat: maxLat + EXTENT_PADDING_DEG,
  }
}

/**
 * Group sages into one plate per period.
 *
 * `sages` is expected to be the already-filtered set the 2D map renders, so both
 * views describe the same records by construction.
 */
export function buildLayerModel(sages: Sage[]): LayerModel {
  const extent = computeExtent(sages)

  const byPeriod = new Map<Period, Sage[]>()
  const undated: Sage[] = []

  for (const sage of sages) {
    // An unrecognised or absent period gets no layer — we do not guess one.
    if (!sage.period || !ALL_PERIODS.includes(sage.period)) {
      undated.push(sage)
      continue
    }
    const bucket = byPeriod.get(sage.period)
    if (bucket) bucket.push(sage)
    else byPeriod.set(sage.period, [sage])
  }

  let totalPlaced = 0
  let totalUnplaceable = 0

  const layers: PeriodLayer[] = ALL_PERIODS.map((period, layerIndex) => {
    const members = byPeriod.get(period) ?? []
    const placed: PlacedSage[] = []
    const unplaceable: Sage[] = []

    for (const sage of members) {
      const coords = resolveCoords(sage)
      if (!coords) {
        unplaceable.push(sage)
        continue
      }
      const { x, y } = projectToUnit(coords.lat, coords.lng, extent)
      placed.push({ sage, x, y, lat: coords.lat, lng: coords.lng })
    }

    totalPlaced += placed.length
    totalUnplaceable += unplaceable.length

    return { period, layerIndex, placed, unplaceable, empty: members.length === 0 }
  })

  return { layers, extent, totalPlaced, totalUnplaceable, undated }
}

/**
 * Graticule lines for a plate, as unit-square coordinates.
 * Generated geometry — not derived from any licensed basemap dataset.
 */
export function buildGraticule(
  extent: GeoExtent,
  stepDeg = 10,
): { verticals: number[]; horizontals: number[] } {
  const verticals: number[] = []
  const horizontals: number[] = []

  const firstLng = Math.ceil(extent.minLng / stepDeg) * stepDeg
  for (let lng = firstLng; lng <= extent.maxLng; lng += stepDeg) {
    verticals.push(projectToUnit(0, lng, extent).x)
  }

  const firstLat = Math.ceil(extent.minLat / stepDeg) * stepDeg
  for (let lat = firstLat; lat <= extent.maxLat; lat += stepDeg) {
    horizontals.push(projectToUnit(lat, 0, extent).y)
  }

  return { verticals, horizontals }
}

/** Layers that actually carry records, for callers that hide empty plates. */
export function occupiedLayers(model: LayerModel): PeriodLayer[] {
  return model.layers.filter(l => !l.empty)
}
