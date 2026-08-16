import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ulluacifirzywhmzkvkr.supabase.co'

/** Service-role Supabase client — bypasses RLS entirely. Server-only, and
 *  only for tables that are intentionally locked to service_role (e.g.
 *  anonymous_sessions, whose RLS policies are FOR ... USING (false) for
 *  every operation from the browser). Never import this from a client
 *  component or expose SUPABASE_SERVICE_ROLE_KEY to the browser. */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createSupabaseClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
