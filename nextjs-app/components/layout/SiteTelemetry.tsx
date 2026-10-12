'use client'

// Page-view analytics (cookie-free), the "came back" event, and the installed app's service worker.
// Rendered once, by the locale layout. Nothing here shows anything.
import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { track } from '@/lib/analytics'
import { isStandalone } from '@/lib/pwaInstall'

/** One line in localStorage: how many different days this browser has visited. No identifier. */
function countVisit(): number {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const saved = JSON.parse(localStorage.getItem('ozar-visits') ?? 'null') as { n: number; last: string } | null
    if (saved?.last === today) return saved.n
    const next = { n: (saved?.n ?? 0) + 1, last: today }
    localStorage.setItem('ozar-visits', JSON.stringify(next))
    return next.n
  } catch {
    return 1
  }
}

export function SiteTelemetry() {
  useEffect(() => {
    const visits = countVisit()
    if (visits >= 2) track('return_visit', { visits: visits >= 10 ? '10+' : String(visits) })
    // the installed app, once per session
    try {
      if (isStandalone() && !sessionStorage.getItem('ozar-pwa-open')) {
        sessionStorage.setItem('ozar-pwa-open', '1')
        track('pwa_open')
      }
    } catch { /* storage blocked: skip */ }

    // The service worker makes the site open offline and the second visit fast. Production only: in
    // development it would serve stale files. A failure to register changes nothing for the visitor.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register, { once: true })
    }
  }, [])

  return <Analytics />
}
