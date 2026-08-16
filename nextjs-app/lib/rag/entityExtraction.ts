// RAG Stage 2 — entity extraction: find which sages a free-text question
// mentions, so the retrieval step only pulls context for relevant people
// instead of the entire dataset.
import type { Sage } from '@/lib/types'
import { normalizeHe } from '@/lib/search'

// Generic title/kinship/grammar words that are too common to count as a
// name match on their own (e.g. "רבי" alone would "match" almost every
// sage; "בין" is just the word "between", not part of anyone's name).
const STOPWORDS = new Set(
  ['רבי', 'רב', 'הרב', 'רבן', 'רבנו', 'רבינו', 'הרבי', 'בן', 'בר', 'בת',
   'אבן', 'דון', 'חכם', 'הרה"ג', 'הגאון', 'האדמו"ר', 'מרן', 'של', 'עם',
   'מה', 'מי', 'איך', 'למה', 'האם', 'מתי', 'בין', 'זה', 'היה', 'הוא',
   'רבי\'', 'הכהן', 'הלוי'].map(normalizeHe),
)

// Max number of distinct sages a single token may appear in before it's
// considered too common to be a distinguishing name match on its own
// (e.g. "יוסף" appears in dozens of labels — matching on it alone would
// flag half the corpus as "mentioned").
const MAX_TOKEN_SAGE_COUNT = 2

/** Split a sage label into candidate aliases: the full name plus anything
 *  in parentheses (labels commonly carry an acronym/nickname there, e.g.
 *  "רבי משה חיים לוצאטו (הרמח"ל)" → also match on "הרמח"ל" alone). */
function aliasesOf(label: string): string[] {
  const aliases = [label]
  const parenMatch = label.match(/\(([^)]+)\)/)
  if (parenMatch) aliases.push(parenMatch[1])
  const withoutParen = label.replace(/\([^)]*\)/g, '').trim()
  if (withoutParen && withoutParen !== label) aliases.push(withoutParen)
  return aliases
}

export interface EntityMatch {
  sage: Sage
  matchedAlias: string
}

/**
 * Find sages mentioned in a question. Two passes:
 *  1. Substring match of a full alias (label, name_en, or parenthetical
 *     nickname) against the normalized question — high precision.
 *  2. Fallback: a single non-stopword token (≥3 chars) from the label that
 *     appears as a whole word in the question — catches "מה רמב"ם אמר על..."
 *     style phrasing without the full title.
 */
export function extractMentionedSages(question: string, allSages: Sage[]): EntityMatch[] {
  const q = normalizeHe(question)
  if (!q) return []

  const matches: EntityMatch[] = []
  const matchedIds = new Set<string>()

  // Pass 1: full-alias substring match
  for (const sage of allSages) {
    const aliases = [...aliasesOf(sage.label), ...(sage.name_en ? [sage.name_en] : [])]
    for (const alias of aliases) {
      const normAlias = normalizeHe(alias)
      if (normAlias.length >= 2 && q.includes(normAlias)) {
        matches.push({ sage, matchedAlias: alias })
        matchedIds.add(sage.id)
        break
      }
    }
  }

  // Pass 2: distinctive single-token fallback (only for sages not already
  // matched). A token only counts if it's rare across the whole corpus —
  // otherwise a common first name like "יוסף" would flag dozens of sages.
  const tokensBySageId = new Map<string, string[]>()
  const tokenSageCount = new Map<string, number>()
  for (const sage of allSages) {
    const tokens = [...new Set(
      normalizeHe(sage.label).split(' ').filter(t => t.length >= 3 && !STOPWORDS.has(t)),
    )]
    tokensBySageId.set(sage.id, tokens)
    for (const t of tokens) tokenSageCount.set(t, (tokenSageCount.get(t) ?? 0) + 1)
  }

  const qWords = new Set(q.split(' ').filter(Boolean))
  for (const sage of allSages) {
    if (matchedIds.has(sage.id)) continue
    const tokens = tokensBySageId.get(sage.id) ?? []
    const hit = tokens.find(t => qWords.has(t) && (tokenSageCount.get(t) ?? 0) <= MAX_TOKEN_SAGE_COUNT)
    if (hit) {
      matches.push({ sage, matchedAlias: hit })
      matchedIds.add(sage.id)
    }
  }

  return matches
}
