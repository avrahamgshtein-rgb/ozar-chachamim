'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export function UserMenu({ locale }: { locale: Locale }) {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return null

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    })
    setMessage(error
      ? error.message
      : tr(locale, 'קישור כניסה נשלח למייל', 'A sign-in link was sent', 'Ссылка для входа отправлена'))
  }

  async function signOut() {
    await supabase.auth.signOut()
    setOpen(false)
  }

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen(value => !value)}
        className={cn(
          'px-3 py-1.5 rounded-xl text-xs font-sans',
          'glass-light border border-ink-600/40 text-ink-300',
          'hover:text-gold-300 hover:border-gold-500/30 transition-all',
        )}
        aria-expanded={open}
      >
        {user ? tr(locale, 'האזור שלי', 'My library', 'Моя библиотека') : tr(locale, 'כניסה', 'Sign in', 'Войти')}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full end-0 mt-2 z-50 w-72 glass rounded-xl border border-ink-700/50 p-4 shadow-glass-lg">
            {user ? (
              <div className="space-y-3">
                <p className="text-xs text-ink-300 truncate">{user.email}</p>
                <p className="text-xs text-ink-500">
                  {tr(locale, 'הסימניות וההערות נשמרות בחשבונך.', 'Bookmarks and notes are saved to your account.', 'Закладки и заметки сохраняются в аккаунте.')}
                </p>
                <button onClick={signOut} className="text-xs text-gold-300 hover:text-gold-200">
                  {tr(locale, 'יציאה', 'Sign out', 'Выйти')}
                </button>
              </div>
            ) : (
              <form onSubmit={signIn} className="space-y-3">
                <label className="block text-xs text-ink-300">
                  {tr(locale, 'דוא״ל לקבלת קישור כניסה', 'Email for a sign-in link', 'Email для ссылки входа')}
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-ink-600/50 bg-ink-900/70 px-3 py-2 text-ink-100 outline-none focus:border-gold-500/50"
                    dir="ltr"
                  />
                </label>
                <button type="submit" className="w-full rounded-lg bg-gold-500/15 border border-gold-500/30 px-3 py-2 text-xs text-gold-300">
                  {tr(locale, 'שלח קישור', 'Send link', 'Отправить ссылку')}
                </button>
                {message && <p className="text-xs text-ink-400">{message}</p>}
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}
