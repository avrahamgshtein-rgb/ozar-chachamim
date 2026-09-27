'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { isValidLocale, tr, UI } from '@/lib/i18n'
import { ERA_LABELS, ERA_COLORS, TAB_META } from '@/lib/types'
import type { Locale, Sage, Tab } from '@/lib/types'
import { searchSagesLocal } from '@/lib/search'
import { displayName } from '@/lib/displayName'
import { loadAppShellData } from '@/lib/appShellDataLoader'
import { fetchContentOverlay } from '@/lib/contentOverlay'
import { SiteTopBar } from './SiteTopBar'

const VIEWS: Tab[] = ['graph', 'map', 'traditions', 'ideas', 'timeline', 'genealogy', 'about']

/**
 * The site's 404, in the reader's language. The locale comes from the URL:
 * Next's not-found files receive no params. Offers a sage search (the static
 * corpus, loaded only once the reader starts searching) and the main views.
 */
export function NotFoundView() {
  const pathname = usePathname() ?? ''
  const segments = pathname.split('/').filter(Boolean)
  const locale: Locale = isValidLocale(segments[0] ?? '') ? (segments[0] as Locale) : 'he'
  const t = UI[locale]

  // /he/sage/999999 → say which id is missing. /he/sage/רמבם → search for it.
  const sageIdx = segments.indexOf('sage')
  const missing = sageIdx >= 0 ? safeDecode(segments[sageIdx + 1] ?? '') : ''
  const missingId = /^\d+$/.test(missing) ? missing : ''
  const guess = missing && !missingId ? missing.replace(/[-_+]+/g, ' ') : ''

  const [query, setQuery] = useState(guess)
  const [corpus, setCorpus] = useState<Array<{ sage: Sage; name: string }> | null>(null)
  const loading = useRef(false)
  const inputId = useId()
  const hintId = useId()

  function ensureCorpus() {
    if (corpus || loading.current) return
    loading.current = true
    Promise.all([loadAppShellData(), fetchContentOverlay(locale)]).then(([{ sages }, overlay]) => {
      setCorpus(sages.map(s => {
        const localized = overlay?.[s.id]?.label
        // Search both the Hebrew label and the localized name; show the latter.
        const name = displayName(localized ?? (locale !== 'he' && s.name_en ? s.name_en : s.label))
        return { sage: { ...s, name_en: [s.name_en, localized].filter(Boolean).join(' / ') || undefined }, name }
      }))
    }).catch(() => { loading.current = false })
  }

  // A name in the dead URL is worth searching for straight away.
  useEffect(() => { if (guess) ensureCorpus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    if (!corpus || !query.trim()) return []
    const byId = new Map(corpus.map(e => [e.sage.id, e.name]))
    return searchSagesLocal(corpus.map(e => e.sage), query, 6).map(s => ({ sage: s, name: byId.get(s.id) ?? displayName(s.label) }))
  }, [corpus, query])

  const showNoMatch = !!corpus && query.trim().length > 1 && results.length === 0

  return (
    <div className="h-dvh overflow-y-auto bg-ink-900 text-ink-100">
      <SiteTopBar locale={locale} />
      <main id="main" tabIndex={-1} className="relative">
        {/* Soft gold glow behind the heading, as on the home canvas. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 0%, rgb(var(--gold-500-rgb) / 0.10), transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 pt-14 pb-20 text-center animate-fade-in">
          <p aria-hidden className="font-serif text-7xl sm:text-8xl font-bold leading-none text-gold-500/25 select-none">404</p>
          <h1 className="mt-4 font-serif text-3xl sm:text-4xl font-bold text-ink-50">{t.notFoundTitle}</h1>
          <p className="mt-4 font-sans text-base leading-relaxed text-ink-300">
            {missingId
              ? tr(locale,
                  `אין במאגר חכם שהמזהה שלו ${missingId}. אפשר לחפש אותו לפי שמו, או להמשיך לאחת התצוגות.`,
                  `There is no sage with the id ${missingId}. Search for the sage by name, or continue to one of the views.`,
                  `Мудреца с идентификатором ${missingId} нет. Найдите его по имени или перейдите к одному из видов.`)
              : t.notFoundBody}
          </p>

          {/* Sage search */}
          <form
            role="search"
            className="mt-8 text-start"
            onSubmit={e => {
              e.preventDefault()
              if (results[0]) window.location.assign(`/${locale}/sage/${results[0].sage.id}`)
            }}
          >
            <label htmlFor={inputId} className="mb-2 block font-sans text-sm font-semibold text-ink-200">
              {t.notFoundSearch}
            </label>
            <div className="relative">
              <svg className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <circle cx="11" cy="11" r="7" strokeWidth={2} /><path d="M20 20l-3.5-3.5" strokeWidth={2} strokeLinecap="round" />
              </svg>
              <input
                id={inputId}
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={ensureCorpus}
                placeholder={t.notFoundSearchHint}
                aria-describedby={hintId}
                autoComplete="off"
                className={cn(
                  'w-full rounded-xl border border-ink-700 bg-ink-850 py-3 ps-10 pe-4',
                  'font-sans text-base text-ink-100 placeholder:text-ink-400',
                  'transition-colors focus:border-gold-500/60',
                )}
              />
            </div>
            <p id={hintId} className="sr-only" aria-live="polite">
              {results.length ? `${results.length}` : showNoMatch ? t.notFoundNoMatch : ''}
            </p>

            {results.length > 0 && (
              <ul className="mt-2 overflow-hidden rounded-xl border border-ink-700/60 bg-ink-850 divide-y divide-ink-700/50">
                {results.map(({ sage, name }) => (
                  <li key={sage.id}>
                    <Link
                      href={`/${locale}/sage/${sage.id}`}
                      className="flex items-center gap-3 px-4 py-3 min-h-[44px] transition-colors hover:bg-ink-800"
                    >
                      <span aria-hidden className="era-dot" style={{ background: ERA_COLORS[sage.period] }} />
                      <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink-100">{name}</span>
                      <span className="flex-shrink-0 font-sans text-xs text-ink-400">{ERA_LABELS[sage.period]?.[locale]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {showNoMatch && (
              <p className="mt-2 px-1 font-sans text-sm text-ink-400">{t.notFoundNoMatch}</p>
            )}
          </form>

          {/* Main views */}
          <p className="mt-10 font-sans text-sm text-ink-400">{t.notFoundExplore}</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {VIEWS.map(tab => {
              const meta = TAB_META[tab]
              const label = locale === 'he' ? meta.labelHe : locale === 'ru' ? meta.labelRu : meta.labelEn
              return (
                <li key={tab}>
                  <a
                    href={tab === 'graph' ? `/${locale}` : tab === 'about' ? `/${locale}/about` : `/${locale}?tab=${tab}`}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 min-h-[44px]',
                      'glass-light border border-ink-600/40 font-sans text-sm text-ink-200',
                      'transition-colors hover:border-gold-500/40 hover:text-gold-300',
                    )}
                  >
                    <span aria-hidden className="font-mono text-gold-400">{meta.icon === 'temple' ? '◆' : meta.icon}</span>
                    {label}
                  </a>
                </li>
              )
            })}
          </ul>

          <Link
            href={`/${locale}`}
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 min-h-[44px] font-sans text-sm font-bold text-ink-900 transition-colors hover:bg-gold-400"
          >
            {t.goHome}
          </Link>
        </div>
      </main>
    </div>
  )
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s).trim() } catch { return s }
}
