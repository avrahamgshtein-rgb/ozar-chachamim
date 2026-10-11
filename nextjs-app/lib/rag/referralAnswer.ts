// The automatic answer: what the assistant says when there is no language model to ask (no API
// key, the provider is down, the quota store is unreachable). It does not pretend to be the model
// and it does not apologise: it names the sage the question is about, says in a sentence who he is,
// and sends the reader on to where the full answer lives, the sage's page, the research, the
// podcast episode, the video, the writings and the related sages. It writes nothing of its own:
// the sentence is the dataset's own summary, and the one research passage closest to the question
// rides along as a citation handle, which the chat widget numbers and links to its heading.
//
// Pure and server-safe: no I/O, no React.
import type { Locale, Sage } from '@/lib/types'
import { displayName } from '@/lib/displayName'
import { localizeSage, overlayEntry } from '@/lib/serverDataTranslator'
import { getSefaria } from '@/lib/sefaria'
import { wikiLinks } from '@/lib/wikipedia'
import { sageVideos } from '@/lib/youtube'
import type { RagContext, SageContext } from './buildContext'

const MAX_SUMMARY_CHARS = 230
const MAX_SAGES = 2
const MAX_RELATED = 3

/** One place the reader can go on to. `href` is on this site, in the question's locale. */
export interface ReferralLink {
  kind: 'page' | 'research' | 'listen' | 'video' | 'writings' | 'related'
  label: string
  href: string
}

export interface ReferralAnswer {
  /** Markdown-lite for the chat widget: **bold** and citation handles, nothing else. */
  text: string
  links: ReferralLink[]
}

const tr = (locale: Locale, he: string, en: string, ru: string) => (locale === 'he' ? he : locale === 'ru' ? ru : en)

const COPY = {
  noMatch: {
    he: 'לא זיהיתי באיזה חכם מדובר. אפשר לכתוב את שם החכם בשורת החיפוש כדי לפתוח את דפו, או לעיין בגרף, במפה ובציר הזמן.',
    en: 'I could not tell which sage you mean. Type the sage’s name in the search box to open his page, or browse the graph, the map and the timeline.',
    ru: 'Не удалось понять, о каком мудреце речь. Введите имя мудреца в строке поиска, чтобы открыть его страницу, или просмотрите граф, карту и временную шкалу.',
  },
  ambiguous: {
    he: 'השם בשאלה מתאים לכמה חכמים. אלה דפיהם:',
    en: 'The name in your question fits several sages. Their pages:',
    ru: 'Имя в вопросе подходит нескольким мудрецам. Их страницы:',
  },
} satisfies Record<string, Record<Locale, string>>

/** A passage or summary as one readable line: no headings, link markers or line breaks, cut at a sentence end. */
export function quoteOf(text: string, max = MAX_SUMMARY_CHARS): string {
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

const nameOf = (sage: Sage, locale: Locale) => displayName(localizeSage(sage, locale).label)
const pageOf = (id: string, locale: Locale) => `/${locale}/sage/${encodeURIComponent(id)}`

/** The sage's own page and what that page holds for him: only the sections that exist. */
function linksFor(sc: SageContext, locale: Locale): ReferralLink[] {
  const { sage } = sc
  const page = pageOf(sage.id, locale)
  const out: ReferralLink[] = [{ kind: 'page', label: tr(locale, 'דף החכם', 'Sage page', 'Страница мудреца'), href: page }]
  if (sage.has_research) {
    out.push({ kind: 'research', label: tr(locale, 'המחקר המלא', 'Full research', 'Полное исследование'), href: `${page}#research` })
  }
  if (sage.spotify_url) {
    out.push({ kind: 'listen', label: tr(locale, 'האזנה לפרק', 'Listen to the episode', 'Слушать выпуск'), href: `${page}#listen` })
  }
  if (sageVideos(sage.id, locale).length > 0) {
    out.push({ kind: 'video', label: tr(locale, 'סרטון', 'Video', 'Видео'), href: `${page}#video` })
  }
  const sefaria = getSefaria(sage.id)
  if (sefaria || wikiLinks(sage.id, sefaria).wikisource) {
    out.push({ kind: 'writings', label: tr(locale, 'כתבים', 'Writings', 'Труды'), href: `${page}#writings` })
  }
  for (const p of sc.relations[0]?.people.slice(0, MAX_RELATED) ?? []) {
    out.push({ kind: 'related', label: overlayEntry(p.id, locale)?.label ?? p.name, href: pageOf(p.id, locale) })
  }
  return out
}

/** The referral for `context`, in `locale`. Citation handles are exactly those of `context.passages`. */
export function referralAnswer(context: RagContext, locale: Locale): ReferralAnswer {
  if (context.noMatch) {
    if (context.ambiguous.length > 0) {
      const seen = new Set<string>()
      const links: ReferralLink[] = []
      for (const a of context.ambiguous) {
        for (const c of a.candidates.slice(0, 4)) {
          if (seen.has(c.id)) continue
          seen.add(c.id)
          links.push({ kind: 'related', label: overlayEntry(c.id, locale)?.label ?? displayName(c.label), href: pageOf(c.id, locale) })
        }
      }
      return { text: COPY.ambiguous[locale], links }
    }
    return { text: COPY.noMatch[locale], links: [] }
  }

  const sages = context.matchedSages.slice(0, MAX_SAGES)
  if (sages.length === 0) return { text: COPY.noMatch[locale], links: [] }
  const lines: string[] = []
  for (const sc of sages) {
    const local = localizeSage(sc.sage, locale)
    const summary = quoteOf(local.bio || local.core_concept || '')
    // The research passage closest to the question, from this sage only: one numbered source, not a quote.
    const passage = context.passages.find(p => p.sourceKind === 'research' && p.sageId === sc.sage.id)
    const head = `**${nameOf(sc.sage, locale)}**`
    lines.push([summary ? `${head} — ${summary}` : head, passage ? `[${passage.citationId}]` : ''].filter(Boolean).join(' '))
  }

  const links = linksFor(sages[0], locale)
  for (const sc of sages.slice(1)) {
    links.push({ kind: 'page', label: nameOf(sc.sage, locale), href: pageOf(sc.sage.id, locale) })
  }
  return { text: lines.join('\n\n'), links }
}
