'use client'

// The Tower of Generations, drawn with three.js: every sage a light at the height of his time and
// in the direction of his region, teacher-to-student links as golden arcs with light flowing down
// the line of transmission, family links in rose. Press a sage to light up his teachers' teachers
// and his students' students; press play to watch 3,700 years fill in. three.js is loaded only
// here (a dynamic import inside the effect), so no other page pays for it.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '@/lib/types'
import type { TowerData, TowerNode, TowerLinkKind } from '@/lib/tower'
import { lineageOf } from '@/lib/tower'

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
  noWebgl: {
    he: 'הדפדפן הזה לא מציג גרפיקה תלת־ממדית. אפשר לראות את אותם קשרים ברשת הקשרים.',
    en: 'This browser cannot show 3D graphics. The same links are in the network view.',
    ru: 'Этот браузер не показывает 3D-графику. Те же связи есть в сети связей.',
  },
  toMap: { he: 'לרשת הקשרים', en: 'To the network', ru: 'К сети связей' },
} satisfies Record<string, Record<Locale, string>>

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
  dispose(): void
}

export function TowerScene({ data, locale }: { data: TowerData; locale: Locale }) {
  const mount = useRef<HTMLDivElement>(null)
  const api = useRef<SceneApi | null>(null)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [time, setTime] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [kinds, setKinds] = useState<Record<TowerLinkKind, boolean>>({ teacher: true, family: true, influence: false, other: false })
  const byId = useMemo(() => new Map(data.nodes.map(n => [n.id, n])), [data])
  const dir = locale === 'he' ? 'rtl' : 'ltr'

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
      let flyTo: { from: InstanceType<typeof THREE.Vector3>; to: InstanceType<typeof THREE.Vector3>; camFrom: InstanceType<typeof THREE.Vector3>; camTo: InstanceType<typeof THREE.Vector3>; t0: number } | null = null
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
        reset() {
          const d = homeDistance()
          flyTo = { from: controls.target.clone(), to: CENTER.clone(), camFrom: camera.position.clone(), camTo: new THREE.Vector3(d * 0.62, CENTER.y + d * 0.28, d * 0.74), t0: performance.now() }
          controls.autoRotate = true
        },
        dispose() {},
      }
      api.current = sceneApi

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
          const k = Math.min(1, (now - flyTo.t0) / 1100), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
          controls.target.lerpVectors(flyTo.from, flyTo.to, e)
          camera.position.lerpVectors(flyTo.camFrom, flyTo.camTo, e)
          if (k >= 1) flyTo = null
        }
        // light flowing from teacher to student
        const el = clock.getElapsedTime()
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

      {/* controls */}
      <div dir={dir} className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-8 sm:px-5">
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

      {/* the chosen sage */}
      {sel && direct && chain && (
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
          <p className="mt-3 text-xs text-gold-300/90">{S.chain[locale]}: {chain.up.size + chain.down.size + chain.family.size}</p>
          {direct.teachers.length > 0 && (<><h3 className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-gold-400">{S.teachers[locale]}</h3><ul className="mt-1 space-y-0.5 text-sm">{nameList(direct.teachers)}</ul></>)}
          {direct.students.length > 0 && (<><h3 className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-gold-400">{S.students[locale]}</h3><ul className="mt-1 space-y-0.5 text-sm">{nameList(direct.students)}</ul></>)}
          {direct.family.length > 0 && (<><h3 className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-rose-300">{S.familyOf[locale]}</h3><ul className="mt-1 space-y-0.5 text-sm">{nameList(direct.family)}</ul></>)}
          <a href={`/${locale}/sage/${sel.id}`} className="mt-4 inline-block rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-gold-400">{S.open[locale]}</a>
        </aside>
      )}
    </div>
  )
}
