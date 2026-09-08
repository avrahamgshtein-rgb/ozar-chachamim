// RAG orchestrator: question (+ conversation) → relevant sages → retrieved
// passages plus primary and external sources. Server-only module.
//
// Stage 6 changed two things here. Context is now built from passages scored
// against the question rather than the first 3000 characters of the first
// document, and every piece of evidence carries a citation handle and a source
// kind so the answer can attribute it.
import { getAllSages, getSageConnections, getResearchDocs } from '@/lib/serverData'
import { extractMentionedSages, findAmbiguousMentions } from './entityExtraction'
import { retrievePassages, type Passage } from './retrieval'
import { fetchSefariaTopic, type SefariaTopic } from './sefaria'
import { fetchWikipediaSummary } from './wikipedia'
import { CONNECTION_LABELS } from '@/lib/types'
import type { Sage, Locale } from '@/lib/types'

export interface SageContext {
  sage: Sage
  connections: Array<{ type: string; name: string }>
  sefariaTopic: SefariaTopic | null
  wikipediaExtract: string | null
  /** True when this sage came from earlier turns, not the current question. */
  fromConversation: boolean
}

export interface AmbiguousMention {
  /** The text in the question that could not be resolved to one sage. */
  mention: string
  candidates: Array<{ id: string; label: string }>
}

export interface RagContext {
  question: string
  matchedSages: SageContext[]
  /** Passages retrieved for this question, already ranked. */
  passages: Passage[]
  /** Nothing in the question or the conversation matched a known sage. */
  noMatch: boolean
  /** Names that matched several sages. Never resolved silently. */
  ambiguous: AmbiguousMention[]
  /** True when sages were identified but no passage cleared the relevance bar. */
  insufficientEvidence: boolean
}

const MAX_SAGES_PER_QUESTION = 3
const MAX_PASSAGES = 8

async function buildSageContext(
  sage: Sage,
  locale: Locale,
  fromConversation: boolean,
): Promise<SageContext> {
  const connections = getSageConnections(sage.id).map(c => ({
    type: CONNECTION_LABELS[c.type]?.[locale] ?? c.type,
    name: c.otherSage.label,
  }))

  const [sefariaTopic, wikipediaSummary] = await Promise.all([
    fetchSefariaTopic(sage.name_en ?? sage.label).catch(() => null),
    fetchWikipediaSummary(sage.label, sage.name_en).catch(() => null),
  ])

  return {
    sage,
    connections,
    sefariaTopic,
    wikipediaExtract: wikipediaSummary?.extract ?? null,
    fromConversation,
  }
}

/**
 * Sage ids referred to earlier in a conversation, most recent first.
 *
 * Only user turns are scanned: assistant replies quote many names in passing,
 * and treating those as the subject would drift the conversation onto whoever
 * was mentioned last rather than whoever was asked about.
 */
export function sageIdsFromHistory(
  history: Array<{ role: string; content: string }>,
  allSages: Sage[] = getAllSages(),
): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i]
    if (turn.role !== 'user') continue
    for (const m of extractMentionedSages(turn.content, allSages)) {
      if (seen.has(m.sage.id)) continue
      seen.add(m.sage.id)
      ids.push(m.sage.id)
    }
    if (ids.length >= MAX_SAGES_PER_QUESTION) break
  }
  return ids.slice(0, MAX_SAGES_PER_QUESTION)
}

export interface BuildContextOptions {
  locale?: Locale
  /**
   * Sage ids carried from earlier turns. Lets a follow-up like "his students"
   * or "ומה עם התלמידים שלו?" stay on the same subject without the user
   * repeating the name.
   */
  conversationSageIds?: string[]
}

export async function buildRagContext(
  question: string,
  options: BuildContextOptions = {},
): Promise<RagContext> {
  const { locale = 'he', conversationSageIds = [] } = options
  const allSages = getAllSages()

  const mentioned = extractMentionedSages(question, allSages)
  const ambiguous = findAmbiguousMentions(question, allSages)

  // A question that names nobody is treated as a follow-up about whoever the
  // conversation was already discussing.
  let resolved: Array<{ sage: Sage; fromConversation: boolean }> = mentioned
    .slice(0, MAX_SAGES_PER_QUESTION)
    .map(m => ({ sage: m.sage, fromConversation: false }))

  if (resolved.length === 0 && conversationSageIds.length > 0) {
    const byId = new Map(allSages.map(s => [s.id, s]))
    resolved = conversationSageIds
      .map(id => byId.get(id))
      .filter((s): s is Sage => Boolean(s))
      .slice(0, MAX_SAGES_PER_QUESTION)
      .map(sage => ({ sage, fromConversation: true }))
  }

  if (resolved.length === 0) {
    return {
      question,
      matchedSages: [],
      passages: [],
      noMatch: true,
      ambiguous,
      insufficientEvidence: false,
    }
  }

  const [matchedSages, docSets] = await Promise.all([
    Promise.all(resolved.map(r => buildSageContext(r.sage, locale, r.fromConversation))),
    Promise.all(
      resolved.map(async r => ({
        sageId: r.sage.id,
        sageLabel: r.sage.label,
        docs: await getResearchDocs(r.sage.id, locale),
      })),
    ),
  ])

  const passages = retrievePassages(docSets, question, { limit: MAX_PASSAGES })

  return {
    question,
    matchedSages,
    passages,
    noMatch: false,
    ambiguous,
    insufficientEvidence: passages.length === 0,
  }
}

/**
 * Fence used to mark retrieved corpus text in the prompt. Everything between
 * the markers is evidence to quote, never instructions to follow.
 */
const EVIDENCE_OPEN = '<<<EVIDENCE'
const EVIDENCE_CLOSE = 'EVIDENCE>>>'

/** Strip anything that could be mistaken for our own fence markers. */
function sanitiseEvidence(text: string): string {
  return text.replace(/<<<EVIDENCE|EVIDENCE>>>/g, '[…]')
}

/**
 * Render gathered context for the prompt. Each block is labelled with its
 * citation handle and source kind so the model can attribute claims and the
 * reader can tell internal research from a primary source or an external
 * summary.
 */
export function formatContextForPrompt(context: RagContext): string {
  if (context.noMatch) {
    return 'No known sage was identified in the question or the conversation so far. There is no relevant material in the corpus.'
  }

  const blocks: string[] = []

  for (const sc of context.matchedSages) {
    const header = `## ${sc.sage.label}${sc.sage.name_en ? ` (${sc.sage.name_en})` : ''}`
      + (sc.fromConversation ? '  [carried over from earlier in this conversation]' : '')
    const parts = [header]
    if (sc.sage.bio) parts.push(`Biography (dataset): ${sc.sage.bio}`)
    if (sc.sage.core_concept) parts.push(`Core idea (dataset): ${sc.sage.core_concept}`)
    if (sc.connections.length) {
      parts.push(`Connections (dataset): ${sc.connections.map(c => `${c.name} (${c.type})`).join(', ')}`)
    }
    if (sc.sefariaTopic?.description) {
      parts.push(`[PRIMARY · Sefaria] ${sc.sefariaTopic.description}`)
    }
    if (sc.sefariaTopic?.refs.length) {
      parts.push(`[PRIMARY · Sefaria refs] ${sc.sefariaTopic.refs.join(', ')}`)
    }
    if (sc.wikipediaExtract) {
      parts.push(`[EXTERNAL · Wikipedia] ${sc.wikipediaExtract}`)
    }
    blocks.push(parts.join('\n'))
  }

  if (context.passages.length > 0) {
    const cited = context.passages.map(p => {
      const loc = `chars ${p.charStart}–${p.charEnd}`
      return `[${p.citationId}] [INTERNAL RESEARCH] ${p.sageLabel} — "${p.docTitle}" (${loc})\n`
        + `${EVIDENCE_OPEN}\n${sanitiseEvidence(p.text)}\n${EVIDENCE_CLOSE}`
    })
    blocks.push(`### Retrieved passages\n\n${cited.join('\n\n')}`)
  } else {
    blocks.push('### Retrieved passages\n\n(No passage in the research corpus matched this question.)')
  }

  if (context.ambiguous.length > 0) {
    const lines = context.ambiguous.map(a =>
      `- "${a.mention}" could refer to: ${a.candidates.map(c => c.label).join(' | ')}`)
    blocks.push(`### Ambiguous names — ask which one is meant, do not choose\n${lines.join('\n')}`)
  }

  return blocks.join('\n\n---\n\n')
}
