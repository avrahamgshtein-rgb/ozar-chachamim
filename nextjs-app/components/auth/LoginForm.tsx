'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-auth/client'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export function LoginForm({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      // Log the real Supabase error — the code/status distinguish "wrong
      // password" from "email not confirmed", a misconfigured project URL,
      // a network/CORS failure, etc., none of which look the same to the user.
      console.error('[login] signInWithPassword failed:', {
        message: error.message, status: error.status, code: (error as { code?: string }).code,
      })
      if (error.message === 'Email not confirmed') {
        setError(tr(locale,
          'האימייל עדיין לא אושר. אשר אותו קודם (בדוא"ל או ידנית ב-Supabase) ואז נסה שוב.',
          'Email not confirmed yet. Confirm it first (via email or manually in Supabase), then try again.',
          'Email ещё не подтверждён. Сначала подтвердите его, затем повторите попытку.'))
      } else if (error.message === 'Invalid login credentials') {
        setError(tr(locale, 'אימייל או סיסמה שגויים', 'Incorrect email or password', 'Неверный email или пароль'))
      } else {
        setError(`${tr(locale, 'שגיאה', 'Error', 'Ошибка')}: ${error.message}`)
      }
      return
    }
    router.push(`/${locale}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label className="block text-xs font-sans text-ink-400 mb-1.5">
          {tr(locale, 'אימייל', 'Email', 'Email')}
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-ink-800/50 border border-ink-700/50 text-ink-100 text-sm
                     focus:outline-none focus:border-gold-500/60 transition-colors"
          dir="ltr"
        />
      </div>
      <div>
        <label className="block text-xs font-sans text-ink-400 mb-1.5">
          {tr(locale, 'סיסמה', 'Password', 'Пароль')}
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-ink-800/50 border border-ink-700/50 text-ink-100 text-sm
                     focus:outline-none focus:border-gold-500/60 transition-colors"
          dir="ltr"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-gold-500/20 border border-gold-500/50 text-gold-300
                   text-sm font-sans font-semibold hover:bg-gold-500/30 transition-colors disabled:opacity-50"
      >
        {loading
          ? tr(locale, 'מתחבר…', 'Signing in…', 'Вход…')
          : tr(locale, 'התחברות', 'Sign in', 'Войти')}
      </button>

      <p className="text-xs text-ink-500 text-center">
        {tr(locale, 'אין לך חשבון?', "Don't have an account?", 'Нет аккаунта?')}{' '}
        <Link href={`/${locale}/auth/signup`} className="text-gold-400 hover:text-gold-300">
          {tr(locale, 'הרשמה', 'Sign up', 'Регистрация')}
        </Link>
      </p>
    </form>
  )
}
