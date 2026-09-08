/**
 * Corrected tests for URL state parsing/serialization with real production code.
 * Contract: null (all), [] (none), [x,y] (subset); graph tab omitted; periods preserved
 */

import assert from 'assert'
import { parseURLState, serializeURLState } from '../lib/urlState'
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

console.log(`\n${'='.repeat(50)}`)
console.log(`Tests: ${passed} passed, ${failed} failed`)
console.log(`${'='.repeat(50)}`)

process.exit(failed > 0 ? 1 : 0)
