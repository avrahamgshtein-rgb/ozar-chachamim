'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'

const KEY = 'ozar-reading-prefs'

export interface ReadingPrefs {
  /** rem multiplier: 0.875 | 1 | 1.125 | 1.25 */
  scale: number
  /** true = serif (academic), false = sans (UI) */
  serif: boolean
}

const DEFAULT: ReadingPrefs = { scale: 1, serif: false }
const SCALES = [0.875, 1, 1.125, 1.25]

export function useReadingPrefs(): [ReadingPrefs, (p: ReadingPrefs) => void] {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setPrefs({ ...DEFAULT, ...JSON.parse(raw) })
    } catch { /* noop */ }
  }, [])

  const update = (p: ReadingPrefs) => {
    setPrefs(p)
    try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* noop */ }
  }
  return [prefs, update]
}

export function readingStyle(prefs: ReadingPrefs): React.CSSProperties {
  return {
    fontSize:   `${prefs.scale}em`,
    fontFamily: prefs.serif ? "'Frank Ruhl Libre', 'David Libre', serif" : undefined,
    lineHeight: 1.75,
  }
}

/** Compact A− / A+ / serif-toggle control row for reading views. */
export function ReadingControls({
  prefs, onChange, locale, className,
}: {
  prefs: ReadingPrefs
  onChange: (p: ReadingPrefs) => void
  locale: Locale
  className?: string
}) {
  const isHe = locale === 'he'
  const idx = SCALES.indexOf(prefs.scale)

  const bump = (dir: 1 | -1) => {
    const next = SCALES[Math.max(0, Math.min(SCALES.length - 1, (idx === -1 ? 1 : idx) + dir))]
    onChange({ ...prefs, scale: next })
  }

  const btn = 'px-2 py-1 rounded-md text-xs font-sans border border-ink-600/40 text-ink-300 hover:text-gold-300 hover:border-gold-500/30 transition-all disabled:opacity-30 disabled:pointer-events-none'

  return (
    <div className={cn('flex items-center gap-1.5', className)} role="group"
      aria-label={isHe ? 'הגדרות קריאה' : 'Reading settings'}>
      <button onClick={() => bump(-1)} disabled={idx <= 0} className={btn}
        aria-label={isHe ? 'הקטן גופן' : 'Smaller font'} title={isHe ? 'הקטן גופן' : 'Smaller font'}>
        A−
      </button>
      <button onClick={() => bump(1)} disabled={idx >= SCALES.length - 1} className={btn}
        aria-label={isHe ? 'הגדל גופן' : 'Larger font'} title={isHe ? 'הגדל גופן' : 'Larger font'}>
        A+
      </button>
      <button
        onClick={() => onChange({ ...prefs, serif: !prefs.serif })}
        className={cn(btn, prefs.serif && 'bg-gold-500/15 text-gold-300 border-gold-500/40')}
        aria-pressed={prefs.serif}
        title={isHe ? 'גופן ספרותי (סריף)' : 'Serif (academic) font'}
      >
        <span style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>א</span>
      </button>
    </div>
  )
}
