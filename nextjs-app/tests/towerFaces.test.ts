/**
 * Faces in the Tower of Generations (components/tower/faceLayer.ts, wired in components/tower/TowerScene.tsx): a sage
 * with a portrait is a round face from the atlas instead of a sphere. WebGL is not available here, so this runs the
 * pure parts on their own (tile geometry, the point-size clamp, screen-space picking, the grow's timing, a screen
 * projection), the shader's source, the layer's loading paths against a fake three.js (a failed atlas, a late one),
 * the real atlas against the real portraits (the rectangle `faceUv` gives for a sage holds his picture, not a
 * neighbour's), and the scene's source for the wiring that no browser check here can reach.
 * No test names a sage id.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  CREDIT_MIN_PX, FACE_FRAGMENT, FACE_INSET, FACE_VERTEX, FACE_WORLD, FOCUS_PULL, FaceModel, GROW_MS, GROW_TO, HERO_DEPTH,
  drawnDepth, drawnDistance, easeOut, faceUv, facePx, growFactor, labelCovered, labelWidth, loadFaceLayer, pickFace, projectPoint, sizingFor,
  type FaceEnv, type FaceHits, type FaceSizing,
} from '../components/tower/faceLayer'
import { towerData } from '../lib/towerServer'
import { PORTRAIT_CREDIT, portraitCredit, portraitOf } from '../lib/portraits'
import type { Locale } from '../lib/types'

let passed = 0
let failed = 0
const queue: Array<() => Promise<void>> = []

/** Tests run one after the other, in order; a test may be async. */
function test(name: string, fn: () => void | Promise<void>) {
  queue.push(async () => {
    try {
      await fn()
      console.log(`  ok  ${name}`)
      passed++
    } catch (e) {
      console.log(`  FAIL ${name}`)
      console.log(`       ${(e as Error).message}`)
      failed++
    }
  })
}
const heading = (s: string) => queue.push(async () => { console.log(`\n${s}`) })

const app = path.join(__dirname, '..')
const src = (rel: string) => readFileSync(path.join(app, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps

// ─────────────────────────────────────────────────────────────────────────────
heading('tile geometry')

const ATLAS = { tile: 64, cols: 32, w: 2048, h: 1024 }

test('faceUv: tile 0 is the top-left tile, tile k is column k % cols and row floor(k / cols) from the top', () => {
  const t0 = faceUv(0, ATLAS)
  assert.deepEqual(t0, { u0: 0, u1: 64 / 2048, v1: 1, v0: 1 - 64 / 1024 })
  // three's default flipY: the TOP row of the picture is the largest v
  const t1 = faceUv(1, ATLAS)
  assert.ok(near(t1.u0, 64 / 2048) && near(t1.u1, 128 / 2048) && t1.v1 === 1)
  const t32 = faceUv(32, ATLAS) // first tile of the second row
  assert.ok(t32.u0 === 0 && near(t32.v1, 1 - 64 / 1024) && near(t32.v0, 1 - 128 / 1024))
  // the formula of the shared interface, for a tile in the middle of the grid and for the last one of 331
  for (const k of [5, 77, 330]) {
    const col = k % 32, row = Math.floor(k / 32), u = faceUv(k, ATLAS)
    assert.ok(near(u.u0, (col * 64) / 2048) && near(u.u1, ((col + 1) * 64) / 2048), `u of ${k}`)
    assert.ok(near(u.v1, 1 - (row * 64) / 1024) && near(u.v0, 1 - ((row + 1) * 64) / 1024), `v of ${k}`)
  }
  const last = faceUv(330, ATLAS)
  assert.ok(near(last.u0, 10 * 64 / 2048) && near(last.v1, 1 - 10 * 64 / 1024), 'tile 330 is column 10 of row 10')
  // a tile is square in pixels and never leaves the picture
  for (const k of [0, 31, 32, 330, 511]) {
    const u = faceUv(k, ATLAS)
    assert.ok(near((u.u1 - u.u0) * ATLAS.w, 64) && near((u.v1 - u.v0) * ATLAS.h, 64))
    assert.ok(u.u0 >= 0 && u.u1 <= 1 && u.v0 >= 0 && u.v1 <= 1)
  }
})

test('every face of the real tower has its own tile inside the picture, in he, en and ru', () => {
  for (const l of LOCALES) {
    const data = towerData(l)
    assert.ok(data.faces, `${l}: the tower ships the atlas`)
    const f = data.faces!
    assert.equal(f.w, f.cols * f.tile)
    assert.equal(f.h, f.rows * f.tile)
    const seen = new Set<number>()
    let n = 0
    for (const node of data.nodes) {
      if (node.face == null) continue
      n++
      assert.ok(Number.isInteger(node.face) && node.face >= 0 && node.face < f.cols * f.rows, `${l}: tile ${node.face}`)
      assert.ok(!seen.has(node.face), `${l}: two sages share tile ${node.face}`)
      seen.add(node.face)
      const u = faceUv(node.face, f)
      assert.ok(u.u0 >= 0 && u.u1 <= 1 && u.v0 >= 0 && u.v1 <= 1 && u.u1 > u.u0 && u.v1 > u.v0)
      assert.ok(portraitOf(node.id), `${l}: a face for a sage with no portrait`)
    }
    assert.ok(n > 100, `${l}: only ${n} faces`)
  }
})

test('the rectangle faceUv gives for a sage holds his own picture in the real atlas, not a neighbour\'s', async () => {
  let sharp: typeof import('sharp') | null = null
  try { sharp = (await import('sharp')).default as unknown as typeof import('sharp') } catch { /* optional in some installs */ }
  if (!sharp) { console.log('       (sharp is not installed: the pixel check is skipped; scripts/build_portraits.py checks every tile on each build)'); return }
  const data = towerData('he')
  const faces = data.faces!
  const file = path.join(app, 'public', faces.src.split('?')[0])
  const atlas = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  assert.equal(atlas.info.width, faces.w)
  assert.equal(atlas.info.height, faces.h)
  const ch = atlas.info.channels
  const withFace = data.nodes.filter(n => n.face != null).sort((a, b) => a.face! - b.face!)
  /** The mean absolute difference between tile `face` of the atlas and a 64 px picture, by the rectangle faceUv gives. */
  const meanDiff = (face: number, mine: Buffer) => {
    const u = faceUv(face, faces)
    // texture v runs up: the pixel row of the tile's top edge is (1 - v1) * h
    const left = Math.round(u.u0 * faces.w), top = Math.round((1 - u.v1) * faces.h), size = Math.round((u.u1 - u.u0) * faces.w)
    assert.equal(size, faces.tile)
    let sum = 0
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) for (let c = 0; c < 3; c++) {
      sum += Math.abs(atlas.data[((top + y) * atlas.info.width + left + x) * ch + c] - mine[(y * size + x) * 3 + c])
    }
    return sum / (size * size * 3)
  }
  const small = async (id: string) => sharp(path.join(app, 'public', portraitOf(id)!.srcSm)).resize(faces.tile, faces.tile, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer()
  // every sage of the tower, so an off-by-one anywhere would show: his own tile is close to his picture (lossy webp,
  // another resampler: up to ~8 of 255) and far from the next sage's tile (27 and more)
  for (let i = 0; i < withFace.length; i++) {
    const node = withFace[i], next = withFace[(i + 1) % withFace.length]
    const mine = await small(node.id)
    const own = meanDiff(node.face!, mine), other = meanDiff(next.face!, mine)
    assert.ok(own <= 12, `sage ${node.id}: tile ${node.face} is not his picture (mean difference ${own.toFixed(1)})`)
    assert.ok(own * 2 < other, `sage ${node.id}: his tile (${own.toFixed(1)}) is not clearly nearer his picture than the next tile (${other.toFixed(1)})`)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
heading('the point size: floor, cap, scale, the GPU\'s limit')

// 900 px per world unit at depth 1 (800 px high, fov 48): a world unit is about 6 px at the home distance of 144
const SZ: FaceSizing = { pxPerUnit: 900, min: 20, cap: 60, hw: 1000 }

test('a normal face is never a dot and never huge; the floor and the cap scale with the state', () => {
  // far: the floor. near: the cap. between: the world size.
  assert.equal(facePx(1, 150, 1, SZ), 20, 'a tiny sage at the home view is still 20 px')
  assert.equal(facePx(6, 400, 1, SZ), 20, '6 x 900 / 400 = 13.5 px: the floor')
  assert.equal(facePx(6, 40, 1, SZ), 60, 'close (135 px): the cap')
  assert.ok(near(facePx(6, 180, 1, SZ), 30), 'between the two it follows the world size (30 px)')
  // the state: dimmed is half, chosen 1.35, grown up to 2.6 times the clamped size; hidden is nothing
  assert.equal(facePx(1, 150, 0.5, SZ), 10)
  assert.ok(near(facePx(1, 150, 1.35, SZ), 27))
  assert.ok(near(facePx(6, 40, GROW_TO, SZ), 60 * GROW_TO))
  assert.equal(facePx(6, 40, 0, SZ), 0)
  assert.equal(facePx(6, 40, -1, SZ), 0)
  // the dimmed face is smaller than the normal one even where both are clamped
  assert.ok(facePx(1, 150, 0.5, SZ) < facePx(1, 150, 1, SZ))
  assert.ok(facePx(6, 40, 0.5, SZ) < facePx(6, 40, 1, SZ))
  // a point at the camera does not divide by zero
  assert.ok(Number.isFinite(facePx(6, 0, 1, SZ)))
})

test('the GPU\'s largest point is a ceiling for everything, a grown face included', () => {
  const weak: FaceSizing = { ...SZ, hw: 64 }
  assert.equal(facePx(6, 40, GROW_TO, weak), 64)
  assert.equal(facePx(6, 40, 1, weak), 60)
  assert.equal(facePx(1, 150, 1, { ...SZ, hw: 12 }), 12)
})

test('a phone (a host under 640 px wide) gets smaller floors and a smaller cap; the scale is height / 2 tan(fov/2)', () => {
  const proj = 1 / Math.tan((48 * Math.PI) / 360)
  const phone = sizingFor(390, 844, proj, 4096, 2), desk = sizingFor(1280, 800, proj, 4096, 1)
  assert.ok(phone.min < desk.min && phone.cap < desk.cap)
  assert.equal(phone.min, 16)
  assert.equal(desk.min, 20)
  assert.equal(sizingFor(639, 800, proj, 4096, 1).min, 16)
  assert.equal(sizingFor(640, 800, proj, 4096, 1).min, 20)
  assert.ok(near(desk.pxPerUnit, 400 * proj))
  // the GPU's limit is in device pixels, the sizes in CSS pixels
  assert.equal(phone.hw, 2048)
  assert.equal(desk.hw, 4096)
  // 144 units away on the desktop a world unit is about 6 px: the sizes in the plan
  assert.ok(Math.abs(desk.pxPerUnit / 144 - 6.2) < 0.5)
})

// ─────────────────────────────────────────────────────────────────────────────
heading('the screen position of a face')

/** The camera of the scene: at the origin, looking down -z, fov 48, aspect w/h. */
function camera(w: number, h: number) {
  const t = Math.tan((48 * Math.PI) / 360)
  const view = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  const proj = new Array(16).fill(0)
  proj[0] = 1 / ((w / h) * t); proj[5] = 1 / t
  return { view, proj }
}

test('projectPoint puts a point on the axis at the centre, one to the right on the right, and drops what is behind the camera', () => {
  const { view, proj } = camera(1280, 800)
  const out = new Float64Array(3)
  assert.ok(projectPoint(view, proj, 0, 0, -10, 1280, 800, out))
  assert.ok(near(out[0], 640) && near(out[1], 400) && near(out[2], 10))
  assert.ok(projectPoint(view, proj, 2, 0, -10, 1280, 800, out))
  assert.ok(out[0] > 640, 'to the right')
  assert.ok(projectPoint(view, proj, 0, 2, -10, 1280, 800, out))
  assert.ok(out[1] < 400, 'up is toward the top of the screen')
  // the top of the view at depth d is d * tan(fov/2) up: it lands on the top edge
  const d = 10, up = d * Math.tan((48 * Math.PI) / 360)
  assert.ok(projectPoint(view, proj, 0, up, -d, 1280, 800, out) && near(out[1], 0, 1e-6))
  assert.equal(projectPoint(view, proj, 0, 0, 5, 1280, 800, out), false, 'behind the camera')
  assert.equal(projectPoint(view, proj, 0, 0, 0, 1280, 800, out), false, 'at the camera')
})

// ─────────────────────────────────────────────────────────────────────────────
heading('picking by what is drawn')

const hits = (rows: Array<[number, number, number, number]>): FaceHits => ({
  x: rows.map(r => r[0]), y: rows.map(r => r[1]), r: rows.map(r => r[2]), depth: rows.map(r => r[3]), count: rows.length,
})

test('pickFace: a point on a disc picks it; outside every disc, and every slop, picks nothing', () => {
  const h = hits([[100, 100, 10, 50], [200, 100, 10, 50]])
  assert.equal(pickFace(h, 100, 100), 0)
  assert.equal(pickFace(h, 200, 100), 1)
  assert.equal(pickFace(h, 109, 100), 0, 'inside the radius')
  assert.equal(pickFace(h, 111, 100), -1, 'just outside')
  assert.equal(pickFace(h, 150, 100), -1, 'between')
  assert.equal(pickFace(h, 150, 300), -1, 'far')
  assert.equal(pickFace(hits([]), 1, 1), -1, 'no faces')
})

test('pickFace: of two discs holding the point the front-most wins, and at one depth the nearer centre wins', () => {
  // two overlapping faces, the one nearer the camera (depth 40) drawn over the other (depth 60)
  const h = hits([[100, 100, 20, 60], [110, 100, 20, 40]])
  assert.equal(pickFace(h, 100, 100), 1, 'both hold the point; the front one is on top, even though the other centre is nearer')
  assert.equal(pickFace(h, 85, 100), 0, 'only the back one holds this point')
  assert.equal(pickFace(h, 128, 100), 1, 'only the front one holds this one')
  // the same depth: the one whose centre is nearer
  const same = hits([[100, 100, 20, 50], [110, 100, 20, 50]])
  assert.equal(pickFace(same, 103, 100), 0)
  assert.equal(pickFace(same, 108, 100), 1)
  // the order the faces are listed in decides nothing
  const swapped = hits([[110, 100, 20, 40], [100, 100, 20, 60]])
  assert.equal(pickFace(swapped, 100, 100), 0)
})

test('pickFace: a face not drawn (radius 0, hidden or off screen) is never picked; slop helps a finger but never beats a face under it', () => {
  const h = hits([[100, 100, 0, 10], [100, 100, 10, 90]])
  assert.equal(pickFace(h, 100, 100), 1, 'the first is hidden, whatever its depth')
  assert.equal(pickFace(hits([[100, 100, NaN, 10]]), 100, 100), -1)
  // a finger: 14 px of slop reaches a disc whose edge is 8 px away
  const small = hits([[100, 100, 6, 50]])
  assert.equal(pickFace(small, 114, 100, 0), -1)
  assert.equal(pickFace(small, 114, 100, 14), 0)
  assert.equal(pickFace(small, 140, 100, 14), -1, 'past the slop')
  // two faces within slop: the nearer centre; and a disc that holds the point beats a nearer-looking one that only the slop reaches
  const two = hits([[100, 100, 6, 50], [120, 100, 6, 50]])
  assert.equal(pickFace(two, 109, 100, 14), 0)
  assert.equal(pickFace(two, 111, 100, 14), 1)
  const mixed = hits([[100, 100, 6, 50], [117, 100, 6, 80]])
  assert.equal(pickFace(mixed, 112, 100, 14), 1, 'the point is on the second disc: the first only reaches by slop')
})

test('what is drawn on top is what is picked: while something is dimmed a lit face beats a nearer dimmed one, a grown face beats everything inside its disc, and with nothing dimmed the true depth rules', () => {
  // drawnDepth mirrors the shader: pulled FOCUS_PULL nearer (never past 0.6) for a face that is not dimmed while something is; a hero in front of all
  assert.equal(drawnDepth(50, false, true, false), 50 - FOCUS_PULL)
  assert.equal(drawnDepth(20, false, true, false), 0.6, 'never past the near plane')
  assert.equal(drawnDepth(50, true, true, false), 50, 'a dimmed face is drawn at its depth')
  assert.equal(drawnDepth(50, false, false, false), 50, 'with nothing dimmed there is no pull')
  assert.equal(drawnDepth(50, true, false, true), 50 - HERO_DEPTH, 'a grown face, whatever else it is')
  assert.ok(HERO_DEPTH > 1000, 'in front of anything the camera can see')
  // (a) a dimmed face is nearer (depth 20) than a lit one (depth 45) and covers its centre: the lit one is drawn over it, so it is picked
  const dimmedNear = hits([[100, 100, 20, drawnDepth(20, true, true, false)], [110, 100, 20, drawnDepth(45, false, true, false)]])
  assert.equal(pickFace(dimmedNear, 100, 100), 1, 'the lit face under a nearer dimmed one')
  // with the true depths (the old rule) the dimmed one would have won: that was the bug
  assert.equal(pickFace(hits([[100, 100, 20, 20], [110, 100, 20, 45]]), 100, 100), 0)
  // two lit faces keep their order (they are pulled alike), two dimmed ones too
  assert.equal(pickFace(hits([[100, 100, 20, drawnDepth(60, false, true, false)], [110, 100, 20, drawnDepth(45, false, true, false)]]), 105, 100), 1)
  assert.equal(pickFace(hits([[100, 100, 20, drawnDepth(60, true, true, false)], [110, 100, 20, drawnDepth(45, true, true, false)]]), 105, 100), 1)
  // (b) the grown face wins over a nearer face of any kind inside its disc, and outside it the others are as they were
  const grown = hits([[100, 100, 40, drawnDepth(90, false, true, true)], [110, 100, 15, drawnDepth(10, false, true, false)], [90, 100, 15, drawnDepth(8, true, true, false)]])
  assert.equal(pickFace(grown, 105, 100), 0, 'inside the grown disc, over a lit and a dimmed face nearer than it')
  assert.equal(pickFace(grown, 139, 100), 0)
  assert.equal(pickFace(grown, 150, 100), -1, 'outside it')
  // a face leaving the hero state (a slot given up) goes back to its own depth
  assert.equal(pickFace(hits([[100, 100, 40, drawnDepth(90, false, true, false)], [110, 100, 15, drawnDepth(10, false, true, false)]]), 105, 100), 1)
  // and against a sphere hit, by the distance as drawn: the hero is in front of any sphere, a pulled lit face of one 40 units behind it, a dimmed face is not
  const dist = 100, depth = 90
  assert.ok(drawnDistance(dist, depth, drawnDepth(depth, false, true, true)) < 0, 'a grown face is in front of any sphere hit')
  assert.ok(drawnDistance(dist, depth, drawnDepth(depth, false, true, false)) < dist - 30, 'a lit face is drawn about FOCUS_PULL nearer')
  assert.equal(drawnDistance(dist, depth, drawnDepth(depth, true, true, false)), dist, 'a dimmed face keeps its distance')
  assert.equal(drawnDistance(dist, depth, drawnDepth(depth, false, false, false)), dist, 'with nothing dimmed it is the true distance')
  // (c) with nothing dimmed and no grown face, the old front-most rule holds
  const plain = hits([[100, 100, 20, drawnDepth(60, false, false, false)], [110, 100, 20, drawnDepth(40, false, false, false)]])
  assert.equal(pickFace(plain, 100, 100), 1)
  assert.equal(pickFace(plain, 85, 100), 0)
})

test('the layer picks by drawnDepth and reports its distance as drawn; it knows when something is dimmed from the states it was given', () => {
  assert.match(layerSrc, /sd\[k\] = drawnDepth\(info\[2\], model\.dim\[k\] > 0, pullOn, slotOf\[k\] >= 0\)/)
  assert.match(layerSrc, /lastPickDistance = drawnDistance\(/)
  assert.match(layerSrc, /pullOn = anyDim\s+shared\.uPull\.value = anyDim \? FOCUS_PULL : 0/)
})

// ─────────────────────────────────────────────────────────────────────────────
heading('names over a grown face')

test('labelCovered: a name whose box reaches the disc (plus the margin) is covered; far away, or beside it past the margin, is not', () => {
  const M = 14
  // a name anchored on the disc, and one at its edge
  assert.equal(labelCovered(300, 300, 10, 300, 300, 80, 0, M), true)
  assert.equal(labelCovered(300 + 80, 300, 10, 300, 300, 80, 0, M), true)
  // anchored outside the disc but its text spans onto it: a wide name 100 px to the right of the edge
  const w = labelWidth(24)
  assert.equal(labelCovered(300 + 80 + w / 2 + M - 5, 300, 24, 300, 300, 80, 0, M), true, 'the box reaches the margin')
  assert.equal(labelCovered(300 + 80 + w / 2 + M + 5, 300, 24, 300, 300, 80, 0, M), false, 'the box stops short of the margin')
  // above and below by the box's half height
  assert.equal(labelCovered(300, 300 - 80 - 11 - M + 3, 10, 300, 300, 80, 0, M), true)
  assert.equal(labelCovered(300, 300 - 80 - 11 - M - 3, 10, 300, 300, 80, 0, M), false)
  assert.equal(labelCovered(900, 700, 10, 300, 300, 80, 0, M), false, 'far away')
  // the credit line: 16 px under the disc, as wide as its text; a name there is covered only while the credit is shown
  const under = 300 + 80 + 16
  assert.equal(labelCovered(300, under + 24, 12, 300, 300, 80, 0, M), false, 'no credit line, and clear of the disc plus margin')
  assert.equal(labelCovered(300, under + 24, 12, 300, 300, 80, 38, M), true, 'with the credit line it would sit on it')
  assert.equal(labelCovered(300 + 250, under, 12, 300, 300, 80, 38, M), false, 'beside the credit line, well clear')
  assert.equal(labelCovered(300, 300 + 80 + 16 + 120, 12, 300, 300, 80, 38, M), false, 'far below')
})

// ─────────────────────────────────────────────────────────────────────────────
heading('the grow')

test('growFactor: 1 at once, about 2.6 from 600 ms on, never down, ease-out', () => {
  assert.equal(growFactor(0), 1)
  assert.equal(growFactor(-50), 1)
  assert.equal(GROW_TO, 2.6)
  assert.equal(GROW_MS, 600)
  assert.ok(near(growFactor(600), 2.6))
  assert.equal(growFactor(5000), growFactor(600))
  let prev = growFactor(0)
  for (let t = 10; t <= 600; t += 10) { const g = growFactor(t); assert.ok(g >= prev, `monotonic at ${t}`); prev = g }
  // ease-out: most of the way in the first half
  assert.ok(growFactor(300) - 1 > (GROW_TO - 1) * 0.8)
  assert.ok(easeOut(0.5) > 0.5 && easeOut(0) === 0 && easeOut(1) === 1 && easeOut(7) === 1 && easeOut(-1) === 0)
})

test('FaceModel: told to grow a face it eases up to 2.6 in 600 ms; told to grow another, the first eases back down', () => {
  const m = new FaceModel(5)
  assert.equal(m.step(0), false, 'nothing moving at rest')
  m.grow(2, 1000)
  assert.equal(m.grown, 2)
  assert.equal(m.cur[2], 1, 'not yet')
  assert.ok(m.step(1300) && m.cur[2] > 1 && m.cur[2] < GROW_TO, 'halfway')
  assert.ok(near(m.cur[2], growFactor(300), 1e-5), 'the same curve as growFactor')
  m.step(1600)
  assert.ok(near(m.cur[2], GROW_TO, 1e-5))
  assert.equal(m.moving.length, 0, 'done: nothing moves any more')
  assert.equal(m.step(1700), false)
  // the next station
  m.grow(3, 5000)
  assert.equal(m.to[2], 1)
  assert.ok(near(m.to[3], GROW_TO, 1e-6))
  m.step(5300)
  assert.ok(m.cur[2] < GROW_TO && m.cur[2] > 1, 'the old one is coming back')
  assert.ok(m.cur[3] > 1 && m.cur[3] < GROW_TO, 'the new one is coming forward')
  m.step(5700)
  assert.equal(m.cur[2], 1)
  assert.ok(near(m.cur[3], GROW_TO, 1e-5))
  assert.equal(m.grownOrGrowing(2), false)
  assert.equal(m.grownOrGrowing(3), true)
  // the overview: nobody grown, every face back
  m.grow(-1, 8000)
  assert.equal(m.grown, -1)
  m.step(8700)
  assert.deepEqual([...m.cur], [1, 1, 1, 1, 1])
  assert.equal(m.moving.length, 0)
})

test('FaceModel: a face told twice in a row is left alone; a change in the middle starts from where the face is, with no jump', () => {
  const m = new FaceModel(3)
  m.grow(1, 0)
  m.step(200)
  const mid = m.cur[1]
  m.grow(1, 200)
  m.step(250)
  assert.ok(m.cur[1] > mid, 'still going up, not restarted')
  m.grow(2, 250)
  const at = m.cur[1]
  m.step(250)
  assert.ok(near(m.cur[1], at), 'no jump when the face turns back')
  m.step(400)
  assert.ok(m.cur[1] < at, 'then it goes down')
  assert.ok(m.cur[1] >= 1)
  // and back again before it arrived
  m.grow(1, 400)
  const here = m.cur[1]
  m.step(400)
  assert.ok(near(m.cur[1], here))
  m.step(2000)
  assert.ok(near(m.cur[1], GROW_TO, 1e-5))
  assert.equal(m.cur[2], 1)
})

test('FaceModel: with reduced motion the grow is instant and nothing ever moves', () => {
  const m = new FaceModel(3)
  m.reduced = true
  m.grow(0, 0)
  assert.ok(near(m.cur[0], GROW_TO, 1e-5))
  assert.equal(m.moving.length, 0)
  m.grow(1, 10)
  assert.equal(m.cur[0], 1)
  assert.ok(near(m.cur[1], GROW_TO, 1e-5))
  assert.equal(m.step(20), false)
})

test('FaceModel.shown: hidden is 0, dimmed stays dimmed, a grown face is at least as large as its state says', () => {
  const m = new FaceModel(4)
  m.set(0, 1, false); m.set(1, 0, false); m.set(2, 0.5, true); m.set(3, 1.35, false)
  assert.equal(m.shown(0), 1)
  assert.equal(m.shown(1), 0, 'not yet lived: hidden, grown or not')
  assert.equal(m.shown(2), 0.5, 'dimmed is half the size, not clamped back to one')
  assert.ok(near(m.shown(3), 1.35, 1e-5))
  m.reduced = true
  m.grow(1, 0)
  assert.equal(m.shown(1), 0, 'a hidden face stays hidden while grown')
  m.grow(3, 1)
  assert.ok(near(m.shown(3), GROW_TO, 1e-5), 'the chosen sage grows from 1.35 to 2.6, not to 1.35 times 2.6')
  m.grow(0, 2)
  assert.ok(near(m.shown(0), GROW_TO, 1e-5))
  assert.ok(near(m.shown(3), 1.35, 1e-5), 'and back to his state when another is grown')
  m.set(0, 0, false)
  assert.equal(m.shown(0), 0, 'the time-lapse hides a grown face too')
  assert.equal(m.dim[2], 1)
})

// ─────────────────────────────────────────────────────────────────────────────
heading('the shader')

test('the vertex shader clamps the size (floor, cap, GPU limit), hides scale 0 and fogs by depth', () => {
  assert.match(FACE_VERTEX, /float css = min\(uHw, aState\.x \* clamp\(aSize \* uPxPerUnit \/ depth, uMin, uCap\)\);/)
  assert.match(FACE_VERTEX, /gl_PointSize = css \* uRatio;/)
  assert.match(FACE_VERTEX, /if \(aState\.x <= 0\.0\) \{\s+gl_Position = vec4\(2\.0, 2\.0, 2\.0, 1\.0\);/)
  assert.match(FACE_VERTEX, /uFogDensity \* uFogDensity \* depth \* depth/)
  for (const a of ['aUv', 'aColor', 'aSize', 'aState']) assert.match(FACE_VERTEX, new RegExp(`attribute \\w+ ${a};`))
  // the same arithmetic as facePx: uniforms named for it
  for (const u of ['uPxPerUnit', 'uMin', 'uCap', 'uHw', 'uRatio']) assert.match(FACE_VERTEX, new RegExp(`uniform float ${u};`))
})

test('a face that is not dimmed is pulled toward the camera for the depth test only (a dimmed face in front never covers a station), and the layer turns it on only while something is dimmed', () => {
  assert.ok(FOCUS_PULL > 10 && FOCUS_PULL < 100, `${FOCUS_PULL}`)
  assert.match(FACE_VERTEX, /uniform float uPull;/)
  assert.match(FACE_VERTEX, /float pull = aState\.y > 0\.5 \? 0\.0 : uPull;/)
  // along the view ray (the same place on the screen), never past the near plane; the point's size still comes from the true depth
  assert.match(FACE_VERTEX, /gl_Position = projectionMatrix \* vec4\(mv\.xyz \* \(max\(depth - pull, 0\.6\) \/ depth\), 1\.0\);/)
  assert.ok(FACE_VERTEX.indexOf('float css') < FACE_VERTEX.indexOf('float pull'))
  const layer = readFileSync(path.join(__dirname, '../components/tower/faceLayer.ts'), 'utf8')
  assert.match(layer, /shared\.uPull\.value = anyDim \? FOCUS_PULL : 0/)
})

test('the fragment shader samples inside the tile (the inset), cuts a circle by gl_PointCoord, flips y, draws the ring, and encodes the colour', () => {
  assert.equal(FACE_INSET, 0.04)
  assert.match(FACE_FRAGMENT, /const float INSET = 0\.040;/)
  assert.match(FACE_FRAGMENT, /clamp\(0\.5 \+ p \* \(\(1\.0 - 2\.0 \* INSET\) \/ rIn\), INSET, 1\.0 - INSET\)/)
  assert.match(FACE_FRAGMENT, /vec2 p = gl_PointCoord - 0\.5;/)
  // gl_PointCoord runs y-down and the texture y-up: the top of the face is v1 (vUv.w)
  assert.match(FACE_FRAGMENT, /texture2D\(map, vec2\(mix\(vUv\.x, vUv\.z, t\.x\), mix\(vUv\.w, vUv\.y, t\.y\)\)\)/)
  assert.match(FACE_FRAGMENT, /if \(alpha < 0\.02\) discard;/)
  assert.ok(FACE_FRAGMENT.indexOf('texture2D') < FACE_FRAGMENT.indexOf('discard'), 'sampled before discarding (derivatives)')
  assert.match(FACE_FRAGMENT, /mix\(vRing, pic,/)
  assert.match(FACE_FRAGMENT, /#include <colorspace_fragment>/)
  // the sample never reads beyond the inset: the farthest the circle reaches is the ring's inner edge, clamped
  assert.ok((1 - 2 * FACE_INSET) / 0.78 * 0.39 <= 0.5 - FACE_INSET + 1e-9, 'inside the tile at the ring')
})

// ─────────────────────────────────────────────────────────────────────────────
heading('loading the atlas: nothing thrown, nothing shown, nothing leaked')

/** A three.js that is only a texture loader, with the callbacks it was given. */
function fakeThree() {
  const calls: Array<{ url: string; ok: (t: unknown) => void; err: () => void }> = []
  const THREE = { TextureLoader: class { load(url: string, ok: (t: unknown) => void, _p: unknown, err: () => void) { calls.push({ url, ok, err }) } } }
  return { THREE, calls }
}
const fakeEnv = (THREE: unknown, cancelled = () => false): FaceEnv => ({
  THREE: THREE as FaceEnv['THREE'], CSS2DObject: class {} as unknown as FaceEnv['CSS2DObject'],
  scene: {} as FaceEnv['scene'], camera: {} as FaceEnv['camera'], renderer: {} as FaceEnv['renderer'],
  nodes: [], faces: { src: '/portraits/atlas.webp?v=abcd1234', tile: 64, cols: 32, rows: 16, w: 2048, h: 1024 }, locale: 'he',
  size: () => ({ w: 100, h: 100 }), cancelled,
})

test('a failed atlas resolves null, throws nothing, and asks for the file the page named', async () => {
  const { THREE, calls } = fakeThree()
  const p = loadFaceLayer(fakeEnv(THREE))
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/portraits/atlas.webp?v=abcd1234')
  calls[0].err()
  assert.equal(await p, null)
  // a loader that throws at once
  const boom = { TextureLoader: class { load() { throw new Error('no loader') } } }
  assert.equal(await loadFaceLayer(fakeEnv(boom)), null)
})

test('an atlas that arrives after the scene was disposed is thrown away: its texture is disposed and no layer is made', async () => {
  const { THREE, calls } = fakeThree()
  let gone = false
  const p = loadFaceLayer(fakeEnv(THREE, () => gone))
  let disposed = 0
  gone = true
  calls[0].ok({ dispose: () => { disposed++ } })
  assert.equal(await p, null)
  assert.equal(disposed, 1)
})

test('an atlas that arrives for a tower with no faces is disposed too (no layer, no leak)', async () => {
  const { THREE, calls } = fakeThree()
  const p = loadFaceLayer(fakeEnv(THREE))
  let disposed = 0
  calls[0].ok({ dispose: () => { disposed++ } })
  assert.equal(await p, null)
  assert.equal(disposed, 1)
})

// ─────────────────────────────────────────────────────────────────────────────
heading('the credit under a grown face')

test('the credit is the portrait\'s own, by kind and language; the layer writes no caption of its own', () => {
  const layer = src('components/tower/faceLayer.ts')
  assert.match(layer, /portraitCredit\(portrait, locale\)/)
  for (const kind of ['illustration', 'photo'] as const) for (const l of LOCALES) {
    assert.ok(!layer.includes(PORTRAIT_CREDIT[kind][l]), `faceLayer.ts writes the ${kind} caption in ${l} itself`)
  }
  assert.doesNotMatch(layer, /PORTRAIT_CREDIT/)
  assert.doesNotMatch(layer, /'illustration'|"illustration"/)
  assert.equal(CREDIT_MIN_PX, 96, 'the site shows a visible credit under pictures of 96 px and more')
  assert.match(layer, /if \(d < CREDIT_MIN_PX\) \{ credit\.visible = false; return \}/)
  // and a photograph's would be the photograph's
  const photo = { kind: 'photo' as const }
  assert.notEqual(portraitCredit(photo, 'en'), portraitCredit({ kind: 'illustration' }, 'en'))
  assert.ok(FACE_WORLD > 0)
})

test('the credit label and the lifted name have their styles, with a phone size', () => {
  const css = src('app/globals.css')
  assert.match(css, /\.tower-face-credit \{[^}]*margin-top: calc\(var\(--face-r, 48px\) \+ 14px\);[^}]*pointer-events: none;/)
  assert.match(css, /\.tower-label-grown \{ margin-top: calc\(-1 \* var\(--face-r, 0px\) - 15px\); \}/)
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.tower-face-credit \{/)
})

// ─────────────────────────────────────────────────────────────────────────────
heading('the scene\'s wiring (source)')

const scene = src('components/tower/TowerScene.tsx')
const layerSrc = src('components/tower/faceLayer.ts')
/** The text between two markers of the scene. */
const between = (from: string, to: string) => {
  const a = scene.indexOf(from)
  assert.ok(a >= 0, `"${from}" is missing from TowerScene.tsx`)
  const b = scene.indexOf(to, a + from.length)
  assert.ok(b > a, `"${to}" does not follow "${from}"`)
  return scene.slice(a, b)
}

test('no module of the tower imports three.js at the top (only its types); the scene still loads it inside the effect', () => {
  for (const f of readdirSync(path.join(app, 'components/tower')).filter(f => /\.tsx?$/.test(f))) {
    const code = src(`components/tower/${f}`)
    for (const line of code.split('\n')) {
      if (/^import .* from 'three(\/|')/.test(line)) assert.match(line, /^import type /, `${f}: a runtime import of three.js: ${line}`)
    }
    assert.doesNotMatch(code, /^(?:export )?(?:const|let|var) \w+ = require\('three/m)
  }
  assert.match(layerSrc, /^import type \* as ThreeNS from 'three'$/m)
  assert.match(layerSrc, /^import type \{ CSS2DObject as CSS2DObjectClass \} from 'three\/examples\/jsm\/renderers\/CSS2DRenderer\.js'$/m)
  assert.match(scene, /await import\('three'\)/)
  assert.doesNotMatch(scene, /^import .* from 'three/m)
  // and the scene imports the layer as a plain module (it holds no three.js)
  assert.match(scene, /^import \{ labelCovered, loadFaceLayer, projectPoint, type FaceLayer \} from '\.\/faceLayer'$/m)
})

test('the atlas is fetched after the scene is up; a failure and a late arrival are both harmless; the texture goes with the scene', () => {
  const built = scene.indexOf('setReady(true)')
  const load = scene.indexOf('loadFaceLayer({')
  assert.ok(built > 0 && load > built, 'the scene is built and shown first, the atlas loads after')
  const block = scene.slice(scene.lastIndexOf('if (data.faces) {', load), scene.indexOf('// pointer: hover shows a name', load))
  assert.match(block, /^if \(data\.faces\) \{/)
  assert.match(block, /cancelled: \(\) => disposed/)
  assert.match(block, /\.then\(layer => \{\s+if \(!layer\) return\s+if \(disposed\) \{ layer\.dispose\(\); return \}/)
  assert.match(block, /\.catch\(\(\) => \{\}\)/, 'no error is shown or thrown')
  assert.doesNotMatch(block, /setFailed|console\.|throw /)
  // the layer: dispose frees the atlas, the sharp pictures, the geometry and the materials; a late sharp picture is let go
  assert.match(layerSrc, /atlas\.dispose\(\)/)
  assert.match(layerSrc, /for \(const t of sharp\) t\?\.dispose\(\)/)
  assert.match(layerSrc, /if \(closed\) \{ tex\.dispose\(\); return \}/)
  assert.match(layerSrc, /if \(env\.cancelled\(\)\) \{ tex\.dispose\(\); resolve\(null\); return \}/)
  assert.match(layerSrc, /geo\.dispose\(\)/)
  assert.match(layerSrc, /for \(const s of slots\) \{ s\.geo\.dispose\(\); s\.mat\.dispose\(\) \}/)
  assert.match(between('sceneApi.dispose = () => {', 'scene.traverse'), /faces\?\.dispose\(\)\s+faces = null/)
  // the atlas request comes from the page's own `faces.src` (with its ?v=): nothing here names a path
  assert.doesNotMatch(scene, /atlas\.webp/)
  assert.match(layerSrc, /load\(env\.faces\.src,/)
})

test('a sphere is hidden only once its face is drawn: while the atlas loads, or if it never does, the tower is as it was', () => {
  const refresh = between('const refreshNodes = () => {', 'const refreshLinks = () => {')
  assert.match(refresh, /const face = faces != null && faces\.has\(i\)/)
  assert.match(refresh, /place\(i, face \? 0 : n\.size \* mult\)/)
  assert.match(refresh, /haloCol\.set\(on && !face \? \[c\.r, c\.g, c\.b\] : \[0, 0, 0\], i \* 3\)/)
  assert.match(refresh, /if \(face\) faces!\.set\(i, mult, !inFocus\)/)
  assert.match(refresh, /faces\?\.commit\(\)/)
  // the state each sage had before: cutoff hides, focus 1.35 / 1.15 / 0.5, in that order of precedence
  assert.match(refresh, /const mult = on \? \(focusId === n\.id \? 1\.35 : !inFocus \? 0\.5 : focusSet \? 1\.15 : 1\) : 0/)
  // once the layer arrives the scene is brought up to date at once, grow included
  assert.match(scene, /faces = layer\s+host\.dataset\.towerFaces = String\(layer\.count\)\s+refreshNodes\(\)\s+layer\.grow\(growId\)/)
})

test('a chosen sage who is a landmark has one name over his face, not two: his landmark label is hidden by `visible` while he is chosen and no road runs', () => {
  const refresh = between('const refreshNodes = () => {', 'const refreshLinks')
  // the same `visible` refreshNodes already sets for the time-lapse and the dimming, so it comes back when he is unchosen or on "Whole tower"
  assert.match(refresh, /for \(const \[id, o\] of landmarkLabels\) o\.visible = visible\(index\.get\(id\)!\) && \(!focusSet \|\| focusSet\.has\(id\)\) && !\(id === focusId && !roadPts\)/)
  // a road to Sinai keeps it (the first station's name); a flight or a tour already removes it for the numbered label
  assert.match(scene, /if \(p\.id && !p\.label && landmarkLabels\.has\(p\.id\)\) return/)
  assert.match(scene, /if \(p\.id && p\.label\) landmarkLabels\.get\(p\.id\)\?\.removeFromParent\(\)/)
  // the chosen sage's own label is the one buildLit makes for the focus
  assert.match(between('const buildLit = () => {', 'const roadGroup'), /if \(landmarkLabels\.has\(id\) && id !== focusId\) continue/)
})

test('the station (and the chosen sage) grows; the overview and clearing the road bring every face back', () => {
  assert.match(between('focus(id) {', 'setVisible(kind, on)'), /growId = id\s+faces\?\.grow\(growId\)/)
  assert.match(between('roadGo(i, ms) {', 'roadOverview() {'), /growId = p\.id \?\? null\s+faces\?\.grow\(growId\)/)
  assert.match(between('roadOverview() {', 'reset() {'), /growId = null\s+faces\?\.grow\(null\)/)
  assert.match(between('const clearRoad = () => {', 'const liftLabels'), /growId = null\s+faces\?\.grow\(null\)/)
  // the pins the road, the kids' tours and the flights already had
  assert.match(scene, /roadGo\(i, ms\)/)
  assert.match(scene, /if \(faces\) \{ faces\.step\(now\); liftLabels\(\); hideUnderFace\(\) \}/)
})

test('while a face is grown the names over it are hidden by visibility, restored after, recomputed only on a change, with no allocation in the frame loop', () => {
  const hide = between('const grownBox', 'const sceneApi')
  // every kind of name is looked at: landmarks, the chain's, the road's and stations', the era and region names, the hover name
  for (const list of ['landmarkList', 'chainLabels', 'roadLabels[i].o', 'guideLabels']) assert.ok(hide.includes(list), list)
  assert.match(hide, /if \(hoverLabel\) coverLabel\(hoverLabel\)/)
  // the grown sage's own name stays; hiding is `visibility`, never the label's own `visible` (that is the time-lapse's and the road's)
  assert.match(hide, /o\.userData\.sage !== growId/)
  assert.match(hide, /style\.visibility = hide \? 'hidden' : ''/)
  assert.doesNotMatch(hide, /\.visible\s*=/)
  // the shape of a name: the pure rule, with the camera's matrices and the canvas' cached size
  assert.match(hide, /labelCovered\(labelAt\[0\], labelAt\[1\], o\.element\.textContent!\.length, dX, dY, dR, dCredit, FACE_LABEL_MARGIN\)/)
  assert.match(hide, /, vw, vh, labelAt\)/)
  // only on a change: the set of names, the disc, or the camera; and nothing to restore when nothing was hidden
  assert.match(hide, /let changed = hideStale \|\| on !== grownOn/)
  assert.match(hide, /for \(let i = 0; i < 16; i\+\+\) if \(e\[i\] !== camSeen\[i\]\)/)
  assert.match(hide, /if \(!on && !hiding\) return/)
  assert.match(hide, /hiding = on/)
  // nothing is made per frame: no new, closure, spread, map or filter in the pass, and no layout read
  const pass = hide.slice(hide.indexOf('const coverLabel'))
  assert.doesNotMatch(pass, /\bnew \w+\(|=> \{? *\w|\[\.\.\.|\.map\(|\.filter\(|\.find\(|\.forEach\(|getBoundingClientRect|offsetWidth|clientWidth/)
  assert.match(hide.slice(0, hide.indexOf('const coverLabel')), /new Float64Array\(4\), grownSeen = new Float64Array\(4\), camSeen = new Float32Array\(16\), labelAt = new Float64Array\(3\)/)
  // the set of names changed: the chain, the road, the hover name and a resize make the next pass look again
  for (const [a, b] of [['const buildLit = () => {', 'const roadGroup'], ['const clearRoad = () => {', 'const liftLabels'], ['const onMove = (ev: PointerEvent) => {', 'const onDown'], ['const onResize = () => {', 'const ro = new ResizeObserver']]) {
    assert.match(between(a, b), /hideStale = true/, a)
  }
  // the layer's side: the grown face on the screen, without allocating
  const grownAtSrc = layerSrc.slice(layerSrc.indexOf('    grownAt(out) {'), layerSrc.indexOf('    resize,'))
  assert.match(grownAtSrc, /out\[0\] = info\[0\]; out\[1\] = info\[1\]; out\[2\] = d \/ 2/)
  assert.doesNotMatch(grownAtSrc, /\bnew \w|=> |\[\.\.\.|\.map\(|\.filter\(|\.find\(/)
})

test('a press picks by what is drawn: faces on the screen, merged with the sphere raycast, the front-most wins; the existing pins hold', () => {
  const pick = between('const pick = (ev: PointerEvent): number | null => {', 'const onMove')
  assert.match(pick, /ray\.intersectObject\(mesh\)/)
  assert.match(pick, /visible\(h\.instanceId\)/)
  assert.match(pick, /if \(!faces\) return sphere/)
  assert.match(pick, /faces\.pick\(ev\.clientX, ev\.clientY, rect, ev\.pointerType === 'touch' \? 14 : ev\.pointerType === 'pen' \? 8 : 3\)/)
  assert.match(pick, /faces\.pickDistance <= sphereAt/)
  // `const i = pick(ev)` directly after the tour guard (the kids' and the flight's tests match that text)
  assert.match(scene, /if \(flightRef\.current\) return\s+if \(tourRef\.current\) return\s+const i = pick\(ev\)/)
  assert.match(scene, /if \(tourRef\.current\) return\s+const i = pick\(ev\)/)
  // the canvas changing shape reaches the faces
  assert.match(between('const onResize = () => {', 'const ro = new ResizeObserver'), /faces\?\.resize\(\)/)
})

test('the test hooks are inert: a function on the host element and a count in an attribute, both removed with the scene', () => {
  assert.match(scene, /\(host as TowerHost\)\.towerFaceAt = id => faces\?\.screenOf\(id\) \?\? null/)
  assert.match(scene, /delete host\.dataset\.towerFaces/)
  assert.match(scene, /delete \(host as TowerHost\)\.towerFaceAt/)
  assert.doesNotMatch(scene, /window\.__|globalThis\./)
})

test('the layer allocates nothing per frame at rest: step() returns early, the loops are indexed, no object is made in step/updateCredit/pick', () => {
  const step = layerSrc.slice(layerSrc.indexOf('    step(now) {'), layerSrc.indexOf('    pick(clientX, clientY, rect, slop) {'))
  assert.match(step, /if \(model\.moving\.length > 0 && model\.step\(now\)\)/)
  assert.match(step, /if \(model\.grown >= 0\) updateCredit\(\)/)
  assert.doesNotMatch(step, /\bnew \w|=> |\[\.\.\.|\.map\(|\.filter\(|\.find\(/)
  const credit = layerSrc.slice(layerSrc.indexOf('const updateCredit = () => {') + 'const updateCredit = () => {'.length, layerSrc.indexOf('const layer: FaceLayer = {'))
  assert.doesNotMatch(credit, /\bnew \w|=> |\[\.\.\.|\.map\(|\.filter\(|\.find\(|env\.size\(\)/)
  const pickBody = layerSrc.slice(layerSrc.indexOf('    pick(clientX, clientY, rect, slop) {'), layerSrc.indexOf('    get pickDistance()'))
  assert.doesNotMatch(pickBody, /\bnew \w|=> |\[\.\.\.|\.map\(|\.filter\(|\.find\(|env\.size\(\)/)
  assert.match(layerSrc, /prefers-reduced-motion: reduce/)
  // one draw call for all the faces: a single Points holds them
  assert.equal((layerSrc.match(/new THREE\.Points\(geo, /g) ?? []).length, 1)
})

test('the faces are one opaque, depth-tested Points; a grown face is blended and drawn last, over everything', () => {
  assert.match(layerSrc, /\{ transparent: true, depthTest: false, depthWrite: false \} : \{ alphaToCoverage: true \}/)
  assert.match(layerSrc, /pts\.renderOrder = 10/)
  assert.match(layerSrc, /atlas\.colorSpace = THREE\.SRGBColorSpace/)
  assert.match(layerSrc, /tex\.colorSpace = THREE\.SRGBColorSpace/)
  assert.match(layerSrc, /atlas\.anisotropy = Math\.min\(4, renderer\.capabilities\.getMaxAnisotropy\(\)\)/)
  assert.match(layerSrc, /gl\.getParameter\(gl\.ALIASED_POINT_SIZE_RANGE\)/)
  // a grown face is drawn from the sage's own small file, on demand
  assert.match(layerSrc, /portrait\.srcSm/)
  assert.match(layerSrc, /const SLOTS = 3/)
})

test('the scene keeps its word rule: "face" everywhere, "portrait" only in the name block\'s helper (portraitsTower.test.ts), and no new <img>', () => {
  assert.equal((scene.match(/<img\b/g) ?? []).length, 1)
  const lines = scene.split('\n')
  let from = lines.findIndex(l => l.includes('export function PanelName('))
  const to = lines.findIndex((l, i) => i > from && l === '}')
  while (from > 0 && lines[from - 1] !== '/**') from--
  from--
  const stray = lines.filter((l, i) => /portrait/i.test(l) && !(i >= from && i <= to) && !/^import .* from '@\/lib\/portraits'$/.test(l) && !/<PanelName\b/.test(l))
  assert.deepEqual(stray, [])
  // every use of the portrait data for a face lives in faceLayer.ts
  assert.match(layerSrc, /import \{ portraitCredit, portraitOf \} from '@\/lib\/portraits'/)
  assert.doesNotMatch(layerSrc, /next\/image|<img/)
})

async function main() {
  for (const t of queue) await t()
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
}
void main()
