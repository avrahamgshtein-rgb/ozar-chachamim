'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { Connection, Locale, Sage } from '@/lib/types'
import { buildJourney, JOURNEY_END, JOURNEY_START, type JourneyCentre } from '@/lib/journey'
import { useJourneyStore } from '@/lib/journeyStore'
import { withJourneyURLState } from '@/lib/urlState'
import { useAppStore } from '@/store/useAppStore'
import { JourneyLayer, REDUCED_STEP_YEARS, type JourneyFramePadding } from './JourneyLayer'
import { JourneyHud } from './JourneyHud'
import { JourneyPanel } from './JourneyPanel'
import { JourneyControls, KEY_BIG_STEP, KEY_STEP } from './JourneyControls'

/**
 * מסע התורה: the geography tab's time-travel mode. Mounted by GeoMap only
 * while the mode is on, so the plain map pays nothing for it. GeoMap hides its
 * own markers, clusters and lines meanwhile; this draws everything else.
 */
export function JourneyMode({ L, map, locale, sages, filteredSages, connections, visible }: {
  L: typeof import('leaflet')
  map: LeafletMap
  locale: Locale
  sages: Sage[]
  filteredSages: Sage[]
  connections: Connection[]
  /** The map tab is on screen. */
  visible: boolean
}) {
  const theme = useAppStore(s => s.theme)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const compact = useMediaQuery('(max-width: 767px)')

  // What you filter is what travels: the journey reads the filtered set, as
  // every other view does. Presence weights take their typical lifespan from
  // the whole corpus, so a filter never changes how much one sage weighs.
  const model = useMemo(
    () => buildJourney(filteredSages, connections, sages),
    [filteredSages, connections, sages],
  )

  // Room the overlays take, so the camera frames the action in what is left.
  const padding: JourneyFramePadding = useMemo(() => {
    const side = compact ? 0 : 290
    const top = compact ? 125 : 150
    const bottom = compact ? 330 : 230
    const rtl = locale === 'he'
    // The side list sits on the reading-start edge: right in Hebrew.
    return { topLeft: [rtl ? 20 : side, top], bottomRight: [rtl ? side : 20, bottom] }
  }, [compact, locale])

  const focusCentre = (c: JourneyCentre) => {
    if (useJourneyStore.getState().follow) useJourneyStore.getState().setFollow(false)
    const size = map.getSize()
    if (size.x < 50) return
    map.panTo([c.pos.lat, c.pos.lng], { animate: !reducedMotion, duration: 0.8 })
  }

  // Reduced motion: the slider moves in steps, so the year sits on a step.
  useEffect(() => {
    if (!reducedMotion) return
    const s = useJourneyStore.getState()
    s.setYear(Math.round(s.year / REDUCED_STEP_YEARS) * REDUCED_STEP_YEARS)
    s.setFollow(false)
  }, [reducedMotion])

  useJourneyURLSync()
  useJourneyKeys(visible, reducedMotion)
  useJourneyStyles()

  return (
    <>
      <JourneyLayer
        L={L}
        map={map}
        model={model}
        locale={locale}
        theme={theme}
        reducedMotion={reducedMotion}
        compact={compact}
        visible={visible}
        padding={padding}
      />
      <JourneyHud locale={locale} compact={compact} />
      <JourneyPanel
        locale={locale}
        compact={compact}
        filtered={filteredSages.length < sages.length}
        onFocusCentre={focusCentre}
      />
      <JourneyControls locale={locale} compact={compact} reducedMotion={reducedMotion} />
    </>
  )
}

function useMediaQuery(q: string): boolean {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const onChange = () => setOn(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [q])
  return on
}

/**
 * ?journey=1&year=… follows the mode. The year is written only once playback
 * stops or a scrub settles, never per frame. AppShell's own URL writer keeps
 * params it does not own, so the two never undo each other.
 */
function useJourneyURLSync() {
  useEffect(() => {
    let timer = 0
    const write = () => {
      const s = useJourneyStore.getState()
      const next = withJourneyURLState(window.location.href, { journey: s.on, year: Math.round(s.year) })
      if (next !== window.location.href) window.history.replaceState(window.history.state, '', next)
    }
    write()
    const unsub = useJourneyStore.subscribe((s, prev) => {
      if (s.playing) return
      if (s.year === prev.year && s.playing === prev.playing) return
      window.clearTimeout(timer)
      timer = window.setTimeout(write, 300)
    })
    return () => {
      unsub()
      window.clearTimeout(timer)
      // Leaving the mode drops the params.
      if (!useJourneyStore.getState().on) {
        window.history.replaceState(window.history.state, '', withJourneyURLState(window.location.href, { journey: false, year: null }))
      }
    }
  }, [])
}

/** Space plays and pauses; arrows step (Shift for bigger steps); Home/End jump. */
function useJourneyKeys(visible: boolean, reducedMotion: boolean) {
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (el?.isContentEditable || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (tag === 'INPUT' && !(el as HTMLInputElement).classList.contains('journey-range')) return
      // A button or link handles its own Space/Enter.
      if ((tag === 'BUTTON' || tag === 'A') && (e.key === ' ' || e.key === 'Enter')) return
      const app = useAppStore.getState()
      if (app.isFiltersOpen || app.isComparatorOpen || app.isSearchOpen) return
      const s = useJourneyStore.getState()
      const step = e.shiftKey ? KEY_BIG_STEP : reducedMotion ? REDUCED_STEP_YEARS : KEY_STEP
      const to = (y: number) => {
        e.preventDefault()
        s.setPlaying(false)
        s.setYear(reducedMotion ? Math.round(y / REDUCED_STEP_YEARS) * REDUCED_STEP_YEARS : Math.round(y))
      }
      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault()
          if (!s.playing && s.year >= JOURNEY_END) s.setYear(JOURNEY_START)
          s.setPlaying(!s.playing)
          break
        // Time runs left to right on the slider in every locale.
        case 'ArrowRight': to(s.year + step); break
        case 'ArrowLeft': to(s.year - step); break
        case 'Home': to(JOURNEY_START); break
        case 'End': to(JOURNEY_END); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, reducedMotion])
}

/** Range-thumb and halo styles: pseudo-elements need a stylesheet. Injected once. */
function useJourneyStyles() {
  useEffect(() => {
    if (document.getElementById('journey-style')) return
    const style = document.createElement('style')
    style.id = 'journey-style'
    style.textContent = `
      .journey-range { -webkit-appearance: none; appearance: none; background: transparent; margin: 0; }
      .journey-range:focus { outline: none; }
      .journey-range::-webkit-slider-runnable-track { height: 28px; background: transparent; }
      .journey-range::-moz-range-track { height: 28px; background: transparent; }
      .journey-range::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none; width: 18px; height: 18px; margin-top: 5px;
        border-radius: 9999px; background: rgb(var(--gold-300-rgb));
        border: 3px solid rgb(var(--ink-900-rgb));
        box-shadow: 0 0 0 1.5px rgb(var(--gold-400-rgb)), 0 0 14px rgb(var(--gold-400-rgb) / 0.75);
      }
      .journey-range::-moz-range-thumb {
        width: 12px; height: 12px; border-radius: 9999px; background: rgb(var(--gold-300-rgb));
        border: 3px solid rgb(var(--ink-900-rgb));
        box-shadow: 0 0 0 1.5px rgb(var(--gold-400-rgb)), 0 0 14px rgb(var(--gold-400-rgb) / 0.75);
      }
      .journey-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 2px rgb(var(--ink-900-rgb)), 0 0 0 4px rgb(var(--gold-300-rgb)); }
      .journey-range:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 2px rgb(var(--ink-900-rgb)), 0 0 0 4px rgb(var(--gold-300-rgb)); }
      .journey-year { text-shadow: 0 0 18px rgb(var(--gold-400-rgb) / 0.45), 0 2px 10px rgb(var(--ink-900-rgb)), 0 0 3px rgb(var(--ink-900-rgb)); }
      .journey-halo { text-shadow: 0 0 4px rgb(var(--ink-900-rgb)), 0 0 8px rgb(var(--ink-900-rgb)); }
    `
    document.head.appendChild(style)
  }, [])
}
