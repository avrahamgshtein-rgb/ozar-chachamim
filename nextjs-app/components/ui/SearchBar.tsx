'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { searchSages } from '@/lib/supabase'
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

  const { selectSage, setSearchQuery } = useAppStore()

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const found = await searchSages(q, 8)
    setResults(found)
    setLoading(false)
  }, [])

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
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(results[activeIdx])
    } else if (e.key === 'Escape') {
      setQuery('')
      setResults([])
      inputRef.current?.blur()
    }
  }

  const showDropdown = focused && (results.length > 0 || (loading && query.length > 0))

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
          <ul role="listbox" aria-label={t.searchLabel}>
            {results.map((sage, idx) => (
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
