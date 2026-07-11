'use client'

// Sage Dossier mini-map — small static Leaflet snippet showing the sage's
// primary location + migration stops. Non-interactive by design (the full
// Geography tab is one click away via the cross-view button).
import { useEffect, useRef } from 'react'
import type { Sage, Locale } from '@/lib/types'
import { ERA_COLORS } from '@/lib/types'
import { resolveCoords, coordsForName } from '@/lib/locationCoords'

interface SageMiniMapProps {
  sage: Sage
  locale: Locale
}

export function SageMiniMap({ sage, locale }: SageMiniMapProps) {
  const holderRef = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<import('leaflet').Map | null>(null)

  const primary = resolveCoords(sage)

  useEffect(() => {
    if (!primary || !holderRef.current) return
    let mounted = true

    // Leaflet CSS (once per page)
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link')
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then(L => {
      if (!mounted || !holderRef.current || mapRef.current) return

      const isLight = document.documentElement.dataset.theme === 'light'
      const map = L.map(holderRef.current, {
        center: [primary.lat, primary.lng],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      })
      mapRef.current = map

      L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/${isLight ? 'light_nolabels' : 'dark_nolabels'}/{z}/{x}/{y}{r}.png`,
        { maxZoom: 18 },
      ).addTo(map)

      const accent = ERA_COLORS[sage.period] ?? '#c9973a'

      // Migration stops (from → intermediate → to), resolved to coords
      const stops: Array<{ lat: number; lng: number }> = []
      if (sage.migration_path) {
        const names = [
          sage.migration_path.from,
          ...(sage.migration_path.intermediate ?? []),
          sage.migration_path.to,
        ]
        for (const name of names) {
          const c = coordsForName(name)
          if (c) stops.push(c)
        }
      }

      if (stops.length >= 2) {
        L.polyline(stops.map(s => [s.lat, s.lng]), {
          color: accent,
          weight: 2,
          opacity: 0.7,
          dashArray: '6 4',
        }).addTo(map)
        stops.forEach((s, i) => {
          L.circleMarker([s.lat, s.lng], {
            radius: i === 0 || i === stops.length - 1 ? 5 : 3.5,
            color: accent,
            fillColor: accent,
            fillOpacity: 0.85,
            weight: 1,
          }).addTo(map)
        })
        map.fitBounds(L.latLngBounds(stops.map(s => [s.lat, s.lng] as [number, number])), {
          padding: [24, 24],
          maxZoom: 6,
        })
      } else {
        L.circleMarker([primary.lat, primary.lng], {
          radius: 7,
          color: accent,
          fillColor: accent,
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map)
      }
    })

    return () => {
      mounted = false
      mapRef.current?.remove()
      mapRef.current = null
    }
    // Re-init per sage — coords derive from sage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sage.id])

  if (!primary) return null

  return (
    <div
      ref={holderRef}
      className="w-full h-36 rounded-xl overflow-hidden border border-ink-700/40"
      role="img"
      aria-label={
        locale === 'he'
          ? `מפה: ${sage.location ?? ''}`
          : `Map: ${sage.location ?? ''}`
      }
    />
  )
}
