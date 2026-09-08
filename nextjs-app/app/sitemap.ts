import type { MetadataRoute } from 'next'
import { getAllSages } from '@/lib/serverData'
import { SITE_URL } from '@/lib/siteUrl'

const LOCALES = ['he', 'en', 'ru'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  // Locale home pages. Hebrew is canonical, so it carries the highest priority.
  for (const locale of LOCALES) {
    entries.push({
      url: `${SITE_URL}/${locale}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: locale === 'he' ? 1 : 0.9,
    })
  }

  // About is the only real sub-route; the visualisation tabs are query-string
  // state on the home page, not distinct documents, so they are not listed.
  for (const locale of LOCALES) {
    entries.push({
      url: `${SITE_URL}/${locale}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  // Sage pages — the substantive, indexable content of the site.
  for (const sage of getAllSages()) {
    const id = encodeURIComponent(String(sage.id))
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE_URL}/${locale}/sage/${id}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: locale === 'he' ? 0.8 : 0.6,
      })
    }
  }

  return entries
}
