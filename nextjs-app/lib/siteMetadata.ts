// Per-page SEO metadata for the site's own pages (home, about): canonical URL,
// hreflang alternates for all three locales, OpenGraph and Twitter cards.
import type { Metadata } from 'next'
import type { Locale } from './types'
import { LOCALES, OG_LOCALES, UI } from './i18n'
import { SITE_URL } from './siteUrl'

/** Square site emblem, used as the share image for pages without their own. */
export const SHARE_IMAGE = {
  url: '/images/temple-medallion.png',
  width: 1179,
  height: 1179,
}

/** hreflang map for a locale-independent path such as '' or '/about'. */
export function localeAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const l of LOCALES) languages[l] = `${SITE_URL}/${l}${path}`
  languages['x-default'] = `${SITE_URL}/he${path}`
  return languages
}

export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale
  /** Path after the locale prefix: '' for home, '/about' for About. */
  path: string
  /** Page title; omitted for the home page, which uses the layout default. */
  title?: string
  description: string
}): Metadata {
  const t = UI[locale]
  const url = `${SITE_URL}/${locale}${path}`
  const shareTitle = title ? `${title} | ${t.appTitle}` : `${t.appTitle} — ${t.appSubtitle}`
  const image = { ...SHARE_IMAGE, alt: t.appTitle }

  return {
    ...(title ? { title } : {}),
    description,
    alternates: {
      canonical: url,
      languages: localeAlternates(path),
    },
    openGraph: {
      type: 'website',
      siteName: t.appTitle,
      title: shareTitle,
      description,
      url,
      locale: OG_LOCALES[locale],
      alternateLocale: LOCALES.filter(l => l !== locale).map(l => OG_LOCALES[l]),
      images: [image],
    },
    twitter: {
      card: 'summary',
      title: shareTitle,
      description,
      images: [image],
    },
  }
}
