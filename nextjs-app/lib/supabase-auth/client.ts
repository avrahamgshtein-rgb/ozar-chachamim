'use client'

// Browser Supabase client for auth flows (@supabase/ssr — cookie-based
// session, works with the server client below so the session survives
// SSR page loads instead of only living in localStorage).
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ulluacifirzywhmzkvkr.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey)
}
