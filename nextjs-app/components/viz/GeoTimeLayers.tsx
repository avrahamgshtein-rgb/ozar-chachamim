'use client'

/**
 * Stage 4 — optional 3D categorical time-layer view for Geography.
 *
 * Horizontal axis: real geographic position (equirectangular, shared extent).
 * Vertical axis:   CATEGORICAL period layers, equally spaced by ordinal index.
 *                  This is explicitly NOT a proportional year axis, and the UI
 *                  says so on screen.
 *
 * Implementation note: this uses CSS 3D transforms over ordinary DOM/SVG rather
 * than WebGL. The view is a stack of flat plates, which CSS `preserve-3d`
 * expresses directly, and keeping real DOM nodes means keyboard focus, touch
 * targets, and text rendering all work without reimplementation.
 */

import { useMemo, useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { buildLayerModel, buildGraticule } from '@/lib/geoLayers'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import { tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Locale, Period } from '@/lib/types'
import type { PeriodLayer } from '@/lib/geoLayers'

/** Vertical gap between plates, in px of Z translation. */
const LAYER_GAP = 78
const PLATE_W = 560
const PLATE_H = 340

interface GeoTimeLayersProps {
  locale: Locale
  /** Rendered when the browser cannot do 3D transforms. */
  fallback?: React.ReactNode
}

/** True when the browser can actually composite a 3D layer stack. */
function supports3D(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return CSS.supports('transform-style', 'preserve-3d')
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function GeoTimeLayers({ locale, fallback = null }: GeoTimeLayersProps) {
  const { filteredSages, selectedSageId, selectSage, filters, togglePeriodFilter } = useAppStore()
  const reducedMotion = usePrefersReducedMotion()

  // Feature detection runs after mount so server and first client render agree.
  const [canRender3D, setCanRender3D] = useState<boolean | null>(null)
  useEffect(() => { setCanRender3D(supports3D()) }, [])

  const [tilt, setTilt] = useState(58)
  const [spin, setSpin] = useState(-24)

  // Built from filteredSages, so the 3D view describes exactly the records the
  // 2D map is showing under the same filters.
  const model = useMemo(() => buildLayerModel(filteredSages), [filteredSages])
  const graticule = useMemo(() => buildGraticule(model.extent, 10), [model.extent])

  const visibleLayers = useMemo(
    () => model.layers.filter(l => !l.empty),
    [model.layers],
  )

  if (canRender3D === null) return null
  if (canRender3D === false) return <>{fallback}</>

  const stackHeight = Math.max(visibleLayers.length - 1, 0) * LAYER_GAP

  return (
    <div className="absolute inset-0 overflow-auto bg-ink-900">
      {/* Axis disclosure — the vertical axis is categorical, and says so. */}
      <div className="absolute top-24 start-3 z-[1000] glass rounded-lg px-3 py-2 max-w-[15rem]">
        <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-gold-300 mb-1">
          {tr(locale, 'שכבות זמן', 'Time layers', 'Слои времени')}
        </p>
        <p className="text-[10px] font-sans text-ink-400 leading-relaxed">
          {tr(
            locale,
            'הציר האנכי מציג תקופות כקטגוריות במרווחים שווים — אינו ציר שנים פרופורציונלי.',
            'The vertical axis shows periods as equally spaced categories — not a proportional year axis.',
            'Вертикальная ось показывает периоды как равноотстоящие категории — это не пропорциональная шкала лет.',
          )}
        </p>
      </div>

      {/* View controls */}
      <div className="absolute top-40 end-3 z-[1000] glass rounded-lg px-3 py-2 flex flex-col gap-2">
        <label className="text-[10px] font-sans text-ink-400 flex items-center gap-2">
          <span className="w-10">{tr(locale, 'הטיה', 'Tilt', 'Наклон')}</span>
          <input
            type="range" min={20} max={80} value={tilt}
            onChange={e => setTilt(Number(e.target.value))}
            className="w-24 accent-gold-500"
            aria-label={tr(locale, 'הטיית התצוגה', 'View tilt', 'Наклон вида')}
          />
        </label>
        <label className="text-[10px] font-sans text-ink-400 flex items-center gap-2">
          <span className="w-10">{tr(locale, 'סיבוב', 'Rotate', 'Поворот')}</span>
          <input
            type="range" min={-60} max={60} value={spin}
            onChange={e => setSpin(Number(e.target.value))}
            className="w-24 accent-gold-500"
            aria-label={tr(locale, 'סיבוב התצוגה', 'View rotation', 'Поворот вида')}
          />
        </label>
      </div>

      {/* Records we cannot place or date — surfaced, never silently dropped. */}
      {(model.totalUnplaceable > 0 || model.undated.length > 0) && (
        <div className="absolute bottom-3 start-3 z-[1000] glass rounded-lg px-3 py-2 max-w-[17rem]">
          <p className="text-[10px] font-sans text-ink-400 leading-relaxed">
            {model.totalUnplaceable > 0 && (
              <span className="block">
                ◇ {model.totalUnplaceable}{' '}
                {tr(locale, 'ללא מיקום מזוהה — לא מוצגים על המפה',
                    'without a resolved location — not placed on any layer',
                    'без определённого места — не размещены на слоях')}
              </span>
            )}
            {model.undated.length > 0 && (
              <span className="block">
                ◇ {model.undated.length}{' '}
                {tr(locale, 'ללא תקופה — לא שויכו לשכבה',
                    'without a period — not assigned to a layer',
                    'без периода — не отнесены к слою')}
              </span>
            )}
          </p>
        </div>
      )}

      {visibleLayers.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs font-sans text-ink-500">
            {tr(locale, 'אין רשומות לתצוגה בסינון הנוכחי',
                'No records match the current filters',
                'Нет записей по текущим фильтрам')}
          </p>
        </div>
      ) : (
        <div
          className="min-h-full flex items-center justify-center"
          style={{ padding: `${140 + stackHeight / 2}px 40px` }}
        >
          <div
            style={{
              perspective: '1600px',
              width: PLATE_W,
              height: PLATE_H,
              transformStyle: 'preserve-3d',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${tilt}deg) rotateZ(${spin}deg)`,
                transition: reducedMotion ? 'none' : 'transform 260ms ease-out',
              }}
            >
              {visibleLayers.map((layer, i) => (
                <LayerPlate
                  key={layer.period}
                  layer={layer}
                  z={i * LAYER_GAP}
                  tilt={tilt}
                  spin={spin}
                  locale={locale}
                  graticule={graticule}
                  selectedSageId={selectedSageId}
                  isFiltered={filters.period === null || filters.period.includes(layer.period)}
                  reducedMotion={reducedMotion}
                  onSelectSage={selectSage}
                  onTogglePeriod={togglePeriodFilter}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface LayerPlateProps {
  layer: PeriodLayer
  z: number
  tilt: number
  spin: number
  locale: Locale
  graticule: { verticals: number[]; horizontals: number[] }
  selectedSageId: string | null
  isFiltered: boolean
  reducedMotion: boolean
  onSelectSage: (sage: any) => void
  onTogglePeriod: (period: Period) => void
}

function LayerPlate({
  layer, z, tilt, spin, locale, graticule,
  selectedSageId, isFiltered, reducedMotion, onSelectSage, onTogglePeriod,
}: LayerPlateProps) {
  const color = ERA_COLORS[layer.period]
  const label = ERA_LABELS[layer.period]?.[locale] ?? layer.period

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${z}px)`,
        opacity: isFiltered ? 1 : 0.25,
        transition: reducedMotion ? 'none' : 'opacity 200ms ease-out',
      }}
    >
      {/* Plate surface + graticule. Generated geometry, not licensed basemap imagery. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden
      >
        <rect x={0} y={0} width={100} height={100} fill={color} fillOpacity={0.05} />
        <rect x={0} y={0} width={100} height={100} fill="none" stroke={color} strokeOpacity={0.5} strokeWidth={0.4} />
        {graticule.verticals.map((x, i) => (
          <line key={`v${i}`} x1={x * 100} y1={0} x2={x * 100} y2={100}
            stroke={color} strokeOpacity={0.14} strokeWidth={0.25} />
        ))}
        {graticule.horizontals.map((y, i) => (
          <line key={`h${i}`} x1={0} y1={y * 100} x2={100} y2={y * 100}
            stroke={color} strokeOpacity={0.14} strokeWidth={0.25} />
        ))}
      </svg>

      {/* Period label, counter-rotated so it stays readable at any view angle. */}
      <button
        onClick={() => onTogglePeriod(layer.period)}
        className="absolute whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-sans font-bold
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        style={{
          left: -12,
          top: '50%',
          transform: `translate(-100%, -50%) rotateZ(${-spin}deg) rotateX(${-tilt}deg)`,
          transformOrigin: 'right center',
          color,
          background: 'rgba(10,10,12,0.72)',
          border: `1px solid ${color}66`,
        }}
        title={tr(locale, 'סנן לפי תקופה זו', 'Filter by this period', 'Фильтровать по периоду')}
      >
        {label}
        <span className="text-ink-500 font-normal"> · {layer.placed.length}</span>
        {layer.unplaceable.length > 0 && (
          <span className="text-ink-600 font-normal"> (+{layer.unplaceable.length} ◇)</span>
        )}
      </button>

      {/* Sage markers — real buttons, so keyboard and touch work without extra machinery. */}
      {layer.placed.map(p => {
        const isSelected = p.sage.id === selectedSageId
        return (
          <button
            key={p.sage.id}
            onClick={() => onSelectSage(p.sage)}
            className="absolute rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: isSelected ? 13 : 9,
              height: isSelected ? 13 : 9,
              marginLeft: isSelected ? -6.5 : -4.5,
              marginTop: isSelected ? -6.5 : -4.5,
              background: color,
              border: isSelected ? '2px solid var(--gold-300, #e8c96a)' : '1px solid rgba(0,0,0,0.45)',
              boxShadow: isSelected ? '0 0 10px 2px rgba(232,201,106,0.55)' : 'none',
              transition: reducedMotion ? 'none' : 'width 120ms, height 120ms',
            }}
            title={`${p.sage.label} · ${p.sage.location ?? ''}`}
            aria-label={`${p.sage.label}, ${ERA_LABELS[layer.period]?.[locale] ?? layer.period}`}
          />
        )
      })}
    </div>
  )
}
