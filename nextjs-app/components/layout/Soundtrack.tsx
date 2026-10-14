'use client'

// The background music's one <audio> element, rendered once by the locale layout, so it keeps
// playing through client-side navigation. The rules are in lib/soundtrack.ts; this wires the
// browser to them: the first tap when the browser waits for one, other sound on the page, a hidden
// tab, the system's media controls, and the place in the track when the page is left.
import { useEffect, useRef } from 'react'
import { SOUNDTRACK, SoundtrackController, setSoundtrack } from '@/lib/soundtrack'
import { track } from '@/lib/analytics'
import { isValidLocale, UI } from '@/lib/i18n'

const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const

function storage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try { return window[kind] } catch { return null }
}

export function Soundtrack() {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    const lang = document.documentElement.lang.slice(0, 2)
    const c = new SoundtrackController(audio, {
      prefs: storage('localStorage'),
      session: storage('sessionStorage'),
      later: (fn, ms) => window.setTimeout(fn, ms),
      cancel: h => window.clearTimeout(h as number),
      onToggle: on => track('music_toggle', { locale: lang || 'he', state: on ? 'on' : 'off' }),
    })
    setSoundtrack(c)

    // The browser waits for a tap: the first one anywhere starts the music, except a tap on the
    // 🎵 button itself, which toggles it (starting it here would let that click stop it again).
    const onGesture = (e: Event) => {
      if ((e.target as Element | null)?.closest?.('[data-soundtrack-toggle]')) return
      void c.gesture()
    }
    let listening = false
    const sync = () => {
      const { waiting, playing } = c.getState()
      if (waiting && !listening) {
        for (const g of GESTURES) document.addEventListener(g, onGesture, { capture: true, passive: true })
        listening = true
      } else if (!waiting && listening) {
        for (const g of GESTURES) document.removeEventListener(g, onGesture, { capture: true })
        listening = false
      }
      const ms = 'mediaSession' in navigator ? navigator.mediaSession : null
      if (ms && playing && typeof MediaMetadata !== 'undefined') {
        try {
          ms.metadata = new MediaMetadata({
            title: SOUNDTRACK.title,
            artist: UI[isValidLocale(lang) ? lang : 'he'].appTitle,
            artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
          })
        } catch { /* older engines */ }
      }
    }
    const unsubscribe = c.subscribe(sync)

    // Lock screen, headset buttons and the system's media panel act like the 🎵 button.
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => { if (!c.getState().playing) void c.toggle() })
        navigator.mediaSession.setActionHandler('pause', () => { if (c.getState().playing) void c.toggle() })
      } catch { /* an action this browser does not know */ }
    }

    // Any other <audio>/<video> with sound holds the music while it plays. The element's own
    // pause/ended release it: a capture listener on the document would miss the pause of an element
    // React has already removed from the page.
    const sounding = new Set<HTMLMediaElement>()
    const letGo = (el: HTMLMediaElement) => {
      if (!sounding.delete(el)) return
      el.removeEventListener('pause', onStopped)
      el.removeEventListener('ended', onStopped)
      el.removeEventListener('volumechange', onVolume)
      if (sounding.size === 0) void c.release('media')
    }
    const onStopped = (e: Event) => letGo(e.currentTarget as HTMLMediaElement)
    const onVolume = (e: Event) => {
      const el = e.currentTarget as HTMLMediaElement
      if (el.muted || el.volume === 0) letGo(el)
    }
    const onPlay = (e: Event) => {
      const el = e.target
      if (el === audio || !(el instanceof HTMLMediaElement) || el.muted || el.volume === 0 || sounding.has(el)) return
      sounding.add(el)
      el.addEventListener('pause', onStopped)
      el.addEventListener('ended', onStopped)
      el.addEventListener('volumechange', onVolume)
      void c.hold('media')
    }
    document.addEventListener('play', onPlay, true)

    // A hidden tab (another tab, a locked phone) is silent; the music comes back with the page.
    const onVisibility = () => { void (document.hidden ? c.hold('hidden') : c.release('hidden')) }
    document.addEventListener('visibilitychange', onVisibility)
    if (document.hidden) onVisibility()

    const onExternalPause = () => c.externalPause()
    audio.addEventListener('pause', onExternalPause)
    const onLeave = () => c.savePlace()
    window.addEventListener('pagehide', onLeave)

    void c.resume()

    return () => {
      unsubscribe()
      for (const g of GESTURES) document.removeEventListener(g, onGesture, { capture: true })
      for (const el of [...sounding]) letGo(el)
      document.removeEventListener('play', onPlay, true)
      document.removeEventListener('visibilitychange', onVisibility)
      audio.removeEventListener('pause', onExternalPause)
      window.removeEventListener('pagehide', onLeave)
      c.savePlace()
      audio.pause()
      setSoundtrack(null)
    }
  }, [])

  // preload="none": nothing is downloaded until the visitor turns the music on
  return <audio ref={ref} src={SOUNDTRACK.src} preload="none" loop aria-hidden="true" className="hidden" />
}
