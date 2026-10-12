'use client'

// A YouTube video behind a click-to-load facade, like the podcast player: nothing is requested from
// YouTube (no thumbnail, no script, no cookie) until the visitor presses play. The facade is local
// markup and an inline icon; the player is youtube-nocookie.com.
import { useState } from 'react'
import type { Locale } from '@/lib/types'
import { track } from '@/lib/analytics'
import { durationLabel, embedUrl, watchUrl } from '@/lib/youtube'

const S = {
  play: { he: 'הפעלת הסרטון', en: 'Play the video', ru: 'Смотреть видео' },
  open: { he: 'פתיחה ב־YouTube', en: 'Open on YouTube', ru: 'Открыть на YouTube' },
  privacy: {
    he: 'הסרטון נטען מ־YouTube רק לאחר לחיצה.',
    en: 'The video loads from YouTube only when you click.',
    ru: 'Видео загружается с YouTube только после нажатия.',
  },
  frame: { he: 'נגן YouTube', en: 'YouTube player', ru: 'Плеер YouTube' },
  newTab: { he: '(נפתח בלשונית חדשה)', en: '(opens in a new tab)', ru: '(откроется в новой вкладке)' },
} satisfies Record<string, Record<Locale, string>>

export function YoutubeWatch({
  id, title, heading, sub, seconds, locale,
}: {
  /** YouTube video id. */
  id: string
  /** The video's own title; shown as the caption and used to name the player. */
  title: string
  /** The card's heading, in the page's language ("Watch the video"). */
  heading: string
  /** A short line under the heading (the sage's name, or what the video is). */
  sub?: string
  seconds?: number
  locale: Locale
}) {
  const [loaded, setLoaded] = useState(false)
  const length = seconds ? durationLabel(seconds) : ''

  return (
    <section aria-label={heading}
      className="watch-card relative overflow-hidden rounded-2xl border border-[#ff3b3b]/25 bg-gradient-to-br from-[#ff3b3b]/[0.08] via-ink-800/40 to-ink-800/20 p-4 md:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#ff0033] text-white shadow-[0_0_24px_rgba(255,0,51,0.3)]">
          <PlayIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg font-bold leading-tight text-ink-50">{heading}</h2>
          {sub && <p dir="auto" className="truncate text-xs font-sans text-ink-400">{sub}</p>}
        </div>
        <a href={watchUrl(id)} target="_blank" rel="noopener noreferrer"
          className="hidden flex-shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-sans text-[#ff6b6b] [[data-theme=light]_&]:text-[#b3002a] hover:bg-[#ff3b3b]/10 sm:inline-flex">
          {S.open[locale]} <ExternalIcon />
          <span className="sr-only">{S.newTab[locale]}</span>
        </a>
      </div>

      {loaded ? (
        <div className="no-print mt-4 aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            title={`${S.frame[locale]} — ${title}`}
            src={embedUrl(id, locale)}
            className="block h-full w-full border-0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <div className="no-print mt-4">
          <p dir="auto" className="font-serif text-base leading-snug text-ink-100">{title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" onClick={() => { track('video_play', { locale }); setLoaded(true) }}
              className="group inline-flex items-center gap-2 rounded-full bg-[#ff0033] px-4 py-2 text-sm font-sans font-semibold text-white shadow-lg shadow-[#ff0033]/20 transition hover:scale-[1.03] hover:bg-[#ff2a55] focus-visible:outline-offset-4 motion-reduce:hover:scale-100">
              <PlayIcon className="h-4 w-4" />
              {S.play[locale]}
              {length && <span className="text-xs font-normal opacity-80" dir="ltr">· {length}</span>}
            </button>
            <span className="text-[11px] font-sans text-ink-500">{S.privacy[locale]}</span>
          </div>
        </div>
      )}

      <a href={watchUrl(id)} target="_blank" rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs font-sans text-[#ff6b6b] [[data-theme=light]_&]:text-[#b3002a] hover:underline sm:hidden">
        {S.open[locale]} <ExternalIcon />
        <span className="sr-only">{S.newTab[locale]}</span>
      </a>
    </section>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
