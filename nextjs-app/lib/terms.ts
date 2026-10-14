// A sage's field ("הלכה, קבלה ומוסר") and place ("פאס; חברון; ירושלים") in the reader's language, for
// display only. The data keeps them in Hebrew on purpose: regions, map coordinates, the place index,
// filters and search all read the Hebrew text (lib/regions.ts, lib/locationCoords.ts …), so a
// translation is shown beside them (`field_label`, `location_label`), never written over them.
//
// The text is built from a small vocabulary (public/i18n/terms.<locale>.json): a phrase is split at
// its separators (; , / → – and brackets) and at the conjunction ו ("הלכה ומנהג" → "halakha and
// custom"), each piece is looked up, and the separators are kept. A whole phrase in the dictionary
// wins over its pieces. A phrase with any unknown piece gets no translation at all, so a page never
// shows half Hebrew, half English; tests/terms.test.ts lists what is missing.

/** Hebrew piece or whole phrase → its translation. */
export type TermDict = Record<string, string>

const SEPARATORS = /(\s*;\s*|\s*,\s*|\s*\/\s*|\s*→\s*|\s+[-–—]\s+|\s*[–—]\s*|\s*\(\s*|\s*\)\s*)/
const SHOWN: Array<[RegExp, string]> = [
  [/^\s*;\s*$/, '; '], [/^\s*,\s*$/, ', '], [/^\s*\/\s*$/, ' / '], [/^\s*→\s*$/, ' → '],
  [/^\s+[-–—]\s+$/, ' – '], [/^\s*[–—]\s*$/, '–'], [/^\s*\(\s*$/, ' ('], [/^\s*\)\s*$/, ') '],
]
// "A וB": a word that begins with the conjunction, after a space
const CONJUNCTION = /\s+ו(?=[א-ת])/

function pieces(text: string): Array<{ sep: string } | { words: string[] }> {
  return text.split(SEPARATORS).filter(p => p !== '').map(p => {
    if (SEPARATORS.test(p) && p.match(SEPARATORS)?.[0] === p) return { sep: p }
    return { words: p.trim().split(CONJUNCTION).map(w => w.trim()).filter(Boolean) }
  })
}

/** The vocabulary a phrase needs: its pieces between separators and conjunctions. */
export function termAtoms(text: string): string[] {
  return pieces(text.trim()).flatMap(p => ('words' in p ? p.words : []))
}

/**
 * `text` in the dictionary's language, or null when any piece of it is unknown. `and` is the
 * language's conjunction ("and", "и").
 */
export function translateTerm(text: string | undefined, dict: TermDict | null | undefined, and: string): string | null {
  const t = text?.trim()
  if (!t || !dict) return null
  if (dict[t]) return capitalised(dict[t])
  let out = ''
  for (const p of pieces(t)) {
    if ('sep' in p) {
      out += SHOWN.find(([re]) => re.test(p.sep))?.[1] ?? p.sep
      continue
    }
    if (dict[p.words.join(' ו')]) { out += dict[p.words.join(' ו')]; continue }
    const words = p.words.map(w => dict[w])
    if (words.some(w => !w)) return null
    out += words.length > 1 ? `${words.slice(0, -1).join(', ')} ${and} ${words[words.length - 1]}` : words[0]
  }
  // a closing bracket keeps a space only before a word: "Mainz (Mainz) Worms", "Italy (Rome), Spain"
  const shown = out.replace(/\)\s+(?=[,;/→–)]|$)/g, ')').replace(/\s{2,}/g, ' ').trim()
  return shown ? capitalised(shown) : null
}

// it opens a line or a chip on the page: "Halakha, Kabbalah and ethics", "The Land of Israel"
const capitalised = (s: string) => s[0].toUpperCase() + s.slice(1)

export const CONJUNCTION_WORD = { en: 'and', ru: 'и' } as const
