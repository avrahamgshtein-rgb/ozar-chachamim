// The site's rule for Hebrew punctuation, as a pure helper any module can share.
//
// Hebrew writes an acronym with gershayim (רמב״ם, המהר״ל) and an abbreviated letter with geresh (ד׳תש״י,
// ה׳), not with the ASCII quote and apostrophe. A text that arrives with ASCII marks (the owner's books do:
// `המהר"ל`, `ד'תש"י`) is stored exactly as written and converted only where it is shown or read aloud.
//
// The rule is the one lib/pathShare.ts::gershayim applies (kept identical on purpose, so the two can be
// merged later without a visible change):
//   - a `"` between two Hebrew letters is a gershayim: המהר"ל → המהר״ל
//   - a `'` right after a Hebrew letter is a geresh: ד'תש"י → ד׳תש״י, ה' → ה׳
// A `"` that opens or closes speech (before a letter after a space, or after punctuation) is not between
// two letters and stays as it is.
//
// Both replacements are one character for one character, so the length of the text and every offset into it
// (the marks of lib/kidsBookTypes.ts) stay valid.

/** Gershayim and geresh for ASCII quote and apostrophe marks inside Hebrew words; everything else is untouched. */
export const gershayim = (text: string): string =>
  text.replace(/(?<=[א-ת])"(?=[א-ת])/g, '״').replace(/(?<=[א-ת])'/g, '׳')

// ---- the books' quotation marks -------------------------------------------------------------------------
//
// `gershayim` above is right for names and labels, where every `'` after a letter is a geresh. The owner's
// books also use the ASCII `'` and `"` as QUOTATION marks about a word or a phrase: 'משקל יתדות ותנועות',
// ל'מעיין המתגבר', ה"יד", and for those the rule is wrong twice: it turns the closing `'` into ׳, and it
// turns the `"` that opens a quote after a one-letter prefix into ״. `bookMarks` tells the two apart. It is
// still one character for one character, so lengths and mark offsets hold, and it works on a whole field
// (the pairing of a quote can cross an emphasis mark, so never apply it to a slice).
//
// For each `'` or `"` the text holds:
//   `'` after a Hebrew letter, followed by a letter (inside a word):
//        - after a prefix cluster (one to three of בהוכלמש) that begins a word, and not a Hebrew date (a word that
//          holds a gershayim, ה'רח"ץ): an OPENING quote when a closing `'` follows within 80 characters (a `'` inside a
//          word on the way, a geresh, does not count as the closing one)
//          (ל'מעיין, כ'דוד אבזי', וב'נגיעות, ה'טיש');
//        - otherwise a geresh (מפיאסצ'נה, ד'תש"י, ג'תת"ל, ד'ס').
//   `'` after a Hebrew letter, not followed by a letter:
//        - after a one-letter word: a geresh (ה' the Name, האות מ', ה-מ', ד'ס');
//        - after the Name with a prefix (בה', לה', מה', ובה': one prefix letter and ה): a geresh, even inside an open quote;
//        - after a longer word, inside an open quote: the CLOSING quote ('משקל יתדות ותנועות');
//        - after a longer word with no quote open: a geresh (an abbreviation).
//        (A quoted word that is itself a prefix plus ה, such as 'לה', would be read as the Name: the books have none.
//        משה and בבה are not of that kind: 'דעת משה' and 'בבה' close normally.)
//   `'` elsewhere: it opens a quote, or closes the open one when no space precedes it ('...!', '...)').
//   `"` between two Hebrew letters: a gershayim (המהר"ל, תשפ"ז, ה'רח"ץ), unless a prefix cluster that begins a
//        word precedes it and a closing `"` follows within 40 characters (a gershayim on the way does not count): then
//        it OPENS a quote (ה"יד", ל"קרקור", ל"חכמת המהר"ל").
//   every other `"` is a quotation mark and stays.
export type MarkClass = 'geresh' | 'gershayim' | 'quote-open' | 'quote-close' | 'quote'
export interface ClassifiedMark { index: number; mark: "'" | '"'; cls: MarkClass }

const PREFIX_LETTERS = 'בהוכלמש'
const isLetter = (c: string | undefined): boolean => !!c && c >= 'א' && c <= 'ת'
const isNikud = (c: string | undefined): boolean => !!c && c >= '\u0591' && c <= '\u05C7'
const isSpace = (c: string | undefined): boolean => !!c && /\s/.test(c)

/** Every `'` and `"` of the text, in order, with what it is. */
export function classifyMarks(text: string): ClassifiedMark[] {
  const t = text
  const n = t.length
  const cls = new Map<number, MarkClass>()
  const out: ClassifiedMark[] = []
  let open = false // a single-quote span is open

  /** The Hebrew word (letters, nikud skipped) that ends right before index i: where it starts and its letters. */
  const runBefore = (i: number): { start: number; letters: string } => {
    let j = i - 1
    let letters = ''
    while (j >= 0 && (isLetter(t[j]) || isNikud(t[j]))) {
      if (isLetter(t[j])) letters = t[j] + letters
      j--
    }
    return { start: j + 1, letters }
  }
  const afterLetter = (i: number): boolean => {
    let j = i - 1
    while (j >= 0 && isNikud(t[j])) j--
    return j >= 0 && isLetter(t[j])
  }
  const wordStart = (s: number): boolean => {
    if (s === 0) return true
    const p = t[s - 1]
    if (isSpace(p) || '([-–—,:;!?.…'.includes(p)) return true
    if (p === "'" || p === '"') return cls.get(s - 1) === 'quote-open'
    return false
  }
  const isPrefixCluster = (letters: string, s: number): boolean =>
    letters.length >= 1 && letters.length <= 3 && [...letters].every(c => PREFIX_LETTERS.includes(c)) && wordStart(s)
  /** The Name with a prefix: בה, לה, מה, כה, שה, or ובה, ולה ... Not משה or בבה, which are words of their own. */
  const namePrefixed = (letters: string): boolean => /^ו?[בלמכש]ה$/.test(letters)
  /** Is there a closing `ch` within `window` characters after the one at i+1 (shaped like a closing mark)? */
  const closingFollows = (i: number, ch: string, window: number): boolean => {
    for (let j = i + 2; j < Math.min(n, i + 2 + window); j++) {
      if (t[j] !== ch) continue
      const pj = t[j - 1]
      if (isSpace(pj)) return false
      if (ch === '"' && isLetter(pj) && j + 1 < n && isLetter(t[j + 1])) continue // between letters: a gershayim inside the quote
      if (ch === "'" && isLetter(t[j + 1])) continue // inside a word: a geresh inside the quote
      return true
    }
    return false
  }
  const put = (index: number, mark: "'" | '"', c: MarkClass) => {
    cls.set(index, c)
    out.push({ index, mark, cls: c })
  }

  for (let i = 0; i < n; i++) {
    const ch = t[i]
    if (ch === "'") {
      if (!afterLetter(i)) {
        const p = i > 0 ? t[i - 1] : ''
        if (open && p && !isSpace(p)) { put(i, ch, 'quote-close'); open = false }
        else if (open) put(i, ch, 'quote-open')
        else { put(i, ch, 'quote-open'); open = true }
        continue
      }
      const { start, letters } = runBefore(i)
      if (isLetter(t[i + 1])) {
        if (isPrefixCluster(letters, start)) {
          const word = /^[א-ת"']*/.exec(t.slice(i + 1))![0]
          if (/[א-ת]"[א-ת]/.test(word)) put(i, ch, 'geresh') // a Hebrew date
          else if (closingFollows(i, "'", 80)) { put(i, ch, 'quote-open'); open = true }
          else put(i, ch, 'geresh')
        } else put(i, ch, 'geresh')
      } else if (letters.length === 1) put(i, ch, 'geresh')
      else if (open && !namePrefixed(letters)) { put(i, ch, 'quote-close'); open = false }
      else put(i, ch, 'geresh')
    } else if (ch === '"') {
      if (afterLetter(i) && isLetter(t[i + 1])) {
        const { start, letters } = runBefore(i)
        put(i, ch, isPrefixCluster(letters, start) && closingFollows(i, '"', 40) ? 'quote-open' : 'gershayim')
      } else put(i, ch, 'quote')
    }
  }
  return out
}

/** The books' text as the site shows and reads it: gershayim and geresh where they are one, quotation marks left alone. */
export function bookMarks(text: string): string {
  if (!text.includes("'") && !text.includes('"')) return text
  const units = text.split('') // UTF-16 units, the same indices classifyMarks reports
  for (const m of classifyMarks(text)) {
    if (m.cls === 'geresh') units[m.index] = '׳'
    else if (m.cls === 'gershayim') units[m.index] = '״'
  }
  return units.join('')
}
