'use client'

import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface FABProps {
  locale?: 'he' | 'en'
  className?: string
}

export function FAB({ className }: FABProps) {
  const { toggleSearch, isSearchOpen } = useAppStore()

  return (
    <button
      onClick={toggleSearch}
      aria-label="Search sages"
      className={cn(
        'fixed bottom-20 end-4 z-40',
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
        <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )}
    </button>
  )
}
