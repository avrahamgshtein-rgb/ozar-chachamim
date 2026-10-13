'use client'

// The journey passport: which stations a child has finished, kept in this browser only. Any component can
// read it (useJourneyProgress) and every change reaches all of them at once.
import { useMemo, useSyncExternalStore } from 'react'
import type { RouteKey } from './kidsJourney'

const KEY = 'ozar-journey'
const EVENT = 'ozar-journey-change'

export type JourneyProgress = Record<RouteKey, number[]>
const EMPTY: JourneyProgress = { saltiel: [], shira: [] }

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function parseProgress(raw: string): JourneyProgress {
  try {
    const p = JSON.parse(raw || '{}')
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n)) : [])
    return { saltiel: list(p.saltiel), shira: list(p.shira) }
  } catch {
    return EMPTY
  }
}

/** Whether the station is stamped in this browser's passport. */
export function isStationDone(route: RouteKey, n: number): boolean {
  return parseProgress(readRaw())[route].includes(n)
}

/** Mark a station done, or undone. Returns whether it is now done. */
export function toggleStation(route: RouteKey, n: number): boolean {
  const p = parseProgress(readRaw())
  const done = !p[route].includes(n)
  p[route] = done ? [...p[route], n].sort((a, b) => a - b) : p[route].filter(x => x !== n)
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch { /* storage blocked: nothing kept */ }
  window.dispatchEvent(new Event(EVENT))
  return done
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

export function useJourneyProgress(): JourneyProgress {
  // The raw string is the snapshot: it compares by value, so an unchanged passport does not re-render
  const raw = useSyncExternalStore(subscribe, readRaw, () => '')
  return useMemo(() => parseProgress(raw), [raw])
}
