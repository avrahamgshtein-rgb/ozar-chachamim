'use client'

// The sage page's small client controls: share (Web Share API, else copy the
// link with a toast), print, and the dark/light toggle. The page lives
// outside the app shell, so the theme is set here the same way the store
// does it: html[data-theme] plus localStorage 'ozar-theme'.
import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/types'
import { copyText, showToast } from './Toast'

const S = {
  share: { he: 'שיתוף', en: 'Share', ru: 'Поделиться' },
  print: { he: 'הדפסה', en: 'Print', ru: 'Печать' },
  copied: { he: 'הקישור הועתק', en: 'Link copied', ru: 'Ссылка скопирована' },
  copyFailed: { he: 'לא ניתן להעתיק את הקישור', en: 'Could not copy the link', ru: 'Не удалось скопировать ссылку' },
  toLight: { he: 'מעבר למצב בהיר', en: 'Switch to light theme', ru: 'Светлая тема' },
  toDark: { he: 'מעבר למצב כהה', en: 'Switch to dark theme', ru: 'Тёмная тема' },
} satisfies Record<string, Record<Locale, string>>

const btn =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-ink-700/50 bg-ink-800/40 px-2.5 ' +
  'text-xs font-sans text-ink-300 transition-colors hover:border-gold-500/40 hover:text-gold-300'

export function ShareButton({ title, text, locale, withLabel = false }: {
  title: string; text?: string; locale: Locale; withLabel?: boolean
}) {
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}`
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean }
    const data: ShareData = { title, text, url }
    if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare(data))) {
      try {
        await nav.share(data)
        return
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return // the user closed the sheet
      }
    }
    showToast((await copyText(url)) ? S.copied[locale] : S.copyFailed[locale])
  }
  return (
    <button type="button" onClick={share} className={btn} aria-label={S.share[locale]} title={S.share[locale]}>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {withLabel && <span>{S.share[locale]}</span>}
    </button>
  )
}

export function PrintButton({ locale, withLabel = false }: { locale: Locale; withLabel?: boolean }) {
  return (
    <button type="button" onClick={() => window.print()} className={btn} aria-label={S.print[locale]} title={S.print[locale]}>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </svg>
      {withLabel && <span>{S.print[locale]}</span>}
    </button>
  )
}

export function ThemeToggle({ locale }: { locale: Locale }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('ozar-theme', next) } catch { /* noop */ }
    setTheme(next)
  }
  const label = theme === 'dark' ? S.toLight[locale] : S.toDark[locale]
  return (
    <button type="button" onClick={toggle} className={btn} aria-label={label} title={label}>
      {theme === 'dark' ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
