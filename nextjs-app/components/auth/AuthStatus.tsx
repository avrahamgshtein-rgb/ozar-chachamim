'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-auth/client'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export function AuthStatus({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoaded(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}`)
    router.refresh()
  }

  if (!loaded) return null

  if (!user) {
    return (
      <Link
        href={`/${locale}/auth/login`}
        className={cn(
          'px-3 py-1.5 rounded-xl text-xs font-sans font-medium',
          'glass-light border border-ink-600/40',
          'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
          'transition-all duration-150',
        )}
      >
        {tr(locale, 'התחברות', 'Sign in', 'Войти')}
      </Link>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className={cn(
        'px-3 py-1.5 rounded-xl text-xs font-sans font-medium max-w-[140px] truncate',
        'glass-light border border-ink-600/40',
        'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
        'transition-all duration-150',
      )}
      title={tr(locale, 'התנתקות', 'Sign out', 'Выйти')}
    >
      {user.email}
    </button>
  )
}
