'use client'

// The reader's two controls: the text size (A−/A+, kept in this browser) and the read-aloud player.
// The size is one CSS variable, --read-px on <html>: the part's text is set in `em` from it, so the whole
// page follows. The same variable is set before first paint by ReaderShell's FontInit from the same stored
// value, so a reader who chose a size never sees the default one first.
import { useEffect, useState } from 'react'
import type { BookSpeechItem } from '@/lib/kidsBookSpeech'
import { DEFAULT_FONT_STEP, FONT_KEY, fontPx, parseFontStep, stepFont } from '@/lib/kidsReading'
import { ListenBook } from './ListenBook'

const S = {
  smaller: 'הקטנת הגופן',
  larger: 'הגדלת הגופן',
  size: 'גודל הגופן',
  tools: 'כלי קריאה',
}

/** Set the text size of the reader: the same variable ReaderShell's FontInit sets. */
export function applyFontStep(step: number): void {
  document.documentElement.style.setProperty('--read-px', `${fontPx(step)}px`)
}

export function ReaderToolbar({ book, items, targetId }: { book: string; items: BookSpeechItem[]; targetId: string }) {
  const [step, setStep] = useState(DEFAULT_FONT_STEP)

  useEffect(() => {
    try {
      const stored = parseFontStep(localStorage.getItem(FONT_KEY))
      setStep(stored)
      applyFontStep(stored)
    } catch { /* storage blocked: the default size stays */ }
  }, [])

  const change = (dir: -1 | 1) => {
    const next = stepFont(step, dir)
    if (next === step) return
    setStep(next)
    applyFontStep(next)
    try { localStorage.setItem(FONT_KEY, String(next)) } catch { /* noop */ }
  }

  const btn = 'flex h-11 min-w-[2.75rem] items-center justify-center px-3 font-sans font-bold transition-colors enabled:hover:bg-gold-500/20 disabled:opacity-35'
  return (
    <div role="toolbar" aria-label={S.tools} className="flex flex-wrap items-center gap-3">
      <div className="flex items-center overflow-hidden rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-200">
        <button type="button" onClick={() => change(-1)} disabled={stepFont(step, -1) === step} aria-label={S.smaller} title={S.smaller} className={`${btn} text-sm`}>
          <span dir="ltr" aria-hidden>A−</span>
        </button>
        <span className="h-6 w-px bg-gold-500/30" aria-hidden />
        <button type="button" onClick={() => change(1)} disabled={stepFont(step, 1) === step} aria-label={S.larger} title={S.larger} className={`${btn} text-lg`}>
          <span dir="ltr" aria-hidden>A+</span>
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{S.size}: {fontPx(step)}</span>
      <ListenBook items={items} targetId={targetId} book={book} />
    </div>
  )
}
