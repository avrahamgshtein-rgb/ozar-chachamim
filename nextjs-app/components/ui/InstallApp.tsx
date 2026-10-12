'use client'

// "Install as an app". Shown only when it can do something: the browser has offered installation
// (Chrome, Edge, Samsung Internet), or the visitor is on iOS, where the site is added to the Home
// Screen by hand and so the button explains the steps. Once installed it disappears.
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import { promptInstall, useInstallState } from '@/lib/pwaInstall'
import type { Locale } from '@/lib/types'

export const INSTALL_COPY: Record<Locale, { label: string; ios: string }> = {
  he: { label: 'התקנה כאפליקציה', ios: 'לחצו על ״שיתוף״ ואז על ״הוספה למסך הבית״' },
  en: { label: 'Install as an app', ios: 'Tap Share, then “Add to Home Screen”' },
  ru: { label: 'Установить как приложение', ios: 'Нажмите «Поделиться», затем «На экран “Домой”»' },
}

interface InstallAppProps {
  locale: Locale
  /** Looks of the button; the header and the menu each bring their own. */
  className?: string
  /** Called after the button was used (the mobile menu closes itself). */
  onDone?: () => void
  /** Show the iOS steps inline under the button rather than only on press. */
  showHint?: boolean
  /** Icon only (the header is crowded); the label stays for screen readers and as the tooltip. */
  compact?: boolean
}

export function InstallApp({ locale, className, onDone, showHint, compact }: InstallAppProps) {
  const state = useInstallState()
  const [hint, setHint] = useState(false)
  // the header has no room for the iOS steps; the menu and the About page show them
  if (state === 'none' || (compact && state === 'ios')) return null
  const c = INSTALL_COPY[locale]

  const onClick = async () => {
    if (state === 'prompt') {
      await promptInstall()
      onDone?.()
      return
    }
    track('pwa_install_click', { platform: 'ios' })
    setHint(h => !h)
  }

  return (
    <>
      <button type="button" onClick={onClick} className={cn('flex items-center gap-2', className)} title={compact ? c.label : state === 'ios' ? c.ios : undefined}>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
        </svg>
        <span className={compact ? 'sr-only' : undefined}>{c.label}</span>
      </button>
      {state === 'ios' && (hint || showHint) && (
        <p role="status" className="px-4 py-2 text-xs font-sans text-ink-300">{c.ios}</p>
      )}
    </>
  )
}
