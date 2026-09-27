'use client'

import { useEffect, useRef, useState, useMemo, useId } from 'react'
import { cn } from '@/lib/utils'
import { searchSagesRanked, loadEnglishNames } from '@/lib/search'
import type { SearchHit } from '@/lib/search'
import { displayName } from '@/lib/displayName'
import { useAppStore } from '@/store/useAppStore'
import { EraChip } from './EraChip'
import { ERA_COLORS } from '@/lib/types'
import type { Locale } from '@/lib/types'
import { UI } from '@/lib/i18n'

interface SearchBarProps {
  locale: Locale
  className?: string
}

const T: Record<Locale, { popular: string; loading: string; hint: string; clear: string }> = {
  he: { popular: 'חכמים מובילים', loading: 'טוען את מאגר החכמים…', hint: '↑↓ לבחירה · Enter לפתיחה · Esc לסגירה', clear: 'נקה חיפוש' },
  en: { popular: 'Popular sages', loading: 'Loading the sages…', hint: '↑↓ to choose · Enter to open · Esc to close', clear: 'Clear search' },
  ru: { popular: 'Известные мудрецы', loading: 'Загружаем мудрецов…', hint: '↑↓ выбор · Enter открыть · Esc закрыть', clear: 'Очистить поиск' },
}

/** `text` with [start, end) wrapped in a highlight. */
function Highlighted({ text, range }: { text: string; range: [number, number] | null }) {
  if (!range) return <>{text}</>
  return (
    <>
      {text.slice(0, range[0])}
      <mark className="bg-gold-500/20 text-gold-200 rounded-sm px-px">{text.slice(range[0], range[1])}</mark>
      {text.slice(range[1])}
    </>
  )
}

export function SearchBar({ locale, className }: SearchBarProps) {
  const t = UI[locale]
  const s = T[locale]
  const [query, setQuery]         = useState('')
  const [focused, setFocused]     = useState(false)
  const [open, setOpen]           = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [aliasTick, setAliasTick] = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLUListElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const baseId    = useId()
  const listId    = `${baseId}-list`
  const optionId  = (i: number) => `${baseId}-opt-${i}`

  const { selectSage, setSearchQuery, sages, connections, isSearchOpen, toggleSearch } = useAppStore()
  // Static data arrives in well under a second; until then the box says so
  // instead of guessing (the old Supabase fallback searched a stale snapshot).
  const dataReady = sages.length > 0

  // English names (sages.en.json) make "Maimonides" / "rambam" work in every
  // locale; re-run the current query once they arrive.
  useEffect(() => {
    let alive = true
    loadEnglishNames().then(() => { if (alive) setAliasTick(x => x + 1) })
    return () => { alive = false }
  }, [])

  const degree = useMemo(() => {
    const deg = new Map<string, number>()
    connections.forEach(c => {
      deg.set(c.source, (deg.get(c.source) ?? 0) + 1)
      deg.set(c.target, (deg.get(c.target) ?? 0) + 1)
    })
    return deg
  }, [connections])

  // Popular sages (highest connection degree) — suggested on empty focus
  const popular = useMemo<SearchHit[]>(() => {
    if (!sages.length) return []
    return [...sages]
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, 6)
      .map(sage => ({ sage, score: 0, via: null, nameRange: null, viaRange: null }))
  }, [sages, degree])

  // Ranking 450 sages takes a millisecond or two, so suggestions follow every
  // keystroke; only the graph filter (a full restyle) waits for a pause.
  const results = useMemo(
    () => (query.trim() && dataReady ? searchSagesRanked(sages, query, { limit: 8, degree }) : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, sages, degree, dataReady, aliasTick])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSearchQuery(query), 220)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, setSearchQuery])

  const trimmed = query.trim()
  // Suggestions shown: search results while typing, popular sages on empty focus
  const shown = trimmed ? results : popular
  const loadingData = !dataReady && trimmed.length > 0
  const showDropdown = open && (shown.length > 0 || loadingData || trimmed.length > 1)

  // Keep the keyboard-active option in view
  useEffect(() => {
    if (activeIdx < 0) return
    document.getElementById(optionId(activeIdx))?.scrollIntoView({ block: 'nearest' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx])

  const reset = () => {
    setQuery('')
    setActiveIdx(-1)
  }

  const handleSelect = (hit: SearchHit) => {
    selectSage(hit.sage)
    reset()
    setOpen(false)
    inputRef.current?.blur()
    // The mobile overlay has done its job once a sage is chosen
    if (isSearchOpen) toggleSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      // Esc here belongs to the search box, not to the drawer or graph focus
      e.preventDefault()
      e.stopPropagation()
      // First Esc closes the list, a second clears the text
      if (showDropdown) setOpen(false)
      else if (query) { reset(); setSearchQuery('') }
      else inputRef.current?.blur()
      setActiveIdx(-1)
      return
    }
    if (!shown.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIdx(i => (i + 1) % shown.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActiveIdx(i => (i <= 0 ? shown.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      // Enter with nothing highlighted opens the best match
      const pick = shown[activeIdx >= 0 ? activeIdx : 0]
      if (pick && (activeIdx >= 0 || trimmed)) {
        e.preventDefault()
        handleSelect(pick)
      }
    } else if (e.key === 'Home' && activeIdx >= 0) {
      e.preventDefault(); setActiveIdx(0)
    } else if (e.key === 'End' && activeIdx >= 0) {
      e.preventDefault(); setActiveIdx(shown.length - 1)
    }
  }

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      {/* Input */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl glass',
          'transition-all duration-200',
          focused && 'border-gold-500/40 shadow-gold-glow',
        )}
      >
        {/* Search icon */}
        <svg
          className="w-4 h-4 text-ink-400 flex-shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showDropdown && activeIdx >= 0 ? optionId(activeIdx) : undefined}
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(-1); setOpen(true) }}
          onFocus={() => { setFocused(true); setOpen(true) }}
          onBlur={() => setTimeout(() => { setFocused(false); setOpen(false); setActiveIdx(-1) }, 150)}
          onKeyDown={handleKeyDown}
          placeholder={t.searchPlaceholder}
          className={cn(
            'flex-1 bg-transparent text-ink-100 placeholder-ink-400',
            'text-sm font-sans outline-none border-none',
            'min-w-0',
          )}
          aria-label={t.searchLabel}
          dir={locale === 'he' ? 'rtl' : 'ltr'}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          data-search-input
        />

        {/* Waiting for the dataset */}
        {loadingData && (
          <svg className="w-4 h-4 text-gold-400 animate-spin flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}

        {/* Clear */}
        {query && !loadingData && (
          <button
            onClick={() => { reset(); setSearchQuery(''); inputRef.current?.focus() }}
            className="text-ink-500 hover:text-ink-200 transition-colors flex-shrink-0"
            aria-label={s.clear}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className={cn(
            'absolute top-full mt-2 w-full z-50',
            'glass rounded-xl overflow-hidden shadow-glass-lg',
            'animate-fade-in',
          )}
        >
          {!trimmed && shown.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-500">
              {s.popular}
            </p>
          )}

          {loadingData && (
            <p className="px-4 py-3 text-xs text-ink-400 font-sans flex items-center gap-2" role="status">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" aria-hidden />
              {s.loading}
            </p>
          )}

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={t.searchLabel}
            className="max-h-[min(60vh,26rem)] overflow-y-auto"
          >
            {shown.map((hit, idx) => {
              const { sage } = hit
              const name = displayName(sage.label)
              const active = idx === activeIdx
              return (
                <li
                  key={sage.id}
                  id={optionId(idx)}
                  role="option"
                  aria-selected={active}
                  onMouseDown={e => { e.preventDefault(); handleSelect(hit) }}
                  onMouseMove={() => { if (!active) setActiveIdx(idx) }}
                  className={cn(
                    'relative w-full flex items-center gap-3 px-4 py-2.5 text-start cursor-pointer',
                    'transition-colors',
                    active ? 'bg-gold-500/10' : 'hover:bg-ink-700/40',
                    idx > 0 && 'border-t border-ink-700/40',
                  )}
                >
                  {/* Active marker on the reading-start edge */}
                  <span
                    aria-hidden
                    className={cn('absolute inset-y-1.5 start-0 w-0.5 rounded-full transition-opacity',
                      active ? 'bg-gold-400 opacity-100' : 'opacity-0')}
                  />
                  <span className="era-dot" style={{ background: ERA_COLORS[sage.period] ?? '#7a6550' }} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif font-medium text-ink-100 truncate">
                      <Highlighted text={name} range={hit.nameRange} />
                    </p>
                    {hit.via ? (
                      <p className="text-xs text-ink-400 font-sans truncate mt-0.5" dir="auto">
                        <Highlighted text={hit.via} range={hit.viaRange} />
                      </p>
                    ) : sage.name_en && sage.name_en !== name ? (
                      <p className="text-xs text-ink-400 font-sans truncate mt-0.5" dir="auto">{sage.name_en}</p>
                    ) : null}
                  </div>
                  {sage.period && (
                    <EraChip period={sage.period} locale={locale} size="sm" className="flex-shrink-0" />
                  )}
                </li>
              )
            })}
          </ul>

          {dataReady && trimmed.length > 1 && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink-400 font-sans text-center" role="status">
              {t.noResults}
            </p>
          )}

          {shown.length > 0 && (
            <p className="hidden md:block px-4 py-1.5 border-t border-ink-700/40 text-[10px] font-sans text-ink-500">
              {s.hint}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
