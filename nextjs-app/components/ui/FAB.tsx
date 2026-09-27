'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { Locale } from '@/lib/types'

interface FABProps {
  locale?: Locale
  className?: string
}

const LABELS: Record<Locale, { open: string; close: string }> = {
  he: { open: 'חיפוש חכמים', close: 'סגור חיפוש' },
  en: { open: 'Search sages', close: 'Close search' },
  ru: { open: 'Поиск мудрецов', close: 'Закрыть поиск' },
}

export function FAB({ locale = 'he', className }: FABProps) {
  const { toggleSearch, isSearchOpen } = useAppStore()
  const t = LABELS[locale]

  // Opening the phone search should put the cursor in it: the overlay's box
  // is the visible one (the header's is hidden below md).
  useEffect(() => {
    if (!isSearchOpen) return
    const id = requestAnimationFrame(() => {
      const box = [...document.querySelectorAll<HTMLInputElement>('[data-search-input]')]
        .find(el => el.offsetParent !== null)
      box?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isSearchOpen])

  return (
    <button
      onClick={toggleSearch}
      aria-label={isSearchOpen ? t.close : t.open}
      aria-expanded={isSearchOpen}
      title={isSearchOpen ? t.close : t.open}
      data-tour="search-fab"
      className={cn(
        // bottom-[5.75rem]: clear of the bottom tab bar (bottom 1rem, ~4.4rem
        // tall); the graph's zoom cluster starts at 10rem, above this.
        'fixed bottom-[5.75rem] end-4 z-40',
        'w-14 h-14 rounded-full',
        'glass border border-gold-500/30',
        'flex items-center justify-center',
        'shadow-gold-glow transition-all duration-200',
        'hover:border-gold-400/60 hover:scale-105 active:scale-95',
        'md:hidden',
        isSearchOpen && 'border-gold-400/60 bg-ink-700/80',
        className,
      )}
    >
      {isSearchOpen ? (
        <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )}
    </button>
  )
}
