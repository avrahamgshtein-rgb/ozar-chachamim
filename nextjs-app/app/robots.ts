import type { MetadataRoute } from 'next'
import { LOCALES } from '@/lib/i18n'
import { SITE_URL } from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // API routes, the auth callback, and the per-locale sign-in pages.
      disallow: ['/api/', '/auth/', ...LOCALES.map(l => `/${l}/auth/`)],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
