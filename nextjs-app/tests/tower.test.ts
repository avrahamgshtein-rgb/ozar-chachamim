/**
 * The Tower of Generations (lib/tower.ts): the layout is computed on the server from the real
 * corpus, so these tests run it on getAllSages()/getAllConnections() and check what the 3D page
 * relies on: every sage placed, height following time, direction following region, teacher links
 * stored teacher first, the lineage walk, and the page's entry points.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAllConnections, getAllSages } from '../lib/serverData'
import { buildTower, heightOf, lineageOf, regionAngle, TOWER_HEIGHT, TOWER_REGIONS } from '../lib/tower'

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

const sages = getAllSages()
const connections = getAllConnections()
const tower = buildTower(sages, connections, 'he')
const byId = new Map(tower.nodes.map(n => [n.id, n]))

console.log('\nlib/tower.ts')

test('every sage is placed once, at finite coordinates inside the tower', () => {
  assert.equal(tower.nodes.length, sages.length)
  assert.equal(byId.size, sages.length)
  const bad = tower.nodes.filter(n => ![n.x, n.y, n.z, n.size].every(Number.isFinite) || n.y < 0 || n.y > TOWER_HEIGHT)
  assert.deepEqual(bad.map(n => n.id), [])
})

test('height follows time: an earlier year is never higher', () => {
  const sorted = [...tower.nodes].sort((a, b) => a.year - b.year)
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].y >= sorted[i - 1].y, `${sorted[i].id} below ${sorted[i - 1].id}`)
  assert.equal(heightOf(-5000), 0)
  assert.equal(heightOf(3000), TOWER_HEIGHT)
  assert.ok(heightOf(1200) < heightOf(1700))
})

test("direction follows region: each sage stands inside his region's sector", () => {
  const sector = (2 * Math.PI) / TOWER_REGIONS.length
  const off = tower.nodes.filter(n => {
    let d = Math.atan2(n.z, n.x) - regionAngle(n.region)
    d = Math.atan2(Math.sin(d), Math.cos(d))
    return Math.abs(d) > sector / 2
  })
  assert.deepEqual(off.map(n => n.id), [])
})

test('the same corpus gives the same tower (a sage keeps his place between builds)', () => {
  assert.deepEqual(buildTower(sages, connections, 'he').nodes, tower.nodes)
})

test('teacher links are stored teacher first, whichever way the data states them', () => {
  const stated = connections.find(c => c.type === 'student')
  assert.ok(stated, 'the corpus has a student link to check')
  const l = tower.links.find(x => x.kind === 'teacher' && x.a === stated!.target && x.b === stated!.source)
  assert.ok(l, `student ${stated!.source}->${stated!.target} should be teacher ${stated!.target}->${stated!.source}`)
  assert.ok(tower.links.every(x => byId.has(x.a) && byId.has(x.b) && x.a !== x.b))
})

test("the Rambam's chain: Rav Maimon above him, R. Avraham his son below", () => {
  const rambam = tower.nodes.find(n => n.name === 'הרמב"ם' || n.name === 'הרמב״ם')
  assert.ok(rambam, 'the Rambam is on the tower')
  const chain = lineageOf(tower, rambam!.id)
  const names = (ids: Set<string>) => [...ids].map(id => byId.get(id)!.name)
  assert.ok(names(chain.up).some(n => n.includes('מימון')), `teachers: ${names(chain.up)}`)
  assert.ok(names(chain.down).concat(names(chain.family)).some(n => n.includes('אברהם בן הרמב')), 'his son')
})

test('the most connected sages carry their names from the start; every era and region is labelled', () => {
  assert.equal(tower.nodes.filter(n => n.landmark).length, 16)
  assert.equal(tower.eras.length, 11)
  assert.ok(tower.eras.every(e => e.label && e.from <= e.to))
  assert.equal(tower.regions.length, TOWER_REGIONS.length)
  assert.ok(tower.minYear < 0 && tower.maxYear > 1900)
})

console.log('\nentry points')

test('the header, the mobile menu and the sitemap lead to /tower', () => {
  const header = readFileSync(new URL('../components/layout/Header.tsx', import.meta.url), 'utf8')
  assert.equal((header.match(/\/\$\{locale\}\/tower/g) ?? []).length, 2)
  assert.match(readFileSync(new URL('../app/sitemap.ts', import.meta.url), 'utf8'), /\/tower`/)
})

test('three.js is loaded only inside the scene, never at the top of a module', () => {
  const scene = readFileSync(new URL('../components/tower/TowerScene.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(scene, /^import .* from 'three/m)
  assert.match(scene, /await import\('three'\)/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
