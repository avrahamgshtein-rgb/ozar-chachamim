'use client'

// "Listen to the research": the device's own voice (the Web Speech API: free, no server, works on
// phones) reads the papers aloud from where the reader is, lighting up and following the paragraph
// it reads. Shown only when the browser has a voice for the paper's language; nothing is sent
// anywhere. What is read, and in what pieces, is lib/speech.ts.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '@/lib/types'
import type { ParsedResearchDoc } from '@/lib/researchParse'
import { speechItems, VOICE_LANGS, type SpeechItem, type SpeechLang } from '@/lib/speech'
import { track } from '@/lib/analytics'

const S = {
  listen: { he: 'האזנה למחקר', en: 'Listen', ru: 'Слушать' },
  listenHint: {
    he: 'הקראה בקול של המכשיר, מהמקום שבו אתם קוראים',
    en: "Read aloud by your device's voice, from where you are",
    ru: 'Чтение вслух голосом вашего устройства, с того места, где вы читаете',
  },
  pause: { he: 'השהיה', en: 'Pause', ru: 'Пауза' },
  resume: { he: 'המשך', en: 'Resume', ru: 'Продолжить' },
  stop: { he: 'עצירה', en: 'Stop', ru: 'Стоп' },
  speed: { he: 'מהירות', en: 'Speed', ru: 'Скорость' },
  reading: { he: 'מקריא', en: 'Reading aloud', ru: 'Читается' },
  paused: { he: 'מושהה', en: 'Paused', ru: 'Пауза' },
  player: { he: 'נגן הקראה', en: 'Read-aloud player', ru: 'Чтение вслух' },
} satisfies Record<string, Record<Locale, string>>

const RATES = [0.85, 1, 1.15, 1.3, 1.5]
const RATE_KEY = 'ozar-listen-rate'

function voiceFor(voices: SpeechSynthesisVoice[], lang: SpeechLang): SpeechSynthesisVoice | null {
  const codes = VOICE_LANGS[lang]
  const matching = voices.filter(v => codes.some(c => v.lang.toLowerCase().replace('_', '-').startsWith(c)))
  // a voice on the device first (works offline, starts at once), then any
  return matching.find(v => v.localService) ?? matching[0] ?? null
}

function elementOf(item: SpeechItem): HTMLElement | null {
  const article = document.getElementById(`doc-${item.doc + 1}`)
  if (!article) return null
  if (item.target === 'title') return article.querySelector<HTMLElement>('.reader-doc-title')
  return article.querySelector<HTMLElement>(`[data-speak="${item.target}"]`)
}

export function ListenResearch({ docs, titles, locale }: { docs: ParsedResearchDoc[]; titles: string[]; locale: Locale }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [rate, setRate] = useState(1)
  const index = useRef(0)
  const run = useRef(0) // bumped on every start/stop, so a late `end` event of an old utterance is ignored
  const lit = useRef<HTMLElement | null>(null)
  const tracked = useRef(false)

  // Voices arrive asynchronously in Chrome (the `voiceschanged` event), at once elsewhere.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    try { const r = Number(localStorage.getItem(RATE_KEY)); if (RATES.includes(r)) setRate(r) } catch { /* noop */ }
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      run.current++
      window.speechSynthesis.cancel()
    }
  }, [])

  const allItems = useMemo(() => speechItems(docs, titles), [docs, titles])
  const voiceByLang = useMemo(() => {
    const m: Partial<Record<SpeechLang, SpeechSynthesisVoice>> = {}
    for (const lang of ['he', 'en', 'ru'] as SpeechLang[]) {
      const v = voices ? voiceFor(voices, lang) : null
      if (v) m[lang] = v
    }
    return m
  }, [voices])
  // Only what this device can say: a paper in a language without a voice is left out.
  const items = useMemo(() => allItems.filter(it => voiceByLang[it.lang]), [allItems, voiceByLang])

  const light = useCallback((el: HTMLElement | null) => {
    if (lit.current && lit.current !== el) lit.current.classList.remove('speaking')
    lit.current = el
    if (!el) return
    el.classList.add('speaking')
    const r = el.getBoundingClientRect()
    if (r.top < 90 || r.bottom > window.innerHeight - 110) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  const speak = useCallback((i: number, myRun: number) => {
    const synth = window.speechSynthesis
    if (myRun !== run.current) return
    if (i >= items.length) { setStatus('idle'); light(null); return }
    index.current = i
    const item = items[i]
    const u = new SpeechSynthesisUtterance(item.text)
    const voice = voiceByLang[item.lang]
    if (voice) { u.voice = voice; u.lang = voice.lang }
    u.rate = rate
    u.onend = () => { if (myRun === run.current) speak(i + 1, myRun) }
    u.onerror = e => {
      if (myRun !== run.current || e.error === 'interrupted' || e.error === 'canceled') return
      speak(i + 1, myRun)
    }
    light(elementOf(item))
    synth.speak(u)
  }, [items, voiceByLang, rate, light])

  /** The first piece at or below the top of the screen: listening starts where the reader is. */
  const startIndex = useCallback(() => {
    for (let i = 0; i < items.length; i++) {
      const el = elementOf(items[i])
      if (el && el.getBoundingClientRect().bottom > 90) return i
    }
    return 0
  }, [items])

  const play = (from: number) => {
    const myRun = ++run.current
    window.speechSynthesis.cancel()
    setStatus('playing')
    // Called straight from the click: iOS lets a page speak only inside a user gesture.
    speak(from, myRun)
  }

  const start = () => {
    if (!tracked.current) { tracked.current = true; track('research_listen', { locale, lang: items[0]?.lang ?? locale }) }
    play(startIndex())
  }
  const pause = () => { run.current++; window.speechSynthesis.cancel(); setStatus('paused') }
  const resume = () => play(index.current)
  const stop = () => { run.current++; window.speechSynthesis.cancel(); setStatus('idle'); light(null) }
  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length]
    setRate(next)
    try { localStorage.setItem(RATE_KEY, String(next)) } catch { /* noop */ }
  }
  // A new speed applies from the sentence being read.
  useEffect(() => {
    if (status === 'playing') play(index.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate])

  if (!voices || items.length === 0) return null

  return (
    <>
      <button type="button" onClick={status === 'idle' ? start : status === 'playing' ? pause : resume}
        title={S.listenHint[locale]} aria-pressed={status !== 'idle'}
        className="no-print inline-flex h-9 items-center gap-1.5 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 font-sans text-sm text-gold-300 transition-colors hover:bg-gold-500/20">
        {status === 'playing' ? <PauseIcon /> : <SpeakerIcon />}
        <span>{status === 'playing' ? S.pause[locale] : status === 'paused' ? S.resume[locale] : S.listen[locale]}</span>
      </button>

      {status !== 'idle' && (
        <div role="region" aria-label={S.player[locale]} dir={locale === 'he' ? 'rtl' : 'ltr'}
          className="no-print fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full border border-gold-500/30 bg-ink-900/95 px-2 py-1.5 font-sans text-sm text-ink-100 shadow-2xl backdrop-blur">
          <span className="flex items-center gap-2 px-2 text-xs text-ink-300">
            <span className={`h-2 w-2 rounded-full ${status === 'playing' ? 'animate-pulse bg-gold-400' : 'bg-ink-500'}`} aria-hidden />
            {status === 'playing' ? S.reading[locale] : S.paused[locale]}
          </span>
          <button type="button" onClick={status === 'playing' ? pause : resume}
            aria-label={status === 'playing' ? S.pause[locale] : S.resume[locale]}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/20 text-gold-200 hover:bg-gold-500/30">
            {status === 'playing' ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" onClick={cycleRate} aria-label={`${S.speed[locale]}: ${rate}×`}
            className="h-9 min-w-[3.25rem] rounded-full px-2 tabular-nums text-ink-200 hover:bg-ink-700/60">
            {rate}×
          </button>
          <button type="button" onClick={stop} aria-label={S.stop[locale]}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-300 hover:bg-ink-700/60 hover:text-ink-100">
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
