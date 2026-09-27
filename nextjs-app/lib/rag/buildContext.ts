// RAG orchestrator: question (+ conversation) → relevant sages → retrieved
// passages plus primary and external sources. Server-only module.
//
// Stage 6 changed two things here. Context is now built from passages scored
// against the question rather than the first 3000 characters of the first
// document, and every piece of evidence carries a citation handle and a source
// kind so the answer can attribute it.
import { getAllSages, getSageConnections, getResearchDocs } from '@/lib/serverData'
import { extractMentionedSages, findAmbiguousMentions } from './entityExtraction'
import { retrievePassages } from './retrieval'
import { locatePassages, type CitedPassage } from './citations'
import { fetchSefariaTopic, type SefariaTopic } from './sefaria'
import { fetchWikipediaSummary } from './wikipedia'
import { groupRelated, RELATION_LABELS, type RelationGroup } from '@/components/sages/relations'
import { displayName } from '@/lib/displayName'
import type { Sage, Locale } from '@/lib/types'

/**
 * The sages linked to one sage, grouped by how they stand to it. Built with
 * the same direction-aware grouping the sage page uses (relations.ts): a
 * link's type alone does not say which end is the teacher.
 */
export interface SageRelation {
  group: RelationGroup
  people: Array<{ id: string; name: string; name_en?: string }>
}

export interface SageContext {
  sage: Sage
  relations: SageRelation[]
  sefariaTopic: SefariaTopic | null
  wikipediaExtract: string | null
  /** True when this sage came from earlier turns, not the current question. */
  fromConversation: boolean
  /** True for the sage the chat was opened about ("שאלו על החכם"). */
  isSubject: boolean
}

export interface AmbiguousMention {
  /** The text in the question that could not be resolved to one sage. */
  mention: string
  candidates: Array<{ id: string; label: string }>
}

export interface RagContext {
  question: string
  matchedSages: SageContext[]
  /** Passages retrieved for this question, already ranked, each with its place in the reader. */
  passages: CitedPassage[]
  /** Nothing in the question or the conversation matched a known sage. */
  noMatch: boolean
  /** Names that matched several sages. Never resolved silently. */
  ambiguous: AmbiguousMention[]
  /** True when sages were identified but no passage cleared the relevance bar. */
  insufficientEvidence: boolean
}

const MAX_SAGES_PER_QUESTION = 3
const MAX_PASSAGES = 8

/** `sage`'s relations, most relevant group first, each group in chronological order. */
export function relationsOf(sage: Sage): SageRelation[] {
  const links = getSageConnections(sage.id)
  const others = new Map(links.map(l => [l.otherSage.id, l.otherSage]))
  return groupRelated(sage.id, links, id => others.get(id)).map(g => ({
    group: g.group,
    people: g.people.map(p => ({ id: p.id, name: displayName(p.label), name_en: p.name_en })),
  }))
}

async function buildSageContext(sage: Sage, origin: Origin): Promise<SageContext> {
  const relations = relationsOf(sage)

  const [sefariaTopic, wikipediaSummary] = await Promise.all([
    fetchSefariaTopic(sage.name_en ?? sage.label).catch(() => null),
    fetchWikipediaSummary(sage.label, sage.name_en).catch(() => null),
  ])

  return {
    sage,
    relations,
    sefariaTopic,
    wikipediaExtract: wikipediaSummary?.extract ?? null,
    fromConversation: origin === 'conversation',
    isSubject: origin === 'subject',
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
  /**
   * The sage the chat was opened about ("שאלו על החכם"), already validated
   * by the caller. When the question names nobody, it is the subject; when
   * the question names someone else, it is kept after them, so "he" and
   * "him" still have a referent. An unknown id is ignored.
   */
  subjectSageId?: string
}

/** Why a sage is in the context: named in the question, the chat's subject, or carried over from earlier turns. */
type Origin = 'question' | 'subject' | 'conversation'

export async function buildRagContext(
  question: string,
  options: BuildContextOptions = {},
): Promise<RagContext> {
  const { locale = 'he', conversationSageIds = [], subjectSageId } = options
  const allSages = getAllSages()
  const byId = new Map(allSages.map(s => [s.id, s]))
  const subject = subjectSageId ? byId.get(subjectSageId) ?? null : null

  const mentioned = extractMentionedSages(question, allSages)
  const ambiguous = findAmbiguousMentions(question, allSages)

  let resolved: Array<{ sage: Sage; origin: Origin }> = mentioned
    .slice(0, MAX_SAGES_PER_QUESTION)
    .map(m => ({ sage: m.sage, origin: 'question' as Origin }))

  if (resolved.length === 0) {
    // A question that names nobody is a follow-up: about the sage the chat
    // was opened on, else about whoever the conversation was discussing.
    const ids = [...(subject ? [subject.id] : []), ...conversationSageIds]
    resolved = [...new Set(ids)]
      .map(id => byId.get(id))
      .filter((s): s is Sage => Boolean(s))
      .slice(0, MAX_SAGES_PER_QUESTION)
      .map(sage => ({ sage, origin: (sage.id === subject?.id ? 'subject' : 'conversation') as Origin }))
  } else if (subject) {
    const named = resolved.find(r => r.sage.id === subject.id)
    if (named) named.origin = 'subject'
    else resolved = [...resolved.slice(0, MAX_SAGES_PER_QUESTION - 1), { sage: subject, origin: 'subject' }]
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
    Promise.all(resolved.map(r => buildSageContext(r.sage, r.origin))),
    Promise.all(
      resolved.map(async r => ({
        sageId: r.sage.id,
        sageLabel: r.sage.label,
        docs: await getResearchDocs(r.sage.id, locale),
      })),
    ),
  ])

  // Each passage also gets the reader heading it falls under, so the answer
  // can link a citation to the page's text.
  const passages = locatePassages(
    retrievePassages(docSets, question, { limit: MAX_PASSAGES }),
    new Map(docSets.map(d => [d.sageId, d.docs])),
  )

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
/**
 * One sage's relation lines. Each line names the people who stand in that
 * relation TO this sage ("Students: …" are this sage's students), so the model
 * never has to work out a link's direction. The locale's own heading, the
 * words the sage page uses, follows in parentheses.
 */
export function formatRelations(sc: Pick<SageContext, 'sage' | 'relations'>, locale: Locale = 'he'): string[] {
  if (sc.relations.length === 0) return []
  const lines = sc.relations.map(r => {
    const label = RELATION_LABELS[r.group]
    const heading = locale === 'en' ? label.en : `${label.en} (${label[locale]})`
    const names = r.people.map(p => (p.name_en ? `${p.name} (${p.name_en})` : p.name)).join(', ')
    return `- ${heading}: ${names}`
  })
  return [
    `Relations of ${displayName(sc.sage.label)} (dataset; direction already resolved: each line names the people who stand in that relation to this sage):`,
    ...lines,
  ]
}

export function formatContextForPrompt(context: RagContext, locale: Locale = 'he'): string {
  if (context.noMatch) {
    return 'No known sage was identified in the question or the conversation so far. There is no relevant material in the corpus.'
  }

  const blocks: string[] = []

  for (const sc of context.matchedSages) {
    const header = `## ${sc.sage.label}${sc.sage.name_en ? ` (${sc.sage.name_en})` : ''}`
      + (sc.isSubject ? '  [the sage this chat was opened about; "he" or "him" in the question means this sage]' : '')
      + (sc.fromConversation ? '  [carried over from earlier in this conversation]' : '')
    const parts = [header]
    if (sc.sage.bio) parts.push(`Biography (dataset): ${sc.sage.bio}`)
    if (sc.sage.core_concept) parts.push(`Core idea (dataset): ${sc.sage.core_concept}`)
    parts.push(...formatRelations(sc, locale))
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
