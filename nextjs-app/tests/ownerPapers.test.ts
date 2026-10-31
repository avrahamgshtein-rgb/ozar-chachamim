/**
 * The owner's fifteen papers of 18 October 2026 on sages who are already on the roster (phase 2a): 632 the Mabit,
 * 635 the Sforno, 636 Rabbenu Yerucham, 639 the Maharashdam, 640 the Maharival, 641 the Maharit, 642 the Lechem Mishneh,
 * 643 the Beit Shmuel, 646 the Kenesset HaGedolah, 647 the Reishit Chochmah, 648 the Eliyah Rabbah, 651 the Melechet
 * Shlomo, 652 the Pnei Yehoshua, 657 the Chavot Yair, 669 the Tzror HaMor.
 *
 * data/owner-papers-2026-10.json is the record of the batch (per paper: the Drive document, the two independent copies and
 * how they compared, what the paper says that the roster's entry does not, the slips found, the relations read from it and
 * what became of each, the death date or why none). Ids are what drift between data sets (see CLAUDE.md), so every sage here
 * is named by the label the plan gives him, and these tests fail when an id now belongs to someone else.
 *
 * Written from the plan's table and the shapes of the files (the record's shape is 3.7 of the plan; the reviewed lists are the
 * input shapes of scripts/build_paper_links.py and scripts/build_yahrzeit.py), not from the code that integrated them.
 *
 * The helpers, the counters and the paper rules are COPIED from tests/ownerAdditions.test.ts, not imported: that file runs
 * its tests when it is imported, and a test file of its own is left untouched when the next batch changes its rules.
 *
 * Not asserted, on purpose: a total number of papers, or which other ids have research (the next batch adds more).
 *
 * Every rule that is a function over data is also run on a copy of the data broken on purpose, one test line per
 * mutation, to show it fires: a check that cannot fail checks nothing. The mutations that need a link or a death date run on
 * a hand-made "after" state (the real files plus what the integration adds) so they do not wait for it.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { getAllConnections, getAllSages } from '../lib/serverData'

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

// ---- the plan's table: who, under what label, the word of his name the title carries, his Drive document ----------------
const DRIVE_FOLDER = '1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc'
const TABLE = [
  { id: '632', label: 'רבי משה מטראני (המבי״ט)', key: 'המבי"ט', doc: '1MGUxIdEthSV3a2q7pADzAyiPhsVyHCguI0tQZTRRPpg', title: 'פועלו, מורשתו ומשנתו התורנית של רבי משה בן יוסף מטראני (המבי"ט): עיון היסטורי, הלכתי ומחשבתי' },
  { id: '635', label: 'רבי עובדיה ספורנו', key: 'ספורנו', doc: '1imB02YhmCiH4LB4RiUguT8jGUtqec38gYUSCtXfEme8', title: 'דיוקנו של חכם רנסאנס עברי: פועלו, משנתו ומורשתו התורנית של רבי עובדיה ספורנו' },
  { id: '636', label: 'רבנו ירוחם בן משולם', key: 'ירוחם', doc: '1V9Wcbm_CemNN-4K7t1YArRY5Ky4zqYQ93SThJ-xqfAA', title: 'פועלו, משנתו ומורשתו של רבינו ירוחם בן משולם: עיון היסטורי, הלכתי וטקסטואלי' },
  { id: '639', label: 'רבי שמואל די מדינה (המהרשד״ם)', key: 'המהרשד"ם', doc: '1VKaOPHR1ITd2qwKyJ6yjfphx1L8k5M3V_OM-fMUzydk', title: 'פועלו, מנהיגותו ומשנתו התורנית של רבי שמואל די מדינה (המהרשד"ם): תולדות חייו, דרכו ההלכתית ומורשתו לדורות' },
  { id: '640', label: 'רבי יוסף בן לב (מהריב״ל)', key: 'מהריב"ל', doc: '1FLCmr8H10tU50K358eQnQ-EKHEo7-7vaoowVCAmxcjw', title: 'פועלו, משנתו התורנית ומורשתו של רבי יוסף אבן לב (מהריב"ל): עמוד ההוראה מן האימפריה העות\'מאנית' },
  { id: '641', label: 'רבי יוסף מטראני (המהרי״ט)', key: 'רבי יוסף מטראני', doc: '1y6hNN7Zcjpp4SrjZcdV6eKacM92o20ggj4qsd8L9oi4', title: 'פועלו, משנתו ומורשתו התורנית של רבי יוסף מטראני (מהרימ"ט)' },
  { id: '642', label: 'רבי אברהם די בוטון (בעל לחם משנה)', key: 'לחם משנה', doc: '19ydFJXHWJDnE0kGY1qrzlmtowmrslz99Jf3A0yR0qjw', title: 'פועלו, משנתו התורנית ומורשתו של רבי אברהם די בוטון (בעל "לחם משנה")' },
  { id: '643', label: 'רבי שמואל בן אורי שרגא פייבוש (בעל בית שמואל)', key: 'בית שמואל', doc: '1w0uzl1hd6WFhZ-OCDf_Ryz2Xdl_TuyitavMPWF7vZu8', title: 'פועלו ומשנתו התורנית של רבי שמואל בן אורי שרגא פייבוש, בעל "בית שמואל"' },
  { id: '646', label: 'רבי חיים בנבנשתי (בעל כנסת הגדולה)', key: 'בנבנשת', doc: '1RP6ypxhiHmJXfqgbiKzszfXSTV4DxGwO3TUhPNmzAA0', title: 'פועלו, משנתו ומורשתו של רבי חיים בנבנשת: מנהיגות הלכתית בצילן של תמורות סוערות' },
  { id: '647', label: 'רבי אליהו די וידאש (בעל ראשית חכמה)', key: 'וידאש', doc: '154V--TVOdEnxUJLY4ohYeoHAGpiJ1HdpZcSuNYWOhDE', title: 'פועלו, משנתו ומורשתו של רבי אליהו די וידאש: עיונים בתולדות חייו, בחיבורו "ראשית חכמה" ובקבלה המוסרית בצפת ובחברון' },
  { id: '648', label: 'רבי אליה שפירא (בעל אליה רבה)', key: 'אליה רבה', doc: '1Lyz1D7mWZ-6kdAj14sb9QusErFr5d1wTOShjb4gD_kg', title: 'פועלו, משנתו ומורשתו של רבי אליהו שפירא (בעל "אליה רבה"): עיון מקיף בהיסטוריה, בהלכה ובביבליוגרפיה' },
  { id: '651', label: 'רבי שלמה עדני (בעל מלאכת שלמה)', key: 'מלאכת שלמה', doc: '1vfZaRTxAU4so4FR-x1Zyh69rCvpBpzMlktyuieRtbUk', title: 'מפעל חייו, משנתו ומורשתו של רבי שלמה עדני בעל "מלאכת שלמה"' },
  { id: '652', label: 'רבי יעקב יהושע פלק (בעל פני יהושע)', key: 'פני יהושע', doc: '1dyiTKIcj7tu-Csv3Y_hvf0-vH8dcBJ8tdye8ACM_-CM', title: 'פועלו, משנתו התורנית ומורשתו של רבי יעקב יהושע פלק: בעל "פני יהושע"' },
  { id: '657', label: 'רבי יאיר חיים בכרך (בעל חוות יאיר)', key: 'חוות יאיר', doc: '1V7IsrFudNZ2xabeT4JjJ_umUk_uOoRhlhWfmoZWiUCg', title: 'פועלו, משנתו התורנית ומורשתו של רבי יאיר חיים בכרך: עיון היסטורי-הלכתי בבעל "חוות יאיר"' },
  { id: '669', label: 'רבי אברהם סבע (בעל צרור המור)', key: 'סבע', doc: '14mFOuabrmn0D6GKvmuTFgZQuDNFncxDzBkSJg2AbRyM', title: 'פועלו, משנתו ומורשתו התורנית של רבי אברהם סבע: עיון היסטורי, פרשני וקבלי' },
]
const IDS = TABLE.map(t => t.id)
const MONTHS = ['Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar I', 'Adar', 'Adar II', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul']
const FAMILY = ['father', 'mother', 'grandfather', 'grandmother', 'father-in-law', 'mother-in-law', 'uncle', 'aunt', 'ancestor',
  'brother', 'sister', 'husband', 'wife', 'cousin', 'brother-in-law', 'sister-in-law', 'relative']

// ---- text helpers (copied from tests/ownerAdditions.test.ts) ----------------------------------------------------------
const HEBREW = /[א-ת]/
const ARABIC = /[؀-ۿݐ-ݿ]/
const CITE = /\[cite:[^\]]*\]/g
const norm = (s: string) => s.replace(/[״“”"]/g, '"').replace(/[׳’']/g, "'").replace(/\s+/g, ' ').trim()
/** A quote is verbatim when the page holds it, with or without the paper's [cite: n] markers. */
const inText = (quote: string, text: string) => { const q = norm(quote); return norm(text).includes(q) || norm(text.replace(CITE, ' ')).includes(q) }
const words = (s: string) => (s.match(/\S+/g) ?? []).length
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length
const heShare = (s: string) => { const he = count(s, /[א-ת]/g); const all = he + count(s, /[A-Za-zÀ-ɏЀ-ӿ]/g); return all ? he / all : 0 }

// ---- the paper rules (copied from tests/ownerAdditions.test.ts) -------------------------------------------------------
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
    if (ARABIC.test(d.content)) say(`${at}: Arabic letters`)
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

/** The fifteen papers are fifteen different texts, and no title carries another paper's key. */
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

// ---- the record (3.7 of the plan) and everything it is checked against ----------------------------------------------------
interface RecLink { a: string; b: string; type: string; relation?: string; quote: string; outcome: string; reason?: string }
interface RecRejected { a: string; b: string; type: string; quote: string; verdict: string; reason?: string }
interface RecPaper {
  id: string; label: string; key: string
  drive: { doc: string; title: string }
  docx: string
  he: { lines: number; words: number }
  copies: { a_lines: number; b_lines: number; identical: boolean; differences: Array<{ line: number; a: string; b: string; settled: string; how: string }> }
  about_sage: string
  disagreements: unknown[]; slips: unknown[]; footnotes: unknown[]
  links: RecLink[]; links_rejected: RecRejected[]; links_none_reason?: string
  yahrzeit: { day: number; month: string; quote: string; outcome: string } | null; yahrzeit_none_reason?: string
}
interface RecDoc { _about: string; date: string; drive_folder: string; counts: { papers_before: number; papers_after: number }; papers: RecPaper[] }
interface Reviewed { paper: string; a: string; b: string; a_label: string; b_label: string; type: string; relation?: string; quote: string }
interface BuiltLink { source: string; target: string; type: string; relation?: string; quotes: Array<{ paper: string; quote: string }> }
interface Conn { source: string; target: string; type: string }
interface YItem { id: string; day?: number | null; month?: string; quote?: string; reason?: string }
type BuiltY = Record<string, { label: string; day: number; month: string; quote: string }>
type NodeCopy = Record<string, { label: string; has_research?: boolean } | undefined>

/** Everything a record is checked against, as plain data so a copy can be broken on purpose. */
interface Env {
  label: Record<string, string>
  sets: Record<string, PaperSet>
  dataFiles: string[]
  attribution: Array<{ file: string; sage_label: string }>
  copies: NodeCopy[]
  copiesIdentical: boolean
  reviewed: Reviewed[]
  built: BuiltLink[]
  conn: Conn[]
  yList: YItem[]
  yBuilt: BuiltY
}

const connHas = (conn: Conn[], a: string, b: string, type: string) => conn.some(c => {
  const s = String(c.source); const t = String(c.target)
  if (type === 'teacher') return (c.type === 'teacher' && s === a && t === b) || (c.type === 'student' && s === b && t === a)
  return c.type === type && ((s === a && t === b) || (s === b && t === a))
})
const builtHas = (built: BuiltLink[], a: string, b: string, type: string) => built.some(e =>
  e.type === type && ((e.source === a && e.target === b) || (type === 'family' && e.source === b && e.target === a)))

function recordProblems(d: RecDoc, env: Env): string[] {
  const out: string[] = []
  const top = (m: string) => out.push(`record: ${m}`)
  if (!d._about || d._about.length < 50) top('_about is missing')
  if (!/^2026-10-\d\d$/.test(d.date)) top(`date "${d.date}"`)
  if (d.drive_folder !== DRIVE_FOLDER) top(`drive_folder "${d.drive_folder}"`)
  if (!isDeepStrictEqual(d.papers.map(p => p.id), IDS)) top(`the papers are ${d.papers.map(p => p.id).join(', ')}, not the plan's fifteen once each in id order`)
  for (const p of d.papers) {
    const t = TABLE.find(x => x.id === p.id)
    const id = p.id
    const say = (m: string) => out.push(`${id}: ${m}`)
    if (!t) { say('not a sage of this batch'); continue }
    // (1) and (2): the plan's label, the record's label and the roster's are one
    if (p.label !== t.label) say(`record label "${p.label}", plan "${t.label}"`)
    if (env.label[id] !== p.label) say(`record label "${p.label}", roster "${env.label[id]}" (the id now belongs to someone else)`)
    if (p.key !== t.key) say(`record key "${p.key}", plan "${t.key}"`)
    if (p.drive?.doc !== t.doc) say(`Drive document ${p.drive?.doc}, plan ${t.doc}`)
    if (norm(p.drive?.title ?? '') !== norm(t.title)) say(`Drive title "${p.drive?.title}", plan "${t.title}"`)
    // (6) the record agrees with the files
    const set = env.sets[id]
    const h = set?.he?.[0]
    if (!h) say('no Hebrew research file')
    else {
      if (p.he?.lines !== h.content.split('\n').length) say(`he.lines ${p.he?.lines}, the file has ${h.content.split('\n').length}`)
      if (p.he?.words !== words(h.content)) say(`he.words ${p.he?.words}, the file has ${words(h.content)}`)
      if (p.docx !== docxName(h.title)) say(`docx "${p.docx}" is not the Word name of the title`)
      if (p.docx !== h.source_file) say(`docx "${p.docx}", the file's source_file "${h.source_file}"`)
      // (5) credit
      if (!env.dataFiles.includes(h.source_file)) say(`data/${h.source_file} is missing`)
      const hits = env.attribution.filter(a => a.file === h.source_file)
      if (hits.length !== 1) say(`${hits.length} attribution entries for ${h.source_file}`)
      else if (hits[0].sage_label !== env.label[id]) say(`attributed to "${hits[0].sage_label}"`)
      // the copies
      const c = p.copies
      if (!c || typeof c.identical !== 'boolean') say('copies is missing')
      else {
        if (c.identical && (c.a_lines !== p.he.lines || c.b_lines !== p.he.lines || c.differences.length !== 0)) say('copies say identical, but the lines or differences do not agree')
        if (!c.identical && c.differences.length === 0) say('copies differ, but no difference is listed')
        for (const x of c.differences ?? []) if (!['a', 'b', 'other'].includes(x.settled) || !x.how?.trim()) say(`difference at line ${x.line}: settled/how missing`)
      }
    }
    if (!p.about_sage?.trim()) say('about_sage is missing')
    for (const f of ['disagreements', 'slips', 'footnotes'] as const) if (!Array.isArray(p[f])) say(`${f} is not a list`)
    // (4) has_research in both copies of data.json
    env.copies.forEach((cp, i) => {
      const n = cp[id]
      if (!n) say(`data.json copy ${i}: no node`)
      else {
        if (n.label !== p.label) say(`data.json copy ${i}: node label "${n.label}"`)
        if (n.has_research !== true) say(`data.json copy ${i}: has_research is not true`)
      }
    })
    // (7) links
    const text = h ? h.content : ''
    for (const l of p.links) {
      const at = `link ${l.a} ${l.type} ${l.b}`
      if (id !== l.a && id !== l.b) say(`${at}: the paper's sage is neither end`)
      if (!env.label[l.a] || !env.label[l.b]) say(`${at}: an end is not on the roster`)
      if (l.type !== 'teacher' && l.type !== 'family') say(`${at}: type ${l.type}`)
      if (l.type === 'family' && !FAMILY.includes(l.relation ?? '')) say(`${at}: relation "${l.relation}"`)
      if (l.type === 'teacher' && l.relation) say(`${at}: a teacher link with a relation`)
      if (!inText(l.quote, text)) say(`${at}: the quote is not in the paper`)
      const rev = env.reviewed.filter(e => e.paper === id && e.a === l.a && e.b === l.b && e.type === l.type)
      if (rev.length !== 1) say(`${at}: ${rev.length} entries in data/links-from-research.json`)
      else {
        const e = rev[0]
        if (e.quote !== l.quote || (e.relation ?? '') !== (l.relation ?? '')) say(`${at}: the entry in data/links-from-research.json differs from the record's (quote or relation)`)
        if (e.a_label !== env.label[l.a] || e.b_label !== env.label[l.b]) say(`${at}: a_label/b_label are not the roster's`)
      }
      const inBuilt = builtHas(env.built, l.a, l.b, l.type)
      const inConn = connHas(env.conn, l.a, l.b, l.type)
      if (l.outcome === 'added') {
        if (!inBuilt) say(`${at}: outcome added, but it is not in public/data-paper-links.json`)
        else if (!env.built.some(e => e.quotes.some(q => q.paper === id && norm(q.quote) === norm(l.quote)))) say(`${at}: added, but the built entry does not carry this quote`)
        if (!inConn) say(`${at}: outcome added, but it is not in the corpus (getAllConnections)`)
      } else if (l.outcome === 'already-on-site') {
        if (!inConn) say(`${at}: outcome already-on-site, but the corpus does not hold it`)
        if (inBuilt) say(`${at}: outcome already-on-site, but it is in public/data-paper-links.json`)
      } else if (l.outcome === 'dropped') {
        if (inBuilt) say(`${at}: outcome dropped, but it is in public/data-paper-links.json`)
        if (!l.reason?.trim()) say(`${at}: dropped without a reason`)
      } else say(`${at}: outcome "${l.outcome}"`)
    }
    for (const e of env.reviewed.filter(x => x.paper === id)) {
      if (!p.links.some(l => l.a === e.a && l.b === e.b && l.type === e.type)) say(`data/links-from-research.json holds ${e.a} ${e.type} ${e.b}, which the record does not list`)
    }
    for (const r of p.links_rejected) {
      const at = `rejected ${r.a} ${r.type} ${r.b}`
      if (!r.verdict?.trim()) say(`${at}: no verdict`)
      if (env.reviewed.some(e => e.paper === id && e.a === r.a && e.b === r.b && e.type === r.type)) say(`${at}: it is in data/links-from-research.json`)
      if (builtHas(env.built, r.a, r.b, r.type)) say(`${at}: it is in public/data-paper-links.json`)
    }
    if (p.links.length === 0 && !p.links_none_reason?.trim()) say('no links, and no links_none_reason')
    // (8) the death date
    const ys = env.yList.filter(y => y.id === id)
    if (ys.length !== 1) say(`${ys.length} entries in data/yahrzeit-from-research.json`)
    else {
      const y = ys[0]
      if (p.yahrzeit === null) {
        if (y.day !== null && y.day !== undefined) say('the reviewed list has a date, the record has none')
        if (!y.reason?.trim()) say('day null in data/yahrzeit-from-research.json without a reason')
        if (!p.yahrzeit_none_reason?.trim()) say('no death date, and no yahrzeit_none_reason')
        if (env.yBuilt[id]) say('no death date in the record, but public/data-yahrzeit.json has one')
      } else {
        const r = p.yahrzeit
        if (!Number.isInteger(r.day) || r.day < 1 || r.day > 30) say(`death day ${r.day}`)
        if (!MONTHS.includes(r.month)) say(`death month "${r.month}"`)
        if (!inText(r.quote, text)) say('the death date quote is not in the paper')
        if (y.day !== r.day || y.month !== r.month || y.quote !== r.quote) say('the entry in data/yahrzeit-from-research.json differs from the record\'s')
        if (r.outcome === 'added') {
          const b = env.yBuilt[id]
          if (!b) say('death date added, but not in public/data-yahrzeit.json')
          else if (b.label !== env.label[id] || b.day !== r.day || b.month !== r.month) say(`public/data-yahrzeit.json says ${b.day} ${b.month} for "${b.label}"`)
        } else if (r.outcome === 'dropped') {
          if (env.yBuilt[id]) say('death date dropped, but public/data-yahrzeit.json has it')
        } else say(`death date outcome "${r.outcome}"`)
      }
    }
  }
  return out
}

// ---- the real data ---------------------------------------------------------------------------------------------------------
const sages = getAllSages()
const byId = new Map(sages.map(s => [s.id, s]))
const recFile = join(REPO, 'data/owner-papers-2026-10.json')
const rec = readJson<RecDoc>(recFile)
const nodesOf = (f: string): NodeCopy => Object.fromEntries(readJson<{ nodes: Array<{ id: string; label: string; has_research?: boolean }> }>(f).nodes.map(n => [n.id, n]))
const dataJsonA = join(REPO, 'data.json')
const dataJsonB = join(APP, 'public/data.json')
const IDSET = new Set(IDS)
const realEnv: Env = {
  label: Object.fromEntries(sages.map(s => [s.id, s.label])),
  sets: Object.fromEntries(IDS.map(id => [id, readPaperSet(id)])),
  dataFiles: IDS.flatMap(id => { const f = readPaperSet(id).he?.[0]?.source_file; return f && existsSync(join(REPO, 'data', f)) ? [f] : [] }),
  attribution: readJson<{ documents: Array<{ file: string; sage_label: string }> }>(join(REPO, 'data/research_attribution.json')).documents,
  copies: [nodesOf(dataJsonA), nodesOf(dataJsonB)],
  copiesIdentical: readFileSync(dataJsonA).equals(readFileSync(dataJsonB)),
  reviewed: readJson<Reviewed[]>(join(REPO, 'data/links-from-research.json')),
  built: readJson<{ links: BuiltLink[] }>(join(APP, 'public/data-paper-links.json')).links,
  conn: getAllConnections().filter(c => IDSET.has(String(c.source)) || IDSET.has(String(c.target))).map(c => ({ source: String(c.source), target: String(c.target), type: c.type })),
  yList: readJson<YItem[]>(join(REPO, 'data/yahrzeit-from-research.json')),
  yBuilt: readJson<BuiltY>(join(APP, 'public/data-yahrzeit.json')),
}

console.log('\nthe record, data/owner-papers-2026-10.json')

test('the record holds exactly the plan\'s fifteen ids, once each, in id order, with the plan\'s labels, the date and the Drive folder', () => {
  assert.deepEqual(rec.papers.map(p => p.id), IDS)
  assert.deepEqual(rec.papers.map(p => p.label), TABLE.map(t => t.label))
  assert.match(rec.date, /^2026-10-\d\d$/)
  assert.equal(rec.drive_folder, DRIVE_FOLDER)
  assert.equal(typeof rec.counts?.papers_before, 'number')
  assert.equal(typeof rec.counts?.papers_after, 'number')
})

test('every id is still the sage the record was written for (the roster\'s label equals the record\'s and the plan\'s)', () => {
  const drifted = TABLE.flatMap(t => byId.get(t.id)?.label === t.label && rec.papers.find(p => p.id === t.id)?.label === t.label ? [] : [`${t.id}: plan "${t.label}", roster "${byId.get(t.id)?.label}"`])
  assert.deepEqual(drifted, [], 'an id now belongs to someone else: re-read the paper')
})

test('no model or tool name anywhere in the record', () => {
  assert.doesNotMatch(readFileSync(recFile, 'utf8'), /\b(claude|sonnet|opus|haiku|anthropic|gemini|llama)\b|gpt-?\d|mcp__|read_file_content/i)
})

console.log('\nthe fifteen papers in three languages')

test('each of the fifteen has a Hebrew, English and Russian research file that passes the paper rules [waits for the English and Russian files]', () => {
  assert.deepEqual(TABLE.flatMap(t => paperProblems(t.id, realEnv.sets[t.id], t.key)), [])
})

test('the Hebrew files alone pass the Hebrew paper rules (title is the first line, source_file, word_count, no debris, names the sage)', () => {
  const only = (id: string) => ({ ...realEnv.sets[id], en: realEnv.sets[id].en ?? realEnv.sets[id].he, ru: realEnv.sets[id].ru ?? realEnv.sets[id].he })
  const heProblems = TABLE.flatMap(t => paperProblems(t.id, only(t.id), t.key).filter(p => !/en document|ru document/.test(p)))
  assert.deepEqual(heProblems, [])
})

test('the fifteen Hebrew texts and titles are all different, and no title holds another paper\'s key', () => {
  assert.deepEqual(distinctProblems(realEnv.sets), [])
})

console.log('\nthe roster, the credit and the record\'s agreement with the files')

test('has_research is true for the fifteen in both data.json copies (read as files), and the copies are byte-identical', () => {
  assert.ok(realEnv.copiesIdentical, 'data.json and nextjs-app/public/data.json differ')
  for (const [i, cp] of realEnv.copies.entries()) for (const t of TABLE) {
    assert.equal(cp[t.id]?.label, t.label, `copy ${i}: ${t.id}`)
    assert.equal(cp[t.id]?.has_research, true, `copy ${i}: ${t.id}`)
  }
  for (const t of TABLE) assert.equal(byId.get(t.id)?.has_research, true, t.id)
})

test('the record agrees with everything: files, credit, links, death dates (all the assertions of the record rules, on the real data) [waits for the final record and the side files]', () => {
  assert.deepEqual(recordProblems(rec, realEnv), [])
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
  const words0 = words
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
    ['a blank line in the Hebrew', s => { s.he![0].content += '\n \nx'; s.he![0].word_count = words0(s.he![0].content) }, /blank or untrimmed/],
    ['an English title that is still Hebrew', s => { s.en![0].title = 'כותרת בעברית' }, /still Hebrew/],
    ['an empty line in a translation', s => { const l = s.ru![0].content.split('\n'); l[3] = ''; s.ru![0].content = l.join('\n') }, /an empty line/],
    ['the Russian file is a copy of the Hebrew', s => { s.ru![0].content = s.he![0].content; s.ru![0].word_count = s.he![0].word_count }, /still Hebrew/],
    ['the English file is the Russian text', s => { s.en![0].content = s.ru![0].content; s.en![0].word_count = s.ru![0].word_count }, /less than 80% of the letters are Latin/],
    ['the separator line is not kept', s => { const l = s.en![0].content.split('\n'); const k = l.findIndex(x => /^-{20,}$/.test(x)); l[k] = '- - -'; s.en![0].content = l.join('\n') }, /separator line is not kept/],
    ['table cells differ', s => { const l = s.en![0].content.split('\n'); const k = l.findIndex(x => x.includes(' | ')); l[k] = l[k].replace(/ \| /g, ' / '); s.en![0].content = l.join('\n') }, /table cells differ/],
    ['the text no longer names the sage', s => { s.he![0].content = s.he![0].content.replace(/אלשיך/g, 'פלוני'); s.he![0].word_count = words0(s.he![0].content) }, /names the sage/],
  ]
  for (const [name, mutate, re] of mutations) test(`paper rule fires: ${name}`, () => {
    const s = copy(); mutate(s)
    const found = paperProblems('630', s, 'אלשיך')
    assert.ok(found.some(p => re.test(p)), `no problem matching ${re} in ${JSON.stringify(found)}`)
  })
}

test('paper rule fires: a paper copied under a namesake\'s id (641 holding the Mabit\'s text) is found by the distinctness rule', () => {
  const sets = deep(realEnv.sets)
  sets['641'] = deep(sets['632'])
  const found = distinctProblems(sets)
  assert.ok(found.some(p => /632 and 641: the same Hebrew text/.test(p)), JSON.stringify(found))
  assert.ok(found.some(p => /641: the title holds 632's key/.test(p)) || found.some(p => /632 and 641: the same title/.test(p)), JSON.stringify(found))
})

test('paper rule fires: the Mabit\'s text under the Maharit\'s id fails the Maharit\'s own paper rules (the title does not name him)', () => {
  const set = deep(realEnv.sets['632'])
  const found = paperProblems('641', { he: set.he, en: set.he, ru: set.he }, TABLE.find(t => t.id === '641')!.key)
  assert.ok(found.some(p => /the title does not name the sage/.test(p)), JSON.stringify(found))
})

console.log('\nthe record rules fire, on a hand-made state after the integration (the real files plus what it adds)')

/** A consistent "after" state: 632 -> 641 (father) is added and on the site, one teacher link is dropped, 632 has a death date. */
function fixture(): { doc: RecDoc; env: Env } {
  const doc = deep(rec)
  const env = deep(realEnv)
  const p632 = doc.papers.find(p => p.id === '632')!
  const p641 = doc.papers.find(p => p.id === '641')!
  const quote = 'בנו, רבי יוסף מטראני (המהרי"ט)'
  const l632 = env.sets['632'].he![0].content
  assert.ok(inText(quote, l632), 'fixture quote is not in the paper of 632')
  const entry: Reviewed = { paper: '632', a: '632', b: '641', a_label: env.label['632'], b_label: env.label['641'], type: 'family', relation: 'father', quote }
  env.reviewed = [...env.reviewed.filter(e => e.paper !== '632' && e.paper !== '641'), entry]
  env.built = [...env.built, { source: '632', target: '641', type: 'family', relation: 'father', quotes: [{ paper: '632', quote }] }]
  env.conn = [...env.conn, { source: '632', target: '641', type: 'family' }]
  p632.links = [{ a: '632', b: '641', type: 'family', relation: 'father', quote, outcome: 'added', reason: 'added: family' }]
  delete p632.links_none_reason
  p632.links_rejected = [{ a: '632', b: '635', type: 'teacher', quote: 'a sentence the second reader rejected', verdict: 'not stated for his own sage' }]
  p641.links = []; p641.links_none_reason = 'the paper states no teacher or family relation'
  // 632 has a death date
  const yq = 'אביו המבי"ט'
  assert.ok(inText(yq, l632), 'fixture death quote is not in the paper of 632')
  p632.yahrzeit = { day: 8, month: 'Shevat', quote: yq, outcome: 'added' }
  delete p632.yahrzeit_none_reason
  env.yList = [...env.yList.filter(y => y.id !== '632'), { id: '632', day: 8, month: 'Shevat', quote: yq }]
  env.yBuilt = { ...env.yBuilt, '632': { label: env.label['632'], day: 8, month: 'Shevat', quote: yq } }
  // the other thirteen and 641 and 632's partner: a reason each, where the real state has none yet
  for (const p of doc.papers) {
    if (p.id !== '632') {
      p.yahrzeit = null; p.yahrzeit_none_reason = 'the paper gives no Hebrew date of his death'
      env.yList = [...env.yList.filter(y => y.id !== p.id), { id: p.id, day: null, reason: 'the paper gives no Hebrew date of his death' }]
      delete env.yBuilt[p.id]
      if (p.id !== '641' && p.links.length === 0) p.links_none_reason = 'the paper states no teacher or family relation'
    }
  }
  // the record rules do not read the translations; they do read the Word files, the attribution and has_research (real data)
  return { doc, env }
}

test('the hand-made state is clean for every rule except what the real data still lacks (the Word files, attribution, flags, translations are real)', () => {
  const { doc, env } = fixture()
  const found = recordProblems(doc, env)
  // whatever is left must be about the real files (a paper not yet ingested), never about the fixture's links or dates
  const mine = found.filter(p => /link|rejected|death|yahrzeit|reviewed|links-from-research|data-paper-links/.test(p))
  assert.deepEqual(mine, [], JSON.stringify(found.slice(0, 5)))
})

{
  const fires = (name: string, mutate: (d: RecDoc, e: Env) => void, re: RegExp) => test(`record rule fires: ${name}`, () => {
    const { doc, env } = fixture()
    mutate(doc, env)
    const found = recordProblems(doc, env)
    assert.ok(found.some(p => re.test(p)), `no problem matching ${re} in ${JSON.stringify(found.slice(0, 8))}`)
  })
  const P = (d: RecDoc, id: string) => d.papers.find(p => p.id === id)!
  fires('a record label swapped for a namesake\'s', d => { P(d, '632').label = TABLE.find(t => t.id === '641')!.label }, /632: record label/)
  fires('an id that now belongs to someone else (the roster\'s label changed)', (_d, e) => { e.label['648'] = 'רבי נתן נטע שפירא (בעל מגלה עמוקות)' }, /648: record label .* roster/)
  fires('a paper missing from the record', d => { d.papers = d.papers.filter(p => p.id !== '669') }, /not the plan's fifteen/)
  fires('a paper listed twice', d => { d.papers.push(deep(d.papers[0])) }, /not the plan's fifteen/)
  fires('the Drive document differs from the plan\'s', d => { P(d, '635').drive.doc = 'x' }, /635: Drive document/)
  fires('the wrong Drive folder', d => { d.drive_folder = 'x' }, /drive_folder/)
  fires('he.lines differs from the file\'s', d => { P(d, '636').he.lines += 1 }, /636: he\.lines/)
  fires('he.words differs from the file\'s', d => { P(d, '636').he.words += 1 }, /636: he\.words/)
  fires('docx is not the title\'s Word name', d => { P(d, '639').docx = 'x.docx' }, /639: docx/)
  fires('a missing Word file in data/', (_d, e) => { e.dataFiles = e.dataFiles.filter(f => f !== e.sets['640'].he![0].source_file) }, /640: data\/.* is missing/)
  fires('a missing attribution entry', (_d, e) => { const f = e.sets['642'].he![0].source_file; e.attribution = e.attribution.filter(a => a.file !== f) }, /642: 0 attribution entries/)
  fires('a doubled attribution entry', (_d, e) => { const f = e.sets['643'].he![0].source_file; e.attribution.push({ file: f, sage_label: e.label['643'] }) }, /643: 2 attribution entries/)
  fires('an attribution entry under another sage\'s label', (_d, e) => { const f = e.sets['646'].he![0].source_file; e.attribution.find(a => a.file === f)!.sage_label = e.label['647'] }, /646: attributed to/)
  fires('has_research false in one data.json copy', (_d, e) => { e.copies[1]['647']!.has_research = false }, /647: data\.json copy 1: has_research/)
  fires('a node missing from a data.json copy', (_d, e) => { delete e.copies[0]['651'] }, /651: data\.json copy 0: no node/)
  fires('the two data.json copies differ', (_d, e) => { e.copies[1]['652']!.label = 'x' }, /652: data\.json copy 1: node label/)
  fires('copies marked identical with a listed difference', d => { P(d, '657').copies.differences = [{ line: 1, a: 'x', b: 'y', settled: 'a', how: 'read against the Drive text' }] }, /657: copies say identical/)
  fires('a difference without how it was settled', d => { const c = P(d, '669').copies; c.identical = false; c.differences = [{ line: 1, a: 'x', b: 'y', settled: 'a', how: '' }] }, /669: difference at line 1/)
  fires('a quote changed by one letter', d => { P(d, '632').links[0].quote = P(d, '632').links[0].quote.replace('יוסף', 'יוספ') }, /632: link 632 family 641: the quote is not in the paper/)
  fires('a record link absent from data/links-from-research.json', (_d, e) => { e.reviewed = e.reviewed.filter(x => x.paper !== '632') }, /0 entries in data\/links-from-research\.json/)
  fires('a reviewed entry the record does not list', (_d, e) => { e.reviewed.push({ ...e.reviewed.find(x => x.paper === '632')!, b: '635', b_label: e.label['635'] }) }, /632: data\/links-from-research\.json holds 632 family 635/)
  fires('a reviewed entry that differs from the record\'s (relation)', (_d, e) => { e.reviewed.find(x => x.paper === '632')!.relation = 'uncle' }, /differs from the record's/)
  fires('a reviewed entry with a wrong label', (_d, e) => { e.reviewed.find(x => x.paper === '632')!.b_label = 'someone else' }, /a_label\/b_label are not the roster's/)
  fires('a link whose paper is neither end', d => { const l = P(d, '632').links[0]; l.a = '635'; l.b = '636' }, /the paper's sage is neither end/)
  fires('a family link without its relation', d => { delete P(d, '632').links[0].relation }, /relation "undefined"/)
  fires('an added link missing from public/data-paper-links.json', (_d, e) => { e.built = e.built.filter(b => !(b.source === '632' && b.target === '641')) }, /not in public\/data-paper-links\.json/)
  fires('an added link missing from the corpus', (_d, e) => { e.conn = e.conn.filter(c => !(c.source === '632' && c.target === '641')) }, /not in the corpus/)
  fires('already-on-site, but the built file holds it', d => { P(d, '632').links[0].outcome = 'already-on-site' }, /already-on-site, but it is in public\/data-paper-links\.json/)
  fires('already-on-site, but the corpus does not hold it', (d, e) => { P(d, '632').links[0].outcome = 'already-on-site'; e.built = []; e.conn = e.conn.filter(c => !(c.source === '632' && c.target === '641')) }, /already-on-site, but the corpus does not hold it/)
  fires('dropped, but the built file holds it', d => { const l = P(d, '632').links[0]; l.outcome = 'dropped'; l.reason = 'x' }, /dropped, but it is in public\/data-paper-links\.json/)
  fires('dropped without a reason', (d, e) => { const l = P(d, '632').links[0]; l.outcome = 'dropped'; delete l.reason; e.built = [] }, /dropped without a reason/)
  fires('a rejected link present in the reviewed input', (_d, e) => { e.reviewed.push({ paper: '632', a: '632', b: '635', a_label: e.label['632'], b_label: e.label['635'], type: 'teacher', quote: 'a sentence the second reader rejected' }) }, /rejected 632 teacher 635: it is in data\/links-from-research\.json/)
  fires('a rejected link present in the built file', (_d, e) => { e.built.push({ source: '632', target: '635', type: 'teacher', quotes: [] }) }, /rejected 632 teacher 635: it is in public\/data-paper-links\.json/)
  fires('an empty links without a reason', d => { delete P(d, '635').links_none_reason }, /635: no links, and no links_none_reason/)
  fires('a yahrzeit entry that differs from the record\'s', (_d, e) => { e.yList.find(y => y.id === '632')!.day = 9 }, /632: the entry in data\/yahrzeit-from-research\.json differs/)
  fires('a yahrzeit entry missing from the reviewed list', (_d, e) => { e.yList = e.yList.filter(y => y.id !== '636') }, /636: 0 entries in data\/yahrzeit-from-research\.json/)
  fires('a yahrzeit entry listed twice', (_d, e) => { e.yList.push({ id: '636', day: null, reason: 'x' }) }, /636: 2 entries in data\/yahrzeit-from-research\.json/)
  fires('day null without a reason (the reviewed list)', (_d, e) => { delete e.yList.find(y => y.id === '639')!.reason }, /639: day null in data\/yahrzeit-from-research\.json without a reason/)
  fires('no death date and no reason in the record', d => { delete P(d, '639').yahrzeit_none_reason }, /639: no death date, and no yahrzeit_none_reason/)
  fires('the reviewed list has a date the record lacks', (_d, e) => { Object.assign(e.yList.find(y => y.id === '640')!, { day: 3, month: 'Av' }) }, /640: the reviewed list has a date, the record has none/)
  fires('a death date whose quote is not in the paper', (d, e) => { P(d, '632').yahrzeit!.quote = 'not in the paper'; e.yList.find(y => y.id === '632')!.quote = 'not in the paper' }, /632: the death date quote is not in the paper/)
  fires('a death month that does not exist', (d, e) => { P(d, '632').yahrzeit!.month = 'Marchesvan'; e.yList.find(y => y.id === '632')!.month = 'Marchesvan' }, /632: death month/)
  fires('a death day out of range', (d, e) => { P(d, '632').yahrzeit!.day = 31; e.yList.find(y => y.id === '632')!.day = 31 }, /632: death day 31/)
  fires('a date marked added that is missing from public/data-yahrzeit.json', (_d, e) => { delete e.yBuilt['632'] }, /632: death date added, but not in public\/data-yahrzeit\.json/)
  fires('a death date built under another sage\'s label', (_d, e) => { e.yBuilt['632'].label = e.label['641'] }, /632: public\/data-yahrzeit\.json says 8 Shevat for/)
  fires('a dropped death date that is built anyway', d => { P(d, '632').yahrzeit!.outcome = 'dropped' }, /death date dropped, but public\/data-yahrzeit\.json has it/)
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
