'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { ERA_COLORS, ERA_LABELS, CONNECTION_LABELS } from '@/lib/types'
import { CONNECTION_TYPE_COLORS } from '@/lib/regions'
import { coordsForName, canonicalPlace, primaryPlaceOf, resolveCoords } from '@/lib/locationCoords'
import { tr } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import type { Locale, Sage, Connection } from '@/lib/types'
import { cn, formatYearRange } from '@/lib/utils'

// Esri Canvas basemaps: label-free light/dark, served without an API key.
// CARTO's basemaps.cartocdn.com endpoints now stamp "API KEY REQUIRED" across
// every unkeyed tile, so they cannot be used here.
const TILE_URLS = {
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  dark:  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
}
const TILE_ATTRIBUTION = 'Tiles &copy; <a href="https://www.esri.com">Esri</a> — Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
const TILE_MAX_ZOOM = 16

// Zoom level a selected sage is flown to — close enough to read the city around it.
const SAGE_FOCUS_ZOOM = 8

// Opening view: Iberia and Morocco to Persia and Lithuania. Fitted rather than
// fixed, so a phone gets the whole of it instead of the eastern Mediterranean.
const INITIAL_BOUNDS: [[number, number], [number, number]] = [[28, -9], [55, 48]]

// At or below this zoom, markers are gathered into count bubbles.
const CLUSTER_MAX_ZOOM = 5
// Two places whose bubbles would sit closer than this (in pixels) share one.
const CLUSTER_RADIUS_PX = 36

type LatLng = { lat: number; lng: number }

/** Everything the effects below need from the Leaflet instance, typed. */
interface MapHandles {
  L: typeof import('leaflet')
  map: import('leaflet').Map
  tiles: import('leaflet').TileLayer
  /** One marker per placeable sage; only those in `visible` are on the map. */
  markers: Map<string, import('leaflet').CircleMarker>
  /** A sage's true coordinates: the place itself, never its ring slot. */
  coordsById: Map<string, LatLng>
  linkLayer: import('leaflet').LayerGroup
  /** Ids currently drawn: the filtered set, less anyone without a place. */
  visible: Set<string>
  /** Redraw markers, bubbles and journeys for exactly these sage ids. */
  show: (ids: Set<string>) => void
}

interface GeoMapProps {
  locale: Locale
}

export function GeoMap({ locale }: GeoMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const handlesRef = useRef<MapHandles | null>(null)
  const [showLinks, setShowLinks] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [tilesOffline, setTilesOffline] = useState(false)

  const { sages, filteredSages, selectedSageId, selectSage, connections, activeTab, theme } = useAppStore()

  useEffect(() => {
    if (!mapRef.current || !sages.length) return

    let mounted = true

    import('leaflet').then(L => {
      if (!mounted || !mapRef.current || handlesRef.current) return
      const el = mapRef.current

      // Fix default icon path
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(el, {
        center:           [33, 30],
        zoom:             4,
        zoomControl:      false,
        attributionControl: true,
      })
      // fitBounds on a zero-size container yields a NaN zoom; keep the fixed
      // view in that case and let the activeTab effect's invalidateSize recover.
      if (el.clientWidth > 50 && el.clientHeight > 50) map.fitBounds(INITIAL_BOUNDS, { animate: false })

      // אריחים ללא תוויות לועזיות; שמות בעברית נוספים כשכבה משלנו.
      // הכתובת נבחרת לפי ערכת הנושא ומוחלפת חיה במעבר כהה/בהיר.
      const isLight = document.documentElement.dataset.theme === 'light'
      const tiles = L.tileLayer(
        isLight ? TILE_URLS.light : TILE_URLS.dark,
        { attribution: TILE_ATTRIBUTION, maxZoom: TILE_MAX_ZOOM }
      ).addTo(map)

      // No tiles (offline, blocked, rate-limited): say so quietly rather than
      // leave an unexplained blank. One loaded tile clears the flag.
      let tileErrors = 0
      tiles.on('tileerror', () => { if (++tileErrors >= 4) setTilesOffline(true) })
      tiles.on('tileload',  () => { tileErrors = 0; setTilesOffline(false) })

      // Offline basemap: a faint 10° graticule in a pane *under* the tiles.
      // Opaque tiles hide it completely; it only shows where tiles failed, so
      // the markers keep a sense of scale and direction without a basemap.
      const graticulePane = map.createPane('graticule')
      graticulePane.style.zIndex = '150'
      graticulePane.style.pointerEvents = 'none'
      const graticule = L.layerGroup().addTo(map)
      const gridStyle = { pane: 'graticule', className: 'geo-graticule', weight: 1, interactive: false }
      for (let lat = -80; lat <= 80; lat += 10) {
        L.polyline([[lat, -180], [lat, 180]], gridStyle).addTo(graticule)
      }
      for (let lng = -180; lng <= 180; lng += 10) {
        L.polyline([[-85, lng], [85, lng]], gridStyle).addTo(graticule)
      }

      // ── שמות ארצות ואזורים — עברית/אנגלית לפי שפת הממשק ──────────
      const REGION_MAP_LABELS: Array<[string, string, number, number, number]> = [
        ['ארץ ישראל', 'Eretz Israel', 31.55, 34.95, 13], ['מצרים', 'Egypt', 28.6, 30.6, 12],
        ['בבל (עיראק)', 'Babylonia (Iraq)', 32.2, 43.7, 12],
        ['פרס', 'Persia', 32.4, 54.0, 12], ['תימן', 'Yemen', 15.6, 47.5, 11],
        ['טורקיה', 'Turkey', 39.2, 33.5, 12],
        ['יוון', 'Greece', 39.4, 22.3, 11], ['איטליה', 'Italy', 42.9, 12.4, 12],
        ['ספרד', 'Spain', 40.0, -3.9, 13],
        ['פורטוגל', 'Portugal', 39.6, -8.3, 11], ['צרפת', 'France', 47.2, 2.4, 12],
        ['פרובנס', 'Provence', 43.7, 5.6, 10],
        ['אשכנז (גרמניה)', 'Ashkenaz (Germany)', 50.8, 10.2, 12],
        ['אוסטריה', 'Austria', 47.4, 14.8, 10], ['בוהמיה', 'Bohemia', 49.8, 15.0, 10],
        ['פולין', 'Poland', 52.1, 19.4, 12], ['ליטא', 'Lithuania', 55.3, 24.0, 11],
        ['רוסיה', 'Russia', 56.5, 38.5, 12],
        ['אוקראינה', 'Ukraine', 48.8, 31.4, 11], ['מרוקו', 'Morocco', 31.6, -6.8, 11],
        ['אלג׳יריה', 'Algeria', 34.8, 2.8, 11],
        ['תוניסיה', 'Tunisia', 34.2, 9.4, 10], ['לוב', 'Libya', 29.8, 17.5, 10],
        ['ארה״ב', 'USA', 39.0, -98.0, 12],
      ]
      REGION_MAP_LABELS.forEach(([he, en, lat, lng, size]) => {
        const name = locale === 'he' ? he : en
        L.marker([lat as number, lng as number], {
          icon: L.divIcon({
            className: '',
            html: `<span style="font-family:'Frank Ruhl Libre',serif;font-size:${size}px;font-weight:700;color:var(--ink-200);opacity:0.9;text-shadow:0 0 4px var(--ink-900), 0 0 8px var(--ink-900);white-space:nowrap;">${name}</span>`,
            iconSize: [0, 0],
          }),
          interactive: false,
          keyboard: false,
        }).addTo(map)
      })

      // Zoom control at the top of the reading-start edge. At the bottom it sat
      // under the chat button; the end edge is taken by the קשרים toggle and
      // the 2D/3D switch.
      L.control.zoom({ position: locale === 'he' ? 'topright' : 'topleft' }).addTo(map)

      // Leaflet chrome in the app's glass look. Injected once per page.
      if (!document.getElementById('geo-map-style')) {
        const style = document.createElement('style')
        style.id = 'geo-map-style'
        style.textContent = `
          .geo-map .leaflet-top { margin-top: 3.25rem; }
          .geo-graticule { stroke: var(--ink-700); stroke-opacity: 0.55; }
          .leaflet-control-zoom a {
            background: rgba(26,20,14,0.8) !important;
            backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(201,151,58,0.2) !important;
            color: #c4a87d !important;
          }
          .leaflet-control-zoom a:hover { color: #e8b84b !important; }
          .leaflet-control-attribution {
            background: rgba(10,8,6,0.7) !important;
            color: #5a4a38 !important;
            font-size: 9px !important;
          }
          .leaflet-control-attribution a { color: #7a6550 !important; }
          .leaflet-popup-content-wrapper {
            background: rgba(26,20,14,0.95) !important;
            border: 1px solid rgba(201,151,58,0.2) !important;
            border-radius: 8px !important;
            color: #e8d5b0 !important;
          }
          .leaflet-popup-tip { background: rgba(26,20,14,0.95) !important; }
          [data-theme='light'] .leaflet-control-zoom a {
            background: rgba(255,252,244,0.92) !important;
            border: 1px solid rgba(138,106,30,0.35) !important;
            color: #6d4f12 !important;
          }
          [data-theme='light'] .leaflet-control-attribution {
            background: rgba(255,252,244,0.8) !important;
            color: #8a7350 !important;
          }
          [data-theme='light'] .leaflet-popup-content-wrapper {
            background: rgba(255,252,244,0.97) !important;
            border: 1px solid rgba(138,106,30,0.3) !important;
            color: #241b10 !important;
          }
          [data-theme='light'] .leaflet-popup-tip { background: rgba(255,252,244,0.97) !important; }
          .leaflet-tooltip {
            background: rgba(26,20,14,0.94) !important;
            border: 1px solid rgba(201,151,58,0.3) !important;
            border-radius: 8px !important;
            color: #e8d5b0 !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
            padding: 5px 9px !important;
          }
          .leaflet-tooltip-top:before { border-top-color: rgba(201,151,58,0.3) !important; }
          [data-theme='light'] .leaflet-tooltip {
            background: rgba(255,252,244,0.97) !important;
            border: 1px solid rgba(138,106,30,0.35) !important;
            color: #241b10 !important;
          }
          [data-theme='light'] .leaflet-tooltip-top:before { border-top-color: rgba(138,106,30,0.35) !important; }
        `
        document.head.appendChild(style)
      }

      // ── Markers ──────────────────────────────────────────────
      // Built once for every placeable sage; `show` decides which are drawn.
      const markers    = new Map<string, import('leaflet').CircleMarker>()
      const coordsById = new Map<string, LatLng>()
      /** Canonical place name under each sage's marker (null for raw coords). */
      const placeById  = new Map<string, string | null>()
      const sageById   = new Map(sages.map(s => [s.id, s]))
      const markersLayer = L.layerGroup().addTo(map)

      const pointKey = (c: LatLng) => `${c.lat.toFixed(4)}:${c.lng.toFixed(4)}`

      sages.forEach(sage => {
        const c = resolveCoords(sage)
        if (!c) return
        coordsById.set(sage.id, c)
        placeById.set(sage.id, primaryPlaceOf(sage))

        const color = ERA_COLORS[sage.period] ?? '#7a6550'
        const marker = L.circleMarker([c.lat, c.lng], {
          radius:      7,
          fillColor:   color,
          color:       '#0a0806',
          weight:      1.5,
          opacity:     1,
          fillOpacity: 0.85,
        })

        const eraLabel = ERA_LABELS[sage.period]?.[locale] ?? sage.period
        const years = formatYearRange(sage.birth_year, sage.death_year, sage.date_precision)

        // Theme classes, not fixed colours: the popup background flips with the
        // theme, and a fixed cream name was invisible on the light one.
        const popupContent = `
          <div class="font-sans" style="min-width:160px;">
            <p class="font-serif text-ink-100" style="font-size:15px;font-weight:700;margin:0 0 4px;">${sage.label}</p>
            ${sage.name_en ? `<p class="text-ink-400" style="font-size:11px;margin:0 0 6px;">${sage.name_en}</p>` : ''}
            <p style="margin:0 0 6px;">
              <span class="text-ink-200" style="font-size:10px;padding:1px 8px;border-radius:9999px;
                background:${color}26;border:1px solid ${color};">${eraLabel}</span>
              ${years ? `<span class="text-ink-400" style="font-size:10px;margin-inline-start:6px;">${years}</span>` : ''}
            </p>
            ${sage.location ? `<p class="text-ink-300" style="font-size:11px;margin:0;">📍 ${sage.location}</p>` : ''}
            ${sage.spotify_url ? `<a href="${sage.spotify_url}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;padding:3px 10px;background:#1DB954;color:#fff;border-radius:12px;font-size:10px;font-weight:700;text-decoration:none;">🎵 ${tr(locale, 'האזן בספוטיפיי', 'Listen on Spotify', 'Слушать в Spotify')}</a>` : ''}
          </div>
        `
        marker.bindPopup(popupContent, { maxWidth: 220, className: '' })

        // Hover mini-card (masterplan §3: enhanced tooltips)
        marker.bindTooltip(
          `<div class="font-sans" style="text-align:${locale === 'he' ? 'right' : 'left'};" dir="${locale === 'he' ? 'rtl' : 'ltr'}">
            <span class="font-serif" style="font-size:13px;font-weight:700;">${sage.label}</span>
            <span style="font-size:10px;color:${color};margin-inline-start:6px;">${eraLabel}</span>
            ${years ? `<div style="font-size:10px;opacity:0.7;">${years}</div>` : ''}
          </div>`,
          { direction: 'top', opacity: 0.95, offset: [0, -6], sticky: false },
        )

        marker.on('click', () => selectSage(sage))
        marker.on('dblclick', e => {
          L.DomEvent.stopPropagation(e as unknown as Event)
          map.setView(marker.getLatLng(), Math.min(TILE_MAX_ZOOM, map.getZoom() + 3))
        })
        markers.set(sage.id, marker)
      })

      // Coordinates come from a gazetteer keyed by place name, so every sage
      // of one city gets the SAME point and their dots stack exactly — 71
      // sages of Jerusalem rendered as a single visible circle, the rest
      // hidden underneath and unclickable. Spread co-located sages around a
      // small ring so each is reachable. The ring grows with the crowd but is
      // capped, and the true coordinate is still used for connection lines and
      // migration paths, which should point at the city, not at the ring.
      // Rings are laid out over the *visible* sages only, so a filter closes
      // the gaps instead of leaving holes where hidden sages used to be.
      const layoutRings = (ids: string[]) => {
        const atPoint = new Map<string, string[]>()
        for (const id of ids) {
          const k = pointKey(coordsById.get(id)!)
          const bucket = atPoint.get(k)
          if (bucket) bucket.push(id)
          else atPoint.set(k, [id])
        }
        atPoint.forEach(group => {
          const c = coordsById.get(group[0])!
          group.forEach((id, i) => {
            if (group.length < 2) { markers.get(id)!.setLatLng([c.lat, c.lng]); return }
            // Rings of at most 12; beyond that a second, wider ring takes over,
            // so a place like Jerusalem stays legible instead of one dense circle.
            const perRing = 12
            const ring = Math.floor(i / perRing)
            const within = i % perRing
            const count = Math.min(group.length - ring * perRing, perRing)
            const radius = 0.28 + ring * 0.26          // degrees
            const angle = (2 * Math.PI * within) / count
            markers.get(id)!.setLatLng([
              c.lat + radius * Math.sin(angle),
              // longitude degrees shrink toward the poles; correct so the ring
              // stays visually circular rather than stretched
              c.lng + (radius * Math.cos(angle)) / Math.cos((c.lat * Math.PI) / 180),
            ])
          })
        })
      }

      // ── Marker clustering at low zoom (dense areas: Israel, Spain…) ──
      // Dependency-free. Sages are first gathered by the place their marker
      // stands on (the same resolver the place cohort uses), then places whose
      // bubbles would overlap at this zoom share one. A bubble that holds a
      // single place therefore shows exactly the number the cohort reports as
      // "pinned here". Above CLUSTER_MAX_ZOOM the individual markers return.
      const clusterLayer = L.layerGroup().addTo(map)
      // Declared ahead of `handles` so a zoomend can never read it early.
      let visibleIds = new Set<string>()

      const renderClusters = () => {
        const z = map.getZoom()
        clusterLayer.clearLayers()
        if (z > CLUSTER_MAX_ZOOM) {
          if (!map.hasLayer(markersLayer)) map.addLayer(markersLayer)
          return
        }
        if (map.hasLayer(markersLayer)) map.removeLayer(markersLayer)

        // Visible sages by the point they stand on.
        const points = new Map<string, { c: LatLng; ids: string[] }>()
        visibleIds.forEach(id => {
          const c = coordsById.get(id)!
          const k = pointKey(c)
          const p = points.get(k)
          if (p) p.ids.push(id)
          else points.set(k, { c, ids: [id] })
        })

        // Largest point first seeds a bubble; smaller neighbours join it.
        const bubbles: Array<{ seed: import('leaflet').Point; points: Array<{ c: LatLng; ids: string[] }> }> = []
        ;[...points.values()]
          .sort((a, b) => b.ids.length - a.ids.length)
          .forEach(p => {
            const px = map.project([p.c.lat, p.c.lng], z)
            const home = bubbles.find(b => b.seed.distanceTo(px) < CLUSTER_RADIUS_PX)
            if (home) home.points.push(p)
            else bubbles.push({ seed: px, points: [p] })
          })

        bubbles.forEach(b => {
          const ids = b.points.flatMap(p => p.ids)
          const lat = b.points.reduce((s, p) => s + p.c.lat * p.ids.length, 0) / ids.length
          const lng = b.points.reduce((s, p) => s + p.c.lng * p.ids.length, 0) / ids.length

          if (ids.length === 1) {
            // Single sage — draw a regular dot
            const sage = sageById.get(ids[0])
            if (!sage) return
            const c = ERA_COLORS[sage.period] ?? '#7a6550'
            L.circleMarker([lat, lng], {
              radius: 7, fillColor: c, color: '#0a0806', weight: 1.5, fillOpacity: 0.85,
            })
              .on('click', () => selectSage(sage))
              .on('dblclick', e => {
                L.DomEvent.stopPropagation(e as unknown as Event)
                map.setView([lat, lng], Math.min(TILE_MAX_ZOOM, map.getZoom() + 3))
              })
              .bindTooltip(sage.label, { direction: 'top', offset: [0, -6] })
              .addTo(clusterLayer)
            return
          }

          // Who is in the bubble, by place — Turkey, Italy — so a click can
          // focus the dominant place, and the tooltip can say what was merged.
          const tally = new Map<string, number>()
          for (const id of ids) {
            const place = placeById.get(id)
            if (place) tally.set(place, (tally.get(place) ?? 0) + 1)
          }
          const byCount = [...tally.entries()].sort((x, y) => y[1] - x[1])
          const dominant = byCount[0]?.[0] ?? null
          const shown = byCount.slice(0, 3).map(([p, n]) => `${p} ${n}`).join(' · ')
          const more = byCount.length > 3 ? ` · +${byCount.length - 3}` : ''
          const tip = byCount.length > 1
            ? `<b>${ids.length}</b> ${tr(locale, 'חכמים', 'sages', 'мудрецов')}<br/>${shown}${more}`
            : `${dominant ?? ''} · ${ids.length}`

          // Cluster bubble with count — click zooms in and focuses the place
          const size = Math.min(46, 26 + Math.sqrt(ids.length) * 3)
          L.marker([lat, lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;
                display:flex;align-items:center;justify-content:center;
                background:rgba(201,151,58,0.85);border:2px solid rgba(255,244,220,0.9);
                color:#1a140e;font-family:Heebo,sans-serif;font-weight:700;
                font-size:${ids.length > 99 ? 11 : 13}px;
                box-shadow:0 2px 10px rgba(0,0,0,0.45);cursor:pointer;">
                ${ids.length}</div>`,
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            }),
          })
            .bindTooltip(
              `<span style="font-family:Heebo,sans-serif;font-size:11px;">${tip}</span>`,
              { direction: 'top', offset: [0, -size / 2] },
            )
            .on('click', () => {
              map.setView([lat, lng], Math.min(CLUSTER_MAX_ZOOM + 2, z + 3))
              // Focusing the place narrows filteredSages, and the 3D layer view
              // builds its period plates from exactly that — so switching to
              // שכבות now shows who was in this region, era by era.
              if (dominant) useAppStore.getState().setPlaceFocus(dominant, null)
            })
            .addTo(clusterLayer)
        })
      }

      map.on('zoomend', renderClusters)

      // ── Migration paths ──────────────────────────────────────
      // One group per sage, held off the map and added by `show`, so a filter
      // hides the journeys of everyone it hides.
      const journeys = new Map<string, import('leaflet').LayerGroup>()
      const migrationLayer = L.layerGroup().addTo(map)
      sages.forEach(sage => {
        if (!sage.migration_path) return
        const path = sage.migration_path
        const stops = [path.from, ...(path.intermediate ?? []), path.to]

        // Same resolver as the markers, so a stop spelled "פרובאנס" lands on
        // the same point, and names the same cohort, as a sage based there.
        const resolved = stops
          .map(name => ({ name: canonicalPlace(name), c: coordsForName(name) }))
          .filter((s): s is { name: string; c: LatLng } => !!s.name && !!s.c)
        const coordStops = resolved.map(s => s.c)
        if (coordStops.length < 2) return

        const color = ERA_COLORS[sage.period] ?? '#7a6550'
        const group = L.layerGroup()

        const line = L.polyline(
          coordStops.map(c => [c.lat, c.lng] as [number, number]),
          { color, weight: 2, opacity: 0.5, dashArray: '6,4' }
        ).addTo(group)

        // Clicking a journey opens its destination's cohort with this sage as
        // the anchor; the panel then exposes every stop, so one click reaches
        // the whole route without needing a marker per stop.
        line
          .bindTooltip(
            `<span style="font-family:Heebo,sans-serif;font-size:11px;">${sage.label}<br/>${resolved.map(s => s.name).join(' ← ')}</span>`,
            { direction: 'top', sticky: true },
          )
          .on('click', e => {
            L.DomEvent.stopPropagation(e as unknown as Event)
            const dest = resolved[resolved.length - 1]?.name
            if (dest) useAppStore.getState().setPlaceFocus(dest, sage.id)
          })
          .on('mouseover', () => line.setStyle({ weight: 4, opacity: 0.95 }))
          .on('mouseout',  () => line.setStyle({ weight: 2, opacity: 0.5  }))

        // Directional arrowhead at each segment midpoint (origin → destination)
        coordStops.forEach((_, i) => {
          if (i === 0) return
          const prev = coordStops[i - 1]
          const curr = coordStops[i]
          const mid = { lat: (prev.lat + curr.lat) / 2, lng: (prev.lng + curr.lng) / 2 }
          const dx = (curr.lng - prev.lng) * Math.cos(((prev.lat + curr.lat) / 2) * Math.PI / 180)
          const dy = curr.lat - prev.lat
          const angle = Math.atan2(-dy, dx) * 180 / Math.PI
          L.marker([mid.lat, mid.lng], {
            icon: L.divIcon({
              className: '',
              html: `<span style="display:inline-block;transform:rotate(${angle}deg);color:${color};font-size:12px;opacity:0.9;text-shadow:0 0 3px var(--ink-900);">➤</span>`,
              iconSize: [0, 0],
            }),
            interactive: false,
          }).addTo(group)
        })
        journeys.set(sage.id, group)
      })

      // ── One entry point for "draw these sages" ───────────────
      const handles: MapHandles = {
        L, map, tiles, markers, coordsById,
        linkLayer: L.layerGroup().addTo(map),
        visible: new Set(),
        show: ids => {
          const visible = [...ids].filter(id => coordsById.has(id))
          visibleIds = new Set(visible)
          handles.visible = visibleIds
          layoutRings(visible)
          markersLayer.clearLayers()
          visible.forEach(id => markersLayer.addLayer(markers.get(id)!))
          migrationLayer.clearLayers()
          visible.forEach(id => { const j = journeys.get(id); if (j) migrationLayer.addLayer(j) })
          renderClusters()
        },
      }
      handlesRef.current = handles
      setMapReady(true)   // triggers the filter sync and the connection-lines layer
    })

    return () => {
      mounted = false
      // Rebuild when the dataset is replaced (data.json fallback swaps sage ids)
      if (handlesRef.current) {
        handlesRef.current.map.remove()
        handlesRef.current = null
        setMapReady(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages, locale])

  // ── Sync filter: markers, bubbles and journeys show the filtered set ──
  // Bubbles used to be built once from every sage and never rebuilt, so at the
  // opening zoom a filter changed nothing on the map.
  useEffect(() => {
    handlesRef.current?.show(new Set(filteredSages.map(s => s.id)))
  }, [filteredSages, mapReady])

  // ── Connection lines: only between two sages that are both shown ──
  useEffect(() => {
    const h = handlesRef.current
    if (!h) return
    const { L, linkLayer: group, coordsById } = h
    group.clearLayers()
    if (!showLinks) return

    const shown = new Set(filteredSages.map(s => s.id))
    const sageMap = new Map<string, Sage>(sages.map(s => [s.id, s]))

    // Group by unordered pair so a single line carries every relationship
    // documented between the two sages.
    const pairs = new Map<string, Connection[]>()
    connections.forEach(conn => {
      if (!shown.has(conn.source) || !shown.has(conn.target)) return
      const key = [conn.source, conn.target].sort().join('|')
      const bucket = pairs.get(key)
      if (bucket) bucket.push(conn)
      else pairs.set(key, [conn])
    })

    pairs.forEach(items => {
      const conn = items[0]
      const a = coordsById.get(conn.source)
      const b = coordsById.get(conn.target)
      if (!a || !b) return
      // same-city pairs draw nothing meaningful on the map
      if (Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lng - b.lng) < 0.02) return
      const color = CONNECTION_TYPE_COLORS[conn.type] ?? '#c9973a'
      const line = L.polyline(
        [[a.lat, a.lng], [b.lat, b.lng]],
        {
          color, weight: 1.3, opacity: 0.4,
          dashArray: conn.type === 'influence' ? '6,4'
            : (conn.type === 'colleague' || conn.type === 'contemporary') ? '2,4' : undefined,
        }
      ).addTo(group)

      // A 1.3px stroke is effectively unclickable, so a transparent wide
      // line carries the hover/click interaction.
      const rows = items.map(c => {
        const from  = sageMap.get(c.source)?.label ?? c.source
        const to    = sageMap.get(c.target)?.label ?? c.target
        const label = CONNECTION_LABELS[c.type]?.[locale] ?? c.type
        const col   = CONNECTION_TYPE_COLORS[c.type] ?? '#c9973a'
        return `
          <div style="margin-top:6px;">
            <span style="font-size:10px;padding:1px 8px;border-radius:9999px;
              background:${col}22;color:${col};border:1px solid ${col}55;">${label}</span>
            <div dir="ltr" style="font-family:'Frank Ruhl Libre',serif;font-size:12px;
              margin-top:3px;display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
              <span style="unicode-bidi:isolate;">${from}</span>
              <span style="color:${col};">⟶</span>
              <span style="unicode-bidi:isolate;">${to}</span>
            </div>
          </div>`
      }).join('')

      L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
        color: '#ffffff', weight: 14, opacity: 0, interactive: true,
      })
        .addTo(group)
        .bindPopup(
          `<div class="font-sans" style="min-width:180px;">
            <p class="text-ink-400" style="font-size:10px;margin:0;letter-spacing:0.04em;">
              ${tr(locale, 'סוג הקשר', 'Relationship', 'Тип связи')}
              ${items.length > 1 ? ` (${items.length})` : ''}
            </p>${rows}
          </div>`,
          { maxWidth: 260 },
        )
        .on('mouseover', () => line.setStyle({ weight: 3.5, opacity: 0.95 }))
        .on('mouseout',  () => line.setStyle({ weight: 1.3, opacity: 0.4 }))
      // ראש חץ בכיוון הקשר (מקור ← יעד)
      const t = 0.58
      const pLat = a.lat + (b.lat - a.lat) * t
      const pLng = a.lng + (b.lng - a.lng) * t
      const dx = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
      const dy = b.lat - a.lat
      const angle = Math.atan2(-dy, dx) * 180 / Math.PI
      L.marker([pLat, pLng], {
        icon: L.divIcon({
          className: '',
          html: `<span style="display:inline-block;transform:rotate(${angle}deg);color:${color};font-size:11px;opacity:0.85;text-shadow:0 0 3px var(--ink-900);">➤</span>`,
          iconSize: [0, 0],
        }),
        interactive: false,
      }).addTo(group)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLinks, connections, filteredSages, mapReady, locale])

  // ── Pan to selected sage ─────────────────────────────────────
  // חשוב: רק כשהטאב גלוי. flyTo על מפה מוסתרת (גודל 0) זורק
  // "Invalid LatLng (NaN)" ומפיל את כל האפליקציה בעת לחיצה על חכם.
  useEffect(() => {
    if (activeTab !== 'map') return
    const h = handlesRef.current
    if (!selectedSageId || !h) return
    const el = mapRef.current
    if (!el || el.clientWidth < 50 || el.clientHeight < 50) return
    const map = h.map
    const marker = h.markers.get(selectedSageId)
    if (!marker) return
    try {
      map.invalidateSize()
      // A sage outside the current filter has no marker on the map: fly to
      // their place anyway, but there is nothing to open a popup on.
      const shown = h.visible.has(selectedSageId)
      const target = shown ? marker.getLatLng() : h.coordsById.get(selectedSageId)!
      map.flyTo(target, Math.max(map.getZoom(), SAGE_FOCUS_ZOOM), { duration: 1 })
      // Open after the fly ends — at low zoom the marker may still be
      // clustered until zoomend re-adds the individual markers layer
      if (shown) setTimeout(() => { try { marker.openPopup() } catch { /* noop */ } }, 1100)
    } catch {
      /* hidden/zero-size map — safely ignore */
    }
  // mapReady: a sage selected before the map existed (a ?sage= deep link)
  // used to be skipped for good; fly once the map is built instead.
  }, [selectedSageId, activeTab, mapReady])

  // ── Swap tile style when the theme changes ───────────────────
  useEffect(() => {
    handlesRef.current?.tiles.setUrl(theme === 'light' ? TILE_URLS.light : TILE_URLS.dark)
  }, [theme])

  // ── Invalidate map size when tab becomes visible ─────────────
  useEffect(() => {
    if (activeTab !== 'map') return
    const t = setTimeout(() => {
      try { handlesRef.current?.map.invalidateSize() } catch { /* noop */ }
    }, 120)
    return () => clearTimeout(t)
  }, [activeTab])

  // "מוצגים X מתוך Y": X is what the map can actually draw — the filtered set
  // less anyone whose location names no known place.
  const placed = useMemo(
    () => new Set(sages.filter(s => resolveCoords(s)).map(s => s.id)),
    [sages],
  )
  const shownCount = useMemo(
    () => filteredSages.reduce((n, s) => n + (placed.has(s.id) ? 1 : 0), 0),
    [filteredSages, placed],
  )
  const unplaced = sages.length - placed.size

  return (
    <div className="relative w-full h-full">
      {/* The container's own background is the offline basemap: Leaflet's
          default is a bright #ddd slab, glaring in the dark theme whenever
          tiles fail to load. */}
      <div
        ref={mapRef}
        className="geo-map absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 55% 40%, var(--ink-800), var(--ink-900) 75%)' }}
      />

      {/* Connection lines toggle.
          z-[1000]: this button is painted in the same stacking context as
          Leaflet's own panes (200–800), so anything lower renders behind the
          tiles — invisible but still clickable.
          top-12 (not top-4): it shares this corner with AppShell's 2D/3D mode
          switch at top-2, which it would otherwise sit directly on top of. */}
      <div className="absolute top-12 end-4 z-[1000]">
        <button
          onClick={() => setShowLinks(v => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans border transition-all shadow-glass',
            showLinks
              ? 'bg-gold-500/20 border-gold-500/50 text-gold-300'
              : 'glass border-ink-700/50 text-ink-400 hover:text-ink-200',
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {tr(locale, 'קשרים', 'Connections', 'Связи')}
        </button>
      </div>

      {/* How much of the filtered set is on the map. */}
      {sages.length > 0 && (
        <div
          className="absolute top-[3.4rem] left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto glass rounded-2xl md:rounded-full px-3 py-1 text-[11px] leading-tight text-center font-sans text-ink-300 whitespace-nowrap shadow-glass"
          title={unplaced > 0
            ? tr(locale, `${unplaced} ללא מיקום מזוהה`, `${unplaced} without a known place`, `${unplaced} без известного места`)
            : undefined}
          role="status"
        >
          {tr(locale, 'מוצגים', 'Showing', 'Показано')}{' '}
          <b className="text-gold-300">{shownCount}</b>{' '}
          {tr(locale, 'מתוך', 'of', 'из')} {sages.length}
          {/* Own line on phones, where one line collided with the קשרים toggle. */}
          {tilesOffline && (
            <span className="block md:inline text-ink-500">
              <span className="hidden md:inline">{' · '}</span>
              {tr(locale, 'מפת רקע לא זמינה', 'basemap offline', 'подложка недоступна')}
            </span>
          )}
        </div>
      )}

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {tr(locale, 'טוען מפה...', 'Loading map...', 'Загрузка карты...')}
          </p>
        </div>
      )}
    </div>
  )
}
