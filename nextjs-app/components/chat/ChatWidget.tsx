'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { displayName } from '@/lib/displayName'
import type { Locale } from '@/lib/types'
import {
  onAskAboutSage, parseAnswer, starterQuestions, stripIsolates,
  type AskSubject, type Citation,
} from './askAbout'

// Local stand-ins for lib/utils' cn and lib/i18n's tr: the widget now also
// ships on every sage page, whose client bundle has neither tailwind-merge
// nor the UI dictionary. None of the class lists below conflict, so a plain
// join is enough.
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
function tr(locale: Locale, he: string, en: string, ru: string): string {
  return locale === 'he' ? he : locale === 'ru' ? ru : en
}

interface ChatMessageView {
  role: 'user' | 'assistant'
  content: string
  noMatch?: boolean
  /** The route's citation list for this answer (lib/rag/citations.ts). */
  citations?: Citation[]
}

interface Quota {
  limit: number
  remaining: number
}

/**
 * Whether the assistant can take a question. 'unavailable' means the quota
 * check failed (e.g. Supabase unreachable): sending would only fail too, so
 * the panel says so up front instead.
 */
type Status = 'checking' | 'ready' | 'unavailable'

const QUOTA_TIMEOUT_MS = 8000

// Strings new with the sage-scoped chat ("שאלו על החכם").
const S = {
  askingAbout: { he: 'שואלים על', en: 'Asking about', ru: 'Вопрос о' },
  removeScope: { he: 'הסרת ההקשר', en: 'Remove context', ru: 'Убрать контекст' },
  starters: { he: 'אפשר להתחיל מכאן', en: 'Start with', ru: 'Можно начать с' },
  scopedIntro: {
    he: 'התשובות מבוססות על המחקר באתר ועל הנתונים, עם הפניה לסעיף במחקר.',
    en: 'Answers draw on the site’s research and data, and link to the section they cite.',
    ru: 'Ответы опираются на исследования и данные сайта и ссылаются на нужный раздел.',
  },
  sources: { he: 'מקורות מהמחקר', en: 'From the research', ru: 'Источники из исследования' },
  source: { he: 'מקור', en: 'Source', ru: 'Источник' },
  opensPage: { he: 'נפתח בדף החכם', en: 'Opens the sage’s page', ru: 'Откроется страница мудреца' },
  dialog: { he: 'שיחה עם העוזר', en: 'Chat with the assistant', ru: 'Чат с ассистентом' },
} satisfies Record<string, Record<Locale, string>>

interface ChatWidgetProps {
  locale: Locale
  /**
   * 'app': the home page, clear of the bottom tab bar. 'page': a sage page,
   * which has no tab bar; the quota is checked only when the panel first
   * opens, so reading a page costs no request.
   */
  placement?: 'app' | 'page'
  /** The sage the chat starts scoped to (a sage page). */
  initialSubject?: AskSubject
  /** The sage whose page this is: its citations link to headings in place. */
  pageSageId?: string
}

export function ChatWidget({ locale, placement = 'app', initialSubject, pageSageId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [status, setStatus] = useState<Status>('checking')
  const [authenticated, setAuthenticated] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [subject, setSubject] = useState<AskSubject | null>(initialSubject ?? null)
  /** messages.length when the chat was last scoped: starters show until the next question. */
  const [subjectMark, setSubjectMark] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const checkedRef = useRef(false)
  /** Where focus goes once the panel has rendered: set by whoever opened it. */
  const focusOnOpen = useRef<'starter' | 'input' | null>(null)
  const isRtl = locale === 'he'
  const onPage = placement === 'page'

  const checkStatus = useCallback(() => {
    checkedRef.current = true
    setStatus('checking')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), QUOTA_TIMEOUT_MS)
    fetch(`/api/chat?locale=${locale}`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data?.quota) { setStatus('unavailable'); return }
        setAuthenticated(!!data.authenticated)
        setQuota(data.quota)
        setStatus('ready')
      })
      .catch(() => setStatus('unavailable'))
      .finally(() => clearTimeout(timer))
  }, [locale])

  // The home page checks up front; a sage page waits until the panel opens.
  useEffect(() => { if (!onPage) checkStatus() }, [checkStatus, onPage])

  // A check that failed (or never ran) gets another chance when the panel opens
  useEffect(() => {
    if (isOpen && (status === 'unavailable' || !checkedRef.current)) checkStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // "שאלו על החכם" anywhere on the page: open, scoped to that sage.
  useEffect(() => onAskAboutSage(next => {
    setSubject(next)
    setSubjectMark(messagesRef.current.length)
    setError(null)
    focusOnOpen.current = 'starter'
    setIsOpen(true)
  }), [])

  useEffect(() => {
    if (!isOpen || !focusOnOpen.current) return
    const want = focusOnOpen.current
    focusOnOpen.current = null
    const starter = panelRef.current?.querySelector<HTMLButtonElement>('[data-starter]:not(:disabled)')
    if (want === 'starter' && starter) starter.focus()
    else if (inputRef.current && !inputRef.current.disabled) inputRef.current.focus()
    else panelRef.current?.focus()
  })

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, isOpen])

  const close = useCallback(() => {
    setIsOpen(false)
    toggleRef.current?.focus()
  }, [])

  async function send(raw: string) {
    const message = raw.trim()
    if (!message || sending || status === 'unavailable') return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: message }])
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: stripIsolates(message),
          sessionId,
          locale,
          ...(subject ? { sageId: subject.id } : {}),
        }),
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
        } else if (res.status >= 500) {
          // The service behind the assistant is down; say so plainly
          setStatus('unavailable')
          setMessages(prev => prev.slice(0, -1))
          setInput(message)
        } else {
          setError(tr(locale, 'משהו השתבש. נסה שוב.', 'Something went wrong. Please try again.', 'Что-то пошло не так. Попробуйте снова.'))
        }
        return
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        noMatch: data.noMatch,
        citations: Array.isArray(data.citations) ? data.citations : [],
      }])
      if (data.sessionId) setSessionId(data.sessionId)
    } catch {
      setError(tr(locale, 'שגיאת רשת. נסה שוב.', 'Network error. Please try again.', 'Ошибка сети. Попробуйте снова.'))
    } finally {
      setSending(false)
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  /** Scroll the page's reader to a cited heading. False when it is not on this page. */
  const jumpTo = useCallback((anchor: string): boolean => {
    const el = document.getElementById(anchor)
    if (!el) return false
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    try { history.replaceState(null, '', `#${encodeURIComponent(anchor)}`) } catch { /* noop */ }
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
    if (!reduce) {
      el.animate?.(
        [{ backgroundColor: 'rgba(201, 151, 58, 0.3)' }, { backgroundColor: 'rgba(201, 151, 58, 0)' }],
        { duration: 1800, easing: 'ease-out' },
      )
    }
    // On a phone the panel covers the text it just scrolled to.
    if (window.matchMedia('(max-width: 767px)').matches) setIsOpen(false)
    return true
  }, [])

  const quotaExhausted = quota !== null && quota.remaining <= 0
  const unavailable = status === 'unavailable'
  const showStarters = !!subject && messages.length === subjectMark && !unavailable
  const starters = subject ? starterQuestions(subject, locale) : []
  const startersDisabled = sending || quotaExhausted

  return (
    <>
      <button
        ref={toggleRef}
        onClick={() => { focusOnOpen.current = isOpen ? null : 'input'; setIsOpen(o => !o) }}
        aria-label={isOpen
          ? tr(locale, 'סגור צ׳אט', 'Close chat', 'Закрыть чат')
          : tr(locale, 'שאל שאלה', 'Ask a question', 'Задать вопрос')}
        title={tr(locale, 'שאל את החכמים', 'Ask the sages', 'Спросите мудрецов')}
        aria-expanded={isOpen}
        className={cn(
          'no-print fixed',
          onPage
            ? 'bottom-4 start-4 md:bottom-6 md:start-6'
            // phone: clear of the bottom tab bar (bottom 1rem, ~4.4rem tall)
            : 'bottom-[5.75rem] md:bottom-20 start-4',
          // Open, the chat sits above the sage drawer it may have been opened from.
          isOpen ? 'z-[60]' : 'z-40',
          'w-14 h-14 rounded-full',
          'glass border',
          'flex items-center justify-center',
          'shadow-gold-glow transition-all duration-200',
          'hover:border-gold-400/60 hover:scale-105 active:scale-95 motion-reduce:hover:scale-100',
          isOpen ? 'border-gold-400/60 bg-ink-700/80' : 'border-gold-500/30',
        )}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.08-.163-3.02-.463L3 21l1.5-4.5C3.55 15.163 3 13.62 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={S.dialog[locale]}
          tabIndex={-1}
          dir={isRtl ? 'rtl' : 'ltr'}
          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close() } }}
          className={cn(
            'no-print fixed z-[60] flex flex-col outline-none',
            onPage
              ? 'bottom-[6.5rem] start-4 md:bottom-24 md:start-6'
              : 'bottom-[9.75rem] md:bottom-36 start-4',
            'w-[calc(100vw-2rem)] max-w-sm h-[60vh] max-h-[520px]',
            'glass rounded-2xl border border-gold-500/20 shadow-glass overflow-hidden',
            'animate-fade-in',
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700/50">
            <div>
              <h3 className="font-serif text-sm font-bold text-gold-300">
                {tr(locale, 'שאל את החכמים', 'Ask the Sages', 'Спросите мудрецов')}
              </h3>
              {quota && !unavailable && (
                <QuotaBar quota={quota} locale={locale} authenticated={authenticated} />
              )}
            </div>
            <button
              onClick={close}
              aria-label={tr(locale, 'סגור', 'Close', 'Закрыть')}
              className="text-ink-500 hover:text-ink-200 transition-colors p-1 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {subject && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-ink-700/40 bg-gold-500/[0.06]">
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-gold-500/35 bg-gold-500/10 ps-2.5 pe-1 py-0.5 text-[11px] text-ink-200">
                <SparkIcon className="h-3 w-3 flex-shrink-0 text-gold-300" />
                <span className="flex-shrink-0 text-ink-400">{S.askingAbout[locale]}:</span>
                <span dir="auto" className="truncate font-semibold text-ink-100">{subject.name}</span>
                <button
                  type="button"
                  onClick={() => { setSubject(null); inputRef.current?.focus() }}
                  aria-label={`${S.removeScope[locale]}: ${subject.name}`}
                  title={S.removeScope[locale]}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-700/60 hover:text-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </div>
          )}

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" aria-live="polite">
            {unavailable && (
              <div role="status" className="rounded-xl px-3 py-2.5 text-xs leading-relaxed bg-ink-800/60 border border-ink-600/50 text-ink-200">
                <p className="font-semibold text-ink-100 mb-0.5">
                  {tr(locale, 'העוזר אינו זמין כרגע.', 'The assistant is unavailable right now.', 'Ассистент сейчас недоступен.')}
                </p>
                <p className="text-ink-400">
                  {subject
                    ? tr(locale,
                      'כל השאר בדף זמין כרגיל. נסו לשאול שוב מאוחר יותר.',
                      'Everything else on this page works as usual. Please try asking again later.',
                      'Всё остальное на странице работает как обычно. Попробуйте спросить позже.')
                    : tr(locale,
                      'אפשר להמשיך לעיין ברשת, בטבלה ובדפי החכמים. נסו שוב מאוחר יותר.',
                      'You can keep exploring the network, the table and the sage pages. Please try again later.',
                      'Сеть, таблица и страницы мудрецов работают как обычно. Попробуйте позже.')}
                </p>
                <button
                  onClick={checkStatus}
                  className="mt-2 text-[11px] font-semibold text-gold-300 hover:text-gold-200 underline underline-offset-2"
                >
                  {tr(locale, 'בדיקה חוזרת', 'Check again', 'Проверить снова')}
                </button>
              </div>
            )}
            {messages.length === 0 && !unavailable && (
              <p className="text-xs text-ink-500 leading-relaxed">
                {subject
                  ? S.scopedIntro[locale]
                  : authenticated
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
                  'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                  m.role === 'user'
                    ? 'ms-auto whitespace-pre-wrap bg-gold-500/15 border border-gold-500/30 text-ink-100'
                    : 'me-auto bg-ink-800/60 border border-ink-700/50 text-ink-200',
                )}
              >
                {m.role === 'user'
                  ? m.content
                  : <Answer text={m.content} citations={m.citations ?? []} locale={locale} pageSageId={pageSageId} onJump={jumpTo} />}
              </div>
            ))}
            {sending && (
              <div className="me-auto max-w-[85%] rounded-xl px-3 py-2 text-xs bg-ink-800/60 border border-ink-700/50 text-ink-500">
                {tr(locale, 'חושב…', 'Thinking…', 'Думаю…')}
              </div>
            )}
            {error && (
              <div className="rounded-xl px-3 py-2 text-xs bg-red-500/10 border border-red-500/30 text-red-300 [[data-theme=light]_&]:text-red-700">
                {error}
                {!authenticated && quotaExhausted && (
                  <Link href={`/${locale}/auth/signup`} className="block mt-1.5 font-semibold text-gold-300 hover:text-gold-200 underline">
                    {tr(locale, 'הרשמה חינם ←', 'Sign up for free →', 'Регистрация бесплатно →')}
                  </Link>
                )}
              </div>
            )}
            {showStarters && starters.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-500">{S.starters[locale]}</p>
                <ul className="space-y-1.5">
                  {starters.map(q => (
                    <li key={q}>
                      <button
                        type="button"
                        data-starter=""
                        disabled={startersDisabled}
                        onClick={() => send(q)}
                        className="group flex w-full items-start gap-2 rounded-xl border border-ink-700/60 bg-ink-800/40 px-3 py-2 text-start text-xs leading-snug text-ink-200 transition-colors hover:border-gold-500/45 hover:bg-gold-500/10 hover:text-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-400 disabled:opacity-50"
                      >
                        <span aria-hidden className="mt-px text-gold-400 transition-transform rtl:group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5 motion-reduce:transform-none">{isRtl ? '←' : '→'}</span>
                        <span dir="auto">{q}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-ink-700/50">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={sending || quotaExhausted || unavailable}
              aria-label={tr(locale, 'שאלה', 'Question', 'Вопрос')}
              placeholder={unavailable
                ? tr(locale, 'העוזר אינו זמין כרגע', 'Assistant unavailable', 'Ассистент недоступен')
                : quotaExhausted
                ? tr(locale, 'נגמרו השאלות החינמיות', 'Out of free questions', 'Бесплатные вопросы закончились')
                : subject
                ? tr(locale, `שאלה על ${subject.name}…`, `A question about ⁨${subject.name}⁩…`, `Вопрос: ⁨${subject.name}⁩…`)
                : tr(locale, 'הקלד שאלה…', 'Type a question…', 'Введите вопрос…')}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-ink-800/50 border border-ink-700/50 text-ink-100 text-xs
                         focus:outline-none focus:border-gold-500/60 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || quotaExhausted || unavailable}
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

/** Where a citation leads: a heading on this page, the sage's page, or nowhere. */
function citationTarget(c: Citation, locale: Locale, pageSageId?: string): { href: string; inPage: boolean } | null {
  if (!c.anchor) return null
  const hash = `#${encodeURIComponent(c.anchor)}`
  if (pageSageId && String(c.sageId) === String(pageSageId)) return { href: hash, inPage: true }
  return { href: `/${locale}/sage/${encodeURIComponent(c.sageId)}${hash}`, inPage: false }
}

/** "Section — document", or just the document when the passage has no heading. */
function citationLabel(c: Citation, pageSageId?: string): string {
  const where = c.section ? c.section : c.docTitle
  const who = pageSageId && String(c.sageId) === String(pageSageId) ? '' : `${displayName(c.sageLabel)} · `
  return `${who}${where}`
}

/**
 * An assistant answer: text with **bold** runs, citation handles as numbered
 * links, and the cited sources listed underneath. A citation the reader can
 * locate jumps to its heading (on this page) or opens the sage's page there;
 * one it cannot is shown by title only.
 */
function Answer({ text, citations, locale, pageSageId, onJump }: {
  text: string
  citations: Citation[]
  locale: Locale
  pageSageId?: string
  onJump: (anchor: string) => boolean
}) {
  const { segments, sources } = parseAnswer(text, citations)

  const linkProps = (c: Citation) => {
    const target = citationTarget(c, locale, pageSageId)
    if (!target) return null
    return target.inPage
      ? {
          href: target.href,
          onClick: (e: React.MouseEvent) => { if (onJump(c.anchor!)) e.preventDefault() },
        }
      : { href: target.href, target: '_blank', rel: 'noopener', title: S.opensPage[locale] }
  }

  return (
    <>
      <p className="whitespace-pre-wrap">
        {segments.map((seg, i) => {
          if (seg.kind === 'text') return <Fragment key={i}>{seg.text}</Fragment>
          if (seg.kind === 'strong') return <strong key={i} className="font-semibold text-ink-100">{seg.text}</strong>
          const props = linkProps(seg.citation)
          const label = `${S.source[locale]} ${seg.n}: ${citationLabel(seg.citation, pageSageId)}`
          const chip = 'mx-0.5 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded px-1 align-middle text-[10px] font-semibold tabular-nums'
          return props ? (
            <a key={i} {...props} aria-label={label}
              className={`${chip} border border-gold-500/40 bg-gold-500/15 text-gold-300 no-underline transition-colors hover:bg-gold-500/30 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400`}>
              {seg.n}
            </a>
          ) : (
            <span key={i} title={label} className={`${chip} border border-ink-600/60 bg-ink-700/40 text-ink-300`}>{seg.n}</span>
          )
        })}
      </p>
      {sources.length > 0 && (
        <div className="mt-2.5 border-t border-ink-700/50 pt-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-500">{S.sources[locale]}</p>
          <ol className="space-y-1">
            {sources.map(({ n, citation }) => {
              const props = linkProps(citation)
              const label = citationLabel(citation, pageSageId)
              return (
                <li key={n} className="flex items-start gap-1.5">
                  <span className="mt-px flex h-4 min-w-4 flex-shrink-0 items-center justify-center rounded bg-ink-700/50 px-1 text-[10px] font-semibold tabular-nums text-ink-300">{n}</span>
                  {props ? (
                    <a {...props} dir="auto"
                      className="line-clamp-2 text-[11px] leading-snug text-gold-300 underline decoration-gold-500/30 underline-offset-2 hover:text-gold-200 hover:decoration-gold-400">
                      {label}{!('onClick' in props) && <span aria-hidden> ↗</span>}
                    </a>
                  ) : (
                    <span dir="auto" className="line-clamp-2 text-[11px] leading-snug text-ink-300">{label}</span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </>
  )
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
    </svg>
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
