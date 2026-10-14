'use client'

// The Tower of Generations, drawn with three.js: every sage a light at the height of his time and
// in the direction of his region, teacher-to-student links as golden arcs with light flowing down
// the line of transmission, family links in rose. Press a sage to light up his teachers' teachers
// and his students' students; press play to watch 3,700 years fill in. three.js is loaded only
// here (a dynamic import inside the effect), so no other page pays for it.
// The chosen sage is kept in the address (/he/tower/41), so a link opens on him: `initialSage`.
// "הדרך לסיני": from the chosen sage the camera flies down the centuries along his road to Moses
// (the same road as his page's card, lib/sinaiPath.ts), a golden thread unrolling behind it and a
// caption at every station; `?road=1` in the address starts it, so a shared link flies it too.
// "שישה צעדים": a path between two sages (lib/connectFlight.ts) is flown the same way, by itself, in
// its own teal, dotted where the link is only influence (`flight`, app/[locale]/tower/path/[from]/[to]).
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '@/lib/types'
import type { RoadPoint, TowerData, TowerNode, TowerLinkKind } from '@/lib/tower'
import { lineageOf, roadOf, shortName, towerPath } from '@/lib/tower'
import { track } from '@/lib/analytics'
import { SP, genLabel, receivedFrom, ruPlural } from '@/components/viz/SinaiPathText'
import type { KidsTour } from '@/lib/kidsTour'
import { KidsTourPanel } from '@/components/kids/KidsTourPanel'
import { connectHref, type ConnectFlight, type FlightPoint } from '@/lib/connectFlight'
import { FlightPanel } from '@/components/connect/FlightPanel'

const S = {
  play: { he: 'הפעלת ההיסטוריה', en: 'Play history', ru: 'Запустить историю' },
  pause: { he: 'עצירה', en: 'Pause', ru: 'Пауза' },
  all: { he: 'הכול', en: 'All', ru: 'Всё' },
  teacher: { he: 'רב ותלמיד', en: 'Teacher & student', ru: 'Учитель и ученик' },
  family: { he: 'משפחה', en: 'Family', ru: 'Семья' },
  influence: { he: 'השפעה', en: 'Influence', ru: 'Влияние' },
  reset: { he: 'מבט כללי', en: 'Whole tower', ru: 'Вся башня' },
  open: { he: 'לעמוד החכם', en: 'Open the page', ru: 'Открыть страницу' },
  teachers: { he: 'רבותיו', en: 'Teachers', ru: 'Учителя' },
  students: { he: 'תלמידיו', en: 'Students', ru: 'Ученики' },
  familyOf: { he: 'משפחתו', en: 'Family', ru: 'Семья' },
  chain: { he: 'בשלשלת שלו', en: 'In his chain', ru: 'В его цепи' },
  close: { he: 'סגירה', en: 'Close', ru: 'Закрыть' },
  share: { he: 'שיתוף', en: 'Share', ru: 'Поделиться' },
  copied: { he: 'הקישור הועתק', en: 'Link copied', ru: 'Ссылка скопирована' },
  inTower: { he: 'במגדל הדורות', en: 'in the Tower of Generations', ru: 'в Башне поколений' },
  noWebgl: {
    he: 'הדפדפן הזה לא מציג גרפיקה תלת־ממדית. אפשר לראות את אותם קשרים ברשת הקשרים.',
    en: 'This browser cannot show 3D graphics. The same links are in the network view.',
    ru: 'Этот браузер не показывает 3D-графику. Те же связи есть в сети связей.',
  },
  toMap: { he: 'לרשת הקשרים', en: 'To the network', ru: 'К сети связей' },
  sinai: { he: 'קיבל תורה מסיני', en: 'Received the Torah at Sinai', ru: 'Получил Тору на Синае' },
  receivedChain: { he: 'קיבל מ', en: 'Received from ', ru: 'Принял от: ' },
  sameGen: { he: 'באותו דור בשלשלת: ', en: 'Same generation of the chain as ', ru: 'В том же поколении цепи: ' },
  toSinai: { he: 'עד סיני', en: 'To Sinai', ru: 'До Синая' },
  again: { he: 'שוב מההתחלה', en: 'Fly it again', ru: 'Ещё раз' },
  prev: { he: 'תחנה קודמת', en: 'Previous station', ru: 'Предыдущая остановка' },
  next: { he: 'תחנה הבאה', en: 'Next station', ru: 'Следующая остановка' },
  connectHim: { he: 'חברו אותו לחכם אחר', en: 'Connect him to another sage', ru: 'Связать с другим мудрецом' },
  connectHer: { he: 'חברו אותה לחכם אחר', en: 'Connect her to another sage', ru: 'Связать с другим мудрецом' },
} satisfies Record<string, Record<Locale, string>>

/** "Station 12 of 46" */
const stationOf = (i: number, n: number, l: Locale) =>
  l === 'he' ? `תחנה ${i} מתוך ${n}` : l === 'en' ? `Station ${i} of ${n}` : `Остановка ${i} из ${n}`
/** The Rambam's generation, or past Rav Ashi the epistle that continues the count. */
const genOf = (gen: number, l: Locale) =>
  gen > 40 ? genLabel(gen, l) : l === 'he' ? `דור ${gen} לפי הרמב״ם` : l === 'en' ? `Generation ${gen}, as the Rambam counts` : `${gen}-е поколение по Рамбаму`
const roadSummary = (n: number, name: string, l: Locale) =>
  l === 'he' ? `${n} תחנות בדרך מסיני אל ${name}`
    : l === 'en' ? `${n} stations on the road from Sinai to ${name}`
      : `${n} ${ruPlural(n, 'остановка', 'остановки', 'остановок')} на пути от Синая к «${name}»`
/** How long the camera stays at a road point: the archive's sages longer, stations named only briefly. */
function stepMs(p: RoadPoint, i: number): number {
  if (i === 0) return 2200
  if (p.how !== 'chain' && p.how !== 'sinai') return 2300
  return p.id ? 1500 : 950
}

const KIND_COLOR: Record<TowerLinkKind, string> = { teacher: '#e9c46a', family: '#e48aa7', influence: '#7d8ba3', other: '#9f86d8' }
const KIND_OPACITY: Record<TowerLinkKind, number> = { teacher: 0.5, family: 0.5, influence: 0.12, other: 0.14 }
const SEGMENTS = 12
const PLAY_SECONDS = 32

function yearLabel(y: number, loc: Locale): string {
  const r = Math.round(y)
  if (r >= 0) return String(r)
  return loc === 'he' ? `${-r} לפנה״ס` : loc === 'ru' ? `${-r} до н. э.` : `${-r} BCE`
}

interface SceneApi {
  setTime(t: number | null): void
  focus(id: string | null): void
  setVisible(kind: TowerLinkKind, on: boolean): void
  reset(): void
  /** Draw a road to Sinai (or clear it, null), dimming the rest of the tower. */
  road(points: RoadPoint[] | null): void
  /** Fly to the road's point `i`, the thread unrolled from the sage down to it. */
  roadGo(i: number, ms: number): void
  /** Pull back until the whole thread, Sinai to the sage, is in view. */
  roadOverview(): void
  dispose(): void
}

/** A kids' route is flown station by station, by the reader's hand (or on its own, seven seconds a station). */
const TOUR_STEP_MS = 7000
/** A path between two sages is flown on its own, two and a half seconds a station. */
const FLIGHT_STEP_MS = 2400

export function TowerScene({ data, locale, initialSage, tour, flight }: { data: TowerData; locale: Locale; initialSage?: string; tour?: KidsTour; flight?: ConnectFlight }) {
  const mount = useRef<HTMLDivElement>(null)
  const api = useRef<SceneApi | null>(null)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<string | null>(initialSage ?? null)
  const [time, setTime] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [kinds, setKinds] = useState<Record<TowerLinkKind, boolean>>({ teacher: true, family: true, influence: false, other: false })
  const [copied, setCopied] = useState(false)
  const [road, setRoad] = useState<RoadPoint[] | null>(null)
  const [roadAt, setRoadAt] = useState(0)
  const [roadPlaying, setRoadPlaying] = useState(false)
  // the scene is built after three.js loads: a road opened from a link waits for it
  const [ready, setReady] = useState(false)
  const byId = useMemo(() => new Map(data.nodes.map(n => [n.id, n])), [data])
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  // what the scene must show once it is built: the effects below that pass state to it run before
  // three.js has loaded, so the scene reads this when it is ready (a sage opened from a link)
  const live = useRef({ selected, time, kinds, road, roadAt })
  useEffect(() => { live.current = { selected, time, kinds, road, roadAt } })
  // the kids' journey (app/[locale]/kids/journey/[route]): its own trail colour, no choosing sages on the way
  const tourRef = useRef(tour)
  tourRef.current = tour
  // a path between two sages (app/[locale]/tower/path/[from]/[to]): the same, in the path's teal
  const flightRef = useRef(flight)
  flightRef.current = flight

  // the scene: built once per data set
  useEffect(() => {
    const host = mount.current
    if (!host) return
    let disposed = false
    ;(async () => {
      const THREE = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      const { CSS2DRenderer, CSS2DObject } = await import('three/examples/jsm/renderers/CSS2DRenderer.js')
      if (disposed) return

      let renderer: InstanceType<typeof THREE.WebGLRenderer>
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
      } catch {
        setFailed(true)
        return
      }
      const w = () => host.clientWidth, h = () => host.clientHeight
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(w(), h())
      renderer.setClearColor(0x06050a)
      host.appendChild(renderer.domElement)
      renderer.domElement.style.display = 'block'

      const labels = new CSS2DRenderer()
      labels.setSize(w(), h())
      // z-index 0 keeps the labels' own depth order (CSS2DRenderer sets a z-index on each) inside
      // this layer, so the panel and the controls drawn after it stay on top
      Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '0' })
      // CSS2DRenderer places each label from the left edge; in a right-to-left page an absolute
      // box starts from the right, so the container is left-to-right (each label keeps dir=auto)
      labels.domElement.dir = 'ltr'
      host.appendChild(labels.domElement)

      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x06050a, 0.0042)
      const camera = new THREE.PerspectiveCamera(48, w() / h(), 0.5, 1500)
      // on a tall, narrow screen the tower is aimed lower, so it stands clear of the controls below
      const CENTER = new THREE.Vector3(0, w() / h() < 0.8 ? 36 : 48, 0)
      const homeDistance = () => {
        const v = Math.tan(THREE.MathUtils.degToRad(24))
        return Math.max(64 / v, 46 / (v * Math.min(1, w() / h())))
      }
      const home = () => {
        const d = homeDistance()
        camera.position.set(d * 0.62, CENTER.y + d * 0.28, d * 0.74)
        controls.target.copy(CENTER)
      }
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.55
      controls.minDistance = 12
      controls.maxDistance = 420
      home()
      let idleSince = 0
      controls.addEventListener('start', () => { controls.autoRotate = false })
      controls.addEventListener('end', () => { idleSince = performance.now() })

      // a soft round glow, drawn once
      const glowCanvas = document.createElement('canvas')
      glowCanvas.width = glowCanvas.height = 64
      const g = glowCanvas.getContext('2d')!
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      grad.addColorStop(0, 'rgba(255,255,255,1)')
      grad.addColorStop(0.25, 'rgba(255,255,255,0.55)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grad
      g.fillRect(0, 0, 64, 64)
      const glow = new THREE.CanvasTexture(glowCanvas)

      // stars
      const starPos = new Float32Array(1800 * 3)
      for (let i = 0; i < 1800; i++) {
        const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 380 + Math.random() * 200
        const s = Math.sqrt(1 - u * u)
        starPos.set([r * s * Math.cos(t), r * u + 50, r * s * Math.sin(t)], i * 3)
      }
      const starGeo = new THREE.BufferGeometry()
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbfb6a3, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.55, fog: false })))

      // the region rays on the floor and the era rings up the tower
      const guide = new THREE.Group()
      scene.add(guide)
      for (const r of data.regions) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(r.angle) * 4, -1, Math.sin(r.angle) * 4),
          new THREE.Vector3(Math.cos(r.angle) * 30, -1, Math.sin(r.angle) * 30),
        ])
        guide.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc9973a, transparent: true, opacity: 0.22 })))
        const el = document.createElement('div')
        el.className = 'tower-region'
        el.dir = 'auto'
        el.textContent = r.label
        const lab = new CSS2DObject(el)
        lab.position.set(Math.cos(r.angle) * 31, -1, Math.sin(r.angle) * 31)
        guide.add(lab)
      }
      for (const e of data.eras) {
        const rad = 7 + 0.17 * e.from + 6.5
        const pts = Array.from({ length: 97 }, (_, i) => {
          const a = (i / 96) * Math.PI * 2
          return new THREE.Vector3(Math.cos(a) * rad, e.from, Math.sin(a) * rad)
        })
        guide.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: new THREE.Color(e.color), transparent: true, opacity: 0.2 })))
        const el = document.createElement('div')
        el.className = 'tower-era'
        el.dir = 'auto'
        el.style.setProperty('--era', e.color)
        el.textContent = e.label
        const lab = new CSS2DObject(el)
        lab.position.set(-rad - 2, (e.from + e.to) / 2, 0)
        guide.add(lab)
      }

      // the sages
      const nodes = data.nodes
      const index = new Map(nodes.map((n, i) => [n.id, i]))
      const sphere = new THREE.SphereGeometry(1, 16, 12)
      const mesh = new THREE.InstancedMesh(sphere, new THREE.MeshBasicMaterial(), nodes.length)
      const baseColor = nodes.map(n => new THREE.Color(n.color).lerp(new THREE.Color(0xffffff), 0.12))
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3()
      const place = (i: number, scale: number) => {
        const n = nodes[i]
        m4.compose(v3.set(n.x, n.y, n.z), q, sc.setScalar(scale))
        mesh.setMatrixAt(i, m4)
      }
      nodes.forEach((n, i) => { place(i, n.size); mesh.setColorAt(i, baseColor[i]) })
      scene.add(mesh)

      const haloPos = new Float32Array(nodes.length * 3), haloCol = new Float32Array(nodes.length * 3)
      nodes.forEach((n, i) => { haloPos.set([n.x, n.y, n.z], i * 3); haloCol.set([baseColor[i].r, baseColor[i].g, baseColor[i].b], i * 3) })
      const haloGeo = new THREE.BufferGeometry()
      haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3))
      haloGeo.setAttribute('color', new THREE.BufferAttribute(haloCol, 3))
      const halo = new THREE.Points(haloGeo, new THREE.PointsMaterial({
        size: 3.4, map: glow, vertexColors: true, transparent: true, opacity: 0.55,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }))
      scene.add(halo)

      // the links, an arc each, kind by kind, sorted by when both ends have lived (for the time-lapse)
      const curve = (a: (typeof nodes)[number], b: (typeof nodes)[number], k: number, out: InstanceType<typeof THREE.Vector3>) => {
        // a quadratic arc bowed outward from the axis
        const mx = (a.x + b.x) / 2 * 1.18, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2 * 1.18
        const t = k / SEGMENTS, u = 1 - t
        return out.set(u * u * a.x + 2 * u * t * mx + t * t * b.x, u * u * a.y + 2 * u * t * my + t * t * b.y, u * u * a.z + 2 * u * t * mz + t * t * b.z)
      }
      type Arc = { a: number; b: number; reveal: number }
      const arcs: Record<TowerLinkKind, Arc[]> = { teacher: [], family: [], influence: [], other: [] }
      for (const l of data.links) {
        const a = index.get(l.a), b = index.get(l.b)
        if (a == null || b == null) continue
        arcs[l.kind].push({ a, b, reveal: Math.max(nodes[a].year, nodes[b].year) })
      }
      const lines = {} as Record<TowerLinkKind, InstanceType<typeof THREE.LineSegments>>
      const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3()
      for (const kind of Object.keys(arcs) as TowerLinkKind[]) {
        arcs[kind].sort((p, r) => p.reveal - r.reveal)
        const pos = new Float32Array(arcs[kind].length * SEGMENTS * 6)
        arcs[kind].forEach((arc, j) => {
          for (let k = 0; k < SEGMENTS; k++) {
            curve(nodes[arc.a], nodes[arc.b], k, tmp)
            curve(nodes[arc.a], nodes[arc.b], k + 1, tmp2)
            pos.set([tmp.x, tmp.y, tmp.z, tmp2.x, tmp2.y, tmp2.z], (j * SEGMENTS + k) * 6)
          }
        })
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(KIND_COLOR[kind]), transparent: true, opacity: KIND_OPACITY[kind], depthWrite: false, blending: THREE.AdditiveBlending })
        lines[kind] = new THREE.LineSegments(geo, mat)
        lines[kind].visible = kind === 'teacher' || kind === 'family'
        scene.add(lines[kind])
      }

      // light running down every teacher link, from teacher to student
      const flowCount = arcs.teacher.length * 2
      const flowPos = new Float32Array(flowCount * 3)
      const flowGeo = new THREE.BufferGeometry()
      flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3))
      const flows = new THREE.Points(flowGeo, new THREE.PointsMaterial({
        size: 2.1, map: glow, color: 0xffe3a3, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
      }))
      scene.add(flows)
      const flowSeed = arcs.teacher.map((_, j) => (j * 0.6180339) % 1)

      // the lineage, drawn on top when a sage is chosen
      const lit = new THREE.Group()
      scene.add(lit)

      // names: the landmarks always, the chosen chain while chosen, the hovered one while hovered
      const makeLabel = (n: TowerNode, cls: string) => {
        const el = document.createElement('div')
        el.className = cls
        el.textContent = n.short
        el.dir = 'auto'
        const o = new CSS2DObject(el)
        o.position.set(n.x, n.y + n.size + 0.9, n.z)
        return o
      }
      const landmarkLabels = new Map<string, InstanceType<typeof CSS2DObject>>()
      // on a phone only the first eight names stay (the rest hide below 640px: see globals.css)
      for (const n of nodes) if (n.landmark) { const o = makeLabel(n, n.rank > 8 ? 'tower-label tower-label-minor' : 'tower-label'); landmarkLabels.set(n.id, o); scene.add(o) }
      let hoverLabel: InstanceType<typeof CSS2DObject> | null = null
      let chainLabels: InstanceType<typeof CSS2DObject>[] = []

      // state
      let cutoff: number | null = null
      let focusSet: Set<string> | null = null
      let focusId: string | null = null
      let flyTo: { from: InstanceType<typeof THREE.Vector3>; to: InstanceType<typeof THREE.Vector3>; camFrom: InstanceType<typeof THREE.Vector3>; camTo: InstanceType<typeof THREE.Vector3>; t0: number; dur?: number } | null = null
      const dim = new THREE.Color(0x15131b)

      const visible = (i: number) => cutoff == null || nodes[i].year <= cutoff
      const refreshNodes = () => {
        nodes.forEach((n, i) => {
          const on = visible(i)
          const inFocus = !focusSet || focusSet.has(n.id)
          place(i, on ? n.size * (focusId === n.id ? 1.35 : !inFocus ? 0.5 : focusSet ? 1.15 : 1) : 0)
          mesh.setColorAt(i, inFocus ? baseColor[i] : dim)
          const c = on && inFocus ? baseColor[i] : dim
          haloCol.set(on ? [c.r, c.g, c.b] : [0, 0, 0], i * 3)
        })
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
        haloGeo.attributes.color.needsUpdate = true
        for (const [id, o] of landmarkLabels) o.visible = visible(index.get(id)!) && (!focusSet || focusSet.has(id))
      }
      const refreshLinks = () => {
        for (const kind of Object.keys(arcs) as TowerLinkKind[]) {
          const list = arcs[kind]
          let count = list.length
          if (cutoff != null) { count = 0; while (count < list.length && list[count].reveal <= cutoff) count++ }
          lines[kind].geometry.setDrawRange(0, count * SEGMENTS * 2)
          ;(lines[kind].material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = focusSet ? KIND_OPACITY[kind] * 0.18 : KIND_OPACITY[kind]
        }
      }

      const buildLit = () => {
        lit.clear()
        for (const o of chainLabels) scene.remove(o)
        chainLabels = []
        if (!focusSet || !focusId) return
        for (const kind of ['teacher', 'family'] as TowerLinkKind[]) {
          const list = arcs[kind].filter(a => focusSet!.has(nodes[a.a].id) && focusSet!.has(nodes[a.b].id))
          const pos = new Float32Array(list.length * SEGMENTS * 6)
          list.forEach((arc, j) => {
            for (let k = 0; k < SEGMENTS; k++) {
              curve(nodes[arc.a], nodes[arc.b], k, tmp)
              curve(nodes[arc.a], nodes[arc.b], k + 1, tmp2)
              pos.set([tmp.x, tmp.y, tmp.z, tmp2.x, tmp2.y, tmp2.z], (j * SEGMENTS + k) * 6)
            }
          })
          const geo = new THREE.BufferGeometry()
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
          lit.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(KIND_COLOR[kind]), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })))
        }
        for (const id of focusSet) {
          if (landmarkLabels.has(id) && id !== focusId) continue
          const o = makeLabel(byId.get(id)!, id === focusId ? 'tower-label tower-label-focus' : 'tower-label tower-label-chain')
          chainLabels.push(o)
          scene.add(o)
        }
      }

      // the road to Sinai: a thread of light from the sage down through the centuries to Moses,
      // solid where Torah was received, dotted where the archive records only inspiration
      const roadGroup = new THREE.Group()
      scene.add(roadGroup)
      let roadPts: RoadPoint[] | null = null
      let roadStart: number[] = []
      let roadGeo: InstanceType<typeof THREE.BufferGeometry> | null = null
      let roadLabels: Array<{ i: number; o: InstanceType<typeof CSS2DObject> }> = []
      const headPos = new Float32Array(3)
      const headGeo = new THREE.BufferGeometry()
      headGeo.setAttribute('position', new THREE.BufferAttribute(headPos, 3))
      const headMat = new THREE.PointsMaterial({ size: 8, map: glow, color: 0xfff0c4, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })
      const head = new THREE.Points(headGeo, headMat)
      head.visible = false
      scene.add(head)
      const bow = (a: RoadPoint, b: RoadPoint, t: number, out: InstanceType<typeof THREE.Vector3>) => {
        const mx = (a.x + b.x) / 2 * 1.12, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2 * 1.12
        const u = 1 - t
        return out.set(u * u * a.x + 2 * u * t * mx + t * t * b.x, u * u * a.y + 2 * u * t * my + t * t * b.y, u * u * a.z + 2 * u * t * mz + t * t * b.z)
      }
      const clearRoad = () => {
        for (const [id, o] of landmarkLabels) if (!o.parent) { scene.add(o); o.visible = !focusSet || focusSet.has(id) }
        roadGroup.clear()
        for (const { o } of roadLabels) scene.remove(o)
        roadLabels = []
        roadGeo = null
        roadPts = null
        head.visible = false
      }

      const sceneApi: SceneApi = {
        setTime(t) { cutoff = t; refreshNodes(); refreshLinks() },
        focus(id) {
          focusId = id
          if (!id) { focusSet = null }
          else {
            const ln = lineageOf(data, id, 4)
            focusSet = new Set([id, ...ln.up, ...ln.down, ...ln.family])
            const n = byId.get(id)!
            // on a phone the panel covers the lower half: aim below the sage so he shows above it
            const to = new THREE.Vector3(n.x, n.y - (w() / h() < 0.8 ? 16 : 0), n.z)
            const dirv = camera.position.clone().sub(controls.target).normalize()
            flyTo = { from: controls.target.clone(), to, camFrom: camera.position.clone(), camTo: to.clone().add(dirv.multiplyScalar(58)), t0: performance.now() }
            controls.autoRotate = false
          }
          refreshNodes(); refreshLinks(); buildLit()
        },
        setVisible(kind, on) { lines[kind].visible = on },
        road(points) {
          clearRoad()
          if (!points || points.length < 2) return
          roadPts = points
          cutoff = null
          focusId = points[0].id
          focusSet = new Set(points.map(p => p.id).filter((x): x is string => !!x))
          lit.clear()
          for (const o of chainLabels) scene.remove(o)
          chainLabels = []
          refreshNodes(); refreshLinks()
          const samples: number[] = []
          roadStart = []
          for (let i = 0; i < points.length - 1; i++) {
            roadStart.push(samples.length / 3)
            // a flight's thread is dotted where the link into the next sage is only influence
            const solid = (points[i].how === 'teacher' || points[i].how === 'chain') && !(points[i] as FlightPoint).dotted
            const n = solid ? 26 : 8
            for (let k = 0; k < n; k++) { bow(points[i], points[i + 1], k / n, tmp); samples.push(tmp.x, tmp.y, tmp.z) }
          }
          const last = points[points.length - 1]
          roadStart.push(samples.length / 3)
          samples.push(last.x, last.y, last.z)
          roadGeo = new THREE.BufferGeometry()
          roadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(samples), 3))
          roadGeo.setDrawRange(0, 1)
          roadGroup.add(new THREE.Points(roadGeo, new THREE.PointsMaterial({
            size: 1.7, map: glow, color: new THREE.Color(tourRef.current?.color ?? flightRef.current?.color ?? '#ffd98a'), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
          })))
          // the stations nobody in the archive stands for (Joshua, Eli, Elijah…): a light of their own
          const virt = points.filter(p => !p.id)
          if (virt.length) {
            const vg = new THREE.BufferGeometry()
            vg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(virt.flatMap(p => [p.x, p.y, p.z])), 3))
            roadGroup.add(new THREE.Points(vg, new THREE.PointsMaterial({
              size: 3.6, map: glow, color: 0xfff1c9, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
            })))
          }
          points.forEach((p, i) => {
            if (p.id && !p.label && landmarkLabels.has(p.id)) return
            // a numbered station replaces the sage's own name while the journey is flown
            if (p.id && p.label) landmarkLabels.get(p.id)?.removeFromParent()
            const el = document.createElement('div')
            el.className = p.label ? 'tower-label tower-label-tour' : i === 0 ? 'tower-label tower-label-focus' : p.id ? 'tower-label tower-label-chain' : 'tower-label tower-label-station'
            el.dir = 'auto'
            el.textContent = p.label ?? (p.id ? byId.get(p.id)?.short ?? p.name : p.name)
            if (flightRef.current && p.label) el.style.borderColor = `${flightRef.current.color}99`
            const o = new CSS2DObject(el)
            o.position.set(p.x, p.y + 1.3, p.z)
            o.visible = i === 0
            roadLabels.push({ i, o })
            scene.add(o)
          })
          head.visible = true
          controls.autoRotate = false
        },
        roadGo(i, ms) {
          if (!roadPts || !roadGeo) return
          const at = Math.max(0, Math.min(i, roadPts.length - 1))
          roadGeo.setDrawRange(0, at >= roadPts.length - 1 ? roadStart[roadStart.length - 1] + 1 : roadStart[at] + 1)
          // the archive's sages keep their names; stations named only by the chain (the prophets stand
          // close together in time) show theirs around the current one
          for (const { i: k, o } of roadLabels) o.visible = k <= at && (!!roadPts[k].id || Math.abs(k - at) <= 1)
          const p = roadPts[at]
          headPos.set([p.x, p.y, p.z])
          headGeo.attributes.position.needsUpdate = true
          // seen from outside the tower, a little above, aimed lower on a phone so the caption clears it
          const to = new THREE.Vector3(p.x, p.y - (w() / h() < 0.8 ? 7 : 0), p.z)
          const out = new THREE.Vector3(p.x, 0, p.z)
          if (out.lengthSq() < 1) out.set(1, 0, 0)
          out.normalize()
          const camTo = new THREE.Vector3(p.x, p.y, p.z).add(out.multiplyScalar(30)).add(new THREE.Vector3(0, 8, 0))
          flyTo = { from: controls.target.clone(), to, camFrom: camera.position.clone(), camTo, t0: performance.now(), dur: Math.min(1400, ms * 0.8) }
          controls.autoRotate = false
        },
        roadOverview() {
          if (!roadPts) return
          const box = new THREE.Box3().setFromPoints(roadPts.map(p => new THREE.Vector3(p.x, p.y, p.z)))
          const mid = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const span = Math.max(size.y, size.x, size.z, 20)
          const v = Math.tan(THREE.MathUtils.degToRad(24))
          // on a phone a flight's card covers more than half the screen: stand farther back and aim lower, so
          // the whole thread shows in the strip above it (the road to Sinai's card is smaller and keeps its view)
          const tight = w() / h() < 0.8 && !!flightRef.current
          const dist = ((span * 0.62) / (v * Math.min(1, w() / h())) + 10) * (tight ? 1.45 : 1)
          const out = new THREE.Vector3(mid.x, 0, mid.z)
          if (out.lengthSq() < 1) out.set(1, 0, 0)
          out.normalize()
          const to = mid.clone().setY(mid.y - (w() / h() < 0.8 ? span * (tight ? 1.0 : 0.18) : 0))
          flyTo = { from: controls.target.clone(), to, camFrom: camera.position.clone(), camTo: to.clone().add(out.multiplyScalar(dist)).add(new THREE.Vector3(0, span * 0.12, 0)), t0: performance.now(), dur: 2600 }
        },
        reset() {
          const d = homeDistance()
          flyTo = { from: controls.target.clone(), to: CENTER.clone(), camFrom: camera.position.clone(), camTo: new THREE.Vector3(d * 0.62, CENTER.y + d * 0.28, d * 0.74), t0: performance.now() }
          controls.autoRotate = true
        },
        dispose() {},
      }
      api.current = sceneApi
      sceneApi.setTime(live.current.time)
      for (const k of Object.keys(live.current.kinds) as TowerLinkKind[]) sceneApi.setVisible(k, live.current.kinds[k])
      if (live.current.selected) sceneApi.focus(live.current.selected)
      if (live.current.road) { sceneApi.road(live.current.road); sceneApi.roadGo(live.current.roadAt, 1200) }
      setReady(true)

      // pointer: hover shows a name, a press chooses
      const ray = new THREE.Raycaster()
      const ptr = new THREE.Vector2()
      let downAt: { x: number; y: number } | null = null
      const pick = (ev: PointerEvent): number | null => {
        const rect = renderer.domElement.getBoundingClientRect()
        ptr.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
        ray.setFromCamera(ptr, camera)
        const hits = ray.intersectObject(mesh)
        for (const h of hits) if (h.instanceId != null && visible(h.instanceId)) return h.instanceId
        return null
      }
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerType !== 'mouse') return
        const i = pick(ev)
        if (hoverLabel) { scene.remove(hoverLabel); hoverLabel = null }
        renderer.domElement.style.cursor = i == null ? 'grab' : 'pointer'
        if (i != null && !nodes[i].landmark) { hoverLabel = makeLabel(nodes[i], 'tower-label tower-label-hover'); scene.add(hoverLabel) }
      }
      const onDown = (ev: PointerEvent) => { downAt = { x: ev.clientX, y: ev.clientY } }
      const onUp = (ev: PointerEvent) => {
        if (!downAt || Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 6) { downAt = null; return }
        downAt = null
        if (flightRef.current) return
        if (tourRef.current) return
        const i = pick(ev)
        setSelected(i == null ? null : nodes[i].id)
      }
      renderer.domElement.addEventListener('pointermove', onMove)
      renderer.domElement.addEventListener('pointerdown', onDown)
      renderer.domElement.addEventListener('pointerup', onUp)

      const onResize = () => {
        camera.aspect = w() / h()
        camera.updateProjectionMatrix()
        renderer.setSize(w(), h())
        labels.setSize(w(), h())
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(host)

      // the loop
      let raf = 0
      const clock = new THREE.Clock()
      const tick = () => {
        raf = requestAnimationFrame(tick)
        const now = performance.now()
        if (!controls.autoRotate && !focusId && idleSince && now - idleSince > 9000) { controls.autoRotate = true; idleSince = 0 }
        if (flyTo) {
          const k = Math.min(1, (now - flyTo.t0) / (flyTo.dur ?? 1100)), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
          controls.target.lerpVectors(flyTo.from, flyTo.to, e)
          camera.position.lerpVectors(flyTo.camFrom, flyTo.camTo, e)
          if (k >= 1) flyTo = null
        }
        // light flowing from teacher to student
        const el = clock.getElapsedTime()
        if (head.visible) headMat.size = 7 + 2.2 * Math.sin(el * 3.2)
        let m = 0
        arcs.teacher.forEach((arc, j) => {
          if (cutoff != null && arc.reveal > cutoff) return
          if (focusSet && !(focusSet.has(nodes[arc.a].id) && focusSet.has(nodes[arc.b].id))) return
          for (let r = 0; r < 2; r++) {
            const phase = (el * 0.16 + flowSeed[j] + r * 0.5) % 1
            curve(nodes[arc.a], nodes[arc.b], phase * SEGMENTS, tmp)
            flowPos.set([tmp.x, tmp.y, tmp.z], m * 3)
            m++
          }
        })
        flowGeo.setDrawRange(0, lines.teacher.visible ? m : 0)
        flowGeo.attributes.position.needsUpdate = true
        controls.update()
        renderer.render(scene, camera)
        labels.render(scene, camera)
      }
      tick()

      sceneApi.dispose = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        renderer.domElement.removeEventListener('pointermove', onMove)
        renderer.domElement.removeEventListener('pointerdown', onDown)
        renderer.domElement.removeEventListener('pointerup', onUp)
        controls.dispose()
        scene.traverse(o => {
          const any = o as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void } | Array<{ dispose(): void }> }
          any.geometry?.dispose()
          if (Array.isArray(any.material)) any.material.forEach(x => x.dispose())
          else any.material?.dispose()
        })
        glow.dispose()
        renderer.dispose()
        host.replaceChildren()
      }
      if (disposed) sceneApi.dispose()
    })().catch(() => setFailed(true))
    return () => {
      disposed = true
      api.current?.dispose()
      api.current = null
    }
  }, [data, byId])

  useEffect(() => { api.current?.focus(selected) }, [selected])
  useEffect(() => { for (const k of Object.keys(kinds) as TowerLinkKind[]) api.current?.setVisible(k, kinds[k]) }, [kinds])
  useEffect(() => { api.current?.setTime(time) }, [time])

  // the road to Sinai: another sage chosen ends it
  const roadFor = useMemo(() => (selected ? roadOf(data, selected) : null), [data, selected])
  useEffect(() => { if (!tourRef.current && !flightRef.current) { setRoad(null); setRoadPlaying(false) } }, [selected])
  // the kids' journey starts at its first station, the reader turning the pages
  useEffect(() => {
    if (!tour) return
    setRoad(tour.points)
    setRoadAt(0)
    setRoadPlaying(false)
    track('kids_tour', { route: tour.route, stage: 'start' })
  }, [tour])
  // a path between two sages starts at its first sage and flies on by itself once the scene is built;
  // `?via=` says whether the picker or the game sent the visitor, else he came by a link
  useEffect(() => {
    if (!flight) return
    setRoad(flight.points)
    setRoadAt(0)
    setRoadPlaying(true)
    const via = new URLSearchParams(window.location.search).get('via')
    track('connect_fly', { locale, from: via === 'picker' || via === 'game' ? via : 'link' })
  }, [flight, locale])
  const startRoad = (from: 'panel' | 'link') => {
    if (!roadFor || roadFor.length < 2) return
    setPlaying(false)
    setTime(null)
    setRoad(roadFor)
    setRoadAt(0)
    setRoadPlaying(true)
    track('tower_road', { locale, from })
  }
  // a link with ?road=1 (the sage page's card, a shared road) flies it at once
  useEffect(() => {
    if (initialSage && new URLSearchParams(window.location.search).has('road')) startRoad('link')
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const hadRoad = useRef(false)
  useEffect(() => {
    if (road) { api.current?.road(road); hadRoad.current = true }
    else if (hadRoad.current) { hadRoad.current = false; api.current?.road(null); api.current?.focus(live.current.selected) }
  }, [road])
  useEffect(() => { if (road) api.current?.roadGo(roadAt, tour ? 2000 : flight ? FLIGHT_STEP_MS : stepMs(road[roadAt], roadAt)) }, [road, roadAt, tour, flight])
  useEffect(() => {
    if (!road || !roadPlaying || !ready) return
    if (roadAt >= road.length - 1) {
      // arrived at Sinai: hold, then pull back to the whole thread
      const t = setTimeout(() => { setRoadPlaying(false); api.current?.roadOverview() }, 2600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setRoadAt(a => Math.min(a + 1, road.length - 1)), tour ? TOUR_STEP_MS : flight ? FLIGHT_STEP_MS : stepMs(road[roadAt], roadAt))
    return () => clearTimeout(t)
  }, [road, roadAt, roadPlaying, ready, tour, flight])
  useEffect(() => { if (tour && road && roadAt === road.length - 1) track('kids_tour', { route: tour.route, stage: 'end' }) }, [tour, road, roadAt])

  // the address follows the chosen sage, and ?road=1 while his road is flown (replaced, not pushed:
  // Back leaves the tower). The state is null on purpose: Next.js passes a replaceState on to
  // usePathname (the language links) only when the state is not its own
  useEffect(() => {
    // the kids' journey keeps its own address
    if (tourRef.current) return
    // so does a path between two sages: it keeps the address it was opened on
    if (flightRef.current) return
    const next = towerPath(locale, selected) + (road && selected ? '?road=1' : '')
    if (window.location.pathname + window.location.search !== next) window.history.replaceState(null, '', next)
    setCopied(false)
  }, [locale, selected, road])

  const share = async (n: TowerNode, withRoad = false) => {
    const url = `${window.location.origin}${towerPath(locale, n.id)}${withRoad ? '?road=1' : ''}`
    const text = withRoad ? `${SP.title[locale]}: ${n.short}` : `${n.short} ${S.inTower[locale]}`
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url })
        track('tower_share', { locale, method: 'share' })
        return
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      track('tower_share', { locale, method: 'copy' })
    } catch {
      window.prompt(text, url)
    }
  }

  // the path between two sages: the flight's own address, no query
  const shareFlight = async (f: ConnectFlight) => {
    const url = `${window.location.origin}${f.href}`
    const text = `${shortName(f.stations[0].name)} ↔ ${shortName(f.stations[f.stations.length - 1].name)} · ${S.inTower[locale]}`
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url })
        track('tower_share', { locale, method: 'share' })
        return
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
      track('tower_share', { locale, method: 'copy' })
    } catch {
      window.prompt(text, url)
    }
  }

  // the time-lapse
  useEffect(() => {
    if (!playing) return
    const span = data.maxYear - data.minYear
    let start = performance.now() - (((time ?? data.minYear) - data.minYear) / span) * PLAY_SECONDS * 1000
    if (time == null || time >= data.maxYear) { start = performance.now(); setTime(data.minYear) }
    let raf = 0
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / (PLAY_SECONDS * 1000))
      // ease through the empty millennia, linger where the sages are many
      const t = data.minYear + span * (k < 0.3 ? k * 1.2 : 0.36 + (k - 0.3) * (0.64 / 0.7))
      setTime(k >= 1 ? null : t)
      if (k >= 1) { setPlaying(false); return }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // `time` is read once when play starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, data])

  const sel = selected ? byId.get(selected) : null
  const chain = useMemo(() => (selected ? lineageOf(data, selected, 4) : null), [data, selected])
  const direct = useMemo(() => {
    if (!selected) return null
    const teachers: string[] = [], students: string[] = [], family: string[] = []
    for (const l of data.links) {
      if (l.kind === 'teacher' && l.b === selected) teachers.push(l.a)
      else if (l.kind === 'teacher' && l.a === selected) students.push(l.b)
      else if (l.kind === 'family' && (l.a === selected || l.b === selected)) family.push(l.a === selected ? l.b : l.a)
    }
    return { teachers, students, family }
  }, [data, selected])

  if (failed) {
    return (
      <div dir={dir} className="grid h-full place-items-center p-8 text-center text-ink-300">
        <div>
          <p>{S.noWebgl[locale]}</p>
          <a href={`/${locale}`} className="mt-4 inline-block rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-900">{S.toMap[locale]}</a>
        </div>
      </div>
    )
  }

  const chip = (k: TowerLinkKind, label: string) => (
    <button
      type="button"
      onClick={() => setKinds(v => ({ ...v, [k]: !v[k] }))}
      aria-pressed={kinds[k]}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${kinds[k] ? 'border-white/25 bg-white/10 text-ink-50' : 'border-white/10 text-ink-400'}`}
    >
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k], opacity: kinds[k] ? 1 : 0.4 }} />
      {label}
    </button>
  )
  const nameList = (ids: string[]) => ids.map(id => byId.get(id)).filter(Boolean).map(n => (
    <li key={n!.id}>
      <button type="button" onClick={() => setSelected(n!.id)} className="text-start text-ink-100 hover:text-gold-300">{n!.name}</button>
    </li>
  ))

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#06050a]">
      <div ref={mount} className="absolute inset-0 touch-none" />

      {/* the year, large, while the history plays or is scrubbed */}
      {time != null && (
        <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-20 text-center font-serif text-4xl font-bold text-gold-300/90 drop-shadow md:top-4 md:text-6xl">
          {yearLabel(time, locale)}
        </div>
      )}

      {/* controls (not on the kids' journey or a path between two sages, which have their own) */}
      <div dir={dir} className={`absolute inset-x-0 bottom-0 z-10 flex-col${tour || flight ? ' hidden' : ' flex'} gap-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-8 sm:px-5`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPlaying(p => !p)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-gold-400"
          >
            <span aria-hidden>{playing ? '❚❚' : '▶'}</span>
            <span className="hidden sm:inline">{playing ? S.pause[locale] : S.play[locale]}</span>
          </button>
          <input
            type="range"
            min={data.minYear}
            max={data.maxYear}
            step={1}
            value={time ?? data.maxYear}
            onChange={e => { setPlaying(false); const v = Number(e.target.value); setTime(v >= data.maxYear ? null : v) }}
            aria-label={yearLabel(time ?? data.maxYear, locale)}
            className="w-full accent-[#c9973a]"
            dir="ltr"
          />
          <button type="button" onClick={() => { setPlaying(false); setTime(null) }} className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs text-ink-200">{S.all[locale]}</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chip('teacher', S.teacher[locale])}
          {chip('family', S.family[locale])}
          {chip('influence', S.influence[locale])}
          <button type="button" onClick={() => { setSelected(null); api.current?.reset() }} className="ms-auto rounded-full border border-white/15 px-3 py-1.5 text-xs text-ink-200">{S.reset[locale]}</button>
        </div>
      </div>

      {/* the kids' journey, station by station */}
      {tour && road && (
        <KidsTourPanel
          tour={tour}
          at={roadAt}
          playing={roadPlaying}
          onGo={i => { setRoadPlaying(false); setRoadAt(Math.max(0, Math.min(road.length - 1, i))) }}
          onPlay={() => { if (roadAt === road.length - 1) setRoadAt(0); setRoadPlaying(v => roadAt === road.length - 1 ? true : !v) }}
          onOverview={() => { setRoadPlaying(false); api.current?.roadOverview() }}
        />
      )}

      {/* a path between two sages, station by station */}
      {flight && road && (
        <FlightPanel
          flight={flight}
          locale={locale}
          at={roadAt}
          playing={roadPlaying}
          copied={copied}
          onGo={i => { setRoadPlaying(false); setRoadAt(Math.max(0, Math.min(road.length - 1, i))) }}
          onPlay={() => { if (roadAt === road.length - 1) setRoadAt(0); setRoadPlaying(v => roadAt === road.length - 1 ? true : !v) }}
          onOverview={() => { setRoadPlaying(false); api.current?.roadOverview() }}
          onShare={() => shareFlight(flight)}
        />
      )}

      {/* the road to Sinai, station by station */}
      {sel && road && (() => {
        const p = road[roadAt], next = road[roadAt + 1], end = roadAt === road.length - 1
        const n = p.id ? byId.get(p.id) : undefined
        const sub = [p.gen ? genOf(p.gen, locale) : null, n && !p.group ? (n.years || data.eras.find(e => e.era === n.era)?.label) : null].filter(Boolean).join(' · ')
        const how = p.how === 'sinai' ? S.sinai[locale]
          : p.alongside ? S.sameGen[locale] + p.alongside
            : !next ? null
              : p.how === 'chain' ? S.receivedChain[locale] + (locale === 'en' ? next.name.replace(/^The /, 'the ') : next.name)
                : receivedFrom(p.how, next.name, locale, n?.feminine)
        const btn = 'grid h-9 w-9 place-items-center rounded-full border border-white/15 text-ink-100 hover:border-gold-500/60 disabled:opacity-30'
        return (
          <aside dir={dir} className="absolute inset-x-3 bottom-32 z-20 rounded-2xl border border-gold-500/35 bg-ink-900/90 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:end-4 sm:top-4 sm:bottom-auto sm:w-80">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-400">{SP.title[locale]}</p>
              <button type="button" onClick={() => setRoad(null)} aria-label={S.close[locale]} className="text-ink-400 hover:text-ink-100">✕</button>
            </div>
            <p className="mt-0.5 text-[11px] tabular-nums text-ink-500">{stationOf(roadAt + 1, road.length, locale)}</p>
            <div aria-live="polite">
              <h2 className="mt-2 font-serif text-xl font-bold leading-tight text-ink-50">{p.name}</h2>
              {sub && <p className="mt-1 text-xs text-ink-400">{sub}</p>}
              {how && <p className={`mt-2 text-sm ${p.how === 'influence' ? 'text-ink-300' : 'text-gold-200'}`}>{how}</p>}
            </div>
            {end && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="font-serif text-base font-semibold text-gold-300">{roadSummary(road.length, sel.short, locale)}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">{SP.honesty[locale]}</p>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              {/* the road runs from the sage down to Sinai: "next" goes back in time, in reading direction */}
              <button type="button" className={btn} aria-label={S.prev[locale]} disabled={roadAt === 0} onClick={() => { setRoadPlaying(false); setRoadAt(a => Math.max(0, a - 1)) }}><svg aria-hidden className="h-4 w-4 rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>
              <button type="button" className={btn} aria-label={roadPlaying ? S.pause[locale] : S.play[locale]} onClick={() => { if (end) setRoadAt(0); setRoadPlaying(v => end ? true : !v) }}><span aria-hidden className="text-xs">{roadPlaying ? '❚❚' : '▶'}</span></button>
              <button type="button" className={btn} aria-label={S.next[locale]} disabled={end} onClick={() => { setRoadPlaying(false); setRoadAt(a => Math.min(road.length - 1, a + 1)) }}><svg aria-hidden className="h-4 w-4 rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg></button>
              {!end && <button type="button" onClick={() => { setRoadPlaying(false); setRoadAt(road.length - 1) }} className="ms-auto rounded-full border border-white/15 px-3 py-1.5 text-xs text-ink-200 hover:border-gold-500/60">{S.toSinai[locale]}</button>}
            </div>
            {end && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => share(sel, true)} className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-gold-400">
                  <span aria-hidden>↗</span>{S.share[locale]}
                </button>
                <button type="button" onClick={() => { setRoadAt(0); setRoadPlaying(true) }} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-ink-100 hover:border-gold-500/50">{S.again[locale]}</button>
                <a href={`/${locale}/sage/${sel.id}`} className="text-sm text-gold-300 underline-offset-4 hover:underline">{S.open[locale]}</a>
                {copied && <span role="status" className="text-xs text-gold-300">{S.copied[locale]}</span>}
              </div>
            )}
          </aside>
        )
      })()}

      {/* the chosen sage */}
      {sel && direct && chain && !road && (
        <aside dir={dir} className="absolute inset-x-3 bottom-32 z-20 max-h-[38%] overflow-y-auto rounded-2xl border border-gold-500/25 bg-ink-900/90 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:end-4 sm:top-4 sm:bottom-auto sm:w-80 sm:max-h-[70%]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-bold leading-tight text-ink-50">{sel.name}</h2>
              <p className="mt-1 text-xs text-ink-400">
                <span className="me-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: sel.color }} />
                {[data.eras.find(e => e.era === sel.era)?.label, sel.years].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label={S.close[locale]} className="text-ink-400 hover:text-ink-100">✕</button>
          </div>
          {roadFor && roadFor.length > 1 && (
            <button
              type="button"
              onClick={() => startRoad('panel')}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold-500/50 bg-gradient-to-b from-gold-500/25 to-gold-500/10 px-3 py-2 text-sm font-semibold text-gold-200 shadow-[0_0_18px_rgba(233,196,106,0.18)] hover:from-gold-500/35"
            >
              <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round"><path d="M2.5 20 10 8.5l3.2 4.8 2.3-3L21.5 20z" /><path d="M12 3.5v2.2M7.4 5.3l1.1 1.6M16.6 5.3l-1.1 1.6" /></svg>
              {SP.title[locale]}
              <span className="text-[11px] font-normal tabular-nums text-gold-300/80">· {roadFor.length}</span>
            </button>
          )}
          <p className="mt-3 text-xs text-gold-300/90">{S.chain[locale]}: {chain.up.size + chain.down.size + chain.family.size}</p>
          {direct.teachers.length > 0 && (<><h3 className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-gold-400">{S.teachers[locale]}</h3><ul className="mt-1 space-y-0.5 text-sm">{nameList(direct.teachers)}</ul></>)}
          {direct.students.length > 0 && (<><h3 className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-gold-400">{S.students[locale]}</h3><ul className="mt-1 space-y-0.5 text-sm">{nameList(direct.students)}</ul></>)}
          {direct.family.length > 0 && (<><h3 className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-rose-300">{S.familyOf[locale]}</h3><ul className="mt-1 space-y-0.5 text-sm">{nameList(direct.family)}</ul></>)}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a href={`/${locale}/sage/${sel.id}`} className="inline-block rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-gold-400">{S.open[locale]}</a>
            <button type="button" onClick={() => share(sel)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-ink-100 hover:border-gold-500/50">
              <span aria-hidden>↗</span>{S.share[locale]}
            </button>
            {copied && <span role="status" className="text-xs text-gold-300">{S.copied[locale]}</span>}
          </div>
          {/* a plain link: the connect page ships a net of its own, nothing to prefetch from here */}
          <a href={connectHref(locale, sel.id)} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#5fd4d0]/40 px-3 py-2 text-sm text-[#9fe6e2] hover:border-[#5fd4d0]/80">
            <span aria-hidden>🔗</span>{sel.feminine ? S.connectHer[locale] : S.connectHim[locale]}
          </a>
        </aside>
      )}
    </div>
  )
}
