'use client'

import { useState, useCallback, useRef, memo } from 'react'
import { cn } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS, CONNECTION_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { formatYearRange } from '@/lib/utils'
import type { Locale, Sage, Connection } from '@/lib/types'
import { tr } from '@/lib/i18n'

interface PathStep {
  sage: Sage
  connectionType?: string   // connection TO this node from previous
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

  // Bidirectional adjacency
  const adj = new Map<string, Array<{ id: string; type: string }>>()
  connections.forEach(c => {
    if (!adj.has(c.source)) adj.set(c.source, [])
    if (!adj.has(c.target)) adj.set(c.target, [])
    adj.get(c.source)!.push({ id: c.target, type: c.type })
    adj.get(c.target)!.push({ id: c.source, type: c.type })
  })

  type QItem = { id: string; path: PathStep[] }
  const visited = new Set<string>([sourceId])
  const queue: QItem[] = [{ id: sourceId, path: [{ sage: sageMap.get(sourceId)! }] }]

  while (queue.length > 0) {
    const { id, path } = queue.shift()!
    for (const nb of adj.get(id) ?? []) {
      if (visited.has(nb.id)) continue
      visited.add(nb.id)
      const sage = sageMap.get(nb.id)
      if (!sage) continue
      const newPath: PathStep[] = [...path, { sage, connectionType: nb.type }]
      if (nb.id === targetId) return newPath
      queue.push({ id: nb.id, path: newPath })
    }
  }
  return null
}

interface SagePickerProps {
  label: string
  value: Sage | null
  onChange: (s: Sage | null) => void
  locale: Locale
  exclude?: string
}

function SagePicker({ label, value, onChange, locale, exclude }: SagePickerProps) {
  const { sages } = useAppStore()
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = query.length >= 1
    ? sages
        .filter(s => s.id !== exclude)
        .filter(s =>
          s.label.includes(query) ||
          s.name_en?.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : []

  function pick(s: Sage) {
    onChange(s)
    setQuery(s.label)
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-500 mb-1">
        {label}
      </p>
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={tr(locale, 'חפש חכם…', 'Search sage…', 'Поиск мудреца…')}
          className={cn(
            'w-full text-sm font-sans px-3 py-2 rounded-lg',
            'bg-ink-800/70 border text-ink-100 placeholder-ink-600',
            'focus:outline-none focus:border-gold-500/50',
            value ? 'border-gold-500/40' : 'border-ink-700/50',
          )}
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        />
        {value && (
          <button
            onClick={clear}
            className="absolute top-1/2 -translate-y-1/2 end-2 text-ink-600 hover:text-ink-300 text-xs"
          >✕</button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className={cn(
          'absolute z-50 w-full mt-1 rounded-lg overflow-hidden',
          'bg-ink-800 border border-ink-700/60',
          'shadow-glass-lg max-h-52 overflow-y-auto',
        )}>
          {results.map(s => {
            const color = ERA_COLORS[s.period] ?? '#7a6550'
            return (
              <li
                key={s.id}
                onMouseDown={() => pick(s)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-ink-700/60 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm font-serif text-ink-100 flex-1 truncate">{s.label}</span>
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
}

function PathFinderComponent({ locale, onClose }: PathFinderProps) {
  const { sages, connections, sageMap, selectSage } = useAppStore()
  const isHe = locale === 'he'

  const [sageA, setSageA] = useState<Sage | null>(null)
  const [sageB, setSageB] = useState<Sage | null>(null)
  const [path,  setPath]  = useState<PathStep[] | null | 'none'>('none')
  const [loading, setLoading] = useState(false)

  const search = useCallback(() => {
    if (!sageA || !sageB) return
    setLoading(true)
    setTimeout(() => {
      const result = bfs(sageA.id, sageB.id, connections, sageMap)
      setPath(result ?? null)
      setLoading(false)
    }, 0)
  }, [sageA, sageB, connections, sageMap])

  const degrees = Array.isArray(path) ? path.length - 1 : null

  return (
    <div className={cn(
      'glass rounded-2xl border border-ink-700/50 p-4',
      'flex flex-col gap-4 w-72',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-sm font-bold text-ink-100">
            {isHe ? 'מוצא מסלול' : 'Path Finder'}
          </h3>
          <p className="text-[10px] font-sans text-ink-500">
            {isHe ? 'כמה קשרים בין שני חכמים?' : 'Degrees of separation'}
          </p>
        </div>
        <button onClick={onClose}
          className="text-ink-600 hover:text-ink-300 transition-colors p-1 rounded-lg hover:bg-ink-700/50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Pickers */}
      <div className="space-y-3">
        <SagePicker
          label={isHe ? 'חכם א׳' : 'Sage A'}
          value={sageA}
          onChange={s => { setSageA(s); setPath('none') }}
          locale={locale}
          exclude={sageB?.id}
        />
        <div className="flex justify-center">
          <span className="text-ink-700 text-lg font-mono">↕</span>
        </div>
        <SagePicker
          label={isHe ? 'חכם ב׳' : 'Sage B'}
          value={sageB}
          onChange={s => { setSageB(s); setPath('none') }}
          locale={locale}
          exclude={sageA?.id}
        />
      </div>

      {/* Search button */}
      <button
        onClick={search}
        disabled={!sageA || !sageB || loading}
        className={cn(
          'w-full py-2 rounded-xl text-sm font-sans font-medium transition-all',
          sageA && sageB && !loading
            ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 hover:bg-gold-500/30 hover:shadow-gold-glow'
            : 'bg-ink-800/50 text-ink-600 border border-ink-700/40 cursor-not-allowed',
        )}
      >
        {loading
          ? (isHe ? 'מחפש…' : 'Searching…')
          : (isHe ? 'מצא מסלול' : 'Find Path')}
      </button>

      {/* Result */}
      {path === null && (
        <div className="text-center text-sm font-sans text-ink-500 py-2">
          {isHe ? 'לא נמצא מסלול בין שני חכמים אלה' : 'No path found between these sages'}
        </div>
      )}

      {Array.isArray(path) && (
        <div className="space-y-2">
          {/* Degrees badge */}
          <div className="flex items-center justify-center gap-2 py-1">
            <span
              className="text-2xl font-mono font-bold"
              style={{ color: degrees === 1 ? '#27ae60' : degrees && degrees <= 3 ? '#f1c40f' : '#e67e22' }}
            >
              {degrees}
            </span>
            <span className="text-xs font-sans text-ink-400">
              {isHe ? (degrees === 1 ? 'קשר ישיר' : 'קשרים') : (degrees === 1 ? 'direct link' : 'degrees')}
            </span>
          </div>

          {/* Path chain */}
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {path.map((step, idx) => {
              const color = ERA_COLORS[step.sage.period] ?? '#7a6550'
              const connLabel = step.connectionType
                ? CONNECTION_LABELS[step.connectionType as keyof typeof CONNECTION_LABELS]?.[locale]
                : null

              return (
                <div key={step.sage.id}>
                  {/* Connection arrow */}
                  {idx > 0 && connLabel && (
                    <div className="flex items-center gap-2 px-2 py-0.5">
                      <div className="w-px h-4 bg-ink-700/60 ms-3 flex-shrink-0" />
                      <span className="text-[10px] font-sans text-ink-500 italic">{connLabel}</span>
                    </div>
                  )}
                  {/* Sage chip */}
                  <button
                    onClick={() => selectSage(step.sage)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                      bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/40
                      hover:border-ink-600/60 transition-all text-start group"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-serif text-ink-100 group-hover:text-gold-300 transition-colors truncate">
                        {step.sage.label}
                      </p>
                      <p className="text-[10px] font-sans text-ink-500">
                        {ERA_LABELS[step.sage.period]?.[locale]}
                        {formatYearRange(step.sage.birth_year, step.sage.death_year)
                          ? ` · ${formatYearRange(step.sage.birth_year, step.sage.death_year)}`
                          : ''}
                      </p>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize to prevent re-renders when parent state changes
export const PathFinder = memo(PathFinderComponent)
