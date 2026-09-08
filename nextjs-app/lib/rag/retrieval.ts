/**
 * Stage 6 — passage retrieval over the research corpus.
 *
 * Replaces the previous approach of feeding the model the first 3000 characters
 * of a sage's first research document regardless of what was asked. Documents
 * are split into passages, scored against the question, and returned with
 * enough identity to cite: which document, which passage, which character
 * range.
 *
 * Scoring is deliberately lexical (IDF-weighted term overlap plus a proximity
 * bonus). There is no embedding index in this project, and a deterministic
 * scorer is testable without a provider call.
 */

import { normalizeHe } from '@/lib/search'
import type { ResearchDoc } from '@/lib/serverData'

/** Where a passage came from, and how much to trust it. */
export type SourceKind = 'research' | 'primary' | 'external'

export interface Passage {
  /** Stable citation handle, e.g. "R3:2#4" — sage 3, document 2, passage 4. */
  citationId: string
  sourceKind: SourceKind
  sageId: string
  sageLabel: string
  /** Index of the document within that sage's research array. */
  docIndex: number
  docTitle: string
  sourceFile?: string
  /** Index of this passage within the document. */
  passageIndex: number
  /** Character range within the document's raw content. */
  charStart: number
  charEnd: number
  text: string
  score: number
}

/** Passages shorter than this are merged forward — headings, stray lines. */
const MIN_PASSAGE_CHARS = 240
/** Hard cap so a single runaway paragraph cannot dominate the context window. */
const MAX_PASSAGE_CHARS = 1400

export interface SplitPassage {
  passageIndex: number
  charStart: number
  charEnd: number
  text: string
}

/**
 * Split raw document content into passages on blank lines, merging fragments
 * that are too short and hard-splitting ones that are too long. Character
 * offsets refer to the original string so a citation can be located exactly.
 */
export function splitIntoPassages(content: string): SplitPassage[] {
  if (!content) return []

  const out: SplitPassage[] = []
  let bufStart = 0
  let buf = ''

  const flush = (endOffset: number) => {
    const text = buf.trim()
    if (!text) { buf = ''; return }
    // Trim leading whitespace off the recorded start so the range points at text.
    const lead = buf.length - buf.trimStart().length
    let start = bufStart + lead
    let remaining = text
    while (remaining.length > MAX_PASSAGE_CHARS) {
      // Prefer to break at a sentence end, else a space, else hard-cut.
      const window = remaining.slice(0, MAX_PASSAGE_CHARS)
      let cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '))
      if (cut < MIN_PASSAGE_CHARS) cut = window.lastIndexOf(' ')
      if (cut < MIN_PASSAGE_CHARS) cut = MAX_PASSAGE_CHARS
      else cut += 1
      const chunk = remaining.slice(0, cut).trim()
      out.push({ passageIndex: out.length, charStart: start, charEnd: start + chunk.length, text: chunk })
      start += cut
      remaining = remaining.slice(cut)
    }
    if (remaining.trim()) {
      out.push({
        passageIndex: out.length,
        charStart: start,
        charEnd: start + remaining.length,
        text: remaining.trim(),
      })
    }
    buf = ''
  }

  const lines = content.split('\n')
  let offset = 0
  for (const line of lines) {
    const lineStart = offset
    offset += line.length + 1 // +1 for the consumed '\n'
    if (line.trim() === '') {
      if (buf.trim().length >= MIN_PASSAGE_CHARS) flush(lineStart)
      else if (buf) buf += '\n'
      continue
    }
    if (!buf) bufStart = lineStart
    buf += (buf ? '\n' : '') + line
  }
  if (buf.trim()) flush(offset)

  return out.map((p, i) => ({ ...p, passageIndex: i }))
}

/** Question terms worth matching on — normalised, deduped, stopwords dropped. */
const QUERY_STOPWORDS = new Set([
  'מה', 'מי', 'איך', 'למה', 'האם', 'מתי', 'איפה', 'כמה', 'של', 'על', 'עם', 'את',
  'זה', 'הוא', 'היא', 'הם', 'היה', 'היו', 'לי', 'לו', 'אני', 'אתה', 'יש', 'אין',
  'what', 'who', 'how', 'why', 'when', 'where', 'did', 'was', 'were', 'the', 'and',
  'his', 'her', 'their', 'about', 'for', 'from', 'with', 'that', 'this', 'are', 'is',
].map(normalizeHe))

/** normalizeHe leaves punctuation in place, which would make "הבית?" miss "הבית". */
const PUNCT = /[?!.,;:()[\]{}"'`׳״־–—\-–—…]/g

export function queryTerms(question: string): string[] {
  const q = normalizeHe(question)
  if (!q) return []
  return [...new Set(
    q.split(/\s+/)
      .map(t => t.replace(PUNCT, ''))
      .filter(t => t.length >= 2 && !QUERY_STOPWORDS.has(t)),
  )]
}

interface ScoredCandidate extends SplitPassage {
  sageId: string
  sageLabel: string
  docIndex: number
  docTitle: string
  sourceFile?: string
  score: number
}

/**
 * Score a passage against query terms.
 *
 * IDF weighting stops corpus-wide words from dominating; the proximity bonus
 * favours passages where several distinct query terms occur close together,
 * which is what actually distinguishes an on-topic paragraph.
 */
/** Tokenise passage text the same way queryTerms tokenises the question. */
export function passageWords(text: string): string[] {
  return normalizeHe(text).split(/\s+/).map(w => w.replace(PUNCT, '')).filter(Boolean)
}

function scorePassage(text: string, terms: string[], idf: Map<string, number>): number {
  if (terms.length === 0) return 0
  const words = passageWords(text)
  if (words.length === 0) return 0

  let score = 0
  let distinctHits = 0
  const positions: number[] = []

  for (const term of terms) {
    let count = 0
    for (let i = 0; i < words.length; i++) {
      if (words[i] === term || (term.length >= 4 && words[i].includes(term))) {
        count++
        positions.push(i)
      }
    }
    if (count > 0) {
      distinctHits++
      // Saturating term frequency — a term repeated 20x is not 20x as relevant.
      const tf = 1 + Math.log(count)
      score += tf * (idf.get(term) ?? 1)
    }
  }

  if (distinctHits === 0) return 0

  // Reward passages covering several different query terms.
  score *= 1 + 0.5 * (distinctHits - 1)

  // Proximity: tight clusters of matches beat matches scattered across a page.
  if (positions.length >= 2) {
    positions.sort((a, b) => a - b)
    const span = positions[positions.length - 1] - positions[0]
    const density = positions.length / Math.max(span, 1)
    score *= 1 + Math.min(density, 1) * 0.4
  }

  // Mild length normalisation so long passages do not win on volume alone.
  return score / Math.log(10 + words.length)
}

export interface RetrievalInput {
  sageId: string
  sageLabel: string
  docs: ResearchDoc[]
}

export interface RetrieveOptions {
  /** Max passages returned overall. */
  limit?: number
  /** Max passages returned per sage, so one sage cannot crowd out the others. */
  perSageLimit?: number
  /** Passages scoring at or below this are dropped as irrelevant. */
  minScore?: number
}

/**
 * Retrieve the passages most relevant to `question` across every supplied
 * sage's research documents. Returns [] when nothing clears `minScore`, which
 * the caller should surface as "insufficient evidence" rather than padding the
 * prompt with arbitrary text.
 */
export function retrievePassages(
  inputs: RetrievalInput[],
  question: string,
  options: RetrieveOptions = {},
): Passage[] {
  const { limit = 8, perSageLimit = 4, minScore = 0.01 } = options
  const terms = queryTerms(question)
  if (terms.length === 0) return []

  // Build candidates and document frequency in one pass.
  const candidates: ScoredCandidate[] = []
  const docFreq = new Map<string, number>()

  for (const input of inputs) {
    input.docs.forEach((doc, docIndex) => {
      for (const p of splitIntoPassages(doc.content ?? '')) {
        candidates.push({
          ...p,
          sageId: input.sageId,
          sageLabel: input.sageLabel,
          docIndex,
          docTitle: doc.title ?? `document ${docIndex + 1}`,
          sourceFile: doc.source_file,
          score: 0,
        })
        const seen = new Set(passageWords(p.text))
        for (const term of terms) if (seen.has(term)) docFreq.set(term, (docFreq.get(term) ?? 0) + 1)
      }
    })
  }

  if (candidates.length === 0) return []

  const N = candidates.length
  const idf = new Map<string, number>()
  for (const term of terms) {
    const df = docFreq.get(term) ?? 0
    // Standard smoothed IDF; unseen terms get the maximum weight.
    idf.set(term, Math.log(1 + (N - df + 0.5) / (df + 0.5)))
  }

  for (const c of candidates) c.score = scorePassage(c.text, terms, idf)

  const ranked = candidates
    .filter(c => c.score > minScore)
    .sort((a, b) => b.score - a.score)

  // Enforce the per-sage cap while preserving global ranking order.
  const perSage = new Map<string, number>()
  const chosen: ScoredCandidate[] = []
  for (const c of ranked) {
    const n = perSage.get(c.sageId) ?? 0
    if (n >= perSageLimit) continue
    perSage.set(c.sageId, n + 1)
    chosen.push(c)
    if (chosen.length >= limit) break
  }

  return chosen.map(c => ({
    citationId: `R${c.sageId}:${c.docIndex}#${c.passageIndex}`,
    sourceKind: 'research' as const,
    sageId: c.sageId,
    sageLabel: c.sageLabel,
    docIndex: c.docIndex,
    docTitle: c.docTitle,
    sourceFile: c.sourceFile,
    passageIndex: c.passageIndex,
    charStart: c.charStart,
    charEnd: c.charEnd,
    text: c.text,
    score: Number(c.score.toFixed(4)),
  }))
}
