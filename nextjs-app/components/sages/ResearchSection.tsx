'use client'

// מדור "מחקר מלא" בדף החכם — נטען בצד הלקוח מ-/research/<id>.json
// (עובד זהה בלוקאל וב-Vercel; הקבצים סטטיים ב-public/research)
import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/types'
import { ReadingControls, useReadingPrefs, readingStyle } from '@/components/ui/ReadingControls'

interface ResearchDoc {
  title: string
  source_file: string
  word_count: number
  content: string
}

export function ResearchSection({ sageId, locale }: { sageId: string; locale: Locale }) {
  const [docs, setDocs] = useState<ResearchDoc[] | null>(null)
  const [prefs, setPrefs] = useReadingPrefs()
  const isHe = locale === 'he'

  useEffect(() => {
    let alive = true
    fetch(`/research/${sageId}.json`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (alive) setDocs(Array.isArray(d) ? d : []) })
      .catch(() => { if (alive) setDocs([]) })
    return () => { alive = false }
  }, [sageId])

  if (docs === null) {
    return (
      <p className="text-xs font-sans text-ink-500 animate-pulse">
        {isHe ? 'טוען מחקר…' : 'Loading research…'}
      </p>
    )
  }
  if (docs.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-500">
          {isHe
            ? `מחקר מלא (${docs.length} ${docs.length === 1 ? 'מסמך' : 'מסמכים'})`
            : `Full Research (${docs.length} ${docs.length === 1 ? 'document' : 'documents'})`}
        </h2>
        <ReadingControls prefs={prefs} onChange={setPrefs} locale={locale} />
      </div>
      <div className="space-y-3" dir="rtl">
        {docs.map((doc, i) => (
          <details key={i} open={i === 0}
            className="rounded-xl border border-ink-700/40 bg-ink-800/30 overflow-hidden">
            <summary className="cursor-pointer select-none px-4 py-3 font-serif text-sm text-gold-300 hover:bg-ink-700/30 transition-colors">
              📖 {doc.title.length > 90 ? doc.title.slice(0, 90) + '…' : doc.title}
              <span className="text-ink-500 text-xs font-sans"> · {doc.word_count.toLocaleString()} {isHe ? 'מילים' : 'words'}</span>
            </summary>
            <div
              className="px-4 pb-4 pt-1 text-sm text-ink-200 whitespace-pre-line border-t border-ink-700/30"
              style={readingStyle(prefs)}
            >
              {doc.content}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
