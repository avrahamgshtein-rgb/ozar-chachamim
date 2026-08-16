import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-auth/server'

// Handles the redirect from Supabase's signup-confirmation / magic-link
// email: exchanges the one-time `code` for a real session cookie, then
// sends the user on to wherever they were headed (default: home).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/he/auth/login?error=auth_callback_failed`)
}
