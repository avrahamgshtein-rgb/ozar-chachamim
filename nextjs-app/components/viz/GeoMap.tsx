'use client'

import { useEffect, useRef, useState, memo } from 'react'
import 'leaflet/dist/leaflet.css'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import { CONNECTION_TYPE_COLORS } from '@/lib/regions'
import { LOCATION_COORDS, resolveCoords } from '@/lib/locationCoords'
import { tr } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Locale, Sage } from '@/lib/types'
import { cn } from '@/lib/utils'

// Hebrew/English → {lat, lng} gazetteer + resolveCoords:
// moved verbatim to lib/locationCoords.ts (shared with the Sage Dossier
// mini-map) and imported above.

interface GeoMapProps {
  locale: Locale
}

function GeoMapComponent({ locale }: GeoMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapObjRef  = useRef<import('leaflet').Map | null>(null)
  const [showLinks, setShowLinks] = useState(true)
  const [mapReady, setMapReady] = useState(false)

  const { sages, filteredSages, selectedSageId, selectSage, connections, activeTab, theme } = useAppStore()

  useEffect(() => {
    if (!mapRef.current || !sages.length) return
    // Rebuild when the dataset is replaced (data.json fallback swaps sage ids)
    if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; setMapReady(false) }

    let mounted = true

    import('leaflet').then(L => {
      if (!mounted || !mapRef.current || mapObjRef.current) return

      // Fix default icon path
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center:           [33, 30],
        zoom:             4,
        zoomControl:      false,
        attributionControl: true,
      })
      mapObjRef.current = map

      // CartoDB tiles — ללא תוויות לועזיות; שמות בעברית נוספים כשכבה משלנו.
      // הכתובת נבחרת לפי ערכת הנושא ומוחלפת חיה במעבר כהה/בהיר.
      const isLight = document.documentElement.dataset.theme === 'light'
      const tiles = L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/${isLight ? 'light_nolabels' : 'dark_nolabels'}/{z}/{x}/{y}{r}.png`,
        {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 18,
        }
      ).addTo(map)
      ;(map as any)._tileLayer = tiles

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

      // Custom zoom controls (top-end corner)
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Override Leaflet zoom button style with glass look via inline CSS
      const style = document.createElement('style')
      style.textContent = `
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

      // ── Markers with scatter logic for same-location clustering ──────
      const markerRefs = new Map<string, import('leaflet').CircleMarker>()
      const markersLayer = L.layerGroup().addTo(map)

      // Group sages by location to detect clustering
      const locationMap = new Map<string, string[]>()
      sages.forEach(sage => {
        const coords = resolveCoords(sage)
        if (!coords) return
        const key = `${Math.round(coords.lat * 100)},${Math.round(coords.lng * 100)}`
        const ids = locationMap.get(key) ?? []
        ids.push(sage.id)
        locationMap.set(key, ids)
      })

      sages.forEach((sage, idx) => {
        const coords = resolveCoords(sage)
        if (!coords) return

        // Calculate scatter offset for same-location markers
        const key = `${Math.round(coords.lat * 100)},${Math.round(coords.lng * 100)}`
        const sagesAtLocation = locationMap.get(key) ?? []
        const sageIndexInLocation = sagesAtLocation.indexOf(sage.id)
        const totalAtLocation = sagesAtLocation.length

        let finalLat = coords.lat
        let finalLng = coords.lng

        if (totalAtLocation > 1) {
          // Scatter markers in a small circle around the location
          const scatterRadius = 0.012 * Math.sqrt(totalAtLocation) // ~1.3km per marker
          const angle = (sageIndexInLocation / totalAtLocation) * Math.PI * 2
          finalLat += scatterRadius * Math.sin(angle)
          finalLng += scatterRadius * Math.cos(angle)
        }

        const color = ERA_COLORS[sage.period] ?? '#7a6550'

        const marker = L.circleMarker([finalLat, finalLng], {
          radius:      7,
          fillColor:   color,
          color:       '#0a0806',
          weight:      1.5,
          opacity:     1,
          fillOpacity: 0.85,
        }).addTo(markersLayer)

        const eraLabel = ERA_LABELS[sage.period]?.[locale] ?? sage.period
        const years = [sage.birth_year, sage.death_year].filter(Boolean).join(' – ')

        const popupContent = `
          <div style="font-family:Heebo,sans-serif;min-width:160px;">
            <p style="font-family:'Frank Ruhl Libre',serif;font-size:15px;font-weight:700;
               color:#e8d5b0;margin:0 0 4px;">${sage.label}</p>
            ${sage.name_en ? `<p style="font-size:11px;color:#9a8570;margin:0 0 6px;">${sage.name_en}</p>` : ''}
            <p style="margin:0 0 6px;">
              <span style="font-size:10px;padding:1px 8px;border-radius:9999px;
                background:${color}22;color:${color};border:1px solid ${color}55;">${eraLabel}</span>
              ${years ? `<span style="font-size:10px;color:#9a8570;margin-inline-start:6px;">${years}</span>` : ''}
            </p>
            ${sage.location ? `<p style="font-size:11px;color:#7a6550;margin:0;">📍 ${sage.location}</p>` : ''}
            ${sage.spotify_url ? `<a href="${sage.spotify_url}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;padding:3px 10px;background:#1DB954;color:#fff;border-radius:12px;font-size:10px;font-weight:700;text-decoration:none;">🎵 ${tr(locale, 'האזן בספוטיפיי', 'Listen on Spotify', 'Слушать в Spotify')}</a>` : ''}
          </div>
        `
        marker.bindPopup(popupContent, { maxWidth: 220, className: '' })

        // Hover mini-card (masterplan §3: enhanced tooltips)
        marker.bindTooltip(
          `<div style="font-family:Heebo,sans-serif;text-align:${locale === 'he' ? 'right' : 'left'};" dir="${locale === 'he' ? 'rtl' : 'ltr'}">
            <span style="font-family:'Frank Ruhl Libre',serif;font-size:13px;font-weight:700;">${sage.label}</span>
            <span style="font-size:10px;color:${color};margin-inline-start:6px;">${eraLabel}</span>
            ${years ? `<div style="font-size:10px;opacity:0.7;">${years}</div>` : ''}
          </div>`,
          { direction: 'top', opacity: 0.95, offset: [0, -6], sticky: false },
        )

        marker.on('click', () => selectSage(sage))
        markerRefs.set(sage.id, marker)
      })

      // ── Marker clustering at low zoom (dense areas: Israel, Spain…) ──
      // Grid-based, dependency-free. Above CLUSTER_MAX_ZOOM the individual
      // markers return; a cluster bubble click zooms into that area.
      const CLUSTER_MAX_ZOOM = 5
      const clusterLayer = L.layerGroup().addTo(map)
      const sageById = new Map(sages.map(s => [s.id, s]))

      const renderClusters = () => {
        const z = map.getZoom()
        clusterLayer.clearLayers()
        if (z > CLUSTER_MAX_ZOOM) {
          if (!map.hasLayer(markersLayer)) map.addLayer(markersLayer)
          return
        }
        if (map.hasLayer(markersLayer)) map.removeLayer(markersLayer)

        const cell = 360 / Math.pow(2, z + 3)   // grid size in degrees, shrinks with zoom
        const buckets = new Map<string, { latSum: number; lngSum: number; ids: string[] }>()
        markerRefs.forEach((m, id) => {
          const ll = m.getLatLng()
          const key = `${Math.round(ll.lat / cell)}:${Math.round(ll.lng / cell)}`
          const b = buckets.get(key) ?? { latSum: 0, lngSum: 0, ids: [] }
          b.latSum += ll.lat; b.lngSum += ll.lng; b.ids.push(id)
          buckets.set(key, b)
        })

        buckets.forEach(b => {
          const lat = b.latSum / b.ids.length
          const lng = b.lngSum / b.ids.length

          if (b.ids.length === 1) {
            // Single sage — draw a regular dot
            const sage = sageById.get(b.ids[0])
            if (!sage) return
            const c = ERA_COLORS[sage.period] ?? '#7a6550'
            L.circleMarker([lat, lng], {
              radius: 7, fillColor: c, color: '#0a0806', weight: 1.5, fillOpacity: 0.85,
            })
              .on('click', () => selectSage(sage))
              .bindTooltip(sage.label, { direction: 'top', offset: [0, -6] })
              .addTo(clusterLayer)
            return
          }

          // Cluster bubble with count — click zooms in
          const size = Math.min(46, 26 + Math.sqrt(b.ids.length) * 3)
          L.marker([lat, lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;
                display:flex;align-items:center;justify-content:center;
                background:rgba(201,151,58,0.85);border:2px solid rgba(255,244,220,0.9);
                color:#1a140e;font-family:Heebo,sans-serif;font-weight:700;
                font-size:${b.ids.length > 99 ? 11 : 13}px;
                box-shadow:0 2px 10px rgba(0,0,0,0.45);cursor:pointer;">
                ${b.ids.length}</div>`,
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            }),
          })
            .on('click', () => map.setView([lat, lng], Math.min(CLUSTER_MAX_ZOOM + 2, z + 3)))
            .addTo(clusterLayer)
        })
      }

      map.on('zoomend', renderClusters)
      renderClusters()

      // ── Migration paths ──────────────────────────────────────
      sages.forEach(sage => {
        if (!sage.migration_path) return
        const path = sage.migration_path
        const stops = [path.from, ...(path.intermediate ?? []), path.to]

        const coordStops = stops
          .map(name => LOCATION_COORDS[name] ?? null)
          .filter(Boolean) as Array<{ lat: number; lng: number }>

        if (coordStops.length < 2) return

        const color = ERA_COLORS[sage.period] ?? '#7a6550'

        L.polyline(
          coordStops.map(c => [c.lat, c.lng] as [number, number]),
          { color, weight: 2, opacity: 0.5, dashArray: '6,4' }
        ).addTo(map)

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
          }).addTo(map)
        })
      })

      // ── Build coordsById for connection lines ────────────────
      const coordsById = new Map<string, { lat: number; lng: number }>()
      sages.forEach(sage => {
        const c = resolveCoords(sage)
        if (c) coordsById.set(sage.id, c)
      })

      // Store refs for later
      ;(map as any)._sageMarkers = markerRefs
      ;(map as any)._coordsById  = coordsById
      ;(map as any)._linkLayer   = null
      setMapReady(true)   // triggers the connection-lines layer
    })

    return () => {
      mounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length])

  // ── Connection lines layer toggle ───────────────────────────
  useEffect(() => {
    const map = mapObjRef.current as any
    if (!map) return

    // Remove existing link layer
    if (map._linkLayer) {
      map._linkLayer.remove()
      map._linkLayer = null
    }
    if (!showLinks || !map._coordsById) return

    import('leaflet').then(L => {
      const sageMap = new Map<string, Sage>(sages.map(s => [s.id, s]))
      const coordsById: Map<string, { lat: number; lng: number }> = map._coordsById
      const filteredIds = new Set(filteredSages.map(s => s.id))
      const noFilter = filteredIds.size === sages.length
      const group = L.layerGroup().addTo(map)
      map._linkLayer = group

      const drawn = new Set<string>()
      connections.forEach(conn => {
        const key = [conn.source, conn.target].sort().join('|')
        if (drawn.has(key)) return
        const a = coordsById.get(conn.source)
        const b = coordsById.get(conn.target)
        if (!a || !b) return
        // same-city pairs draw nothing meaningful on the map
        if (Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lng - b.lng) < 0.02) return
        drawn.add(key)

        const sourceS = sageMap.get(conn.source)
        const targetS = sageMap.get(conn.target)
        if (!sourceS || !targetS) return

        // Check if both sages are in filtered set (dim if not)
        const isFiltered = noFilter || (filteredIds.has(conn.source) && filteredIds.has(conn.target))
        const lineOpacity = isFiltered ? 0.4 : 0.08
        const arrowOpacity = isFiltered ? 0.85 : 0.15

        const color = CONNECTION_TYPE_COLORS[conn.type] ?? '#c9973a'

        // Draw line with click handler for details popup
        const linePopupContent = `
          <div style="font-family:Heebo,sans-serif;min-width:280px;max-height:300px;overflow-y:auto;">
            <p style="font-family:'Frank Ruhl Libre',serif;font-size:13px;font-weight:700;color:#e8d5b0;margin:0 0 10px;">קשר: ${conn.type}</p>
            <div style="padding:10px;background:rgba(201,151,58,0.15);border-radius:6px;margin-bottom:10px;">
              <p style="font-size:12px;color:#c4a87d;margin:0 0 5px;"><strong>מ:</strong> ${sourceS.label}</p>
              ${sourceS.location ? `<p style="font-size:11px;color:#9a8570;margin:0 0 2px;">📍 ${sourceS.location}</p>` : ''}
              ${sourceS.birth_year ? `<p style="font-size:11px;color:#7a6550;margin:0;">🎂 נ: ${sourceS.birth_year}</p>` : ''}
            </div>
            <div style="padding:10px;background:rgba(201,151,58,0.15);border-radius:6px;">
              <p style="font-size:12px;color:#c4a87d;margin:0 0 5px;"><strong>ל:</strong> ${targetS.label}</p>
              ${targetS.location ? `<p style="font-size:11px;color:#9a8570;margin:0 0 2px;">📍 ${targetS.location}</p>` : ''}
              ${targetS.birth_year ? `<p style="font-size:11px;color:#7a6550;margin:0;">🎂 נ: ${targetS.birth_year}</p>` : ''}
            </div>
          </div>
        `

        const line = L.polyline(
          [[a.lat, a.lng], [b.lat, b.lng]],
          {
            color, weight: 1.2, opacity: lineOpacity,
            dashArray: conn.type === 'influence' ? '6,4'
              : (conn.type === 'colleague' || conn.type === 'contemporary') ? '2,4' : undefined,
          }
        ).bindPopup(linePopupContent, { maxWidth: 320, className: 'connection-popup' })
         .addTo(group)

        line.on('click', () => line.openPopup())

        // Start marker (origin - square)
        L.marker([a.lat, a.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:8px;height:8px;background:${color};border:1.5px solid #0a0806;border-radius:1px;opacity:${isFiltered ? 0.8 : 0.2};box-shadow:0 0 3px ${color}88;"></div>`,
            iconSize: [8, 8],
            iconAnchor: [4, 4],
          }),
          interactive: false,
        }).addTo(group)

        // End marker (destination - circle)
        L.marker([b.lat, b.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:10px;height:10px;background:${color};border:1.5px solid #0a0806;border-radius:50%;opacity:${isFiltered ? 0.9 : 0.25};box-shadow:0 0 4px ${color}aa;"></div>`,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          }),
          interactive: false,
        }).addTo(group)

        // Middle arrow (direction indicator)
        const t = 0.58
        const pLat = a.lat + (b.lat - a.lat) * t
        const pLng = a.lng + (b.lng - a.lng) * t
        const dx = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
        const dy = b.lat - a.lat
        const angle = Math.atan2(-dy, dx) * 180 / Math.PI
        L.marker([pLat, pLng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="display:inline-block;transform:rotate(${angle}deg);color:${color};font-size:11px;opacity:${arrowOpacity};text-shadow:0 0 3px var(--ink-900);">➤</span>`,
            iconSize: [0, 0],
          }),
          interactive: false,
        }).addTo(group)
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLinks, connections.length, sages.length, mapReady, filteredSages])

  // ── Sync filter (dim non-matching markers) ───────────────────
  useEffect(() => {
    const map = mapObjRef.current as any
    if (!map?._sageMarkers) return
    const filteredIds = new Set(filteredSages.map(s => s.id))
    const noFilter    = filteredIds.size === sages.length

    map._sageMarkers.forEach((marker: import('leaflet').CircleMarker, id: string) => {
      marker.setStyle({
        fillOpacity: noFilter || filteredIds.has(id) ? 0.85 : 0.12,
        opacity:     noFilter || filteredIds.has(id) ? 1    : 0.2,
      })
    })
  }, [filteredSages, sages.length])

  // ── Pan to selected sage ─────────────────────────────────────
  // חשוב: רק כשהטאב גלוי. flyTo על מפה מוסתרת (גודל 0) זורק
  // "Invalid LatLng (NaN)" ומפיל את כל האפליקציה בעת לחיצה על חכם.
  useEffect(() => {
    if (activeTab !== 'map') return
    if (!selectedSageId || !mapObjRef.current) return
    const el = mapRef.current
    if (!el || el.clientWidth < 50 || el.clientHeight < 50) return
    const map = mapObjRef.current as any
    const marker = map._sageMarkers?.get(selectedSageId)
    if (!marker) return
    try {
      map.invalidateSize()
      const ll = marker.getLatLng()
      map.flyTo(ll, Math.max(map.getZoom(), 6), { duration: 1 })
      // Open after the fly ends — at low zoom the marker may still be
      // clustered until zoomend re-adds the individual markers layer
      setTimeout(() => { try { marker.openPopup() } catch { /* noop */ } }, 1100)
    } catch {
      /* hidden/zero-size map — safely ignore */
    }
  }, [selectedSageId, activeTab])

  // ── Swap tile style when the theme changes ───────────────────
  useEffect(() => {
    const map = mapObjRef.current as any
    if (!map?._tileLayer) return
    map._tileLayer.setUrl(
      `https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_nolabels' : 'dark_nolabels'}/{z}/{x}/{y}{r}.png`)
  }, [theme])

  // ── Invalidate map size when tab becomes visible ─────────────
  useEffect(() => {
    if (activeTab !== 'map') return
    const t = setTimeout(() => {
      try { mapObjRef.current?.invalidateSize() } catch { /* noop */ }
    }, 120)
    return () => clearTimeout(t)
  }, [activeTab])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Connection lines toggle */}
      <div className="absolute top-4 end-4 z-20">
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

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {tr(locale, 'טוען מפה...', 'Loading map...', 'Загрузка карты...')}
          </p>
        </div>
      )}

      {sages.length > 0 && filteredSages.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-5">
          <EmptyState
            locale={locale}
            icon="map"
            action={{
              label: tr(locale, 'איפוס פילטרים', 'Reset Filters', 'Сбросить фильтры'),
              onClick: () => useAppStore.getState().clearFilters(),
            }}
          />
        </div>
      )}
    </div>
  )
}

// Memoize to prevent re-renders when parent state changes
export const GeoMap = memo(GeoMapComponent)
