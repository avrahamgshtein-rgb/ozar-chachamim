'use client'

import { useEffect, useRef } from 'react'
import { ERA_COLORS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import type { Locale, Sage } from '@/lib/types'
import { cn } from '@/lib/utils'

// Hebrew/English → {lat, lng} — ported from original map.js (130+ locations)
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  // ── ארץ ישראל ─────────────────────────────────────────────────────────
  'ירושלים':    { lat: 31.768,  lng: 35.214  },
  'Jerusalem':  { lat: 31.768,  lng: 35.214  },
  'ארץ ישראל': { lat: 31.95,   lng: 35.23   },
  'ישראל':      { lat: 31.95,   lng: 35.23   },
  'Israel':     { lat: 31.95,   lng: 35.23   },
  'יהודה':      { lat: 31.93,   lng: 35.2    },
  'טבריה':      { lat: 32.789,  lng: 35.535  },
  'Tiberias':   { lat: 32.789,  lng: 35.535  },
  'צפת':        { lat: 32.968,  lng: 35.497  },
  'Safed':      { lat: 32.968,  lng: 35.497  },
  'עכו':        { lat: 32.923,  lng: 35.087  },
  'Acre':       { lat: 32.923,  lng: 35.087  },
  'חברון':      { lat: 31.539,  lng: 35.207  },
  'Hebron':     { lat: 31.539,  lng: 35.207  },
  'יבנה':       { lat: 31.877,  lng: 34.751  },
  'קיסריה':     { lat: 32.879,  lng: 35.086  },
  'לוד':        { lat: 31.948,  lng: 35.144  },
  'יריחו':      { lat: 31.861,  lng: 35.447  },
  'בני ברק':    { lat: 32.097,  lng: 34.821  },
  'Bnei Brak':  { lat: 32.097,  lng: 34.821  },
  'חיפה':       { lat: 32.819,  lng: 34.989  },
  'תל אביב':    { lat: 32.085,  lng: 34.782  },
  'צפון':       { lat: 33.0,    lng: 35.5    },
  'דרום':       { lat: 31.0,    lng: 34.8    },

  // ── בבל / עיראק / פרס ──────────────────────────────────────────────────
  'בבל':        { lat: 33.313,  lng: 44.361  },
  'Babylon':    { lat: 33.313,  lng: 44.361  },
  'בגדד':       { lat: 33.313,  lng: 44.361  },
  'בגדאד':      { lat: 33.313,  lng: 44.361  },
  'Baghdad':    { lat: 33.313,  lng: 44.361  },
  'פומבדיתא':   { lat: 32.6,    lng: 43.8    },
  'Pumbedita':  { lat: 32.6,    lng: 43.8    },
  'סורא':       { lat: 32.5,    lng: 44.0    },
  'Sura':       { lat: 32.5,    lng: 44.0    },
  'שושן':       { lat: 32.167,  lng: 48.267  },
  'פרס':        { lat: 32.427,  lng: 53.688  },
  'Persia':     { lat: 32.427,  lng: 53.688  },
  'חלב':        { lat: 36.202,  lng: 37.167  },
  'Aleppo':     { lat: 36.202,  lng: 37.167  },

  // ── מצרים ──────────────────────────────────────────────────────────────
  'מצרים':      { lat: 30.044,  lng: 31.234  },
  'Egypt':      { lat: 30.044,  lng: 31.234  },
  'קהיר':       { lat: 30.044,  lng: 31.234  },
  'Cairo':      { lat: 30.044,  lng: 31.234  },
  'אלכסנדריה': { lat: 31.203,  lng: 29.917  },
  'Alexandria': { lat: 31.203,  lng: 29.917  },

  // ── צפון אפריקה ────────────────────────────────────────────────────────
  'צפון אפריקה': { lat: 33.0,   lng: 2.0    },
  'קירואן':     { lat: 35.671,  lng: 9.513   },
  'Kairouan':   { lat: 35.671,  lng: 9.513   },
  'טוניס':      { lat: 36.807,  lng: 10.182  },
  'Tunis':      { lat: 36.807,  lng: 10.182  },
  'תוניסיה':    { lat: 33.89,   lng: 9.54    },
  'פאס':        { lat: 33.972,  lng: -5.004  },
  'Fez':        { lat: 33.972,  lng: -5.004  },
  'פס':         { lat: 33.972,  lng: -5.004  },
  'מרוקו':      { lat: 31.791,  lng: -4.002  },
  'Morocco':    { lat: 31.791,  lng: -4.002  },
  'מקנס':       { lat: 33.887,  lng: -5.555  },
  "אלג'יריה":   { lat: 36.737,  lng: 3.087   },
  "אלג'יר":     { lat: 36.737,  lng: 3.087   },
  'Algeria':    { lat: 36.737,  lng: 3.087   },
  'טריפולי':    { lat: 32.89,   lng: 13.19   },
  'Tripoli':    { lat: 32.89,   lng: 13.19   },

  // ── ספרד / פורטוגל ─────────────────────────────────────────────────────
  'ספרד':        { lat: 40.463,  lng: -3.750  },
  'Spain':       { lat: 40.463,  lng: -3.750  },
  'ספרד המוסלמית': { lat: 37.5, lng: -2.5    },
  'קורדובה':     { lat: 37.891,  lng: -4.779  },
  'קורדובא':     { lat: 37.891,  lng: -4.779  },
  'Cordoba':     { lat: 37.891,  lng: -4.779  },
  'טולדו':       { lat: 39.858,  lng: -4.020  },
  'Toledo':      { lat: 39.858,  lng: -4.020  },
  'ברצלונה':     { lat: 41.385,  lng: 2.173   },
  'Barcelona':   { lat: 41.385,  lng: 2.173   },
  'גירונה':      { lat: 41.985,  lng: 2.826   },
  'Girona':      { lat: 41.985,  lng: 2.826   },
  'סרגוסה':      { lat: 41.649,  lng: -0.889  },
  'קאסטיליה':    { lat: 40.5,    lng: -3.7    },
  'אראגון':      { lat: 41.5,    lng: -0.5    },
  'קטלוניה':     { lat: 41.6,    lng: 1.5     },
  'פורטוגל':     { lat: 39.400,  lng: -8.224  },
  'ליסבון':      { lat: 38.722,  lng: -9.139  },
  'Lisbon':      { lat: 38.722,  lng: -9.139  },

  // ── צרפת / פרובנס ──────────────────────────────────────────────────────
  'צרפת':        { lat: 46.227,  lng: 2.213   },
  'France':      { lat: 46.227,  lng: 2.213   },
  'פריז':        { lat: 48.857,  lng: 2.352   },
  'Paris':       { lat: 48.857,  lng: 2.352   },
  'פרובנס':      { lat: 43.9,    lng: 5.7     },
  'פרובאנס':     { lat: 43.83,   lng: 5.78    },
  'Provence':    { lat: 43.9,    lng: 5.7     },
  'נרבון':       { lat: 43.187,  lng: 3.002   },
  'נרבונה':      { lat: 43.187,  lng: 3.002   },
  'Narbonne':    { lat: 43.187,  lng: 3.002   },
  'מונטפלייר':   { lat: 43.611,  lng: 3.877   },
  'Montpellier': { lat: 43.611,  lng: 3.877   },
  'לוניל':       { lat: 43.624,  lng: 4.131   },
  'Lunel':       { lat: 43.624,  lng: 4.131   },
  'אורליאן':     { lat: 47.903,  lng: 1.905   },
  'מץ':          { lat: 49.119,  lng: 6.176   },
  'טרואה':       { lat: 48.297,  lng: 4.071   },
  'Troyes':      { lat: 48.297,  lng: 4.071   },
  'דמפייר':      { lat: 43.3,    lng: -0.2    },

  // ── גרמניה / אשכנז ─────────────────────────────────────────────────────
  'גרמניה':      { lat: 51.166,  lng: 10.452  },
  'Germany':     { lat: 51.166,  lng: 10.452  },
  'אשכנז':       { lat: 50.0,    lng: 10.0    },
  'Ashkenaz':    { lat: 50.0,    lng: 10.0    },
  'מגנצא':       { lat: 49.993,  lng: 8.247   },
  'Mainz':       { lat: 49.993,  lng: 8.247   },
  'וורמייזא':    { lat: 49.634,  lng: 8.357   },
  'Worms':       { lat: 49.634,  lng: 8.357   },
  'שפיירא':      { lat: 49.320,  lng: 8.443   },
  'Speyer':      { lat: 49.320,  lng: 8.443   },
  'רגנסבורג':    { lat: 48.961,  lng: 12.102  },
  'Regensburg':  { lat: 48.961,  lng: 12.102  },

  // ── בוהמיה / אוסטריה / הונגריה ─────────────────────────────────────────
  'פראג':        { lat: 50.076,  lng: 14.438  },
  'Prague':      { lat: 50.076,  lng: 14.438  },
  'בוהמיה':      { lat: 49.5,    lng: 15.5    },
  'אוסטריה':     { lat: 47.516,  lng: 14.550  },
  'Austria':     { lat: 47.516,  lng: 14.550  },
  'וינה':        { lat: 48.208,  lng: 16.374  },
  'Vienna':      { lat: 48.208,  lng: 16.374  },
  'פרשבורג':     { lat: 48.150,  lng: 17.110  },
  'Bratislava':  { lat: 48.150,  lng: 17.110  },

  // ── פולין / ליטא / גליציה ──────────────────────────────────────────────
  'פולין':       { lat: 51.919,  lng: 19.145  },
  'Poland':      { lat: 51.919,  lng: 19.145  },
  'וילנה':       { lat: 54.687,  lng: 25.280  },
  'Vilna':       { lat: 54.687,  lng: 25.280  },
  'Vilnius':     { lat: 54.687,  lng: 25.280  },
  'ליטא':        { lat: 55.169,  lng: 23.881  },
  'Lithuania':   { lat: 55.169,  lng: 23.881  },
  'לובלין':      { lat: 51.247,  lng: 22.568  },
  'Lublin':      { lat: 51.247,  lng: 22.568  },
  'ראדין':       { lat: 51.8,    lng: 22.0    },
  'גליציה':      { lat: 49.5,    lng: 23.0    },
  'Galicia':     { lat: 49.5,    lng: 23.0    },
  "וולוז'ין":    { lat: 54.8,    lng: 24.2    },
  'Volozhin':    { lat: 54.8,    lng: 24.2    },
  'Volozhyn':    { lat: 54.8,    lng: 24.2    },
  'נובהרדוק':    { lat: 53.6,    lng: 25.83   },
  'פוזנא':       { lat: 52.41,   lng: 16.93   },
  'קרקוב':       { lat: 50.062,  lng: 19.937  },
  'Krakow':      { lat: 50.062,  lng: 19.937  },
  'גור':         { lat: 52.05,   lng: 21.0    },

  // ── רוסיה / אוקראינה ───────────────────────────────────────────────────
  'רוסיה':       { lat: 55.751,  lng: 37.617  },
  'Russia':      { lat: 55.751,  lng: 37.617  },
  'מוסקבה':      { lat: 55.755,  lng: 37.617  },
  'Moscow':      { lat: 55.755,  lng: 37.617  },
  'אוקראינה':    { lat: 48.38,   lng: 31.165  },
  'Ukraine':     { lat: 48.38,   lng: 31.165  },

  // ── טורקיה / בלקן ─────────────────────────────────────────────────────
  'טורקיה':      { lat: 38.964,  lng: 35.243  },
  'Turkey':      { lat: 38.964,  lng: 35.243  },
  'קושטא':       { lat: 41.008,  lng: 28.978  },
  'Constantinople': { lat: 41.008, lng: 28.978 },
  'Istanbul':    { lat: 41.008,  lng: 28.978  },
  'סלוניקי':     { lat: 40.635,  lng: 22.938  },
  'Salonika':    { lat: 40.635,  lng: 22.938  },
  'Thessaloniki':{ lat: 40.635,  lng: 22.938  },
  'איזמיר':      { lat: 38.424,  lng: 27.143  },
  'Izmir':       { lat: 38.424,  lng: 27.143  },
  'הבלקן':       { lat: 43.0,    lng: 20.0    },
  'סרביה':       { lat: 44.017,  lng: 21.006  },

  // ── איטליה ─────────────────────────────────────────────────────────────
  'איטליה':      { lat: 41.872,  lng: 12.567  },
  'Italy':       { lat: 41.872,  lng: 12.567  },
  'רומא':        { lat: 41.903,  lng: 12.496  },
  'Rome':        { lat: 41.903,  lng: 12.496  },
  'ונציה':       { lat: 45.441,  lng: 12.316  },
  'Venice':      { lat: 45.441,  lng: 12.316  },
  'פדובה':       { lat: 45.406,  lng: 11.877  },
  'Padua':       { lat: 45.406,  lng: 11.877  },
  'ליבורנו':     { lat: 43.552,  lng: 10.307  },
  'Livorno':     { lat: 43.552,  lng: 10.307  },

  // ── יוון ───────────────────────────────────────────────────────────────
  'יוון':        { lat: 37.774,  lng: 25.131  },
  'Greece':      { lat: 37.774,  lng: 25.131  },
  'אתונה':       { lat: 37.974,  lng: 23.738  },
  'Athens':      { lat: 37.974,  lng: 23.738  },

  // ── מזרח אחר ───────────────────────────────────────────────────────────
  'תימן':        { lat: 15.369,  lng: 48.517  },
  'Yemen':       { lat: 15.369,  lng: 48.517  },
  'הודו':        { lat: 20.594,  lng: 78.963  },
  'India':       { lat: 20.594,  lng: 78.963  },

  // ── כללי / מודרני ───────────────────────────────────────────────────────
  'ארה"ב':       { lat: 37.09,   lng: -95.71  },
  'USA':         { lat: 37.09,   lng: -95.71  },
  'אירופה':      { lat: 50.0,    lng: 10.0    },
  'Europe':      { lat: 50.0,    lng: 10.0    },
  "האימפריה העות'מאנית": { lat: 39.0, lng: 35.0 },
}

function resolveCoords(sage: Sage): { lat: number; lng: number } | null {
  if (sage.coordinates) return sage.coordinates
  if (!sage.location) return null
  // Try exact match first, then substring
  if (LOCATION_COORDS[sage.location]) return LOCATION_COORDS[sage.location]
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (sage.location.includes(key)) return coords
  }
  return null
}

interface GeoMapProps {
  locale: Locale
}

export function GeoMap({ locale }: GeoMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapObjRef  = useRef<import('leaflet').Map | null>(null)

  const { sages, filteredSages, selectedSageId, selectSage } = useAppStore()

  useEffect(() => {
    if (!mapRef.current || !sages.length) return
    if (mapObjRef.current) return   // already initialized

    let mounted = true

    // Inject Leaflet CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

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

      // Dark CartoDB tiles
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 18,
        }
      ).addTo(map)

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
      `
      document.head.appendChild(style)

      // ── Markers ──────────────────────────────────────────────
      const markerRefs = new Map<string, import('leaflet').CircleMarker>()

      sages.forEach(sage => {
        const coords = resolveCoords(sage)
        if (!coords) return

        const color = ERA_COLORS[sage.period] ?? '#7a6550'

        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius:      7,
          fillColor:   color,
          color:       '#0a0806',
          weight:      1.5,
          opacity:     1,
          fillOpacity: 0.85,
        }).addTo(map)

        const popupContent = `
          <div style="font-family:Heebo,sans-serif;min-width:160px;">
            <p style="font-family:'Frank Ruhl Libre',serif;font-size:15px;font-weight:700;
               color:#e8d5b0;margin:0 0 4px;">${sage.label}</p>
            ${sage.name_en ? `<p style="font-size:11px;color:#9a8570;margin:0 0 6px;">${sage.name_en}</p>` : ''}
            ${sage.location ? `<p style="font-size:11px;color:#7a6550;margin:0;">📍 ${sage.location}</p>` : ''}
          </div>
        `
        marker.bindPopup(popupContent, { maxWidth: 220, className: '' })

        marker.on('click', () => selectSage(sage))
        markerRefs.set(sage.id, marker)
      })

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

        // Arrowhead at each segment midpoint
        coordStops.forEach((_, i) => {
          if (i === 0) return
          const prev = coordStops[i - 1]
          const curr = coordStops[i]
          const mid = { lat: (prev.lat + curr.lat) / 2, lng: (prev.lng + curr.lng) / 2 }
          L.circleMarker([mid.lat, mid.lng], {
            radius: 3, fillColor: color, color: 'transparent', fillOpacity: 0.7,
          }).addTo(map)
        })
      })

      // ── Store markerRefs on map for filter updates ───────────
      ;(map as any)._sageMarkers = markerRefs
    })

    return () => {
      mounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length])

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
  useEffect(() => {
    if (!selectedSageId || !mapObjRef.current) return
    const map = mapObjRef.current as any
    const marker = map._sageMarkers?.get(selectedSageId)
    if (marker) {
      const ll = marker.getLatLng()
      mapObjRef.current.flyTo(ll, Math.max(mapObjRef.current.getZoom(), 6), {
        duration: 1,
      })
      marker.openPopup()
    }
  }, [selectedSageId])

  // ── Invalidate map size when tab becomes visible ─────────────
  useEffect(() => {
    const t = setTimeout(() => mapObjRef.current?.invalidateSize(), 100)
    return () => clearTimeout(t)
  })

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0" />

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {locale === 'he' ? 'טוען מפה...' : 'Loading map...'}
          </p>
        </div>
      )}
    </div>
  )
}
