'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-auth/client'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export function SignupForm({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}` },
    })
    setLoading(false)
    if (error) {
      setError(
        error.message.includes('already registered') || error.message.includes('already exists')
          ? tr(locale, 'כתובת האימייל כבר רשומה', 'This email is already registered', 'Этот email уже зарегистрирован')
          : tr(locale, 'שגיאה בהרשמה, נסה שוב', 'Signup failed, please try again', 'Ошибка регистрации, попробуйте снова'),
      )
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="max-w-sm text-center space-y-2">
        <p className="text-sm text-ink-200">
          {tr(locale,
            'שלחנו לך מייל אימות — לחץ על הקישור כדי להשלים את ההרשמה.',
            "We've sent a confirmation email — click the link to complete signup.",
            'Мы отправили письмо для подтверждения — перейдите по ссылке, чтобы завершить регистрацию.')}
        </p>
      </div>
    )
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
          {tr(locale, 'סיסמה (6 תווים לפחות)', 'Password (min. 6 characters)', 'Пароль (мин. 6 символов)')}
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
          ? tr(locale, 'נרשם…', 'Signing up…', 'Регистрация…')
          : tr(locale, 'הרשמה', 'Sign up', 'Зарегистрироваться')}
      </button>

      <p className="text-xs text-ink-500 text-center">
        {tr(locale, 'כבר יש לך חשבון?', 'Already have an account?', 'Уже есть аккаунт?')}{' '}
        <Link href={`/${locale}/auth/login`} className="text-gold-400 hover:text-gold-300">
          {tr(locale, 'התחברות', 'Sign in', 'Войти')}
        </Link>
      </p>
    </form>
  )
}
