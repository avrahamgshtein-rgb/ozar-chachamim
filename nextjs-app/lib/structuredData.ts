import type { Sage, Period } from '@/lib/types'

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
    url: 'https://ozar-chachamim.vercel.app',
    inLanguage: ['he', 'en', 'ru'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://ozar-chachamim.vercel.app/he?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function getSageSchema(sage: Sage, locale: string) {
  const baseUrl = 'https://ozar-chachamim.vercel.app'

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: sage.label,
    alternateName: sage.name_en,
    description: sage.bio,
    birthDate: sage.birth_year ? `${sage.birth_year}` : undefined,
    deathDate: sage.death_year ? `${sage.death_year}` : undefined,
    birthPlace: sage.location,
    workLocation: sage.location,
    jobTitle: sage.field,
    url: `${baseUrl}/${locale}/sage/${sage.id}`,
    // Reference to external authorities (if available)
    sameAs: [
      // Add Wikipedia, Sefaria, or other links if available
    ],
  }
}

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'אוצר חכמים',
    url: 'https://ozar-chachamim.vercel.app',
    logo: 'https://ozar-chachamim.vercel.app/logo.png',
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
      item: `https://ozar-chachamim.vercel.app/${locale}${i === 0 ? '' : '/' + path.slice(0, i + 1).join('/')}`,
    })),
  }
}
