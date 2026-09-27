'use client'

// The sage page's reader for the full research papers: a table of contents
// (sticky beside the text on desktop, a collapsible "תוכן עניינים" on
// phones), a reading-progress bar under the top bar, reading time, heading
// anchors with copy-link, and the sources list that inline [n] refs link to.
// The documents arrive already parsed on the server (lib/researchParse).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '@/lib/types'
import type { ParsedResearchDoc, TocEntry } from '@/lib/researchParse'
import { ReadingControls, readingStyle, useReadingPrefs } from '@/components/ui/ReadingControls'
import { ResearchBlocks, READER_STRINGS } from './ResearchBlocks'
import { copyText, showToast } from './Toast'

const S = {
  research: { he: 'מחקר מלא', en: 'Full research', ru: 'Полное исследование' },
  toc: { he: 'תוכן עניינים', en: 'Contents', ru: 'Содержание' },
  sections: { he: 'סעיפים', en: 'sections', ru: 'разделов' },
  words: { he: 'מילים', en: 'words', ru: 'слов' },
  minRead: { he: 'דק׳ קריאה', en: 'min read', ru: 'мин чтения' },
  minLeft: { he: 'דק׳ נותרו', en: 'min left', ru: 'мин осталось' },
  docs: { he: 'מסמכים', en: 'documents', ru: 'документов' },
  document: { he: 'מסמך', en: 'Document', ru: 'Документ' },
  progress: { he: 'התקדמות הקריאה', en: 'Reading progress', ru: 'Прогресс чтения' },
  copied: { he: 'הקישור לסעיף הועתק', en: 'Link to section copied', ru: 'Ссылка на раздел скопирована' },
  copyFailed: { he: 'לא ניתן להעתיק את הקישור', en: 'Could not copy the link', ru: 'Не удалось скопировать ссылку' },
  hebrewOnly: {
    he: '',
    en: 'This research is currently available in Hebrew only.',
    ru: 'Это исследование пока доступно только на иврите.',
  },
} satisfies Record<string, Record<Locale, string>>

interface Props {
  docs: ParsedResearchDoc[]
  locale: Locale
  /** True when the documents are the Hebrew originals shown on an en/ru page. */
  isFallback?: boolean
}

/** The scroll container of the sage page (the body itself never scrolls). */
function scroller(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById('sage-scroll')
}

export function ResearchReader({ docs, locale, isFallback = false }: Props) {
  const [prefs, setPrefs] = useReadingPrefs()
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState<string | null>(null)
  /** True while the reader fills the screen: the phone's "now reading" bar shows. */
  const [inside, setInside] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const mobileTocRef = useRef<HTMLDetailsElement>(null)

  const totalWords = docs.reduce((n, d) => n + d.wordCount, 0)
  const totalMinutes = docs.reduce((n, d) => n + d.readingMinutes, 0)
  const tocCount = docs.reduce((n, d) => n + d.toc.length, 0)
  const pageDir = locale === 'he' ? 'rtl' : 'ltr'

  // Progress through the research section and the heading currently read,
  // from one rAF-throttled scroll listener on the page's scroll container.
  useEffect(() => {
    const el = scroller()
    const section = sectionRef.current
    if (!el || !section) return
    let frame = 0
    const measure = () => {
      frame = 0
      const top = 72 // below the sticky top bar
      const rect = section.getBoundingClientRect()
      const span = rect.height - (window.innerHeight - top)
      const p = span > 0 ? (top - rect.top) / span : rect.top < top ? 1 : 0
      setProgress(Math.max(0, Math.min(1, p)))
      // The section being read: the last heading above the top third of the screen.
      const line = top + window.innerHeight * 0.3
      let current: string | null = null
      for (const h of section.querySelectorAll<HTMLElement>('[data-toc]')) {
        if (h.getBoundingClientRect().top <= line) current = h.id
        else break
      }
      setActive(current)
      setInside(rect.top < top - 40 && rect.bottom > window.innerHeight * 0.6)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure) }
    measure()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const onCopyLink = useCallback(async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(id)}`
    try { history.replaceState(null, '', `#${encodeURIComponent(id)}`) } catch { /* noop */ }
    showToast((await copyText(url)) ? S.copied[locale] : S.copyFailed[locale])
  }, [locale])

  const minutesLeft = Math.max(0, Math.ceil(totalMinutes * (1 - progress)))

  // What the phone bar names as "now reading".
  const activeLabel = useMemo(() => {
    if (!active) return null
    for (let di = 0; di < docs.length; di++) {
      if (active === `doc-${di + 1}`) return docTitle(docs[di])
      const e = docs[di].toc.find(x => x.id === active)
      if (e) return e.text ?? READER_STRINGS.sources[locale]
    }
    return null
  }, [active, docs, locale])

  const openMobileToc = () => {
    const d = mobileTocRef.current
    if (!d) return
    d.open = true
    d.scrollIntoView({ block: 'start' })
  }

  return (
    <section ref={sectionRef} id="research" aria-labelledby="research-title" className="reader relative">
      {/* Reading progress, pinned under the page's top bar */}
      <div
        className="no-print pointer-events-none fixed inset-x-0 top-14 z-30 h-[3px] bg-transparent"
        role="progressbar" aria-label={S.progress[locale]}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className="h-full bg-gradient-to-l from-gold-300 via-gold-400 to-gold-600 shadow-[0_0_8px_rgba(201,151,58,0.5)] transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})`, transformOrigin: pageDir === 'rtl' ? 'right' : 'left' }}
        />
      </div>

      {/* Phones: a slim "now reading" bar under the top bar while inside the text */}
      {tocCount > 1 && (
        <div
          aria-hidden={!inside}
          className={`no-print fixed inset-x-0 top-14 z-20 border-b border-gold-500/10 glass border-x-0 border-t-0 transition-all duration-200 lg:hidden ${
            inside ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
          }`}
        >
          <button type="button" onClick={openMobileToc} tabIndex={inside ? 0 : -1}
            className="flex h-10 w-full items-center gap-2 px-4 text-start font-sans text-xs text-ink-300">
            <ListIcon />
            <span dir="auto" className="min-w-0 flex-1 truncate text-ink-100">{activeLabel ?? S.toc[locale]}</span>
            <span className="flex-shrink-0 tabular-nums text-ink-500">{minutesLeft} {S.minLeft[locale]}</span>
          </button>
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-ink-700/40 pb-4">
        <div className="min-w-0">
          <h2 id="research-title" className="text-xs font-sans font-semibold uppercase tracking-widest text-gold-400/90">
            {S.research[locale]}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-sans text-ink-400">
            {docs.length > 1 && <span>{docs.length} {S.docs[locale]}</span>}
            {docs.length > 1 && <Dot />}
            <span className="tabular-nums">{totalWords.toLocaleString(locale === 'he' ? 'he-IL' : locale)} {S.words[locale]}</span>
            <Dot />
            <span className="inline-flex items-center gap-1 tabular-nums">
              <ClockIcon /> {totalMinutes} {S.minRead[locale]}
            </span>
          </p>
        </div>
        <ReadingControls prefs={prefs} onChange={setPrefs} locale={locale} className="no-print" />
      </header>

      {isFallback && S.hebrewOnly[locale] && (
        <p className="mb-5 rounded-lg border border-ink-700/40 bg-ink-800/40 px-3 py-2 text-xs font-sans text-ink-400">
          {S.hebrewOnly[locale]}
        </p>
      )}

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[16.5rem_minmax(0,1fr)] xl:gap-14">
        {/* Desktop: sticky contents beside the text */}
        <nav aria-label={S.toc[locale]} className="no-print hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100dvh-6.5rem)] overflow-y-auto overscroll-contain pb-6 pe-1">
            <p className="mb-3 flex items-center justify-between text-[11px] font-sans font-semibold uppercase tracking-widest text-ink-500">
              <span>{S.toc[locale]}</span>
              <span className="normal-case tracking-normal tabular-nums text-ink-500">
                {progress > 0.01 ? `${minutesLeft} ${S.minLeft[locale]}` : `${totalMinutes} ${S.minRead[locale]}`}
              </span>
            </p>
            <TocList docs={docs} locale={locale} active={active} collapseSubsections />
          </div>
        </nav>

        <div className="min-w-0">
          {/* Phones and tablets: a collapsible contents */}
          {tocCount > 1 && (
            <details ref={mobileTocRef} className="no-print group/toc mb-8 scroll-mt-28 rounded-xl border border-ink-700/50 bg-ink-800/40 lg:hidden">
              <summary className="flex cursor-pointer select-none list-none items-center gap-2 px-4 py-3 font-sans text-sm text-ink-200 [&::-webkit-details-marker]:hidden">
                <ListIcon />
                <span className="font-semibold">{S.toc[locale]}</span>
                <span className="text-xs text-ink-500">· {tocCount} {S.sections[locale]}</span>
                <svg className="ms-auto h-4 w-4 text-ink-500 transition-transform group-open/toc:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="max-h-[60vh] overflow-y-auto border-t border-ink-700/40 px-3 py-3">
                <TocList docs={docs} locale={locale} active={active}
                  onNavigate={() => { if (mobileTocRef.current) mobileTocRef.current.open = false }} />
              </div>
            </details>
          )}

          <div className="reader-body mx-auto max-w-[46rem] text-ink-200" style={readingStyle(prefs)}>
            {docs.map((doc, di) => (
              <article key={di} id={`doc-${di + 1}`} data-toc="" dir={doc.dir} lang={doc.dir === 'rtl' ? 'he' : undefined}
                className={`reader-doc scroll-mt-24 ${di > 0 ? 'mt-20 border-t border-ink-700/40 pt-12' : ''}`}>
                <DocHeader doc={doc} index={di} count={docs.length} locale={locale} />
                <ResearchBlocks doc={doc} locale={locale} onCopyLink={onCopyLink} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** The paper's title as written in its first line, else the file's title field. */
function docTitle(doc: ParsedResearchDoc): string {
  const first = doc.blocks.find(b => b.kind === 'title' && !b.duplicate)
  return first && first.kind === 'title' ? first.text : doc.title
}

function DocHeader({ doc, index, count, locale }: {
  doc: ParsedResearchDoc; index: number; count: number; locale: Locale
}) {
  const title = docTitle(doc)
  return (
    <header className="mb-8">
      {count > 1 && (
        <p className="mb-2 text-[11px] font-sans font-semibold uppercase tracking-widest text-gold-400/80">
          {S.document[locale]} {index + 1}/{count}
        </p>
      )}
      <h2 dir="auto" className="reader-doc-title font-serif text-[1.7em] font-bold leading-tight text-ink-50 md:text-[1.95em]">
        {title}
      </h2>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8em] font-sans text-ink-500">
        <span className="inline-flex items-center gap-1 tabular-nums"><ClockIcon /> {doc.readingMinutes} {S.minRead[locale]}</span>
        <Dot />
        <span className="tabular-nums">{doc.wordCount.toLocaleString(locale === 'he' ? 'he-IL' : locale)} {S.words[locale]}</span>
      </p>
    </header>
  )
}

function TocList({ docs, locale, active, onNavigate, collapseSubsections = false }: {
  docs: ParsedResearchDoc[]
  locale: Locale
  active: string | null
  onNavigate?: () => void
  /** Show a section's subsections only while it is being read (the long desktop list). */
  collapseSubsections?: boolean
}) {
  const multi = docs.length > 1
  return (
    <ol className="space-y-3 font-sans text-[13px]">
      {docs.map((doc, di) => {
        const title = docTitle(doc)
        const entries = (
          <TocEntries toc={doc.toc} locale={locale} active={active} onNavigate={onNavigate}
            collapseSubsections={collapseSubsections} dir={doc.dir} />
        )
        if (!multi) return <li key={di}>{entries}</li>
        return (
          <li key={di}>
            <a href={`#doc-${di + 1}`} onClick={onNavigate} dir="auto"
              aria-current={active === `doc-${di + 1}` ? 'location' : undefined}
              className={`mb-1.5 line-clamp-2 block font-serif text-[14px] font-semibold leading-snug hover:text-gold-300 ${
                active === `doc-${di + 1}` ? 'text-gold-300' : 'text-ink-100'
              }`}>
              {title}
            </a>
            {entries}
          </li>
        )
      })}
    </ol>
  )
}

function TocEntries({ toc, locale, active, onNavigate, collapseSubsections, dir }: {
  toc: TocEntry[]
  locale: Locale
  active: string | null
  onNavigate?: () => void
  collapseSubsections: boolean
  dir: 'rtl' | 'ltr'
}) {
  // Which top-level section holds the active entry, to unfold its subsections.
  const activeParent = useMemo(() => {
    let parent: string | null = null
    for (const e of toc) {
      if (e.level === 2) parent = e.id
      if (e.id === active) return parent
    }
    return null
  }, [toc, active])

  let parent: string | null = null
  return (
    <ul dir={dir} className="space-y-0.5 border-s border-ink-700/60">
      {toc.map(e => {
        if (e.level === 2) parent = e.id
        const hidden = collapseSubsections && e.level === 3 && parent !== activeParent
        if (hidden) return null
        const isActive = e.id === active
        const text = e.text ?? READER_STRINGS.sources[locale]
        return (
          <li key={e.id}>
            <a
              href={`#${encodeURIComponent(e.id)}`}
              onClick={onNavigate}
              aria-current={isActive ? 'location' : undefined}
              className={`-ms-px block border-s-2 py-1 leading-snug transition-colors ${
                e.level === 3 ? 'ps-6 text-[12px]' : 'ps-3'
              } ${
                isActive
                  ? 'border-gold-400 font-medium text-gold-300'
                  : 'border-transparent text-ink-400 hover:border-ink-500 hover:text-ink-100'
              } ${e.kind === 'bibliography' ? 'mt-1.5 italic' : ''}`}
            >
              <span className="line-clamp-2">{text}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function Dot() {
  return <span className="text-ink-600" aria-hidden>·</span>
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="h-4 w-4 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  )
}
