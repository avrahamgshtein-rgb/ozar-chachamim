'use client'

// "Image to share" for a path between two sages: the 1080 x 1920 status image of the path page
// (app/[locale]/tower/path/[from]/[to]/story/route.tsx) straight into the phone's share sheet where the browser can
// share files, otherwise saved to the device (lib/shareFile.ts). On the flight panel at the end of the flight and
// on the picker's result, so a path can be shared without flying it. The event carries the language and how it was
// shared, never the sages.
import { useState } from 'react'
import type { Locale } from '@/lib/types'
import { track } from '@/lib/analytics'
import { flightHref } from '@/lib/connectFlight'
import { shareImageFile } from '@/lib/shareFile'

const S = {
  label: { he: 'תמונה לשיתוף', en: 'Image to share', ru: 'Картинка для статуса' },
  working: { he: 'מכין תמונה…', en: 'Preparing the image…', ru: 'Готовим картинку…' },
  saved: { he: 'התמונה נשמרה', en: 'Image saved', ru: 'Картинка сохранена' },
} satisfies Record<string, Record<Locale, string>>

const DEFAULT_CLASS = 'inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-sm text-gold-200 hover:bg-gold-500/20 disabled:opacity-60'

export function SharePathImage({ locale, from, to, shareText, className }: {
  locale: Locale
  from: string
  to: string
  /** The line that goes with the image: "5 steps between Rashi and the Rambam". The path's address follows it. */
  shareText: string
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const href = flightHref(locale, from, to)

  const share = async () => {
    setBusy(true)
    setNote('')
    try {
      const result = await shareImageFile({
        url: `${href}/story`,
        fileName: 'ozar-chachamim-path.png',
        text: `${shareText}\n${window.location.origin}${href}`,
      })
      if (result === 'shared') track('tower_share', { locale, method: 'image' })
      else if (result === 'downloaded') {
        setNote(S.saved[locale])
        track('tower_share', { locale, method: 'download' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" data-testid="share-path-image" onClick={share} disabled={busy} aria-busy={busy} className={className ?? DEFAULT_CLASS}>
        <span aria-hidden>📸</span>{busy ? S.working[locale] : S.label[locale]}
      </button>
      {note && <span role="status" className="text-xs text-ink-400">{note}</span>}
    </>
  )
}
