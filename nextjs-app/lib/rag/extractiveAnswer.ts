// The automatic answer: what the assistant says when there is no language model to ask (no API
// key, the provider is down, the quota store is unreachable) or when a visitor just wants the
// sources. It writes nothing of its own: it quotes the research passages that retrieval ranked
// closest to the question, each with its citation handle, and falls back to the dataset's own
// summary of the sage. The chat widget already turns "[R3:2#4]" handles into numbered sources
// that link to the page's text, so this text is shown exactly like a model's answer.
//
// Pure and server-safe: no I/O, no React.
import type { Locale, Sage } from '@/lib/types'
import { displayName } from '@/lib/displayName'
import { localizeSage, overlayEntry } from '@/lib/serverDataTranslator'
import type { RagContext } from './buildContext'
import type { CitedPassage } from './citations'

const MAX_QUOTES = 3
const MAX_QUOTE_CHARS = 380
const MAX_SUMMARY_CHARS = 420

const COPY = {
  intro: {
    he: 'זו תשובה אוטומטית: הקטעים מהמחקר שהכי קרובים לשאלה.',
    en: 'This is an automatic answer: the passages from the research closest to your question.',
    ru: 'Это автоматический ответ: отрывки из исследования, ближе всего к вопросу.',
  },
  summaryIntro: {
    he: 'לא מצאתי במחקר קטע שעונה ישירות על השאלה. זה מה שהמאגר מספר על',
    en: 'I found no passage in the research that answers the question directly. This is what the dataset says about',
    ru: 'В исследовании нет отрывка, который прямо отвечает на вопрос. Вот что сказано в базе о',
  },
  noMatch: {
    he: 'לא זיהיתי באיזה חכם מדובר. נסו לכתוב את שם החכם, למשל: «מי היה רש״י?»',
    en: 'I could not tell which sage you mean. Try writing the sage’s name, for example: “Who was Rashi?”',
    ru: 'Не удалось понять, о каком мудреце речь. Напишите имя мудреца, например: «Кто такой Раши?»',
  },
  ambiguous: {
    he: 'השם בשאלה מתאים לכמה חכמים. למי הכוונה?',
    en: 'The name in your question fits several sages. Which one do you mean?',
    ru: 'Имя в вопросе подходит нескольким мудрецам. Кого вы имеете в виду?',
  },
  related: { he: 'ראו גם', en: 'See also', ru: 'См. также' },
  outro: {
    he: 'לקריאה מלאה, פתחו את דף החכם.',
    en: 'For the full text, open the sage’s page.',
    ru: 'Полный текст — на странице мудреца.',
  },
} satisfies Record<string, Record<Locale, string>>

/** A passage as one readable quote: no headings, link markers or line breaks, cut at a sentence end. */
export function quoteOf(text: string, max = MAX_QUOTE_CHARS): string {
  const flat = text
    .replace(/^\s*#{1,6}\s+.*$/gm, ' ')           // markdown headings
    .replace(/\[\^?\d+\]/g, '')                    // footnote markers [1] [^1]
    .replace(/\s*\[cite:[^\]]*\]/gi, '')           // citation markers the research files carry: [cite: 1, 3]
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')           // bold would collide with the answer's own
    .replace(/[*_`>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  // End at the last sentence mark in the second half of the window; else at a word.
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '), cut.lastIndexOf('׃ '))
  if (end > max * 0.5) return `${cut.slice(0, end + 1)} …`
  return `${cut.slice(0, cut.lastIndexOf(' '))} …`
}

/** Up to MAX_QUOTES passages of the research, best first, at most two from one document. */
function pickQuotes(passages: CitedPassage[]): CitedPassage[] {
  const perDoc = new Map<string, number>()
  const out: CitedPassage[] = []
  for (const p of passages) {
    if (p.sourceKind !== 'research') continue
    const key = `${p.sageId}:${p.docIndex}`
    if ((perDoc.get(key) ?? 0) >= 2) continue
    perDoc.set(key, (perDoc.get(key) ?? 0) + 1)
    out.push(p)
    if (out.length >= MAX_QUOTES) break
  }
  return out
}

/** The answer text for `context`, in `locale`. Citation handles are exactly those of `context.passages`. */
export function extractiveAnswer(context: RagContext, locale: Locale): string {
  if (context.noMatch) {
    if (context.ambiguous.length > 0) {
      const lines = context.ambiguous.flatMap(a => a.candidates.slice(0, 4).map(c => `- ${displayName(c.label)}`))
      return [COPY.ambiguous[locale], '', ...lines].join('\n')
    }
    return COPY.noMatch[locale]
  }

  // The sage's name and summary in the question's language where the overlay has them.
  const nameOf = (sage: Sage) => displayName(localizeSage(sage, locale).label)
  const matched = new Map(context.matchedSages.map(sc => [sc.sage.id, sc.sage]))

  const quotes = pickQuotes(context.passages)
  const lines: string[] = []

  if (quotes.length > 0) {
    lines.push(COPY.intro[locale], '')
    for (const p of quotes) {
      const sage = matched.get(p.sageId)
      lines.push(`**${sage ? nameOf(sage) : displayName(p.sageLabel)}**: «${quoteOf(p.text)}» [${p.citationId}]`, '')
    }
  } else {
    // Sages were identified but no passage cleared the bar: say what the dataset holds.
    const local = localizeSage(context.matchedSages[0].sage, locale)
    const summary = quoteOf(local.bio || local.core_concept || '', MAX_SUMMARY_CHARS)
    lines.push(`${COPY.summaryIntro[locale]} **${displayName(local.label)}**:`, '')
    lines.push(summary ? `«${summary}»` : '…', '')
  }

  const related = context.matchedSages[0]?.relations[0]?.people.slice(0, 4)
    .map(p => overlayEntry(p.id, locale)?.label ?? p.name) ?? []
  if (related.length > 0) lines.push(`${COPY.related[locale]}: ${related.join(', ')}`, '')
  lines.push(COPY.outro[locale])
  return lines.join('\n').trim()
}
