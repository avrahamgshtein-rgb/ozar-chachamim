import type { Sage, Period } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'
import { labelParts } from '@/lib/displayName'

/**
 * Generate JSON-LD structured data for SEO
 * Used by Google, Bing, and other search engines
 */

export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'אוצר חכמים — Ozar Chachamim',
    description: 'Interactive knowledge graph of Jewish sages through the ages',
    url: SITE_URL,
    inLanguage: ['he', 'en', 'ru'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/he?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export interface SageSchemaResearch {
  title: string
  wordCount: number
  /** BCP 47 language of the text, e.g. 'he'. */
  inLanguage: string
}

/** A year as an ISO 8601 date: "1040", "0135". BCE years are left out (schema.org has no clean form for them). */
function isoYear(year: number | undefined): string | undefined {
  if (year == null || !Number.isFinite(year) || year <= 0) return undefined
  return String(Math.trunc(year)).padStart(4, '0')
}

/**
 * schema.org Person for a sage page. Dates are emitted only when
 * `date_precision` is 'exact' — a century window is not a birth date.
 * `sameAs` carries the podcast episode, and `subjectOf` the research
 * papers shown on the page. `sage` should already be localized.
 */
export function getSageSchema(
  sage: Sage,
  locale: string,
  opts: { url?: string; research?: SageSchemaResearch[]; alternateNames?: string[] } = {},
) {
  const url = opts.url ?? `${SITE_URL}/${locale}/sage/${sage.id}`
  const parts = labelParts(sage.label)
  const alternateName = [...new Set([parts.fullName, sage.name_en, ...(opts.alternateNames ?? [])].filter(
    (n): n is string => !!n && n.trim() !== '' && n !== parts.name,
  ))]
  const exact = sage.date_precision === 'exact'
  const research = opts.research ?? []

  return {
    '@type': 'Person',
    '@id': `${url}#person`,
    name: parts.name,
    alternateName: alternateName.length ? alternateName : undefined,
    description: sage.bio || sage.core_concept || undefined,
    birthDate: exact ? isoYear(sage.birth_year) : undefined,
    deathDate: exact ? isoYear(sage.death_year) : undefined,
    workLocation: sage.location ? { '@type': 'Place', name: sage.location } : undefined,
    knowsAbout: sage.field || undefined,
    url,
    sameAs: sage.spotify_url ? [sage.spotify_url] : undefined,
    subjectOf: research.length
      ? research.map(doc => ({
          '@type': 'Article',
          headline: doc.title.length > 110 ? doc.title.slice(0, 109).trimEnd() + '…' : doc.title,
          url: `${url}#research`,
          inLanguage: doc.inLanguage,
          wordCount: doc.wordCount,
          about: { '@id': `${url}#person` },
          isPartOf: { '@type': 'WebSite', name: 'אוצר חכמים — Ozar Chachamim', url: SITE_URL },
        }))
      : undefined,
  }
}

/** Home → era (the app filtered to it) → sage. */
export function getSageBreadcrumbSchema(
  locale: string,
  crumbs: { home: string; era: { name: string; period: Period }; sage: { name: string; url: string } },
) {
  const home = `${SITE_URL}/${locale}`
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: crumbs.home, item: home },
      { '@type': 'ListItem', position: 2, name: crumbs.era.name, item: `${home}?periods=${crumbs.era.period}` },
      { '@type': 'ListItem', position: 3, name: crumbs.sage.name, item: crumbs.sage.url },
    ],
  }
}

/**
 * JSON for a <script type="application/ld+json">: several nodes in one
 * @graph, with "<" escaped so text can never close the script element.
 */
export function jsonLdScript(...nodes: object[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c')
}

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'אוצר חכמים',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'A knowledge graph platform for Jewish sages and their traditions',
    sameAs: [
      // Add social media links if available
      // 'https://twitter.com/ozarchachamim',
      // 'https://www.facebook.com/ozarchachamim',
    ],
  }
}

export function getBreadcrumbSchema(locale: string, path: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: path.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item,
      item: `${SITE_URL}/${locale}${i === 0 ? '' : '/' + path.slice(0, i + 1).join('/')}`,
    })),
  }
}
