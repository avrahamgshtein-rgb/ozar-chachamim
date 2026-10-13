// "Listen to the research": what the browser's own voice reads aloud, in what order and language.
// Pure, so the reader (components/sages/ListenResearch.tsx) and the tests share it.
//
// The voice reads the document's title, headings, paragraphs, quotes and list items, in order. It
// skips citation markers, bare URLs, tables (a row read aloud is noise) and the sources list. Long
// paragraphs are cut into sentences, because some browsers stop a single utterance after about
// fifteen seconds, and so pausing loses at most one sentence.
import { tokenizeInline, type ParsedResearchDoc } from './researchParse'

export type SpeechLang = 'he' | 'en' | 'ru'

export interface SpeechItem {
  /** Index of the document on the page (its article is `#doc-<n+1>`). */
  doc: number
  /** `data-speak` of the element to light up ("12", "12.3" for a list item); 'title' for the document's title. */
  target: string
  lang: SpeechLang
  text: string
}

/** BCP 47 tags a voice may carry for each language ('iw' is the old code for Hebrew, still used by some voices). */
export const VOICE_LANGS: Record<SpeechLang, string[]> = { he: ['he', 'iw'], en: ['en'], ru: ['ru'] }

/** The language a document is written in, judged from its letters. */
export function docLang(doc: ParsedResearchDoc): SpeechLang {
  if (doc.dir === 'rtl') return 'he'
  const sample = doc.blocks
    .map(b => ('text' in b && typeof b.text === 'string' ? b.text : ''))
    .join(' ')
    .slice(0, 4000)
  const cyr = (sample.match(/[Ѐ-ӿ]/g) ?? []).length
  const lat = (sample.match(/[A-Za-z]/g) ?? []).length
  return cyr > lat ? 'ru' : 'en'
}

/** The text as it should be heard: no citation markers, no URLs, no markdown, single spaces. */
export function speakableText(text: string): string {
  return tokenizeInline(text)
    .map(t => (t.kind === 'text' ? t.text : t.kind === 'strong' ? t.inner : ' '))
    .join('')
    .replace(/[*_#`|]+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cut text into sentences of at most about `max` characters (a longer sentence is cut at a comma or a space). */
export function splitSentences(text: string, max = 240): string[] {
  const sentences = text.match(/[^.!?׃]+(?:[.!?׃]+["'”»)\]]*|$)\s*/g) ?? [text]
  const out: string[] = []
  let current = ''
  const push = (s: string) => { const t = s.trim(); if (t) out.push(t) }
  for (const raw of sentences) {
    const s = raw.trim()
    if (!s) continue
    if (s.length > max) {
      push(current); current = ''
      let rest = s
      while (rest.length > max) {
        const window = rest.slice(0, max)
        const cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '), window.lastIndexOf(' – '))
        const at = cut > max * 0.4 ? cut + 1 : window.lastIndexOf(' ') > 0 ? window.lastIndexOf(' ') : max
        push(rest.slice(0, at))
        rest = rest.slice(at)
      }
      current = rest.trim()
      continue
    }
    if ((current + ' ' + s).trim().length > max) { push(current); current = s }
    else current = (current + ' ' + s).trim()
  }
  push(current)
  return out
}

/** Everything the voice reads for these documents, in reading order. */
export function speechItems(docs: ParsedResearchDoc[], titles: string[] = []): SpeechItem[] {
  const items: SpeechItem[] = []
  docs.forEach((doc, di) => {
    const lang = docLang(doc)
    const add = (target: string, raw: string) => {
      const text = speakableText(raw)
      if (!/[\p{L}\p{N}]/u.test(text)) return
      for (const s of splitSentences(text)) items.push({ doc: di, target, lang, text: s })
    }
    const title = titles[di] ?? doc.title
    if (title) add('title', title)
    doc.blocks.forEach((b, bi) => {
      switch (b.kind) {
        case 'heading':
        case 'paragraph':
        case 'quote':
          add(String(bi), b.text)
          break
        case 'list':
          b.items.forEach((it, ii) => add(`${bi}.${ii}`, it.text))
          break
        default:
          // title (shown once in the header, read above), table, separator, bibliography: not read
          break
      }
    })
  })
  return items
}
