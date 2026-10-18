/**
 * The portrait atlas: every portrait as a 64 px tile of one picture (public/portraits/atlas.webp, with its index
 * public/portraits/atlas.json, both written by scripts/build_portraits.py), so the Tower of Generations draws all the faces
 * from one texture. A sage's tile is his position in `ids`, so an id that drifts, or a tile one place off, shows a face on the
 * wrong sage: these tests pin the order against data-portraits.json and the page's data (lib/towerServer.ts) against the
 * atlas, in all three languages, and the atlas's own file against its declared size and hash.
 *
 * The pixels are compared in the build, not here (no image library in the tests): the script decodes the atlas it just made
 * and checks every tile against that sage's own small file, on every build and on `--check`; the test only pins that the
 * check is there.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getAllConnections, getAllSages } from '../lib/serverData'
import { localizeSage } from '../lib/serverDataTranslator'
import { hasPortrait, portraitEntries } from '../lib/portraits'
import { buildTower, type TowerData, type TowerNode } from '../lib/tower'
import { attachFaces, facesOf, type PortraitAtlas } from '../lib/towerFaces'
import { towerData } from '../lib/towerServer'
import type { Locale } from '../lib/types'

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

const APP = path.resolve(__dirname, '..')
const REPO = path.resolve(APP, '..')
const ATLAS_IMAGE = path.join(APP, 'public', 'portraits', 'atlas.webp')
const ATLAS_INDEX = path.join(APP, 'public', 'portraits', 'atlas.json')
const MAX_BYTES = 400 * 1024
const locales: Locale[] = ['he', 'en', 'ru']

const indexText = fs.readFileSync(ATLAS_INDEX, 'utf8')
const atlas = JSON.parse(indexText) as PortraitAtlas
const image = fs.readFileSync(ATLAS_IMAGE)

/** A WebP's pixel size from its header (VP8, VP8L or VP8X): no image library. */
function webpSize(buf: Buffer): { type: string; w: number; h: number } | null {
  if (buf.length < 30 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return null
  const type = buf.toString('latin1', 12, 16)
  if (type === 'VP8 ') return { type, w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
  if (type === 'VP8L') {
    const bits = buf.readUInt32LE(21)
    return { type, w: (bits & 0x3fff) + 1, h: ((bits >>> 14) & 0x3fff) + 1 }
  }
  if (type === 'VP8X') return { type, w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 }
  return null
}

/** The build's id order (scripts/build_portraits.py::sort_ids): numeric ids by value, then any other by text. */
const buildOrder = (a: string, b: string): number => {
  const da = /^\d+$/.test(a), db = /^\d+$/.test(b)
  if (da !== db) return da ? -1 : 1
  if (da) return Number(a) - Number(b) || (a < b ? -1 : a > b ? 1 : 0)
  return a < b ? -1 : a > b ? 1 : 0
}

console.log('\nthe atlas files')

test('atlas.json has exactly the agreed keys, in the agreed order', () => {
  assert.deepEqual(Object.keys(atlas), ['tile', 'cols', 'rows', 'w', 'h', 'v', 'ids'])
  assert.equal(atlas.tile, 64)
  assert.equal(atlas.cols, 32)
  assert.match(atlas.v, /^[0-9a-f]{8}$/)
})

test('atlas.json is written the way the build writes it (indent 1, a final newline)', () => {
  assert.equal(indexText, JSON.stringify(atlas, null, 1) + '\n')
})

test('the ids are the portraits of data-portraits.json, in the build order, each once', () => {
  const dataIds = portraitEntries().map(([id]) => id)
  assert.ok(dataIds.length > 0)
  assert.equal(new Set(atlas.ids).size, atlas.ids.length, 'an id twice')
  assert.deepEqual(atlas.ids, [...dataIds].sort(buildOrder))
  assert.ok(atlas.ids.every(id => typeof id === 'string'))
})

test('the grid holds every id: rows is the smallest power of two that does, and w and h are cols*tile by rows*tile', () => {
  assert.ok(atlas.rows * atlas.cols >= atlas.ids.length, `${atlas.ids.length} ids in ${atlas.cols} x ${atlas.rows} tiles`)
  const need = Math.ceil(atlas.ids.length / atlas.cols)
  assert.ok(Number.isInteger(Math.log2(atlas.rows)), 'rows is not a power of two')
  assert.ok(atlas.rows >= need && atlas.rows / 2 < need, `rows ${atlas.rows} for ${need} needed`)
  assert.equal(atlas.w, atlas.cols * atlas.tile)
  assert.equal(atlas.h, atlas.rows * atlas.tile)
  assert.ok(atlas.w <= 4096 && atlas.h <= 4096, 'a phone cannot hold a texture bigger than 4096 px a side')
})

test('atlas.webp is a WebP of exactly w by h pixels and at most 400 KB', () => {
  const info = webpSize(image)
  assert.ok(info, 'not a WebP file')
  assert.ok(['VP8 ', 'VP8L', 'VP8X'].includes(info!.type), `chunk ${info!.type}`)
  assert.deepEqual([info!.w, info!.h], [atlas.w, atlas.h])
  assert.ok(image.length <= MAX_BYTES, `${image.length} bytes, over ${MAX_BYTES}`)
})

test('v is the first 8 hex digits of the sha256 of atlas.webp', () => {
  assert.equal(createHash('sha256').update(image).digest('hex').slice(0, 8), atlas.v)
})

test('the build checks every tile against its sage\'s own small file, and writes nothing when one is off', () => {
  const src = fs.readFileSync(path.join(REPO, 'scripts', 'build_portraits.py'), 'utf8')
  assert.match(src, /def check_atlas\(/)
  assert.match(src, /for m in check_atlas\(atlas, geom, ids, small\):\s*\n\s*log\.err\(m\)/, 'build_outputs must turn a bad tile into an error')
  assert.match(src, /\.sm\.webp|small\[i\]/)
  assert.match(src, /TILE_TOLERANCE/)
  assert.match(src, /atlas\.json/)
  assert.match(src, /hashlib\.sha256\(atlas\)\.hexdigest\(\)\[:8\]/)
})

console.log('\nthe tower page\'s data')

for (const loc of locales) {
  const data = towerData(loc)

  test(`${loc}: faces names the atlas with its hash, and its geometry`, () => {
    assert.ok(data.faces)
    assert.deepEqual(data.faces, { src: `/portraits/atlas.webp?v=${atlas.v}`, tile: atlas.tile, cols: atlas.cols, rows: atlas.rows, w: atlas.w, h: atlas.h })
    assert.deepEqual(Object.keys(data.faces!), ['src', 'tile', 'cols', 'rows', 'w', 'h'])
  })

  test(`${loc}: a node has a face exactly when its sage has a portrait, and the tile is his`, () => {
    const wrong: string[] = []
    for (const n of data.nodes) {
      if (hasPortrait(n.id)) {
        if (typeof n.face !== 'number' || atlas.ids[n.face] !== n.id) wrong.push(`${n.id}: tile ${n.face} holds ${atlas.ids[n.face as number]}`)
      } else if ('face' in n) wrong.push(`${n.id}: has a face but no portrait`)
    }
    assert.deepEqual(wrong, [])
  })

  test(`${loc}: every sage in the atlas is a tower node, with his own tile`, () => {
    const byId = new Map(data.nodes.map(n => [n.id, n]))
    for (let k = 0; k < atlas.ids.length; k++) {
      const n = byId.get(atlas.ids[k])
      assert.ok(n, `${atlas.ids[k]} (tile ${k}) is not in the tower`)
      assert.equal(n!.face, k)
    }
    assert.equal(data.nodes.filter(n => n.face !== undefined).length, atlas.ids.length)
  })

  test(`${loc}: the road is built from the same layout, and the other data is untouched`, () => {
    assert.ok(data.road)
    const bare = buildTower(getAllSages().map(s => localizeSage(s, loc)), getAllConnections(), loc)
    assert.equal(data.nodes.length, bare.nodes.length)
    // a node differs from the bare layout by its face and nothing else
    for (let i = 0; i < bare.nodes.length; i++) {
      const { face, ...rest } = data.nodes[i] as TowerNode
      void face
      assert.deepEqual(rest, bare.nodes[i])
    }
    assert.deepEqual(data.links, bare.links)
    assert.deepEqual(data.eras, bare.eras)
    assert.deepEqual(data.regions, bare.regions)
    assert.equal(data.minYear, bare.minYear)
    assert.equal(data.maxYear, bare.maxYear)
  })
}

test('a bare layout (buildTower) carries no face and no faces: the pure module is left alone', () => {
  const bare = buildTower(getAllSages(), getAllConnections(), 'he')
  assert.equal(bare.faces, undefined)
  assert.ok(bare.nodes.every(n => !('face' in n)))
  const towerSrc = fs.readFileSync(path.join(APP, 'lib', 'tower.ts'), 'utf8')
  assert.doesNotMatch(towerSrc, /from '\.\/(portraits|towerFaces|towerServer)'|atlas\.json/, 'lib/tower.ts stays pure: no portrait data in it')
})

test('lib/tower.ts holds the TowerFaces interface and the two optional fields, as agreed', () => {
  const src = fs.readFileSync(path.join(APP, 'lib', 'tower.ts'), 'utf8')
  const block = /export interface TowerFaces \{([\s\S]*?)\n\}/.exec(src)
  assert.ok(block, 'no TowerFaces interface')
  for (const field of ['src: string', 'tile: number', 'cols: number', 'rows: number', 'w: number', 'h: number']) {
    assert.ok(block![1].includes(field), `TowerFaces lacks "${field}"`)
  }
  assert.match(src, /\bface\?: number\b/)
  assert.match(src, /\bfaces\?: TowerFaces\b/)
})

test('towerServer attaches the faces to the layout and gives buildTowerRoad the original one', () => {
  const src = fs.readFileSync(path.join(APP, 'lib', 'towerServer.ts'), 'utf8')
  assert.match(src, /import atlasData from '\.\.\/public\/portraits\/atlas\.json'/)
  assert.match(src, /attachFaces\(data, atlasData as PortraitAtlas, hasPortrait\)/)
  assert.match(src, /buildTowerRoad\(data, sages, connections, locale\)/, 'the road reads the bare layout, not the one with faces')
})

console.log('\nattachFaces on a made-up atlas')

const node = (id: string): TowerNode => ({
  id, name: id, short: id, era: 'tannaim', region: 'other', year: 100, dated: true, years: '', x: 0, y: 0, z: 0, size: 1, color: '#fff',
  degree: 0, research: false, landmark: false, rank: 0,
})
const fakeAtlas: PortraitAtlas = { tile: 64, cols: 4, rows: 2, w: 256, h: 128, v: 'deadbeef', ids: ['b', 'a', 'd', 'x'] }
const fakeData = (): TowerData => ({
  nodes: ['a', 'b', 'c', 'd'].map(node), links: [], eras: [], regions: [], minYear: -1000, maxYear: 2000,
})

test('a sage gets the tile at his position in ids; one with no portrait, or not in the atlas, gets none', () => {
  const data = fakeData()
  const out = attachFaces(data, fakeAtlas, id => id !== 'd')       // d is in the atlas but has no portrait: no face
  assert.deepEqual(out.nodes.map(n => [n.id, n.face]), [['a', 1], ['b', 0], ['c', undefined], ['d', undefined]])
  assert.ok(out.nodes.filter(n => n.id === 'c' || n.id === 'd').every(n => !('face' in n)))
  const all = attachFaces(data, fakeAtlas, () => true)             // c has a portrait but is not in the atlas: no face
  assert.deepEqual(all.nodes.map(n => n.face), [1, 0, undefined, 2])
})

test('attachFaces does not change its input, and passes the rest of the data through', () => {
  const data = fakeData()
  const before = JSON.stringify(data)
  const out = attachFaces(data, fakeAtlas, () => true)
  assert.equal(JSON.stringify(data), before)
  assert.ok(data.nodes.every(n => !('face' in n)))
  assert.equal(out.minYear, data.minYear)
  assert.equal(out.links, data.links)
  assert.deepEqual(out.faces, { src: '/portraits/atlas.webp?v=deadbeef', tile: 64, cols: 4, rows: 2, w: 256, h: 128 })
  assert.deepEqual(facesOf(fakeAtlas), out.faces)
})

test('the page data grows by a few KB only (a number a node, one faces object)', () => {
  const he = towerData('he')
  const withFaces = JSON.stringify(he).length
  const without = JSON.stringify({ ...he, faces: undefined, nodes: he.nodes.map(({ face, ...n }) => (void face, n)) }).length
  const grew = withFaces - without
  console.log(`       tower data (he) as JSON: ${without} -> ${withFaces} bytes (+${grew})`)
  assert.ok(grew > 0 && grew < 6000, `grew by ${grew} bytes`)
})

console.log(`\n${'='.repeat(50)}\nTests: ${passed} passed, ${failed} failed\n${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
