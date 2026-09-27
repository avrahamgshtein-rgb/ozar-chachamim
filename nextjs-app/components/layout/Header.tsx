'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAppStore } from '@/store/useAppStore'
import { ERA_COLORS, ERA_LABELS, ALL_PERIODS } from '@/lib/types'
import type { Locale, Period } from '@/lib/types'
import { UI, LOCALES, LOCALE_NAMES, LOCALE_SHORT } from '@/lib/i18n'
import { AuthStatus } from '@/components/auth/AuthStatus'

interface HeaderProps {
  locale: Locale
  otherLocale: Locale
  /**
   * Server-computed corpus totals. The page is prerendered before any data
   * loads, so without these the header's first paint read "0 חכמים".
   */
  initialStats?: { sages: number; connections: number; asOf?: string }
}

const ERA_ORDER: Period[] = ALL_PERIODS

// Shared look for the header's pill buttons.
const pill = cn(
  'glass-light border border-ink-600/40 rounded-xl',
  'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
  'transition-colors duration-150',
)

/**
 * Switch language on the same view: carry the current query (tab, selected
 * sage, filters) across, so switching language on the timeline does not drop
 * the reader back on the network graph. A full load, because the new locale
 * needs its own content overlay and <html lang dir> from the server.
 */
function switchLocale(e: React.MouseEvent<HTMLAnchorElement>, target: Locale) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  e.preventDefault()
  window.location.assign(`/${target}${window.location.search}`)
}

export function Header({ locale, initialStats }: HeaderProps) {
  const t = UI[locale]
  const openFilters = useAppStore(s => s.openFilters)

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-30',
        'glass border-b border-gold-500/10',
        'px-4 md:px-6',
        'h-[var(--header-h,64px)]',
        'flex items-center gap-3 md:gap-4',
      )}
    >
      {/* Logo */}
      <div className="flex-shrink-0 flex flex-col">
        <h1 className="font-serif text-xl font-bold text-gold-300 leading-none tracking-tight">
          {t.appTitle}
        </h1>
        <p className="font-sans text-[11px] text-ink-400 mt-1 hidden sm:block whitespace-nowrap leading-none">
          {t.appSubtitle}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-ink-700/60 flex-shrink-0 hidden md:block" aria-hidden />

      {/* Search — center */}
      <div className="flex-1 min-w-0 hidden md:block" data-tour="search">
        <SearchBar locale={locale} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ms-auto flex-shrink-0" data-tour="header-actions">
        {/* Corpus count, opens the by-era breakdown */}
        <StatsBadge locale={locale} initialStats={initialStats} />

        {/* Advanced filters */}
        <button
          type="button"
          onClick={openFilters}
          className={cn(pill, 'flex items-center justify-center gap-1.5 h-11 min-w-[44px] sm:h-9 px-3 text-xs font-sans')}
          aria-label={t.advancedSearch}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:inline" aria-hidden>{t.filtersLabel}</span>
        </button>

        {/* Theme toggle (desktop) */}
        <ThemeToggle locale={locale} className={cn(pill, 'hidden sm:grid place-items-center h-9 w-9')} />

        {/* Guided tour (desktop) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('ozar-start-tour'))}
          className={cn(pill, 'hidden sm:grid place-items-center h-9 w-9 text-xs font-sans font-semibold')}
          title={t.guidedTour}
          aria-label={t.startTour}
        >
          <span aria-hidden>?</span>
        </button>

        {/* Auth status (desktop) */}
        <div className="hidden sm:block">
          <AuthStatus locale={locale} />
        </div>

        {/* Locale switcher (desktop) */}
        <LocaleSwitcher locale={locale} />

        {/* Mobile: collapsed actions menu (declutters the top bar) */}
        <MobileActionsMenu locale={locale} />
      </div>
    </header>
  )
}

function StatsBadge({ locale, initialStats }: Pick<HeaderProps, 'locale' | 'initialStats'>) {
  const t = UI[locale]
  const totalSages  = useAppStore(s => s.totalSages)
  const sages       = useAppStore(s => s.sages)
  const connections = useAppStore(s => s.connections)
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const wrap = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, wrap, close)

  // Before the client dataset arrives, show the server's count of the same corpus.
  const loaded = sages.length > 0
  const sageCount = loaded ? totalSages : (initialStats?.sages ?? totalSages)
  const linkCount = loaded ? connections.length : (initialStats?.connections ?? 0)
  const fmt = (n: number) => n.toLocaleString(locale === 'he' ? 'he-IL' : locale)

  const eraCounts = loaded
    ? ERA_ORDER.map(era => ({ era, count: sages.filter(s => s.period === era).length })).filter(x => x.count > 0)
    : []
  const maxCount = Math.max(1, ...eraCounts.map(x => x.count))
  const asOf = initialStats?.asOf
    ? new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : locale, { day: 'numeric', month: 'long', year: 'numeric' })
        .format(new Date(`${initialStats.asOf}T12:00:00Z`))
    : ''
  const isOpen = open && eraCounts.length > 0

  return (
    <div ref={wrap} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={!loaded}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label={`${fmt(sageCount)} ${t.sagesUnit}, ${fmt(linkCount)} ${t.linksUnit}. ${t.statsToggle}`}
        className={cn(pill, 'flex items-center gap-2 h-9 px-3 text-xs font-sans disabled:cursor-default')}
      >
        <span className="text-gold-400 font-mono font-semibold tabular-nums">{fmt(sageCount)}</span>
        <span className="text-ink-400">{t.sagesUnit}</span>
        {linkCount > 0 && (
          <>
            <span className="text-ink-500" aria-hidden>·</span>
            <span className="text-ink-300 font-mono tabular-nums">{fmt(linkCount)}</span>
            <span className="text-ink-400">{t.linksUnit}</span>
          </>
        )}
        <svg
          className={cn('w-3 h-3 text-ink-400 transition-transform duration-200', isOpen && 'rotate-180')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div id={panelId} className="absolute top-full end-0 mt-2 w-64 glass rounded-xl border border-ink-700/50 p-3.5 z-50 shadow-glass-lg animate-fade-in">
          <p className="text-[11px] font-sans font-semibold text-ink-400 mb-2.5">{t.byEra}</p>
          <ul className="space-y-1.5">
            {eraCounts.map(({ era, count }) => (
              <li key={era} className="flex items-center gap-2">
                <span className="text-[11px] font-sans text-ink-300 w-24 flex-shrink-0 truncate">
                  {ERA_LABELS[era]?.[locale]}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden" aria-hidden>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((count / maxCount) * 100)}%`, background: ERA_COLORS[era] }} />
                </div>
                <span className="text-[11px] font-mono text-ink-300 w-8 text-end tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
          {asOf && (
            <p className="text-[11px] font-sans text-ink-400 mt-3 border-t border-ink-700/60 pt-2">
              {t.dataAsOf}{asOf}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Closes a header menu on Escape (returning focus to its button) or on a
 * pointer press outside `container`. A full-screen click-catcher can't do this
 * here: the header's backdrop-filter makes it the containing block for fixed
 * children, so such an overlay only ever covered the header itself.
 */
function useDismiss(open: boolean, container: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      close()
      container.current?.querySelector<HTMLElement>('[aria-expanded]')?.focus()
    }
    function onPointer(e: PointerEvent) {
      if (!container.current?.contains(e.target as Node)) close()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, container, close])
}

function ThemeToggle({ locale, className }: { locale: Locale; className?: string }) {
  const t = UI[locale]
  const theme = useAppStore(s => s.theme)
  return (
    <button
      type="button"
      onClick={() => useAppStore.getState().toggleTheme()}
      className={className}
      title={t.themeToggle}
      aria-label={theme === 'dark' ? t.themeToLight : t.themeToDark}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  )
}

function LocaleSwitcher({ locale }: { locale: Locale }) {
  const t = UI[locale]
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const wrap = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, wrap, close)
  const others = LOCALES.filter(l => l !== locale)

  return (
    <div ref={wrap} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(pill, 'flex items-center gap-1 h-9 px-3 text-xs font-sans font-medium')}
        aria-label={`${t.languageMenu}: ${LOCALE_NAMES[locale]}`}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <span aria-hidden>{LOCALE_SHORT[locale]}</span>
        <svg className={cn('w-3 h-3 transition-transform duration-200', open && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul id={menuId} className="absolute top-full end-0 mt-2 w-40 z-50 glass rounded-xl border border-ink-700/50 shadow-glass-lg overflow-hidden animate-fade-in">
          {others.map(l => (
            <li key={l}>
              <a
                href={`/${l}`}
                hrefLang={l}
                lang={l}
                className="block px-4 py-2.5 text-sm font-sans text-ink-200 hover:bg-ink-700/50 transition-colors"
                onClick={e => { setOpen(false); switchLocale(e, l) }}
              >
                {LOCALE_NAMES[l]}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MobileActionsMenu({ locale }: { locale: Locale }) {
  const t = UI[locale]
  const theme = useAppStore(s => s.theme)
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const wrap = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, wrap, close)

  const item = cn(
    'flex items-center gap-3 w-full px-4 py-3 min-h-[44px] text-start text-sm font-sans',
    'text-ink-200 hover:bg-ink-700/50 transition-colors',
  )

  return (
    <div ref={wrap} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(pill, 'grid place-items-center h-11 w-11 text-lg')}
        aria-label={t.moreActions}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <span aria-hidden>⋯</span>
      </button>

      {open && (
        <div id={menuId} className="absolute top-full end-0 mt-2 w-56 z-50 glass rounded-xl border border-ink-700/50 shadow-glass-lg overflow-hidden animate-fade-in">
          <button
            type="button"
            className={item}
            onClick={() => { useAppStore.getState().toggleTheme(); setOpen(false) }}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
            {theme === 'dark' ? t.themeToLight : t.themeToDark}
          </button>
          <button
            type="button"
            className={cn(item, 'border-t border-ink-700/40')}
            onClick={() => { window.dispatchEvent(new Event('ozar-start-tour')); setOpen(false) }}
          >
            <span aria-hidden className="w-4 text-center font-semibold">?</span>
            {t.guidedTour}
          </button>
          {LOCALES.filter(l => l !== locale).map(l => (
            <a
              key={l}
              href={`/${l}`}
              hrefLang={l}
              lang={l}
              className={cn(item, 'border-t border-ink-700/40')}
              onClick={e => { setOpen(false); switchLocale(e, l) }}
            >
              <IconGlobe />
              {LOCALE_NAMES[l]}
            </a>
          ))}
          <div className="border-t border-ink-700/40 px-4 py-3">
            <AuthStatus locale={locale} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */

function IconSun() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  )
}
