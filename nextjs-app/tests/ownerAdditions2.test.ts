/**
 * The owner's thirteen papers of 18 October 2026 on sages the site did not have (phase 2b): ids 686-698, each a new sage with
 * his paper in Hebrew, English and Russian. 686 R. Shimshon of Sens, 687 R. Shmuel ibn Tibbon, 688 R. Shmuel Yaffe Ashkenazi,
 * 689 the Chacham Tzvi, 690 R. Nissim of Kairouan, 691 the Maharam Schiff, 692 the Maharam Esh, 693 R. Yedidya Norzi,
 * 694 R. David Oppenheim, 695 R. Avraham ben Natan HaYarchi, 696 R. Avraham Zacut, 697 R. Aharon Berechiah of Modena,
 * 698 Rav (Abba Arikha).
 *
 * data/owner-additions-2026-10b.json is the record of the batch: per sage the sources read with the verbatim quotes behind every
 * sentence of a bio and a core idea, the links with their quotes, and (3.10 of the plan) the paper block of
 * data/owner-papers-2026-10.json: the Drive document, the two copies and how they compared, what the paper says that the entry does
 * not, the slips, the relations read from it and what became of each, the death date or why none, and the second reading's counts.
 * Ids are what drift between data sets (see CLAUDE.md), so every sage here is named by the label the record holds, and these tests
 * fail when an id now belongs to someone else.
 *
 * Written from the plan's criteria and the shapes of the files, not from the code that integrated them. The helpers, the counters,
 * the paper rules and the sage rules are COPIED from tests/ownerAdditions.test.ts and tests/ownerPapers.test.ts, not imported: those
 * files run their tests when they are imported, and a test file of its own is left untouched when the next batch changes its rules.
 * The one change to the paper rules is the Arabic rule (see ARABIC_ALLOWED).
 *
 * The shape of the record this file reads (the lead's decision 3.10, one file): top level { _about, date, drive_folder, dropped_links,
 * sages[] }; per sage { id, label, package, key, drive {doc, title}, docx, he {lines, words}, copies {a_lines, b_lines, identical,
 * differences[]}, about_sage, disagreements[], slips[], footnotes[], woman, sources[], sentences {bio[], core_idea[]}, links[],
 * paper_links[] (each the entry of data/links-from-research.json plus outcome added | already-on-site | dropped and, for dropped, a
 * reason), links_rejected[], links_none_reason?, yahrzeit {day, month, quote, outcome} | null, yahrzeit_none_reason?, new_places[],
 * terms_added, related_cell, notes, reading {summary: {ok, imprecise, wrong} (or the three counts flat), applied[]} }.
 *
 * Not asserted, on purpose: a total number of papers or sages (the next batch adds more); only that this record adds ids 686-698.
 *
 * Every rule that is a function over data is also run on a copy of the data broken on purpose, one test line per mutation, to show
 * it fires: a check that cannot fail checks nothing. The mutations run on a hand-made "after" state (the real files plus what the
 * integration still adds: the record's paper block, the reviewed lists, the built files), so they do not wait for it.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import zlib from 'node:zlib'
import { getAllConnections, getAllSages } from '../lib/serverData'
import { overlayEntry } from '../lib/serverDataTranslator'
import { regionsOf } from '../lib/regions'
import { resolveCoords } from '../lib/locationCoords'
import { translateTerm, type TermDict } from '../lib/terms'
import { ALL_PERIODS } from '../lib/types'
import termsEn from '../public/i18n/terms.en.json'
import termsRu from '../public/i18n/terms.ru.json'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ok  ${name}`); passed++ } catch (e) { console.log(`  FAIL ${name}\n       ${(e as Error).message}`); failed++ }
}

const APP = join(__dirname, '..')
const REPO = join(APP, '..')
const RESEARCH = join(APP, 'public/research')
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const deep = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

// ---- the plan's table: who, under what label, the words of his name the title carries, his Drive document ------------------
// The labels are the ones the record holds (the plan's were proposals, settled by the sources and the roster's conventions). The periods are
// the ones the nodes hold (the plan does not give them; 690, a sage of 990-1062, is filed under rishonim, as the Sefaria and Wikipedia entries file him).
const DRIVE_FOLDER = '1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc' // the folder of the owner's papers of 18 October (the same as phase 2a's)
interface Row { id: string; label: string; key: string; doc: string; title: string; period: string }
const TABLE: Row[] = [
  { id: '686', label: 'רבי שמשון בן אברהם משאנץ (הר״ש)', key: 'הר"ש', doc: '1t2Sn3Sa688x0cOhM4yQW-CAC56aEJ6opg3EobisNFPk', title: 'פועלו, משנתו היצירתית ומורשתו התורנית של רבי שמשון בן אברהם משאנץ (הר"ש)', period: 'rishonim' },
  { id: '687', label: 'רבי שמואל אבן תיבון', key: 'תיבון', doc: '14VmnQkhfGqbkSo6NIJjVfb-bFwEpl--4EdVgiLYmueM', title: 'פועלו ומשנתו הפילוסופית והתרגומית של רבי שמואל אבן תיבון', period: 'rishonim' },
  { id: '688', label: 'רבי שמואל יפה אשכנזי', key: 'שמואל יפה', doc: '1s5fAVA-BrmbN5HAOWzWeG4lxNJtjpEU42f12LAKykfo', title: 'פועלו ומשנתו התורנית של רבי שמואל יפה אשכנזי: תולדות חייו, יצירתו הפרשנית ומורשתו לדורות', period: 'acharonim' },
  { id: '689', label: 'רבי צבי הירש אשכנזי (החכם צבי)', key: 'החכם צבי', doc: '1ztRSZB1lIIxI3H8pX3DZMY1mfM0lGWQoqVR_Is8nGis', title: 'פועלו, משנתו התורנית ומורשתו של רבי צבי הירש אשכנזי ("החכם צבי"): מחקר מקיף', period: 'acharonim' },
  { id: '690', label: 'רבנו נסים בן יעקב מקירואן', key: 'נסים בן יעקב', doc: '1jHWJK89divjtJdnGd855GOf6UrBYriLlNMMQJLNZpEQ', title: 'פועלו, משנתו התורנית ומורשתו של רבנו נסים בן יעקב מקירואן', period: 'rishonim' },
  { id: '691', label: 'רבי מאיר בן יעקב שיף (מהר״ם שיף)', key: 'שיף', doc: '1JUHKNvh-QHT28pWZ1ZDpQGeLOby3AsbwpuPGMvVskDQ', title: 'פועלו ומורשתו התורנית של רבי מאיר בן יעקב שיף (המהר"ם שיף): תולדות חייו, דרכו הפרשנית והשפעתו לדורות', period: 'acharonim' },
  { id: '692', label: 'רבי מאיר אייזנשטט (בעל פנים מאירות)', key: 'אייזנשטט', doc: '1B6GHL9apDF0nCDY5Qns7Ecz8dBj4t976HZogdY2SPJ4', title: 'פועלו, משנתו ותולדות חייו של רבי מאיר אייזנשטט (מהר"ם א"ש) בעל "פנים מאירות"', period: 'acharonim' },
  { id: '693', label: 'רבי ידידיה שלמה רפאל נורצי', key: 'נורצי', doc: '1q-ygUMWru2L7wnTlbHm-E4ZtdOaIFOdvKvofakbcbj0', title: 'פועלו ומשנתו התורנית של רבי ידידיה שלמה רפאל נורצי: מנטובה, נוסח המקרא ומורשתו לדורות', period: 'acharonim' },
  { id: '694', label: 'רבי דוד אופנהיים', key: 'אופנהיים', doc: '1PG29EZGf-_c1XC21dtoVIe5IiD-z1e3qKasoayedwSY', title: 'פועלו ומשנתו התורנית של רבי דוד אופנהיים: תולדות חייו, ספרייתו המפורסמת ושיטתו ההלכתית', period: 'acharonim' },
  { id: '695', label: 'רבנו אברהם בר נתן הירחי (בעל ספר המנהיג)', key: 'הירחי', doc: '1mObngILQABssbKakTnpjr_j-yynv89YT52OiDkVQwtM', title: 'פועלו, משנתו ההלכתית ומורשתו של רבינו אברהם בר נתן הירחי (בעל ספר המנהיג)', period: 'rishonim' },
  { id: '696', label: 'רבי אברהם זכות', key: 'זכות', doc: '1kspL8ibJN6NICUVbhPejudXjOuK4BKY3jPpnLRxdNOQ', title: 'פועלו, משנתו ומורשתו של רבי אברהם זכות: בין מנהיגות רוחנית למהפכה מדעית והיסטוריוגרפית', period: 'rishonim' },
  { id: '697', label: 'רבי אהרן ברכיה ממודינה (בעל מעבר יבוק)', key: 'ברכיה', doc: '1nENC21f-1OTrXfwscdwUYg6DSvNkApjcNtdiLEKDBP4', title: 'פועלו, משנתו התורנית ומורשתו של רבי אהרן ברכיה ממודינה', period: 'acharonim' },
  { id: '698', label: 'רב (אבא אריכא)', key: 'אבא אריכא', doc: '1jKW3TLpB9QF_htFjAZLJxrstpnSYzI2vaFgCsMWLKH4', title: 'פועלו, משנתו והשפעתו של רב (אבא אריכא): מנהיג המהפכה התורנית בבבל', period: 'amoraim' },
]
const IDS = TABLE.map(t => t.id)
const IDSET = new Set(IDS)
const keyOf = (id: string) => TABLE.find(t => t.id === id)!.key
const MONTHS = ['Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar I', 'Adar', 'Adar II', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul']
const FAMILY = ['father', 'mother', 'grandfather', 'grandmother', 'father-in-law', 'mother-in-law', 'uncle', 'aunt', 'ancestor',
  'brother', 'sister', 'husband', 'wife', 'cousin', 'brother-in-law', 'sister-in-law', 'relative']
/** The links the second reader or the owner's decision removed (the plan's list); the record must hold at least these. */
const DROPPED = ['686>588', '687>388', '687>57', '687>17', '689>86', '691>97', '691>102', '599>691']

// ---- text helpers (copied from tests/ownerAdditions.test.ts) ----------------------------------------------------------
const HEBREW = /[א-ת]/
const LATIN = /[A-Za-z]/
const CYRILLIC = /[Ѐ-ӿ]/
const ARABIC = /[؀-ۿݐ-ݿ]/
const CITE = /\[cite:[^\]]*\]/g
const norm = (s: string) => s.replace(/[״“”"]/g, '"').replace(/[׳’']/g, "'").replace(/\s+/g, ' ').trim()
/** A quote is verbatim when the page holds it, with or without the paper's [cite: n] markers. */
const inText = (quote: string, text: string) => { const q = norm(quote); return norm(text).includes(q) || norm(text.replace(CITE, ' ')).includes(q) }
const words = (s: string) => (s.match(/\S+/g) ?? []).length
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length
const heShare = (s: string) => { const he = count(s, /[א-ת]/g); const all = he + count(s, /[A-Za-zÀ-ɏЀ-ӿ]/g); return all ? he / all : 0 }

/**
 * Paper 687 (R. Shmuel ibn Tibbon) names the Arabic original of Maimonides' Guide of the Perplexed in Arabic letters, in the owner's own
 * text, and it stays exactly as he wrote it. The rule against Arabic letters exists to catch what Google's export leaves inside Hebrew
 * words, so exactly this phrase, for this sage, is let through (as scripts/ingest_drive_doc.py's ARABIC_ALLOWED does); nothing else.
 */
const ARABIC_ALLOWED: Record<string, string[]> = { '687': ['دلالة الحائرين'] }
const withoutAllowed = (id: string, s: string) => (ARABIC_ALLOWED[id] ?? []).reduce((t, p) => t.split(p).join(''), s)

// ---- the paper rules (copied from tests/ownerPapers.test.ts; the Arabic rule changed, translations checked for Arabic too) ------
interface PaperDoc { title: string; source_file: string; word_count: number; content: string }
interface PaperSet { he: PaperDoc[] | null; en: PaperDoc[] | null; ru: PaperDoc[] | null }
function readPaperSet(id: string): PaperSet {
  const read = (suffix: string) => { const f = join(RESEARCH, `${id}${suffix}.json`); return existsSync(f) ? readJson<PaperDoc[]>(f) : null }
  return { he: read(''), en: read('.en'), ru: read('.ru') }
}
/** The name of the Word file the ingest script gives a title (scripts/ingest_drive_doc.py). */
const docxName = (title: string) => title.replace(/:/g, '-').replace(/[\\/*?<>|"]/g, '').slice(0, 180).trim() + '.docx'
const lineList = (a: number[]) => a.slice(0, 5).join(', ') + (a.length > 5 ? ', …' : '')

/** The rules of a paper in three languages: the Hebrew is the Drive text as plain lines, each translation is line-aligned with it. */
function paperProblems(id: string, set: PaperSet, key: string): string[] {
  const out: string[] = []
  const say = (m: string) => out.push(`${id}: ${m}`)
  if (!set.he || set.he.length === 0) return [`${id}: no Hebrew research file`]
  set.he.forEach((d, i) => {
    const at = `Hebrew document ${i}`
    const lines = d.content.split('\n')
    if (lines.length < 5) say(`${at}: fewer than 5 lines`)
    if (lines.some(l => !l.trim() || l !== l.trim())) say(`${at}: a blank or untrimmed line`)
    if (ARABIC.test(withoutAllowed(id, d.content))) say(`${at}: Arabic letters`)
    if (/\*\*|^#|\\\[|\\"/m.test(d.content)) say(`${at}: markdown debris (**, #, \\[ or \\")`)
    if (d.title !== lines[0].slice(0, 200)) say(`${at}: the title is not the first line`)
    if (d.source_file !== docxName(lines[0])) say(`${at}: source_file "${d.source_file}" is not the .docx of the title`)
    if (d.word_count !== words(d.content)) say(`${at}: word_count ${d.word_count}, the text has ${words(d.content)}`)
    if (!d.title.includes(key)) say(`${at}: the title does not name the sage (${key})`)
    if (count(d.content, new RegExp(key, 'g')) < 3) say(`${at}: the text names the sage (${key}) fewer than 3 times; is it his paper?`)
  })
  for (const lang of ['en', 'ru'] as const) {
    const tr = set[lang]
    if (!tr) { say(`no ${lang} research file`); continue }
    if (tr.length !== set.he.length) { say(`${lang}: ${tr.length} documents, the Hebrew has ${set.he.length}`); continue }
    tr.forEach((t, i) => {
      const h = set.he![i]
      const at = `${lang} document ${i}`
      if (t.source_file !== h.source_file) say(`${at}: source_file differs from the Hebrew file's`)
      if (!t.title.trim() || HEBREW.test(t.title)) say(`${at}: the title is empty or still Hebrew`)
      if (t.word_count !== words(t.content)) say(`${at}: word_count ${t.word_count}, the text has ${words(t.content)}`)
      // a translation is Latin or Cyrillic; the one Arabic string it may hold is the exact one the Hebrew paper of its own id may hold
      // (the Guide's Arabic title in 687: the Russian translation keeps it as the Hebrew has it, the English does not)
      if (ARABIC.test(withoutAllowed(id, t.content))) say(`${at}: Arabic letters`)
      const hl = h.content.split('\n')
      const tl = t.content.split('\n')
      if (hl.length !== tl.length) { say(`${at}: ${tl.length} lines, the Hebrew has ${hl.length} (a translation is line for line)`); return }
      const idx = (f: (k: number) => boolean) => hl.map((_, k) => k).filter(f)
      const empty = idx(k => !tl[k].trim() || !hl[k].trim())
      if (empty.length) say(`${at}: an empty line (lines ${lineList(empty.map(k => k + 1))})`)
      const sep = idx(k => /^-{20,}$/.test(hl[k]) && tl[k] !== hl[k])
      if (sep.length) say(`${at}: the separator line is not kept (lines ${lineList(sep.map(k => k + 1))})`)
      const cites = idx(k => (hl[k].match(CITE) ?? []).join('|') !== (tl[k].match(CITE) ?? []).join('|'))
      if (cites.length) say(`${at}: the [cite: n] markers differ from the Hebrew's (lines ${lineList(cites.map(k => k + 1))})`)
      const pipes = idx(k => count(hl[k], / \| /g) !== count(tl[k], / \| /g))
      if (pipes.length) say(`${at}: the table cells differ from the Hebrew's (lines ${lineList(pipes.map(k => k + 1))})`)
      // the source list keeps its Hebrew titles and its addresses, so look at the lines that are not links
      const prose = tl.filter(l => !/https?:\/\//.test(l)).join('\n')
      if (heShare(prose) > 0.1) say(`${at}: ${Math.round(heShare(prose) * 100)}% of the letters are still Hebrew (a copy, not a translation)`)
      const own = count(prose, lang === 'en' ? /[A-Za-z]/g : /[Ѐ-ӿ]/g)
      const letters = count(prose, /[A-Za-zЀ-ӿ]/g)
      if (own < 0.8 * letters) say(`${at}: less than 80% of the letters are ${lang === 'en' ? 'Latin' : 'Cyrillic'}`)
    })
  }
  return out
}

/** The thirteen papers are thirteen different texts, and no title carries another paper's key. */
function distinctProblems(sets: Record<string, PaperSet>): string[] {
  const out: string[] = []
  const he = TABLE.filter(t => sets[t.id]?.he?.[0]).map(t => ({ ...t, doc: sets[t.id].he![0] }))
  for (let i = 0; i < he.length; i++) for (let j = i + 1; j < he.length; j++) {
    const a = he[i]; const b = he[j]
    if (norm(a.doc.content) === norm(b.doc.content)) out.push(`${a.id} and ${b.id}: the same Hebrew text`)
    if (norm(a.doc.title) === norm(b.doc.title)) out.push(`${a.id} and ${b.id}: the same title`)
  }
  for (const a of he) for (const b of he) if (a.id !== b.id && norm(a.doc.title).includes(norm(b.key))) out.push(`${a.id}: the title holds ${b.id}'s key (${b.key}); is it his paper?`)
  return out
}

// ---- the spreadsheet reader (copied from tests/ownerAdditions.test.ts) --------------------------------------------------------
function unzip(buf: Buffer): Map<string, Buffer> {
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  assert.ok(eocd >= 0, 'not a zip file')
  const n = buf.readUInt16LE(eocd + 10)
  let at = buf.readUInt32LE(eocd + 16)
  const files = new Map<string, Buffer>()
  for (let i = 0; i < n; i++) {
    assert.equal(buf.readUInt32LE(at), 0x02014b50, 'bad central directory')
    const method = buf.readUInt16LE(at + 10)
    const size = buf.readUInt32LE(at + 20)
    const nameLen = buf.readUInt16LE(at + 28)
    const extraLen = buf.readUInt16LE(at + 30)
    const commentLen = buf.readUInt16LE(at + 32)
    const local = buf.readUInt32LE(at + 42)
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen)
    const dataAt = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const raw = buf.subarray(dataAt, dataAt + size)
    files.set(name, method === 0 ? raw : zlib.inflateRawSync(raw))
    at += 46 + nameLen + extraLen + commentLen
  }
  return files
}
const unxml = (s: string) =>
  s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

/** The first sheet of the workbook as rows of text cells, by row number and column letter (a zip and its XML: no library). */
function readFirstSheet(file: string): Map<number, Map<string, string>> {
  const zip = unzip(readFileSync(file))
  const text = (name: string) => { const b = zip.get(name); assert.ok(b, `${name} is missing from the workbook`); return b.toString('utf8') }
  const shared: string[] = []
  if (zip.has('xl/sharedStrings.xml')) {
    for (const si of text('xl/sharedStrings.xml').match(/<si>[\s\S]*?<\/si>|<si\/>/g) ?? []) {
      shared.push(unxml([...si.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => m[1]).join('')))
    }
  }
  const rels = new Map<string, string>()
  for (const m of text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0])?.[1]
    const target = /\bTarget="([^"]+)"/.exec(m[0])?.[1]
    if (id && target) rels.set(id, target.replace(/^\/?(xl\/)?/, 'xl/'))
  }
  const first = /<sheet\b[^>]*>/.exec(text('xl/workbook.xml'))![0]
  const xml = text(rels.get(/\br:id="([^"]+)"/.exec(first)![1])!)
  const rows = new Map<number, Map<string, string>>()
  for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = /\br="([A-Z]+)(\d+)"/.exec(c[1])!
    const type = /\bt="([^"]+)"/.exec(c[1])?.[1]
    const body = c[2] ?? ''
    let value: string | undefined
    if (type === 'inlineStr') value = unxml([...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''))
    else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]
      if (v === undefined) continue
      value = type === 's' ? shared[Number(v)] : type === 'str' ? unxml(v) : String(Number(v))
    }
    const r = Number(ref[2])
    if (!rows.has(r)) rows.set(r, new Map())
    rows.get(r)!.set(ref[1], value)
  }
  return rows
}

// ---- the record's shape and everything it is checked against ------------------------------------------------------------------
interface Source { kind: string; url: string; title?: string; fetched?: string; paper?: string; quotes: string[] }
interface Sentence { he: string; en: string; ru: string; support: Array<{ src: number; quote: string }> }
interface RecLink { a: string; b: string; type: string; relation?: string; quote: string; source: string }
interface PaperLink { paper: string; a: string; b: string; a_label: string; b_label: string; type: string; relation?: string; quote: string; outcome?: string; reason?: string }
interface Rejected { a: string; b: string; type: string; quote: string; verdict: string; reason?: string }
interface Rec {
  id: string; label: string; package: string; key: string; woman: boolean
  drive: { doc: string; title: string }
  docx: string
  he: { lines: number; words: number }
  copies: { a_lines: number; b_lines: number; identical: boolean; differences: Array<{ line: number; a: string; b: string; settled: string; how: string }> }
  about_sage: string
  disagreements: unknown[]; slips: unknown[]; footnotes: unknown[]
  sources: Source[]
  sentences: { bio: Sentence[]; core_idea: Sentence[] }
  links: RecLink[]
  paper_links: PaperLink[]
  links_rejected: Rejected[]; links_none_reason?: string
  yahrzeit: { day: number; month: string; quote: string; outcome?: string } | null; yahrzeit_none_reason?: string
  new_places: Array<{ name: string; region: string; lat: number; lng: number; coords_source: { url: string; quote: string } }>
  terms_added: { en: Record<string, string>; ru: Record<string, string> }
  related_cell: string
  notes: string
  reading: { summary?: { ok: number; imprecise: number; wrong: number }; ok?: number; imprecise?: number; wrong?: number; applied: string[] }
}
interface Dropped { sage?: string; a: string; b: string; type: string; quote: string; source: string; reason: string }
interface Doc { _about: string; date: string; drive_folder: string; dropped_links: Dropped[]; sages: Rec[] }
interface Reviewed { paper: string; a: string; b: string; a_label: string; b_label: string; type: string; relation?: string; quote: string }
interface BuiltLink { source: string; target: string; type: string; relation?: string; quotes: Array<{ paper: string; quote: string }> }
interface Conn { source: string; target: string; type: string }
interface RawLink { source: string; target: string; type: string; evidence_source?: string }
interface YItem { id: string; day?: number | null; month?: string; quote?: string; reason?: string }
type BuiltY = Record<string, { label: string; day: number; month: string; quote: string }>
interface RawNode {
  id: string; label: string; era?: string; era_key?: string; era_label?: string; field?: string; location?: string; bio?: string
  central_idea?: string; tags?: string; spotify_url?: string; has_research?: boolean
}
interface SageView { location: string; field: string; tags: string[] }
type Cells = Record<'label' | 'years' | 'region' | 'era' | 'field' | 'tags' | 'bio' | 'core' | 'spotify', string | undefined>

/** Everything a record is checked against, as plain data so a copy can be broken on purpose. */
interface Env {
  label: Record<string, string>
  sage: Record<string, SageView>
  sets: Record<string, PaperSet>
  dataFiles: string[]
  attribution: Array<{ file: string; sage_label: string }>
  copies: Array<Record<string, RawNode | undefined>>
  copyLinks: RawLink[][]
  sheet: Record<string, Cells[]>
  ov: Record<'en' | 'ru', Record<string, { label?: string; bio?: string; core_concept?: string } | null>>
  conn: Conn[]
  reviewed: Reviewed[]
  built: BuiltLink[]
  yList: YItem[]
  yBuilt: BuiltY
  sefaria: Record<string, { label: string }>
  wiki: Record<string, { label: string }>
}

const connHas = (conn: Conn[], a: string, b: string, type: string) => conn.some(c => {
  const s = String(c.source); const t = String(c.target)
  if (type === 'teacher') return (c.type === 'teacher' && s === a && t === b) || (c.type === 'student' && s === b && t === a)
  return c.type === type && ((s === a && t === b) || (s === b && t === a))
})
/** A recorded link is in the corpus as recorded; a student link the other way round is the same teacher link; an influence link yields to a stronger relation of the pair (mergeDatasets keeps one edge a relation). */
function linkInCorpus(l: { a: string; b: string; type: string }, conn: Conn[]): boolean {
  if (conn.some(c => c.source === l.a && c.target === l.b && c.type === l.type)) return true
  if (l.type === 'teacher' && conn.some(c => c.source === l.b && c.target === l.a && c.type === 'student')) return true
  if (l.type === 'influence' && conn.some(c => ((c.source === l.a && c.target === l.b) || (c.source === l.b && c.target === l.a)) && ['teacher', 'student', 'family'].includes(c.type))) return true
  return false
}
const builtHas = (built: BuiltLink[], a: string, b: string, type: string) => built.some(e =>
  e.type === type && ((e.source === a && e.target === b) || (type === 'family' && e.source === b && e.target === a)))
const sameLink = (x: { paper: string; a: string; b: string; type: string }, y: { paper: string; a: string; b: string; type: string }) =>
  x.paper === y.paper && x.a === y.a && x.b === y.b && x.type === y.type
const stripOutcome = (c: PaperLink): Reviewed => { const { outcome: _o, reason: _r, ...rest } = c; return rest as Reviewed }
const readingCounts = (r: Rec['reading'] | undefined) => {
  const c = r?.summary ?? r
  return { ok: c?.ok, imprecise: c?.imprecise, wrong: c?.wrong }
}

const TERMS: Record<'en' | 'ru', TermDict> = { en: termsEn.terms as TermDict, ru: termsRu.terms as TermDict }
const AND = { en: 'and', ru: 'и' } as const

// ---- the rules on the record: one function per theme, each over the record and the environment -------------------------------
function topProblems(d: Doc): string[] {
  const out: string[] = []
  const top = (m: string) => out.push(`record: ${m}`)
  if (!d._about || d._about.length < 50) top('_about is missing')
  if (!/^2026-1[01]-\d\d$/.test(d.date ?? '')) top(`date "${d.date}"`)
  if (d.drive_folder !== DRIVE_FOLDER) top(`drive_folder "${d.drive_folder}"`)
  if (!isDeepStrictEqual(d.sages.map(r => r.id), IDS)) top(`the sages are ${d.sages.map(r => r.id).join(', ')}, not 686-698 once each in id order`)
  if (!Array.isArray(d.dropped_links)) top('dropped_links is not a list')
  return out
}

function identityProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) {
    const t = TABLE.find(x => x.id === r.id)
    const say = (m: string) => out.push(`${r.id}: ${m}`)
    if (!t) { say('not a sage of this batch'); continue }
    if (r.label !== t.label) say(`record label "${r.label}", the label pinned here "${t.label}"`)
    if (env.label[r.id] !== r.label) say(`record label "${r.label}", roster "${env.label[r.id]}" (the id now belongs to someone else)`)
    if (typeof r.key !== 'string' || r.key.length < 3) say(`the record's key "${r.key}" (the word the title and the text must carry) is missing or too short`)
    if (r.drive?.doc !== t.doc) say(`Drive document ${r.drive?.doc}, plan ${t.doc}`)
    if (norm(r.drive?.title ?? '') !== norm(t.title)) say(`Drive title "${r.drive?.title}", plan "${t.title}"`)
    if (r.id < '686' || r.id > '698') say('outside 686-698')
  }
  return out
}

/** The node in both data.json copies, and the row of the sheet. */
function nodeProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) {
    const t = TABLE.find(x => x.id === r.id)
    const say = (m: string) => out.push(`${r.id}: ${m}`)
    env.copies.forEach((cp, i) => {
      const n = cp[r.id]
      const at = `data.json copy ${i}`
      if (!n) { say(`${at}: no node`); return }
      if (n.label !== r.label) say(`${at}: node label "${n.label}"`)
      for (const f of ['era', 'era_key', 'era_label', 'field', 'location', 'bio', 'central_idea'] as const) if (!String(n[f] ?? '').trim()) say(`${at}: no ${f}`)
      if (n.era_key && !(ALL_PERIODS as string[]).includes(n.era_key)) say(`${at}: era_key "${n.era_key}" is not a period`)
      if (t && n.era_key !== t.period) say(`${at}: era_key "${n.era_key}", the plan has ${t.period}`)
      if (String(n.tags ?? '').split(/\s*,\s*/).filter(Boolean).length < 4) say(`${at}: fewer than 4 tags`)
      if ((n.spotify_url ?? '') !== '') say(`${at}: spotify_url is "${n.spotify_url}"; the owner has no episode for these sages`)
      if (n.has_research !== true) say(`${at}: has_research is not true`)
    })
    if (env.copies.length === 2 && env.copies[0][r.id] && env.copies[1][r.id] && !isDeepStrictEqual(env.copies[0][r.id], env.copies[1][r.id])) say('the two data.json copies hold different nodes')
    // the sheet row equals the node
    const rows = env.sheet[r.id] ?? []
    const n = env.copies[0]?.[r.id]
    if (rows.length !== 1) say(`${rows.length} rows in the sheet`)
    else if (n) {
      const c = rows[0]
      const cells: Array<[string, string | undefined, string | undefined]> = [
        ['label', c.label, n.label], ['years', c.years, n.era], ['places', c.region, n.location], ['era', c.era, n.era_label], ['field', c.field, n.field],
        ['tags', c.tags, n.tags], ['bio', c.bio, n.bio], ['core idea', c.core, n.central_idea],
      ]
      for (const [name, got, want] of cells) if (got !== want) say(`sheet ${name}: "${(got ?? '').slice(0, 40)}", the node has "${(want ?? '').slice(0, 40)}"`)
      if ((c.spotify ?? '') !== '') say('the sheet row holds an episode address')
    }
  }
  return out
}

/** Every rule on one record that needs nothing but the record and the papers (copied from tests/ownerAdditions.test.ts). */
function sageProblems(r: Rec, paper: (id: string) => string | null): string[] {
  const out: string[] = []
  const say = (m: string) => out.push(`${r.id}: ${m}`)
  if (!r.sources.some(s => /^https:\/\//.test(s.url) && s.quotes.length > 0)) say('no source with an https URL and a quote')
  const urls = new Set<string>()
  r.sources.forEach((s, i) => {
    if (!/^https:\/\//.test(s.url)) say(`source ${i} (${s.kind}): not an https URL`)
    if (urls.has(s.url)) say(`source ${i}: URL listed twice`)
    urls.add(s.url)
    if (s.quotes.some(q => q.trim().length < 15)) say(`source ${i}: a quote shorter than 15 characters`)
    if (s.kind === 'paper') {
      if (!s.paper) { say(`source ${i}: a paper source without the paper id`); return }
      if (s.paper !== r.id) say(`source ${i}: cites paper ${s.paper}, not his own`)
      const text = paper(s.paper)
      if (text === null) { say(`source ${i}: paper ${s.paper} is not in public/research`); return }
      for (const q of s.quotes) if (!inText(q, text)) say(`source ${i}: quote is not in paper ${s.paper}: ${q.slice(0, 40)}`)
    }
  })
  if (!r.sources.some(s => s.kind === 'paper' && s.paper === r.id)) say('no source of kind paper for his own paper')
  const bio = r.sentences.bio
  const core = r.sentences.core_idea
  if (bio.length < 2 || bio.length > 4) say(`the bio has ${bio.length} sentences, not 2 to 4`)
  if (core.length < 1 || core.length > 3) say(`the core idea has ${core.length} sentences, not 1 to 3`)
  if (bio.map(s => s.he).join(' ').length > 600) say('the Hebrew bio is longer than 600 characters')
  for (const [field, list] of [['bio', bio], ['core idea', core]] as const) {
    list.forEach((sen, n) => {
      const at = `${field} ${n + 1}`
      if (!sen.support?.length) say(`${at}: no support (a sentence without a verbatim quote)`)
      for (const sp of sen.support ?? []) {
        const src = r.sources[sp.src]
        if (!src) say(`${at}: support points at source ${sp.src}, which does not exist`)
        else if (!src.quotes.includes(sp.quote)) say(`${at}: a support quote is not among source ${sp.src}'s quotes: ${sp.quote.slice(0, 40)}`)
      }
      if (!HEBREW.test(sen.he)) say(`${at}: the Hebrew sentence has no Hebrew`)
      if (/[א-ת]["']/.test(sen.he)) say(`${at}: an ASCII quote or apostrophe after a Hebrew letter (use ״ and ׳)`)
      if (HEBREW.test(sen.en) || !LATIN.test(sen.en)) say(`${at}: the English sentence is not English`)
      if (HEBREW.test(sen.ru) || !CYRILLIC.test(sen.ru)) say(`${at}: the Russian sentence is not Russian`)
    })
  }
  for (const l of r.links) {
    const at = `link ${l.a} ${l.type} ${l.b}`
    if (l.a === l.b) say(`${at}: a link to himself`)
    if (l.a !== r.id && l.b !== r.id) say(`${at}: neither end is this sage`)
    if (l.type === 'family' && !l.relation) say(`${at}: a family link without its relation`)
    const src = r.sources.find(s => s.url === l.source)
    if (!src) say(`${at}: its source ${l.source} is not among the record's sources`)
    else if (!src.quotes.includes(l.quote)) say(`${at}: its quote is not among that source's quotes`)
  }
  if (r.notes.trim().length < 100) say('the notes (disagreeing sources, what was left out) are missing')
  return out
}

/** The site shows what the record sourced: the bio and core idea of the node, the sheet and the overlays are exactly the sentences. */
function textProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) {
    const n = env.copies[0]?.[r.id]
    const say = (m: string) => out.push(`${r.id}: ${m}`)
    const bio = r.sentences.bio; const core = r.sentences.core_idea
    if (n && n.bio !== bio.map(x => x.he).join(' ')) say('the node\'s bio is not the sourced Hebrew sentences')
    if (n && n.central_idea !== core.map(x => x.he).join(' ')) say('the node\'s core idea is not the sourced Hebrew sentences')
    for (const loc of ['en', 'ru'] as const) {
      const e = env.ov[loc][r.id]
      if (e?.bio !== bio.map(x => x[loc]).join(' ')) say(`${loc} bio is not the sourced sentences`)
      if (e?.core_concept !== core.map(x => x[loc]).join(' ')) say(`${loc} core idea is not the sourced sentences`)
    }
  }
  return out
}

/** Every recorded link is in the corpus and in data.json with its evidence; both ends are on the roster. */
function linkProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) for (const l of r.links) {
    const at = `${r.id}: link ${l.a} ${l.type} ${l.b}`
    for (const end of [l.a, l.b]) if (!env.label[end]) out.push(`${at}: end ${end} is not on the roster`)
    if (!linkInCorpus(l, env.conn)) out.push(`${at} is not in the corpus (getAllConnections)`)
    env.copyLinks.forEach((links, i) => {
      const hit = links.find(x => x.source === l.a && x.target === l.b && x.type === l.type)
      if (!hit) out.push(`${at}: not in data.json copy ${i}`)
      else if (!hit.evidence_source?.trim()) out.push(`${at}: data.json copy ${i} gives it no evidence_source`)
    })
  }
  return out
}

/** Each place of each sage resolves to a region and to a point on the map; the places a record added are declared with their source. */
function placeProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) {
    const s = env.sage[r.id]
    if (!s) { out.push(`${r.id}: not in the corpus`); continue }
    if (regionsOf(s.location).length === 0) out.push(`${r.id}: "${s.location}" maps to no region`)
    for (const piece of s.location.split(/\s*;\s*/)) {
      const base = getAllSagesById().get(r.id)!
      if (!resolveCoords({ ...base, coordinates: undefined, lat: undefined, lng: undefined, location: piece } as never)) out.push(`${r.id}: "${piece}" has no map point`)
    }
    for (const p of r.new_places ?? []) {
      if (!p.coords_source?.url?.startsWith('https://') || !p.coords_source.quote?.trim()) out.push(`${r.id}: new place ${p.name}: no source for the coordinates`)
      if (!isDeepStrictEqual(regionsOf(p.name), [p.region])) out.push(`${r.id}: new place ${p.name}: regions ${JSON.stringify(regionsOf(p.name))}, declared ${p.region}`)
      const pt = resolveCoords({ ...getAllSagesById().get(r.id)!, coordinates: undefined, lat: undefined, lng: undefined, location: p.name } as never)
      if (!pt) out.push(`${r.id}: new place ${p.name}: no map point`)
      else if (Math.abs(pt.lat - p.lat) > 0.05 || Math.abs(pt.lng - p.lng) > 0.05) out.push(`${r.id}: new place ${p.name}: the map has (${pt.lat}, ${pt.lng}), the source (${p.lat}, ${p.lng})`)
    }
  }
  return out
}

/** A sage's places: the whole text maps to a region, and every single place has a map point. Five single places have no keyword of their own
 *  in lib/regions.ts (Amsterdam, Sarajevo and London for 689; Frankfurt and Fulda for 691); adding one would move the regions of existing
 *  sages, which is out of scope for this batch, so the check is at the level of the sage and the missing keywords are a follow-up
 *  listed in the record and in the owner's notes. */
function pieceRegionProblems(d: Doc, env: Env): string[] {
  return d.sages.flatMap(r => {
    const loc = env.sage[r.id]?.location ?? ''
    const out: string[] = []
    if (regionsOf(loc).length === 0) out.push(`${r.id}: "${loc}" maps to no region`)
    for (const p of loc.split(/\s*;\s*/).filter(Boolean)) if (!resolveCoords({ location: p } as never)) out.push(`${r.id}: "${p}" has no map point`)
    return out
  })
}

/** English and Russian: label, bio and core idea with no Hebrew in them and the right script; the vocabulary translates place, field and every tag. */
function langProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) for (const loc of ['en', 'ru'] as const) {
    const e = env.ov[loc][r.id]
    for (const f of ['label', 'bio', 'core_concept'] as const) {
      const t = e?.[f]?.trim()
      if (!t) out.push(`${r.id} ${loc}.${f}: missing`)
      else if (HEBREW.test(t)) out.push(`${r.id} ${loc}.${f}: Hebrew letters left in it`)
      else if (!(loc === 'en' ? LATIN : CYRILLIC).test(t)) out.push(`${r.id} ${loc}.${f}: not ${loc === 'en' ? 'Latin' : 'Cyrillic'}`)
    }
    const s = env.sage[r.id]
    if (!s) continue
    for (const [what, t] of [['place', s.location], ['field', s.field], ...s.tags.map(x => ['tag', x] as const)] as const) {
      if (!translateTerm(t, TERMS[loc], AND[loc])) out.push(`${r.id} ${loc}: no translation of the ${what} "${t}"`)
    }
    for (const [he, tr] of Object.entries(r.terms_added?.[loc] ?? {})) {
      if (TERMS[loc][he] !== tr) out.push(`${r.id} terms.${loc}["${he}"] is not "${tr}"`)
      if (!tr.trim() || HEBREW.test(tr)) out.push(`${r.id} terms.${loc}["${he}"] = "${tr}"`)
    }
  }
  return out
}

/** The paper block: Drive, Word file, attribution, line and word counts, the two copies. */
function creditProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) {
    const say = (m: string) => out.push(`${r.id}: ${m}`)
    const h = env.sets[r.id]?.he?.[0]
    if (!h) { say('no Hebrew research file'); continue }
    if (r.he?.lines !== h.content.split('\n').length) say(`he.lines ${r.he?.lines}, the file has ${h.content.split('\n').length}`)
    if (r.he?.words !== words(h.content)) say(`he.words ${r.he?.words}, the file has ${words(h.content)}`)
    if (r.docx !== docxName(h.title)) say(`docx "${r.docx}" is not the Word name of the title`)
    if (r.docx !== h.source_file) say(`docx "${r.docx}", the file's source_file "${h.source_file}"`)
    if (!env.dataFiles.includes(h.source_file)) say(`data/${h.source_file} is missing`)
    const hits = env.attribution.filter(a => a.file === h.source_file)
    if (hits.length !== 1) say(`${hits.length} attribution entries for ${h.source_file}`)
    else if (hits[0].sage_label !== env.label[r.id]) say(`attributed to "${hits[0].sage_label}"`)
    const c = r.copies
    if (!c || typeof c.identical !== 'boolean') say('copies is missing')
    else {
      if (c.identical && (c.a_lines !== r.he?.lines || c.b_lines !== r.he?.lines || c.differences.length !== 0)) say('copies say identical, but the lines or differences do not agree')
      if (!c.identical && c.differences.length === 0) say('copies differ, but no difference is listed')
      for (const x of c.differences ?? []) if (!['a', 'b', 'other'].includes(x.settled) || !x.how?.trim()) say(`difference at line ${x.line}: settled/how missing`)
    }
    if (!r.about_sage?.trim()) say('about_sage is missing')
    for (const f of ['disagreements', 'slips', 'footnotes'] as const) if (!Array.isArray(r[f])) say(`${f} is not a list`)
  }
  return out
}

/** Links of the papers: the record's paper_links are in data/links-from-research.json as recorded, quoted from the paper, and what became of each is true. */
function paperLinkProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) {
    const id = r.id
    const say = (m: string) => out.push(`${id}: ${m}`)
    const text = env.sets[id]?.he?.[0]?.content ?? ''
    if (!Array.isArray(r.paper_links)) { say('paper_links is not a list'); continue }
    for (const c of r.paper_links) {
      const at = `link ${c.a} ${c.type} ${c.b}`
      if (c.paper !== id) say(`${at}: the paper is ${c.paper}, not his own`)
      if (c.paper !== c.a && c.paper !== c.b) say(`${at}: the paper is not one of its ends`)
      if (c.a_label !== env.label[c.a]) say(`${at}: a_label "${c.a_label}" is not the roster's "${env.label[c.a]}"`)
      if (c.b_label !== env.label[c.b]) say(`${at}: b_label "${c.b_label}" is not the roster's "${env.label[c.b]}"`)
      if (c.type !== 'teacher' && c.type !== 'family') say(`${at}: type ${c.type}`)
      if (c.type === 'family' && !FAMILY.includes(c.relation ?? '')) say(`${at}: relation "${c.relation}"`)
      if (c.type === 'teacher' && c.relation) say(`${at}: a teacher link with a relation`)
      if (!inText(c.quote, text)) say(`${at}: the quote is not in the paper`)
      const rev = env.reviewed.filter(e => sameLink(e, c))
      if (rev.length !== 1) say(`${at}: ${rev.length} entries in data/links-from-research.json`)
      else if (!isDeepStrictEqual(rev[0], stripOutcome(c))) say(`${at}: the entry in data/links-from-research.json differs from the record's`)
      const inBuilt = builtHas(env.built, c.a, c.b, c.type)
      const inConn = connHas(env.conn, c.a, c.b, c.type)
      if (c.outcome === 'added') {
        if (!inBuilt) say(`${at}: outcome added, but it is not in public/data-paper-links.json`)
        else if (!env.built.some(e => e.quotes.some(q => q.paper === id && norm(q.quote) === norm(c.quote)))) say(`${at}: added, but the built entry does not carry this quote`)
        if (!inConn) say(`${at}: outcome added, but it is not in the corpus (getAllConnections)`)
      } else if (c.outcome === 'already-on-site') {
        if (!inConn) say(`${at}: outcome already-on-site, but the corpus does not hold it`)
        if (inBuilt) say(`${at}: outcome already-on-site, but it is in public/data-paper-links.json`)
      } else if (c.outcome === 'dropped') {
        if (inBuilt) say(`${at}: outcome dropped, but it is in public/data-paper-links.json`)
        if (!c.reason?.trim()) say(`${at}: dropped without a reason`)
      } else say(`${at}: outcome "${c.outcome}"`)
    }
    for (const e of env.reviewed.filter(x => x.paper === id)) {
      if (!r.paper_links.some(c => sameLink(c, e))) say(`data/links-from-research.json holds ${e.a} ${e.type} ${e.b}, which the record does not list`)
    }
    if (!Array.isArray(r.links_rejected)) say('links_rejected is not a list')
    for (const x of r.links_rejected ?? []) {
      const at = `rejected ${x.a} ${x.type} ${x.b}`
      if (!x.verdict?.trim()) say(`${at}: no verdict`)
      if (env.reviewed.some(e => e.paper === id && e.a === x.a && e.b === x.b && e.type === x.type)) say(`${at}: it is in data/links-from-research.json`)
      if (builtHas(env.built, x.a, x.b, x.type)) say(`${at}: it is in public/data-paper-links.json`)
    }
    if (r.paper_links.length === 0 && !r.links_none_reason?.trim()) say('no paper links, and no links_none_reason')
  }
  return out
}

/** Death dates: exactly one reviewed entry for each of the thirteen, equal to the record's; a date marked added is built under the roster's label. */
function yahrzeitProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) {
    const id = r.id
    const say = (m: string) => out.push(`${id}: ${m}`)
    const text = env.sets[id]?.he?.[0]?.content ?? ''
    const ys = env.yList.filter(y => y.id === id)
    if (ys.length !== 1) { say(`${ys.length} entries in data/yahrzeit-from-research.json`); continue }
    const y = ys[0]
    if (r.yahrzeit === null || r.yahrzeit === undefined) {
      if (y.day !== null && y.day !== undefined) say('the reviewed list has a date, the record has none')
      if (!y.reason?.trim()) say('day null in data/yahrzeit-from-research.json without a reason')
      if (!r.yahrzeit_none_reason?.trim()) say('no death date, and no yahrzeit_none_reason')
      if (env.yBuilt[id]) say('no death date in the record, but public/data-yahrzeit.json has one')
    } else {
      const z = r.yahrzeit
      if (!Number.isInteger(z.day) || z.day < 1 || z.day > 30) say(`death day ${z.day}`)
      if (!MONTHS.includes(z.month)) say(`death month "${z.month}"`)
      if (!inText(z.quote, text)) say('the death date quote is not in the paper')
      if (y.day !== z.day || y.month !== z.month || y.quote !== z.quote) say('the entry in data/yahrzeit-from-research.json differs from the record\'s')
      if (z.outcome === 'added') {
        const b = env.yBuilt[id]
        if (!b) say('death date added, but not in public/data-yahrzeit.json')
        else if (b.label !== env.label[id] || b.day !== z.day || b.month !== z.month) say(`public/data-yahrzeit.json says ${b.day} ${b.month} for "${b.label}"`)
      } else if (z.outcome === 'dropped') {
        if (env.yBuilt[id]) say('death date dropped, but public/data-yahrzeit.json has it')
      } else say(`death date outcome "${z.outcome}"`)
    }
  }
  return out
}

/** The Sefaria and Wikipedia side files name a sage only under the label they were matched on. */
function sideProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  for (const r of d.sages) for (const [name, file] of [['data-sefaria.json', env.sefaria], ['data-wikipedia.json', env.wiki]] as const) {
    const e = file[r.id]
    if (e && e.label !== env.label[r.id]) out.push(`${r.id}: ${name} was matched on "${e.label}", the roster says "${env.label[r.id]}"`)
  }
  return out
}

/** Links the second reader or the owner's decision removed: each has a reason, a quote and a source, and none is in the data or the corpus. */
function droppedProblems(d: Doc, env: Env): string[] {
  const out: string[] = []
  const have = new Set((d.dropped_links ?? []).map(x => `${x.a}>${x.b}`))
  for (const k of DROPPED) if (!have.has(k)) out.push(`dropped_links lacks ${k.replace('>', ' -> ')}`)
  for (const x of d.dropped_links ?? []) {
    const at = `dropped ${x.a} ${x.type} ${x.b}`
    if (!x.reason?.trim()) out.push(`${at}: no reason`)
    if (!x.quote?.trim()) out.push(`${at}: no quote`)
    if (!x.source?.startsWith('https://')) out.push(`${at}: no https source`)
    const paper = IDSET.has(x.a) ? x.a : IDSET.has(x.b) ? x.b : null
    if (x.source?.startsWith('https://docs.google.com/document/d/') && x.quote) {
      // a quote from one of the owner's papers is in the paper it was read in
      const t = TABLE.find(t => x.source.includes(t.doc))
      const text = t ? env.sets[t.id]?.he?.[0]?.content : null
      if (text && !inText(x.quote, text)) out.push(`${at}: the quote is not in paper ${t!.id}`)
    }
    if (!paper && !IDSET.has(x.sage ?? '')) out.push(`${at}: neither end is a sage of this batch`)
    env.copyLinks.forEach((links, i) => {
      if (links.some(l => l.type === x.type && ((l.source === x.a && l.target === x.b) || (x.type === 'teacher' && l.type === 'student' && l.source === x.b && l.target === x.a)))) out.push(`${at}: it is in data.json copy ${i}`)
    })
    if (linkInCorpus(x, env.conn) && connHas(env.conn, x.a, x.b, x.type)) out.push(`${at}: it is in the corpus (getAllConnections)`)
    if (env.conn.some(c => c.type === x.type && c.source === x.a && c.target === x.b)) out.push(`${at}: it is in the corpus (getAllConnections)`)
  }
  return out
}

/** The second reader's counts and what was applied. */
function readingProblems(d: Doc): string[] {
  const out: string[] = []
  for (const r of d.sages) {
    const c = readingCounts(r.reading)
    const say = (m: string) => out.push(`${r.id}: ${m}`)
    for (const k of ['ok', 'imprecise', 'wrong'] as const) if (!Number.isInteger(c[k]) || (c[k] as number) < 0) say(`reading.${k} is "${c[k]}"`)
    if (!Array.isArray(r.reading?.applied)) say('reading.applied is not a list')
    else if (((c.imprecise ?? 0) + (c.wrong ?? 0)) > 0 && r.reading.applied.length === 0) say('the reader found something to correct and the record says nothing was applied')
    if ((c.ok ?? 0) + (c.imprecise ?? 0) + (c.wrong ?? 0) === 0) say('the reading judged nothing')
  }
  return out
}

function allProblems(d: Doc, env: Env): string[] {
  return [
    ...topProblems(d), ...identityProblems(d, env), ...nodeProblems(d, env), ...d.sages.flatMap(r => sageProblems(r, id => paperOf(env, id))),
    ...textProblems(d, env), ...linkProblems(d, env), ...placeProblems(d, env), ...langProblems(d, env), ...creditProblems(d, env),
    ...paperLinkProblems(d, env), ...yahrzeitProblems(d, env), ...sideProblems(d, env), ...droppedProblems(d, env), ...readingProblems(d),
  ]
}
const paperOf = (env: Env, id: string): string | null => env.sets[id]?.he?.[0]?.content ?? null

// ---- the real data -------------------------------------------------------------------------------------------------------------
const sages = getAllSages()
const byId = new Map(sages.map(s => [s.id, s]))
function getAllSagesById() { return byId }
const rec = readJson<Doc>(join(REPO, 'data/owner-additions-2026-10b.json'))
const dataJsonA = join(REPO, 'data.json')
const dataJsonB = join(APP, 'public/data.json')
const nodesOf = (f: string) => Object.fromEntries(readJson<{ nodes: RawNode[] }>(f).nodes.filter(n => IDSET.has(n.id)).map(n => [n.id, n]))
const linksOf = (f: string) => readJson<{ links: RawLink[] }>(f).links.filter(l => IDSET.has(String(l.source)) || IDSET.has(String(l.target)) || DROPPED.some(k => k === `${l.source}>${l.target}`))

const sheetRows = readFirstSheet(join(REPO, 'data/חכמי_ישראל.xlsx'))
const header = sheetRows.get(1)!
const col = (pred: (h: string) => boolean): string => {
  const hit = [...header.entries()].find(([, h]) => pred(h))
  assert.ok(hit, 'a column of the sheet is missing')
  return hit[0]
}
const COL = {
  id: col(h => h === 'מזהה'), label: col(h => h.startsWith('שם הדמות')), years: col(h => h.startsWith('שנים')), region: col(h => h.startsWith('אזור')),
  era: col(h => h === 'תקופה'), field: col(h => h.startsWith('תחום')), tags: col(h => h === 'תגיות'), bio: col(h => h.startsWith('תקציר')),
  core: col(h => h.startsWith('רעיון')), spotify: col(h => h.includes('ספוטיפיי')),
}
const sheetOf: Record<string, Cells[]> = {}
const sheetOrder: string[] = []
for (const r of [...sheetRows.keys()].filter(k => k > 1).sort((a, b) => a - b)) {
  const row = sheetRows.get(r)!
  const id = row.get(COL.id)
  if (!id || !IDSET.has(id)) continue
  sheetOrder.push(id)
  ;(sheetOf[id] ??= []).push({
    label: row.get(COL.label), years: row.get(COL.years), region: row.get(COL.region), era: row.get(COL.era), field: row.get(COL.field),
    tags: row.get(COL.tags), bio: row.get(COL.bio), core: row.get(COL.core), spotify: row.get(COL.spotify),
  })
}

const keyedLabels = <T extends { label: string }>(m: Record<string, T>): Record<string, { label: string }> =>
  Object.fromEntries(Object.entries(m).filter(([k]) => IDSET.has(k)).map(([k, v]) => [k, { label: v.label }]))
const realEnv: Env = {
  label: Object.fromEntries(sages.map(s => [s.id, s.label])),
  sage: Object.fromEntries(IDS.map(id => [id, { location: byId.get(id)?.location ?? '', field: byId.get(id)?.field ?? '', tags: byId.get(id)?.tags ?? [] }])),
  sets: Object.fromEntries(IDS.map(id => [id, readPaperSet(id)])),
  dataFiles: IDS.flatMap(id => { const f = readPaperSet(id).he?.[0]?.source_file; return f && existsSync(join(REPO, 'data', f)) ? [f] : [] }),
  attribution: readJson<{ documents: Array<{ file: string; sage_label: string }> }>(join(REPO, 'data/research_attribution.json')).documents,
  copies: [nodesOf(dataJsonA), nodesOf(dataJsonB)],
  copyLinks: [linksOf(dataJsonA), linksOf(dataJsonB)],
  sheet: sheetOf,
  ov: {
    en: Object.fromEntries(IDS.map(id => [id, overlayEntry(id, 'en')])),
    ru: Object.fromEntries(IDS.map(id => [id, overlayEntry(id, 'ru')])),
  },
  conn: getAllConnections().filter(c => IDSET.has(String(c.source)) || IDSET.has(String(c.target)) || DROPPED.some(k => k === `${c.source}>${c.target}`)).map(c => ({ source: String(c.source), target: String(c.target), type: c.type })),
  reviewed: readJson<Reviewed[]>(join(REPO, 'data/links-from-research.json')),
  built: readJson<{ links: BuiltLink[] }>(join(APP, 'public/data-paper-links.json')).links,
  yList: readJson<YItem[]>(join(REPO, 'data/yahrzeit-from-research.json')),
  yBuilt: readJson<BuiltY>(join(APP, 'public/data-yahrzeit.json')),
  sefaria: keyedLabels(readJson<{ authors: Record<string, { label: string }> }>(join(APP, 'public/data-sefaria.json')).authors),
  wiki: keyedLabels(readJson<{ sages: Record<string, { label: string }> }>(join(APP, 'public/data-wikipedia.json')).sages),
}

// =====================================================================================================================
// the record, the roster and the node
// =====================================================================================================================
console.log('\ndata/owner-additions-2026-10b.json')

test('the record holds exactly the ids 686-698, once each, in order, with the date and the Drive folder [waits for the final record: date, drive_folder]', () => {
  assert.deepEqual(topProblems(rec), [])
})

test('every id is still the sage the record was written for: the label the record holds, the one pinned here and the roster\'s are one; the Drive document is the plan\'s [waits for the record: key, drive]', () => {
  assert.deepEqual(identityProblems(rec, realEnv), [])
  const drifted = TABLE.filter(t => byId.get(t.id)?.label !== t.label).map(t => `${t.id}: pinned "${t.label}", roster "${byId.get(t.id)?.label}"`)
  assert.deepEqual(drifted, [], 'an id now belongs to someone else: re-read the paper')
})

test('the thirteen are the only sages this record adds: no id of the record is below 686 or above 698 (the roster may have more, later)', () => {
  assert.ok(rec.sages.every(r => Number(r.id) >= 686 && Number(r.id) <= 698))
  assert.ok(Math.max(...sages.map(s => Number(s.id))) >= 698)
  assert.equal(new Set(sages.map(s => s.id)).size, sages.length, 'an id twice on the roster')
})

test('no model or tool name anywhere in the record', () => {
  assert.doesNotMatch(readFileSync(join(REPO, 'data/owner-additions-2026-10b.json'), 'utf8'), /\b(claude|sonnet|opus|haiku|anthropic|gemini|llama)\b|gpt-?\d|mcp__|read_file_content|fetch\.py/i)
})

test('each sage has a node in both data.json copies (label, years, period, field, place, bio, core idea, 4+ tags, no episode, has_research), the copies are byte-identical, and the sheet row equals the node', () => {
  assert.ok(readFileSync(dataJsonA).equals(readFileSync(dataJsonB)), 'data.json and nextjs-app/public/data.json differ')
  assert.deepEqual(nodeProblems(rec, realEnv), [])
  for (const t of TABLE) assert.equal(byId.get(t.id)?.has_research, true, t.id)
})

test('the sheet holds the thirteen rows in id order, after the earlier ones', () => {
  assert.deepEqual(sheetOrder, IDS)
  const rowNo = (id: string) => [...sheetRows.keys()].find(k => k > 1 && sheetRows.get(k)!.get(COL.id) === id)!
  assert.ok(rowNo('686') > rowNo('685'), '686 comes after 685')
})

test('every record has sources with https URLs and verbatim quotes, every sentence of the bio and core idea has support among them, a paper source is his own paper', () => {
  assert.deepEqual(rec.sages.flatMap(r => sageProblems(r, id => paperOf(realEnv, id))), [])
})

test('a bio and a core idea are exactly the sourced sentences: the node and the overlays show what the record sourced, in three languages', () => {
  assert.deepEqual(textProblems(rec, realEnv), [])
})

test('every recorded link is in the corpus (getAllConnections), both ends are on the roster, and data.json (both copies) holds it with an evidence_source', () => {
  assert.deepEqual(linkProblems(rec, realEnv), [])
  // 691 (the Maharam Schiff) and 696 (Abraham Zacut) have no recorded link and no paper link, on purpose: for 691 the only candidates (the Shelah as his
  // teacher, the Maharal's pupil Heller and the Chatam Sofer's use of him) rested on the owner's paper alone and the second reader dropped them (see
  // dropped_links); 696's paper names no teacher, student or relative on the roster. Every other new sage has one. If a link is added, take him out.
  const NO_LINK = new Set(['691', '696'])
  const linked = new Set(rec.sages.filter(r => r.links.length > 0 || (r.paper_links ?? []).length > 0).map(r => r.id))
  for (const id of IDS) {
    if (NO_LINK.has(id)) assert.ok(!linked.has(id), `${id} was recorded without a link on purpose: if a link is added, say why and take him out of NO_LINK`)
    else assert.ok(linked.has(id), `${id} is on no recorded link: a new sage is linked to a sage on the roster, or says why not`)
  }
})

// =====================================================================================================================
// places
// =====================================================================================================================
console.log('\nplaces')

test('every place of every sage resolves to a region and a map point; the places the record added are declared with their source and the gazetteer agrees', () => {
  assert.deepEqual(placeProblems(rec, realEnv), [])
})

test('a sage\'s places map to a region as a whole and each place has a map point (five single places have no keyword of their own: a follow-up, see the record)', () => {
  assert.deepEqual(pieceRegionProblems(rec, realEnv), [])
})

test('the place keywords: Sens is tsarfat; Mahdia and Tunis north-africa; Salamanca sefarad; Bursa and Adrianople mizrach; Posen and Szydlowiec east-europe; Eisenstadt, Prostejov and Mikulov ashkenaz; each has a map point', () => {
  const want: Array<[string, string]> = [
    ['סנס', 'tsarfat'], ['מהדיה', 'north-africa'], ['טוניס', 'north-africa'], ['סלמנקה', 'sefarad'], ['בורסה', 'mizrach'], ['אדריאנופול', 'mizrach'],
    ['פוזנא', 'east-europe'], ['שידלובצא', 'east-europe'], ['אייזנשטט', 'ashkenaz'], ['פרוסניץ', 'ashkenaz'], ['ניקלשבורג', 'ashkenaz'],
  ]
  const base = byId.get('686')!
  for (const [place, region] of want) {
    assert.deepEqual(regionsOf(place), [region], place)
    const pt = resolveCoords({ ...base, coordinates: undefined, lat: undefined, lng: undefined, location: place } as never)
    assert.ok(pt && Number.isFinite(pt.lat) && Number.isFinite(pt.lng), `${place}: no map point`)
  }
})

test('the four existing sages whose place gained a region are pinned by label: R. Akiva Eiger (Posen), Dr. Hildesheimer (Eisenstadt), the Alshich and R. Avraham Sabba (Adrianople twice)', () => {
  const pinned: Array<[string, string[]]> = [
    ['הרב עקיבא איגר', ['east-europe']],
    ['הרב ד״ר עזריאל הילדסהיימר', ['ashkenaz', 'eretz-israel']],
    ['רבי משה אלשיך (האלשיך הקדוש)', ['eretz-israel', 'mizrach']],
    ['רבי אברהם סבע (בעל צרור המור)', ['sefarad', 'north-africa', 'mizrach']],
  ]
  for (const [label, regions] of pinned) {
    const s = sages.find(x => x.label === label)
    assert.ok(s, `no sage labelled ${label}`)
    assert.deepEqual(regionsOf(s.location), regions, label)
  }
  // by label, not by id: the ids the plan names are 202, 526, 630 and 669
  assert.deepEqual(['202', '526', '630', '669'].map(id => byId.get(id)?.label), pinned.map(p => p[0]))
})

// =====================================================================================================================
// English and Russian
// =====================================================================================================================
console.log('\nEnglish and Russian')

test('a label, a bio and a core idea in each language for each sage (no Hebrew in them, Latin in en, Cyrillic in ru), and the vocabulary translates the place, field and every tag', () => {
  assert.deepEqual(langProblems(rec, realEnv), [])
})

test('the roster\'s label conventions: (בעל X) is "(the X)" in English and "(«X»)" in Russian', () => {
  for (const t of TABLE) {
    const en = overlayEntry(t.id, 'en')?.label ?? ''
    const ru = overlayEntry(t.id, 'ru')?.label ?? ''
    if (/\(בעל /.test(t.label)) {
      assert.match(en, /\(the [^()]+\)$/, `${t.id} "${en}"`)
      assert.match(ru, /\(«[^()»]+»\)$/, `${t.id} "${ru}"`)
    }
  }
})

test('the label of 698 is "רב (אבא אריכא)", so that a question holding only הרב, רבו or Rav Kook is not Rav (automaticAnswer.test.ts holds the matcher)', () => {
  assert.equal(rec.sages.find(r => r.id === '698')?.label, 'רב (אבא אריכא)')
  assert.equal(byId.get('698')?.label, 'רב (אבא אריכא)')
})

// =====================================================================================================================
// the papers
// =====================================================================================================================
console.log('\nthe thirteen papers in three languages')

test('each of the thirteen has a Hebrew, English and Russian research file that passes the paper rules [waits for the English and Russian files]', () => {
  assert.deepEqual(TABLE.flatMap(t => paperProblems(t.id, realEnv.sets[t.id], t.key)), [])
})

test('the Hebrew files alone pass the Hebrew paper rules (title is the first line, source_file, word_count, no debris, Arabic only where allowed, names the sage)', () => {
  const only = (id: string) => ({ ...realEnv.sets[id], en: realEnv.sets[id].en ?? realEnv.sets[id].he, ru: realEnv.sets[id].ru ?? realEnv.sets[id].he })
  const heProblems = TABLE.flatMap(t => paperProblems(t.id, only(t.id), t.key).filter(p => !/en document|ru document/.test(p)))
  assert.deepEqual(heProblems, [])
})

test('the thirteen Hebrew texts and titles are all different, and no title holds another paper\'s key', () => {
  assert.deepEqual(distinctProblems(realEnv.sets), [])
})

test('the record\'s key is the word the paper must carry: with it the Hebrew files pass too [waits for the record: key]', () => {
  const bad = rec.sages.flatMap(r => paperProblems(r.id, { ...realEnv.sets[r.id], en: realEnv.sets[r.id].he, ru: realEnv.sets[r.id].he }, r.key ?? '\u0000').filter(p => /Hebrew document/.test(p)))
  assert.deepEqual(bad, [])
})

test('the page knows: has_research for the thirteen (in the corpus the pages read)', () => {
  for (const t of TABLE) assert.equal(byId.get(t.id)?.has_research, true, t.id)
})

test('each paper is credited: its Word file is in data/ and research_attribution.json gives it to the sage under his roster label; the paper block agrees with the files [waits for the record: docx, he, copies]', () => {
  assert.deepEqual(creditProblems(rec, realEnv), [])
})

// the files themselves, apart from the record: the credit holds even before the record's paper block is written
test('the credit alone, from the files: a Word file in data/ and exactly one attribution entry under the roster\'s label for each paper', () => {
  for (const t of TABLE) {
    const f = readPaperSet(t.id).he?.[0]?.source_file
    assert.ok(f && f.endsWith('.docx') && existsSync(join(REPO, 'data', f)), `${t.id}: data/${f} is missing`)
    const hits = realEnv.attribution.filter(a => a.file === f)
    assert.equal(hits.length, 1, `${t.id}: ${hits.length} attribution entries for ${f}`)
    assert.equal(hits[0].sage_label, byId.get(t.id)!.label, `${t.id}: attributed to ${hits[0].sage_label}`)
  }
})

console.log('\nthe Arabic phrase of paper 687')

test('paper 687 names the Arabic original of the Guide in Arabic letters, exactly as the owner wrote it, and nothing else in it is Arabic', () => {
  const text = realEnv.sets['687'].he![0].content
  assert.ok(text.includes('دلالة الحائرين'), 'the owner\'s phrase is not in the paper any more')
  assert.ok(!ARABIC.test(withoutAllowed('687', text)), 'another Arabic letter in 687')
  assert.deepEqual(ARABIC_ALLOWED, { '687': ['دلالة الحائرين'] })
})

test('no other paper holds an Arabic letter, and the translations of 687 hold only the exact allowed phrase (the Russian keeps the Hebrew\'s, the English has none)', () => {
  for (const t of TABLE.filter(x => x.id !== '687')) assert.ok(!ARABIC.test(realEnv.sets[t.id].he?.[0]?.content ?? ''), `${t.id} has Arabic letters`)
  for (const lang of ['en', 'ru'] as const) {
    const tr = realEnv.sets['687'][lang]
    assert.ok(tr, `687 has no ${lang} research file yet`)
    assert.ok(!ARABIC.test(withoutAllowed('687', tr.map(x => x.content).join('\n') + tr.map(x => x.title).join('\n'))), `687 ${lang} holds Arabic letters other than the allowed phrase`)
  }
  assert.deepEqual(paperProblems('687', realEnv.sets['687'], keyOf('687')), [])
})

// =====================================================================================================================
// links, death dates, side files
// =====================================================================================================================
console.log('\nthe side files')

test('paper links: each paper_link of the record has its quote in the paper, the roster\'s labels and its exact entry in data/links-from-research.json, and what became of it is true [waits for the merge and the record\'s outcomes]', () => {
  assert.deepEqual(paperLinkProblems(rec, realEnv), [])
})

test('death dates: data/yahrzeit-from-research.json has exactly one entry for each of the thirteen, equal to the record\'s; a date marked added is in data-yahrzeit.json under the roster\'s label [waits for the merge]', () => {
  assert.deepEqual(yahrzeitProblems(rec, realEnv), [])
})

test('the entries data-sefaria.json and data-wikipedia.json hold for the thirteen carry the roster\'s label (the id was matched on that sage)', () => {
  assert.deepEqual(sideProblems(rec, realEnv), [])
})

test('the side-file guards: the namesakes are not linked (the Ramaz is not Zacut, the Ran is not Nissim of Kairouan, Mahari Berab and Rav Huna are not Rav)', () => {
  const pairs: Array<[string, string]> = [['696', 'רבי משה זכות (הרמ״ז)'], ['690', 'הר״ן'], ['698', 'רב הונא'], ['698', 'מהרי״ב']]
  for (const [id, frag] of pairs) {
    for (const [name, file] of [['data-sefaria.json', realEnv.sefaria], ['data-wikipedia.json', realEnv.wiki]] as const) {
      const e = file[id]
      if (e) assert.ok(!e.label.includes(frag), `${name}: ${id} is matched on a namesake ${e.label}`)
    }
  }
})

test('dropped links: the eight the plan names are listed, each with a reason, a quote and a source, and none is in data.json (either copy) or in getAllConnections() [waits for the record: dropped_links]', () => {
  assert.deepEqual(droppedProblems(rec, realEnv), [])
})

test('the second reading: every sage has its counts and what was applied', () => {
  assert.deepEqual(readingProblems(rec), [])
})

// =====================================================================================================================
// the rules fire
// =====================================================================================================================
console.log('\nthe paper rules fire, one broken copy each (on the earlier paper of 630, which has all three files)')

test('630 and 631 (earlier papers) pass the paper rules as they are', () => {
  for (const [id, key] of [['630', 'אלשיך'], ['631', 'שמואל']]) assert.deepEqual(paperProblems(id, readPaperSet(id), key), [], id)
})
{
  const copy = () => deep(readPaperSet('630'))
  const dropLast = (d: PaperDoc) => { d.content = d.content.split('\n').slice(0, -1).join('\n') }
  const mutations: Array<[string, (s: PaperSet) => void, RegExp]> = [
    ['an English file is missing', s => { s.en = null }, /no en research file/],
    ['the Hebrew file is missing', s => { s.he = null }, /no Hebrew research file/],
    ['a translation has a line fewer', s => { dropLast(s.en![0]) }, /en document 0: \d+ lines, the Hebrew has \d+/],
    ['a citation marker differs', s => { s.ru![0].content = s.ru![0].content.replace(/\[cite: (\d+)/, '[cite: 99$1') }, /markers differ/],
    ['the Hebrew source_file is not the title\'s .docx', s => { s.he![0].source_file = 'something.docx' }, /is not the \.docx of the title/],
    ['a translation\'s source_file differs from the Hebrew\'s', s => { s.ru![0].source_file = 'something.docx' }, /source_file differs/],
    ['the Hebrew word_count is off by one', s => { s.he![0].word_count += 1 }, /Hebrew document 0: word_count/],
    ['a translation\'s word_count is off by one', s => { s.en![0].word_count += 1 }, /en document 0: word_count/],
    ['markdown debris in the Hebrew', s => { s.he![0].content = '**' + s.he![0].content }, /markdown debris/],
    ['a blank line in the Hebrew', s => { s.he![0].content += '\n \nx'; s.he![0].word_count = words(s.he![0].content) }, /blank or untrimmed/],
    ['an English title that is still Hebrew', s => { s.en![0].title = 'כותרת בעברית' }, /still Hebrew/],
    ['an empty line in a translation', s => { const l = s.ru![0].content.split('\n'); l[3] = ''; s.ru![0].content = l.join('\n') }, /an empty line/],
    ['the Russian file is a copy of the Hebrew', s => { s.ru![0].content = s.he![0].content; s.ru![0].word_count = s.he![0].word_count }, /still Hebrew/],
    ['the English file is the Russian text', s => { s.en![0].content = s.ru![0].content; s.en![0].word_count = s.ru![0].word_count }, /less than 80% of the letters are Latin/],
    ['the separator line is not kept', s => { const l = s.en![0].content.split('\n'); const k = l.findIndex(x => /^-{20,}$/.test(x)); l[k] = '- - -'; s.en![0].content = l.join('\n') }, /separator line is not kept/],
    ['table cells differ', s => { const l = s.en![0].content.split('\n'); const k = l.findIndex(x => x.includes(' | ')); l[k] = l[k].replace(/ \| /g, ' / '); s.en![0].content = l.join('\n') }, /table cells differ/],
    ['the text no longer names the sage', s => { s.he![0].content = s.he![0].content.replace(/אלשיך/g, 'פלוני'); s.he![0].word_count = words(s.he![0].content) }, /names the sage/],
  ]
  for (const [name, mutate, re] of mutations) test(`paper rule fires: ${name}`, () => {
    const s = copy(); mutate(s)
    const found = paperProblems('630', s, 'אלשיך')
    assert.ok(found.some(p => re.test(p)), `no problem matching ${re} in ${JSON.stringify(found)}`)
  })
}

test('paper rule fires: a paper copied under a namesake\'s id (692 holding the Maharam Schiff\'s text) is found by the distinctness rule', () => {
  const sets = deep(realEnv.sets)
  sets['692'] = deep(sets['691'])
  const found = distinctProblems(sets)
  assert.ok(found.some(p => /691 and 692: the same Hebrew text/.test(p)), JSON.stringify(found))
  assert.ok(found.some(p => /692: the title holds 691's key/.test(p)) || found.some(p => /691 and 692: the same title/.test(p)), JSON.stringify(found))
})

test('paper rule fires: the Maharam Schiff\'s text under the Maharam Esh\'s id fails the Maharam Esh\'s own paper rules (the title does not name him)', () => {
  const set = deep(realEnv.sets['691'])
  const found = paperProblems('692', { he: set.he, en: set.he, ru: set.he }, keyOf('692'))
  assert.ok(found.some(p => /the title does not name the sage/.test(p)), JSON.stringify(found))
})

console.log('\nthe Arabic rule fires')

{
  const heOnly = (id: string) => { const s = deep(realEnv.sets[id]); return { he: s.he, en: s.he, ru: s.he } as PaperSet }
  const arabicOf = (found: string[]) => found.filter(p => /Hebrew document \d: Arabic letters/.test(p))
  test('Arabic rule: the owner\'s phrase in 687 is let through', () => {
    assert.deepEqual(arabicOf(paperProblems('687', heOnly('687'), keyOf('687'))), [])
  })
  test('Arabic rule fires: another Arabic letter in 687 fails', () => {
    const s = heOnly('687'); s.he![0].content += ' ب'
    assert.equal(arabicOf(paperProblems('687', s, keyOf('687'))).length, 1)
  })
  test('Arabic rule fires: the phrase with an Arabic letter stuck to it in 687 fails (only the exact phrase is allowed)', () => {
    const s = heOnly('687'); s.he![0].content = s.he![0].content.replace('دلالة الحائرين', 'دلالة الحائرينب')
    assert.equal(arabicOf(paperProblems('687', s, keyOf('687'))).length, 1)
  })
  test('Arabic rule fires: another Arabic phrase in 687 fails', () => {
    const s = heOnly('687'); s.he![0].content += ' مرشد'
    assert.equal(arabicOf(paperProblems('687', s, keyOf('687'))).length, 1)
  })
  test('Arabic rule fires: the same phrase in another sage\'s paper (686) fails', () => {
    const s = heOnly('686'); s.he![0].content += ' دلالة الحائرين'
    assert.equal(arabicOf(paperProblems('686', s, keyOf('686'))).length, 1)
  })
  test('Arabic rule: the exact phrase in a translation of 687 is let through (the Russian file keeps it as the Hebrew has it)', () => {
    for (const lang of ['en', 'ru'] as const) {
      const s = deep(readPaperSet('630')); s[lang]![0].content += ' دلالة الحائرين'; s[lang]![0].word_count = words(s[lang]![0].content)
      const found = paperProblems('687', s, 'אלשיך')
      assert.ok(!found.some(p => new RegExp(`${lang} document 0: Arabic letters`).test(p)), JSON.stringify(found))
    }
  })
  test('Arabic rule fires: another Arabic string in a translation of 687 fails', () => {
    for (const lang of ['en', 'ru'] as const) {
      const s = deep(readPaperSet('630')); s[lang]![0].content += ' مرشد الحائرين'; s[lang]![0].word_count = words(s[lang]![0].content)
      const found = paperProblems('687', s, 'אלשיך')
      assert.ok(found.some(p => new RegExp(`${lang} document 0: Arabic letters`).test(p)), JSON.stringify(found))
    }
  })
  test('Arabic rule fires: the allowed phrase in a translation of another sage (686) fails', () => {
    for (const lang of ['en', 'ru'] as const) {
      const s = deep(readPaperSet('630')); s[lang]![0].content += ' دلالة الحائرين'; s[lang]![0].word_count = words(s[lang]![0].content)
      const found = paperProblems('686', s, 'אלשיך')
      assert.ok(found.some(p => new RegExp(`${lang} document 0: Arabic letters`).test(p)), JSON.stringify(found))
    }
  })
  test('Arabic rule: translations without Arabic letters pass the plain rule for 687 (the earlier paper of 630 under the id 687)', () => {
    const found = paperProblems('687', deep(readPaperSet('630')), 'אלשיך')
    assert.ok(!found.some(p => /Arabic/.test(p)), JSON.stringify(found))
  })
}

console.log('\nthe record rules fire, on a hand-made state after the integration (the real files plus what it still adds)')

/**
 * A consistent "after" state: the record's paper block filled in (key, Drive, Word name, line counts, the two copies, empty lists, an outcome
 * for every paper link, a death-date outcome or a reason), the reviewed lists and the built files holding what the record says, and every
 * outcome true: the first paper link of a sage is "added" (built and in the corpus), the second "already-on-site" (in the corpus, not built),
 * the third "dropped" with a reason, the fourth added again.
 */
function fixture(): { doc: Doc; env: Env } {
  const doc = deep(rec)
  const env = deep(realEnv)
  doc.date = '2026-11-01'
  doc.drive_folder = DRIVE_FOLDER
  doc.dropped_links = DROPPED.map(k => {
    const [a, b] = k.split('>')
    return { sage: IDSET.has(a) ? a : b, a, b, type: 'teacher', quote: 'a sentence of the source', source: 'https://example.org/page', reason: 'rests on the paper alone' }
  })
  for (const r of doc.sages) {
    const t = TABLE.find(x => x.id === r.id)!
    const h = env.sets[r.id].he![0]
    r.key = t.key
    r.drive = { doc: t.doc, title: t.title }
    r.docx = h.source_file
    r.he = { lines: h.content.split('\n').length, words: words(h.content) }
    r.copies = { a_lines: r.he.lines, b_lines: r.he.lines, identical: true, differences: [] }
    r.about_sage = 'his own paper'
    r.disagreements = []; r.slips = []; r.footnotes = []
    r.links_rejected = [{ a: r.id, b: '1', type: 'teacher', quote: 'a sentence the second reader rejected', verdict: 'not stated for his own sage' }]
    r.paper_links.forEach((c, i) => {
      c.outcome = ['added', 'already-on-site', 'dropped', 'added'][i % 4]
      if (c.outcome === 'dropped') c.reason = 'a doubtful relation the second reader did not confirm'
      else delete c.reason
      const key = { paper: c.paper, a: c.a, b: c.b, type: c.type }
      env.reviewed = [...env.reviewed.filter(e => !sameLink(e, key)), stripOutcome(c)]
      env.built = env.built.filter(e => !builtHas([e], c.a, c.b, c.type) || !e.quotes.some(q => q.paper === c.paper))
      const present = connHas(env.conn, c.a, c.b, c.type)
      if (c.outcome !== 'dropped' && !present) env.conn.push({ source: c.a, target: c.b, type: c.type })
      if (c.outcome === 'added') env.built.push({ source: c.a, target: c.b, type: c.type, relation: c.relation, quotes: [{ paper: c.paper, quote: c.quote }] })
    })
    if (r.paper_links.length === 0) r.links_none_reason = 'the paper states no teacher or family relation of its own sage'
    if (r.yahrzeit) {
      r.yahrzeit.outcome = 'added'
      env.yList = [...env.yList.filter(y => y.id !== r.id), { id: r.id, day: r.yahrzeit.day, month: r.yahrzeit.month, quote: r.yahrzeit.quote }]
      env.yBuilt[r.id] = { label: env.label[r.id], day: r.yahrzeit.day, month: r.yahrzeit.month, quote: r.yahrzeit.quote }
    } else {
      r.yahrzeit = null; r.yahrzeit_none_reason = 'the paper gives no Hebrew date of his death'
      env.yList = [...env.yList.filter(y => y.id !== r.id), { id: r.id, day: null, reason: 'the paper gives no Hebrew date of his death' }]
      delete env.yBuilt[r.id]
    }
  }
  return { doc, env }
}

test('the hand-made state is clean for the rules that wait on the integration (paper block, links of the papers, death dates, dropped links, reading) and for the rules that read real data', () => {
  const { doc, env } = fixture()
  const found = allProblems(doc, env)
  assert.deepEqual(found, [])
})

{
  const fires = (name: string, mutate: (d: Doc, e: Env) => void, re: RegExp) => test(`record rule fires: ${name}`, () => {
    const { doc, env } = fixture()
    mutate(doc, env)
    const found = allProblems(doc, env)
    assert.ok(found.some(p => re.test(p)), `no problem matching ${re} in ${JSON.stringify(found.slice(0, 8))}`)
  })
  const R = (d: Doc, id: string) => d.sages.find(r => r.id === id)!
  const firstOf = (d: Doc, id: string, outcome: string) => R(d, id).paper_links.find(c => c.outcome === outcome)!
  // identity
  fires('a record label swapped for a namesake\'s', d => { R(d, '691').label = TABLE.find(t => t.id === '692')!.label }, /691: record label/)
  fires('an id that now belongs to someone else (the roster\'s label changed)', (_d, e) => { e.label['696'] = 'רבי משה זכות (הרמ״ז)' }, /696: record label .* roster/)
  fires('a sage missing from the record', d => { d.sages = d.sages.filter(r => r.id !== '698') }, /not 686-698 once each/)
  fires('a sage listed twice', d => { d.sages.push(deep(d.sages[0])) }, /not 686-698 once each/)
  fires('an id above 698 in the record', d => { R(d, '698').id = '699' }, /not 686-698 once each/)
  fires('the Drive document differs from the plan\'s', d => { R(d, '690').drive.doc = 'x' }, /690: Drive document/)
  fires('the wrong Drive folder', d => { d.drive_folder = 'x' }, /drive_folder/)
  fires('the record has no key', d => { delete (R(d, '693') as Partial<Rec>).key }, /693: the record's key/)
  // the node and the sheet
  fires('has_research false in one data.json copy', (_d, e) => { e.copies[1]['694']!.has_research = false }, /694: data\.json copy 1: has_research/)
  fires('a node missing from a data.json copy', (_d, e) => { delete e.copies[0]['695'] }, /695: data\.json copy 0: no node/)
  fires('the two data.json copies differ', (_d, e) => { e.copies[1]['696']!.label = 'x' }, /696: data\.json copy 1: node label/)
  fires('a non-empty spotify_url', (_d, e) => { e.copies[0]['697']!.spotify_url = 'https://open.spotify.com/episode/x' }, /697: data\.json copy 0: spotify_url/)
  fires('fewer than 4 tags', (_d, e) => { e.copies[0]['688']!.tags = 'a, b, c' }, /688: data\.json copy 0: fewer than 4 tags/)
  fires('the sheet row differs from the node', (_d, e) => { e.sheet['689'][0].bio = 'x' }, /689: sheet bio/)
  fires('the sheet row is missing', (_d, e) => { e.sheet['689'] = [] }, /689: 0 rows in the sheet/)
  // the sage rules
  fires('a bio sentence with no support', d => { R(d, '686').sentences.bio[0].support = [] }, /686: bio 1: no support/)
  fires('a support that points at a source that does not exist', d => { R(d, '686').sentences.bio[0].support[0].src = 99 }, /does not exist/)
  fires('a support quote that is not among the source\'s quotes', d => { R(d, '686').sentences.bio[0].support[0].quote += ' and more' }, /not among source/)
  fires('a paper source without the paper id', d => { delete R(d, '686').sources.find(s => s.kind === 'paper')!.paper }, /without the paper id/)
  fires('a paper source that cites another sage\'s paper', d => { R(d, '686').sources.find(s => s.kind === 'paper')!.paper = '687' }, /cites paper 687, not his own/)
  fires('one quote changed by a letter', d => { const s = R(d, '686').sources.find(x => x.kind === 'paper')!; s.quotes[0] = s.quotes[0].replace('הר"ש', 'הרש"ש') }, /686: source \d+: quote is not in paper 686/)
  fires('a source that is not an https URL', d => { R(d, '686').sources[1].url = 'http://he.wikipedia.org/wiki/x' }, /not an https URL/)
  fires('a link whose source is not among the record\'s', d => { R(d, '686').links[0].source = 'https://example.org/' }, /not among the record's sources/)
  fires('the notes are missing', d => { R(d, '690').notes = '' }, /690: the notes/)
  fires('the node\'s bio is not the sourced sentences', (_d, e) => { e.copies[0]['691']!.bio += ' x' }, /691: the node's bio is not the sourced/)
  // links
  fires('a record link absent from the corpus', (_d, e) => { e.conn = e.conn.filter(c => !(c.source === '33' && c.target === '686')) }, /686: link 33 teacher 686 is not in the corpus/)
  fires('a record link absent from a data.json copy', (_d, e) => { e.copyLinks[1] = e.copyLinks[1].filter(l => !(l.source === '33' && l.target === '686')) }, /not in data\.json copy 1/)
  fires('a record link with no evidence_source', (_d, e) => { delete e.copyLinks[0].find(l => l.source === '33' && l.target === '686')!.evidence_source }, /gives it no evidence_source/)
  fires('a record link to an id that is not on the roster', d => { R(d, '686').links[0].a = '99999' }, /end 99999 is not on the roster/)
  // places
  fires('a place with no region', (_d, e) => { e.sage['688'].location = 'מקום שאינו קיים' }, /688: "מקום שאינו קיים" maps to no region/)
  fires('a place with no map point', (_d, e) => { e.sage['688'].location = 'בורסה; מקום שאינו קיים' }, /688: "מקום שאינו קיים" has no map point/)
  fires('a new place with the wrong region', d => { R(d, '686').new_places[0].region = 'sefarad' }, /new place .*: regions/)
  // English and Russian
  fires('a missing Russian label', (_d, e) => { e.ov.ru['690'] = { ...e.ov.ru['690'], label: '' } }, /690 ru\.label: missing/)
  fires('Hebrew left in an English bio', (_d, e) => { e.ov.en['692']!.bio += ' רבי' }, /692 en\.bio: Hebrew letters/)
  fires('a Russian bio that is Latin', (_d, e) => { e.ov.ru['693']!.core_concept = 'Latin only' }, /693 ru\.core_concept: not Cyrillic/)
  fires('a tag the vocabulary cannot translate', (_d, e) => { e.sage['694'].tags = [...e.sage['694'].tags, 'תג שאין לו תרגום'] }, /694 en: no translation of the tag/)
  // credit and the paper block
  fires('a missing Word file in data/', (_d, e) => { e.dataFiles = e.dataFiles.filter(f => f !== e.sets['691'].he![0].source_file) }, /691: data\/.* is missing/)
  fires('a missing attribution entry', (_d, e) => { const f = e.sets['692'].he![0].source_file; e.attribution = e.attribution.filter(a => a.file !== f) }, /692: 0 attribution entries/)
  fires('a doubled attribution entry', (_d, e) => { const f = e.sets['693'].he![0].source_file; e.attribution.push({ file: f, sage_label: e.label['693'] }) }, /693: 2 attribution entries/)
  fires('an attribution entry under another sage\'s label', (_d, e) => { const f = e.sets['694'].he![0].source_file; e.attribution.find(a => a.file === f)!.sage_label = e.label['695'] }, /694: attributed to/)
  fires('he.lines differs from the file\'s', d => { R(d, '686').he.lines += 1 }, /686: he\.lines/)
  fires('he.words differs from the file\'s', d => { R(d, '686').he.words += 1 }, /686: he\.words/)
  fires('docx is not the title\'s Word name', d => { R(d, '687').docx = 'x.docx' }, /687: docx/)
  fires('copies marked identical with a listed difference', d => { R(d, '688').copies.differences = [{ line: 1, a: 'x', b: 'y', settled: 'a', how: 'read against the Drive text' }] }, /688: copies say identical/)
  fires('a difference without how it was settled', d => { const c = R(d, '689').copies; c.identical = false; c.differences = [{ line: 1, a: 'x', b: 'y', settled: 'a', how: '' }] }, /689: difference at line 1/)
  // links of the papers
  fires('a paper link whose quote is not in the paper (changed by a letter)', d => { const c = R(d, '686').paper_links[0]; c.quote = c.quote.replace('הר"ש', 'הר"שש') }, /686: link .*: the quote is not in the paper/)
  fires('a paper link absent from data/links-from-research.json', (_d, e) => { e.reviewed = e.reviewed.filter(x => x.paper !== '686') }, /686: link .*: 0 entries in data\/links-from-research\.json/)
  fires('a reviewed entry the record does not list', (_d, e) => { e.reviewed.push({ ...e.reviewed.find(x => x.paper === '692')!, b: '1', b_label: e.label['1'] }) }, /692: data\/links-from-research\.json holds/)
  fires('a reviewed entry that differs from the record\'s (relation or quote)', (_d, e) => { e.reviewed.find(x => x.paper === '686' && x.type === 'family')!.relation = 'uncle' }, /686: link .*differs from the record's/)
  fires('a reviewed entry with a wrong label', (_d, e) => { e.reviewed.find(x => x.paper === '686')!.b_label = 'someone else' }, /686: link .*differs from the record's|686: link .*b_label/)
  fires('a paper link whose label is not the roster\'s', d => { R(d, '686').paper_links[0].a_label = 'someone else' }, /686: link .*: a_label/)
  fires('a paper link whose paper is neither end', d => { const c = R(d, '686').paper_links[0]; c.a = '687'; c.b = '688' }, /686: link .*the paper is not one of its ends/)
  fires('a family paper link without its relation', d => { const c = R(d, '686').paper_links.find(x => x.type === 'family')!; delete c.relation }, /686: link .*relation "undefined"/)
  fires('an added link missing from public/data-paper-links.json', (d, e) => { const c = firstOf(d, '686', 'added'); e.built = e.built.filter(b => !(b.source === c.a && b.target === c.b && b.type === c.type)) }, /686: link .*outcome added, but it is not in public\/data-paper-links\.json/)
  fires('an added link missing from the corpus', (d, e) => { const c = firstOf(d, '686', 'added'); e.conn = e.conn.filter(x => !(x.source === c.a && x.target === c.b && x.type === c.type)) }, /686: link .*outcome added, but it is not in the corpus/)
  fires('already-on-site, but the built file holds it', (d, e) => { const c = firstOf(d, '686', 'already-on-site'); e.built.push({ source: c.a, target: c.b, type: c.type, relation: c.relation, quotes: [] }) }, /already-on-site, but it is in public\/data-paper-links\.json/)
  fires('already-on-site, but the corpus does not hold it', (d, e) => { const c = firstOf(d, '686', 'already-on-site'); e.conn = e.conn.filter(x => !(x.source === c.a && x.target === c.b && x.type === c.type)) }, /already-on-site, but the corpus does not hold it/)
  fires('dropped, but the built file holds it', (d, e) => { const c = firstOf(d, '686', 'dropped'); e.built.push({ source: c.a, target: c.b, type: c.type, relation: c.relation, quotes: [] }) }, /dropped, but it is in public\/data-paper-links\.json/)
  fires('dropped without a reason', d => { delete firstOf(d, '686', 'dropped').reason }, /dropped without a reason/)
  fires('a rejected link present in the reviewed input', (d, e) => { const x = R(d, '692').links_rejected[0]; e.reviewed.push({ paper: '692', a: x.a, b: x.b, a_label: e.label[x.a], b_label: e.label[x.b], type: x.type, quote: x.quote }) }, /692: rejected .*it is in data\/links-from-research\.json/)
  fires('a rejected link present in the built file', (d, e) => { const x = R(d, '692').links_rejected[0]; e.built.push({ source: x.a, target: x.b, type: x.type, quotes: [] }) }, /692: rejected .*it is in public\/data-paper-links\.json/)
  fires('an empty paper_links without a reason', d => { const r = R(d, '696'); r.paper_links = []; delete r.links_none_reason }, /696: no paper links, and no links_none_reason/)
  fires('an outcome that is none of the three', d => { firstOf(d, '686', 'added').outcome = 'maybe' }, /686: link .*outcome "maybe"/)
  // death dates
  fires('a yahrzeit entry that differs from the record\'s', (_d, e) => { e.yList.find(y => y.id === '692')!.day = 9 }, /692: the entry in data\/yahrzeit-from-research\.json differs/)
  fires('a yahrzeit entry missing from the reviewed list', (_d, e) => { e.yList = e.yList.filter(y => y.id !== '690') }, /690: 0 entries in data\/yahrzeit-from-research\.json/)
  fires('a yahrzeit entry listed twice', (_d, e) => { e.yList.push({ id: '690', day: null, reason: 'x' }) }, /690: 2 entries in data\/yahrzeit-from-research\.json/)
  fires('day null without a reason (the reviewed list)', (_d, e) => { delete e.yList.find(y => y.id === '690')!.reason }, /690: day null in data\/yahrzeit-from-research\.json without a reason/)
  fires('no death date and no reason in the record', d => { delete R(d, '690').yahrzeit_none_reason }, /690: no death date, and no yahrzeit_none_reason/)
  fires('the reviewed list has a date the record lacks', (_d, e) => { Object.assign(e.yList.find(y => y.id === '690')!, { day: 3, month: 'Av' }) }, /690: the reviewed list has a date, the record has none/)
  fires('a death date whose quote is not in the paper', (d, e) => { R(d, '692').yahrzeit!.quote = 'not in the paper'; e.yList.find(y => y.id === '692')!.quote = 'not in the paper' }, /692: the death date quote is not in the paper/)
  fires('a death month that does not exist', (d, e) => { R(d, '692').yahrzeit!.month = 'Marchesvan'; e.yList.find(y => y.id === '692')!.month = 'Marchesvan' }, /692: death month/)
  fires('a death day out of range', (d, e) => { R(d, '692').yahrzeit!.day = 31; e.yList.find(y => y.id === '692')!.day = 31 }, /692: death day 31/)
  fires('a date marked added that is missing from public/data-yahrzeit.json', (_d, e) => { delete e.yBuilt['692'] }, /692: death date added, but not in public\/data-yahrzeit\.json/)
  fires('a death date built under another sage\'s label', (_d, e) => { e.yBuilt['692'].label = e.label['691'] }, /692: public\/data-yahrzeit\.json says 27 Sivan for/)
  fires('a dropped death date that is built anyway', d => { R(d, '692').yahrzeit!.outcome = 'dropped' }, /692: death date dropped, but public\/data-yahrzeit\.json has it/)
  fires('a sage without a death date that is built anyway', (_d, e) => { e.yBuilt['690'] = { label: e.label['690'], day: 1, month: 'Av', quote: 'x' } }, /690: no death date in the record, but public\/data-yahrzeit\.json has one/)
  // the side files
  fires('a Sefaria entry matched on another label', (_d, e) => { e.sefaria['686'] = { label: 'someone else' } }, /686: data-sefaria\.json was matched on/)
  fires('a Wikipedia entry matched on another label', (_d, e) => { e.wiki['698'] = { label: 'רב הונא' } }, /698: data-wikipedia\.json was matched on/)
  // dropped links
  fires('a dropped link missing from the record', d => { d.dropped_links = d.dropped_links.filter(x => !(x.a === '687' && x.b === '388')) }, /dropped_links lacks 687 -> 388/)
  fires('a dropped link without a reason', d => { delete (d.dropped_links[0] as Partial<Dropped>).reason }, /dropped 686 teacher 588: no reason/)
  fires('a dropped link that is in data.json after all', (_d, e) => { e.copyLinks[0].push({ source: '687', target: '388', type: 'teacher', evidence_source: 'x' }) }, /dropped 687 teacher 388: it is in data\.json copy 0/)
  fires('a dropped link that is in the corpus after all', (_d, e) => { e.conn.push({ source: '599', target: '691', type: 'teacher' }) }, /dropped 599 teacher 691: it is in the corpus/)
  // the reading
  fires('a sage without a reading', d => { delete (R(d, '697') as Partial<Rec>).reading }, /697: reading\.ok is/)
  fires('a reading that found something to correct and applied nothing', d => { const r = R(d, '688'); r.reading.applied = [] }, /688: the reader found something to correct/)
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
