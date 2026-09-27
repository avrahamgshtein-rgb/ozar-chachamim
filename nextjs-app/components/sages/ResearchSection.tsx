'use client'

// מדור "מחקר מלא" במגירת החכם (SageCard) — נטען בצד הלקוח מ-/research/<id>.json
// (עובד זהה בלוקאל וב-Vercel; הקבצים סטטיים ב-public/research).
// The drawer keeps each document folded; open, it renders through the same
// parser and block renderer as the sage page's reader, in a compact form.
// The full reader (contents, progress, anchors) lives on the sage page.
import { useEffect, useMemo, useState } from 'react'
import type { Locale } from '@/lib/types'
import { ReadingControls, useReadingPrefs, readingStyle } from '@/components/ui/ReadingControls'
import { parseResearchDocs } from '@/lib/researchParse'
import { tr } from '@/lib/i18n'
import { ResearchBlocks } from './ResearchBlocks'

interface ResearchDoc {
  title: string
  source_file: string
  word_count: number
  content: string
}

interface ResearchSectionProps {
  sageId: string
  locale: Locale
  /**
   * Documents already loaded by the caller. When supplied, no fetch happens;
   * the reading controls stay interactive either way.
   */
  initialDocs?: ResearchDoc[]
  /** True when the caller fell back to Hebrew because no translation exists. */
  initialIsFallback?: boolean
  /** Start with every document closed (the drawer); by default the first is open. */
  collapsed?: boolean
}

export function ResearchSection({
  sageId, locale, initialDocs, initialIsFallback = false, collapsed = false,
}: ResearchSectionProps) {
  const hasServerDocs = Array.isArray(initialDocs)
  const [docs, setDocs] = useState<ResearchDoc[] | null>(hasServerDocs ? initialDocs! : null)
  const [isFallback, setIsFallback] = useState(initialIsFallback)
  const [prefs, setPrefs] = useReadingPrefs()
  const parsed = useMemo(() => (docs ? parseResearchDocs(docs) : []), [docs])

  // Client fetch is only a fallback for callers that did not load the docs.
  useEffect(() => {
    if (hasServerDocs) return
    let alive = true
    const fetchDocs = async () => {
      if (locale !== 'he') {
        try {
          const r = await fetch(`/research/${sageId}.${locale}.json`)
          if (r.ok) {
            const d = await r.json()
            if (alive) { setDocs(Array.isArray(d) ? d : []); setIsFallback(false) }
            return
          }
        } catch { /* fall through to Hebrew */ }
      }
      try {
        const r = await fetch(`/research/${sageId}.json`)
        const d = r.ok ? await r.json() : []
        if (alive) { setDocs(Array.isArray(d) ? d : []); setIsFallback(locale !== 'he') }
      } catch {
        if (alive) setDocs([])
      }
    }
    fetchDocs()
    return () => { alive = false }
  }, [sageId, locale, hasServerDocs])

  if (docs === null) {
    return (
      <p className="text-xs font-sans text-ink-500 animate-pulse">
        {tr(locale, 'טוען מחקר…', 'Loading research…', 'Загрузка исследования…')}
      </p>
    )
  }
  if (parsed.length === 0) return null

  const minutes = (n: number) => tr(locale, `${n} דק׳ קריאה`, `${n} min read`, `${n} мин чтения`)

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-500">
          {tr(locale,
            `מחקר מלא (${parsed.length} ${parsed.length === 1 ? 'מסמך' : 'מסמכים'})`,
            `Full Research (${parsed.length} ${parsed.length === 1 ? 'document' : 'documents'})`,
            `Полное исследование (${parsed.length} док.)`)}
        </h2>
        <ReadingControls prefs={prefs} onChange={setPrefs} locale={locale} />
      </div>
      {isFallback && (
        <p className="text-[11px] font-sans text-ink-500 mb-2">
          {tr(locale, '', 'Research is currently available in Hebrew only.', 'Исследование пока доступно только на иврите.')}
        </p>
      )}
      <div className="space-y-3">
        {parsed.map((doc, i) => (
          <details key={i} open={!collapsed && i === 0} dir={doc.dir}
            className="group/doc rounded-xl border border-ink-700/40 bg-ink-800/30 overflow-hidden">
            <summary className="cursor-pointer select-none list-none px-4 py-3 hover:bg-ink-700/30 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="flex items-start gap-2">
                <svg className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-gold-400 transition-transform group-open/doc:rotate-90 rtl:-scale-x-100 rtl:group-open/doc:-rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="min-w-0">
                  <span dir="auto" className="block font-serif text-sm leading-snug text-gold-300 line-clamp-2">{doc.title}</span>
                  <span className="mt-0.5 block text-[11px] font-sans text-ink-500" dir={locale === 'he' ? 'rtl' : 'ltr'}>
                    {minutes(doc.readingMinutes)} · {doc.wordCount.toLocaleString()} {tr(locale, 'מילים', 'words', 'слов')}
                  </span>
                </span>
              </span>
            </summary>
            <div
              // break-words: research text contains bare source URLs that would
              // otherwise stretch the drawer past the viewport on mobile.
              className="px-4 pb-4 pt-3 text-sm text-ink-200 break-words [overflow-wrap:anywhere] border-t border-ink-700/30"
              style={readingStyle(prefs)}
            >
              <ResearchBlocks doc={doc} locale={locale} compact />
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
