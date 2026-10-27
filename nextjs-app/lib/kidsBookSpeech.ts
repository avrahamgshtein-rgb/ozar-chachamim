// "Read the book aloud": what the browser's own voice reads of a part of the children's books, and in what
// pieces. Pure (no dataset, no DOM), so the reader's player (components/kids/reader) and the tests share it.
// The sibling of lib/speech.ts, which does the same for the research papers and whose sentence cutting and
// voice languages it reuses.
//
// What is read: the part's heading (kick + title, then the subtitle), headings, paragraphs, the verse on the
// door with its source, the meeting's key (title, text, verse, source), the rows of the travel card, the game
// and task box (title, introduction and each item) and the glossary entries. Not read: pictures, separators,
// the map's links and journey, the timeline, the passport's stamps (a column of places and dates is noise
// aloud), and a placeholder (an unfilled field of the book).
//
// `target` is the `data-speak` value of the element the page lights up while the piece is read, as in the
// research reader: 'title' for the part's heading (kick, h1 and subtitle together, one element); '<n>' for the
// element of block n (a heading, paragraph, quote, the key box, and the title and introduction of an activity);
// '<n>.<i>' for item i of block n (a card row, an activity item, a glossary entry). A block that is read has
// an element with that value; the container of a list carries none.
//
// The text is the book's own, with the site's Hebrew punctuation (`bookMarks`: המהר"ל is read and shown as
// המהר״ל), the middle dots of the card's lines turned into commas, and a full stop after a piece that has none
// where it is followed by another (the voice pauses at it). The words themselves are never changed.
import { bookMarks } from './hebrewMarks'
import type { Part } from './kidsBookTypes'
import { splitSentences, VOICE_LANGS, type SpeechLang } from './speech'

export interface BookSpeechItem {
  /** `data-speak` of the element to light up: 'title', '<blockIndex>' or '<blockIndex>.<itemIndex>'. */
  target: string
  text: string
}

/** The books are in Hebrew. */
export const BOOK_SPEECH_LANG: SpeechLang = 'he'
/** The BCP 47 tags a voice for them may carry ('iw' is the old code for Hebrew, still used by some voices). */
export const BOOK_VOICE_LANGS: string[] = VOICE_LANGS[BOOK_SPEECH_LANG]

/** Browsers cut a long utterance short, so a piece is at most this many characters (as lib/speech.ts). */
export const BOOK_SPEECH_MAX = 240

const ENDS_IN_STOP = /[.!?:;,…׃][\s"'”»)\]׳]*$/

const clean = (s: string): string => bookMarks(s).replace(/\s*·\s*/g, ', ').replace(/\s+/g, ' ').trim()

/** Pieces of one line of speech: each but the last gets `stop` when it ends without a stop of its own. */
function join(pieces: Array<string | undefined>, stop: string): string {
  const parts = pieces.map(p => clean(p ?? '')).filter(Boolean)
  return parts.map((p, i) => (i < parts.length - 1 && !ENDS_IN_STOP.test(p) ? p + stop : p)).join(' ')
}

/** Everything the voice reads of this part, in reading order. */
export function bookSpeechItems(part: Part): BookSpeechItem[] {
  const items: BookSpeechItem[] = []
  const add = (target: string, text: string) => {
    if (!/[\p{L}\p{N}]/u.test(text)) return
    for (const s of splitSentences(text, BOOK_SPEECH_MAX)) items.push({ target, text: s })
  }

  add('title', join([part.kick, part.title], '.'))
  add('title', join([part.subtitle], '.'))

  part.blocks.forEach((b, bi) => {
    const at = String(bi)
    switch (b.t) {
      case 'h':
        add(at, join([b.text], '.'))
        break
      case 'p':
        if (!b.placeholder) add(at, join([b.text], '.'))
        break
      case 'quote':
        add(at, join([b.text, b.source], '.'))
        break
      case 'key':
        add(at, join([b.title, b.text, b.verse, b.source], '.'))
        break
      case 'card':
        b.rows.forEach((r, ri) => add(`${at}.${ri}`, join([r.label, r.text], ':')))
        break
      case 'activity':
        add(at, join([b.title, b.intro?.text], '.'))
        b.items.forEach((it, ii) => add(`${at}.${ii}`, join([it.text], '.')))
        break
      case 'glossary':
        b.items.forEach((it, ii) => add(`${at}.${ii}`, join([it.term, it.text, it.idea], ':')))
        break
      default:
        // img, sep, links, journey, timeline, stamps: not read
        break
    }
  })
  return items
}
