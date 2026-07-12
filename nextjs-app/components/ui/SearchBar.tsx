'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { searchSages } from '@/lib/supabase'
import { searchSagesLocal } from '@/lib/search'
import { useAppStore } from '@/store/useAppStore'
import { EraChip } from './EraChip'
import type { Sage, Locale } from '@/lib/types'
import { UI } from '@/lib/i18n'

interface SearchBarProps {
  locale: Locale
  className?: string
}

export function SearchBar({ locale, className }: SearchBarProps) {
  const t = UI[locale]
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<Sage[]>([])
  const [loading, setLoading]     = useState(false)
  const [focused, setFocused]     = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { selectSage, setSearchQuery, sages, connections } = useAppStore()

  // Popular sages (highest connection degree) — suggested on empty focus
  const popular = useMemo(() => {
    if (!sages.length) return []
    const deg = new Map<string, number>()
    connections.forEach(c => {
      deg.set(c.source, (deg.get(c.source) ?? 0) + 1)
      deg.set(c.target, (deg.get(c.target) ?? 0) + 1)
    })
    return [...sages]
      .sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0))
      .slice(0, 6)
  }, [sages, connections])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    // Instant fuzzy client-side search once the dataset is loaded
    // (handles "רמבם" → "רמב״ם" and similar spelling variations)
    if (sages.length > 0) {
      setResults(searchSagesLocal(sages, q, 8))
      return
    }
    // Fallback: Supabase ilike while data is still loading
    setLoading(true)
    const found = await searchSages(q, 8)
    setResults(found)
    setLoading(false)
  }, [sages])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      runSearch(query)
      setSearchQuery(query)
    }, 220)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, runSearch, setSearchQuery])

  const handleSelect = (sage: Sage) => {
    selectSage(sage)
    setQuery('')
    setResults([])
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = query.trim() ? results : popular
    if (!list.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, list.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(list[activeIdx])
    } else if (e.key === 'Escape') {
      setQuery('')
      setResults([])
      inputRef.current?.blur()
    }
  }

  // Suggestions shown: search results while typing, popular sages on empty focus
  const shown = query.trim() ? results : popular
  const showDropdown = focused && (shown.length > 0 || (loading && query.length > 0))

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
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
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
          data-search-input
        />

        {/* Loading spinner */}
        {loading && (
          <svg className="w-4 h-4 text-gold-400 animate-spin flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}

        {/* Clear */}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setResults([]); setSearchQuery('') }}
            className="text-ink-500 hover:text-ink-200 transition-colors flex-shrink-0"
            aria-label="Clear search"
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
          {!query.trim() && shown.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-500">
              {locale === 'he' ? 'חכמים מובילים' : 'Popular sages'}
            </p>
          )}
          <ul role="listbox" aria-label={t.searchLabel}>
            {shown.map((sage, idx) => (
              <li key={sage.id} role="option" aria-selected={idx === activeIdx}>
                <button
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-start',
                    'hover:bg-ink-700/50 transition-colors',
                    idx === activeIdx && 'bg-ink-700/50',
                    idx > 0 && 'border-t border-ink-700/40',
                  )}
                  onMouseDown={() => handleSelect(sage)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif font-medium text-ink-100 truncate">
                      {sage.label}
                    </p>
                    {sage.name_en && (
                      <p className="text-xs text-ink-400 font-sans truncate mt-0.5">
                        {sage.name_en}
                      </p>
                    )}
                  </div>
                  {sage.period && (
                    <EraChip period={sage.period} locale={locale} size="sm" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {results.length === 0 && !loading && query.length > 1 && (
            <p className="px-4 py-3 text-sm text-ink-400 font-sans text-center">
              {t.noResults}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
