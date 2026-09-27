'use client'

// "האזינו לפרק": the sage's podcast episode behind a click-to-load facade.
// Nothing is requested from Spotify until the listener asks for the player —
// the facade is local markup and an inline icon. Episode and show links embed;
// anything else (short links such as spotifycreators-web.app.link) falls back
// to a plain link.
//
// Listen while reading: once the player is loaded and its card scrolls out of
// view, the same iframe is pinned to the bottom of the screen as a slim
// mini-player (collapse keeps it playing; close unloads it). It is never
// moved in the DOM, only restyled, since re-parenting an iframe reloads it
// and would stop the audio.
import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/types'

export function parseSpotifyUrl(url: string | undefined | null): { kind: 'episode' | 'show'; id: string } | null {
  if (!url) return null
  const m = /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?:embed\/)?(episode|show)\/([A-Za-z0-9]{22})(?:[/?#]|$)/i.exec(url.trim())
  return m ? { kind: m[1].toLowerCase() as 'episode' | 'show', id: m[2] } : null
}

const S = {
  title: { he: 'האזינו לפרק', en: 'Listen to the episode', ru: 'Слушать выпуск' },
  titleShow: { he: 'האזינו לפודקאסט', en: 'Listen to the podcast', ru: 'Слушать подкаст' },
  sub: { he: 'פרק בפודקאסט', en: 'Podcast episode', ru: 'Выпуск подкаста' },
  load: { he: 'הפעלת הנגן', en: 'Load player', ru: 'Включить плеер' },
  open: { he: 'פתיחה ב־Spotify', en: 'Open in Spotify', ru: 'Открыть в Spotify' },
  privacy: {
    he: 'הנגן נטען מ־Spotify רק לאחר לחיצה.',
    en: 'The player loads from Spotify only when you click.',
    ru: 'Плеер загружается из Spotify только после нажатия.',
  },
  frame: { he: 'נגן Spotify', en: 'Spotify player', ru: 'Плеер Spotify' },
  mini: { he: 'ממשיכים להאזין', en: 'Keep listening', ru: 'Продолжайте слушать' },
  playingBelow: {
    he: 'הנגן ממשיך בתחתית המסך בזמן הקריאה',
    en: 'The player stays at the bottom of the screen while you read',
    ru: 'Плеер остаётся внизу экрана, пока вы читаете',
  },
  collapse: { he: 'מזעור הנגן', en: 'Minimize player', ru: 'Свернуть плеер' },
  expand: { he: 'הצגת הנגן', en: 'Show player', ru: 'Показать плеер' },
  close: { he: 'סגירת הנגן (עוצר את ההשמעה)', en: 'Close player (stops playback)', ru: 'Закрыть плеер (остановит воспроизведение)' },
  listening: { he: 'בהאזנה', en: 'Listening', ru: 'Слушаем' },
} satisfies Record<string, Record<Locale, string>>

/** The sage page's scroll container (the body itself never scrolls). */
function scroller(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById('sage-scroll')
}

export function SpotifyListen({ url, locale, name }: { url: string; locale: Locale; name: string }) {
  const parsed = parseSpotifyUrl(url)
  const [loaded, setLoaded] = useState(false)
  /** The card's player slot is on screen: the player sits in the card. */
  const [docked, setDocked] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const slotRef = useRef<HTMLDivElement>(null)
  const title = parsed?.kind === 'show' ? S.titleShow[locale] : S.title[locale]
  const fullHeight = parsed?.kind === 'show' ? 232 : 152
  const mini = loaded && !docked

  // Undock once less than a third of the slot is visible below the top bar.
  useEffect(() => {
    const slot = slotRef.current
    if (!loaded || !slot || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => {
      const inView = e.isIntersecting && e.intersectionRatio >= 0.35
      setDocked(inView)
      if (inView) setCollapsed(false)
    }, { rootMargin: '-56px 0px 0px 0px', threshold: [0, 0.35, 0.7, 1] })
    io.observe(slot)
    return () => io.disconnect()
  }, [loaded])

  // Room at the end of the page, so the mini-player never hides its last lines.
  useEffect(() => {
    const el = scroller()
    if (!el || !mini) return
    const prev = el.style.paddingBottom
    el.style.paddingBottom = '7rem'
    return () => { el.style.paddingBottom = prev }
  }, [mini])

  const unload = () => { setLoaded(false); setDocked(true); setCollapsed(false) }

  return (
    <section aria-label={title}
      className="listen-card relative overflow-hidden rounded-2xl border border-[#1DB954]/25 bg-gradient-to-br from-[#1DB954]/[0.09] via-ink-800/40 to-ink-800/20 p-4 md:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-[0_0_24px_rgba(29,185,84,0.35)]">
          <SpotifyIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg font-bold leading-tight text-ink-50">{title}</h2>
          <p dir="auto" className="truncate text-xs font-sans text-ink-400">{S.sub[locale]} · {name}</p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="hidden flex-shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-sans text-[#1ed760] [[data-theme=light]_&]:text-[#11773a] hover:bg-[#1DB954]/10 sm:inline-flex">
          {S.open[locale]} <ExternalIcon />
        </a>
      </div>

      {parsed ? (
        loaded ? (
          <div ref={slotRef} className="no-print relative mt-4" style={{ height: fullHeight }}>
            {mini && (
              <p className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#1DB954]/30 px-4 text-center text-xs font-sans text-ink-400">
                <EqIcon />{S.playingBelow[locale]}
              </p>
            )}
            {/* The one iframe: in the card when docked, pinned to the screen's bottom when not */}
            <div
              role={mini ? 'region' : undefined}
              aria-label={mini ? `${S.mini[locale]} — ${name}` : undefined}
              aria-hidden={mini && collapsed ? true : undefined}
              className={
                mini
                  ? `fixed bottom-4 end-4 start-20 z-30 flex h-20 items-stretch gap-1 overflow-hidden rounded-2xl border border-[#1DB954]/30 glass shadow-glass transition-[transform,opacity,visibility] duration-300 ease-out md:bottom-6 md:end-6 md:start-auto md:w-[26rem] motion-reduce:transition-none ${
                      collapsed ? 'pointer-events-none invisible translate-y-[140%] opacity-0' : 'translate-y-0 opacity-100 animate-fade-in'
                    }`
                  : 'absolute inset-0'
              }
            >
              <iframe
                title={`${S.frame[locale]} — ${name}`}
                src={`https://open.spotify.com/embed/${parsed.kind}/${parsed.id}?utm_source=generator&theme=0`}
                className={mini ? 'block h-20 min-w-0 flex-1 rounded-xl border-0 bg-ink-900/60' : 'block w-full rounded-xl border-0 bg-ink-900/60'}
                height={mini ? 80 : fullHeight}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
              {mini && (
                <div className="flex flex-shrink-0 flex-col justify-center gap-1 pe-1">
                  <MiniButton label={S.collapse[locale]} onClick={() => setCollapsed(true)}>
                    <path d="M6 9l6 6 6-6" />
                  </MiniButton>
                  <MiniButton label={S.close[locale]} onClick={unload}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </MiniButton>
                </div>
              )}
            </div>
            {mini && collapsed && (
              <button type="button" onClick={() => setCollapsed(false)} aria-label={`${S.expand[locale]} — ${name}`}
                className="fixed bottom-4 end-4 z-30 inline-flex h-11 items-center gap-2 rounded-full border border-[#1DB954]/40 glass ps-2 pe-3.5 text-xs font-sans font-semibold text-ink-100 shadow-glass transition hover:border-[#1DB954]/70 animate-fade-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1DB954] md:bottom-6 md:end-6">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1DB954] text-black">
                  <SpotifyIcon className="h-4 w-4" />
                </span>
                {S.listening[locale]}
                <svg className="h-3.5 w-3.5 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 15l6-6 6 6" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="no-print mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" onClick={() => setLoaded(true)}
              className="group inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-4 py-2 text-sm font-sans font-semibold text-black shadow-lg shadow-[#1DB954]/20 transition hover:scale-[1.03] hover:bg-[#1ed760] focus-visible:outline-offset-4 motion-reduce:hover:scale-100">
              <PlayIcon />
              {S.load[locale]}
            </button>
            <span className="text-[11px] font-sans text-ink-500">{S.privacy[locale]}</span>
          </div>
        )
      ) : null}

      <a href={url} target="_blank" rel="noopener noreferrer"
        className={`mt-3 items-center gap-1 text-xs font-sans text-[#1ed760] [[data-theme=light]_&]:text-[#11773a] hover:underline ${parsed ? 'inline-flex sm:hidden' : 'inline-flex'}`}>
        {S.open[locale]} <ExternalIcon />
      </a>
    </section>
  )
}

function MiniButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-700/60 hover:text-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1DB954]">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  )
}

/** Three bars: "playing". Still under reduced motion. */
function EqIcon() {
  return (
    <svg className="h-3.5 w-3.5 flex-shrink-0 text-[#1ed760] [[data-theme=light]_&]:text-[#11773a]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="4" y="10" width="3.5" height="10" rx="1" /><rect x="10.25" y="4" width="3.5" height="16" rx="1" /><rect x="16.5" y="8" width="3.5" height="12" rx="1" />
    </svg>
  )
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.9-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  )
}
