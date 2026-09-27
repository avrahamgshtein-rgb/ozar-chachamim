import type { MetadataRoute } from 'next'
import { getAllSages } from '@/lib/serverData'
import { LOCALES } from '@/lib/i18n'
import { localeAlternates } from '@/lib/siteMetadata'
import { SITE_URL } from '@/lib/siteUrl'

// Every indexable document, once per locale, each entry carrying the hreflang
// alternates of its siblings (he/en/ru plus x-default → he).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  function add(path: string, changeFrequency: 'weekly' | 'monthly', priority: (l: string) => number) {
    const languages = localeAlternates(path)
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified,
        changeFrequency,
        priority: priority(locale),
        alternates: { languages },
      })
    }
  }

  // Home. Hebrew is canonical, so it carries the highest priority. The
  // visualisation tabs are query-string state on this page, not documents.
  add('', 'weekly', l => (l === 'he' ? 1 : 0.9))

  // About.
  add('/about', 'monthly', () => 0.5)

  // Sage pages — the substantive, indexable content of the site.
  for (const sage of getAllSages()) {
    add(`/sage/${encodeURIComponent(String(sage.id))}`, 'monthly', l => (l === 'he' ? 0.8 : 0.6))
  }

  return entries
}
