'use client'

import { usePathname } from 'next/navigation'
import type { Locale } from '@/lib/types'
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT, UI } from '@/lib/i18n'

/**
 * The same page in the other two languages, for SiteTopBar. `path` is the page's path after the
 * locale; with `follow` the links take the current address instead, for a page that keeps its
 * state in it (the tower writes the chosen sage there, and Next.js passes history.replaceState
 * on to usePathname).
 */
export function LocaleLinks({ locale, path, follow = false }: { locale: Locale; path: string; follow?: boolean }) {
  const pathname = usePathname()
  const rest = follow && pathname ? pathname.replace(/^\/(?:he|en|ru)(?=\/|$)/, '') : path
  return (
    <nav aria-label={UI[locale].languageMenu}>
      <ul className="flex items-center gap-1">
        {LOCALES.map(l => (
          <li key={l}>
            {l === locale ? (
              <span
                aria-current="page"
                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-gold-500/15 px-2 font-sans text-xs font-semibold text-gold-300"
              >
                <span aria-hidden>{LOCALE_SHORT[l]}</span>
                <span className="sr-only">{LOCALE_NAMES[l]}</span>
              </span>
            ) : (
              <a
                href={`/${l}${rest}`}
                hrefLang={l}
                lang={l}
                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg px-2 font-sans text-xs text-ink-300 transition-colors hover:bg-ink-700/50 hover:text-ink-100"
              >
                <span aria-hidden>{LOCALE_SHORT[l]}</span>
                <span className="sr-only">{LOCALE_NAMES[l]}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
