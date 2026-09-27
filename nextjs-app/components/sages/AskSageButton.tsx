'use client'

// "שאלו על החכם": opens the page's chat widget scoped to this sage, with
// starter questions built from the sage's own data. The widget does the rest,
// including the honest "unavailable" state when the assistant is down, so
// this button never has a broken state of its own.
import { askAboutSage, type AskSubject } from '@/components/chat/askAbout'
import type { Locale } from '@/lib/types'

const S = {
  ask: { he: 'שאלו על החכם', en: 'Ask about this sage', ru: 'Спросить о мудреце' },
  hint: { he: 'שיחה עם העוזר, מבוססת על המחקר', en: 'Chat with the assistant, grounded in the research', ru: 'Чат с ассистентом на основе исследования' },
} satisfies Record<string, Record<Locale, string>>

export function AskSageButton({ subject, locale, variant = 'hero' }: {
  subject: AskSubject
  locale: Locale
  /** 'hero': the sage page's action row. 'drawer': the compact drawer header. */
  variant?: 'hero' | 'drawer'
}) {
  const hero = variant === 'hero'
  return (
    <button
      type="button"
      onClick={() => askAboutSage(subject)}
      title={S.hint[locale]}
      aria-haspopup="dialog"
      className={
        hero
          ? 'group inline-flex items-center gap-2 rounded-full border border-gold-500/50 rtl:bg-gradient-to-l ltr:bg-gradient-to-r from-gold-500/25 via-gold-500/15 to-gold-500/5 px-4 py-2 text-sm font-medium text-ink-50 shadow-gold-glow transition hover:border-gold-400/80 hover:from-gold-500/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400'
          : 'group inline-flex items-center gap-1.5 rounded-lg border border-gold-500/40 bg-gold-500/15 px-2.5 py-1 text-xs font-sans font-medium text-gold-300 transition-colors hover:border-gold-400/70 hover:bg-gold-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400'
      }
    >
      <svg className={hero ? 'h-4 w-4 text-gold-300 transition-transform group-hover:rotate-12 motion-reduce:transform-none' : 'h-3.5 w-3.5'}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12c0 4.4-4 8-9 8-1.1 0-2.1-.2-3-.5L3 21l1.5-4.5C3.6 15.2 3 13.6 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
        <path d="M12 8.2l.9 2.2 2.3.9-2.3.9-.9 2.2-.9-2.2-2.3-.9 2.3-.9z" fill="currentColor" stroke="none" />
      </svg>
      {S.ask[locale]}
    </button>
  )
}
