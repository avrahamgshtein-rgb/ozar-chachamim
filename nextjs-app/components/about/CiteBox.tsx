'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import { ABOUT_COPY, formatAboutDate } from './aboutCopy'

/**
 * Ready-to-paste citations for the site and for a sage page. The access date
 * is the reader's today, so it is filled in on the client: the About page is
 * prerendered, and a date baked in at build time would be stale.
 */
export function CiteBox({ locale, siteUrl }: { locale: Locale; siteUrl: string }) {
  const c = ABOUT_COPY[locale]
  const [today, setToday] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setToday(formatAboutDate(new Date(), locale)) }, [locale])
  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(id)
  }, [copied])

  const date = today ?? '…'
  const siteHref = `${siteUrl}/${locale}`
  const sageHref = `${siteUrl}/${locale}/sage/‹${c.citeSageId}›`
  const siteCitation = c.citeSite(siteHref, date)
  const sageCitation = c.citeSage(sageHref, date)

  async function copySite() {
    try {
      await navigator.clipboard.writeText(siteCitation)
      setCopied(true)
    } catch {
      // Clipboard API unavailable (insecure context, denied permission): the
      // citation is selectable text, so the reader can still copy it by hand.
    }
  }

  return (
    <div className="mt-5 space-y-3">
      <figure className="rounded-xl border border-ink-700/60 bg-ink-850 p-4 sm:p-5">
        <figcaption className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-sans font-semibold text-ink-400">{c.citeSiteLabel}</span>
          <button
            type="button"
            onClick={copySite}
            disabled={!today}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 min-h-[36px] text-xs font-sans font-medium',
              'border transition-colors duration-150',
              copied
                ? 'border-gold-500/50 bg-gold-500/15 text-gold-300'
                : 'border-ink-700 text-ink-200 hover:border-gold-500/40 hover:text-gold-300',
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              {copied
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />}
            </svg>
            {copied ? c.copied : c.copy}
          </button>
        </figcaption>
        <blockquote className="font-serif text-base leading-relaxed text-ink-100 break-words select-all">
          <IsolatedUrl text={siteCitation} url={siteHref} />
        </blockquote>
      </figure>

      <figure className="rounded-xl border border-dashed border-ink-700/60 p-4 sm:p-5">
        <figcaption className="text-xs font-sans font-semibold text-ink-400 mb-2">{c.citeSageLabel}</figcaption>
        <p className="font-serif text-base leading-relaxed text-ink-300 break-words">
          <IsolatedUrl text={sageCitation} url={sageHref} />
        </p>
      </figure>

      <p className="sr-only" role="status" aria-live="polite">{copied ? c.copied : ''}</p>
    </div>
  )
}

/**
 * Shows the URL inside a citation as an LTR island, so a Hebrew citation does
 * not reorder its slashes and dots. Only the display is isolated: the copied
 * text stays plain, with no invisible bidi control characters in it.
 */
function IsolatedUrl({ text, url }: { text: string; url: string }) {
  const at = text.indexOf(url)
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <bdi dir="ltr" className="font-sans text-[0.9em]">{url}</bdi>
      {text.slice(at + url.length)}
    </>
  )
}
