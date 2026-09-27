// "שאלו על החכם": the pieces the chat widget shares with the buttons that
// open it. A button anywhere on the page calls askAboutSage(subject); the one
// ChatWidget on that page listens, opens and scopes itself to the sage.
// Everything here is pure except the two event helpers, so the question
// generator and the answer parser can be checked from a plain tsx script.
import type { Locale, Period } from '@/lib/types'
import { ERA_LABELS } from '@/lib/types'
import type { RelationGroup } from '@/components/sages/relations'

/** What the chat needs to know about the sage it is scoped to. No API call. */
export interface AskSubject {
  id: string
  /** The display name in the page's locale (lib/displayName). */
  name: string
  period: Period
  field?: string
  coreConcept?: string
  hasResearch: boolean
  /** A few related sages, most relevant relation first (relations.ts order). */
  related: Array<{ group: RelationGroup; name: string }>
}

const ASK_EVENT = 'ozar:ask-sage'

/** Open the page's chat, scoped to `subject`. */
export function askAboutSage(subject: AskSubject) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<AskSubject>(ASK_EVENT, { detail: subject }))
}

/** Subscribe to askAboutSage calls. Returns the unsubscribe function. */
export function onAskAboutSage(handler: (subject: AskSubject) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<AskSubject>).detail)
  window.addEventListener(ASK_EVENT, listener)
  return () => window.removeEventListener(ASK_EVENT, listener)
}

/** The related sage a pair question is about: lineage first, then influence, then the rest. */
const PAIR_ORDER: RelationGroup[] = [
  'teachers', 'students', 'influencedBy', 'influenced', 'disputed', 'disputedBy', 'predecessors', 'successors', 'family', 'peers',
]

const BIBLICAL: Period[] = ['patriarchs', 'exodus', 'judges', 'kings']

/** The first entry of a field list ("תלמוד, הלכה, קבלה" → "תלמוד"), if short enough to quote. */
function leadField(field: string | undefined): string | null {
  const first = field?.split(/[,،;/|]| ו(?=\S)/)[0]?.trim()
  return first && first.length <= 28 ? first : null
}

/**
 * Three or four starter questions for one sage, built from the data it
 * actually has: a named relation, the core idea, the research, the field or
 * the era. Each names the sage, so it still resolves if the scope is dropped.
 * Hebrew and Russian avoid gendered verbs and possessives: the corpus
 * includes women (שרה, ברוריה, דבורה).
 */
export function starterQuestions(s: AskSubject, locale: Locale): string[] {
  const n = s.name
  const pick = (he: string, en: string, ru: string) => (locale === 'he' ? he : locale === 'ru' ? ru : en)
  const out: string[] = []

  const pair = PAIR_ORDER.map(g => s.related.find(r => r.group === g)).find(Boolean)
  if (pair) {
    out.push(pick(
      `מה הקשר בין ${n} לבין ${pair.name}?`,
      `How are ${n} and ${pair.name} connected?`,
      `${n} и ${pair.name}: что их связывает?`,
    ))
  }
  if (s.coreConcept) {
    out.push(pick(
      `מהו הרעיון המרכזי המזוהה עם ${n}?`,
      `What is the central idea associated with ${n}?`,
      `${n}: в чём главная идея?`,
    ))
  }
  if (s.hasResearch) {
    out.push(pick(
      `מה עולה מהמחקר על ${n}?`,
      `What does the research on ${n} show?`,
      `${n}: что показывает исследование?`,
    ))
  }
  const field = BIBLICAL.includes(s.period) ? null : leadField(s.field)
  if (field) {
    out.push(pick(
      `מה הייתה התרומה של ${n} ל${field}?`,
      `What did ${n} contribute to ${field}?`,
      `${n}: каков вклад в область «${field}»?`,
    ))
  }
  const era = ERA_LABELS[s.period]?.[locale]
  out.push(pick(
    `מה היה ההקשר ההיסטורי של ${n}?`,
    `What was the historical setting of ${n}${era ? ` (${era})` : ''}?`,
    `${n}: каков исторический контекст${era ? ` (эпоха: ${era})` : ''}?`,
  ))
  out.push(pick(
    `מה ידוע על ${n} מן המקורות?`,
    `What do the sources tell us about ${n}?`,
    `${n}: что известно из источников?`,
  ))
  return [...new Set(out)].slice(0, 4)
}

// ── Answers and their citations ─────────────────────────────────────────────

/** One entry of the route's `citations` array (lib/rag/citations.ts::CitationPayload). */
export interface Citation {
  id: string
  sageId: string
  sageLabel: string
  docIndex?: number
  docTitle: string
  section?: string | null
  anchor?: string | null
}

export type AnswerSegment =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  /** `n` numbers the source in order of first mention, 1-based. */
  | { kind: 'cite'; n: number; citation: Citation }

export interface ParsedAnswer {
  segments: AnswerSegment[]
  /** The cited sources, in the order their numbers were given. */
  sources: Array<{ n: number; citation: Citation }>
}

/** "[R539:0#12]" or "[R539:0#12, R539:1#3]". Sage ids are not always numeric. */
const HANDLE = /R[^\s[\]:#,;]+:\d+#\d+/g
const CITE_GROUP = /\[\s*(R[^\s[\]:#,;]+:\d+#\d+(?:\s*[,;]\s*R[^\s[\]:#,;]+:\d+#\d+)*)\s*\]/g
const STRONG = /\*\*(?=\S)([^*\n]{1,300}?)\*\*/g

/**
 * Split an answer into text, bold runs and citation markers. A handle that is
 * not among `citations` (the model cited something it was not given) is
 * dropped rather than shown as a source we cannot back.
 */
export function parseAnswer(text: string, citations: Citation[] = []): ParsedAnswer {
  const byId = new Map(citations.map(c => [c.id, c]))
  const numbers = new Map<string, number>()
  const sources: ParsedAnswer['sources'] = []
  const segments: AnswerSegment[] = []

  const pushText = (chunk: string) => {
    if (!chunk) return
    let last = 0
    for (const m of chunk.matchAll(STRONG)) {
      if (m.index! > last) segments.push({ kind: 'text', text: chunk.slice(last, m.index) })
      segments.push({ kind: 'strong', text: m[1] })
      last = m.index! + m[0].length
    }
    if (last < chunk.length) segments.push({ kind: 'text', text: chunk.slice(last) })
  }

  let last = 0
  let pending = ''
  for (const m of text.matchAll(CITE_GROUP)) {
    const before = pending + text.slice(last, m.index)
    last = m.index! + m[0].length
    const cites = (m[1].match(HANDLE) ?? []).map(h => ({ h, c: byId.get(h) })).filter(x => x.c)
    if (cites.length === 0) {
      // Nothing to show: drop the marker and the space in front of it, so
      // "claim [R9:0#1]." reads "claim.".
      pending = before.replace(/[ \t]+$/, '')
      continue
    }
    pending = ''
    // The marker sits against its word, like a footnote: "claim¹." not "claim ¹ .".
    pushText(before.replace(/[ \t]+$/, ''))
    for (const { h, c } of cites) {
      let n = numbers.get(h)
      if (n === undefined) {
        n = numbers.size + 1
        numbers.set(h, n)
        sources.push({ n, citation: c! })
      }
      segments.push({ kind: 'cite', n, citation: c! })
    }
  }
  pushText(pending + text.slice(last))
  return { segments, sources }
}
