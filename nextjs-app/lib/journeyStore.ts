'use client'

// State of the מסע התורה mode, shared by the map overlay, its controls and the
// map legend. Kept apart from the app store on purpose: the year changes every
// animation frame during playback, and only the few components that select it
// should hear about that.
import { create } from 'zustand'
import type { JourneySnapshot } from './journey'
import { JOURNEY_START, clampYear } from './journeyRange'

/** Playback speeds offered by the speed control, as multiples of the base pace. */
export const JOURNEY_SPEEDS = [0.5, 1, 2, 4] as const

interface JourneyState {
  on: boolean
  /** Fractional during playback; rounded wherever it is shown. */
  year: number
  playing: boolean
  speed: number
  /** Camera follows the action (never under prefers-reduced-motion). */
  follow: boolean
  /** Centre whose sages the side list is showing, if one was picked. */
  focus: string | null
  /** Latest reading of the model; replaced only when the active set changes. */
  snapshot: JourneySnapshot | null
  /** Opened by the toggle (not a deep link): begin at the first active year and play. */
  autoStart: boolean
  setOn: (on: boolean) => void
  setYear: (year: number) => void
  setPlaying: (playing: boolean) => void
  setSpeed: (speed: number) => void
  setFollow: (follow: boolean) => void
  setFocus: (focus: string | null) => void
  setSnapshot: (snapshot: JourneySnapshot) => void
  setAutoStart: (autoStart: boolean) => void
}

export const useJourneyStore = create<JourneyState>(set => ({
  on: false,
  year: JOURNEY_START,
  playing: false,
  speed: 1,
  follow: true,
  focus: null,
  snapshot: null,
  autoStart: false,
  setOn: on => set(on ? { on } : { on, playing: false, focus: null, autoStart: false }),
  setYear: year => set({ year: clampYear(year) }),
  setPlaying: playing => set({ playing }),
  setSpeed: speed => set({ speed }),
  setFollow: follow => set({ follow }),
  setFocus: focus => set({ focus }),
  setSnapshot: snapshot => set({ snapshot }),
  setAutoStart: autoStart => set({ autoStart }),
}))
