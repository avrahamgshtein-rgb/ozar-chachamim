import type { NextConfig } from 'next'
import { legacyRedirects } from './lib/legacyRedirects'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // The sage page reads public/research/<id>.json with fs at request time so the
  // text is in the initial HTML. Those files are not statically imported, so
  // tracing cannot infer them — include them explicitly for that route.
  outputFileTracingIncludes: {
    '/[locale]/sage/[id]': ['./public/research/**'],
    // The share card reads its fonts and the medallion with fs.
    '/[locale]/sage/[id]/opengraph-image': ['./assets/og/**'],
    '/[locale]/today/story': ['./assets/og/**'],
    // The card and the status image of a path (Six Steps) read the same fonts, medallion and portraits.
    '/[locale]/tower/path/[from]/[to]/opengraph-image': ['./assets/og/**'],
    '/[locale]/tower/path/[from]/[to]/story': ['./assets/og/**'],
  },
  // Whoever follows the address the site was shared under (the project's old Vercel host) lands on the
  // same page of the site's own domain, with the same query string (lib/legacyRedirects.ts, lib/siteUrl.ts).
  async redirects() {
    return legacyRedirects()
  },
  // The service worker must never be served from a stale cache, or a fix to it would not reach
  // visitors until the old copy expired; it may control the whole site.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
  // Everyone gets the page's metadata (title, description, canonical, hreflang, Open Graph) inside the
  // <head> of the first response. By default Next.js streams it into the <body> for any client that is
  // not on its short list of crawlers that cannot run scripts (Googlebot is deliberately not on it), and
  // the browser moves it into the head only once the page's script has run.
  htmlLimitedBots: /.*/,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ulluacifirzywhmzkvkr.supabase.co',
      },
    ],
  },
}

export default nextConfig
