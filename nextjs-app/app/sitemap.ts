import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ozar-chachamim.vercel.app'
  const locales = ['he', 'en', 'ru']
  const tabs = ['graph', 'map', 'traditions', 'ideas', 'timeline', 'genealogy', 'about']

  const entries: MetadataRoute.Sitemap = []

  // Home pages for each locale
  locales.forEach(locale => {
    entries.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    })
  })

  // Tab pages for each locale
  locales.forEach(locale => {
    tabs.forEach(tab => {
      if (tab !== 'graph') { // graph is default, don't duplicate
        entries.push({
          url: `${baseUrl}/${locale}?tab=${tab}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    })
  })

  return entries
}
