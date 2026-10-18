import type { Region } from './types'

// ── Keyword → region mapping (shared by graph, map, filters) ──────────────
// Ported from the classic site's classifier — first match by position wins.
export const LOCATION_REGION_MAP: Array<[string, Region]> = [
  ['ירושלים', 'eretz-israel'], ['צפת', 'eretz-israel'], ['טבריה', 'eretz-israel'],
  ['ארץ ישראל', 'eretz-israel'], ['Israel', 'eretz-israel'], ['Jerusalem', 'eretz-israel'],
  ['Safed', 'eretz-israel'], ['Tiberias', 'eretz-israel'], ['Acre', 'eretz-israel'],
  ['חברון', 'eretz-israel'], ['עכו', 'eretz-israel'], ['יבנה', 'eretz-israel'],
  ['שילה', 'eretz-israel'], ['גליל', 'eretz-israel'], ['נתיבות', 'eretz-israel'],
  ['בני ברק', 'eretz-israel'], ['עזה', 'eretz-israel'],
  ['בבל', 'mizrach'], ['בגדד', 'mizrach'], ['בגדאד', 'mizrach'], ['פומבדית', 'mizrach'],
  ['סורא', 'mizrach'], ['Babylon', 'mizrach'], ['Iraq', 'mizrach'], ['Baghdad', 'mizrach'],
  ['פרס', 'mizrach'], ['Persia', 'mizrach'], ['עיראק', 'mizrach'], ['תימן', 'mizrach'],
  ['סוריה', 'mizrach'], ['דמשק', 'mizrach'], ['חלב', 'mizrach'], ['טורקי', 'mizrach'],
  ['איזמיר', 'mizrach'], ['קושטא', 'mizrach'], ['סלוניקי', 'mizrach'], ['יוון', 'mizrach'],
  ['נהרדעא', 'mizrach'],
  ['ספרד', 'sefarad'], ['קורדובה', 'sefarad'], ['טולדו', 'sefarad'], ['גרנדה', 'sefarad'],
  ['Spain', 'sefarad'], ['Cordoba', 'sefarad'], ['Toledo', 'sefarad'], ['Seville', 'sefarad'],
  ['פורטוגל', 'sefarad'], ['קטלוני', 'sefarad'], ['ברצלונה', 'sefarad'], ['גירונה', 'sefarad'],
  ['סרגוסה', 'sefarad'], ['אנדלוסי', 'sefarad'], ['ליסבון', 'sefarad'], ['אליסנה', 'sefarad'],
  ['לוסנה', 'sefarad'], ['גיברלטר', 'sefarad'], ['קסטילי', 'sefarad'],
  ['גרמניה', 'ashkenaz'], ['ורמייזא', 'ashkenaz'], ['מיינץ', 'ashkenaz'], ['שפירא', 'ashkenaz'],
  ['Germany', 'ashkenaz'], ['Worms', 'ashkenaz'], ['Mainz', 'ashkenaz'], ['Austria', 'ashkenaz'],
  ['אשכנז', 'ashkenaz'], ['וינה', 'ashkenaz'], ['פראג', 'ashkenaz'], ['רגנשבורג', 'ashkenaz'],
  ['וורמס', 'ashkenaz'], ['נוישטט', 'ashkenaz'], ['מגנצא', 'ashkenaz'], ['אוסטריה', 'ashkenaz'],
  ['בוהמי', 'ashkenaz'],
  ['צרפת', 'tsarfat'], ['פריז', 'tsarfat'], ['טרואה', 'tsarfat'],
  ['France', 'tsarfat'], ['Paris', 'tsarfat'], ['Troyes', 'tsarfat'],
  ['ויטרי', 'tsarfat'], ['שמפנ', 'tsarfat'],
  ['פרובנס', 'provence'], ['לוניל', 'provence'], ['מרסיי', 'provence'],
  ['Provence', 'provence'], ['Lunel', 'provence'],
  ['נרבונה', 'provence'], ['מונפליה', 'provence'], ['פרובאנס', 'provence'],
  ['איטליה', 'italy'], ['רומא', 'italy'], ['ונציה', 'italy'],
  ['פדובה', 'italy'], ['Italy', 'italy'], ['Rome', 'italy'],
  ['Venice', 'italy'], ['Padua', 'italy'],
  ['ונצי', 'italy'], ['ליוורנו', 'italy'], ['מנטובה', 'italy'], ['טראני', 'italy'], ['לונטשיץ', 'italy'],
  ['מודינה', 'italy'], ['אמיליה', 'italy'], ['פיזה', 'italy'], ['קרלסרוהה', 'ashkenaz'],
  ['מרוקו', 'north-africa'], ['מצרים', 'north-africa'], ['תוניסיה', 'north-africa'],
  ['פס', 'north-africa'], ['קהיר', 'north-africa'], ['Egypt', 'north-africa'],
  ['Morocco', 'north-africa'], ['Cairo', 'north-africa'], ['Fez', 'north-africa'],
  ['אלג', 'north-africa'], ['תוניס', 'north-africa'], ['לוב', 'north-africa'],
  ['טריפולי', 'north-africa'], ['פאס', 'north-africa'], ['תלמסאן', 'north-africa'],
  ['מגרב', 'north-africa'], ['קירואן', 'north-africa'], ['אלכסנדרי', 'north-africa'],
  ['פולין', 'east-europe'], ['ליטא', 'east-europe'], ['וילנה', 'east-europe'],
  ['קרקוב', 'east-europe'], ['לובלין', 'east-europe'], ['רוסיה', 'east-europe'],
  ['Poland', 'east-europe'], ['Lithuania', 'east-europe'], ['Vilna', 'east-europe'],
  ['גליציה', 'east-europe'], ['הונגרי', 'east-europe'], ['ורשה', 'east-europe'],
  ['בריסק', 'east-europe'], ['נובהרדוק', 'east-europe'], ['סלבודקה', 'east-europe'],
  ['וולוז', 'east-europe'], ['סוכטשוב', 'east-europe'], ['סלונים', 'east-europe'],
  // Prussia (Danzig, Königsberg, Thorn) was filed under east-europe only because 'רוסיה' sat inside פרוסיה; Shklov was
  // filed under north-africa because 'לוב' sat inside שקלוב. Both are now stated outright.
  ['פרוסיה', 'east-europe'], ['שקלוב', 'east-europe'],
  ['ישראל', 'eretz-israel'],
]

// A keyword counts only where it starts a word: at the start of the text, after a separator, or after a one- or
// two-letter Hebrew prefix (ב, ל, מ, ש, ה, ו, כ: "בפראג", "ומקהיר"). It used to match anywhere inside a word, so
// 'לוב' (Libya) was found in שידלוב and מיקולוב and 'פס' in any word holding פס. A keyword of three letters or fewer
// must also END the word (ירושלים, לוב, פס, עכו are whole names); a longer one may take a suffix, because many
// keywords are stems on purpose ('בוהמי' for בוהמיה, 'אלג' for אלג'יריה, 'הונגרי', 'קסטילי' ...).
const LETTER = /[A-Za-z\u05d0-\u05ea]/
const HEBREW_PREFIX = /^[ובלמשהכ]{1,2}$/

function wordStartOf(text: string, i: number): boolean {
  let j = i
  while (j > 0 && LETTER.test(text[j - 1])) j--
  const before = text.slice(j, i)
  return before === '' || HEBREW_PREFIX.test(before)
}

/** Index of the first place where `kw` stands in `text` as a word (see above), or -1. */
export function keywordIndex(text: string, kw: string): number {
  const whole = kw.length <= 3
  for (let i = text.indexOf(kw); i >= 0; i = text.indexOf(kw, i + 1)) {
    if (!wordStartOf(text, i)) continue
    if (whole && LETTER.test(text[i + kw.length] ?? ' ')) continue
    return i
  }
  return -1
}

export function locationToRegion(loc: string | undefined): Region | null {
  if (!loc) return null
  for (const [kw, region] of LOCATION_REGION_MAP) {
    if (keywordIndex(loc, kw) >= 0) return region
  }
  return null
}

// Ordered, unique region list from a free-text location
// ("צפת; מצרים" → ['eretz-israel','north-africa']) — powers two-tone migrants
export function regionsOf(loc: string | undefined): Region[] {
  if (!loc) return []
  const hits: Array<{ r: Region; i: number }> = []
  for (const [kw, region] of LOCATION_REGION_MAP) {
    const i = keywordIndex(loc, kw)
    if (i >= 0) hits.push({ r: region, i })
  }
  hits.sort((a, b) => a.i - b.i)
  const seen = new Set<Region>()
  const out: Region[] = []
  for (const h of hits) if (!seen.has(h.r)) { seen.add(h.r); out.push(h.r) }
  return out
}

// Connection type → color (matches the printed sages-table legend)
export const CONNECTION_TYPE_COLORS: Record<string, string> = {
  student:      '#3b82f6',
  teacher:      '#3b82f6',
  influence:    '#f59e0b',
  colleague:    '#22c55e',
  oppose:       '#ef4444',
  family:       '#a855f7',
  contemporary: '#14b8a6',
  predecessor:  '#64748b',
}
