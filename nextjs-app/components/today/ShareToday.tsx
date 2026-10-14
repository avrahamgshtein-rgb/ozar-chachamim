'use client'

// Sharing the Today page: the day's image straight into the phone's share sheet (WhatsApp status,
// Instagram story…) where the browser can share files, otherwise saved to the device; and a WhatsApp
// message with the link, whose preview is the sage's share card.
import { useState } from 'react'
import type { Locale } from '@/lib/types'
import { track } from '@/lib/analytics'
import type { TodayCard } from '@/lib/todayVideo'
import { TodayVideo } from './TodayVideo'

const S = {
  heading: { he: 'שתפו את היום', en: 'Share today', ru: 'Поделиться' },
  status: { he: 'תמונה לסטטוס', en: 'Image for a status', ru: 'Картинка для статуса' },
  whatsapp: { he: 'שליחה בוואטסאפ', en: 'Send on WhatsApp', ru: 'Отправить в WhatsApp' },
  saved: { he: 'התמונה נשמרה', en: 'Image saved', ru: 'Картинка сохранена' },
  working: { he: 'מכין תמונה…', en: 'Preparing the image…', ru: 'Готовим картинку…' },
} satisfies Record<string, Record<Locale, string>>

export function ShareToday({ locale, pageUrl, shareText, card }: { locale: Locale; pageUrl: string; shareText: string; card?: TodayCard }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const imageUrl = `/${locale}/today/story`

  const shareImage = async () => {
    setBusy(true)
    setNote('')
    try {
      const blob = await (await fetch(imageUrl)).blob()
      const file = new File([blob], 'ozar-chachamim-today.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${shareText}\n${pageUrl}` })
        track('today_share', { locale, method: 'image' })
        return
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = file.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      setNote(S.saved[locale])
      track('today_share', { locale, method: 'download' })
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') window.open(imageUrl, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${pageUrl}`)}`

  return (
    <section aria-label={S.heading[locale]} className="mt-6 flex flex-wrap items-center gap-2">
      <button type="button" onClick={shareImage} disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-sm text-gold-200 hover:bg-gold-500/20 disabled:opacity-60">
        <span aria-hidden>🖼️</span>{busy ? S.working[locale] : S.status[locale]}
      </button>
      <a href={whatsapp} target="_blank" rel="noopener noreferrer"
        onClick={() => track('today_share', { locale, method: 'whatsapp' })}
        className="inline-flex items-center gap-2 rounded-lg border border-ink-600/50 px-4 py-2 text-sm text-ink-200 hover:border-gold-500/40 hover:text-ink-50">
        <span aria-hidden>💬</span>{S.whatsapp[locale]}
      </a>
      {note && <span role="status" className="text-xs text-ink-400">{note}</span>}
      {card && <TodayVideo locale={locale} card={card} shareText={shareText} pageUrl={pageUrl} />}
    </section>
  )
}
