'use client'

// The 🎵 button: background music on or off. It follows what is heard: pressing it while the music
// plays stops it, pressing it while silent plays it (lib/soundtrack.ts). Rendered in every top bar
// (home header and its mobile menu, the standalone pages' bar, the sage page) and on the About page.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { Locale } from '@/lib/types'
import { cn } from '@/lib/utils'
import { getSoundtrack, onSoundtrackReady, SOUNDTRACK, type SoundtrackController, type SoundtrackState } from '@/lib/soundtrack'

const S = {
  name: { he: 'מוזיקת רקע', en: 'Background music', ru: 'Фоновая музыка' },
  turnOn: { he: 'הפעלת מוזיקת רקע', en: 'Play background music', ru: 'Включить фоновую музыку' },
  turnOff: { he: 'השתקת מוזיקת הרקע', en: 'Mute the background music', ru: 'Выключить фоновую музыку' },
  waiting: { he: 'מוזיקת הרקע תתחיל בלחיצה הבאה בעמוד', en: 'The music starts on your next tap on the page', ru: 'Музыка начнётся при следующем касании страницы' },
  held: { he: 'מוזיקת הרקע מושהית בזמן ההשמעה', en: 'The music is paused while something else plays', ru: 'Музыка на паузе, пока звучит другое' },
} satisfies Record<string, Record<Locale, string>>

const OFF: SoundtrackState = { on: false, playing: false, waiting: false, held: false }
const noop = () => () => {}

function useSoundtrack(): [SoundtrackController | null, SoundtrackState] {
  const [c, setC] = useState<SoundtrackController | null>(null)
  // the player is rendered by the layout after the page: it may arrive after this button
  useEffect(() => {
    setC(getSoundtrack())
    return onSoundtrackReady(() => setC(getSoundtrack()))
  }, [])
  const state = useSyncExternalStore(c ? c.subscribe : noop, c ? c.getState : () => OFF, () => OFF)
  return [c, state]
}

export function SoundtrackToggle({ locale, className, withLabel = false, onDone }: {
  locale: Locale
  className?: string
  /** Show the words beside the icon (the mobile menu, the About page). */
  withLabel?: boolean
  onDone?: () => void
}) {
  const [c, state] = useSoundtrack()
  const press = useCallback(() => {
    // no await: iOS allows sound only inside the click itself
    void c?.toggle()
    onDone?.()
  }, [c, onDone])

  const hint = state.playing ? S.turnOff[locale]
    : state.waiting ? S.waiting[locale]
    : state.held ? S.held[locale]
    : S.turnOn[locale]
  const lit = state.playing || state.waiting || state.held

  return (
    <button
      type="button"
      data-soundtrack-toggle=""
      onClick={press}
      aria-pressed={state.playing}
      aria-label={`${S.name[locale]}: ${SOUNDTRACK.title}`}
      title={hint}
      className={cn('inline-flex items-center gap-2', className, lit && 'text-gold-300')}
    >
      {state.playing ? <Bars /> : <Note muted={!lit} />}
      {withLabel && (
        <span className="flex flex-col items-start leading-tight">
          <span>{S.name[locale]}</span>
          {lit && !state.playing && <span className="text-[11px] text-ink-400">{state.waiting ? S.waiting[locale] : S.held[locale]}</span>}
        </span>
      )}
    </button>
  )
}

function Note({ muted }: { muted: boolean }) {
  return (
    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
      {muted && <path d="M3 3l18 18" />}
    </svg>
  )
}

/** Three bars that rise and fall while the music plays (still under prefers-reduced-motion). */
function Bars() {
  return (
    <span className="music-bars h-4 w-4 flex-shrink-0" aria-hidden>
      <span /><span /><span />
    </span>
  )
}
