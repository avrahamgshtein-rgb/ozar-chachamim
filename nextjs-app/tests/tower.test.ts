/**
 * The Tower of Generations (lib/tower.ts): the layout is computed on the server from the real
 * corpus, so these tests run it on getAllSages()/getAllConnections() and check what the 3D page
 * relies on: every sage placed, height following time, direction following region, teacher links
 * stored teacher first, the lineage walk, and the page's entry points.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAllConnections, getAllSages } from '../lib/serverData'
import { buildTower, buildTowerRoad, heightOf, lineageOf, regionAngle, roadOf, TOWER_HEIGHT, TOWER_REGIONS, towerPath } from '../lib/tower'
import { buildLineageIndex } from '../components/viz/lineage'
import { buildSinaiIndex, sinaiPath } from '../lib/sinaiPath'

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

// Six women the roster left without the 'נשים' tag until 2026-10-25, by name (ids drift, names do not).
const WOMEN_ONCE_UNTAGGED = ['הרבנית חיה מושקא שניאורסון', 'גאולה כהן', 'לאה אמנו', "סוליקא חג'ואל", 'אימא שלום', 'מרים הנביאה']

test('a woman is feminine in the tower, the six once left untagged among them (Hebrew agrees with her)', () => {
  assert.deepEqual(tower.nodes.filter(n => n.feminine).map(n => n.id), sages.filter(s => s.tags?.includes('נשים')).map(s => s.id))
  for (const label of WOMEN_ONCE_UNTAGGED) {
    const s = sages.find(x => x.label === label)
    assert.ok(s, `no sage labelled ${label}`)
    assert.ok(s.tags?.includes('נשים'), `${s.id} ${label} lacks the 'נשים' tag`)
    assert.equal(byId.get(s.id)?.feminine, true, `${s.id} ${label} is not feminine in the tower`)
  }
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

const src = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test("every sage page links to the tower opened on him, and that page exists", () => {
  assert.equal(towerPath('he', '41'), '/he/tower/41')
  assert.equal(towerPath('en', null), '/en/tower')
  assert.match(src('../app/[locale]/sage/[id]/page.tsx'), /href=\{towerPath\(loc, raw\.id\)\}/)
  const page = src('../app/[locale]/tower/[id]/page.tsx')
  // an id that is not a sage is a 404, not an empty tower; the page opens on the sage it names
  assert.match(page, /if \(!data\.nodes\.some\(n => n\.id === id\)\) notFound\(\)/)
  assert.match(page, /initialSage=\{id\}/)
  // its preview is the sage's share card, and the per-sage pages stay out of search
  assert.match(page, /\/sage\/\$\{id\}\/opengraph-image/)
  assert.match(page, /index: false/)
})

test('the scene opens on the linked sage once three.js has loaded, and keeps the address on the chosen sage', () => {
  const scene = src('../components/tower/TowerScene.tsx')
  assert.match(scene, /useState<string \| null>\(initialSage \?\? null\)/)
  // the effects that pass state to the scene run before it exists: it reads the state when built
  assert.match(scene, /api\.current = sceneApi\s+sceneApi\.setTime\(live\.current\.time\)/)
  assert.match(scene, /if \(live\.current\.selected\) sceneApi\.focus\(live\.current\.selected\)/)
  // null, not history.state: Next.js syncs usePathname (the language links) only for a state not its own
  assert.match(scene, /replaceState\(null, '', next/)
  // and the language links follow that address
  assert.match(src('../components/tower/TowerPage.tsx'), /<SiteTopBar [^>]*followUrl/)
})

test('three.js is loaded only inside the scene, never at the top of a module', () => {
  const scene = src('../components/tower/TowerScene.tsx')
  assert.doesNotMatch(scene, /^import .* from 'three/m)
  assert.match(scene, /await import\('three'\)/)
})

console.log('\nthe road to Sinai in the tower')

const road = buildTowerRoad(tower, sages, connections, 'he')
const withRoad = { ...tower, road }

test("the chain's stations run from Moses, one per generation, each at a point inside the tower", () => {
  assert.deepEqual(road.stations.map(s => s.gen), road.stations.map((_, i) => i + 1))
  assert.equal(road.stations[0].id, sages.find(s => s.label === 'משה רבנו')?.id)
  const bad = road.stations.filter(s => ![s.x, s.y, s.z].every(Number.isFinite) || s.y < 0 || s.y > TOWER_HEIGHT)
  assert.deepEqual(bad.map(s => s.gen), [])
  // a station nobody in the corpus stands for lies between its neighbours in time
  for (let i = 1; i < road.stations.length - 1; i++) {
    const [a, b, c] = road.stations.slice(i - 1, i + 2)
    if (!b.id) assert.ok(a.y <= b.y + 1e-9 && b.y <= c.y + 1e-9 || !a.id || !c.id, `station ${b.gen} out of order`)
  }
})

test("every sage's road in the tower is the road his page's card draws (the same sages, the other way round)", () => {
  const si = buildSinaiIndex(sages, buildLineageIndex(new Map(sages.map(s => [s.id, s])), connections))
  let roads = 0
  for (const s of sages) {
    const card = sinaiPath(si, s.id), flown = roadOf(withRoad, s.id)
    assert.equal(!!card, !!flown, s.id)
    if (!card || !flown) continue
    roads++
    assert.deepEqual(flown.map(p => p.id ?? `gen ${p.gen}`), card.steps.map(p => p.id ?? `gen ${p.gen}`).reverse(), s.id)
  }
  assert.ok(roads > 200, `${roads} roads`)
})

test('a road starts at the sage and ends with Moses at Sinai; links below the chain keep their kind', () => {
  const rambam = sages.find(s => s.label === 'הרמב"ם')!
  const r = roadOf(withRoad, rambam.id)!
  assert.equal(r[0].id, rambam.id)
  assert.equal(r[r.length - 1].how, 'sinai')
  assert.equal(r[r.length - 1].name, 'משה רבנו')
  assert.ok(r.every((p, i) => i === r.length - 1 || p.how !== 'sinai'))
  assert.ok(r.every(p => [p.x, p.y, p.z].every(Number.isFinite)))
  // no road for a sage the archive cannot connect: the button is not offered
  const none = sages.find(s => !roadOf(withRoad, s.id))
  assert.ok(none)
})

test('the road travels light: its data adds a few kilobytes to the tower page', () => {
  assert.ok(JSON.stringify(road).length < 30_000, `${JSON.stringify(road).length} bytes`)
})

test('the scene flies the road, ?road=1 starts it, and the sage page card links there', () => {
  const scene = src('../components/tower/TowerScene.tsx')
  assert.match(scene, /road\(points\)/)
  assert.match(scene, /roadGo\(i, ms\)/)
  assert.match(scene, /has\('road'\)\) startRoad\('link'\)/)
  assert.match(scene, /'\?road=1'/)
  assert.match(src('../lib/towerServer.ts'), /road: buildTowerRoad\(/)
  assert.match(src('../components/viz/SinaiPathCard.tsx'), /towerPath\(locale, sageId\)\}\?road=1/)
  assert.match(src('../lib/analytics.ts'), /'tower_road'/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
