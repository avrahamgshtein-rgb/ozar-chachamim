'use client'

import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { TAB_META } from '@/lib/types'
import type { Tab, Locale } from '@/lib/types'

const TABS: Tab[] = ['graph', 'map', 'traditions', 'ideas', 'timeline', 'genealogy']

interface TabBarProps {
  locale: Locale
}

export function TabBar({ locale }: TabBarProps) {
  const { activeTab, setActiveTab } = useAppStore()
  const isHe = locale === 'he'

  return (
    <nav
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-30',
        'glass rounded-2xl px-2 py-1.5',
        'shadow-glass flex items-center gap-0.5',
        'max-w-[calc(100vw-2rem)]',
      )}
      aria-label={isHe ? 'ניווט ראשי' : 'Main navigation'}
      data-tour="tabs"
    >
      {TABS.map(tab => {
        const meta   = TAB_META[tab]
        const label  = isHe ? meta.labelHe : meta.labelEn
        const active = activeTab === tab

        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            aria-current={active ? 'page' : undefined}
            title={label}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl',
              'transition-all duration-200 min-w-[64px] min-h-[44px]',
              active
                ? 'bg-gold-500/20 text-gold-300 shadow-gold-glow border border-gold-500/40'
                : 'border border-transparent text-ink-400 hover:text-ink-200 hover:bg-ink-700/40',
            )}
          >
            <span
              className="text-base leading-none"
              style={{ fontFamily: 'monospace' }}
              aria-hidden
            >
              {meta.icon}
            </span>
            <span
              className={cn(
                'text-[10px] font-sans font-medium leading-tight whitespace-nowrap',
                active ? 'text-gold-300' : 'text-ink-500',
              )}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
