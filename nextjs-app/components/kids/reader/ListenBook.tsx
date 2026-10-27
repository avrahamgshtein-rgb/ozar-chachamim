'use client'

// "Read aloud" for the children's books: the device's own voice (the Web Speech API: free, nothing sent
// anywhere) reads the part from where the reader is, lighting up the piece it reads, so a parent and a
// child can follow the same line. A thin sibling of components/sages/ListenResearch.tsx, which is tied to
// the research papers (ParsedResearchDoc, #doc-N articles) and must not change on the sage page; what is
// read, and in what pieces, is lib/kidsBookSpeech.ts. Shown only when the device has a Hebrew voice.
//
// The player's logic is a plain class (`ReadAloud`) over a few injected functions, so the tests drive it
// with a fake voice (headless Chromium has none) and the component below is only wiring.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BookSpeechItem } from '@/lib/kidsBookSpeech'
import { BOOK_VOICE_LANGS } from '@/lib/kidsBookSpeech'
import { track } from '@/lib/analytics'
import { holdSoundtrack, releaseSoundtrack } from '@/lib/soundtrack'

/** The same speeds, in the same order, as the research player, and the same stored choice: one speed for the site. */
export const READ_RATES = [0.85, 1, 1.15, 1.3, 1.5]
export const READ_RATE_KEY = 'ozar-listen-rate'

/** The stored speed, or 1 for anything that is not one of the speeds. */
export function parseRate(raw: unknown): number {
  const r = Number(raw)
  return READ_RATES.includes(r) ? r : 1
}

/** The speed after `rate` on the cycle. */
export function nextRate(rate: number): number {
  return READ_RATES[(READ_RATES.indexOf(rate) + 1) % READ_RATES.length]
}

interface VoiceLike { lang: string; localService: boolean }

/** A Hebrew voice, one on the device first (it works offline and starts at once); null when there is none. */
export function hebrewVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  const matching = voices.filter(v => BOOK_VOICE_LANGS.some(c => v.lang.toLowerCase().replace('_', '-').startsWith(c)))
  return matching.find(v => v.localService) ?? matching[0] ?? null
}

/** Listening starts where the reader is: the first piece whose bottom edge is below `top` (under the top bar); 0 when none is. */
export function firstBelow(bottoms: Array<number | null>, top = 90): number {
  for (let i = 0; i < bottoms.length; i++) {
    const b = bottoms[i]
    if (b !== null && b > top) return i
  }
  return 0
}

export type ListenStatus = 'idle' | 'playing' | 'paused'

export interface ReadAloudDeps {
  /** Say one piece, then call `end`; call `fail(code)` if the voice failed (the Web Speech error code). */
  say(text: string, rate: number, end: () => void, fail: (code: string) => void): void
  /** Stop whatever is being said. */
  cancel(): void
  /** Light up the element of the piece being said (null: none). */
  light(item: BookSpeechItem | null): void
  status(s: ListenStatus): void
}

/**
 * The player. Every start, pause and stop bumps `run`, so a late `end` or `error` event of an old utterance
 * (the browser fires one when it is cancelled) is ignored. A voice error other than being cancelled skips
 * to the next piece instead of stopping the reading.
 */
export class ReadAloud {
  state: ListenStatus = 'idle'
  index = 0
  rate = 1
  private run = 0

  constructor(private items: BookSpeechItem[], private deps: ReadAloudDeps) {}

  private set(s: ListenStatus) {
    this.state = s
    this.deps.status(s)
  }

  private speak(i: number, myRun: number) {
    if (myRun !== this.run) return
    if (i >= this.items.length) {
      this.set('idle')
      this.deps.light(null)
      return
    }
    this.index = i
    const item = this.items[i]
    this.deps.light(item)
    this.deps.say(
      item.text,
      this.rate,
      () => { if (myRun === this.run) this.speak(i + 1, myRun) },
      code => {
        if (myRun !== this.run || code === 'interrupted' || code === 'canceled') return
        this.speak(i + 1, myRun)
      },
    )
  }

  /** Start at piece `from`. Called straight from the click: iOS lets a page speak only inside a user gesture. */
  play(from: number) {
    const myRun = ++this.run
    this.deps.cancel()
    this.set('playing')
    this.speak(from, myRun)
  }

  pause() {
    this.run++
    this.deps.cancel()
    this.set('paused')
  }

  /** Continue from the piece that was being said. */
  resume() {
    this.play(this.index)
  }

  stop() {
    this.run++
    this.deps.cancel()
    this.set('idle')
    this.deps.light(null)
  }

  /** The speed applies from the piece being said. */
  setRate(rate: number) {
    this.rate = rate
    if (this.state === 'playing') this.play(this.index)
  }

  /** The page is going away: stop the voice without reporting a state to a component that is no longer there. */
  dispose() {
    this.run++
    this.deps.cancel()
    this.deps.light(null)
  }
}

const S = {
  listen: 'הקראה בקול',
  listenHint: 'הקראה בקול של המכשיר, מהמקום שבו אתם קוראים',
  pause: 'השהיה',
  resume: 'המשך',
  stop: 'עצירה',
  speed: 'מהירות',
  reading: 'מקריא',
  paused: 'מושהה',
  player: 'נגן הקראה',
}

export function ListenBook({ items, targetId, book }: { items: BookSpeechItem[]; targetId: string; book: string }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null)
  const [status, setStatus] = useState<ListenStatus>('idle')
  const [rate, setRate] = useState(1)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const lit = useRef<HTMLElement | null>(null)
  const tracked = useRef(false)

  // Voices arrive asynchronously in Chrome (the `voiceschanged` event), at once elsewhere.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    try { setRate(parseRate(localStorage.getItem(READ_RATE_KEY))) } catch { /* noop */ }
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const voice = useMemo(() => (voices ? hebrewVoice(voices) : null), [voices])
  useEffect(() => { voiceRef.current = voice }, [voice])

  // The background music steps aside while the part is read, and comes back after.
  useEffect(() => {
    if (status !== 'playing') return
    holdSoundtrack('speech')
    return () => releaseSoundtrack('speech')
  }, [status])

  const elementOf = useCallback((item: BookSpeechItem): HTMLElement | null => {
    const root = document.getElementById(targetId)
    return root ? root.querySelector<HTMLElement>(`[data-speak="${item.target}"]`) : null
  }, [targetId])

  const player = useMemo(() => {
    const light = (item: BookSpeechItem | null) => {
      const el = item ? elementOf(item) : null
      if (lit.current && lit.current !== el) lit.current.classList.remove('speaking')
      lit.current = el
      if (!el) return
      el.classList.add('speaking')
      const r = el.getBoundingClientRect()
      if (r.top < 90 || r.bottom > window.innerHeight - 110) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    return new ReadAloud(items, {
      say(text, speed, end, fail) {
        const u = new SpeechSynthesisUtterance(text)
        const v = voiceRef.current
        if (v) { u.voice = v; u.lang = v.lang }
        u.rate = speed
        u.onend = end
        u.onerror = e => fail(e.error)
        window.speechSynthesis.speak(u)
      },
      cancel: () => window.speechSynthesis.cancel(),
      light,
      status: setStatus,
    })
  }, [items, elementOf])
  useEffect(() => () => player.dispose(), [player])
  // the stored speed applies to the next piece said (setRate also restarts the piece being said, which a load must not do)
  useEffect(() => { player.rate = rate }, [player, rate])

  const start = () => {
    if (!tracked.current) { tracked.current = true; track('kids_read_listen', { book }) }
    const bottoms = items.map(it => { const el = elementOf(it); return el ? el.getBoundingClientRect().bottom : null })
    player.play(firstBelow(bottoms))
  }
  const cycleRate = () => {
    const next = nextRate(rate)
    setRate(next)
    player.setRate(next)
    try { localStorage.setItem(READ_RATE_KEY, String(next)) } catch { /* noop */ }
  }

  if (!voice || items.length === 0) return null

  return (
    <>
      <button type="button" onClick={status === 'idle' ? start : status === 'playing' ? () => player.pause() : () => player.resume()}
        title={S.listenHint} aria-pressed={status !== 'idle'}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 font-sans text-sm font-semibold text-gold-200 transition-colors hover:bg-gold-500/20">
        {status === 'playing' ? <PauseIcon /> : <SpeakerIcon />}
        <span>{status === 'playing' ? S.pause : status === 'paused' ? S.resume : S.listen}</span>
      </button>

      {status !== 'idle' && (
        <div role="region" aria-label={S.player} dir="rtl"
          className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full border border-gold-500/30 bg-ink-900/95 px-2 py-1.5 font-sans text-sm text-ink-100 shadow-2xl backdrop-blur">
          <span className="flex items-center gap-2 px-2 text-xs text-ink-300">
            <span className={`h-2 w-2 rounded-full ${status === 'playing' ? 'animate-pulse bg-gold-400' : 'bg-ink-500'}`} aria-hidden />
            {status === 'playing' ? S.reading : S.paused}
          </span>
          <button type="button" onClick={() => (status === 'playing' ? player.pause() : player.resume())}
            aria-label={status === 'playing' ? S.pause : S.resume}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-500/20 text-gold-200 hover:bg-gold-500/30">
            {status === 'playing' ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" onClick={cycleRate} aria-label={`${S.speed}: ${rate}×`}
            className="h-11 min-w-[3.25rem] rounded-full px-2 tabular-nums text-ink-200 hover:bg-ink-700/60">
            {rate}×
          </button>
          <button type="button" onClick={() => player.stop()} aria-label={S.stop}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-300 hover:bg-ink-700/60 hover:text-ink-100">
            <StopIcon />
          </button>
        </div>
      )}
    </>
  )
}

function SpeakerIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}
function PlayIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
}
function PauseIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
}
function StopIcon() {
  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
}
