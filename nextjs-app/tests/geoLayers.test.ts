/**
 * Stage 4 tests — 3D categorical time-layer logic.
 * Imports the real production module; no reimplementation.
 */

import assert from 'node:assert/strict'
import {
  projectToUnit,
  computeExtent,
  buildLayerModel,
  buildGraticule,
  occupiedLayers,
} from '../lib/geoLayers'
import { ALL_PERIODS } from '../lib/types'
import type { Sage } from '../lib/types'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok  ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL ${name}`)
    console.log(`       ${(e as Error).message}`)
    failed++
  }
}

function sage(over: Partial<Sage> & { id: string }): Sage {
  return { label: over.id, period: 'rishonim', ...over } as Sage
}

console.log('\nprojectToUnit')

const box = { minLng: 0, maxLng: 100, minLat: 0, maxLat: 50 }

test('west edge maps to x=0, east edge to x=1', () => {
  assert.equal(projectToUnit(25, 0, box).x, 0)
  assert.equal(projectToUnit(25, 100, box).x, 1)
})

test('north edge maps to y=0, south edge to y=1', () => {
  assert.equal(projectToUnit(50, 50, box).y, 0)
  assert.equal(projectToUnit(0, 50, box).y, 1)
})

test('centre maps to 0.5, 0.5', () => {
  const p = projectToUnit(25, 50, box)
  assert.equal(p.x, 0.5)
  assert.equal(p.y, 0.5)
})

test('degenerate extent does not divide by zero', () => {
  const p = projectToUnit(10, 10, { minLng: 10, maxLng: 10, minLat: 10, maxLat: 10 })
  assert.equal(p.x, 0.5)
  assert.equal(p.y, 0.5)
})

console.log('\ncomputeExtent')

test('falls back to a default window when nothing is placeable', () => {
  const ext = computeExtent([sage({ id: 'x', location: '___nowhere___' })])
  assert.ok(ext.maxLng > ext.minLng)
  assert.ok(ext.maxLat > ext.minLat)
})

test('extent covers a known gazetteer location', () => {
  // ירושלים resolves to ~31.768 / 35.214 in lib/locationCoords.ts
  const ext = computeExtent([sage({ id: 'j', location: 'ירושלים' })])
  assert.ok(ext.minLat < 31.768 && ext.maxLat > 31.768, 'latitude inside extent')
  assert.ok(ext.minLng < 35.214 && ext.maxLng > 35.214, 'longitude inside extent')
})

console.log('\nbuildLayerModel — categorical layers')

test('always emits one layer per period, in ALL_PERIODS order', () => {
  const model = buildLayerModel([sage({ id: 'a', location: 'ירושלים', period: 'tannaim' })])
  assert.equal(model.layers.length, ALL_PERIODS.length)
  model.layers.forEach((l, i) => {
    assert.equal(l.period, ALL_PERIODS[i])
    assert.equal(l.layerIndex, i, 'layerIndex is the ordinal, not a year')
  })
})

test('layerIndex is evenly spaced regardless of real chronology', () => {
  const model = buildLayerModel([])
  const gaps = model.layers.slice(1).map((l, i) => l.layerIndex - model.layers[i].layerIndex)
  assert.ok(gaps.every(g => g === 1), 'every layer gap is exactly 1')
})

test('routes a sage onto its own period layer', () => {
  const model = buildLayerModel([sage({ id: 'a', location: 'ירושלים', period: 'tannaim' })])
  const tannaim = model.layers.find(l => l.period === 'tannaim')!
  assert.equal(tannaim.placed.length, 1)
  assert.equal(tannaim.placed[0].sage.id, 'a')
})

test('periods with no records are flagged empty, not dropped', () => {
  const model = buildLayerModel([sage({ id: 'a', location: 'ירושלים', period: 'tannaim' })])
  const judges = model.layers.find(l => l.period === 'judges')!
  assert.equal(judges.empty, true)
  assert.equal(judges.placed.length, 0)
  assert.equal(occupiedLayers(model).length, 1)
})

console.log('\nbuildLayerModel — no invented data')

test('a sage with no period is reported undated, never given a layer', () => {
  const model = buildLayerModel([sage({ id: 'u', location: 'ירושלים', period: undefined as any })])
  assert.equal(model.undated.length, 1)
  assert.equal(model.undated[0].id, 'u')
  assert.equal(model.totalPlaced, 0, 'undated sage is not placed on any plate')
  assert.ok(model.layers.every(l => l.placed.length === 0))
})

test('an unrecognised period is treated as undated, not coerced', () => {
  const model = buildLayerModel([sage({ id: 'b', location: 'ירושלים', period: 'not-a-period' as any })])
  assert.equal(model.undated.length, 1)
  assert.equal(model.totalPlaced, 0)
})

test('a sage with an unresolvable location is unplaceable, not given fake coordinates', () => {
  const model = buildLayerModel([
    sage({ id: 'g', location: '___definitely_not_a_place___', period: 'modern' }),
  ])
  const modern = model.layers.find(l => l.period === 'modern')!
  assert.equal(modern.unplaceable.length, 1)
  assert.equal(modern.placed.length, 0)
  assert.equal(model.totalUnplaceable, 1)
  assert.equal(model.totalPlaced, 0)
})

test('placed and unplaceable sages in one period are both accounted for', () => {
  const model = buildLayerModel([
    sage({ id: 'ok', location: 'ירושלים', period: 'modern' }),
    sage({ id: 'no', location: '___nope___', period: 'modern' }),
  ])
  const modern = model.layers.find(l => l.period === 'modern')!
  assert.equal(modern.placed.length, 1)
  assert.equal(modern.unplaceable.length, 1)
  assert.equal(modern.empty, false, 'period has records even though one is unplaceable')
})

test('every placed sage carries the coordinates it was placed from', () => {
  const model = buildLayerModel([sage({ id: 'j', location: 'ירושלים', period: 'tannaim' })])
  const p = model.layers.find(l => l.period === 'tannaim')!.placed[0]
  assert.equal(typeof p.lat, 'number')
  assert.equal(typeof p.lng, 'number')
  assert.ok(p.x >= 0 && p.x <= 1, 'x within plate')
  assert.ok(p.y >= 0 && p.y <= 1, 'y within plate')
})

console.log('\n2D/3D agreement')

test('layer model describes exactly the sages it was given', () => {
  const input = [
    sage({ id: 'a', location: 'ירושלים', period: 'tannaim' }),
    sage({ id: 'b', location: 'בבל', period: 'amoraim' }),
    sage({ id: 'c', location: '___nope___', period: 'modern' }),
    sage({ id: 'd', location: 'ירושלים', period: undefined as any }),
  ]
  const model = buildLayerModel(input)
  const accounted =
    model.totalPlaced + model.totalUnplaceable + model.undated.length
  assert.equal(accounted, input.length, 'no record is silently dropped')
})

test('filtering the input shrinks the model correspondingly', () => {
  const all = [
    sage({ id: 'a', location: 'ירושלים', period: 'tannaim' }),
    sage({ id: 'b', location: 'בבל', period: 'amoraim' }),
  ]
  const full = buildLayerModel(all)
  const filtered = buildLayerModel(all.filter(s => s.period === 'tannaim'))
  assert.equal(full.totalPlaced, 2)
  assert.equal(filtered.totalPlaced, 1)
  assert.equal(occupiedLayers(filtered).length, 1)
})

console.log('\nbuildGraticule')

test('produces lines inside the unit square', () => {
  const g = buildGraticule({ minLng: 0, maxLng: 100, minLat: 0, maxLat: 50 }, 10)
  assert.ok(g.verticals.length > 0)
  assert.ok(g.horizontals.length > 0)
  assert.ok(g.verticals.every(v => v >= 0 && v <= 1), 'verticals within plate')
  assert.ok(g.horizontals.every(h => h >= 0 && h <= 1), 'horizontals within plate')
})

console.log(`\n${'-'.repeat(46)}`)
console.log(`geoLayers: ${passed} passed, ${failed} failed`)
console.log('-'.repeat(46))

process.exit(failed > 0 ? 1 : 0)
