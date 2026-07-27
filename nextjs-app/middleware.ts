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
