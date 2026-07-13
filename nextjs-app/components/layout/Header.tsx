'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAppStore } from '@/store/useAppStore'
import { ERA_COLORS, ERA_LABELS, ALL_PERIODS } from '@/lib/types'
import type { Locale, Period } from '@/lib/types'
import { UI, LOCALES, LOCALE_NAMES, LOCALE_SHORT, tr } from '@/lib/i18n'

interface HeaderProps {
  locale: Locale
  otherLocale: Locale
}

const ERA_ORDER: Period[] = ALL_PERIODS

export function Header({ locale, otherLocale }: HeaderProps) {
  const t = UI[locale]
  const { totalSages, lastUpdate, openFilters, sages, connections } = useAppStore()
  const [showStats, setShowStats] = useState(false)

  const eraCounts = ERA_ORDER.map(era => ({
    era,
    count: sages.filter(s => s.period === era).length,
  })).filter(x => x.count > 0)
  const maxCount = Math.max(1, ...eraCounts.map(x => x.count))

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-30',
        'glass border-b border-gold-500/10',
        'px-4 md:px-6',
        'h-[var(--header-h,64px)]',
        'flex items-center gap-4',
      )}
    >
      {/* Logo */}
      <div className="flex-shrink-0 flex flex-col">
        <h1 className="font-serif text-xl font-bold text-gold-300 leading-none tracking-tight">
          {t.appTitle}
        </h1>
        <p className="font-sans text-[10px] text-ink-400 mt-0.5 hidden sm:block whitespace-nowrap">
          {t.appSubtitle}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-ink-700/60 flex-shrink-0 hidden md:block" aria-hidden />

      {/* Search — center */}
      <div className="flex-1 min-w-0 hidden md:block" data-tour="search">
        <SearchBar locale={locale} />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 ms-auto flex-shrink-0" data-tour="header-actions">
        {/* Stats badge */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setShowStats(s => !s)}
            aria-label={`${totalSages} sages, ${connections.length} connections`}
            aria-expanded={showStats}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-sans',
              'glass-light border border-ink-600/40',
              'text-ink-300 hover:text-ink-100 hover:border-gold-500/30 transition-all',
            )}
          >
            <span className="text-gold-400 font-mono font-semibold">{totalSages.toLocaleString()}</span>
            <span className="text-ink-500">{tr(locale, 'חכמים', 'sages', 'мудрецов')}</span>
            {connections.length > 0 && (
              <>
                <span className="text-ink-700">·</span>
                <span className="text-ink-400 font-mono">{connections.length}</span>
                <span className="text-ink-500">{tr(locale, 'קשרים', 'links', 'связей')}</span>
              </>
            )}
            <span className="text-ink-600 text-[10px]" aria-hidden>{showStats ? '▴' : '▾'}</span>
          </button>

          {showStats && eraCounts.length > 0 && (
            <div className="absolute top-full end-0 mt-2 w-60 glass rounded-xl border border-ink-700/50 p-3 z-50 shadow-glass-lg animate-fade-in" role="region" aria-label="Sage statistics by era">
              <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-600 mb-2">
                {tr(locale, 'לפי תקופה', 'By era', 'По эпохам')}
              </p>
              {eraCounts.map(({ era, count }) => {
                const color = ERA_COLORS[era]
                const pct = Math.round((count / maxCount) * 100)
                return (
                  <div key={era} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-sans text-ink-400 w-20 flex-shrink-0 truncate">
                      {ERA_LABELS[era]?.[locale]}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[10px] font-mono text-ink-500 w-7 text-end">{count}</span>
                  </div>
                )
              })}
              {lastUpdate && (
                <p className="text-[9px] text-ink-700 mt-2 border-t border-ink-800 pt-1.5">
                  {tr(locale, 'עדכון: ', 'Updated: ', 'Обновлено: ')}{lastUpdate}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Advanced filter button */}
        <button
          onClick={openFilters}
          aria-label={t.filtersLabel}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans',
            'min-h-[44px] sm:min-h-0',
            'glass-light border border-ink-600/40',
            'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
            'transition-all duration-150',
          )}
          title={t.advancedSearch}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:inline">{t.filtersLabel}</span>
        </button>

        {/* Theme toggle — כהה/בהיר (desktop) */}
        <button
          onClick={() => useAppStore.getState().toggleTheme()}
          className={cn(
            'hidden sm:block px-2.5 py-1.5 rounded-xl text-sm',
            'glass-light border border-ink-600/40',
            'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
            'transition-all duration-150',
          )}
          title={tr(locale, 'מצב כהה / בהיר', 'Dark / light mode', 'Тёмная / светлая тема')}
          aria-label={tr(locale, 'החלף ערכת נושא', 'Toggle theme', 'Переключить тему')}
        >
          <ThemeIcon />
        </button>

        {/* Guided tour re-launch (desktop) */}
        <button
          onClick={() => window.dispatchEvent(new Event('ozar-start-tour'))}
          className={cn(
            'hidden sm:block px-2.5 py-1.5 rounded-xl text-xs font-sans font-semibold',
            'glass-light border border-ink-600/40',
            'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
            'transition-all duration-150',
          )}
          title={tr(locale, 'סיור מודרך', 'Guided tour', 'Обучающий тур')}
          aria-label={tr(locale, 'הפעל סיור מודרך', 'Start guided tour', 'Начать тур')}
        >
          ?
        </button>

        {/* Locale switcher (desktop) */}
        <LocaleSwitcher locale={locale} />

        {/* Mobile: collapsed actions menu (declutters the top bar) */}
        <MobileActionsMenu locale={locale} otherLocale={otherLocale} />
      </div>
    </header>
  )
}

function LocaleSwitcher({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false)
  const others = LOCALES.filter(l => l !== locale)

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'px-3 py-1.5 rounded-xl text-xs font-sans font-medium',
          'glass-light border border-ink-600/40',
          'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
          'transition-all duration-150',
        )}
        title={LOCALE_NAMES[locale]}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {LOCALE_SHORT[locale]} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div role="menu" className="absolute top-full end-0 mt-2 w-36 z-50 glass rounded-xl border border-ink-700/50 shadow-glass-lg overflow-hidden animate-fade-in">
            {others.map(l => (
              <Link
                key={l}
                href={`/${l}`}
                role="menuitem"
                className="block px-4 py-2.5 text-sm font-sans text-ink-200 hover:bg-ink-700/50 transition-colors"
                onClick={() => setOpen(false)}
              >
                {LOCALE_NAMES[l]}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MobileActionsMenu({ locale, otherLocale }: { locale: Locale; otherLocale: Locale }) {
  const [open, setOpen] = useState(false)
  const isHe = locale === 'he'
  const theme = useAppStore(s => s.theme)

  const item = cn(
    'flex items-center gap-3 w-full px-4 py-3 min-h-[44px] text-start text-sm font-sans',
    'text-ink-200 hover:bg-ink-700/50 transition-colors',
  )

  return (
    <div className="relative sm:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-lg',
          'glass-light border border-ink-600/40',
          'text-ink-300 hover:text-ink-100 transition-all',
        )}
        aria-label={isHe ? 'תפריט פעולות' : 'Actions menu'}
        aria-expanded={open}
      >
        ⋯
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full end-0 mt-2 w-52 z-50 glass rounded-xl border border-ink-700/50 shadow-glass-lg overflow-hidden animate-fade-in">
            <button className={item}
              onClick={() => { useAppStore.getState().toggleTheme(); setOpen(false) }}>
              <span aria-hidden>{theme === 'dark' ? '☀️' : '🌙'}</span>
              {isHe ? 'מצב כהה / בהיר' : 'Dark / light mode'}
            </button>
            <button className={cn(item, 'border-t border-ink-700/40')}
              onClick={() => { window.dispatchEvent(new Event('ozar-start-tour')); setOpen(false) }}>
              <span aria-hidden>❔</span>
              {isHe ? 'סיור מודרך' : 'Guided tour'}
            </button>
            {LOCALES.filter(l => l !== locale).map(l => (
              <Link key={l} href={`/${l}`} className={cn(item, 'border-t border-ink-700/40')}>
                <span aria-hidden>🌐</span>
                {LOCALE_NAMES[l]}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}


function ThemeIcon() {
  const theme = useAppStore(s => s.theme)
  return <span aria-hidden>{theme === 'dark' ? '☀️' : '🌙'}</span>
}
