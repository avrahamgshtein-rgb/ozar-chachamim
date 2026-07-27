'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

interface ChatMessageView {
  role: 'user' | 'assistant'
  content: string
  noMatch?: boolean
}

interface Quota {
  limit: number
  remaining: number
}

export function ChatWidget({ locale }: { locale: Locale }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isRtl = locale === 'he'

  useEffect(() => {
    fetch(`/api/chat?locale=${locale}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return
        setAuthenticated(!!data.authenticated)
        setQuota(data.quota ?? null)
      })
      .catch(() => {})
  }, [locale])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, isOpen])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const message = input.trim()
    if (!message || sending) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: message }])
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, locale }),
      })
      const data = await res.json()

      if (data.quota) setQuota(data.quota)

      if (!res.ok) {
        if (data.error === 'quota_exhausted') {
          setError(authenticated
            ? tr(locale,
              'נגמרו השאלות החינמיות שלך לתקופה זו.',
              'You have used all your free questions for this period.',
              'У вас закончились бесплатные вопросы за этот период.')
            : tr(locale,
              'נגמרו שאלות הניסיון. הירשם כדי להמשיך לשאול בחינם.',
              'You have used all your trial questions. Sign up to keep asking for free.',
              'Пробные вопросы закончились. Зарегистрируйтесь, чтобы продолжить бесплатно.'))
        } else if (data.error === 'session_invalid') {
          setError(tr(locale,
            'החשבון שלך כבר רשום במערכת — התחבר כדי להמשיך.',
            'This session is already linked to an account — please sign in.',
            'Эта сессия уже связана с аккаунтом — войдите, чтобы продолжить.'))
        } else {
          setError(tr(locale, 'משהו השתבש. נסה שוב.', 'Something went wrong. Please try again.', 'Что-то пошло не так. Попробуйте снова.'))
        }
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, noMatch: data.noMatch }])
      if (data.sessionId) setSessionId(data.sessionId)
    } catch {
      setError(tr(locale, 'שגיאת רשת. נסה שוב.', 'Network error. Please try again.', 'Ошибка сети. Попробуйте снова.'))
    } finally {
      setSending(false)
    }
  }

  const quotaExhausted = quota !== null && quota.remaining <= 0

  return (
    <>
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen
          ? tr(locale, 'סגור צ׳אט', 'Close chat', 'Закрыть чат')
          : tr(locale, 'שאל שאלה', 'Ask a question', 'Задать вопрос')}
        title={tr(locale, 'שאל את החכמים', 'Ask the sages', 'Спросите мудрецов')}
        className={cn(
          'fixed bottom-20 start-4 z-40',
          'w-14 h-14 rounded-full',
          'glass border border-gold-500/30',
          'flex items-center justify-center',
          'shadow-gold-glow transition-all duration-200',
          'hover:border-gold-400/60 hover:scale-105 active:scale-95',
          isOpen && 'border-gold-400/60 bg-ink-700/80',
        )}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.08-.163-3.02-.463L3 21l1.5-4.5C3.55 15.163 3 13.62 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {quota !== null && quota.remaining > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-500 text-ink-900 text-[10px] font-bold flex items-center justify-center">
            {quota.remaining}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className={cn(
            'fixed z-40 flex flex-col',
            'bottom-36 start-4 w-[calc(100vw-2rem)] max-w-sm h-[60vh] max-h-[520px]',
            'glass rounded-2xl border border-gold-500/20 shadow-glass overflow-hidden',
            'animate-fade-in',
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700/50">
            <div>
              <h3 className="font-serif text-sm font-bold text-gold-300">
                {tr(locale, 'שאל את החכמים', 'Ask the Sages', 'Спросите мудрецов')}
              </h3>
              {quota && (
                <QuotaBar quota={quota} locale={locale} authenticated={authenticated} />
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label={tr(locale, 'סגור', 'Close', 'Закрыть')}
              className="text-ink-500 hover:text-ink-200 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-ink-500 leading-relaxed">
                {authenticated
                  ? tr(locale,
                    'שאל כל שאלה על חכמי ישראל, תולדותיהם וקשריהם.',
                    'Ask anything about the sages of Israel, their lives, and their connections.',
                    'Задайте любой вопрос о еврейских мудрецах, их жизни и связях.')
                  : tr(locale,
                    'שאל שאלה בלי להירשם — יש לך כמה שאלות ניסיון בחינם.',
                    "Ask a question without signing up — you have a few free trial questions.",
                    'Задайте вопрос без регистрации — у вас есть несколько бесплатных пробных вопросов.')}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'ms-auto bg-gold-500/15 border border-gold-500/30 text-ink-100'
                    : 'me-auto bg-ink-800/60 border border-ink-700/50 text-ink-200',
                )}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="me-auto max-w-[85%] rounded-xl px-3 py-2 text-xs bg-ink-800/60 border border-ink-700/50 text-ink-500">
                {tr(locale, 'חושב…', 'Thinking…', 'Думаю…')}
              </div>
            )}
            {error && (
              <div className="rounded-xl px-3 py-2 text-xs bg-red-500/10 border border-red-500/30 text-red-300">
                {error}
                {!authenticated && quotaExhausted && (
                  <Link href={`/${locale}/auth/signup`} className="block mt-1.5 font-semibold text-gold-300 hover:text-gold-200 underline">
                    {tr(locale, 'הרשמה חינם ←', 'Sign up for free →', 'Регистрация бесплатно →')}
                  </Link>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-ink-700/50">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={sending || quotaExhausted}
              placeholder={quotaExhausted
                ? tr(locale, 'נגמרו השאלות החינמיות', 'Out of free questions', 'Бесплатные вопросы закончились')
                : tr(locale, 'הקלד שאלה…', 'Type a question…', 'Введите вопрос…')}
              className="flex-1 px-3 py-2 rounded-lg bg-ink-800/50 border border-ink-700/50 text-ink-100 text-xs
                         focus:outline-none focus:border-gold-500/60 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || quotaExhausted}
              className="px-3 py-2 rounded-lg bg-gold-500/20 border border-gold-500/50 text-gold-300
                         text-xs font-sans font-semibold hover:bg-gold-500/30 transition-colors disabled:opacity-40"
            >
              {tr(locale, 'שלח', 'Send', 'Отпр.')}
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function QuotaBar({ quota, locale, authenticated }: { quota: Quota; locale: Locale; authenticated: boolean }) {
  const used = Math.max(quota.limit - quota.remaining, 0)
  const pct = quota.limit > 0 ? Math.min((used / quota.limit) * 100, 100) : 100
  return (
    <div className="mt-1 w-36">
      <div className="flex items-center justify-between text-[10px] text-ink-500 mb-0.5">
        <span>
          {authenticated
            ? tr(locale, 'שאלות שנותרו', 'Questions left', 'Вопросов осталось')
            : tr(locale, 'ניסיון חינם', 'Free trial', 'Пробный период')}
        </span>
        <span>{quota.remaining}/{quota.limit}</span>
      </div>
      <div className="h-1 rounded-full bg-ink-700/60 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', quota.remaining > 0 ? 'bg-gold-500/70' : 'bg-red-500/60')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
