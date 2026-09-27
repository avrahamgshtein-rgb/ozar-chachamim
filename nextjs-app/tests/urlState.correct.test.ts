/**
 * Corrected tests for URL state parsing/serialization with real production code.
 * Contract: null (all), [] (none), [x,y] (subset); graph tab omitted; periods preserved
 */

import assert from 'assert'
import { parseURLState, serializeURLState, updateURLWithState, parseJourneyURLState, withJourneyURLState } from '../lib/urlState'
import type { NavigationState } from '../lib/urlState'

let passed = 0, failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`✓ ${name}`)
    passed++
  } catch (e) {
    console.log(`✗ ${name}`)
    console.log(`  ${(e as Error).message}`)
    failed++
  }
}

console.log('\n=== Period Contract ===')

test('missing ?periods → null', () => {
  const state = parseURLState('?tab=map')
  assert.strictEqual(state.periods, null)
})

test('?periods= → []', () => {
  const state = parseURLState('?periods=')
  assert.deepStrictEqual(state.periods, [])
})

test('?periods=rishonim → [rishonim]', () => {
  const state = parseURLState('?periods=rishonim')
  assert.deepStrictEqual(state.periods, ['rishonim'])
})

test('null periods not serialized', () => {
  const params = serializeURLState({ tab: null, sage: null, regions: [], periods: null })
  assert.strictEqual(params.has('periods'), false)
})

test('[] periods serialized as empty', () => {
  const params = serializeURLState({ tab: null, sage: null, regions: [], periods: [] })
  assert.strictEqual(params.get('periods'), '')
})

test('subset periods serialized', () => {
  const params = serializeURLState({ tab: null, sage: null, regions: [], periods: ['rishonim'] })
  assert.strictEqual(params.get('periods'), 'rishonim')
})

console.log('\n=== Tab Contract ===')

test('missing ?tab → null (default graph)', () => {
  const state = parseURLState('?regions=sefarad')
  assert.strictEqual(state.tab, null)
})

test('?tab=graph → null (omitted)', () => {
  const state = parseURLState('?tab=graph')
  assert.strictEqual(state.tab, null)
})

test('?tab=map → map', () => {
  const state = parseURLState('?tab=map')
  assert.strictEqual(state.tab, 'map')
})

test('null tab not serialized', () => {
  const params = serializeURLState({ tab: null, sage: null, regions: [], periods: null })
  assert.strictEqual(params.has('tab'), false)
})

test('map tab serialized', () => {
  const params = serializeURLState({ tab: 'map', sage: null, regions: [], periods: null })
  assert.strictEqual(params.get('tab'), 'map')
})

console.log('\n=== Round-Trips ===')

test('all periods survives round-trip', () => {
  const url1 = '?tab=map&regions=sefarad'
  const s1 = parseURLState(url1)
  const p1 = serializeURLState(s1)
  const url2 = p1.toString() ? `?${p1.toString()}` : '?'
  const s2 = parseURLState(url2)
  assert.strictEqual(s1.periods, null)
  assert.strictEqual(s2.periods, null)
})

test('no periods survives round-trip', () => {
  const url1 = '?periods='
  const s1 = parseURLState(url1)
  const p1 = serializeURLState(s1)
  const url2 = `?${p1.toString()}`
  const s2 = parseURLState(url2)
  assert.deepStrictEqual(s1.periods, [])
  assert.deepStrictEqual(s2.periods, [])
})

test('subset survives round-trip with all fields', () => {
  const url1 = '?tab=map&periods=rishonim,acharonim&regions=sefarad&sage=123'
  const s1 = parseURLState(url1)
  const p1 = serializeURLState(s1)
  const url2 = `?${p1.toString()}`
  const s2 = parseURLState(url2)
  assert.deepStrictEqual(s1.periods, ['rishonim', 'acharonim'])
  assert.deepStrictEqual(s2.periods, ['rishonim', 'acharonim'])
  assert.strictEqual(s1.tab, 'map')
  assert.strictEqual(s2.tab, 'map')
  assert.deepStrictEqual(s1.regions, ['sefarad'])
  assert.deepStrictEqual(s2.regions, ['sefarad'])
  assert.strictEqual(s1.sage, '123')
  assert.strictEqual(s2.sage, '123')
})

console.log('\n=== Navigation Clearing ===')

test('navigate without filters clears state', () => {
  const url1 = '?tab=map&periods=rishonim&regions=sefarad&sage=123'
  const s1 = parseURLState(url1)
  assert.strictEqual(s1.tab, 'map')
  assert.deepStrictEqual(s1.periods, ['rishonim'])

  const url2 = '?tab=graph'
  const s2 = parseURLState(url2)
  assert.strictEqual(s2.tab, null) // default
  assert.strictEqual(s2.periods, null) // all
  assert.deepStrictEqual(s2.regions, [])
  assert.strictEqual(s2.sage, null)
})

test('navigate to bare URL clears everything', () => {
  const state = parseURLState('?')
  assert.strictEqual(state.tab, null)
  assert.strictEqual(state.sage, null)
  assert.deepStrictEqual(state.regions, [])
  assert.strictEqual(state.periods, null)
})

console.log('\n=== Deduplication ===')

test('deduplicates repeated periods', () => {
  const state = parseURLState('?periods=rishonim,rishonim,acharonim,rishonim')
  assert.deepStrictEqual(state.periods, ['rishonim', 'acharonim'])
})

test('filters invalid periods', () => {
  const state = parseURLState('?periods=rishonim,invalid,acharonim')
  assert.deepStrictEqual(state.periods, ['rishonim', 'acharonim'])
})

console.log('\n=== Journey deep link (?journey=1&year=) ===')

test('?tab=geography is an alias of map', () => {
  assert.strictEqual(parseURLState('?tab=geography&journey=1&year=1100').tab, 'map')
})

test('?journey=1&year=1100 → on at 1100', () => {
  assert.deepStrictEqual(parseJourneyURLState('?tab=geography&journey=1&year=1100'), { journey: true, year: 1100 })
})

test('BCE year is a negative number', () => {
  assert.deepStrictEqual(parseJourneyURLState('?journey=1&year=-586'), { journey: true, year: -586 })
})

test('missing journey → off; unreadable year → null', () => {
  assert.deepStrictEqual(parseJourneyURLState('?tab=map&year=1100'), { journey: false, year: 1100 })
  assert.deepStrictEqual(parseJourneyURLState('?journey=1&year=abc'), { journey: true, year: null })
  assert.deepStrictEqual(parseJourneyURLState('?journey=1&year='), { journey: true, year: null })
})

test('withJourneyURLState sets and clears only its own params', () => {
  const on = new URL(withJourneyURLState('https://x.test/he?tab=map&regions=sefarad', { journey: true, year: 1200 }))
  assert.strictEqual(on.searchParams.get('journey'), '1')
  assert.strictEqual(on.searchParams.get('year'), '1200')
  assert.strictEqual(on.searchParams.get('regions'), 'sefarad')
  const off = new URL(withJourneyURLState(on.toString(), { journey: false, year: 1200 }))
  assert.strictEqual(off.searchParams.has('journey'), false)
  assert.strictEqual(off.searchParams.has('year'), false)
  assert.strictEqual(off.searchParams.get('tab'), 'map')
})

test("AppShell's URL writer keeps the journey params", () => {
  const g = globalThis as unknown as { window?: unknown }
  const saved = g.window
  g.window = { location: { href: 'https://x.test/he?tab=geography&journey=1&year=1100' } }
  try {
    const url = new URL(updateURLWithState({ tab: 'map', sage: null, regions: [], periods: null }))
    assert.strictEqual(url.searchParams.get('tab'), 'map')
    assert.strictEqual(url.searchParams.get('journey'), '1')
    assert.strictEqual(url.searchParams.get('year'), '1100')
  } finally {
    g.window = saved
  }
})

console.log('\n=== Road-to-Sinai deep link (?view=sinai&focus=) ===')

// The sage page links to /<locale>?tab=genealogy&view=sinai&focus=<id>.
// urlState owns tab/sage/regions/periods only; `view` and `focus` belong to
// the lineage tab (GenealogyTree). The road names its sage with `focus`, not
// `sage`, because a ?sage= opens that sage's card over the road.

test('deep link parses to the lineage tab with no card to open', () => {
  const state = parseURLState('?tab=genealogy&view=sinai&focus=594')
  assert.strictEqual(state.tab, 'genealogy')
  assert.strictEqual(state.sage, null)
  assert.deepStrictEqual(state.regions, [])
  assert.strictEqual(state.periods, null)
})

test('rewriting the URL keeps ?view=sinai&focus= beside a selected sage', () => {
  const g = globalThis as unknown as { window?: unknown }
  const had = 'window' in g, prev = g.window
  g.window = { location: { href: 'https://example.org/he?tab=genealogy&view=sinai&focus=594' } }
  try {
    const url = new URL(updateURLWithState({ tab: 'genealogy', sage: '505', regions: [], periods: null }))
    assert.strictEqual(url.searchParams.get('view'), 'sinai')
    assert.strictEqual(url.searchParams.get('focus'), '594')
    assert.strictEqual(url.searchParams.get('sage'), '505')
    assert.strictEqual(url.searchParams.get('tab'), 'genealogy')
  } finally {
    if (had) g.window = prev
    else delete g.window
  }
})

console.log(`\n${'='.repeat(50)}`)
console.log(`Tests: ${passed} passed, ${failed} failed`)
console.log(`${'='.repeat(50)}`)

process.exit(failed > 0 ? 1 : 0)
