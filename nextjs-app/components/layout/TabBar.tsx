'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { TAB_META } from '@/lib/types'
import type { Tab, Locale } from '@/lib/types'
import { UI } from '@/lib/i18n'

export const TABS: Tab[] = ['graph', 'map', 'traditions', 'ideas', 'timeline', 'genealogy', 'about']

/** Ids shared with AppShell's tab panels (aria-controls / aria-labelledby). */
export const tabId = (tab: Tab) => `tab-${tab}`
export const panelId = (tab: Tab) => `panel-${tab}`

interface TabBarProps {
  locale: Locale
}

/**
 * The view switcher, as an ARIA tablist: one tab stop (the selected tab, a
 * roving tabindex), arrow keys move and select, Home/End jump to the ends.
 * Arrows follow the reading direction: in Hebrew, ArrowLeft is "next".
 */
export function TabBar({ locale }: TabBarProps) {
  const activeTab = useAppStore(s => s.activeTab)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const t = UI[locale]
  const rtl = locale === 'he'
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const barRef = useRef<HTMLElement>(null)

  // Keep the selected tab in view where the bar scrolls sideways (phones).
  // Scrolls the bar itself rather than calling scrollIntoView, which in Chrome
  // also moves the sequential-focus starting point: the first Tab press then
  // skipped the skip links and landed after the tab bar.
  useEffect(() => {
    const bar = barRef.current
    const el = refs.current[TABS.indexOf(activeTab)]
    if (!bar || !el || bar.scrollWidth <= bar.clientWidth) return
    const barBox = bar.getBoundingClientRect()
    const box = el.getBoundingClientRect()
    let delta = 0
    if (box.left < barBox.left) delta = box.left - barBox.left - 8
    else if (box.right > barBox.right) delta = box.right - barBox.right + 8
    if (!delta) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bar.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' })
  }, [activeTab])

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = rtl ? 'ArrowLeft' : 'ArrowRight'
    const prev = rtl ? 'ArrowRight' : 'ArrowLeft'
    let to: number
    if (e.key === next) to = (index + 1) % TABS.length
    else if (e.key === prev) to = (index - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = TABS.length - 1
    else return
    e.preventDefault()
    setActiveTab(TABS[to])
    refs.current[to]?.focus()
  }

  return (
    <nav
      ref={barRef}
      id="tabbar"
      data-focus-region
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-30',
        'glass rounded-2xl p-1.5 shadow-glass',
        'max-w-[calc(100vw-1.5rem)]',
        'overflow-x-auto overflow-y-hidden overscroll-x-contain',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
      aria-label={t.tabsLabel}
      data-tour="tabs"
    >
      <div role="tablist" aria-label={t.tabsLabel} aria-orientation="horizontal" className="flex items-stretch gap-0.5">
        {TABS.map((tab, i) => {
          const meta   = TAB_META[tab]
          const label  = rtl ? meta.labelHe : locale === 'ru' ? meta.labelRu : meta.labelEn
          const active = activeTab === tab

          return (
            <button
              key={tab}
              ref={el => { refs.current[i] = el }}
              type="button"
              role="tab"
              id={tabId(tab)}
              aria-selected={active}
              aria-controls={active ? panelId(tab) : undefined}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={e => onKeyDown(e, i)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 flex-shrink-0',
                'px-2.5 sm:px-3 py-1.5 rounded-xl min-w-[52px] sm:min-w-[64px] min-h-[48px]',
                'border transition-colors duration-200',
                active
                  ? 'bg-gold-500/15 text-gold-300 border-gold-500/40 shadow-gold-glow'
                  : 'border-transparent text-ink-400 hover:text-ink-100 hover:bg-ink-700/40',
              )}
            >
              {meta.icon === 'temple' ? (
                <img
                  src="/icons/temple.svg"
                  alt=""
                  className={cn('w-5 h-5', active ? '[filter:drop-shadow(0_0_4px_#c99a3a)]' : 'opacity-80')}
                />
              ) : (
                <span className="text-base leading-none font-mono" aria-hidden>
                  {meta.icon}
                </span>
              )}
              <span
                className={cn(
                  'text-[11px] font-sans font-medium leading-none whitespace-nowrap',
                  active ? 'text-gold-300' : 'text-ink-400',
                )}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
