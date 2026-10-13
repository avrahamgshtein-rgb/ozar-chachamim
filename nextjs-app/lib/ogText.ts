// Text for the share card (app/[locale]/sage/[id]/opengraph-image.tsx).
//
// Satori, which draws next/og images, lays every line out left to right: it has no bidirectional
// algorithm, so a Hebrew line handed to it as is comes out mirrored. The card therefore draws Hebrew
// as one box per word in a `row-reverse` wrapping row (the first word at the right edge, lines
// wrapping in the right order) and hands Satori each word already in visual order: its characters
// reversed and its brackets mirrored, except runs of digits or Latin letters, which read left to
// right inside a Hebrew line (as the Unicode algorithm does for a right-to-left paragraph).

/** A run that stays left to right: digits or letters, joined by the separators Unicode keeps inside a number. */
const LTR_RUN = /[0-9A-Za-zÀ-ɏЀ-ӿ]+(?:[.,:/+-][0-9A-Za-zÀ-ɏЀ-ӿ]+)*/g

const MIRROR: Record<string, string> = {
  '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '«': '»', '»': '«',
}

/** True when the text holds Hebrew letters, so it must be drawn right to left. */
export function isRtlText(text: string): boolean {
  return /[֐-׿]/.test(text)
}

/** One word of a right-to-left line, in the order its characters appear on screen from left to right. */
export function visualWord(word: string): string {
  const segments: { text: string; ltr: boolean }[] = []
  let last = 0
  for (const m of word.matchAll(LTR_RUN)) {
    if (m.index! > last) segments.push({ text: word.slice(last, m.index), ltr: false })
    segments.push({ text: m[0], ltr: true })
    last = m.index! + m[0].length
  }
  if (last < word.length) segments.push({ text: word.slice(last), ltr: false })
  return segments
    .reverse()
    .map(s => (s.ltr ? s.text : Array.from(s.text).reverse().map(c => MIRROR[c] ?? c).join('')))
    .join('')
}

/** The words of a right-to-left line, each in visual order, in reading order (first word first). */
export function rtlWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean).map(visualWord)
}

/** Shorten to at most `max` characters at a word boundary, with an ellipsis. */
export function clipWords(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd() + '…'
}
