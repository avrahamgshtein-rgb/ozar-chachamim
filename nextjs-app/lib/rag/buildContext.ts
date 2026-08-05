// RAG Stage 2 — orchestrator: question → mentioned sages → gathered context
// from internal data (data.json + research docs + connections) plus Sefaria
// and Wikipedia. Produces a single structured context object that Stage 3
// (LLM integration) feeds into the system prompt. Server-only module.
import { getAllSages, getSageConnections, getResearchDocs } from '@/lib/serverData'
import { extractMentionedSages } from './entityExtraction'
import { fetchSefariaTopic, type SefariaTopic } from './sefaria'
import { fetchWikipediaSummary } from './wikipedia'
import { CONNECTION_LABELS } from '@/lib/types'
import type { Sage, Locale } from '@/lib/types'

export interface SageContext {
  sage: Sage
  connections: Array<{ type: string; name: string }>
  researchExcerpt?: string
  sefariaTopic: SefariaTopic | null
  wikipediaExtract: string | null
}

export interface RagContext {
  question: string
  matchedSages: SageContext[]
  /** True when nothing in the question matched a known sage — the caller
   *  should have the LLM say so rather than answering from general
   *  knowledge (the whole point of this system is grounded RAG, not a
   *  general-purpose chatbot). */
  noMatch: boolean
}

const MAX_SAGES_PER_QUESTION = 3
const RESEARCH_EXCERPT_CHARS = 3000

async function buildSageContext(sage: Sage, locale: Locale): Promise<SageContext> {
  const connections = getSageConnections(sage.id).map(c => ({
    type: CONNECTION_LABELS[c.type]?.[locale] ?? c.type,
    name: c.otherSage.label,
  }))

  const [docs, sefariaTopic, wikipediaSummary] = await Promise.all([
    getResearchDocs(sage.id, locale),
    fetchSefariaTopic(sage.name_en ?? sage.label).catch(() => null),
    fetchWikipediaSummary(sage.label, sage.name_en).catch(() => null),
  ])

  const researchExcerpt = docs[0]?.content?.slice(0, RESEARCH_EXCERPT_CHARS)

  return {
    sage,
    connections,
    researchExcerpt,
    sefariaTopic,
    wikipediaExtract: wikipediaSummary?.extract ?? null,
  }
}

export async function buildRagContext(question: string, locale: Locale = 'he'): Promise<RagContext> {
  const allSages = getAllSages()
  const mentioned = extractMentionedSages(question, allSages).slice(0, MAX_SAGES_PER_QUESTION)

  if (mentioned.length === 0) {
    return { question, matchedSages: [], noMatch: true }
  }

  const matchedSages = await Promise.all(
    mentioned.map(m => buildSageContext(m.sage, locale)),
  )

  return { question, matchedSages, noMatch: false }
}

/** Render the gathered context as plain text for the LLM system/user prompt
 *  (Stage 3). Kept separate from buildRagContext so the raw structured data
 *  is also available for logging/debugging without re-formatting it. */
export function formatContextForPrompt(context: RagContext): string {
  if (context.noMatch) {
    return 'לא זוהה שום חכם מזוהה בשאלה. אין מידע רלוונטי במאגר.'
  }

  return context.matchedSages.map(sc => {
    const parts = [`## ${sc.sage.label}${sc.sage.name_en ? ` (${sc.sage.name_en})` : ''}`]
    if (sc.sage.bio) parts.push(`ביוגרפיה: ${sc.sage.bio}`)
    if (sc.sage.core_concept) parts.push(`רעיון מרכזי: ${sc.sage.core_concept}`)
    if (sc.connections.length) {
      parts.push(`קשרים: ${sc.connections.map(c => `${c.name} (${c.type})`).join(', ')}`)
    }
    if (sc.researchExcerpt) parts.push(`מתוך מחקר מעמיק:\n${sc.researchExcerpt}`)
    if (sc.sefariaTopic?.description) parts.push(`ספריא: ${sc.sefariaTopic.description}`)
    if (sc.sefariaTopic?.refs.length) parts.push(`מקורות בספריא: ${sc.sefariaTopic.refs.join(', ')}`)
    if (sc.wikipediaExtract) parts.push(`ויקיפדיה: ${sc.wikipediaExtract}`)
    return parts.join('\n')
  }).join('\n\n---\n\n')
}
