'use client'

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ALL_PERIODS, ERA_COLORS, ERA_LABELS } from '@/lib/types'
import type { Locale, Period, Sage } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatYearRangeFor } from '@/lib/utils'
import { labelParts } from '@/lib/displayName'
import { normalizeHe, fuzzyIncludes } from '@/lib/search'
import { tr } from '@/lib/i18n'

/*
 * The sages table ("טבלה").
 *
 *  - Rows are the store's `filteredSages` (the global filters), narrowed further
 *    by a quick filter that lives only in this tab.
 *  - Every column sorts. Years sort chronologically and honour `date_precision`:
 *    a century-only sage sits at the middle of its century rather than at its
 *    first year, and undated sages always come last, in both directions.
 *  - Rows render in pages as the reader scrolls (no windowing dependency), so
 *    sorting or filtering all 452 rows never blocks a frame.
 *  - Keyboard: one row is in the tab order at a time (roving tabindex); arrows,
 *    Home/End and PageUp/PageDown move between rows, Enter opens the sage card.
 *  - Below 768px the table becomes a card list with a sort menu, because six
 *    columns cannot fit 390px without scrolling the page sideways.
 */

type SortKey = 'name' | 'period' | 'years' | 'place' | 'field' | 'connections' | 'research'
type SortDir = 'asc' | 'desc'

/** First paint renders this many rows; each scroll step adds two more pages. */
const PAGE = 80

const ERA_INDEX = new Map<Period, number>(ALL_PERIODS.map((p, i) => [p, i]))

/**
 * A sortable year for a sage, or null when undated.
 * Century-precision years are a window, not a lifespan, so the window's middle
 * is the fairest single point; a lone death year stands in for a birth a
 * lifetime earlier, so it doesn't jump ahead of contemporaries by 60 years.
 */
function chronoKey(s: Sage): number | null {
  const b = s.birth_year, d = s.death_year
  if (b == null && d == null) return null
  if (s.date_precision === 'century') {
    if (b != null && d != null) return (b + d) / 2
    return (b ?? d!) + 50
  }
  if (b != null) return b
  return d! - 60
}

/** Default direction when a column is first chosen: counts and flags read best high-to-low. */
const FIRST_DIR: Record<SortKey, SortDir> = {
  name: 'asc', period: 'asc', years: 'asc', place: 'asc', field: 'asc',
  connections: 'desc', research: 'desc',
}

interface Column {
  key: SortKey
  label: (l: Locale) => string
  /** Tailwind width class for the column. */
  cls: string
  /** Hidden below the lg breakpoint (the field column). */
  wide?: boolean
  align?: 'center'
}

const COLUMNS: Column[] = [
  { key: 'name',        label: l => tr(l, 'שם', 'Name', 'Имя'),              cls: '' },
  { key: 'period',      label: l => tr(l, 'תקופה', 'Era', 'Эпоха'),          cls: 'w-[132px]' },
  { key: 'years',       label: l => tr(l, 'שנים', 'Years', 'Годы'),          cls: 'w-[140px]' },
  { key: 'place',       label: l => tr(l, 'מקום', 'Place', 'Место'),         cls: 'w-[190px]' },
  { key: 'field',       label: l => tr(l, 'תחום', 'Field', 'Область'),       cls: 'w-[180px]', wide: true },
  { key: 'connections', label: l => tr(l, 'קשרים', 'Links', 'Связи'),        cls: 'w-[92px]', align: 'center' },
  { key: 'research',    label: l => tr(l, 'מחקר', 'Research', 'Иссл.'),      cls: 'w-[76px]', align: 'center' },
]

/** Matches `(max-width: 767px)`; the table and the card list are never both mounted. */
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

/** One table/card row, precomputed once per data change so sorting only reorders. */
interface RowModel {
  sage: Sage
  name: string
  /** Muted second line: the essay subtitle, the full name behind an acronym, or name_en. */
  sub: string | null
  years: string
  chrono: number | null
  place: string
  degree: number
  haystack: string
}

interface SagesTableProps { locale: Locale }

export function SagesTable({ locale }: SagesTableProps) {
  const filteredSages  = useAppStore(s => s.filteredSages)
  const sages          = useAppStore(s => s.sages)
  const connections    = useAppStore(s => s.connections)
  const sageMap        = useAppStore(s => s.sageMap)
  const selectSage     = useAppStore(s => s.selectSage)
  const selectedSageId = useAppStore(s => s.selectedSageId)
  const clearFilters   = useAppStore(s => s.clearFilters)

  const narrow = useIsNarrow()
  const isRtl = locale === 'he'

  const [sortKey, setSortKey] = useState<SortKey>('period')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  // Degree counts only links whose other end is a sage we can show.
  const degreeMap = useMemo(() => {
    const m = new Map<string, number>()
    connections.forEach(c => {
      if (!sageMap.has(c.source) || !sageMap.has(c.target)) return
      m.set(c.source, (m.get(c.source) ?? 0) + 1)
      m.set(c.target, (m.get(c.target) ?? 0) + 1)
    })
    return m
  }, [connections, sageMap])

  const maxDegree = useMemo(() => Math.max(1, ...degreeMap.values()), [degreeMap])

  const models = useMemo(() => filteredSages.map((sage): RowModel => {
    const parts = labelParts(sage.label)
    const sub = parts.tagline ?? parts.fullName ?? (locale === 'he' ? sage.name_en ?? null : null)
    const years = formatYearRangeFor(locale, sage.birth_year, sage.death_year, sage.date_precision)
    return {
      sage,
      name: parts.name,
      sub,
      years,
      chrono: chronoKey(sage),
      place: (sage.location ?? '').trim(),
      degree: degreeMap.get(sage.id) ?? 0,
      haystack: normalizeHe([
        sage.label, sage.name_en, sage.location, sage.field, years,
        ERA_LABELS[sage.period]?.[locale],
      ].filter(Boolean).join(' · ')),
    }
  }), [filteredSages, degreeMap, locale])

  const rows = useMemo(() => {
    const q = normalizeHe(deferredQuery)
    const list = q ? models.filter(m => m.haystack.includes(q) || fuzzyIncludes(m.name, q)) : models.slice()
    const collator = new Intl.Collator(locale === 'he' ? 'he' : locale, { sensitivity: 'base', numeric: true })
    const byChrono = (a: RowModel, b: RowModel) => (a.chrono ?? Infinity) - (b.chrono ?? Infinity)
    const byName = (a: RowModel, b: RowModel) => collator.compare(a.name, b.name)
    const sign = sortDir === 'asc' ? 1 : -1

    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = sign * byName(a, b)
          break
        case 'period':
          cmp = sign * ((ERA_INDEX.get(a.sage.period) ?? 99) - (ERA_INDEX.get(b.sage.period) ?? 99))
          if (!cmp) cmp = byChrono(a, b)
          break
        case 'years':
          // Undated rows stay at the bottom whichever way the column is sorted.
          if (a.chrono == null || b.chrono == null) {
            cmp = a.chrono == null && b.chrono == null ? 0 : a.chrono == null ? 1 : -1
          } else {
            cmp = sign * (a.chrono - b.chrono)
            // Same year: a real date before a century guess.
            if (!cmp) cmp = Number(a.sage.date_precision === 'century') - Number(b.sage.date_precision === 'century')
          }
          break
        case 'place':
          if (!a.place || !b.place) cmp = !a.place && !b.place ? 0 : !a.place ? 1 : -1
          else cmp = sign * collator.compare(a.place, b.place)
          break
        case 'field':
          if (!a.sage.field || !b.sage.field) cmp = !a.sage.field && !b.sage.field ? 0 : !a.sage.field ? 1 : -1
          else cmp = sign * collator.compare(a.sage.field, b.sage.field)
          break
        case 'connections':
          cmp = sign * (a.degree - b.degree)
          break
        case 'research':
          cmp = sign * (Number(!!a.sage.has_research) - Number(!!b.sage.has_research))
          break
      }
      return cmp || byChrono(a, b) || byName(a, b)
    })
    return list
  }, [models, deferredQuery, sortKey, sortDir, locale])

  // ── Incremental rendering ────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [limit, setLimit] = useState(PAGE)
  const viewKey = `${sortKey}|${sortDir}|${deferredQuery}|${filteredSages.length}|${narrow}`
  useEffect(() => {
    setLimit(PAGE)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [viewKey])
  useEffect(() => {
    const root = scrollRef.current, el = sentinelRef.current
    if (!root || !el || limit >= rows.length) return
    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) setLimit(l => l + PAGE * 2) },
      { root, rootMargin: '900px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [limit, rows.length])
  const visible = rows.slice(0, limit)

  // ── Roving focus ─────────────────────────────────────────────────────────
  const [activeIdx, setActiveIdx] = useState(0)
  useEffect(() => { setActiveIdx(0) }, [viewKey])
  const focusRow = useCallback((i: number) => {
    const idx = Math.max(0, Math.min(rows.length - 1, i))
    if (idx >= limit) setLimit(Math.ceil((idx + 1) / PAGE) * PAGE + PAGE)
    setActiveIdx(idx)
    // The row may only exist after the next render.
    requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector<HTMLElement>(`[data-row="${idx}"]`)
      el?.focus()
      el?.scrollIntoView({ block: 'nearest' })
    })
  }, [rows.length, limit])

  const open = useCallback((id: string) => {
    const s = sageMap.get(id)
    if (s) selectSage(s)
  }, [sageMap, selectSage])

  const onRowsKeyDown = useCallback((e: ReactKeyboardEvent<HTMLElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-row]')
    if (!target) return
    const i = Number(target.dataset.row)
    const step = narrow ? 5 : 10
    switch (e.key) {
      case 'ArrowDown': focusRow(i + 1); break
      case 'ArrowUp':   focusRow(i - 1); break
      case 'PageDown':  focusRow(i + step); break
      case 'PageUp':    focusRow(i - step); break
      case 'Home':      focusRow(0); break
      case 'End':       focusRow(rows.length - 1); break
      case 'Enter':
      case ' ':
        open(target.dataset.id!)
        break
      default: return
    }
    e.preventDefault()
  }, [focusRow, open, narrow, rows.length])

  function chooseSort(key: SortKey, dir?: SortDir) {
    if (dir) { setSortKey(key); setSortDir(dir); return }
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(FIRST_DIR[key]) }
  }

  // ── CSV export ───────────────────────────────────────────────────────────
  function exportCsv() {
    const head = [
      'id',
      tr(locale, 'שם', 'Name', 'Имя'),
      tr(locale, 'שם מלא (כותרת)', 'Full label', 'Полное название'),
      tr(locale, 'תקופה', 'Era', 'Эпоха'),
      tr(locale, 'שנים', 'Years', 'Годы'),
      tr(locale, 'שנת לידה', 'Birth year', 'Год рождения'),
      tr(locale, 'שנת פטירה', 'Death year', 'Год смерти'),
      tr(locale, 'דיוק תיארוך', 'Date precision', 'Точность даты'),
      tr(locale, 'מקום', 'Place', 'Место'),
      tr(locale, 'תחום', 'Field', 'Область'),
      tr(locale, 'קשרים', 'Links', 'Связи'),
      tr(locale, 'מחקר', 'Research', 'Исследование'),
    ]
    const cell = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const yes = tr(locale, 'כן', 'yes', 'да')
    const lines = [head, ...rows.map(r => [
      r.sage.id, r.name, r.sage.label, ERA_LABELS[r.sage.period]?.[locale] ?? r.sage.period,
      r.years, r.sage.birth_year, r.sage.death_year, r.sage.date_precision ?? '',
      r.place, r.sage.field ?? '', r.degree, r.sage.has_research ? yes : '',
    ])].map(line => line.map(cell).join(','))
    // The BOM makes Excel read the file as UTF-8; without it Hebrew opens as mojibake.
    const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ozar-chachamim-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const globallyFiltered = filteredSages.length < sages.length
  const nf = (n: number) => n.toLocaleString(locale === 'he' ? 'he-IL' : locale)

  const countLabel = tr(locale,
    `${nf(rows.length)} מתוך ${nf(sages.length)} חכמים`,
    `${nf(rows.length)} of ${nf(sages.length)} sages`,
    `${nf(rows.length)} из ${nf(sages.length)} мудрецов`)

  const empty = rows.length === 0 && sages.length > 0

  return (
    <div className="st-root absolute inset-0 flex flex-col overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <style>{TABLE_CSS}</style>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-ink-700/50 bg-ink-900/80 backdrop-blur-sm px-3 md:px-4 py-2.5">
        <div className="flex items-center gap-2 md:gap-3">
          <label className="relative flex-1 md:flex-none md:w-80 min-w-0">
            <span className="sr-only">{tr(locale, 'סינון מהיר בטבלה', 'Quick filter', 'Быстрый фильтр')}</span>
            <svg aria-hidden className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-ink-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.2-5.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={tr(locale, 'סינון מהיר: שם, מקום, תחום…', 'Quick filter: name, place, field…', 'Фильтр: имя, место, область…')}
              className={cn(
                'st-input w-full h-10 rounded-lg ps-9 pe-9 text-sm font-sans',
                'bg-ink-800/70 border border-ink-700 text-ink-100 placeholder:text-ink-500',
                'focus:outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20 transition-colors',
              )}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label={tr(locale, 'נקה סינון מהיר', 'Clear quick filter', 'Очистить фильтр')}
                className="absolute top-1/2 -translate-y-1/2 end-2 w-7 h-7 rounded-md flex items-center justify-center text-ink-400 hover:text-gold-300 hover:bg-ink-700/60"
              >
                ×
              </button>
            )}
          </label>

          <div className="hidden md:flex items-center gap-2 min-w-0" aria-live="polite">
            <span className="text-xs font-sans text-ink-400 tabular-nums whitespace-nowrap">{countLabel}</span>
            {globallyFiltered && (
              <button
                onClick={clearFilters}
                className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-300 border border-gold-500/30 hover:bg-gold-500/25 whitespace-nowrap"
                title={tr(locale, 'הטבלה מציגה את הסינון הכללי. לחץ לניקוי', 'Global filters apply. Click to clear', 'Действуют общие фильтры. Нажмите, чтобы сбросить')}
              >
                {tr(locale, 'מסונן · נקה', 'filtered · clear', 'фильтр · сбросить')}
              </button>
            )}
          </div>

          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            title={tr(locale, 'ייצוא התצוגה הנוכחית כקובץ CSV', 'Export the current view as CSV', 'Экспорт текущего вида в CSV')}
            aria-label={tr(locale, 'ייצוא CSV של התצוגה הנוכחית', 'Export current view as CSV', 'Экспорт текущего вида в CSV')}
            className={cn(
              'ms-auto flex-shrink-0 h-10 rounded-lg px-3 flex items-center gap-2 text-sm font-sans font-medium',
              'border border-ink-700 text-ink-200 hover:text-gold-300 hover:border-gold-500/50 hover:bg-gold-500/10 transition-colors',
              'disabled:opacity-40 disabled:pointer-events-none',
            )}
          >
            <svg aria-hidden className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
            </svg>
            <span className="hidden sm:inline">{tr(locale, 'ייצוא CSV', 'Export CSV', 'Экспорт CSV')}</span>
          </button>
        </div>

        {/* Narrow screens: count + sort menu on a second line */}
        {narrow && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-sans text-ink-400 tabular-nums truncate" aria-live="polite">{countLabel}</span>
            {globallyFiltered && (
              <button
                onClick={clearFilters}
                className="flex-shrink-0 text-[11px] font-sans px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-300 border border-gold-500/30"
              >
                {tr(locale, 'מסונן · נקה', 'filtered · clear', 'фильтр · сбросить')}
              </button>
            )}
            <label className="ms-auto flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[11px] font-sans text-ink-500">{tr(locale, 'מיון', 'Sort', 'Сорт.')}</span>
              <select
                value={sortKey}
                onChange={e => chooseSort(e.target.value as SortKey, FIRST_DIR[e.target.value as SortKey])}
                className="h-9 rounded-lg bg-ink-800/70 border border-ink-700 text-ink-100 text-sm font-sans px-2 focus:outline-none focus:border-gold-500/60"
              >
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label(locale)}</option>)}
              </select>
            </label>
            <button
              onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              aria-label={sortDir === 'asc'
                ? tr(locale, 'סדר עולה — הפוך', 'Ascending — reverse', 'По возрастанию — обратить')
                : tr(locale, 'סדר יורד — הפוך', 'Descending — reverse', 'По убыванию — обратить')}
              className="flex-shrink-0 w-9 h-9 rounded-lg border border-ink-700 text-gold-300 flex items-center justify-center text-base"
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="st-scroll flex-1 overflow-y-auto overflow-x-hidden">
        {empty ? (
          <div className="px-6 py-16 text-center font-sans">
            <p className="text-sm text-ink-300">
              {query
                ? tr(locale, `אין חכמים התואמים ל״${query}״`, `No sages match “${query}”`, `Нет мудрецов по запросу «${query}»`)
                : tr(locale, 'אין חכמים התואמים לסינון הנוכחי', 'No sages match the current filters', 'Нет мудрецов по текущим фильтрам')}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {query && (
                <button onClick={() => setQuery('')} className="text-xs px-3 py-1.5 rounded-lg border border-ink-700 text-ink-200 hover:border-gold-500/50 hover:text-gold-300">
                  {tr(locale, 'נקה סינון מהיר', 'Clear quick filter', 'Очистить фильтр')}
                </button>
              )}
              {globallyFiltered && (
                <button onClick={clearFilters} className="text-xs px-3 py-1.5 rounded-lg border border-ink-700 text-ink-200 hover:border-gold-500/50 hover:text-gold-300">
                  {tr(locale, 'נקה סינון כללי', 'Clear global filters', 'Сбросить общие фильтры')}
                </button>
              )}
            </div>
          </div>
        ) : narrow ? (
          <ul
            role="list"
            className="px-3 pt-3 pb-40 space-y-2"
            onKeyDown={onRowsKeyDown}
            aria-label={tr(locale, 'רשימת חכמים', 'Sages', 'Мудрецы')}
          >
            {visible.map((m, i) => (
              <SageCardRow
                key={m.sage.id}
                m={m}
                index={i}
                locale={locale}
                tabbable={i === activeIdx}
                selected={m.sage.id === selectedSageId}
                onOpen={open}
                onFocusRow={setActiveIdx}
              />
            ))}
          </ul>
        ) : (
          <table
            className="st-table w-full table-fixed border-separate border-spacing-0 text-sm font-sans"
            aria-rowcount={rows.length + 1}
            aria-label={tr(locale, 'טבלת חכמים', 'Sages table', 'Таблица мудрецов')}
          >
            <colgroup>
              {COLUMNS.map(c => <col key={c.key} className={cn(c.cls, c.wide && 'hidden lg:table-column')} />)}
            </colgroup>
            <thead>
              <tr aria-rowindex={1}>
                {COLUMNS.map(col => {
                  const active = col.key === sortKey
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={cn(
                        'st-th sticky top-0 z-10 p-0 text-start border-b border-ink-700/70',
                        col.wide && 'hidden lg:table-cell',
                      )}
                    >
                      <button
                        onClick={() => chooseSort(col.key)}
                        className={cn(
                          'w-full h-11 px-3 flex items-center gap-1.5 select-none',
                          'text-[11px] font-semibold uppercase tracking-wider transition-colors',
                          col.align === 'center' && 'justify-center',
                          active ? 'text-gold-300' : 'text-ink-400 hover:text-ink-100',
                        )}
                      >
                        <span className="truncate">{col.label(locale)}</span>
                        <SortArrow state={active ? sortDir : null} />
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody onKeyDown={onRowsKeyDown}>
              {visible.map((m, i) => (
                <SageTableRow
                  key={m.sage.id}
                  m={m}
                  index={i}
                  locale={locale}
                  maxDegree={maxDegree}
                  tabbable={i === activeIdx}
                  selected={m.sage.id === selectedSageId}
                  onOpen={open}
                  onFocusRow={setActiveIdx}
                />
              ))}
            </tbody>
          </table>
        )}
        {!empty && limit < rows.length && (
          <div ref={sentinelRef} className="py-6 text-center text-[11px] font-sans text-ink-500" aria-hidden>
            {tr(locale, 'טוען עוד…', 'Loading more…', 'Загрузка…')}
          </div>
        )}
        {!narrow && !empty && <div className="h-28" aria-hidden />}
      </div>
    </div>
  )
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

function SortArrow({ state }: { state: SortDir | null }) {
  if (!state) return <span aria-hidden className="text-ink-600 text-[10px]">⇅</span>
  return <span aria-hidden className="text-gold-400 text-xs leading-none">{state === 'asc' ? '▲' : '▼'}</span>
}

function ResearchIcon({ locale, className }: { locale: Locale; className?: string }) {
  const label = tr(locale, 'יש מחקר', 'Has research', 'Есть исследование')
  return (
    <span role="img" aria-label={label} title={label} className={cn('inline-flex text-gold-400', className)}>
      <svg aria-hidden className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 6.5C10.3 5.2 7.9 4.5 5 4.5v13c2.9 0 5.3.7 7 2m0-13c1.7-1.3 4.1-2 7-2v13c-2.9 0-5.3.7-7 2m0-13v13" />
      </svg>
    </span>
  )
}

interface RowProps {
  m: RowModel
  index: number
  locale: Locale
  tabbable: boolean
  selected: boolean
  onOpen: (id: string) => void
  onFocusRow: (i: number) => void
}

const SageTableRow = memo(function SageTableRow({
  m, index, locale, maxDegree, tabbable, selected, onOpen, onFocusRow,
}: RowProps & { maxDegree: number }) {
  const { sage } = m
  const color = ERA_COLORS[sage.period] ?? '#7a6550'
  const century = sage.date_precision === 'century'
  return (
    <tr
      data-row={index}
      data-id={sage.id}
      aria-rowindex={index + 2}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => { onFocusRow(index); onOpen(sage.id) }}
      onFocus={() => onFocusRow(index)}
      className={cn('st-row cursor-pointer', selected && 'st-row-selected')}
      style={{ ['--c' as string]: color }}
    >
      <td className="px-3 py-2.5 border-b border-ink-800/70" title={sage.label}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span aria-hidden className="st-era-bar" />
          <div className="min-w-0">
            <div className="font-serif text-[15px] font-semibold text-ink-100 leading-snug truncate">{m.name}</div>
            {m.sub && <div className="text-[11px] text-ink-500 leading-snug truncate mt-0.5">{m.sub}</div>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 border-b border-ink-800/70">
        <span className="st-era-chip">
          <span aria-hidden className="st-era-dot" />
          {ERA_LABELS[sage.period]?.[locale] ?? sage.period}
        </span>
      </td>
      <td className="px-3 py-2.5 border-b border-ink-800/70">
        {m.years ? (
          <span
            className={cn('text-xs tabular-nums whitespace-nowrap', century ? 'text-ink-400 italic' : 'text-ink-200')}
            title={century ? tr(locale, 'תיארוך לפי מאה בלבד', 'Dated to a century only', 'Датировано только веком') : undefined}
          >
            {m.years}
          </span>
        ) : (
          <span className="text-xs text-ink-600" aria-label={tr(locale, 'ללא תיארוך', 'Undated', 'Без даты')}>—</span>
        )}
      </td>
      <td className="px-3 py-2.5 border-b border-ink-800/70">
        <span className="block text-xs text-ink-300 truncate" title={m.place || undefined}>{m.place || '—'}</span>
      </td>
      <td className="px-3 py-2.5 border-b border-ink-800/70 hidden lg:table-cell">
        <span className="block text-xs text-ink-400 truncate" title={sage.field || undefined}>{sage.field || '—'}</span>
      </td>
      <td className="px-3 py-2.5 border-b border-ink-800/70 text-center">
        {m.degree > 0 ? (
          <span className="st-degree" style={{ ['--w' as string]: `${Math.round((m.degree / maxDegree) * 100)}%` }}>
            <span className="relative tabular-nums">{m.degree}</span>
          </span>
        ) : <span className="text-xs text-ink-600">0</span>}
      </td>
      <td className="px-3 py-2.5 border-b border-ink-800/70 text-center">
        {sage.has_research ? <ResearchIcon locale={locale} /> : <span className="text-xs text-ink-700" aria-hidden>·</span>}
      </td>
    </tr>
  )
})

const SageCardRow = memo(function SageCardRow({
  m, index, locale, tabbable, selected, onOpen, onFocusRow,
}: RowProps) {
  const { sage } = m
  const color = ERA_COLORS[sage.period] ?? '#7a6550'
  const linksLabel = tr(locale, 'קשרים', 'links', 'связей')
  return (
    <li>
      <div
        role="button"
        data-row={index}
        data-id={sage.id}
        tabIndex={tabbable ? 0 : -1}
        aria-current={selected || undefined}
        onClick={() => { onFocusRow(index); onOpen(sage.id) }}
        onFocus={() => onFocusRow(index)}
        className={cn('st-card cursor-pointer rounded-xl px-3 py-2.5 flex gap-3', selected && 'st-row-selected')}
        style={{ ['--c' as string]: color }}
      >
        <span aria-hidden className="st-era-bar self-stretch" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif text-base font-semibold text-ink-100 leading-snug truncate">{m.name}</span>
            {sage.has_research && <ResearchIcon locale={locale} className="flex-shrink-0 ms-auto" />}
          </div>
          {m.sub && <p className="text-xs text-ink-500 leading-snug truncate">{m.sub}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-sans">
            <span className="st-era-chip">
              <span aria-hidden className="st-era-dot" />
              {ERA_LABELS[sage.period]?.[locale] ?? sage.period}
            </span>
            {m.years && (
              <span className={cn('tabular-nums', sage.date_precision === 'century' ? 'text-ink-400 italic' : 'text-ink-200')}>
                {m.years}
              </span>
            )}
            {m.place && <span className="text-ink-400 truncate max-w-[11rem]">{m.place}</span>}
            {m.degree > 0 && <span className="text-ink-500 tabular-nums">{m.degree} {linksLabel}</span>}
          </div>
        </div>
      </div>
    </li>
  )
})

/* Era colours come from data, so rows carry them as --c; everything else reads
   theme variables and needs no re-render when the theme flips. */
const TABLE_CSS = `
.st-root .st-th { background: rgb(var(--ink-900-rgb) / .96); backdrop-filter: blur(6px); }
.st-root .st-row { transition: background-color .12s ease; }
.st-root .st-row:nth-child(even) { background: rgb(var(--ink-800-rgb) / .22); }
.st-root .st-row:hover { background: rgb(var(--ink-700-rgb) / .45); }
.st-root .st-row:focus-visible { outline: 2px solid var(--gold-500); outline-offset: -2px; border-radius: 0; background: rgb(var(--ink-700-rgb) / .45); }
.st-root .st-row-selected, .st-root .st-row-selected:nth-child(even) { background: rgb(var(--gold-500-rgb) / .12); }
.st-root .st-era-bar { display: block; width: 3px; min-height: 28px; border-radius: 2px; background: var(--c); opacity: .85; flex-shrink: 0; }
.st-root .st-era-chip { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; font-size: 11px; font-weight: 600; line-height: 1; padding: 4px 8px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.st-root .st-era-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c); flex-shrink: 0; }
.st-root .st-degree { position: relative; display: inline-flex; align-items: center; justify-content: center; min-width: 38px; padding: 3px 6px; border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--ink-100); overflow: hidden; background: rgb(var(--ink-700-rgb) / .35); }
.st-root .st-degree::before { content: ''; position: absolute; inset-block: 0; inset-inline-start: 0; width: var(--w); background: color-mix(in srgb, var(--c) 30%, transparent); }
.st-root .st-card { background: rgb(var(--ink-800-rgb) / .45); border: 1px solid rgb(var(--ink-700-rgb) / .7); transition: background-color .12s ease, border-color .12s ease; }
.st-root .st-card:active { background: rgb(var(--ink-700-rgb) / .6); }
.st-root .st-card:focus-visible { outline: 2px solid var(--gold-500); outline-offset: 1px; }
.st-root .st-card.st-row-selected { border-color: rgb(var(--gold-500-rgb) / .5); }
[data-theme='light'] .st-root .st-era-chip { color: color-mix(in srgb, var(--c), #000 28%); }
[data-theme='light'] .st-root .st-era-bar { background: color-mix(in srgb, var(--c), #000 15%); }
.st-root .st-input::-webkit-search-cancel-button { display: none; }
`
