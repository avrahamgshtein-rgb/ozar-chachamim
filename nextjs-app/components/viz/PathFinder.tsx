'use client'

import { useState, useRef, useEffect, useMemo, useId } from 'react'
import { cn, formatYearRangeFor } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { searchSagesRanked } from '@/lib/search'
import { displayName } from '@/lib/displayName'
import type { Locale, Sage, Connection, ConnectionType } from '@/lib/types'
import { tr } from '@/lib/i18n'

/** A found path, as the graph draws it: `links[i]` joins `ids[i]` and `ids[i + 1]`. */
export interface GraphPath {
  ids: string[]
  links: Array<Pick<Connection, 'source' | 'target' | 'type'>>
}

/** Colours shared with the graph's edges. */
export const CONNECTION_COLORS: Record<string, string> = {
  student:      '#3b82f6',
  teacher:      '#3b82f6',
  influence:    '#f59e0b',
  colleague:    '#22c55e',
  oppose:       '#ef4444',
  family:       '#a855f7',
  contemporary: '#14b8a6',
  predecessor:  '#64748b',
}

interface PathStep {
  sage: Sage
  /** The link that led here from the previous step. */
  link?: Pick<Connection, 'source' | 'target' | 'type'>
}

function bfs(
  sourceId: string,
  targetId: string,
  connections: Connection[],
  sageMap: Map<string, Sage>,
): PathStep[] | null {
  if (sourceId === targetId) {
    const s = sageMap.get(sourceId)
    return s ? [{ sage: s }] : null
  }

  // Walk links either way, but keep each link as stored so the relation can
  // be told in the right direction afterwards.
  const adj = new Map<string, Array<{ id: string; link: Connection }>>()
  connections.forEach(c => {
    if (!sageMap.has(c.source) || !sageMap.has(c.target)) return
    if (!adj.has(c.source)) adj.set(c.source, [])
    if (!adj.has(c.target)) adj.set(c.target, [])
    adj.get(c.source)!.push({ id: c.target, link: c })
    adj.get(c.target)!.push({ id: c.source, link: c })
  })

  const prev = new Map<string, { from: string; link: Connection }>()
  const visited = new Set<string>([sourceId])
  const queue: string[] = [sourceId]
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]
    for (const nb of adj.get(id) ?? []) {
      if (visited.has(nb.id)) continue
      visited.add(nb.id)
      prev.set(nb.id, { from: id, link: nb.link })
      if (nb.id === targetId) {
        const steps: PathStep[] = []
        let cur = targetId
        while (cur !== sourceId) {
          const p = prev.get(cur)!
          steps.unshift({ sage: sageMap.get(cur)!, link: { source: p.link.source, target: p.link.target, type: p.link.type } })
          cur = p.from
        }
        steps.unshift({ sage: sageMap.get(sourceId)! })
        return steps
      }
      queue.push(nb.id)
    }
  }
  return null
}

/**
 * How `from` stands to `to` across one link, in words: "X taught Y",
 * "X studied under Y". `teacher` means source taught target; `student` means
 * source studied under target; `influence` and `predecessor` run source → target.
 */
export function relationPhrase(
  link: Pick<Connection, 'source' | 'target' | 'type'>,
  fromId: string,
  locale: Locale,
): string {
  const forward = link.source === fromId
  const P = (he: string, en: string, ru: string) => tr(locale, he, en, ru)
  const type = link.type as ConnectionType
  switch (type) {
    case 'teacher':
      return forward ? P('לימד את', 'taught', 'учил') : P('למד אצל', 'studied under', 'учился у')
    case 'student':
      return forward ? P('למד אצל', 'studied under', 'учился у') : P('לימד את', 'taught', 'учил')
    case 'influence':
      return forward ? P('השפיע על', 'influenced', 'повлиял на') : P('הושפע מ־', 'was influenced by', 'испытал влияние')
    case 'predecessor':
      return forward ? P('קדם ל־', 'preceded', 'предшествовал') : P('בא אחרי', 'succeeded', 'сменил')
    case 'oppose':
      return forward ? P('חלק על', 'disputed', 'оспаривал') : P('ספג ביקורת מ־', 'was disputed by', 'встретил возражения от')
    case 'colleague':
      return P('חברו של', 'colleague of', 'коллега')
    case 'contemporary':
      return P('בן דורו של', 'contemporary of', 'современник')
    case 'family':
      return P('קרוב משפחה של', 'related to', 'родственник')
    default:
      return String(type)
  }
}

interface SagePickerProps {
  label: string
  value: Sage | null
  onChange: (s: Sage | null) => void
  locale: Locale
  exclude?: string
  autoFocus?: boolean
}

function SagePicker({ label, value, onChange, locale, exclude, autoFocus }: SagePickerProps) {
  const { sages } = useAppStore()
  const [query, setQuery] = useState(value ? displayName(value.label) : '')
  const [open,  setOpen]  = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`

  // Keep the text in step when the value is set from outside (swap, prefill)
  useEffect(() => { setQuery(value ? displayName(value.label) : '') }, [value])

  const results = useMemo(() => {
    if (!query.trim() || (value && query === displayName(value.label))) return []
    return searchSagesRanked(sages.filter(s => s.id !== exclude), query, { limit: 8 })
  }, [sages, query, exclude, value])

  function pick(s: Sage) {
    onChange(s)
    setQuery(displayName(s.label))
    setOpen(false)
    setActive(-1)
  }

  function clear() {
    onChange(null)
    setQuery('')
    inputRef.current?.focus()
  }

  const showList = open && results.length > 0

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showList) { e.preventDefault(); e.stopPropagation(); setOpen(false) }
      return
    }
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => (i + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive(i => (i <= 0 ? results.length - 1 : i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[active >= 0 ? active : 0].sage) }
  }

  return (
    <div className="relative">
      <label htmlFor={`${baseId}-input`}
        className="block text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-500 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={`${baseId}-input`}
          ref={inputRef}
          value={query}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${baseId}-opt-${active}` : undefined}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1); if (!e.target.value) onChange(null) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={tr(locale, 'חפש חכם…', 'Search sage…', 'Поиск мудреца…')}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'w-full text-sm font-sans ps-3 pe-8 py-2 rounded-lg',
            'bg-ink-800/70 border text-ink-100 placeholder-ink-600',
            'focus:outline-none focus:border-gold-500/50',
            value ? 'border-gold-500/40' : 'border-ink-700/50',
          )}
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        />
        {value && (
          <button
            onClick={clear}
            aria-label={tr(locale, 'נקה', 'Clear', 'Очистить')}
            className="absolute top-1/2 -translate-y-1/2 end-1 w-7 h-7 flex items-center justify-center rounded-md text-ink-500 hover:text-ink-200 text-xs"
          >✕</button>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className={cn(
            'absolute z-50 w-full mt-1 rounded-lg overflow-hidden',
            'bg-ink-800 border border-ink-700/60',
            'shadow-glass-lg max-h-52 overflow-y-auto',
          )}>
          {results.map(({ sage: s }, i) => {
            const color = ERA_COLORS[s.period] ?? '#7a6550'
            return (
              <li
                key={s.id}
                id={`${baseId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={e => { e.preventDefault(); pick(s) }}
                onMouseMove={() => setActive(i)}
                className={cn('flex items-center gap-2 px-3 py-2 cursor-pointer',
                  i === active ? 'bg-ink-700/70' : 'hover:bg-ink-700/60')}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm font-serif text-ink-100 flex-1 truncate">{displayName(s.label)}</span>
                <span className="text-[10px] font-sans text-ink-500 flex-shrink-0">
                  {ERA_LABELS[s.period]?.[locale]}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

interface PathFinderProps {
  locale: Locale
  onClose: () => void
  /** The path found (or null when cleared), for the graph to draw. */
  onPath?: (path: GraphPath | null) => void
  /** Start from this sage, e.g. the one in focus. */
  initialFrom?: Sage | null
}

export function PathFinder({ locale, onClose, onPath, initialFrom = null }: PathFinderProps) {
  const { connections, sageMap, selectSage } = useAppStore()

  const [sageA, setSageA] = useState<Sage | null>(initialFrom)
  const [sageB, setSageB] = useState<Sage | null>(null)

  // Search as soon as both ends are chosen — BFS over ~500 links is instant
  const path = useMemo<PathStep[] | null | 'none'>(() => {
    if (!sageA || !sageB) return 'none'
    return bfs(sageA.id, sageB.id, connections, sageMap)
  }, [sageA, sageB, connections, sageMap])

  // Hand the path to the graph; take it back when the panel goes
  const onPathRef = useRef(onPath)
  onPathRef.current = onPath
  useEffect(() => {
    onPathRef.current?.(Array.isArray(path) && path.length > 1
      ? { ids: path.map(s => s.sage.id), links: path.slice(1).map(s => s.link!) }
      : null)
  }, [path])
  useEffect(() => () => onPathRef.current?.(null), [])

  const degrees = Array.isArray(path) ? path.length - 1 : null
  const years = (s: Sage) => formatYearRangeFor(locale, s.birth_year, s.death_year, s.date_precision)

  return (
    <div
      role="dialog"
      aria-label={tr(locale, 'מוצא מסלול', 'Path Finder', 'Поиск пути')}
      className={cn(
        'glass rounded-2xl border border-ink-700/50 p-4',
        'flex flex-col gap-3 w-[min(18rem,calc(100vw-2rem))]',
        // ends above the graph's zoom cluster, which shares this edge
        'max-h-[calc(100dvh-var(--header-h,64px)-var(--filter-chips-h,3rem)-24rem)]',
        'md:max-h-[calc(100dvh-var(--header-h,64px)-var(--filter-chips-h,3rem)-16.5rem)]',
        'overflow-y-auto overscroll-contain',
      )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-sm font-bold text-ink-100">
            {tr(locale, 'מוצא מסלול', 'Path Finder', 'Поиск пути')}
          </h3>
          <p className="text-[10px] font-sans text-ink-500">
            {tr(locale, 'מה מחבר בין שני חכמים?', 'What connects two sages?', 'Что связывает двух мудрецов?')}
          </p>
        </div>
        <button onClick={onClose}
          aria-label={tr(locale, 'סגור', 'Close', 'Закрыть')}
          className="text-ink-600 hover:text-ink-300 transition-colors p-1.5 rounded-lg hover:bg-ink-700/50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Pickers */}
      <div className="space-y-2">
        <SagePicker
          label={tr(locale, 'חכם א׳', 'Sage A', 'Мудрец А')}
          value={sageA}
          onChange={setSageA}
          locale={locale}
          exclude={sageB?.id}
          autoFocus={!initialFrom}
        />
        <div className="flex justify-center">
          <button
            onClick={() => { setSageA(sageB); setSageB(sageA) }}
            disabled={!sageA && !sageB}
            aria-label={tr(locale, 'החלף כיוון', 'Swap', 'Поменять местами')}
            title={tr(locale, 'החלף כיוון', 'Swap', 'Поменять местами')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-500 hover:text-gold-300 hover:bg-ink-700/50 disabled:opacity-40 transition-colors font-mono"
          >↕</button>
        </div>
        <SagePicker
          label={tr(locale, 'חכם ב׳', 'Sage B', 'Мудрец Б')}
          value={sageB}
          onChange={setSageB}
          locale={locale}
          exclude={sageA?.id}
          autoFocus={!!initialFrom}
        />
      </div>

      {/* Result */}
      {path === null && (
        <div className="text-center text-sm font-sans text-ink-500 py-2" role="status">
          {tr(locale, 'לא נמצא מסלול בין שני חכמים אלה', 'No path found between these sages', 'Путь между этими мудрецами не найден')}
        </div>
      )}

      {Array.isArray(path) && (
        <div className="space-y-2" role="status">
          {/* Degrees badge */}
          <div className="flex items-center justify-center gap-2 py-1">
            <span
              className="text-2xl font-mono font-bold"
              style={{ color: degrees === 1 ? '#27ae60' : degrees && degrees <= 3 ? '#e0b12b' : '#e67e22' }}
            >
              {degrees}
            </span>
            <span className="text-xs font-sans text-ink-400">
              {degrees === 1
                ? tr(locale, 'קשר ישיר', 'direct link', 'прямая связь')
                : tr(locale, 'צעדים', 'steps', degrees && degrees % 10 >= 2 && degrees % 10 <= 4 && (degrees % 100 < 12 || degrees % 100 > 14) ? 'шага' : 'шагов')}
            </span>
          </div>

          {/* Path chain: each step says how the sage above stands to the one below */}
          <ol className="flex flex-col">
            {path.map((step, idx) => {
              const color = ERA_COLORS[step.sage.period] ?? '#7a6550'
              const y = years(step.sage)
              return (
                <li key={step.sage.id}>
                  {idx > 0 && step.link && (
                    <div className="flex items-center gap-2 ps-4 py-1">
                      <span className="w-0.5 h-5 rounded-full flex-shrink-0"
                        style={{ background: CONNECTION_COLORS[step.link.type] ?? '#8a7350' }} aria-hidden />
                      <span className="text-[11px] font-sans text-ink-300">
                        <span aria-hidden className="text-ink-500">↓ </span>
                        {relationPhrase(step.link, path[idx - 1].sage.id, locale)}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => selectSage(step.sage)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg
                      bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/40
                      hover:border-ink-600/60 transition-all text-start group"
                  >
                    <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-mono font-bold text-ink-900"
                      style={{ background: 'var(--gold-400)' }} aria-hidden>
                      {idx + 1}
                    </span>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-serif text-ink-100 group-hover:text-gold-300 transition-colors truncate">
                        {displayName(step.sage.label)}
                      </p>
                      <p className="text-[10px] font-sans text-ink-500 truncate">
                        {ERA_LABELS[step.sage.period]?.[locale]}
                        {y ? ` · ${y}` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
