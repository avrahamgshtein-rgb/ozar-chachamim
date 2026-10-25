// Pure: which of the site's languages a visitor's browser asks for, and where a bare path is sent.
// Used by middleware.ts (kept out of it because the middleware imports the auth client and the
// tests should not need it for this).
import { DEFAULT_LOCALE } from './i18n'
import type { Locale } from './types'

/** Language subtags a browser may send for one of ours (`iw` is the old code of Hebrew, still sent by some). */
const ALIASES: Record<string, Locale> = { he: 'he', iw: 'he', en: 'en', ru: 'ru' }

/** The most entries of an Accept-Language header that are read: a real header has a handful. */
const MAX_ENTRIES = 64

/**
 * The best supported language of an Accept-Language header (RFC 9110 §12.5.4): the entries ordered by
 * their q-value (1 when none; `q=0` means "not acceptable" and is skipped), equal values by their
 * place in the header, the first whose primary language we serve wins. `en-US,en;q=0.9,he;q=0.8` is
 * English, `he;q=0.5,ru` is Russian. Nothing we serve, a wildcard alone, an empty or missing header,
 * or one that cannot be read: `fallback` (Hebrew).
 */
export function preferredLocale(header: string | null | undefined, fallback: Locale = DEFAULT_LOCALE): Locale {
  if (!header) return fallback
  const entries: Array<{ locale: Locale; q: number; at: number }> = []
  header.split(',').slice(0, MAX_ENTRIES).forEach((part, at) => {
    const [tag, ...params] = part.split(';')
    const primary = tag.trim().toLowerCase().split('-')[0]
    const locale = ALIASES[primary]
    if (!locale) return
    let q = 1
    for (const p of params) {
      const m = /^\s*q\s*=\s*(\S+)\s*$/i.exec(p)
      if (m) q = /^(0(\.\d{0,3})?|1(\.0{0,3})?)$/.test(m[1]) ? Number(m[1]) : NaN
    }
    if (!(q > 0)) return // q=0, or a weight we cannot read
    entries.push({ locale, q, at })
  })
  entries.sort((a, b) => b.q - a.q || a.at - b.at)
  return entries[0]?.locale ?? fallback
}

/**
 * Where a path with no language prefix goes: `/<locale><path><search>`, and the bare `/` goes straight to
 * `/<locale>`, not to `/<locale>/` (which the framework then redirects again to `/<locale>`, a second hop).
 */
export function localePrefixedPath(locale: Locale, pathname: string, search = ''): string {
  return `/${locale}${pathname === '/' ? '' : pathname}${search}`
}
