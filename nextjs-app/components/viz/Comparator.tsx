'use client'

import { useState, memo } from 'react'
import { cn } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS, CONNECTION_LABELS, REGION_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { formatYearRange } from '@/lib/utils'
import type { Locale, Sage } from '@/lib/types'
import { tr } from '@/lib/i18n'

// ── Minimal BFS to find path between two sages ──────────────────────────────
function findPath(aId: string, bId: string, connections: { source: string; target: string; type: string }[]): { sage: Sage; connType?: string }[] | null {
  // This is kept minimal — PathFinder handles the full UI; here we just need the result
  const adj = new Map<string, Array<{ id: string; type: string }>>()
  connections.forEach(c => {
    if (!adj.has(c.source)) adj.set(c.source, [])
    if (!adj.has(c.target)) adj.set(c.target, [])
    adj.get(c.source)!.push({ id: c.target, type: c.type })
    adj.get(c.target)!.push({ id: c.source, type: c.type })
  })
  if (aId === bId) return []
  const visited = new Set([aId])
  const queue: Array<{ id: string; path: Array<{ id: string; connType?: string }> }> = [
    { id: aId, path: [{ id: aId }] },
  ]
  while (queue.length) {
    const { id, path } = queue.shift()!
    for (const nb of adj.get(id) ?? []) {
      if (visited.has(nb.id)) continue
      visited.add(nb.id)
      const newPath = [...path, { id: nb.id, connType: nb.type }]
      if (nb.id === bId) return newPath as any
      queue.push({ id: nb.id, path: newPath })
    }
  }
  return null
}

// ── Sage picker sub-component ────────────────────────────────────────────────
function SagePicker({ label, value, onChange, locale, exclude }: {
  label: string; value: Sage | null; onChange: (s: Sage | null) => void
  locale: Locale; exclude?: string
}) {
  const { sages } = useAppStore()
  const [query, setQuery] = useState(value?.label ?? '')
  const [open, setOpen] = useState(false)

  const results = query.length >= 1
    ? sages
        .filter(s => s.id !== exclude)
        .filter(s => s.label.includes(query) || s.name_en?.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
    : []

  function pick(s: Sage) {
    onChange(s)
    setQuery(s.label)
    setOpen(false)
  }

  return (
    <div className="relative">
      <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-500 mb-1">{label}</p>
      <div className="relative">
        <input
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
          <button onClick={() => { onChange(null); setQuery('') }}
            className="absolute top-1/2 -translate-y-1/2 end-2 text-ink-600 hover:text-ink-300 text-xs">✕</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden bg-ink-800 border border-ink-700/60 shadow-glass-lg max-h-48 overflow-y-auto">
          {results.map(s => (
            <li key={s.id} onMouseDown={() => pick(s)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-ink-700/60 cursor-pointer">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ERA_COLORS[s.period] ?? '#7a6550' }} />
              <span className="text-sm font-serif text-ink-100 flex-1 truncate">{s.label}</span>
              <span className="text-[10px] text-ink-500">{ERA_LABELS[s.period]?.[locale]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Sage column ──────────────────────────────────────────────────────────────
function SageColumn({ sage, locale, onSelect }: { sage: Sage; locale: Locale; onSelect: () => void }) {
  const color = ERA_COLORS[sage.period] ?? '#c9973a'
  const years = formatYearRange(sage.birth_year, sage.death_year)

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 p-4 rounded-xl bg-ink-800/40 border border-ink-700/40">
      {/* Era chip + name */}
      <div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2"
          style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          {ERA_LABELS[sage.period]?.[locale]}
        </span>
        <h3 className="font-serif text-base font-bold text-ink-50 leading-tight">{sage.label}</h3>
        {sage.name_en && <p className="text-xs text-ink-400 mt-0.5">{sage.name_en}</p>}
      </div>

      {/* Meta */}
      <dl className="text-xs font-sans space-y-1.5">
        {years && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-600">{tr(locale, 'שנים', 'Years', 'Годы')}</dt>
            <dd className="text-ink-300 tabular-nums">{years}</dd>
          </div>
        )}
        {sage.location && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-600">{tr(locale, 'מקום', 'Location', 'Место')}</dt>
            <dd className="text-ink-300 truncate max-w-[120px]">{sage.location}</dd>
          </div>
        )}
        {sage.field && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-600">{tr(locale, 'תחום', 'Field', 'Область')}</dt>
            <dd className="text-ink-300 truncate max-w-[120px]">{sage.field}</dd>
          </div>
        )}
      </dl>

      {/* Bio excerpt */}
      {sage.bio && (
        <p className="text-xs font-sans text-ink-400 leading-relaxed line-clamp-4">{sage.bio}</p>
      )}

      {/* Core concept */}
      {sage.core_concept && (
        <blockquote className="border-s-2 ps-3 italic text-xs text-ink-300 font-serif leading-relaxed"
          style={{ borderColor: color }}>
          {sage.core_concept.slice(0, 180)}{sage.core_concept.length > 180 ? '…' : ''}
        </blockquote>
      )}

      <button
        onClick={onSelect}
        className="mt-auto text-xs font-sans px-3 py-1.5 rounded-lg border transition-all text-center"
        style={{ borderColor: `${color}44`, color, background: `${color}10` }}
      >
        {tr(locale, 'פתח פרופיל', 'Open Profile', 'Открыть профиль')}
      </button>
    </div>
  )
}

// ── Main Comparator ──────────────────────────────────────────────────────────
interface ComparatorProps {
  locale: Locale
  onClose: () => void
}

function ComparatorComponent({ locale, onClose }: ComparatorProps) {
  const { comparatorSages, setComparatorSage, connections, sageMap, selectSage } = useAppStore()
  const [sageA, sageB] = comparatorSages
  const isHe = locale === 'he'

  // Shared connections (sages both A and B are connected to)
  const neighborsA = new Set(
    connections
      .filter(c => sageA && (c.source === sageA.id || c.target === sageA.id))
      .map(c => sageA && c.source === sageA.id ? c.target : c.source)
  )
  const sharedConnections = sageB
    ? connections.filter(c =>
        (c.source === sageB.id || c.target === sageB.id) &&
        (neighborsA.has(c.source) || neighborsA.has(c.target))
      ).map(c => {
        const otherId = (c.source === sageB.id ? c.target : c.source)
        return { sage: sageMap.get(otherId), type: c.type }
      }).filter(x => x.sage && x.sage.id !== sageA?.id && x.sage.id !== sageB?.id)
      .slice(0, 6)
    : []

  // Direct path
  const rawPath = (sageA && sageB) ? findPath(sageA.id, sageB.id, connections) : null
  const directConn = sageA && sageB
    ? connections.find(c =>
        (c.source === sageA.id && c.target === sageB.id) ||
        (c.source === sageB.id && c.target === sageA.id)
      )
    : null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(10,8,6,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className={cn(
        'glass rounded-2xl border border-ink-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto',
        'flex flex-col gap-0',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700/40">
          <div>
            <h2 className="font-serif text-base font-bold text-ink-100">
              {isHe ? 'השוואת חכמים' : 'Sage Comparator'}
            </h2>
            <p className="text-[10px] font-sans text-ink-500 mt-0.5">
              {isHe ? 'השווה בין שני חכמים — ביוגרפיה, קשרים וחיתוך' : 'Compare two sages — biography, connections, overlap'}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-600 hover:text-ink-300 transition-colors p-1 rounded-lg hover:bg-ink-700/50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pickers */}
        <div className="grid grid-cols-2 gap-4 px-5 py-4 border-b border-ink-700/40">
          <SagePicker
            label={isHe ? 'חכם א׳' : 'Sage A'}
            value={sageA}
            onChange={s => setComparatorSage(0, s)}
            locale={locale}
            exclude={sageB?.id}
          />
          <SagePicker
            label={isHe ? 'חכם ב׳' : 'Sage B'}
            value={sageB}
            onChange={s => setComparatorSage(1, s)}
            locale={locale}
            exclude={sageA?.id}
          />
        </div>

        {/* Columns */}
        {(sageA || sageB) && (
          <div className="flex gap-3 px-5 py-4">
            {sageA && <SageColumn sage={sageA} locale={locale} onSelect={() => { selectSage(sageA); onClose() }} />}

            {/* Middle divider with relationship info */}
            <div className="flex flex-col items-center justify-start gap-2 pt-4 flex-shrink-0 w-10">
              <div className="w-px flex-1 bg-ink-700/40" />
              {directConn && (
                <div className="px-1 py-3 rounded-lg bg-gold-500/10 border border-gold-500/25 text-center">
                  <span className="text-[8px] font-sans text-gold-400 writing-mode-vertical">
                    {CONNECTION_LABELS[directConn.type]?.[locale] ?? directConn.type}
                  </span>
                </div>
              )}
              {rawPath && !directConn && rawPath.length > 0 && (
                <div className="px-1 py-2 rounded bg-ink-700/50 text-center">
                  <span className="text-[9px] font-mono text-ink-400">{rawPath.length - 1}°</span>
                </div>
              )}
              <div className="w-px flex-1 bg-ink-700/40" />
            </div>

            {sageB && <SageColumn sage={sageB} locale={locale} onSelect={() => { selectSage(sageB); onClose() }} />}
          </div>
        )}

        {/* Shared connections */}
        {sharedConnections.length > 0 && (
          <div className="px-5 py-4 border-t border-ink-700/40">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-500 mb-3">
              {isHe ? `קשרים משותפים (${sharedConnections.length})` : `Shared connections (${sharedConnections.length})`}
            </p>
            <div className="flex flex-wrap gap-2">
              {sharedConnections.map(({ sage, type }, i) => {
                if (!sage) return null
                const color = ERA_COLORS[sage.period] ?? '#7a6550'
                return (
                  <button
                    key={i}
                    onClick={() => { selectSage(sage); onClose() }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-sans border transition-all hover:border-ink-500/60"
                    style={{ background: `${color}10`, borderColor: `${color}30`, color: 'var(--ink-300)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    {sage.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Degrees of separation */}
        {rawPath !== null && sageA && sageB && (
          <div className="px-5 py-3 border-t border-ink-700/40 flex items-center gap-3">
            <span className="text-xl font-mono font-bold"
              style={{ color: rawPath.length === 2 ? '#27ae60' : rawPath.length <= 4 ? '#f1c40f' : '#e67e22' }}>
              {rawPath.length - 1}
            </span>
            <span className="text-xs font-sans text-ink-400">
              {isHe ? 'מעלות הפרדה' : 'degrees of separation'}
            </span>
          </div>
        )}
        {rawPath === null && sageA && sageB && (
          <div className="px-5 py-3 border-t border-ink-700/40 text-xs font-sans text-ink-500">
            {isHe ? 'לא נמצא מסלול בין שני חכמים אלה' : 'No path found between these sages'}
          </div>
        )}
      </div>
    </div>
  )
}

// Memoize to prevent re-renders when parent state changes
export const Comparator = memo(ComparatorComponent)
