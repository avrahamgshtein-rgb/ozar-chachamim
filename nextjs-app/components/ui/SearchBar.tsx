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
import { askQuestion, looksLikeQuestion } from '@/components/chat/askAbout'
import { searchThumb, usePortraitLookup } from './usePortraitLookup'
import type { SearchThumb } from './usePortraitLookup'

interface SearchBarProps {
  locale: Locale
  className?: string
}

const T: Record<Locale, { popular: string; loading: string; hint: string; clear: string; ask: string; askSub: string }> = {
  he: { popular: 'חכמים מובילים', loading: 'טוען את מאגר החכמים…', hint: '↑↓ לבחירה · Enter לפתיחה · Esc לסגירה', clear: 'נקה חיפוש',
    ask: 'שאלו את העוזר', askSub: 'תשובה מתוך המחקר, עם מקורות' },
  en: { popular: 'Popular sages', loading: 'Loading the sages…', hint: '↑↓ to choose · Enter to open · Esc to close', clear: 'Clear search',
    ask: 'Ask the assistant', askSub: 'An answer from the research, with sources' },
  ru: { popular: 'Известные мудрецы', loading: 'Загружаем мудрецов…', hint: '↑↓ выбор · Enter открыть · Esc закрыть', clear: 'Очистить поиск',
    ask: 'Спросить ассистента', askSub: 'Ответ из исследования, со ссылками на источники' },
}

/** What the list holds: sages, plus the assistant's own row once there is something to ask. */
type Option = { kind: 'sage'; hit: SearchHit } | { kind: 'ask' }

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

/**
 * The sage's own picture in a result row, in place of the era dot: 36 px, the small file, its caption as the `title`
 * (a thumbnail is too small for a visible caption; the sage page and the Today card show it).
 */
export function SearchPortraitThumb({ id, thumb, color }: { id: string; thumb: SearchThumb; color: string }) {
  return (
    <img
      src={thumb.src}
      alt=""
      title={thumb.title}
      width={36}
      height={36}
      loading="lazy"
      decoding="async"
      data-portrait={id}
      data-portrait-kind={thumb.kind}
      className="h-9 w-9 flex-shrink-0 rounded-lg border object-cover"
      style={{ borderColor: `${color}88` }}
    />
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
    // Only a real change: every call re-filters and reheats the graph layout
    timerRef.current = setTimeout(() => {
      if (useAppStore.getState().filters.searchQuery !== query) setSearchQuery(query)
    }, 220)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, setSearchQuery])

  const trimmed = query.trim()
  // Suggestions shown: search results while typing, popular sages on empty focus
  const sageHits = trimmed ? results : popular
  const loadingData = !dataReady && trimmed.length > 0
  // The assistant is always one row away once three characters are typed; a text that reads as a
  // question puts it first, so Enter asks instead of opening the nearest name.
  const askable = trimmed.length >= 3
  const askFirst = askable && looksLikeQuestion(trimmed)
  const shown: Option[] = [
    ...(askFirst ? [{ kind: 'ask' } as Option] : []),
    ...sageHits.map(hit => ({ kind: 'sage', hit }) as Option),
    ...(askable && !askFirst ? [{ kind: 'ask' } as Option] : []),
  ]
  const showDropdown = open && (shown.length > 0 || loadingData || trimmed.length > 1)

  // The sages' portraits arrive in their own chunk the first time there is a sage to list; until then (and for a
  // sage without one) the row keeps its era dot. When a list holds a portrait, the dots of the other rows sit in a
  // slot as wide as the thumbnail, so the names start at the same place.
  const portraits = usePortraitLookup(showDropdown && sageHits.length > 0)
  const listHasPortrait = !!portraits && sageHits.some(h => portraits.hasPortrait(h.sage.id))

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

  const finish = () => {
    reset()
    setOpen(false)
    inputRef.current?.blur()
    // The mobile overlay has done its job once a sage is chosen
    if (isSearchOpen) toggleSearch()
  }

  const handleSelect = (hit: SearchHit) => {
    selectSage(hit.sage)
    finish()
  }

  const handleAsk = () => {
    const text = trimmed
    finish()
    askQuestion(text)
  }

  const choose = (opt: Option) => (opt.kind === 'ask' ? handleAsk() : handleSelect(opt.hit))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      // Close now, not on the delayed blur: Tab must land on the next header
      // control, never inside a list that is about to unmount (focus → body).
      setOpen(false)
      setActiveIdx(-1)
      return
    }
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
        choose(pick)
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
            'text-sm font-sans outline-none border-none focus-visible:outline-none',
            // our own clear button replaces the browser's
            '[&::-webkit-search-cancel-button]:appearance-none',
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
          // near-opaque: the filter chips sit right under the list
          style={{ background: 'rgb(var(--ink-850-rgb) / 0.97)' }}
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
            // Chrome puts scrollable boxes in the Tab order; this one is driven
            // by the arrow keys from the input instead
            tabIndex={-1}
            className="max-h-[min(60vh,26rem)] overflow-y-auto"
          >
            {shown.map((opt, idx) => {
              const active = idx === activeIdx
              if (opt.kind === 'ask') {
                return (
                  <li
                    key="ask-the-assistant"
                    id={optionId(idx)}
                    role="option"
                    aria-selected={active}
                    onMouseDown={e => { e.preventDefault(); handleAsk() }}
                    onMouseMove={() => { if (!active) setActiveIdx(idx) }}
                    className={cn(
                      'relative w-full flex items-center gap-3 px-4 py-2.5 text-start cursor-pointer',
                      'transition-colors',
                      active ? 'bg-gold-500/10' : 'hover:bg-ink-700/40',
                      idx > 0 && 'border-t border-ink-700/40',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn('absolute inset-y-1.5 start-0 w-0.5 rounded-full transition-opacity',
                        active ? 'bg-gold-400 opacity-100' : 'opacity-0')}
                    />
                    <svg className="w-4 h-4 flex-shrink-0 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 10h8M8 14h5m-9 6l2.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-serif font-medium text-ink-100 truncate" dir="auto">
                        {s.ask}: <span className="text-gold-300">{trimmed}</span>
                      </p>
                      <p className="text-xs text-ink-400 font-sans truncate mt-0.5">{s.askSub}</p>
                    </div>
                  </li>
                )
              }
              const { hit } = opt
              const { sage } = hit
              const name = displayName(sage.label)
              const eraColor = ERA_COLORS[sage.period] ?? '#7a6550'
              const thumb = searchThumb(portraits, sage.id, locale)
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
                  {thumb ? (
                    <SearchPortraitThumb id={sage.id} thumb={thumb} color={eraColor} />
                  ) : listHasPortrait ? (
                    <span className="flex w-9 flex-shrink-0 justify-center" aria-hidden>
                      <span className="era-dot" style={{ background: eraColor }} />
                    </span>
                  ) : (
                    <span className="era-dot" style={{ background: eraColor }} aria-hidden />
                  )}
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

          {dataReady && trimmed.length > 1 && results.length === 0 && !askFirst && (
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
