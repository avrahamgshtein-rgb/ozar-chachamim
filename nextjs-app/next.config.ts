import type { NextConfig } from 'next'

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
