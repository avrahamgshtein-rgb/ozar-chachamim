// Where a cited passage sits in the sage page's reader.
//
// The chat answer cites passages by handle ("[R539:0#12]"). The reader on
// /<locale>/sage/<id> renders the same documents (getResearchDocs, same
// locale, same order) through lib/researchParse, whose headings carry stable
// anchor ids. Parsing the cited document here, the same way, gives the heading
// a passage falls under, so the answer can link straight to it.
//
// Pure and server-safe: no I/O, no React.
import { parseResearchDoc, type ParsedResearchDoc } from '@/lib/researchParse'
import type { ResearchDoc } from '@/lib/serverData'
import type { Passage } from './retrieval'

export interface ReaderLocation {
  /**
   * An element id on the sage page: the heading (or sources list) the passage
   * falls under, else the document's own `doc-<n>` article. Null when the
   * passage could not be found in its document.
   */
  anchor: string | null
  /** That heading's text, for the link label. Null when there is none. */
  section: string | null
}

/** The anchor prefix parseResearchDocs gives document `docIndex`. */
function idPrefix(docIndex: number): string {
  return docIndex === 0 ? '' : `d${docIndex + 1}-`
}

/** Line index of `offset`, counting line breaks the way researchParse splits lines. */
function lineAt(content: string, offset: number): number {
  return (content.slice(0, offset).match(/\r\n|\r|\n/g) ?? []).length
}

/**
 * Where the passage's text starts in `content`. The recorded offset is tried
 * first; passage splitting can drift it by a few characters (whitespace-only
 * lines), so failing that, the passage's opening words are searched for near
 * it and then anywhere. Null when the text is not in this document at all.
 */
function passageStart(content: string, charStart: number, text: string): number | null {
  const head = text.slice(0, 60)
  if (!head) return null
  if (content.startsWith(head, charStart)) return charStart
  const near = content.indexOf(head, Math.max(0, charStart - 400))
  if (near !== -1 && near <= charStart + 400) return near
  const anywhere = content.indexOf(head)
  return anywhere === -1 ? null : anywhere
}

/** First source line a block covers, or null for blocks the reader does not anchor. */
function anchoredBlockLine(b: ParsedResearchDoc['blocks'][number]): { line: number; id: string; text: string | null } | null {
  if (b.kind === 'heading') return { line: b.line, id: b.id, text: b.text }
  if (b.kind === 'bibliography') {
    const lines = [b.heading?.line, b.separatorLine, b.entries[0]?.line].filter((n): n is number => typeof n === 'number')
    return lines.length ? { line: Math.min(...lines), id: b.id, text: b.heading?.text ?? null } : null
  }
  return null
}

/**
 * The reader location of one passage, given its sage's documents in reader
 * order. `cache` lets a caller parse each document once across passages.
 */
export function locatePassage(
  docs: ResearchDoc[],
  p: Pick<Passage, 'docIndex' | 'charStart' | 'text'>,
  cache: Map<number, ParsedResearchDoc> = new Map(),
): ReaderLocation {
  const doc = docs[p.docIndex]
  const content = typeof doc?.content === 'string' ? doc.content : ''
  const start = content ? passageStart(content, p.charStart, p.text) : null
  if (start === null) return { anchor: null, section: null }

  let parsed = cache.get(p.docIndex)
  if (!parsed) {
    parsed = parseResearchDoc(doc, idPrefix(p.docIndex))
    cache.set(p.docIndex, parsed)
  }
  // A document that fell back to plain paragraphs has no headings to point at.
  if (parsed.fallback) return { anchor: `doc-${p.docIndex + 1}`, section: null }

  const line = lineAt(content, start)
  // The nearest anchored block starting at or above the passage's first line.
  let best: { line: number; id: string; text: string | null } | null = null
  for (const b of parsed.blocks) {
    const at = anchoredBlockLine(b)
    if (at && at.line <= line && (!best || at.line >= best.line)) best = at
  }
  return best
    ? { anchor: best.id, section: best.text }
    : { anchor: `doc-${p.docIndex + 1}`, section: null }
}

export type CitedPassage = Passage & ReaderLocation

/** Attach reader locations to passages, parsing each cited document once. */
export function locatePassages(
  passages: Passage[],
  docsBySage: Map<string, ResearchDoc[]>,
): CitedPassage[] {
  const caches = new Map<string, Map<number, ParsedResearchDoc>>()
  return passages.map(p => {
    const docs = docsBySage.get(p.sageId)
    if (!docs) return { ...p, anchor: null, section: null }
    if (!caches.has(p.sageId)) caches.set(p.sageId, new Map())
    return { ...p, ...locatePassage(docs, p, caches.get(p.sageId)) }
  })
}

/**
 * The citation list the chat route returns with every answer. `anchor` is an
 * element id on /<locale>/sage/<sageId> (the locale of the request), so the
 * client can link a cited handle to the heading it came from.
 */
export interface CitationPayload {
  id: string
  sourceKind: Passage['sourceKind']
  sageId: string
  sageLabel: string
  docIndex: number
  docTitle: string
  section: string | null
  anchor: string | null
  charStart: number
  charEnd: number
  score: number
}

export function citationPayload(passages: CitedPassage[]): CitationPayload[] {
  return passages.map(p => ({
    id: p.citationId, sourceKind: p.sourceKind, sageId: p.sageId, sageLabel: p.sageLabel,
    docIndex: p.docIndex, docTitle: p.docTitle, section: p.section, anchor: p.anchor,
    charStart: p.charStart, charEnd: p.charEnd, score: p.score,
  }))
}
