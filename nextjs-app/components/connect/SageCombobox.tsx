'use client'

// A search over a list of sages, to pick one: the riddle's guess box (components/riddle/RiddleGame.tsx
// `GuessInput`) as a controlled field, for the path picker and the sage chain. Ranked by
// `searchSagesRanked` (nikud, gershayim and final letters forgiven; an English name finds the Hebrew
// sage on the Hebrew page), arrows / Enter / Escape, the list above the field when the visible screen
// leaves more room there (a phone's keyboard), options 44 px tall with the sage's era.
//
// Controlled: `value` is the id of the sage chosen (null while none is). A pick calls `onChange(id)`;
// editing the text after a pick calls `onChange(null)`; a `value` the parent sets (null clears the text,
// an id shows his name) is followed. A tap on a name only picks him (the parent confirms with a button, so a
// stray tap spends nothing); with `onSubmit`, Enter on a chosen sage (or on the highlighted one in the list)
// hands him over at once, and the field then clears itself and calls `onChange(null)`.
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { loadEnglishNames, searchSagesRanked } from '@/lib/search'
import { ALL_PERIODS, ERA_LABELS } from '@/lib/types'
import type { Locale, Sage } from '@/lib/types'

export interface ComboSage {
  id: string
  name: string
  /** Index in ALL_PERIODS. */
  period: number
}

const S = {
  noMatch: { he: 'לא נמצא חכם בשם הזה', en: 'No sage by that name', ru: 'Мудрец с таким именем не найден' },
} satisfies Record<string, Record<Locale, string>>

/** The most the list may be tall, and the sticky top bar above the page's content. */
const LIST_MAX = 288
const TOP_BAR = 56

function Highlighted({ text, range }: { text: string; range: [number, number] | null }) {
  if (!range) return <>{text}</>
  return (
    <>
      {text.slice(0, range[0])}
      <mark className="rounded-sm bg-gold-500/20 px-px text-gold-200">{text.slice(range[0], range[1])}</mark>
      {text.slice(range[1])}
    </>
  )
}

export function SageCombobox({ locale, sages, value, onChange, onSubmit, label, placeholder, disabled, degree, testId }: {
  locale: Locale
  sages: readonly ComboSage[]
  value: string | null
  onChange: (id: string | null) => void
  onSubmit?: (id: string) => void
  /** The field's accessible name (not drawn: the placeholder is). */
  label: string
  placeholder: string
  disabled?: boolean
  /** Links per sage: the better connected one first among equal matches. */
  degree?: ReadonlyMap<string, number>
  /** `data-testid` of the text field. */
  testId?: string
}) {
  const byId = useMemo(() => new Map(sages.map(s => [s.id, s])), [sages])
  const [query, setQuery] = useState(() => (value !== null ? byId.get(value)?.name ?? '' : ''))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  /** The value this field last showed or reported: a `value` that differs from it came from the parent. */
  const [synced, setSynced] = useState<string | null>(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  // The roster as the search wants it: a name and an era is all it reads here.
  const pool = useMemo<Sage[]>(
    () => sages.map(s => ({ id: s.id, label: s.name, period: ALL_PERIODS[s.period] ?? 'modern' })),
    [sages],
  )
  const hits = useMemo(
    () => (query.trim() ? searchSagesRanked(pool, query, { limit: 7, degree: degree as Map<string, number> | undefined }) : []),
    [pool, query, degree],
  )
  const showList = open && query.trim().length > 0 && value === null
  const act = hits.length ? Math.min(active, hits.length - 1) : 0

  // The parent set a value of its own (cleared the field, filled it from the address): show it. Done while
  // rendering, so the old text is never painted beside the new value.
  if (value !== synced) {
    setSynced(value)
    setQuery(value !== null ? byId.get(value)?.name ?? '' : '')
    setOpen(false)
    setActive(0)
  }

  // English names (so "Maimonides" finds the Rambam on the Hebrew page) load on first use; they add aliases only
  const loadAliases = useCallback(() => { if (locale === 'he') void loadEnglishNames() }, [locale])

  // Where the list goes: below the field, or above it when the visible screen (the keyboard takes part of it
  // on a phone) leaves less room below than above. Measured whenever the list opens or changes.
  const [place, setPlace] = useState({ up: false, max: LIST_MAX })
  useLayoutEffect(() => {
    const field = inputRef.current
    if (!showList || !field) return
    const vv = window.visualViewport
    const rect = field.getBoundingClientRect()
    const below = (vv ? vv.offsetTop + vv.height : window.innerHeight) - rect.bottom - 12
    const above = rect.top - (vv?.offsetTop ?? 0) - TOP_BAR - 12
    const up = below < Math.min(LIST_MAX, hits.length * 52 + 8) && above > below
    setPlace({ up, max: Math.max(120, Math.min(LIST_MAX, up ? above : below)) })
  }, [showList, hits.length])

  function report(id: string | null) {
    setSynced(id)
    onChange(id)
  }

  function pick(id: string, name: string) {
    setQuery(name)
    setOpen(false)
    report(id)
  }

  /** Hand a sage to the parent and make the field ready for the next one. */
  function submit(id: string, name: string) {
    if (value !== id) pick(id, name)
    onSubmit?.(id)
    setQuery('')
    setActive(0)
    setOpen(false)
    report(null)
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (hits.length === 0) return
      e.preventDefault()
      setOpen(true)
      setActive(a => (e.key === 'ArrowDown' ? (a + 1) % hits.length : (a - 1 + hits.length) % hits.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (value !== null) {
        if (onSubmit) submit(value, byId.get(value)?.name ?? query)
      } else if (showList && hits[act]) {
        const h = hits[act].sage
        if (onSubmit) submit(h.id, h.label)
        else pick(h.id, h.label)
      }
    } else if (e.key === 'Escape') {
      if (showList) setOpen(false)
      else { setQuery(''); if (value !== null) report(null) }
    }
  }

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">{label}</label>
      <input
        id={`${listId}-input`}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? `${listId}-list` : undefined}
        aria-autocomplete="list"
        aria-activedescendant={showList && hits[act] ? `${listId}-opt-${hits[act].sage.id}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        disabled={disabled}
        data-testid={testId}
        dir={query ? 'auto' : locale === 'he' ? 'rtl' : 'ltr'}
        value={query}
        placeholder={placeholder}
        onChange={e => {
          setQuery(e.target.value)
          if (value !== null) report(null)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => { loadAliases(); setOpen(true) }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="w-full min-w-0 rounded-xl border border-ink-600/60 bg-ink-800/60 px-4 py-3 text-base text-ink-50 placeholder:text-ink-500 focus:border-gold-500/60 focus:outline-none focus:ring-1 focus:ring-gold-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      />

      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label={label}
          // pressing a name must not blur the field first, or the list would close before the press lands
          onMouseDown={e => e.preventDefault()}
          style={{ maxHeight: place.max }}
          className={cn(
            'absolute inset-x-0 z-20 overflow-y-auto rounded-xl border border-ink-600/50 bg-ink-800 py-1 shadow-glass-lg',
            place.up ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {hits.length === 0 && <li className="px-4 py-3 text-sm text-ink-400">{S.noMatch[locale]}</li>}
          {hits.map((h, i) => {
            const c = byId.get(h.sage.id)
            return (
              <li
                key={h.sage.id}
                id={`${listId}-opt-${h.sage.id}`}
                role="option"
                data-sage-id={h.sage.id}
                aria-selected={i === act}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h.sage.id, h.sage.label)}
                className={cn(
                  'flex min-h-[44px] cursor-pointer items-center justify-between gap-3 px-4 py-2',
                  i === act ? 'bg-gold-500/15' : 'hover:bg-ink-700/40',
                )}
              >
                <span className="min-w-0">
                  <span dir="auto" className="block truncate font-serif text-base text-ink-50"><Highlighted text={h.sage.label} range={h.nameRange} /></span>
                  {h.via && <span dir="auto" className="block truncate text-xs text-ink-400">{h.via}</span>}
                </span>
                {c && <span className="flex-shrink-0 text-xs text-ink-400">{ERA_LABELS[ALL_PERIODS[c.period]]?.[locale]}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
