// The faces of the Tower of Generations (components/tower/TowerScene.tsx): a sage who has a portrait is drawn
// as a round, camera-facing picture with a ring in his era's colour, in place of his sphere, so the tower
// reads as a wall of faces across 3,700 years. One THREE.Points with a ShaderMaterial draws all of them in
// one draw call from the portrait atlas (public/portraits/atlas.webp, 64 px tiles, built by
// scripts/build_portraits.py and described by `TowerFaces`); nothing is drawn per frame except a grow that
// is running. The station a road, a tour or a flight has reached (and the sage chosen) GROWS toward the
// screen, drawn from his own 128 px file so it stays sharp, with the episode credit under it.
//
// three.js is handed in (`env.THREE`), and only its types are imported here: the scene imports three
// dynamically inside its effect, so no other page pays for it. The pure parts (tile geometry, sizes,
// picking, the grow's timing, the shader source) are exported for tests/towerFaces.test.ts, which runs
// without WebGL.
import type * as ThreeNS from 'three'
import type { CSS2DObject as CSS2DObjectClass } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { Locale } from '@/lib/types'
import type { TowerFaces, TowerNode } from '@/lib/tower'
import { portraitCredit, portraitOf } from '@/lib/portraits'

type ThreeLib = typeof ThreeNS

/** Of a tile, the part at each edge never sampled: mip filtering would read the neighbouring tile there. */
export const FACE_INSET = 0.04
/** A grown face is this many times its normal size, reached in GROW_MS (ease-out). */
export const GROW_TO = 2.6
export const GROW_MS = 600
/** A face's world diameter is this many times the sphere's radius it replaces (a sphere is `size` in radius). */
export const FACE_WORLD = 6
/** A grown face this wide (CSS px) or wider carries the episode credit under it (the site's rule for pictures of 96 px). */
export const CREDIT_MIN_PX = 96
/**
 * While some sages are dimmed (a chosen sage's chain, a road, a flight), the faces that are not dimmed are drawn this many
 * world units nearer than they are, along the view ray, for the depth test only: a dimmed face or sphere that happens to
 * stand between the camera and a station never covers the station's face (it showed as a dark disc over it).
 */
export const FOCUS_PULL = 40
/** A face in a sharp slot is drawn last with the depth test off: in front of everything inside its disc. Its depth is this far in front. */
export const HERO_DEPTH = 10000
/** How many grown faces can be drawn sharp at once (the one growing, the one shrinking back, a spare). */
const SLOTS = 3

// ───────────────────────────── pure helpers ─────────────────────────────

/**
 * The texture rectangle of atlas tile `face`: tile k is at column k % cols and row floor(k / cols), row 0 the TOP row of
 * the image; with three's default flipY the v axis runs up, so the top row has the largest v.
 */
export function faceUv(face: number, atlas: Pick<TowerFaces, 'tile' | 'cols' | 'w' | 'h'>): { u0: number; v0: number; u1: number; v1: number } {
  const col = face % atlas.cols
  const row = Math.floor(face / atlas.cols)
  return {
    u0: (col * atlas.tile) / atlas.w,
    u1: ((col + 1) * atlas.tile) / atlas.w,
    v1: 1 - (row * atlas.tile) / atlas.h,
    v0: 1 - ((row + 1) * atlas.tile) / atlas.h,
  }
}

const clamp01 = (k: number) => Math.min(1, Math.max(0, k))
export const easeOut = (k: number) => 1 - Math.pow(1 - clamp01(k), 3)

/** The size factor of a face `elapsedMs` after it was told to grow: 1 at once, GROW_TO from GROW_MS on, never down. */
export function growFactor(elapsedMs: number): number {
  return 1 + (GROW_TO - 1) * easeOut(elapsedMs / GROW_MS)
}

/** What the shader is given besides the face: how many CSS pixels a world unit is at depth 1, the floor and cap of a normal face, the GPU's limit. */
export interface FaceSizing {
  /** CSS px per world unit at view depth 1: height / (2 tan(fov / 2)) */
  pxPerUnit: number
  /** a normal face is never smaller than this (CSS px), so it is not a dot at the home view */
  min: number
  /** ... and never larger than this, so a close-up is still a wall of faces */
  cap: number
  /** the GPU's largest point (ALIASED_POINT_SIZE_RANGE) in CSS px; the shape stays a circle at the clamp */
  hw: number
}

/**
 * The diameter in CSS px of a face of world diameter `world` seen at view depth `depth`, times its state `scale`
 * (0 hides, 0.5 dims, 1.35 chosen, up to GROW_TO grown). The floor and the cap scale with `scale`, so a dimmed face
 * stays smaller than a normal one even where both are clamped. The same arithmetic runs in the vertex shader.
 */
export function facePx(world: number, depth: number, scale: number, s: FaceSizing): number {
  if (!(scale > 0)) return 0
  const raw = (world * s.pxPerUnit) / Math.max(depth, 0.01)
  return Math.min(s.hw, scale * Math.min(s.cap, Math.max(s.min, raw)))
}

/** The sizes the scene uses: a phone (a host under 640 px wide, the page's breakpoint) gets smaller floors. */
export function sizingFor(width: number, height: number, projY: number, hwDevice: number, ratio: number): FaceSizing {
  const compact = width < 640
  return { pxPerUnit: 0.5 * height * projY, min: compact ? 16 : 20, cap: compact ? 44 : 60, hw: hwDevice / ratio }
}

/**
 * The depth a face is DRAWN at, which is what decides what covers what, and so what a press must pick: the view depth
 * itself; `FOCUS_PULL` nearer (never past 0.6) for a face that is not dimmed while something is (the shader's `uPull`); and
 * in front of everything for a face in a sharp slot (`hero`: drawn last, depth test off). Mirrors FACE_VERTEX.
 */
export function drawnDepth(depth: number, dimmed: boolean, pull: boolean, hero: boolean): number {
  if (hero) return depth - HERO_DEPTH
  return pull && !dimmed ? Math.max(depth - FOCUS_PULL, 0.6) : depth
}

/** The camera distance of a face as it is drawn: its true distance scaled by drawnDepth / depth (the pull runs along the view ray). A sphere is drawn at its true distance, so this compares with a sphere hit. */
export function drawnDistance(distance: number, depth: number, drawn: number): number {
  return distance * (drawn / depth)
}

/** The width (CSS px) a name of this many characters takes, estimated from its length (a layout read per label per frame is what this avoids). */
export const labelWidth = (chars: number): number => chars * 6.6 + 16
/** The height of a name's box, and of the 11 px credit line (CSS px). */
export const LABEL_HEIGHT = 22
/** Half the width of the credit line's characters, in px each (11 px text) */
const CREDIT_HALF_CHAR = 3.2

/**
 * Does a name anchored at (ax, ay) on the screen lie over a grown face? The name is a box centred on its anchor (`chars`
 * characters wide); the face is the disc (dx, dy, dr) and, when `creditChars` > 0, the credit line under it, a box centred
 * 16 px below the disc. It is covered when the box comes within `margin` px of the disc or of the credit line.
 */
export function labelCovered(ax: number, ay: number, chars: number, dx: number, dy: number, dr: number, creditChars: number, margin: number): boolean {
  const hw = labelWidth(chars) / 2, hh = LABEL_HEIGHT / 2
  const ox = Math.max(Math.abs(ax - dx) - hw, 0), oy = Math.max(Math.abs(ay - dy) - hh, 0)
  const rr = dr + margin
  if (ox * ox + oy * oy < rr * rr) return true
  if (creditChars > 0) {
    return Math.abs(ax - dx) < hw + creditChars * CREDIT_HALF_CHAR + 12 + margin && Math.abs(ay - (dy + dr + 16)) < hh + 11 + margin
  }
  return false
}

/**
 * A view-space point on screen. `view` and `proj` are the column-major matrices of the camera (matrixWorldInverse,
 * projectionMatrix); the result is `out = [x, y, depth]` in CSS px from the canvas' top-left corner and the distance
 * along the view axis. False when the point is behind the camera.
 */
export function projectPoint(view: ArrayLike<number>, proj: ArrayLike<number>, x: number, y: number, z: number, width: number, height: number, out: Float64Array | number[]): boolean {
  const xv = view[0] * x + view[4] * y + view[8] * z + view[12]
  const yv = view[1] * x + view[5] * y + view[9] * z + view[13]
  const zv = view[2] * x + view[6] * y + view[10] * z + view[14]
  const depth = -zv
  if (!(depth > 0)) return false
  out[0] = (proj[0] * xv * 0.5 / depth + 0.5) * width
  out[1] = (0.5 - proj[5] * yv * 0.5 / depth) * height
  out[2] = depth
  return true
}

/** The faces on screen, one entry each: centre, drawn radius (0 = not drawn) and depth, all in CSS px. */
export interface FaceHits { x: ArrayLike<number>; y: ArrayLike<number>; r: ArrayLike<number>; depth: ArrayLike<number>; count: number }

/**
 * The face under a point, or -1. What is on top is what is picked: among the faces whose drawn disc holds the point,
 * the front-most wins (the one the depth buffer shows there), and two at the same depth go to the one whose centre is
 * nearer. A point that holds no disc picks the nearest centre within `slop` (a finger is wider than a pixel), the
 * front-most first on a tie. Nothing outside every radius, `slop` included, is picked.
 */
export function pickFace(h: FaceHits, px: number, py: number, slop = 0): number {
  let inside = -1, insideDepth = Infinity, insideD2 = Infinity
  let near = -1, nearD2 = Infinity, nearDepth = Infinity
  for (let k = 0; k < h.count; k++) {
    const r = h.r[k]
    if (!(r > 0)) continue
    const dx = h.x[k] - px, dy = h.y[k] - py
    const d2 = dx * dx + dy * dy
    const depth = h.depth[k]
    if (d2 <= r * r) {
      if (depth < insideDepth - 1e-6 || (Math.abs(depth - insideDepth) <= 1e-6 && d2 < insideD2)) { inside = k; insideDepth = depth; insideD2 = d2 }
    } else if (slop > 0 && d2 <= slop * slop) {
      if (d2 < nearD2 - 1e-6 || (Math.abs(d2 - nearD2) <= 1e-6 && depth < nearDepth)) { near = k; nearD2 = d2; nearDepth = depth }
    }
  }
  return inside >= 0 ? inside : near
}

/**
 * The grow of the faces, with no three.js: each face has a state scale (set by the scene: 0 hidden, 0.5 dimmed, 1,
 * 1.15, 1.35) and a grow factor that eases between 1 and GROW_TO. `shown(k)` is what is drawn. Told to grow face k, the
 * one that was grown eases back; a face told twice in a row (or while it is already grown) is left alone.
 */
export class FaceModel {
  readonly scale: Float32Array
  readonly dim: Float32Array
  /** the grow factor now: 1 normal ... GROW_TO */
  readonly cur: Float32Array
  /** where it is going: 1 or GROW_TO */
  readonly to: Float32Array
  private from: Float32Array
  private t0: Float64Array
  /** faces whose factor is moving */
  readonly moving: number[] = []
  /** the face last told to grow, -1 for none */
  grown = -1
  /** prefers-reduced-motion: the grow is instant */
  reduced = false

  constructor(readonly count: number) {
    this.scale = new Float32Array(count).fill(1)
    this.dim = new Float32Array(count)
    this.cur = new Float32Array(count).fill(1)
    this.to = new Float32Array(count).fill(1)
    this.from = new Float32Array(count).fill(1)
    this.t0 = new Float64Array(count)
  }

  set(k: number, scale: number, dim: boolean) { this.scale[k] = scale; this.dim[k] = dim ? 1 : 0 }

  /** The multiplier drawn: 0 when hidden; else the state scale, or, while the face is grown, the grow when that is larger. */
  shown(k: number): number {
    const s = this.scale[k]
    return s > 0 && this.cur[k] > 1 ? Math.max(s, this.cur[k]) : s > 0 ? s : 0
  }

  /** Is this face (still) bigger than normal, so that it wants its own sharp picture? */
  grownOrGrowing(k: number): boolean { return this.cur[k] > 1.001 || this.to[k] > 1 }

  private retarget(k: number, to: number, now: number) {
    this.from[k] = this.cur[k]
    this.to[k] = to
    this.t0[k] = now
    if (this.reduced) { this.cur[k] = to; return }
    if (this.cur[k] !== to && this.moving.indexOf(k) < 0) this.moving.push(k)
  }

  grow(k: number, now: number) {
    if (k === this.grown) return
    if (this.grown >= 0) this.retarget(this.grown, 1, now)
    this.grown = k
    if (k >= 0) this.retarget(k, GROW_TO, now)
  }

  /** Move the factors to `now`; true when any changed. No allocation. */
  step(now: number): boolean {
    let changed = false
    for (let i = this.moving.length - 1; i >= 0; i--) {
      const k = this.moving[i]
      const e = now - this.t0[k]
      const next = e >= GROW_MS ? this.to[k] : this.from[k] + (this.to[k] - this.from[k]) * easeOut(e / GROW_MS)
      if (next !== this.cur[k]) { this.cur[k] = next; changed = true }
      if (e >= GROW_MS) { this.moving[i] = this.moving[this.moving.length - 1]; this.moving.pop() }
    }
    return changed
  }
}

// ───────────────────────────── the shader ─────────────────────────────

/**
 * Per face: `aUv` the tile's rectangle (u0, v0, u1, v1), `aColor` the ring (the era), `aSize` the world diameter and
 * `aState` = (scale, dim). The point's size in pixels is `facePx` (clamped to the GPU's range, whatever the camera does);
 * a hidden face (scale 0) is moved out of the clip volume.
 */
export const FACE_VERTEX = /* glsl */ `
uniform float uPxPerUnit;
uniform float uMin;
uniform float uCap;
uniform float uHw;
uniform float uRatio;
uniform float uFogDensity;
uniform float uPull;
attribute vec4 aUv;
attribute vec3 aColor;
attribute float aSize;
attribute vec2 aState;
varying vec4 vUv;
varying vec3 vRing;
varying float vDim;
varying float vFog;
varying float vRingW;
varying float vAa;
void main() {
  if (aState.x <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float depth = max(-mv.z, 0.01);
  float css = min(uHw, aState.x * clamp(aSize * uPxPerUnit / depth, uMin, uCap));
  gl_PointSize = css * uRatio;
  // a face that is not dimmed is drawn nearer than it is (same place on the screen) while others are dimmed: see FOCUS_PULL
  float pull = aState.y > 0.5 ? 0.0 : uPull;
  gl_Position = projectionMatrix * vec4(mv.xyz * (max(depth - pull, 0.6) / depth), 1.0);
  vUv = aUv;
  vRing = aColor;
  vDim = aState.y;
  vFog = 0.8 * (1.0 - exp(-uFogDensity * uFogDensity * depth * depth));
  float rad = max(css * uRatio * 0.5, 1.0);
  vRingW = clamp((1.2 + 0.012 * css) * uRatio / rad, 0.05, 0.22);
  vAa = clamp(1.4 / rad, 0.02, 0.4);
}
`

/**
 * The picture is the tile's central circle: at the ring's inner edge the sample is FACE_INSET inside the tile's edge, so
 * the mipmaps never read the next tile. gl_PointCoord runs y-down, the texture y-up. The circle's edge is soft
 * (alpha-to-coverage under MSAA), the ring is the era's colour, a dimmed face goes toward the sphere's dim colour.
 */
export const FACE_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec3 uFogColor;
uniform vec3 uDimColor;
varying vec4 vUv;
varying vec3 vRing;
varying float vDim;
varying float vFog;
varying float vRingW;
varying float vAa;
const float INSET = ${FACE_INSET.toFixed(3)};
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p) * 2.0;
  float rIn = 1.0 - vRingW;
  vec2 t = clamp(0.5 + p * ((1.0 - 2.0 * INSET) / rIn), INSET, 1.0 - INSET);
  vec3 pic = texture2D(map, vec2(mix(vUv.x, vUv.z, t.x), mix(vUv.w, vUv.y, t.y))).rgb;
  float alpha = 1.0 - smoothstep(1.0 - vAa, 1.0, d);
  if (alpha < 0.02) discard;
  vec3 col = mix(vRing, pic, 1.0 - smoothstep(rIn - vAa, rIn, d));
  col = mix(col, uDimColor, vDim * 0.94);
  col = mix(col, uFogColor, vFog);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`

// ───────────────────────────── the layer ─────────────────────────────

export interface FaceEnv {
  THREE: ThreeLib
  CSS2DObject: typeof CSS2DObjectClass
  scene: ThreeNS.Scene
  camera: ThreeNS.PerspectiveCamera
  renderer: ThreeNS.WebGLRenderer
  /** every node of the scene, in the scene's order; the ones with a `face` are drawn here */
  nodes: TowerNode[]
  faces: TowerFaces
  locale: Locale
  /** the canvas' size in CSS px */
  size: () => { w: number; h: number }
  /** true once the scene has been disposed: a late atlas is then thrown away */
  cancelled: () => boolean
}

export interface FaceLayer {
  /** how many sages are drawn as faces */
  readonly count: number
  /** does node `i` (index into env.nodes) have a face here */
  has(i: number): boolean
  /** the state of node `i`'s face: scale 0 hides it, `dim` darkens it; call `commit` after a batch */
  set(i: number, scale: number, dim: boolean): void
  commit(): void
  /** grow the face of this sage (null: every face back to normal size) */
  grow(id: string | null): void
  /** advance the grow; call every frame (it does nothing at rest) */
  step(now: number): void
  /**
   * The node index of the face under the pointer (client px), or -1. `slop` widens the target (a finger). The faces are ranked by
   * the depth they are DRAWN at (`drawnDepth`: pulled while something is dimmed, a grown face on top), so a press picks what is seen.
   * `pickDistance` is the picked face's camera distance as drawn (`drawnDistance`), to put a sphere hit in front of it or behind.
   */
  pick(clientX: number, clientY: number, rect: { left: number; top: number }, slop: number): number
  readonly pickDistance: number
  /** the radius (CSS px) of the face now grown, 0 when none is: the sage's name stands that far above it */
  readonly grownRadius: number
  /** where a sage's face is on the canvas (CSS px) and how wide, or null (no face, hidden, behind the camera) */
  screenOf(id: string): { x: number; y: number; r: number } | null
  /**
   * The face now grown, on the screen, written into `out` = [x, y, radius, creditChars] (CSS px; creditChars is the length of the
   * credit text while it is shown, else 0). False when none is grown or it is not drawn. Allocates nothing.
   */
  grownAt(out: Float64Array): boolean
  /** the canvas or the camera changed shape */
  resize(): void
  dispose(): void
}

/**
 * Load the atlas and build the layer. Resolves null (nothing drawn, nothing thrown) when the picture does not load, when
 * there are no faces, or when the scene was disposed in the meantime.
 */
export function loadFaceLayer(env: FaceEnv): Promise<FaceLayer | null> {
  return new Promise(resolve => {
    try {
      new env.THREE.TextureLoader().load(env.faces.src, tex => {
        if (env.cancelled()) { tex.dispose(); resolve(null); return }
        try { resolve(buildLayer(env, tex)) } catch { tex.dispose(); resolve(null) }
      }, undefined, () => resolve(null))
    } catch { resolve(null) }
  })
}

function buildLayer(env: FaceEnv, atlas: ThreeNS.Texture): FaceLayer | null {
  const { THREE, scene, camera, renderer, nodes, locale } = env
  const faceNodes: number[] = []
  nodes.forEach((n, i) => { if (n.face != null) faceNodes.push(i) })
  const count = faceNodes.length
  if (count === 0) { atlas.dispose(); return null }
  const faceOfNode = new Int32Array(nodes.length).fill(-1)
  faceNodes.forEach((i, k) => { faceOfNode[i] = k })

  atlas.colorSpace = THREE.SRGBColorSpace
  atlas.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())

  const gl = renderer.getContext()
  const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as ArrayLike<number> | null
  const hwDevice = range && range.length > 1 && range[1] > 0 ? range[1] : 64
  const fog = scene.fog as ThreeNS.FogExp2 | null
  const shared = {
    uPxPerUnit: { value: 1 }, uMin: { value: 20 }, uCap: { value: 60 }, uHw: { value: 1000 }, uRatio: { value: 1 },
    uFogDensity: { value: fog && 'density' in fog ? fog.density : 0 },
    uPull: { value: 0 },
    uFogColor: { value: new THREE.Color(fog ? fog.color : 0x06050a) },
    uDimColor: { value: new THREE.Color(0x15131b) },
  }
  // the crowd is opaque and depth-tested (alpha-to-coverage softens its edge); a grown face is blended and drawn last,
  // over everything, so no sphere or face nearer the camera ever covers the one the camera has come to
  const makeMaterial = (map: ThreeNS.Texture, hero: boolean) => new THREE.ShaderMaterial({
    uniforms: { ...shared, map: { value: map } },
    vertexShader: FACE_VERTEX,
    fragmentShader: FACE_FRAGMENT,
    ...(hero ? { transparent: true, depthTest: false, depthWrite: false } : { alphaToCoverage: true }),
  })
  const white = new THREE.Color(0xffffff)
  const makeGeometry = (n: number) => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    geo.setAttribute('aUv', new THREE.BufferAttribute(new Float32Array(n * 4), 4))
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1))
    const state = new THREE.BufferAttribute(new Float32Array(n * 2), 2)
    state.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('aState', state)
    return geo
  }
  const fill = (geo: ThreeNS.BufferGeometry, v: number, node: TowerNode, uv: { u0: number; v0: number; u1: number; v1: number }) => {
    const c = new THREE.Color(node.color).lerp(white, 0.12)
    ;(geo.attributes.position as ThreeNS.BufferAttribute).setXYZ(v, node.x, node.y, node.z)
    ;(geo.attributes.aUv as ThreeNS.BufferAttribute).setXYZW(v, uv.u0, uv.v0, uv.u1, uv.v1)
    ;(geo.attributes.aColor as ThreeNS.BufferAttribute).setXYZ(v, c.r, c.g, c.b)
    ;(geo.attributes.aSize as ThreeNS.BufferAttribute).setX(v, node.size * FACE_WORLD)
  }

  // all the faces: one Points, one draw call
  const geo = makeGeometry(count)
  faceNodes.forEach((i, k) => fill(geo, k, nodes[i], faceUv(nodes[i].face!, env.faces)))
  const points = new THREE.Points(geo, makeMaterial(atlas, false))
  points.frustumCulled = false
  scene.add(points)

  // the grown faces, drawn sharp from the sage's own 128 px file: a few single-point layers
  const slots = Array.from({ length: SLOTS }, () => {
    const g = makeGeometry(1)
    const mat = makeMaterial(atlas, true)
    const pts = new THREE.Points(g, mat)
    pts.frustumCulled = false
    pts.renderOrder = 10
    pts.visible = false
    scene.add(pts)
    return { geo: g, mat, pts, face: -1 }
  })
  const slotOf = new Int8Array(count).fill(-1)
  const sharp: Array<ThreeNS.Texture | null | undefined> = new Array(count)

  const model = new FaceModel(count)
  model.reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  let closed = false
  // true while any face is dimmed: the faces that are not are then drawn FOCUS_PULL nearer (uPull), and picked as such
  let pullOn = false
  let sizing: FaceSizing = sizingFor(800, 600, 2, hwDevice, 1)
  let width = 800, height = 600

  // the episode credit under the grown face
  const creditEl = document.createElement('div')
  creditEl.className = 'tower-face-credit'
  creditEl.dir = 'auto'
  const credit = new env.CSS2DObject(creditEl)
  credit.visible = false
  scene.add(credit)
  let creditFor = -1, creditR = -1, grownR = 0

  const info = new Float64Array(3)
  const sx = new Float32Array(count), sy = new Float32Array(count), sr = new Float32Array(count), sd = new Float32Array(count)
  let lastPickDistance = Infinity

  const resize = () => {
    const { w, h } = env.size()
    width = w; height = h
    const ratio = renderer.getPixelRatio()
    sizing = sizingFor(w, h, camera.projectionMatrix.elements[5], hwDevice, ratio)
    shared.uPxPerUnit.value = sizing.pxPerUnit
    shared.uMin.value = sizing.min
    shared.uCap.value = sizing.cap
    shared.uHw.value = sizing.hw
    shared.uRatio.value = ratio
  }
  resize()

  /** the drawn diameter (CSS px) of face k now, from the camera as it was at the last render */
  const diameterOf = (k: number, depth: number) => facePx(nodes[faceNodes[k]].size * FACE_WORLD, depth, model.shown(k), sizing)

  const writeState = () => {
    const a = geo.attributes.aState as ThreeNS.BufferAttribute
    let anyDim = false
    for (let k = 0; k < count; k++) { a.setXY(k, slotOf[k] >= 0 ? 0 : model.shown(k), model.dim[k]); if (model.dim[k] > 0) anyDim = true }
    a.needsUpdate = true
    pullOn = anyDim
    shared.uPull.value = anyDim ? FOCUS_PULL : 0
    for (let j = 0; j < slots.length; j++) {
      const s = slots[j]
      if (s.face < 0) continue
      const b = s.geo.attributes.aState as ThreeNS.BufferAttribute
      b.setXY(0, model.shown(s.face), model.dim[s.face])
      b.needsUpdate = true
    }
  }

  /** Give a grown face its sharp picture when it is loaded, and take it back when the face is normal again. */
  const syncSharp = () => {
    for (let j = 0; j < slots.length; j++) {
      const s = slots[j]
      if (s.face >= 0 && !model.grownOrGrowing(s.face)) { slotOf[s.face] = -1; s.face = -1; s.pts.visible = false }
    }
    const want = (k: number) => {
      if (slotOf[k] >= 0 || !model.grownOrGrowing(k)) return
      const tex = sharp[k]
      if (!tex) return
      let at = -1
      for (let j = 0; j < slots.length && at < 0; j++) if (slots[j].face < 0) at = j
      if (at < 0) return
      const s = slots[at]
      s.face = k
      slotOf[k] = at
      s.mat.uniforms.map.value = tex
      fill(s.geo, 0, nodes[faceNodes[k]], { u0: 0, v0: 0, u1: 1, v1: 1 })
      ;(s.geo.attributes.position as ThreeNS.BufferAttribute).needsUpdate = true
      ;(s.geo.attributes.aUv as ThreeNS.BufferAttribute).needsUpdate = true
      ;(s.geo.attributes.aColor as ThreeNS.BufferAttribute).needsUpdate = true
      ;(s.geo.attributes.aSize as ThreeNS.BufferAttribute).needsUpdate = true
      s.pts.visible = true
    }
    if (model.grown >= 0) want(model.grown)
    for (let j = 0; j < model.moving.length; j++) want(model.moving[j])
  }

  const loadSharp = (k: number) => {
    if (sharp[k] !== undefined) return
    const portrait = portraitOf(nodes[faceNodes[k]].id)
    if (!portrait) { sharp[k] = null; return }
    sharp[k] = null
    try {
      new THREE.TextureLoader().load(portrait.srcSm, tex => {
        if (closed) { tex.dispose(); return }
        tex.colorSpace = THREE.SRGBColorSpace
        sharp[k] = tex
        syncSharp()
        writeState()
      }, undefined, () => { /* the atlas tile stays: it is the same picture, softer */ })
    } catch { /* same */ }
  }

  /** the credit under the grown face: shown while it is wide enough to need one, following its size */
  const updateCredit = () => {
    const k = model.grown
    grownR = 0
    if (k < 0 || model.shown(k) <= 0) { credit.visible = false; return }
    const n = nodes[faceNodes[k]]
    if (!projectPoint(camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, n.x, n.y, n.z, width, height, info)) { credit.visible = false; return }
    const d = diameterOf(k, info[2])
    grownR = d / 2
    if (d < CREDIT_MIN_PX) { credit.visible = false; return }
    if (creditFor !== k) {
      const portrait = portraitOf(n.id)
      if (!portrait) { credit.visible = false; return }
      creditEl.textContent = portraitCredit(portrait, locale)
      credit.position.set(n.x, n.y, n.z)
      creditFor = k
      creditR = -1
    }
    if (Math.abs(d / 2 - creditR) >= 0.5) { creditR = d / 2; creditEl.style.setProperty('--face-r', `${creditR.toFixed(1)}px`) }
    credit.visible = true
  }

  const layer: FaceLayer = {
    count,
    has: i => faceOfNode[i] >= 0,
    set(i, scale, dim) { const k = faceOfNode[i]; if (k >= 0) model.set(k, scale, dim) },
    commit() { syncSharp(); writeState(); updateCredit() },
    grow(id) {
      const i = id == null ? -1 : nodes.findIndex(n => n.id === id)
      const k = i >= 0 ? faceOfNode[i] : -1
      if (k >= 0) loadSharp(k)
      model.grow(k, performance.now())
      credit.visible = false
      syncSharp()
      writeState()
      updateCredit()
    },
    step(now) {
      if (model.moving.length > 0 && model.step(now)) { syncSharp(); writeState() }
      if (model.grown >= 0) updateCredit()
    },
    pick(clientX, clientY, rect, slop) {
      const x = clientX - rect.left, y = clientY - rect.top
      for (let k = 0; k < count; k++) {
        const n = nodes[faceNodes[k]]
        sr[k] = 0
        if (model.shown(k) <= 0) continue
        if (!projectPoint(camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, n.x, n.y, n.z, width, height, info)) continue
        sx[k] = info[0]; sy[k] = info[1]
        // what covers what is the depth the shader draws at (pulled while something is dimmed; a grown face on top), not the true one
        sd[k] = drawnDepth(info[2], model.dim[k] > 0, pullOn, slotOf[k] >= 0)
        sr[k] = diameterOf(k, info[2]) / 2
      }
      const k = pickFace({ x: sx, y: sy, r: sr, depth: sd, count }, x, y, slop)
      if (k < 0) { lastPickDistance = Infinity; return -1 }
      const n = nodes[faceNodes[k]]
      // compared with a sphere hit by the distance it is drawn at (a sphere is drawn at its true one)
      projectPoint(camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, n.x, n.y, n.z, width, height, info)
      lastPickDistance = drawnDistance(Math.hypot(n.x - camera.position.x, n.y - camera.position.y, n.z - camera.position.z), info[2], sd[k])
      return faceNodes[k]
    },
    get pickDistance() { return lastPickDistance },
    get grownRadius() { return grownR },
    screenOf(id) {
      const i = nodes.findIndex(n => n.id === id)
      const k = i >= 0 ? faceOfNode[i] : -1
      if (k < 0 || model.shown(k) <= 0) return null
      const n = nodes[i]
      if (!projectPoint(camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, n.x, n.y, n.z, width, height, info)) return null
      return { x: info[0], y: info[1], r: diameterOf(k, info[2]) / 2 }
    },
    grownAt(out) {
      const k = model.grown
      if (k < 0 || model.shown(k) <= 0) return false
      const n = nodes[faceNodes[k]]
      if (!projectPoint(camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, n.x, n.y, n.z, width, height, info)) return false
      const d = diameterOf(k, info[2])
      if (!(d > 0)) return false
      out[0] = info[0]; out[1] = info[1]; out[2] = d / 2
      out[3] = credit.visible ? creditEl.textContent!.length : 0
      return true
    },
    resize,
    dispose() {
      if (closed) return
      closed = true
      scene.remove(points, credit, ...slots.map(s => s.pts))
      credit.element.remove()
      geo.dispose()
      ;(points.material as ThreeNS.Material).dispose()
      for (const s of slots) { s.geo.dispose(); s.mat.dispose() }
      for (const t of sharp) t?.dispose()
      atlas.dispose()
    },
  }
  writeState()
  return layer
}
