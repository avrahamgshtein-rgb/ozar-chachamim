// The site's background music: one original track (made by the owner with Suno), off until the
// visitor turns it on, low, looping, and quiet whenever something else speaks or plays.
//
// The rules, in one place (the component only wires the browser to them):
//   - Nothing plays for a visitor who never pressed 🎵. The choice is kept in localStorage; a page
//     opened later tries to play and, where the browser forbids sound before a tap (iOS always,
//     others often), starts on the visitor's first tap or key anywhere on the page.
//   - The button follows what is heard: pressing it while music plays stops it; pressing it while
//     silent (off, waiting for a tap, or paused for a video) plays it.
//   - Read-aloud, a YouTube or Spotify player, any <video>/<audio> with sound, and a hidden tab
//     each hold the music: it fades out, and fades back in when the last hold is released.
//   - The place in the track is kept for the session, so a new page continues the tune instead of
//     restarting it.
// iOS ignores an element's volume: there the track plays at the level of the file (encoded 4 dB
// under the original, see CLAUDE.md) and stops without a fade.

export const SOUNDTRACK = {
  src: '/audio/journey-of-the-sages.mp3',
  title: 'Journey of the Sages',
  /** Element volume where the browser allows one; the file itself is already mastered soft. */
  volume: 0.6,
  fadeMs: 1200,
} as const

export const MUSIC_PREF_KEY = 'ozar-music'       // localStorage: '1' = the visitor wants music
export const MUSIC_POS_KEY = 'ozar-music-at'     // sessionStorage: { t: seconds, at: epoch ms }
const POS_TTL_MS = 30 * 60 * 1000                // an old place is not worth resuming
const FADE_STEP_MS = 40

export type HoldReason = 'speech' | 'youtube' | 'spotify' | 'media' | 'hidden'

/** The part of HTMLAudioElement the controller uses (a fake in the tests). */
export interface AudioLike {
  play(): Promise<void>
  pause(): void
  volume: number
  currentTime: number
  readonly paused: boolean
}

export interface StoreLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface SoundtrackState {
  /** The visitor wants music (the saved choice). */
  on: boolean
  /** Music is playing now. */
  playing: boolean
  /** On, but the browser waits for a tap before it allows sound. */
  waiting: boolean
  /** On, but held by other sound (read-aloud, a video) or a hidden tab. */
  held: boolean
}

function safeGet(store: StoreLike | null | undefined, key: string): string | null {
  try { return store?.getItem(key) ?? null } catch { return null }
}
function safeSet(store: StoreLike | null | undefined, key: string, value: string) {
  try { store?.setItem(key, value) } catch { /* storage blocked: the choice lasts this page only */ }
}

/** Where to resume: the saved second, if it is recent and inside the track. */
export function resumeAt(raw: string | null, now: number, duration = Infinity): number {
  if (!raw) return 0
  try {
    const { t, at } = JSON.parse(raw) as { t?: unknown; at?: unknown }
    if (typeof t !== 'number' || typeof at !== 'number' || !isFinite(t) || t < 0) return 0
    if (now - at > POS_TTL_MS || now < at) return 0
    return t < duration ? t : 0
  } catch {
    return 0
  }
}

export interface ControllerOptions {
  prefs?: StoreLike | null      // localStorage
  session?: StoreLike | null    // sessionStorage
  now?: () => number
  /** Fade step scheduler (setTimeout in the browser; immediate in the tests). */
  later?: (fn: () => void, ms: number) => unknown
  cancel?: (handle: unknown) => void
  onToggle?: (on: boolean) => void
}

export class SoundtrackController {
  private holds = new Set<HoldReason>()
  private on: boolean
  private playing = false
  private waiting = false
  private fading: unknown = null
  private target: number
  private canFade: boolean
  private fadeDone: (() => void) | null = null
  private gen = 0
  private listeners = new Set<() => void>()
  private snapshot: SoundtrackState

  constructor(private audio: AudioLike, private opts: ControllerOptions = {}) {
    this.on = safeGet(opts.prefs, MUSIC_PREF_KEY) === '1'
    // iOS keeps volume at 1 whatever is set: no fades there
    audio.volume = 0.5
    this.canFade = Math.abs(audio.volume - 0.5) < 0.01
    this.target = this.canFade ? SOUNDTRACK.volume : 1
    audio.volume = this.target
    const at = resumeAt(safeGet(opts.session, MUSIC_POS_KEY), this.now())
    if (at > 0) {
      try { audio.currentTime = at } catch { /* not seekable yet: start from the top */ }
    }
    this.snapshot = this.compute()
  }

  // ── state for React (useSyncExternalStore) ──────────────────────────────────
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  getState = (): SoundtrackState => this.snapshot

  private compute(): SoundtrackState {
    return { on: this.on, playing: this.playing, waiting: this.on && this.waiting && !this.playing, held: this.on && this.holds.size > 0 }
  }
  private emit() {
    const next = this.compute()
    const prev = this.snapshot
    if (next.on === prev.on && next.playing === prev.playing && next.waiting === prev.waiting && next.held === prev.held) return
    this.snapshot = next
    for (const fn of this.listeners) fn()
  }
  private now() { return this.opts.now?.() ?? Date.now() }

  // ── the visitor ─────────────────────────────────────────────────────────────

  /** The 🎵 button. Call it from the click itself: iOS allows sound only inside a tap. */
  toggle(): Promise<void> {
    if (this.playing) {
      this.setOn(false)
      return this.stop()
    }
    this.setOn(true)
    this.holds.clear()       // the visitor asked for music now, over a video or read-aloud
    return this.start()
  }

  /** The page's first tap or key, while the choice is on but the browser waited for one. */
  gesture(): Promise<void> {
    if (!this.on || this.playing || !this.waiting) return Promise.resolve()
    return this.start()
  }

  private setOn(on: boolean) {
    this.on = on
    safeSet(this.opts.prefs, MUSIC_PREF_KEY, on ? '1' : '0')
    this.opts.onToggle?.(on)
    this.emit()
  }

  // ── other sound on the page ─────────────────────────────────────────────────

  hold(reason: HoldReason): Promise<void> {
    if (this.holds.has(reason)) return Promise.resolve()
    this.holds.add(reason)
    this.emit()
    // a hidden tab runs timers once a second: a fade there would take half a minute
    return this.playing ? this.stop(reason !== 'hidden') : Promise.resolve()
  }

  release(reason: HoldReason): Promise<void> {
    if (!this.holds.delete(reason)) return Promise.resolve()
    this.emit()
    return this.holds.size === 0 && this.on && !this.playing && !this.waiting ? this.start() : Promise.resolve()
  }

  /** The element stopped without us (a headset unplugged, the system's media controls). */
  externalPause() {
    if (!this.playing) return
    this.playing = false
    this.savePlace()
    this.emit()
  }

  /** Remember the place in the track for the next page of this visit. */
  savePlace() {
    const t = this.audio.currentTime
    if (isFinite(t) && t > 0) safeSet(this.opts.session, MUSIC_POS_KEY, JSON.stringify({ t, at: this.now() }))
  }

  /** Try to play now (on load, with the choice on). Never throws. */
  resume(): Promise<void> {
    return this.on && !this.playing && this.holds.size === 0 ? this.start() : Promise.resolve()
  }

  // ── playing and stopping ────────────────────────────────────────────────────

  private async start(): Promise<void> {
    if (!this.on || this.holds.size > 0) return
    const gen = ++this.gen
    this.stopFade()
    if (this.canFade && this.audio.paused) this.audio.volume = 0
    try {
      await this.audio.play()
    } catch (e) {
      if (gen !== this.gen) return
      // NotAllowedError: the browser wants a tap first. Anything else (no file, no codec): stay silent.
      this.waiting = (e as DOMException)?.name === 'NotAllowedError'
      this.playing = false
      this.audio.volume = this.target
      this.emit()
      return
    }
    // a stop or another start came while play() was pending: that one owns the element now
    if (gen !== this.gen) return
    this.waiting = false
    // a hold came while play() was pending: stay silent until it is released
    if (!this.on || this.holds.size > 0) {
      this.audio.pause()
      this.audio.volume = this.target
      this.emit()
      return
    }
    this.playing = true
    this.emit()
    await this.fadeTo(this.target)
  }

  private async stop(fade = true): Promise<void> {
    const gen = ++this.gen
    this.playing = false
    this.emit()
    if (fade) await this.fadeTo(0)
    else this.stopFade()
    if (gen !== this.gen) return      // turned back on during the fade: leave it playing
    this.audio.pause()
    this.audio.volume = this.target
    this.savePlace()
  }

  private stopFade() {
    if (this.fading != null) this.opts.cancel?.(this.fading)
    this.fading = null
    const done = this.fadeDone
    this.fadeDone = null
    done?.()
  }

  private fadeTo(goal: number): Promise<void> {
    this.stopFade()
    if (!this.canFade) return Promise.resolve()
    const later = this.opts.later
    const from = this.audio.volume
    const steps = Math.round((SOUNDTRACK.fadeMs * Math.abs(goal - from)) / this.target / FADE_STEP_MS)
    if (!later || steps <= 1) {
      this.audio.volume = goal
      return Promise.resolve()
    }
    return new Promise(resolve => {
      let i = 0
      this.fadeDone = resolve
      const step = () => {
        i++
        this.audio.volume = Math.min(1, Math.max(0, from + ((goal - from) * i) / steps))
        if (i < steps) { this.fading = later(step, FADE_STEP_MS); return }
        this.fading = null
        this.fadeDone = null
        resolve()
      }
      this.fading = later(step, FADE_STEP_MS)
    })
  }
}

// ── the page's one controller, for the buttons and the other players ───────────

let current: SoundtrackController | null = null
const waitingForPlayer = new Set<() => void>()

export function setSoundtrack(c: SoundtrackController | null) {
  current = c
  for (const fn of waitingForPlayer) fn()
}

export function getSoundtrack(): SoundtrackController | null {
  return current
}

/** Subscribe to the controller arriving (the player mounts after the buttons on some pages). */
export function onSoundtrackReady(fn: () => void) {
  waitingForPlayer.add(fn)
  return () => { waitingForPlayer.delete(fn) }
}

/** For read-aloud and the video and podcast players: harmless when there is no music. */
export function holdSoundtrack(reason: HoldReason) {
  void current?.hold(reason)
}
export function releaseSoundtrack(reason: HoldReason) {
  void current?.release(reason)
}
