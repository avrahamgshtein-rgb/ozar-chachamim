import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // The sage page reads public/research/<id>.json with fs at request time so the
  // text is in the initial HTML. Those files are not statically imported, so
  // tracing cannot infer them — include them explicitly for that route.
  outputFileTracingIncludes: {
    '/[locale]/sage/[id]': ['./public/research/**'],
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
