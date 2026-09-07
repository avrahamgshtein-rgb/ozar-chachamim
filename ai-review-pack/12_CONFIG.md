# Configuration Bundle

Build, routing, styling and deployment configuration, verbatim.

## Contents

- `package.json`
- `next.config.ts`
- `middleware.ts`
- `tailwind.config.ts`
- `tsconfig.json`
- `vercel.json`
- `postcss.config.mjs`
- `.env.example`
- `public/robots.txt`

---

## FILE: package.json

_(38 lines)_

```json
{
  "name": "ozar-chachamim-next",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": "24.x"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.2",
    "zustand": "^5.0.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "d3": "^7.9.0",
    "leaflet": "^1.9.4"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.9.0",
    "tailwindcss": "^3.4.14",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20",
    "@types/d3": "^7.4.3",
    "@types/leaflet": "^1.9.14"
  }
}
```

## FILE: next.config.ts

_(17 lines)_

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
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
```

## FILE: middleware.ts

_(60 lines)_

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { LOCALES, DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ulluacifirzywhmzkvkr.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'

// Refreshes the Supabase auth session cookie on every request (the @supabase/ssr
// pattern — access tokens expire and must be renewed here, not just in the
// browser client, or Server Components see a stale/expired session).
async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  await supabase.auth.getUser()
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if path already starts with a valid locale
  const firstSegment = pathname.split('/')[1]
  if (firstSegment && isValidLocale(firstSegment)) {
    const response = NextResponse.next()
    await refreshSession(request, response)
    return response
  }

  // Detect locale from Accept-Language header
  const acceptLanguage = request.headers.get('accept-language') ?? ''
  const preferredLocale = LOCALES.find(locale =>
    acceptLanguage.toLowerCase().includes(locale)
  ) ?? DEFAULT_LOCALE

  const redirectUrl = new URL(`/${preferredLocale}${pathname}`, request.url)
  return NextResponse.redirect(redirectUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

## FILE: tailwind.config.ts

_(100 lines)_

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // צבעים דרך משתני CSS — מאפשר מצב בהיר/כהה בהחלפת data-theme
        ink: {
          950: 'rgb(var(--ink-950-rgb) / 0.5)',
          900: 'rgb(var(--ink-900-rgb) / <alpha-value>)',
          850: 'rgb(var(--ink-850-rgb) / <alpha-value>)',
          800: 'rgb(var(--ink-800-rgb) / <alpha-value>)',
          700: 'rgb(var(--ink-700-rgb) / <alpha-value>)',
          600: 'rgb(var(--ink-600-rgb) / <alpha-value>)',
          500: 'rgb(var(--ink-500-rgb) / <alpha-value>)',
          400: 'rgb(var(--ink-400-rgb) / <alpha-value>)',
          300: 'rgb(var(--ink-300-rgb) / <alpha-value>)',
          200: 'rgb(var(--ink-200-rgb) / <alpha-value>)',
          100: 'rgb(var(--ink-100-rgb) / <alpha-value>)',
          50:  'rgb(var(--ink-50-rgb) / <alpha-value>)',
        },
        gold: {
          600: 'rgb(var(--gold-600-rgb) / <alpha-value>)',
          500: 'rgb(var(--gold-500-rgb) / <alpha-value>)',
          400: 'rgb(var(--gold-400-rgb) / <alpha-value>)',
          300: 'rgb(var(--gold-300-rgb) / <alpha-value>)',
          200: 'rgb(var(--gold-200-rgb) / <alpha-value>)',
          100: 'rgb(var(--gold-100-rgb) / <alpha-value>)',
        },
        era: {
          'second-temple': '#8e44ad',
          tannaim:         '#e74c3c',
          amoraim:         '#e67e22',
          geonim:          '#f1c40f',
          rishonim:        '#27ae60',
          acharonim:       '#2980b9',
          modern:          '#1abc9c',
        },
        region: {
          ashkenaz:        '#43a047',
          'east-europe':   '#c0ca33',
          tsarfat:         '#ec407a',
          provence:        '#f9a825',
          sefarad:         '#1e88e5',
          italy:           '#26c6da',
          'north-africa':  '#8e24aa',
          mizrach:         '#ef6c00',
          'eretz-israel':  '#00897b',
          other:           '#90a4ae',
        },
      },
      fontFamily: {
        serif: ['"Frank Ruhl Libre"', 'Georgia', 'serif'],
        sans:  ['Heebo', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-in-end': 'slideInEnd 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-in-up':  'slideInUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'drawer-open':  'drawerOpen 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideInEnd: {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        slideInUp: {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        drawerOpen: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
      },
      boxShadow: {
        'glass':      '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-lg':   '0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        'gold-glow':  '0 0 20px rgba(201,151,58,0.25)',
        'sage-card':  '0 2px 12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}

export default config
```

## FILE: tsconfig.json

_(24 lines)_

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## FILE: vercel.json

_(4 lines)_

```json
{
  "framework": "nextjs"
}
```

## FILE: postcss.config.mjs

_(9 lines)_

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config
```

## FILE: .env.example

_(22 lines)_

```
# Environment Configuration for אוצר חכמים (Phase 5: Monitoring)

# ── Error Tracking (Sentry) ────────────────────────────────
# Setup: https://sentry.io → Create project → Get DSN
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
# SENTRY_AUTH_TOKEN=sntrys_xxxxx (optional, for source maps)

# ── Vercel Analytics (Automatic) ───────────────────────────
# Auto-enabled on Vercel deployments (https://vercel.com/analytics)
# No config needed — Web Vitals tracked automatically

# ── Development Settings ───────────────────────────────────
NODE_ENV=production

# ── Build Memory ───────────────────────────────────────────
# Use if encountering "Jest worker" errors during build
# NODE_OPTIONS=--max-old-space-size=4096

# ── Database (Optional: Supabase) ──────────────────────────
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

## FILE: public/robots.txt

_(13 lines)_

```
# Search engine crawling rules
User-agent: *
Allow: /
Disallow: /api/
Disallow: /.next/
Disallow: /admin/

# Sitemaps
Sitemap: https://ozar-chachamim.vercel.app/sitemap.xml

# Crawl delay (respectful crawling)
Crawl-delay: 1
```

