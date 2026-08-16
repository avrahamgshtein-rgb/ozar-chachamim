import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ulluacifirzywhmzkvkr.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'

/** Server Component / Route Handler Supabase client — reads the user's
 *  session from cookies so RLS-scoped queries (auth.uid()) work server-side.
 *  Cookie writes are wrapped in try/catch: Server Components can't set
 *  cookies (Next.js throws), which is fine as long as the middleware below
 *  is refreshing the session on every request. */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component — safe to ignore, middleware
          // refreshes the session cookie on the next request.
        }
      },
    },
  })
}
