// RAG Stage 2 — entity extraction: find which sages a free-text question
// mentions, so the retrieval step only pulls context for relevant people
// instead of the entire dataset.
import type { Sage } from '@/lib/types'
import { normalizeHe } from '@/lib/search'

// normalizeHe keeps punctuation, so "יעקב?" would never match the token
// "יעקב" taken from a sage label. Strip it on both sides of every comparison.
const PUNCT = /[?!.,;:()[\]{}"'`׳״־–—\-…]/g
const stripPunct = (t: string) => t.replace(PUNCT, '')

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
      normalizeHe(sage.label).split(' ').map(stripPunct).filter(t => t.length >= 3 && !STOPWORDS.has(t)),
    )]
    tokensBySageId.set(sage.id, tokens)
    for (const t of tokens) tokenSageCount.set(t, (tokenSageCount.get(t) ?? 0) + 1)
  }

  const qWords = new Set(q.split(' ').map(stripPunct).filter(Boolean))
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

/** Below this many candidates a name is distinctive enough to resolve directly. */
const AMBIGUITY_THRESHOLD = 2
/** Above this, the name is a generic word rather than a real disambiguation question. */
const AMBIGUITY_MAX_CANDIDATES = 8

export interface AmbiguousMatch {
  mention: string
  candidates: Array<{ id: string; label: string }>
}

/**
 * Names in the question that point at several sages at once.
 *
 * `extractMentionedSages` deliberately ignores non-distinctive tokens so it
 * does not flag half the corpus. That keeps precision high but means a question
 * about "רבי יעקב" silently matches nothing. This surfaces those cases so the
 * caller can ask which person was meant instead of guessing — or, worse,
 * answering about whichever sage happened to sort first.
 *
 * A name already resolved by a full-alias match is not reported: the user was
 * specific enough.
 */
export function findAmbiguousMentions(question: string, allSages: Sage[]): AmbiguousMatch[] {
  const q = normalizeHe(question)
  if (!q) return []

  const resolvedIds = new Set(extractMentionedSages(question, allSages).map(m => m.sage.id))
  const qWords = new Set(q.split(' ').map(stripPunct).filter(t => t.length >= 3 && !STOPWORDS.has(t)))
  if (qWords.size === 0) return []

  const byToken = new Map<string, Array<{ id: string; label: string }>>()
  for (const sage of allSages) {
    const tokens = new Set(
      normalizeHe(sage.label).split(' ').map(stripPunct).filter(t => t.length >= 3 && !STOPWORDS.has(t)),
    )
    for (const t of tokens) {
      if (!qWords.has(t)) continue
      const list = byToken.get(t) ?? []
      list.push({ id: sage.id, label: sage.label })
      byToken.set(t, list)
    }
  }

  const out: AmbiguousMatch[] = []
  for (const [mention, candidates] of byToken) {
    if (candidates.length <= AMBIGUITY_THRESHOLD) continue
    if (candidates.length > AMBIGUITY_MAX_CANDIDATES) continue
    // If the user already pinned one of these down precisely, it is not ambiguous.
    if (candidates.some(c => resolvedIds.has(c.id))) continue
    out.push({ mention, candidates })
  }

  return out
}
