// Renders a parsed research document (lib/researchParse). Presentation only:
// every string on screen is the source text. Two things are styled rather
// than shown verbatim — markdown's ** markers are dropped around the bold
// text, and the "cite: " inside "[cite: 3]" stays in the DOM (so copying
// gives the original) but is visually hidden. URLs print decoded and without
// the scheme; the link itself is untouched.
// Shared by the sage page's reader and the drawer's compact view.
import type { ReactNode } from 'react'
import type { Locale } from '@/lib/types'
import {
  citeTarget, displayUrl, tokenizeInline,
  type ParsedResearchDoc, type ResearchBlock,
} from '@/lib/researchParse'

export const READER_STRINGS = {
  sources: { he: 'מקורות', en: 'Sources', ru: 'Источники' },
  summary: { he: 'תקציר', en: 'Summary', ru: 'Резюме' },
  copyLink: { he: 'העתקת קישור לסעיף', en: 'Copy link to section', ru: 'Скопировать ссылку на раздел' },
  table: { he: 'טבלה', en: 'Table', ru: 'Таблица' },
  showSources: { he: 'הצגת המקורות', en: 'Show sources', ru: 'Показать источники' },
} satisfies Record<string, Record<Locale, string>>

interface InlineCtx {
  /** Anchor for citation n, or null to show it unlinked. */
  cite?: (n: number) => string | null
  /** Render URLs as one truncated line (bibliography). */
  urlBlock?: boolean
}

export function Inline({ text, ctx = {} }: { text: string; ctx?: InlineCtx }) {
  const tokens = tokenizeInline(text)
  return (
    <>
      {tokens.map((t, i) => {
        switch (t.kind) {
          case 'text':
            return t.text
          case 'strong':
            return <strong key={i} className="font-semibold text-ink-50">{t.inner}</strong>
          case 'url':
            return (
              <a key={i} href={t.href} target="_blank" rel="noopener noreferrer" dir="ltr"
                className={`reader-url ${ctx.urlBlock
                  // In the sources list: one quiet line, aligned with its (RTL or LTR) entry.
                  ? 'mt-0.5 block truncate text-[0.92em] text-ink-500 [text-align:match-parent] hover:text-gold-300'
                  : 'text-gold-300/90 underline decoration-gold-500/30 underline-offset-2 [overflow-wrap:anywhere] hover:text-gold-200 hover:decoration-gold-300'}`}
                title={t.href}
              >
                {displayUrl(t.href)}
              </a>
            )
          case 'cite': {
            const parts = t.body.split(/(\d+)/)
            return (
              <sup key={i} dir="ltr" className="cite ms-0.5 font-sans text-[0.68em] font-medium text-ink-400 whitespace-nowrap">
                [
                {t.prefix && <span className="sr-only">{t.prefix}</span>}
                {parts.map((p, j) => {
                  if (!/^\d+$/.test(p)) return p
                  const href = ctx.cite?.(Number(p))
                  return href ? (
                    <a key={j} href={`#${href}`} className="text-gold-300 hover:text-gold-200 hover:underline">{p}</a>
                  ) : p
                })}
                ]
              </sup>
            )
          }
        }
      })}
    </>
  )
}

export function ResearchBlocks({
  doc, locale, compact = false, onCopyLink,
}: {
  doc: ParsedResearchDoc
  locale: Locale
  /** The drawer: smaller type, no anchors, sources folded away. */
  compact?: boolean
  /** Given on the page: headings get a copy-link button. */
  onCopyLink?: (id: string) => void
}) {
  const out: ReactNode[] = []
  doc.blocks.forEach((b, bi) => {
    const ctx: InlineCtx = compact ? {} : { cite: n => citeTarget(doc, bi, n) }
    const key = `${b.kind}-${bi}`
    out.push(renderBlock(b, key, ctx, doc, locale, compact, onCopyLink))
  })
  return <>{out}</>
}

function renderBlock(
  b: ResearchBlock, key: string, ctx: InlineCtx, doc: ParsedResearchDoc,
  locale: Locale, compact: boolean, onCopyLink?: (id: string) => void,
): ReactNode {
  switch (b.kind) {
    case 'title':
      // The document header shows the first copy; the repeat adds nothing.
      return null

    case 'heading': {
      const Tag = b.level === 2 ? 'h3' : 'h4'
      if (compact) {
        return (
          <Tag key={key} dir="auto"
            className={`font-serif font-bold text-ink-50 ${b.level === 2 ? 'mt-5 mb-2 text-[1.05em]' : 'mt-4 mb-1.5 text-[0.98em] text-ink-100'}`}>
            <Inline text={b.text} />
          </Tag>
        )
      }
      return (
        <Tag key={key} id={b.id} data-toc="" dir="auto"
          className={`reader-h${b.level} group relative scroll-mt-24 font-serif font-bold text-ink-50 ${
            b.level === 2 ? 'mt-12 mb-4 text-[1.45em] leading-snug' : 'mt-8 mb-3 text-[1.18em] leading-snug text-ink-100'
          }`}>
          <Inline text={b.text} />
          {onCopyLink && (
            <button type="button" onClick={() => onCopyLink(b.id)}
              aria-label={`${READER_STRINGS.copyLink[locale]}: ${b.text}`}
              title={READER_STRINGS.copyLink[locale]}
              className="no-print ms-2 inline-flex h-7 w-7 translate-y-[-0.1em] items-center justify-center rounded-md align-middle text-ink-500 opacity-40 transition-opacity hover:bg-ink-700/50 hover:text-gold-300 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60">
              <LinkIcon />
            </button>
          )}
        </Tag>
      )
    }

    case 'paragraph':
      if (b.lead) {
        return (
          <div key={key} className="reader-lead mb-8 rounded-xl border-s-2 border-gold-500/50 bg-ink-800/40 px-5 py-4">
            <p className="mb-1.5 text-[11px] font-sans font-semibold uppercase tracking-widest text-gold-400/80">
              {READER_STRINGS.summary[locale]}
            </p>
            <p dir="auto" className="text-[0.95em] leading-relaxed text-ink-300">
              <Inline text={b.text} ctx={ctx} />
            </p>
          </div>
        )
      }
      return (
        <p key={key} dir="auto" className={compact ? 'mb-3' : 'mb-5'}>
          <Inline text={b.text} ctx={ctx} />
        </p>
      )

    case 'quote':
      return (
        <blockquote key={key} dir="auto"
          className="my-5 border-s-2 border-gold-500/40 ps-4 font-serif italic text-ink-100 [font-size:1.03em]">
          <Inline text={b.text} ctx={ctx} />
        </blockquote>
      )

    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul'
      return (
        <Tag key={key} className={`${compact ? 'mb-3 space-y-1.5' : 'mb-6 space-y-2.5'}`}>
          {b.items.map((it, ii) => (
            <li key={ii} dir="auto" className="flex gap-2.5">
              {it.marker ? (
                <span className="min-w-[1.6em] flex-shrink-0 font-sans text-[0.9em] tabular-nums text-gold-400/90">{it.marker}</span>
              ) : (
                <span className="mt-[0.72em] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold-500/70" aria-hidden />
              )}
              <span className="min-w-0">
                {it.labelEnd > 0 ? (
                  <>
                    <strong className="font-semibold text-ink-50"><Inline text={it.text.slice(0, it.labelEnd)} /></strong>
                    <Inline text={it.text.slice(it.labelEnd)} ctx={ctx} />
                  </>
                ) : (
                  <Inline text={it.text} ctx={ctx} />
                )}
              </span>
            </li>
          ))}
        </Tag>
      )
    }

    case 'table': {
      const width = Math.max(...b.rows.map(r => r.length))
      const [head, ...body] = b.rows
      const pad = (r: string[]) => (r.length < width ? [...r, ...Array(width - r.length).fill('')] : r)
      return (
        <div key={key} className={compact ? 'mb-3' : 'mb-7'}>
          {b.intro && (
            <p dir="auto" className="mb-3"><Inline text={b.intro} ctx={ctx} /></p>
          )}
          <div
            role="region" aria-label={READER_STRINGS.table[locale]} tabIndex={0}
            className="reader-table max-w-full overflow-x-auto rounded-xl border border-ink-700/50 bg-ink-800/30"
          >
            <table className="w-full border-collapse text-start font-sans text-[0.86em] leading-relaxed"
              style={{ minWidth: `${Math.min(width * 9, 44)}rem` }}>
              <thead>
                <tr className="bg-ink-700/40">
                  {pad(head).map((c, ci) => (
                    <th key={ci} scope="col" dir="auto" className="px-3 py-2.5 text-start align-bottom font-semibold text-ink-50">
                      <Inline text={c} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((r, ri) => (
                  <tr key={ri} className="border-t border-ink-700/40 odd:bg-ink-900/20">
                    {pad(r).map((c, ci) => (
                      <td key={ci} dir="auto" className={`px-3 py-2.5 align-top ${ci === 0 ? 'font-medium text-ink-100' : 'text-ink-200'}`}>
                        <Inline text={c} ctx={ctx} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    case 'separator':
      return (
        <div key={key} role="separator" className={`flex items-center justify-center gap-3 text-gold-500/40 ${compact ? 'my-4' : 'my-10'}`}>
          <span className="h-px w-16 bg-gradient-to-l from-gold-500/40 to-transparent" />
          <span aria-hidden className="text-xs">✦</span>
          <span className="h-px w-16 bg-gradient-to-r from-gold-500/40 to-transparent" />
        </div>
      )

    case 'bibliography': {
      const heading = b.heading?.text ?? READER_STRINGS.sources[locale]
      const list = (
        <ol className="space-y-2.5">
          {b.entries.map((e, ei) => (
            <li key={`${e.line}-${ei}`} id={compact ? undefined : `${b.id}-${e.n}`}
              className="reader-bib-entry flex scroll-mt-24 gap-3 rounded-lg px-2 py-1 -mx-2 transition-colors target:bg-gold-500/15">
              <span className="min-w-[2.2ch] flex-shrink-0 text-end font-sans tabular-nums text-gold-400/80">
                {e.marker ?? `${e.n}.`}
              </span>
              <span dir="auto" className="min-w-0 flex-1 break-words">
                <Inline text={e.text} ctx={{ urlBlock: true }} />
                {e.urlLine && <Inline text={e.urlLine.text} ctx={{ urlBlock: true }} />}
              </span>
            </li>
          ))}
        </ol>
      )
      if (compact) {
        return (
          <details key={key} className="mt-5 rounded-lg border border-ink-700/40 bg-ink-900/30 px-3 py-2 text-[0.8em]">
            <summary className="cursor-pointer select-none font-sans text-ink-400 hover:text-gold-300">
              {heading} ({b.entries.length})
            </summary>
            <div className="mt-2 text-ink-300">{list}</div>
          </details>
        )
      }
      return (
        <section key={key} id={b.id} data-toc="" aria-label={heading}
          className="reader-bib mt-14 scroll-mt-24 rounded-2xl border border-ink-700/50 bg-ink-800/30 p-5 md:p-6 font-sans text-[0.8em] leading-relaxed text-ink-300">
          <h3 className="mb-4 flex items-center gap-2 font-serif text-[1.35em] font-bold text-ink-50">
            <BookIcon />
            {heading}
            <span className="ms-1 rounded-full bg-ink-700/60 px-2 py-0.5 font-sans text-[0.6em] font-medium tabular-nums text-ink-300">{b.entries.length}</span>
          </h3>
          {list}
        </section>
      )
    }
  }
}

function LinkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg className="h-5 w-5 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  )
}
