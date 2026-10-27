import type { MetadataRoute } from 'next'
import { getAllSages } from '@/lib/serverData'
import { LOCALES } from '@/lib/i18n'
import { localeAlternates } from '@/lib/siteMetadata'
import { SITE_URL } from '@/lib/siteUrl'
import { kidsBookSitemapPaths } from '@/lib/kidsBooks'

// When the pages' content was last built. A module constant, not `new Date()`
// inside the function: the sitemap is prerendered at build time, so the date is
// the build's, the same for every request until the next deploy. A date that
// moved on every fetch would tell Google that 1,500 pages change all the time,
// and it would stop trusting the field.
const BUILD_TIME = new Date()

// Every indexable document, once per locale, each entry carrying the hreflang
// alternates of its siblings (he/en/ru plus x-default → he).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = BUILD_TIME
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

  // The pages that change with the calendar, not with a deploy (the date, the
  // day's sage, the day's riddle and chain): no lastModified, since the build
  // date would be wrong for them. Each carries the hreflang alternates too.
  function addDaily(path: string, priority: number) {
    const languages = localeAlternates(path)
    for (const locale of LOCALES) {
      entries.push({ url: `${SITE_URL}/${locale}${path}`, changeFrequency: 'daily', priority, alternates: { languages } })
    }
  }

  // Home. Hebrew is canonical, so it carries the highest priority. The
  // visualisation tabs are query-string state on this page, not documents.
  add('', 'weekly', l => (l === 'he' ? 1 : 0.9))

  // About.
  add('/about', 'monthly', () => 0.5)

  // The plain index of every sage: names and links, a crawlable way to each sage page.
  add('/sages', 'weekly', () => 0.7)

  // Today: the hillula and the sage of the day, in every language.
  addDaily('/today', 0.7)
  for (const l of ['he', 'en', 'ru']) entries.push({ url: `${SITE_URL}/${l}/tower`, lastModified, changeFrequency: 'weekly', priority: 0.6, alternates: { languages: localeAlternates('/tower') } })
  // The daily sage riddle, in every language.
  addDaily('/riddle', 0.6)
  // "Sage Chain": the path picker and the daily connect game, in every language (the tower's path pages are noindex).
  addDaily('/connect', 0.6)
  // The kids' journey: Hebrew only (the other two addresses are noindex and point here).
  entries.push({ url: `${SITE_URL}/he/kids`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
  // The reading edition of the books: nothing while KIDS_BOOKS_INDEXED (lib/kidsBookLinks.ts) is false, as it is
  // now; the one switch also lets the Hebrew reader pages be indexed.
  for (const path of kidsBookSitemapPaths()) entries.push({ url: `${SITE_URL}${path}`, lastModified, changeFrequency: 'monthly', priority: 0.5 })

  // Sage pages — the substantive, indexable content of the site.
  for (const sage of getAllSages()) {
    add(`/sage/${encodeURIComponent(String(sage.id))}`, 'monthly', l => (l === 'he' ? 0.8 : 0.6))
  }

  return entries
}
