/**
 * The books' quotation marks (lib/hebrewMarks.ts::bookMarks). The owner's books write ASCII `"` and `'`, both as
 * gershayim and geresh (המהר"ל, ד'תש"י, ה') and as QUOTATION marks about a word or a phrase ('משקל יתדות ותנועות',
 * ל'מעיין המתגבר', ה"יד"). `gershayim()` (lib/pathShare.ts, lib/hebrewMarks.ts) turns every `'` after a letter into
 * a geresh, which is right for names and wrong for the books: it printed 'משקל יתדות ותנועות׳. bookMarks tells the
 * two apart. This file pins its decision on the book's real cases (named below), on the whole book (the count of
 * every class: 171 apostrophes and 173 double quotes follow a Hebrew letter), and on the properties the reader
 * relies on (one character for one character, quotes balanced, idempotent).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { bookMarks, classifyMarks, gershayim } from '../lib/hebrewMarks'
import { segmentsOf } from '../lib/kidsBookTypes'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const book = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/kids-books/saltiel.json'), 'utf8'))
const SKIP = new Set(['src', 'alt', 'sha256', 'file', 'edition', 't', 'k', 'style', 'variant', 'slug', 'id', 'kind', 'part', 'book', 'route'])
const fields: string[] = []
const walk = (v: unknown) => {
  if (typeof v === 'string') fields.push(v)
  else if (Array.isArray(v)) v.forEach(walk)
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!SKIP.has(k)) walk(x)
}
walk(book.parts)

// ---- the book's real cases, each as the book has it -> as the reader shows it ----

/** A quotation mark: the book's own character stays. */
const QUOTES: Array<[string, string]> = [
  ["נשמע 'משקל יתדות ותנועות'.", "נשמע 'משקל יתדות ותנועות'."],                       // the closing ' after a letter
  ["מה מיוחד ב'סמיכה' הזו?", "מה מיוחד ב'סמיכה' הזו?"],                                 // opening after the prefix ב
  ["וגם ל'מעיין המתגבר' המעניק", "וגם ל'מעיין המתגבר' המעניק"],                         // after ל
  ["כותב בעברית כ'דוד אבזי'. האווז", "כותב בעברית כ'דוד אבזי'. האווז"],                  // after כ
  ["כמי ש'מבין מדעתו'! הוא מיד", "כמי ש'מבין מדעתו'! הוא מיד"],                        // after ש
  ["אלא ו'מאיר', מפני", "אלא ו'מאיר', מפני"],                                          // after ו
  ["וב'נגיעות אישיות', והדרך", "וב'נגיעות אישיות', והדרך"],                              // after the cluster וב
  ["הוא כתב את ספר ה'שולחן ערוך'! הספר", "הוא כתב את ספר ה'שולחן ערוך'! הספר"],          // after ה (the article)
  ["שולחן עץ מאלתר - ה'טיש' החסידי", "שולחן עץ מאלתר - ה'טיש' החסידי"],
  ["הצטרפו 'דעת משה' שהקים", "הצטרפו 'דעת משה' שהקים"],                                // משה is a word, not the Name
  ["המילה המקראית 'בבה' (שפירושה", "המילה המקראית 'בבה' (שפירושה"],                    // so is בבה
  ['הופך את קולות הלימוד ל"קרקור" באמצעות', 'הופך את קולות הלימוד ל"קרקור" באמצעות'],     // " opening after ל
  ['הוא "קרקר" ו"זמזם" כמו להקת', 'הוא "קרקר" ו"זמזם" כמו להקת'],                        // after ו
  ['בידו החזיק את ה"יד" הדקה', 'בידו החזיק את ה"יד" הדקה'],                              // after ה
  ['הכשרת הנפש ב"חובת התלמידים". שיא', 'הכשרת הנפש ב"חובת התלמידים". שיא'],              // after ב
  ['הבחנה בין "חכמת התורה" הנצחית ל"חכמת הטבע" האנושית', 'הבחנה בין "חכמת התורה" הנצחית ל"חכמת הטבע" האנושית'],
  ['"בבקשה, היכנס ושב!" אמר המגיד בחגיגיות.', '"בבקשה, היכנס ושב!" אמר המגיד בחגיגיות.'], // speech
  ['"דרור יקרא לבן עם בת, וינצרכם כמו בבת!"', '"דרור יקרא לבן עם בת, וינצרכם כמו בבת!"'],
]
/** A geresh or a gershayim: the site's character. */
const MARKS: Array<[string, string]> = [
  ["נָפְשִׁי לְחַצְרוֹת ה'", 'נָפְשִׁי לְחַצְרוֹת ה׳'],                                    // the Name
  ['"הֵן יִרְאַת ה\' הִיא חָכְמָה"', '"הֵן יִרְאַת ה׳ הִיא חָכְמָה"'],                    // ... with the verse's quotes untouched
  ["לב שעומד לפני ה', מתגעגע", 'לב שעומד לפני ה׳, מתגעגע'],
  ["'הללו את ה' מן הארץ... ארזים!'", "'הללו את ה׳ מן הארץ... ארזים!'"],                  // the Name INSIDE a quote: its quotes stay
  ["'ברוך ה' אלהי ישראל שנתן בן'", "'ברוך ה׳ אלהי ישראל שנתן בן'"],
  ["קרוב לה' כל הזמן", 'קרוב לה׳ כל הזמן'],                                             // the Name with a prefix
  ["'הקרבה לה' מועילה'", "'הקרבה לה׳ מועילה'"],                                        // ... even inside a quote
  ["סביב ד'תש\"י (950 לספירה)", 'סביב ד׳תש״י (950 לספירה)'],                              // a year
  ['שנת ה\'רח"ץ (1538)', 'שנת ה׳רח״ץ (1538)'],                                         // ה is a prefix letter, but a date
  ['ג\'תת"ל', 'ג׳תת״ל'],
  ["סביב ד'ס' (300 לספירה)", 'סביב ד׳ס׳ (300 לספירה)'],
  ['ה\'תרנ"ו (1896) – ה\'תש"א (1941)', 'ה׳תרנ״ו (1896) – ה׳תש״א (1941)'],
  ['ה\'ש"ס (1600)', 'ה׳ש״ס (1600)'],                                                  // ש is a prefix letter too
  ["הסבא מנובהרדוק והרבי מפיאסצ'נה", 'הסבא מנובהרדוק והרבי מפיאסצ׳נה'],                 // inside a word
  ["תחת השלטון העות'מאני החדש", 'תחת השלטון העות׳מאני החדש'],
  ["בצורת האות מ' והסבר", 'בצורת האות מ׳ והסבר'],                                       // a letter named
  ["דרך דלת ה-מ' הגדולה", 'דרך דלת ה-מ׳ הגדולה'],
  ['המהר"ל מפראג וסוד הגולם', 'המהר״ל מפראג וסוד הגולם'],
  ['רבי יעקב בירב והמהרלב"ח', 'רבי יעקב בירב והמהרלב״ח'],
  ['אמרו חז"ל, והרמב"ם', 'אמרו חז״ל, והרמב״ם'],
  ['תשפ"ז 2026, מסת"ב', 'תשפ״ז 2026, מסת״ב'],
  ['בכ"ט בכסלו', 'בכ״ט בכסלו'],                                                         // בכ are prefix letters, but no closing " follows
]

test('the book\'s quotation marks stay as the book writes them', () => {
  assert.ok(QUOTES.length >= 15)
  for (const [from, want] of QUOTES) assert.equal(bookMarks(from), want, from)
})

test('the book\'s geresh and gershayim become ׳ and ״, the Name inside a quote included', () => {
  assert.ok(MARKS.length >= 15)
  for (const [from, want] of MARKS) assert.equal(bookMarks(from), want, from)
})

test('a quote that opens after a prefix and closes later: both stay, whatever stands between', () => {
  // gershayim between the quotes is still a gershayim
  assert.equal(bookMarks('ל"חכמת המהר"ל" האנושית'), 'ל"חכמת המהר״ל" האנושית')
  // two quotes in one text, each paired with its own end
  assert.equal(bookMarks("ל'בור' ו'מעיין'"), "ל'בור' ו'מעיין'")
})

test('the Name with a prefix is a geresh even inside a quote; a word that merely looks like it closes the quote', () => {
  assert.equal(bookMarks("'הרצון להיות קרוב לה' כל הזמן'"), "'הרצון להיות קרוב לה׳ כל הזמן'")
  assert.equal(bookMarks("ישיבת 'דעת משה' בורשה"), "ישיבת 'דעת משה' בורשה")
  assert.equal(bookMarks("המילה 'בבה' (שפירושה"), "המילה 'בבה' (שפירושה")
})

test('a quote with no closing mark is not made up: the prefix reading needs a closing quote after it', () => {
  assert.equal(bookMarks("ב'סמיכה זו"), "ב׳סמיכה זו")
  assert.equal(bookMarks('אמר ל"שלום'), 'אמר ל״שלום')
})

test('text that is not Hebrew, and text with no marks, is returned unchanged', () => {
  for (const t of ['', 'plain "text" it\'s', 'Рабби Моше', "O'Brien said \"hi\"", '12:30 (1941)', 'אבג דהו']) assert.equal(bookMarks(t), t)
})

test('nikud between the letter and the mark does not change the reading', () => {
  assert.equal(bookMarks("'מֶלֶךְ' אמר"), "'מֶלֶךְ' אמר")
  assert.equal(bookMarks("אֶת ה' אֱלֹקֶיךָ"), 'אֶת ה׳ אֱלֹקֶיךָ')
  assert.equal(bookMarks('"וַיֹּאמֶר אֶל ה\'"'), '"וַיֹּאמֶר אֶל ה׳"')
})

// ---- the whole book ----

const book171 = () => {
  const counts: Record<string, number> = {}
  for (const t of fields) {
    for (const m of classifyMarks(t)) {
      let j = m.index - 1
      while (j >= 0 && t[j] >= '\u0591' && t[j] <= '\u05C7') j--
      if (!(j >= 0 && t[j] >= 'א' && t[j] <= 'ת')) continue
      counts[`${m.mark} ${m.cls}`] = (counts[`${m.mark} ${m.cls}`] ?? 0) + 1
    }
  }
  return counts
}

test('the count of every class over the book: 171 apostrophes and 173 double quotes follow a Hebrew letter', () => {
  const c = book171()
  assert.deepEqual(c, {
    "' geresh": 79,        // ה' (the Name, with and without a prefix), האות מ', ה-מ', years, מפיאסצ'נה, העות'מאני
    "' quote-close": 81,   // 'משקל יתדות ותנועות' ...
    "' quote-open": 11,    // ב'סמיכה', ל'מעיין, כ'דוד אבזי', ה'טיש' ...
    '" gershayim': 75,     // המהר"ל, המהרלב"ח, תשפ"ז, years ...
    '" quote-open': 9,     // ה"יד", ל"קרקור", ו"זמזם" ...
    '" quote': 89,         // the closing " of a quotation after a letter
  })
  assert.equal(Object.entries(c).filter(([k]) => k.startsWith("'")).reduce((s, [, v]) => s + v, 0), 171)
  assert.equal(c['" gershayim'] + c['" quote-open'], 84, 'the 84 " between two letters the old rule made gershayim: 9 of them open a quote')
})

test('over the book: one character for one character, nothing but ׳ and ״ is introduced, the result is stable', () => {
  assert.ok(fields.length > 700)
  for (const t of fields) {
    const b = bookMarks(t)
    assert.equal(b.length, t.length)
    for (let i = 0; i < t.length; i++) if (b[i] !== t[i]) assert.ok((t[i] === "'" && b[i] === '׳') || (t[i] === '"' && b[i] === '״'), `${t}: ${t[i]} -> ${b[i]}`)
    assert.equal(bookMarks(b), b, `not stable: ${t}`)
    assert.ok(classifyMarks(b).every(m => m.cls !== 'geresh' && m.cls !== 'gershayim'), `a geresh or gershayim is left in: ${b}`)
  }
})

test('over the book: every text opens as many single quotes as it closes', () => {
  for (const t of fields) {
    const marks = classifyMarks(t).filter(m => m.mark === "'")
    const open = marks.filter(m => m.cls === 'quote-open').length
    const close = marks.filter(m => m.cls === 'quote-close').length
    assert.equal(open, close, `unbalanced single quotes in: ${t}`)
  }
})

test('over the book: the old rule\'s mistakes are the ones this fixes, and nothing else differs', () => {
  let closing = 0
  let opening = 0
  for (const t of fields) {
    const a = gershayim(t)
    const b = bookMarks(t)
    for (let i = 0; i < t.length; i++) {
      if (a[i] === b[i]) continue
      // the old rule changed it, the new one keeps the book's character: a quotation mark
      assert.equal(b[i], t[i], `${t}`)
      if (t[i] === "'") closing++
      else opening++
    }
  }
  // the 81 closing and the 11 opening apostrophes, and the 9 opening double quotes
  assert.equal(closing, 81 + 11, 'single quotes the old rule would have turned into a geresh')
  assert.equal(opening, 9, 'the opening double quotes the old rule would have turned into a gershayim')
})

test('gershayim() itself is unchanged: it still reads every ASCII mark after a letter as a geresh', () => {
  assert.equal(gershayim("ל'מעיין"), 'ל׳מעיין')
  assert.equal(gershayim("ר' יוסף"), 'ר׳ יוסף')
  assert.equal(gershayim('רש"י'), 'רש״י')
  assert.equal(bookMarks('רש"י'), 'רש״י')
  assert.equal(bookMarks("ר' יוסף"), 'ר׳ יוסף')   // the same on names, which is why the books need their own
})

test('a run cut at its marks converts as a whole: a quote may open before an emphasis and close after it', () => {
  const run = { text: "כמי ש'מבין מדעתו'! הוא", marks: [{ k: 'em' as const, from: 6, to: 16 }] }
  const segs = segmentsOf(run, { display: true })
  assert.equal(segs.map(s => s.text).join(''), "כמי ש'מבין מדעתו'! הוא")
  assert.equal(segs.find(s => s.mark === 'em')!.text, "מבין מדעתו")
  const withName = { text: "'הללו את ה' מן'", marks: [{ k: 'b' as const, from: 9, to: 10 }] }
  assert.equal(segmentsOf(withName, { display: true }).map(s => s.text).join(''), "'הללו את ה׳ מן'")
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
