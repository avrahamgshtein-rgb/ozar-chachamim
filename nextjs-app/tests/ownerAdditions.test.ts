/**
 * The owner's new episodes, videos and papers of 18-26 October 2026: six sages added to the roster (ids 680-685) and
 * two existing ones (660 R. Yaakov Reischer, 638 the Sma) that gained an episode, a paper and videos.
 *
 * data/owner-additions-2026-10.json is the provenance of the six new entries (the sources read, the verbatim quotes
 * behind every sentence of a bio and a core idea, the links with their quotes). Ids are what drift between data sets
 * (see CLAUDE.md), so every sage here is named by the label the plan gives him and these tests fail when an id now
 * belongs to someone else. They also pin what the rest of the batch promised: the spreadsheet rows, the places on the
 * map, the English and Russian entries, the woman's tag, the episodes, the six papers in three languages (line for
 * line), the sixteen videos, the eight portrait decisions, and the side files that read the new papers.
 *
 * Written from the plan's table and the shapes of the files, not from the code that integrated them. Each rule that is a
 * function over data (record, paper set, video entry, portrait decision, link) is also run on a copy of real data that was
 * broken on purpose, to show it fires: a check that cannot fail checks nothing.
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
import { getYoutubeEntry, sageVideos, type YoutubeEntry } from '../lib/youtube'
import { buildTower } from '../lib/tower'
import { connectNet } from '../lib/connectServer'
import { portraitOf } from '../lib/portraits'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ok  ${name}`); passed++ } catch (e) { console.log(`  FAIL ${name}\n       ${(e as Error).message}`); failed++ }
}

const APP = join(__dirname, '..')
const REPO = join(APP, '..')
const RESEARCH = join(APP, 'public/research')
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

// ---- the plan's table: who, what label, which episode, which papers and videos --------------------------------------
interface Want {
  id: string; label: string; period: string; episode: string; released: string
  /** regions the place must map to (regionsOf contains them) */
  regions: string[]
  /** the first place's map point lies inside [lat min, lat max, lng min, lng max] */
  area: [number, number, number, number]
  /** birth and death (when the row gives them) lie inside these years */
  years: [number, number] | null
}
const NEW: Want[] = [
  { id: '680', label: 'רב אחאי משבחא (בעל השאילתות)', period: 'geonim', episode: '5ojAh8QooySuLiNI8GpY6u', released: '2026-10-26', regions: ['mizrach'], area: [32, 35, 42, 45.5], years: [600, 800] },
  { id: '681', label: 'רבי יצחק אייזיק מקומרנא', period: 'acharonim', episode: '2Hwqxeswo6x7sutb2IM9cr', released: '2026-10-25', regions: ['east-europe'], area: [48.5, 51, 19, 26], years: [1800, 1880] },
  { id: '682', label: 'רבי נתן נטע שפירא (בעל מגלה עמוקות)', period: 'acharonim', episode: '1W9jLv41tnXGcgNYDIEbrL', released: '2026-10-22', regions: ['east-europe'], area: [49.8, 50.3, 19.6, 20.3], years: [1550, 1650] },
  { id: '683', label: 'רחל אמנו', period: 'patriarchs', episode: '1EKJiVlFPRzq9U3HlgXXGq', released: '2026-10-22', regions: ['eretz-israel'], area: [31.5, 31.9, 35, 35.4], years: null },
  { id: '684', label: 'רב עמרם גאון', period: 'geonim', episode: '2ULZn2cKuetkTGLFWYrUx8', released: '2026-10-20', regions: ['mizrach'], area: [31.5, 33.5, 43.5, 45.5], years: [800, 900] },
  { id: '685', label: 'רב יהודאי גאון', period: 'geonim', episode: '187HitcBGTOzR3Lgzja106', released: '2026-10-19', regions: ['mizrach'], area: [31.5, 33.5, 43.5, 45.5], years: [700, 800] },
]
const NEW_IDS = NEW.map(w => w.id)
/** The two sages that were already on the roster and gained an episode, a paper and videos. */
const OLD = [
  { id: '660', label: 'רבי יעקב ריישר (בעל שבות יעקב)', episode: '0mmLEt5P6cWWmeGViach5r' },
  { id: '638', label: 'רבי יהושע פלק כ״ץ (הסמ״ע)', episode: '3sBHDuG9aT7dx4zmtYyDjH' },
]
const EIGHT = [...NEW, ...OLD]
const EPISODE: Record<string, string> = Object.fromEntries(EIGHT.map(w => [w.id, w.episode]))
/** The owner's papers (Google Docs in his folder): the sage each is about, a word of his name the title and text must carry, the document's id. */
const PAPERS = [
  { id: '680', key: 'אחאי', drive: '1PYhQQbCoNV5vzbmrK1hXnpArUVd-fmLJ6ur31YOa1bw' },
  { id: '682', key: 'שפירא', drive: '1YXwErMDJNSUjasevIdlNYAv0QuFT7h4EfSfMYKym6F8' },
  { id: '684', key: 'עמרם', drive: '1FsHBZmrdQ2O8K9QXp9C0uT_eteggIIiJyIk4pugCoAg' },
  { id: '685', key: 'יהודאי', drive: '1peOlj50YUKK9V3F4C52zGfA8n0zl4cssQ9V1BqVRHwM' },
  { id: '660', key: 'ריישר', drive: '1vwKOrt1bW2OCMOf9e5faXpBXdHeww35Z7T3nJTMeV3g' },
  { id: '638', key: 'פלק', drive: '1QW4_nsOy_gSbkmsxeuvarzPFqDYhVZdml76p0xg6j34' },
]
const PAPER_IDS = PAPERS.map(p => p.id)
/** Who is on the other end of a recorded link, by the roster's label (names do not drift, ids do). */
const END_LABEL: Record<string, string> = {
  '558': 'הבעל שם טוב (רבי ישראל בעש"ט)', '462': 'האר״י הקדוש',
  '83': 'רבי שבתאי הכהן (הש"ך)', '653': 'רבי יהונתן אייבשיץ',
  '570': 'יעקב אבינו', '613': 'לאה אמנו', '593': 'רבקה אמנו',
  '41': 'הרמב"ם', '582': 'רבי יצחק אלפסי (הרי"ף)', '344': 'רב סעדיה גאון', '343': 'רבי דוד אבודרהם', '189': 'יעקב בן אשר', '443': 'רבי יוסף קארו',
}
/** The sixteen new uploads: rows of data/youtube-playlist.tsv in the table's order (which language comes first differs from pair to pair), the video ids. */
const VIDEOS: Record<string, { rows: [number, number]; first: 'ru' | 'en'; en: string; ru: string }> = {
  '680': { rows: [1, 2], first: 'ru', ru: '_1TWRjKDa-s', en: '4Oy-yaftVLY' },
  '681': { rows: [3, 4], first: 'ru', ru: '3BOmN4bmM4Q', en: 'ToiikYmzKmE' },
  '682': { rows: [5, 6], first: 'en', en: 'r-lEDt3upnU', ru: 's7Dv9JPI7wA' },
  '683': { rows: [7, 8], first: 'ru', ru: 'lVS-MVsvyp4', en: 'AnyE77SNhhM' },
  '660': { rows: [9, 10], first: 'en', en: 'eTqjBRDE28k', ru: '2hulZG9z-og' },
  '684': { rows: [11, 12], first: 'ru', ru: 'mOo8ndnmE-U', en: 'XvlcoPfNXEI' },
  '638': { rows: [13, 14], first: 'ru', ru: 'u2b5eTQAMWw', en: 'bpENxT6NLkU' },
  '685': { rows: [15, 16], first: 'en', en: 'ioIhmFy6IU8', ru: 'O2tIT5HSCd4' },
}

// ---- text helpers ------------------------------------------------------------------------------------------------------
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

// ---- the corpus ----------------------------------------------------------------------------------------------------------
const sages = getAllSages()
const byId = new Map(sages.map(s => [s.id, s]))
const connections = getAllConnections()
type Conn = { source: string; target: string; type: string }

// =====================================================================================================================
// the provenance file
// =====================================================================================================================
interface Source { kind: string; url: string; title?: string; fetched?: string; paper?: string; quotes: string[] }
interface Sentence { he: string; en: string; ru: string; support: Array<{ src: number; quote: string }> }
interface Link { a: string; b: string; type: string; relation?: string; quote: string; source: string }
interface PaperLink { paper: string; a: string; b: string; a_label: string; b_label: string; type: string; relation?: string; quote: string }
interface Rec {
  id: string; label: string; package: string; woman: boolean
  episode: { id: string; url: string; title: string; released: string }
  sources: Source[]
  sentences: { bio: Sentence[]; core_idea: Sentence[] }
  links: Link[]
  paper_links: PaperLink[]
  yahrzeit: { day: number; month: string; quote: string } | null
  new_places: Array<{ name: string; region: string; lat: number; lng: number; coords_source: { url: string; quote: string } }>
  terms_added: { en: Record<string, string>; ru: Record<string, string> }
  related_cell: string
  notes: string
}
interface Doc { _about: string; dropped_links: Array<{ a: string; b: string; type: string; reason: string }>; sages: Rec[] }
const doc = readJson<Doc>(join(REPO, 'data/owner-additions-2026-10.json'))

const paperText = (id: string): string | null => {
  const f = join(RESEARCH, `${id}.json`)
  return existsSync(f) ? readJson<Array<{ content: string }>>(f).map(d => d.content).join('\n') : null
}

/** Every rule on one record that needs nothing but the record and the papers. */
function recordProblems(r: Rec, paper: (id: string) => string | null): string[] {
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
      const text = paper(s.paper)
      if (text === null) { say(`source ${i}: paper ${s.paper} is not in public/research`); return }
      for (const q of s.quotes) if (!inText(q, text)) say(`source ${i}: quote is not in paper ${s.paper}: ${q.slice(0, 40)}`)
    }
  })
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

console.log('\ndata/owner-additions-2026-10.json')

test('the file holds exactly the ids 680-685, once each, in order, and no entry of the Chida\'s book', () => {
  assert.deepEqual(doc.sages.map(r => r.id), NEW_IDS)
  for (const r of doc.sages) assert.ok(!('shg' in r), `${r.id} carries a Maarekhet Sefarim entry; this batch has none`)
  assert.ok(Array.isArray(doc.dropped_links))
})

test('every id is still the sage the record was written for (the label it carries, and the label the plan gives)', () => {
  const drifted = doc.sages.flatMap(r => {
    const want = NEW.find(w => w.id === r.id)!.label
    return [r.label !== want ? `${r.id}: file "${r.label}", plan "${want}"` : '', byId.get(r.id)?.label !== r.label ? `${r.id}: file "${r.label}", roster "${byId.get(r.id)?.label}"` : ''].filter(Boolean)
  })
  assert.deepEqual(drifted, [], 'regenerate the provenance file, or fix the id')
})

test('every record has sources with URLs and verbatim quotes, and every sentence of the bio and the core idea has support among them', () => {
  assert.deepEqual(doc.sages.flatMap(r => recordProblems(r, paperText)), [])
})

test('a paper source is the sage\'s own paper and carries quotes (that they are verbatim is checked with the records above); exactly 680, 682, 684 and 685 cite one', () => {
  for (const r of doc.sages) for (const s of r.sources.filter(x => x.kind === 'paper')) {
    assert.equal(s.paper, r.id, `${r.id}: a record cites another sage's paper`)
    assert.ok(s.quotes.length >= 1, `${r.id}: a paper source with no quote`)
  }
  assert.deepEqual(doc.sages.filter(r => r.sources.some(s => s.kind === 'paper')).map(r => r.id), ['680', '682', '684', '685'])
})

test('the paper sources name the owner\'s Google documents of the plan; 681 and 683 (no paper in his Drive) cite none', () => {
  for (const r of doc.sages) {
    const papers = r.sources.filter(s => s.kind === 'paper')
    const p = PAPERS.find(x => x.id === r.id)
    if (!p) { assert.equal(papers.length, 0, `${r.id} cites a paper that does not exist`); continue }
    assert.equal(papers.length, 1, `${r.id}: one paper source`)
    assert.ok(papers[0].url.startsWith('https://docs.google.com/document/d/') && papers[0].url.includes(p.drive), `${r.id}: ${papers[0].url}`)
  }
})

test('each record names its episode: the bare Spotify address of the plan, released between 19 and 26 October', () => {
  for (const r of doc.sages) {
    const w = NEW.find(x => x.id === r.id)!
    assert.equal(r.episode.id, w.episode, r.id)
    assert.equal(r.episode.url, `https://open.spotify.com/episode/${w.episode}`, r.id)
    assert.equal(r.episode.released, w.released, r.id)
    assert.ok(r.episode.title.startsWith(w.label.split(' (')[0]), `${r.id}: the episode title "${r.episode.title}" does not begin with his name`)
  }
})

test('a bio and a core idea are exactly the sourced sentences: the site shows what the record sourced, in three languages', () => {
  for (const r of doc.sages) {
    const s = byId.get(r.id)!
    assert.equal(s.bio, r.sentences.bio.map(x => x.he).join(' '), `${r.id} bio`)
    assert.equal(s.core_concept, r.sentences.core_idea.map(x => x.he).join(' '), `${r.id} core idea`)
    for (const loc of ['en', 'ru'] as const) {
      const e = overlayEntry(r.id, loc)
      assert.equal(e?.bio, r.sentences.bio.map(x => x[loc]).join(' '), `${r.id} ${loc} bio`)
      assert.equal(e?.core_concept, r.sentences.core_idea.map(x => x[loc]).join(' '), `${r.id} ${loc} core idea`)
    }
  }
})

test('no model or tool name anywhere in the provenance file', () => {
  const text = readFileSync(join(REPO, 'data/owner-additions-2026-10.json'), 'utf8')
  assert.doesNotMatch(text, /claude|sonnet|opus|haiku|anthropic|gpt-?\d|gemini|llama|mcp__|read_file_content|fetch\.py/i)
})

test('the vocabulary a record added is in the terms files with the same words, and no Hebrew is left in an English or Russian term', () => {
  for (const r of doc.sages) for (const loc of ['en', 'ru'] as const) {
    const terms = readJson<{ terms: Record<string, string> }>(join(APP, `public/i18n/terms.${loc}.json`)).terms
    for (const [he, tr] of Object.entries(r.terms_added[loc])) {
      assert.equal(terms[he], tr, `${r.id} terms.${loc}["${he}"]`)
      assert.ok(tr.trim() && !HEBREW.test(tr), `${r.id} terms.${loc}["${he}"] = "${tr}"`)
      if (loc === 'ru') assert.ok(CYRILLIC.test(tr), `${r.id} terms.ru["${he}"] = "${tr}" is not Russian`)
    }
  }
})

console.log('\nthe record rules, each shown to fire on a copy of real data broken on purpose')

function firesOn(rec: string, mutate: (r: Rec) => void, expect: RegExp) {
  const copy = JSON.parse(JSON.stringify(doc.sages.find(r => r.id === rec))) as Rec
  mutate(copy)
  const found = recordProblems(copy, paperText)
  assert.ok(found.some(p => expect.test(p)), `no problem matching ${expect} in ${JSON.stringify(found)}`)
}

test('the real records are clean (680 with a paper, 683 without one), and each rule fires on a broken copy', () => {
  assert.deepEqual(recordProblems(doc.sages.find(r => r.id === '680')!, paperText), [])
  assert.deepEqual(recordProblems(doc.sages.find(r => r.id === '683')!, paperText), [])
  firesOn('680', r => { r.sentences.bio[0].support = [] }, /no support/)
  firesOn('680', r => { r.sentences.bio[0].support[0].src = 99 }, /does not exist/)
  firesOn('680', r => { r.sentences.bio[0].support[0].quote += ' and more' }, /not among source/)
  firesOn('680', r => { delete r.sources[0].paper }, /without the paper id/)
  firesOn('680', r => { r.sources[0].quotes[0] = 'a sentence the owner never wrote in his paper' }, /not in paper 680/)
  firesOn('680', r => { r.sources[1].url = 'http://he.wikipedia.org/wiki/x' }, /not an https URL/)
  firesOn('680', r => { r.sources[2].url = r.sources[1].url }, /listed twice/)
  firesOn('684', r => { r.links[0].source = 'https://example.org/' }, /not among the record's sources/)
  firesOn('684', r => { r.links[0].b = '684' }, /himself/)
  firesOn('683', r => { delete r.links[0].relation }, /without its relation/)
  firesOn('683', r => { r.sentences.core_idea[0].en = 'Рахель' }, /not English/)
  firesOn('683', r => { r.sentences.core_idea[0].ru = 'Rachel' }, /not Russian/)
  firesOn('683', r => { r.sentences.bio[0].he = r.sentences.bio[0].he.replace('״', '"') + ' ה"תורה' }, /ASCII quote/)
  firesOn('683', r => { r.notes = '' }, /notes/)
})

// =====================================================================================================================
// the six sages in the corpus
// =====================================================================================================================
console.log('\nthe roster')

test('the roster holds 515 sages: the ids 680-685 are the only ones added, and none lies above 685', () => {
  assert.equal(sages.length, 515)
  assert.equal(Math.max(...sages.map(s => Number(s.id))), 685)
  assert.equal(byId.size, sages.length, 'an id twice')
  for (const w of NEW) assert.equal(byId.get(w.id)?.label, w.label, `${w.id}`)
})

test('each sage has a name, a period (the one of the plan), a field, a place, a bio, a core idea and at least 4 tags', () => {
  const missing = NEW.flatMap(w => {
    const s = byId.get(w.id)
    if (!s) return [`${w.id}: not on the roster`]
    const out = (['label', 'period', 'field', 'location', 'bio', 'core_concept'] as const).filter(f => !String(s[f] ?? '').trim()).map(f => `${w.id}: no ${f}`)
    if ((s.tags?.length ?? 0) < 4) out.push(`${w.id}: fewer than 4 tags`)
    if (s.period !== w.period) out.push(`${w.id}: period ${s.period}, the plan has ${w.period}`)
    return out
  })
  assert.deepEqual(missing, [])
})

test('years lie in the century of each sage (a Hebrew year taken for a Gregorian one would not)', () => {
  for (const w of NEW) {
    const s = byId.get(w.id)!
    if (!w.years) { assert.equal(s.birth_year, undefined, `${w.id}`); assert.equal(s.death_year, undefined, `${w.id}`); continue }
    for (const y of [s.birth_year, s.death_year]) {
      if (y === undefined) continue
      assert.ok(y >= w.years[0] && y <= w.years[1], `${w.id} ${w.label}: ${y} is outside ${w.years.join('-')}`)
    }
    if (s.birth_year !== undefined && s.death_year !== undefined) assert.ok(s.birth_year <= s.death_year, `${w.id}: born after he died`)
  }
})

test('Hebrew in a bio and a core idea has gershayim and geresh, never an ASCII quote after a letter', () => {
  for (const w of NEW) {
    const s = byId.get(w.id)!
    assert.doesNotMatch(s.bio ?? '', /[א-ת]["']/, `${w.id} bio`)
    assert.doesNotMatch(s.core_concept ?? '', /[א-ת]["']/, `${w.id} core idea`)
  }
})

test('the two copies of data.json are byte-identical', () => {
  assert.ok(readFileSync(join(REPO, 'data.json')).equals(readFileSync(join(APP, 'public/data.json'))))
})

test('every recorded link is in the corpus, in the direction the record gives, and both ends are on the roster under the label of the plan', () => {
  const dropped = new Set(doc.dropped_links.map(d => `${d.a}|${d.b}|${d.type}`))
  const wrong = doc.sages.flatMap(r => r.links.filter(l => !dropped.has(`${l.a}|${l.b}|${l.type}`)).map(l => linkProblem(l, connections)).filter(Boolean))
  assert.deepEqual(wrong, [])
  const unknown: string[] = []
  for (const r of doc.sages) for (const l of r.links) for (const end of [l.a, l.b].filter(e => e !== r.id)) {
    const want = END_LABEL[end]
    if (!want) unknown.push(`${r.id}: ${l.a} ${l.type} ${l.b}: end ${end} (${byId.get(end)?.label}) is not in the test's table of ends: add it with his label once you have looked`)
    else assert.equal(byId.get(end)?.label, want, `${r.id}: end ${end}`)
  }
  assert.deepEqual(unknown, [])
  const linked = new Set(doc.sages.flatMap(r => r.links.flatMap(l => [l.a, l.b])))
  // 680 (Rav Achai of Shabha) and 685 (Rav Yehudai Gaon) have no recorded link, on purpose: the only candidates (680 -> 685, 685 -> the Rif) rested on the
  // owner's paper alone and the second readers judged them unsupported (the paper says a book attributed to Yehudai relied on the She'iltot, which is no
  // relation between the two men; it says the Rif's work "largely continues his way", a similarity of method, under a footnote that points at an unrelated
  // source). A citation of a book by a later sage is not a stated relation between persons (CLAUDE.md, item 11). Every other new sage has one.
  const NO_LINK = new Set(['680', '685'])
  for (const id of NEW_IDS) {
    if (NO_LINK.has(id)) assert.ok(!linked.has(id), `${id} was recorded without a link on purpose: if a link is added, say why and take him out of NO_LINK`)
    else assert.ok(linked.has(id), `${id} is on no recorded link: a new sage is linked to a sage on the roster`)
  }
})

/** A recorded link is in the corpus as recorded; a student link the other way round is the same teacher link; an influence link yields to a stronger relation of the pair (mergeDatasets keeps one edge a relation). */
function linkProblem(l: { a: string; b: string; type: string }, conns: Conn[]): string | null {
  const exact = conns.some(c => c.source === l.a && c.target === l.b && c.type === l.type)
  if (exact) return null
  if (l.type === 'teacher' && conns.some(c => c.source === l.b && c.target === l.a && c.type === 'student')) return null
  if (l.type === 'influence' && conns.some(c => ((c.source === l.a && c.target === l.b) || (c.source === l.b && c.target === l.a)) && ['teacher', 'student', 'family'].includes(c.type))) return null
  return `${l.a} ${l.type} ${l.b} is not in the corpus`
}

test('the link rule fires: a missing pair, a wrong direction and a wrong type are found; a student edge and a stronger relation are accepted', () => {
  const c: Conn[] = [{ source: '1', target: '2', type: 'teacher' }, { source: '4', target: '3', type: 'student' }, { source: '5', target: '6', type: 'family' }]
  assert.equal(linkProblem({ a: '1', b: '2', type: 'teacher' }, c), null)
  assert.ok(linkProblem({ a: '2', b: '1', type: 'teacher' }, c), 'direction')
  assert.ok(linkProblem({ a: '1', b: '2', type: 'family' }, c), 'type')
  assert.ok(linkProblem({ a: '7', b: '8', type: 'influence' }, c), 'missing')
  assert.equal(linkProblem({ a: '3', b: '4', type: 'teacher' }, c), null, 'student edge')
  assert.equal(linkProblem({ a: '6', b: '5', type: 'influence' }, c), null, 'stronger relation')
})

// =====================================================================================================================
// the spreadsheet
// =====================================================================================================================
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

console.log('\ndata/חכמי_ישראל.xlsx')

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
  core: col(h => h.startsWith('רעיון')), related: col(h => h.startsWith('דמויות')), spotify: col(h => h.includes('ספוטיפיי')),
}
const dataRows = [...sheetRows.keys()].filter(r => r > 1 && sheetRows.get(r)!.has(COL.id)).sort((a, b) => a - b)
const rawNodes = new Map(readJson<{ nodes: Array<Record<string, string>> }>(join(APP, 'public/data.json')).nodes.map(n => [n.id, n]))

test('the sheet has 685 rows: the six new sages were appended after row 679, in order, under their labels', () => {
  assert.equal(dataRows.length, 685)
  assert.deepEqual(dataRows.slice(-6).map(r => sheetRows.get(r)!.get(COL.id)), NEW_IDS)
  assert.deepEqual(dataRows.slice(-6).map(r => sheetRows.get(r)!.get(COL.label)), NEW.map(w => w.label))
})

test('each new row says what the corpus says: years, places, era, field, tags, bio, core idea, related names and episode', () => {
  for (const w of NEW) {
    const row = sheetRows.get(dataRows.find(r => sheetRows.get(r)!.get(COL.id) === w.id)!)!
    const n = rawNodes.get(w.id)!
    const cells: Array<[string, string, string | undefined]> = [
      ['years', COL.years, n.era], ['places', COL.region, n.location], ['era', COL.era, n.era_label], ['field', COL.field, n.field],
      ['tags', COL.tags, n.tags], ['bio', COL.bio, n.bio], ['core idea', COL.core, n.central_idea], ['episode', COL.spotify, n.spotify_url],
    ]
    for (const [name, c, want] of cells) assert.equal(row.get(c), want, `${w.id} ${name}`)
    assert.equal(row.get(COL.spotify), `https://open.spotify.com/episode/${w.episode}`, `${w.id} episode cell`)
    assert.equal(row.get(COL.related) ?? '', doc.sages.find(r => r.id === w.id)!.related_cell ?? '', `${w.id} related names`)  // 680 and 685 have none
  }
})

test('660 and 638 hold their episode in the sheet (every row of the id), under the label of the plan', () => {
  for (const o of OLD) {
    const rows = dataRows.map(r => sheetRows.get(r)!).filter(r => r.get(COL.id) === o.id)
    assert.ok(rows.length >= 1, `${o.id} has no row`)
    for (const row of rows) {
      assert.equal(row.get(COL.label), o.label, `${o.id} label`)
      assert.equal(row.get(COL.spotify), `https://open.spotify.com/episode/${o.episode}`, `${o.id} episode cell`)
    }
  }
})

// R. Yaakov Reischer's years (660). They said כ־1661–1733 from 2026-10-18; on 2026-10-27 the owner, asked whether to keep 1661 or change it to
// 1655, answered "לדייק בתאריך", and they now follow his own paper ("נולד בפראג באמצע המאה ה-17, בסביבות שנת ה'תט"ו (1655)", "1655 בקירוב – 1733")
// and Hebrew Wikipedia ("1655 בקירוב"), the owner's research being the first source (CLAUDE.md, items 11-12). The sources disagree: Sefaria and
// English Wikipedia say 1661, the National Library's title-page card 1670; death 1733 in all. A rebuild or an edit that brings 1661 back has to say why.
const REISCHER_YEARS = 'כ־1655–1733'
interface YearsView { where: string; era: string | null; numbers: { birth?: number; death?: number; precision?: string } | null }
function reischerYearProblems(views: YearsView[]): string[] {
  return views.flatMap(v => {
    const out: string[] = []
    if (v.era !== null && v.era !== REISCHER_YEARS) out.push(`${v.where}: years "${v.era}", not "${REISCHER_YEARS}"`)
    if (v.numbers) {
      if (v.numbers.birth !== 1655) out.push(`${v.where}: birth_year ${v.numbers.birth}, not 1655`)
      if (v.numbers.death !== 1733) out.push(`${v.where}: death_year ${v.numbers.death}, not 1733`)
      if (v.numbers.precision !== 'exact') out.push(`${v.where}: date_precision ${v.numbers.precision}, not exact`)
    }
    return out
  })
}
function reischerViews(): YearsView[] {
  type Raw = { id: string; era?: string; birth_year?: number; death_year?: number; date_precision?: string }
  const views: YearsView[] = dataRows.filter(r => sheetRows.get(r)!.get(COL.id) === '660')
    .map(r => ({ where: `sheet row ${r}`, era: sheetRows.get(r)!.get(COL.years) ?? '', numbers: null }))
  for (const [where, file] of [['data.json (root)', join(REPO, 'data.json')], ['public/data.json', join(APP, 'public/data.json')]] as const) {
    const n = readJson<{ nodes: Raw[] }>(file).nodes.filter(x => x.id === '660')
    views.push(...n.map(x => ({ where, era: x.era ?? '', numbers: { birth: x.birth_year, death: x.death_year, precision: x.date_precision } })))
    if (n.length !== 1) views.push({ where: `${where}: ${n.length} nodes with the id`, era: null, numbers: { birth: undefined, death: undefined } })
  }
  const s = byId.get('660')!
  views.push({ where: 'the corpus the pages read', era: null, numbers: { birth: s.birth_year, death: s.death_year, precision: s.date_precision } })
  return views
}

test('R. Yaakov Reischer (660) is כ־1655–1733 in every row of the sheet, in both copies of data.json and in the corpus the pages read', () => {
  const views = reischerViews()
  assert.ok(views.length >= 4, `the sheet row and the three nodes: ${views.map(v => v.where).join('; ')}`)
  assert.deepEqual(reischerYearProblems(views), [])
  // the reason is in the owner's paper, which is what the years follow
  assert.ok(inText('נולד בפראג באמצע המאה ה-17, בסביבות שנת ה\'תט"ו (1655)', paperText('660') ?? ''), 'the paper no longer says 1655')
})

test('the years rule fires: 1661 in the sheet, in either data.json or in the corpus, and a wrong precision or death year, are found', () => {
  const good = reischerViews()
  for (const i of good.keys()) {
    const bad = good.map((v, k) => (k !== i ? v : { ...v, era: v.era === null ? null : 'כ־1661–1733', numbers: v.numbers && { ...v.numbers, birth: 1661 } }))
    assert.ok(reischerYearProblems(bad).length > 0, `${good[i].where}: 1661 was not found`)
  }
  assert.ok(reischerYearProblems(good.map(v => (v.numbers ? { ...v, numbers: { ...v.numbers, precision: 'century' } } : v))).some(p => /date_precision/.test(p)))
  assert.ok(reischerYearProblems(good.map(v => (v.numbers ? { ...v, numbers: { ...v.numbers, death: 1729 } } : v))).some(p => /death_year/.test(p)))
})

test('the whole tag נשים is in Rachel\'s tags cell, and in no other new row\'s', () => {
  for (const w of NEW) {
    const row = sheetRows.get(dataRows.find(r => sheetRows.get(r)!.get(COL.id) === w.id)!)!
    const tags = (row.get(COL.tags) ?? '').split(/\s*,\s*/)
    assert.equal(tags.includes('נשים'), w.id === '683', w.id)
  }
})

// =====================================================================================================================
// places
// =====================================================================================================================
console.log('\nplaces')

test('every new sage\'s place resolves to a region and to a point on the map, in the area the place is in', () => {
  const bad = NEW.flatMap(w => {
    const s = byId.get(w.id)!
    const out: string[] = []
    const regions = regionsOf(s.location)
    for (const r of w.regions) if (!regions.includes(r as never)) out.push(`${w.id} ${s.location}: regions ${JSON.stringify(regions)} lack ${r}`)
    const pt = resolveCoords(s)
    if (!pt) return [...out, `${w.id} ${s.location}: no coordinates`]
    const [la0, la1, ln0, ln1] = w.area
    if (pt.lat < la0 || pt.lat > la1 || pt.lng < ln0 || pt.lng > ln1) out.push(`${w.id} ${s.location}: the marker (${pt.lat}, ${pt.lng}) is outside [${w.area.join(', ')}]`)
    return out
  })
  assert.deepEqual(bad, [], 'add the place to lib/locationCoords.ts and lib/regions.ts (whole words)')
})

test('every piece of a new sage\'s place list is on the map (the place index and the cohorts read each piece)', () => {
  for (const w of NEW) for (const piece of (byId.get(w.id)!.location ?? '').split(/\s*;\s*/)) {
    assert.ok(resolveCoords({ ...byId.get(w.id)!, coordinates: undefined, location: piece }), `${w.id}: "${piece}" has no map point`)
  }
})

test('a place a record added is declared with its region and the coordinates a source gave, and the gazetteer agrees', () => {
  const places = doc.sages.flatMap(r => r.new_places.map(p => ({ r: r.id, p })))
  assert.ok(places.length > 0, 'the batch added places (Komarno, Pińczów, Zhydachiv, Grodno, Bethlehem)')
  for (const { r, p } of places) {
    assert.ok(p.coords_source.url.startsWith('https://') && p.coords_source.quote.trim(), `${r} ${p.name}: no source for the coordinates`)
    assert.deepEqual(regionsOf(p.name), [p.region], `${r} ${p.name}: region`)
    const pt = resolveCoords({ ...byId.get(r)!, coordinates: undefined, location: p.name })
    assert.ok(pt, `${r} ${p.name}: no map point`)
    assert.ok(Math.abs(pt.lat - p.lat) < 0.05 && Math.abs(pt.lng - p.lng) < 0.05, `${r} ${p.name}: the map has (${pt.lat}, ${pt.lng}), the source (${p.lat}, ${p.lng})`)
  }
})

// =====================================================================================================================
// English and Russian
// =====================================================================================================================
console.log('\nEnglish and Russian')

test('a label, a bio and a core idea in each language for each new sage, with no Hebrew left in them and the right script in them', () => {
  const bad: string[] = []
  for (const w of NEW) for (const loc of ['en', 'ru'] as const) {
    const e = overlayEntry(w.id, loc)
    for (const f of ['label', 'bio', 'core_concept'] as const) {
      const t = e?.[f]?.trim()
      if (!t || HEBREW.test(t) || !(loc === 'en' ? LATIN : CYRILLIC).test(t)) bad.push(`${w.id} ${loc}.${f}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('the roster\'s label conventions: (בעל X) is "(the X)" in English and "(«X»)" in Russian; the matriarchs are labelled as Leah is', () => {
  for (const w of NEW) {
    const he = byId.get(w.id)!.label
    const en = overlayEntry(w.id, 'en')!.label!
    const ru = overlayEntry(w.id, 'ru')!.label!
    if (/\(בעל /.test(he)) {
      assert.match(en, /\(the [^()]+\)$/, `${w.id} "${en}"`)
      assert.match(ru, /\(«[^()»]+»\)$/, `${w.id} "${ru}"`)
    } else {
      assert.doesNotMatch(en, /\(the /, `${w.id} "${en}"`)
    }
  }
  assert.equal(overlayEntry('683', 'en')!.label, 'Rachel Our Matriarch')
  assert.equal(overlayEntry('683', 'ru')!.label, 'Праматерь Рахель')
  assert.match(overlayEntry('613', 'en')!.label!, /Our Matriarch$/)
  assert.match(overlayEntry('613', 'ru')!.label!, /^Праматерь /)
})

// =====================================================================================================================
// the woman
// =====================================================================================================================
console.log('\nRachel')

test('Rachel carries the whole tag נשים, is feminine in the tower and a woman in the Six Steps net, as Leah is; no other new sage is', () => {
  const rachel = sages.find(s => s.label === 'רחל אמנו')
  assert.ok(rachel, 'no sage labelled רחל אמנו')
  assert.equal(rachel.id, '683')
  assert.ok(rachel.tags?.includes('נשים'), 'the whole tag נשים is missing')
  assert.ok(doc.sages.find(r => r.id === '683')!.woman && doc.sages.filter(r => r.woman).length === 1, 'the provenance marks Rachel and nobody else')
  const tower = buildTower(sages, connections, 'he')
  const node = (id: string) => tower.nodes.find(n => n.id === id)
  assert.equal(node('683')?.feminine, true, 'not feminine in the tower')
  assert.equal(node('613')?.feminine, true, 'Leah, the model, is feminine')
  for (const id of NEW_IDS.filter(i => i !== '683')) {
    assert.ok(!byId.get(id)!.tags?.includes('נשים'), `${id} has the women's tag`)
    assert.notEqual(node(id)?.feminine, true, `${id} is feminine in the tower`)
  }
  const net = connectNet('he').sages
  assert.equal(net.find(s => s[0] === '683')?.[3], 1, 'not a woman in the net')
  for (const id of NEW_IDS.filter(i => i !== '683')) assert.notEqual(net.find(s => s[0] === id)?.[3], 1, `${id} is a woman in the net`)
})

test('Rachel\'s family links name Jacob (husband), Leah (sister) and Rebecca (aunt), the elder first, each with a quote', () => {
  const links = doc.sages.find(r => r.id === '683')!.links
  const rel = (id: string) => links.find(l => l.a === id && l.b === '683')
  assert.equal(byId.get('570')?.label, 'יעקב אבינו')
  assert.equal(rel('570')?.relation, 'husband')
  assert.equal(rel('613')?.relation, 'sister')
  assert.equal(rel('593')?.relation, 'aunt')
  for (const l of links) assert.ok(l.type === 'family' && l.quote.trim().length >= 15, `${l.a}-${l.b}`)
})

// =====================================================================================================================
// episodes
// =====================================================================================================================
console.log('\nepisodes')

test('the six new sages\' episodes are the bare Spotify addresses of the plan', () => {
  for (const w of NEW) assert.equal(byId.get(w.id)!.spotify_url, `https://open.spotify.com/episode/${w.episode}`, w.id)
})

// =====================================================================================================================
// the owner's papers
// =====================================================================================================================
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

console.log('\nthe owner\'s papers')

test('680, 682, 684, 685, 660 and 638 each have a Hebrew, English and Russian research file that passes the paper rules', () => {
  const bad = PAPERS.flatMap(p => paperProblems(p.id, readPaperSet(p.id), p.key))
  assert.deepEqual(bad, [])
})

test('the page knows: has_research for the six, and no research file and no flag for 681 and 683', () => {
  for (const id of PAPER_IDS) assert.equal(byId.get(id)?.has_research, true, id)
  for (const id of ['681', '683']) {
    assert.ok(!byId.get(id)!.has_research, `${id} has_research`)
    for (const x of ['', '.en', '.ru']) assert.ok(!existsSync(join(RESEARCH, `${id}${x}.json`)), `${id}${x}.json exists; he has no paper in the owner's Drive`)
  }
})

test('each paper is credited: its Word file is in data/ and research_attribution.json gives it to the sage under his roster label', () => {
  const attribution = readJson<{ documents: Array<{ file: string; sage_label: string }> }>(join(REPO, 'data/research_attribution.json')).documents
  for (const p of PAPERS) {
    const file = readPaperSet(p.id).he![0].source_file
    assert.ok(file.endsWith('.docx') && existsSync(join(REPO, 'data', file)), `${p.id}: data/${file} is missing`)
    const hits = attribution.filter(a => a.file === file)
    assert.equal(hits.length, 1, `${p.id}: ${hits.length} attribution entries for ${file}`)
    assert.equal(hits[0].sage_label, byId.get(p.id)!.label, `${p.id}: attributed to ${hits[0].sage_label}`)
  }
})

test('the paper rules fire: 630 and 631 (earlier papers) pass as they are, and every rule finds a broken copy', () => {
  const real = (id: string, key: string) => ({ id, key, set: readPaperSet(id) })
  for (const { id, key, set } of [real('630', 'אלשיך'), real('631', 'שמואל')]) assert.deepEqual(paperProblems(id, set, key), [], id)
  const copy = () => JSON.parse(JSON.stringify(readPaperSet('630'))) as PaperSet
  const fires = (mutate: (s: PaperSet) => void, expect: RegExp) => {
    const s = copy(); mutate(s)
    const found = paperProblems('630', s, 'אלשיך')
    assert.ok(found.some(p => expect.test(p)), `no problem matching ${expect} in ${JSON.stringify(found)}`)
  }
  const dropLast = (d: PaperDoc) => { d.content = d.content.split('\n').slice(0, -1).join('\n') }
  fires(s => { s.en = null }, /no en research file/)
  fires(s => { s.he = null }, /no Hebrew research file/)
  fires(s => { dropLast(s.en![0]) }, /en document 0: \d+ lines, the Hebrew has \d+/)
  fires(s => { s.ru![0].content = s.ru![0].content.replace(/\[cite: (\d+)/, '[cite: 99$1') }, /markers differ/)
  fires(s => { s.he![0].source_file = 'something.docx' }, /is not the \.docx of the title/)
  fires(s => { s.ru![0].source_file = 'something.docx' }, /source_file differs/)
  fires(s => { s.he![0].word_count += 1 }, /Hebrew document 0: word_count/)
  fires(s => { s.en![0].word_count += 1 }, /en document 0: word_count/)
  fires(s => { s.he![0].content = '**' + s.he![0].content }, /markdown debris/)
  fires(s => { s.he![0].content += '\n \nx'; s.he![0].word_count = words(s.he![0].content) }, /blank or untrimmed/)
  fires(s => { s.en![0].title = 'כותרת בעברית' }, /still Hebrew/)
  fires(s => { const l = s.ru![0].content.split('\n'); l[3] = ''; s.ru![0].content = l.join('\n') }, /an empty line/)
  fires(s => { s.ru![0].content = s.he![0].content; s.ru![0].word_count = s.he![0].word_count }, /still Hebrew/)
  fires(s => { s.en![0].content = s.ru![0].content; s.en![0].word_count = s.ru![0].word_count }, /less than 80% of the letters are Latin/)
  fires(s => { const l = s.en![0].content.split('\n'); const k = l.findIndex(x => /^-{20,}$/.test(x)); l[k] = '- - -'; s.en![0].content = l.join('\n') }, /separator line is not kept/)
  fires(s => { const l = s.en![0].content.split('\n'); const k = l.findIndex(x => x.includes(' | ')); l[k] = l[k].replace(/ \| /g, ' / '); s.en![0].content = l.join('\n') }, /table cells differ/)
  fires(s => { s.he![0].content = s.he![0].content.replace(/אלשיך/g, 'פלוני'); s.he![0].word_count = words(s.he![0].content) }, /names the sage/)
})

// =====================================================================================================================
// videos
// =====================================================================================================================
function videoProblems(id: string, label: string, entry: YoutubeEntry | undefined, want: { en: string; ru: string }): string[] {
  if (!entry) return [`${id}: no entry in data-youtube.json`]
  const out: string[] = []
  const say = (m: string) => out.push(`${id}: ${m}`)
  if (entry.label !== label) say(`the entry was made for "${entry.label}", not "${label}"`)
  if ((entry.he ?? []).length) say('a Hebrew video')
  const ids = (l: 'en' | 'ru') => (entry[l] ?? []).map(v => v.id)
  if (JSON.stringify(ids('en')) !== JSON.stringify([want.en])) say(`English videos ${JSON.stringify(ids('en'))}, expected ["${want.en}"]`)
  if (JSON.stringify(ids('ru')) !== JSON.stringify([want.ru])) say(`Russian videos ${JSON.stringify(ids('ru'))}, expected ["${want.ru}"]`)
  for (const v of entry.en ?? []) if (!v.title.trim() || CYRILLIC.test(v.title) || !(v.seconds > 0)) say(`English video ${v.id}: its title is empty or Russian, or it has no length`)
  for (const v of entry.ru ?? []) if (!CYRILLIC.test(v.title) || !(v.seconds > 0)) say(`Russian video ${v.id}: its title is not Russian, or it has no length`)
  return out
}

interface PlaylistRow { row: number; id: string; seconds: number; lang: string; title: string }
const playlist: PlaylistRow[] = readFileSync(join(REPO, 'data/youtube-playlist.tsv'), 'utf8').split('\n').filter(l => l.trim()).map(l => {
  const [row, id, seconds, lang, ...title] = l.split('\t')
  return { row: Number(row), id, seconds: Number(seconds), lang, title: title.join('\t') }
})

console.log('\nvideos')

test('each of the eight sages has exactly one English and one Russian video (the ones of the plan) and none in Hebrew; the Hebrew page shows none', () => {
  const bad = EIGHT.flatMap(w => videoProblems(w.id, w.label, getYoutubeEntry(w.id), VIDEOS[w.id]))
  assert.deepEqual(bad, [])
  for (const w of EIGHT) {
    assert.deepEqual(sageVideos(w.id, 'en').map(v => v.id), [VIDEOS[w.id].en], `${w.id} en`)
    assert.deepEqual(sageVideos(w.id, 'ru').map(v => v.id), [VIDEOS[w.id].ru], `${w.id} ru`)
    assert.deepEqual(sageVideos(w.id, 'he'), [], `${w.id} he`)
  }
})

test('the video rule fires: 630 (earlier videos) passes, and a swapped pair, a Hebrew video, a wrong sage and a missing entry are found', () => {
  const e630 = getYoutubeEntry('630')
  const label = byId.get('630')!.label
  assert.deepEqual(videoProblems('630', label, e630, { en: 'Rdy9VriKVYM', ru: 'S-9dUr1Xpq4' }), [])
  const has = (found: string[], re: RegExp) => assert.ok(found.some(p => re.test(p)), JSON.stringify(found))
  has(videoProblems('630', label, e630, { en: 'S-9dUr1Xpq4', ru: 'Rdy9VriKVYM' }), /English videos/)
  has(videoProblems('630', label, e630, { en: 'Rdy9VriKVYM', ru: 'S-9dUr1Xpq4' }).concat(videoProblems('630', 'someone else', e630, { en: 'Rdy9VriKVYM', ru: 'S-9dUr1Xpq4' })), /made for/)
  has(videoProblems('630', label, { ...e630!, he: [{ id: 'aaaaaaaaaaa', title: 'x', seconds: 1 }] }, { en: 'Rdy9VriKVYM', ru: 'S-9dUr1Xpq4' }), /Hebrew video/)
  has(videoProblems('630', label, { ...e630!, ru: [{ ...e630!.ru![0], title: 'Latin only' }] }, { en: 'Rdy9VriKVYM', ru: 'S-9dUr1Xpq4' }), /not Russian/)
  has(videoProblems('630', label, undefined, { en: 'a', ru: 'b' }), /no entry/)
})

test('rows 1-16 of the playlist snapshot are the sixteen new uploads, in the language order of the plan, and the length data-youtube.json holds is the snapshot\'s', () => {
  assert.equal(playlist.length, 746)
  assert.deepEqual(playlist.map(r => r.row), Array.from({ length: 746 }, (_, i) => i + 1), 'rows are numbered 1 to 746 without a gap')
  for (const [id, v] of Object.entries(VIDEOS)) {
    const other = v.first === 'ru' ? 'en' : 'ru'
    const [r1, r2] = v.rows.map(n => playlist[n - 1])
    assert.deepEqual([r1.id, r1.lang], [v[v.first], v.first], `${id} row ${v.rows[0]}`)
    assert.deepEqual([r2.id, r2.lang], [v[other], other], `${id} row ${v.rows[1]}`)
    for (const [lang, row] of [[v.first, r1], [other, r2]] as const) {
      const hit = getYoutubeEntry(id)?.[lang]?.[0]
      assert.equal(hit?.seconds, row.seconds, `${id} ${lang}: length`)
      assert.equal(hit?.title, row.title, `${id} ${lang}: title`)
    }
  }
  assert.deepEqual(Object.values(VIDEOS).flatMap(v => v.rows).sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i + 1))
})

test('the hand-checked map: the eight sages hold rows 1-16 as the plan lists them; every other row moved by 16 (the older six uploads and the left-out keys)', () => {
  const map = readJson<{ sages: Record<string, number[]>; _left_out: Record<string, string> }>(join(REPO, 'data/youtube-sage-map.json'))
  for (const [id, v] of Object.entries(VIDEOS)) assert.deepEqual(map.sages[id], v.rows, id)
  // the three sages whose uploads were at the top of the snapshot before this batch (Mabit, Alshich, R. Shmuel de Uzeda) now start at row 17
  assert.deepEqual([map.sages['632'], map.sages['630'], map.sages['631']], [[17, 18], [19, 20], [21, 22]])
  const rowsOf = (k: string) => k.split('-').map(Number)
  for (const [id, rows] of Object.entries(map.sages)) if (!(id in VIDEOS)) for (const r of rows) assert.ok(r >= 17 && r <= 746, `${id}: row ${r} lies among the new uploads or past the end`)
  for (const k of Object.keys(map._left_out)) for (const r of rowsOf(k)) assert.ok(r >= 17 && r <= 746, `left-out key ${k}: row ${r}`)
  for (const [id, rows] of Object.entries(map.sages)) {
    for (const r of rows) assert.ok(playlist[r - 1], `${id}: row ${r} is not in the snapshot`)
  }
  assert.ok('101-102' in map._left_out && !('85-86' in map._left_out), 'the two Ekev lessons moved from 85-86 to 101-102')
})

// =====================================================================================================================
// portraits
// =====================================================================================================================
interface PortraitReview { _approved_photos: string[]; portraits: Record<string, Json>; _left_out: Record<string, Json> }
const LEFT_OUT_REASONS = ['photo', 'other-person', 'symbol', 'text', 'gender', 'quality', 'title-mismatch']

/** A decision on one episode cover: kept (with a crop, the files and its tile in the atlas) or left out (with a reason other than "no episode"), never both, never an unapproved photograph. */
function portraitProblems(
  id: string, label: string, episode: string, review: PortraitReview,
  fileExists: (rel: string) => boolean, atlasIds: string[], portrait: (id: string) => { kind: string } | null,
): string[] {
  const out: string[] = []
  const say = (m: string) => out.push(`${id}: ${m}`)
  const kept = review.portraits[id]
  const left = review._left_out[id]
  if (review._approved_photos.includes(id)) say('listed in _approved_photos; the owner\'s approval of 2026-10-18 covered the covers that existed then')
  if (!kept && !left) { say('no decision (neither kept nor left out)'); return out }
  if (kept && left) say('both kept and left out')
  const entry = kept ?? left
  if (entry.label !== label) say(`the entry was made for "${entry.label}"`)
  if (entry.episode !== episode) say(`the entry names episode "${entry.episode}", the sage's is ${episode}`)
  if (kept) {
    if (kept.kind !== 'illustration') say(`kept as "${kept.kind}"; a photograph of a new cover stays out until the owner approves it`)
    if (!/^[0-9a-f]{24}$/.test(kept.image ?? '')) say('no 24-hex cover hash')
    if (!Array.isArray(kept.crop) || kept.crop.length !== 3 || !kept.crop.every((n: unknown) => Number.isInteger(n))) say('no crop of three integers')
    if (!String(kept.note ?? '').trim()) say('no note on the crop')
    for (const f of [`public/portraits/${id}.webp`, `public/portraits/${id}.sm.webp`, `assets/og/portraits/${id}.jpg`]) if (!fileExists(f)) say(`${f} is missing`)
    if (!atlasIds.includes(id)) say('no tile in the tower\'s atlas')
    if (portrait(id)?.kind !== 'illustration') say('portraitOf does not return an illustration')
  } else {
    if (!LEFT_OUT_REASONS.includes(left.reason)) say(`left out for "${left.reason}"${left.reason === 'no-episode' ? ' (but the sage has an episode now)' : ''}`)
    if (!String(left.note ?? '').trim()) say('left out without a note')
    if (portrait(id)) say('left out, but portraitOf returns a portrait')
  }
  return out
}

console.log('\nportraits')

test('each of the eight episode covers is decided: kept with a crop, its files and its tile, or left out with a reason; 660 and 638 are no longer "no episode"', () => {
  const review = readJson<PortraitReview>(join(REPO, 'data/portraits-review.json'))
  const atlas = readJson<{ ids: string[] }>(join(APP, 'public/portraits/atlas.json')).ids
  const bad = EIGHT.flatMap(w => portraitProblems(w.id, w.label, w.episode, review, rel => existsSync(join(APP, rel)), atlas, portraitOf))
  assert.deepEqual(bad, [])
})

test('the portrait rule fires: a kept entry, a left-out one, an undecided sage, a "no episode" leftover, an unapproved photograph and a missing file are told apart', () => {
  const keptEntry = { label: 'L', episode: 'E', image: 'a'.repeat(24), kind: 'illustration', crop: [1, 2, 3], note: 'n' }
  const base = (): PortraitReview => ({ _approved_photos: [], portraits: { '1': { ...keptEntry } }, _left_out: { '2': { label: 'L', episode: 'E', reason: 'text', note: 'n' } } })
  const run = (id: string, review: PortraitReview, exists = true, atlas = ['1'], portrait: (i: string) => { kind: string } | null = i => (i === '1' ? { kind: 'illustration' } : null)) =>
    portraitProblems(id, 'L', 'E', review, () => exists, atlas, portrait)
  assert.deepEqual(run('1', base()), [])
  assert.deepEqual(run('2', base()), [])
  const has = (found: string[], re: RegExp) => assert.ok(found.some(p => re.test(p)), JSON.stringify(found))
  has(run('3', base()), /no decision/)
  { const r = base(); r._left_out['2'].reason = 'no-episode'; has(run('2', r), /but the sage has an episode now/) }
  { const r = base(); r.portraits['1'].kind = 'photo'; has(run('1', r), /stays out until the owner approves/) }
  { const r = base(); r._approved_photos = ['1']; has(run('1', r), /_approved_photos/) }
  { const r = base(); r._left_out['1'] = { ...r._left_out['2'] }; has(run('1', r), /both kept and left out/) }
  { const r = base(); r.portraits['1'].episode = 'other'; has(run('1', r), /names episode/) }
  { const r = base(); r.portraits['1'].label = 'M'; has(run('1', r), /made for/) }
  { const r = base(); r.portraits['1'].crop = [1, 2]; has(run('1', r), /crop of three integers/) }
  has(run('1', base(), false), /is missing/)
  has(run('1', base(), true, []), /atlas/)
  has(run('1', base(), true, ['1'], () => null), /portraitOf/)
  has(run('2', base(), true, ['1'], () => ({ kind: 'illustration' })), /portraitOf returns a portrait/)
})

// =====================================================================================================================
// the side files that read the new papers, the episodes and the videos
// =====================================================================================================================
const sameLink = (x: PaperLink, y: PaperLink) => x.paper === y.paper && x.a === y.a && x.b === y.b && x.type === y.type
const SHELAH = 'רבי ישעיה הלוי הורוויץ (השל״ה הקדוש)'

/** data/links-from-research.json (the reviewed list build_paper_links.py reads): the records' candidates are in it, and what it holds for this batch is sound. */
function paperLinkProblems(reviewed: PaperLink[], records: Rec[]): string[] {
  const out: string[] = []
  for (const r of records) for (const c of r.paper_links) {
    const hit = reviewed.find(x => sameLink(x, c))
    if (!hit) out.push(`${r.id}: ${c.a} ${c.type} ${c.b} (paper ${c.paper}) is not in data/links-from-research.json`)
    else if (!isDeepStrictEqual(hit, c)) out.push(`${r.id}: the reviewed entry ${c.a} ${c.type} ${c.b} differs from the record's`)
  }
  const batch = new Set(EIGHT.map(w => w.id))
  for (const e of reviewed.filter(x => PAPER_IDS.includes(x.paper) || batch.has(x.a) || batch.has(x.b))) {
    const at = `paper ${e.paper}: ${e.a} ${e.type} ${e.b}`
    if (byId.get(e.a)?.label !== e.a_label) out.push(`${at}: a_label "${e.a_label}" is not the roster's "${byId.get(e.a)?.label}"`)
    if (byId.get(e.b)?.label !== e.b_label) out.push(`${at}: b_label "${e.b_label}" is not the roster's "${byId.get(e.b)?.label}"`)
    if (e.paper !== e.a && e.paper !== e.b) out.push(`${at}: the paper is not one of its ends`)
    if (!(e.type === 'teacher' || (e.type === 'family' && e.relation))) out.push(`${at}: type ${e.type}${e.type === 'family' ? ' without a relation' : ''}`)
    const text = paperText(e.paper)
    if (text === null || !inText(e.quote, text)) out.push(`${at}: the quote is not in the paper`)
  }
  // the papers of 660 and 638 were read for relations; the Shelah's own paper names the Sma as a teacher (decided 2026-10-27)
  for (const id of ['660', '638']) if (!reviewed.some(e => e.paper === id)) out.push(`no relation from the paper of ${id} (the provenance file says its candidates are in the list)`)
  const shelah = sages.find(s => s.label === SHELAH)
  if (!shelah) out.push(`no sage labelled ${SHELAH}`)
  else if (!reviewed.some(e => e.paper === shelah.id && e.a === '638' && e.b === shelah.id && e.type === 'teacher')) out.push('the Sma as the Shelah\'s teacher, from the Shelah\'s own paper, is not in the list')
  return out
}

interface YahrzeitItem { id: string; day?: number | null; month?: string; quote?: string }
type BuiltYahrzeit = Record<string, { label: string; day: number; month: string; quote: string }>
/** A death date a record carries is in the reviewed list, in the paper, and in the built file under the sage's label. */
function yahrzeitProblems(list: YahrzeitItem[], built: BuiltYahrzeit, records: Rec[]): string[] {
  const out: string[] = []
  const withDate = records.filter(r => r.yahrzeit)
  for (const r of withDate) {
    const y = r.yahrzeit!
    const hit = list.find(x => x.id === r.id)
    if (!hit) { out.push(`${r.id}: not in data/yahrzeit-from-research.json`); continue }
    if (!isDeepStrictEqual([hit.day, hit.month, hit.quote], [y.day, y.month, y.quote])) out.push(`${r.id}: the reviewed entry differs from the record's`)
    const text = paperText(r.id)
    if (!text || !inText(y.quote, text)) out.push(`${r.id}: the quote is not in his paper`)
    const b = built[r.id]
    if (!b) out.push(`${r.id}: not in public/data-yahrzeit.json (run scripts/build_yahrzeit.py)`)
    else if (!isDeepStrictEqual([b.label, b.day, b.month], [byId.get(r.id)!.label, y.day, y.month])) out.push(`${r.id}: data-yahrzeit.json says ${b.day} ${b.month} for "${b.label}"`)
  }
  return out
}

interface DescDoc {
  site: string
  youtube: Array<{ id: string; lang: string; sage: string; line: string; claims: { kind: string } }>
  spotify: Array<{ sage: string; episode: string; line: string; claims: { kind: string } }>
}
/** Each of the sixteen new videos and the eight episodes has one line that leads to its sage's page in its language, with the channel's tags. */
function descriptionProblems(d: DescDoc): string[] {
  const out: string[] = []
  for (const [id, v] of Object.entries(VIDEOS)) {
    for (const lang of ['en', 'ru'] as const) {
      const rows = d.youtube.filter(r => r.id === v[lang])
      if (rows.length !== 1) { out.push(`${id} ${lang}: ${rows.length} lines for video ${v[lang]}`); continue }
      const [row] = rows
      if (row.sage !== id || row.lang !== lang) out.push(`${id} ${lang}: the line is for sage ${row.sage} in ${row.lang}`)
      if (!row.line.includes(`${d.site}/${lang}/sage/${id}?utm_source=youtube&utm_medium=video`)) out.push(`${id} ${lang}: the line leads elsewhere: ${row.line}`)
      if (row.claims.kind !== (id === '683' ? 'f' : 'm')) out.push(`${id} ${lang}: the line speaks of the sage as ${row.claims.kind}`)
    }
    const eps = d.spotify.filter(r => r.sage === id)
    if (eps.length !== 1) { out.push(`${id}: ${eps.length} Spotify lines`); continue }
    if (eps[0].episode !== `https://open.spotify.com/episode/${EPISODE[id]}`) out.push(`${id}: the line is for episode ${eps[0].episode}`)
    if (!eps[0].line.includes(`${d.site}/he/sage/${id}?utm_source=spotify&utm_medium=podcast`)) out.push(`${id}: the Spotify line leads elsewhere: ${eps[0].line}`)
  }
  return out
}

console.log('\nthe side files')

const reviewedLinks = readJson<PaperLink[]>(join(REPO, 'data/links-from-research.json'))
const yahrzeitList = readJson<YahrzeitItem[]>(join(REPO, 'data/yahrzeit-from-research.json'))
const yahrzeitBuilt = readJson<BuiltYahrzeit>(join(APP, 'public/data-yahrzeit.json'))
const descDoc = readJson<DescDoc>(join(REPO, 'data/description-links.json'))

test('paper links: the records\' candidates are in data/links-from-research.json as recorded, the entries for this batch are sound (roster labels, quote in the paper), and the papers of 660 and 638 and the Shelah\'s paper gave relations', () => {
  assert.deepEqual(paperLinkProblems(reviewedLinks, doc.sages), [])
})

test('death date: the one a record carries is in data/yahrzeit-from-research.json, in its paper, and in the built data-yahrzeit.json', () => {
  assert.deepEqual(yahrzeitProblems(yahrzeitList, yahrzeitBuilt, doc.sages), [])
})

test('description links: each of the sixteen new videos and the eight episodes has a line that leads to its sage\'s page in its language, with the right tags', () => {
  assert.deepEqual(descriptionProblems(descDoc), [])
})

// The three checks above need the lead's merge and the side-file scripts to have run. Here each is shown on a hand-made
// "after" state (the real files plus what the merge adds), and shown to fire when a piece of it is taken away.
console.log('\nthe side-file rules, on a hand-made state after the merge')

/** What the merge adds for the papers of 660, 638 and 599, with the roster's own labels, quoted from the papers. */
function mergedLinks(): PaperLink[] {
  const label = (id: string) => byId.get(id)!.label
  const shelah = sages.find(s => s.label === SHELAH)!.id
  const add: PaperLink[] = [
    { paper: '660', a: '660', b: '648', a_label: label('660'), b_label: label('648'), type: 'family', relation: 'brother-in-law', quote: 'שני גיסיו (בני רבי בנימין וולף שפירא) היו מגדולי הפוסקים בדורם' },
    { paper: '638', a: '463', b: '638', a_label: label('463'), b_label: label('638'), type: 'teacher', quote: 'את תורתו קנה משחר נעוריו מפי שני ענקי הדור שעיצבו את פני הפסיקה האשכנזית: רבנו משה איסרליש (הרמ"א) ורבנו שלמה לוריא (המהרש"ל)' },
    { paper: shelah, a: '638', b: shelah, a_label: label('638'), b_label: label(shelah), type: 'teacher', quote: 'הוא זכה לינוק מתורתם של רבי מאיר מלובלין (המהר"ם מלובלין), רבי יהושע פלק (בעל הסמ"ע) ורבי נתן נטע שפירא' },
  ]
  return [...reviewedLinks.filter(e => !add.some(x => sameLink(x, e))), ...add, ...doc.sages.flatMap(r => r.paper_links)]
    .filter((e, i, all) => all.findIndex(x => sameLink(x, e)) === i)
}

test('paper-link rules: a merged list is clean, and each rule fires when its piece is taken away or spoiled', () => {
  const merged = mergedLinks()
  assert.deepEqual(paperLinkProblems(merged, doc.sages), [])
  const fires = (list: PaperLink[], re: RegExp) => { const f = paperLinkProblems(list, doc.sages); assert.ok(f.some(p => re.test(p)), JSON.stringify(f)) }
  const copy = () => JSON.parse(JSON.stringify(merged)) as PaperLink[]
  fires(merged.filter(e => e.paper !== '682'), /is not in data\/links-from-research\.json/)
  fires(merged.filter(e => e.paper !== '660'), /no relation from the paper of 660/)
  fires(merged.filter(e => !(e.a === '638' && e.type === 'teacher' && e.paper !== '638')), /Shelah/)
  { const l = copy(); l.find(e => e.paper === '682')!.quote += ' (changed)'; fires(l, /differs from the record's/) }
  { const l = copy(); l.find(e => e.paper === '660')!.a_label = 'someone else'; fires(l, /a_label/) }
  { const l = copy(); l.find(e => e.paper === '638')!.quote = 'a sentence that is not in the paper'; fires(l, /quote is not in the paper/) }
  { const l = copy(); const e = l.find(x => x.paper === '660')!; delete e.relation; fires(l, /without a relation/) }
  { const l = copy(); l.find(e => e.paper === '660')!.paper = '638'; fires(l, /not one of its ends/) }
})

test('death-date rules: a merged list and built file are clean, and each rule fires when a piece is missing or spoiled', () => {
  const rec = doc.sages.find(r => r.id === '682')!
  const y = rec.yahrzeit!
  const list: YahrzeitItem[] = [...yahrzeitList.filter(x => x.id !== '682'), { id: '682', day: y.day, month: y.month, quote: y.quote }]
  const built: BuiltYahrzeit = { ...yahrzeitBuilt, '682': { label: byId.get('682')!.label, day: y.day, month: y.month, quote: y.quote } }
  assert.deepEqual(yahrzeitProblems(list, built, doc.sages), [])
  const fires = (l: YahrzeitItem[], b: BuiltYahrzeit, re: RegExp, recs = doc.sages) => { const f = yahrzeitProblems(l, b, recs); assert.ok(f.some(p => re.test(p)), JSON.stringify(f)) }
  fires(list.filter(x => x.id !== '682'), built, /not in data\/yahrzeit-from-research/)
  fires(list.map(x => (x.id === '682' ? { ...x, day: 14 } : x)), built, /reviewed entry differs/)
  fires(list, Object.fromEntries(Object.entries(built).filter(([k]) => k !== '682')), /not in public\/data-yahrzeit/)
  fires(list, { ...built, '682': { ...built['682'], label: 'someone else' } }, /data-yahrzeit\.json says/)
  const spoiled = JSON.parse(JSON.stringify(doc.sages)) as Rec[]
  spoiled.find(r => r.id === '682')!.yahrzeit!.quote = 'a sentence that is not in the paper'
  fires(list.map(x => (x.id === '682' ? { ...x, quote: 'a sentence that is not in the paper' } : x)), built, /quote is not in his paper/, spoiled)
  // 680, 684 and 685 each have a reviewed entry too (no day: their papers give none), so the "no entry" case is shown on 683,
  // who has no paper and so no line in the reviewed list
  const another = JSON.parse(JSON.stringify(doc.sages)) as Rec[]
  another.find(r => r.id === '683')!.yahrzeit = { day: 1, month: 'Tishri', quote: y.quote }
  fires(list, built, /683: not in data\/yahrzeit-from-research/, another)
})

test('description-link rules: a state with the 16 + 8 lines is clean, and each rule fires on a missing, misdirected or mis-gendered line', () => {
  const site = descDoc.site
  const yt = Object.entries(VIDEOS).flatMap(([id, v]) => (['en', 'ru'] as const).map(lang => ({
    id: v[lang], lang, sage: id, claims: { kind: id === '683' ? 'f' : 'm' }, line: `x: ${site}/${lang}/sage/${id}?utm_source=youtube&utm_medium=video`,
  })))
  const sp = Object.keys(VIDEOS).map(id => ({ sage: id, episode: `https://open.spotify.com/episode/${EPISODE[id]}`, claims: { kind: id === '683' ? 'f' : 'm' }, line: `x: ${site}/he/sage/${id}?utm_source=spotify&utm_medium=podcast` }))
  const after = (): DescDoc => ({ site, youtube: [...descDoc.youtube.filter(r => !yt.some(y => y.id === r.id)), ...yt.map(y => ({ ...y }))], spotify: [...descDoc.spotify.filter(r => !(r.sage in VIDEOS)), ...sp.map(s => ({ ...s }))] })
  assert.deepEqual(descriptionProblems(after()), [])
  const fires = (mutate: (d: DescDoc) => void, re: RegExp) => { const d = after(); mutate(d); const f = descriptionProblems(d); assert.ok(f.some(p => re.test(p)), JSON.stringify(f)) }
  fires(d => { d.youtube = d.youtube.filter(r => r.id !== VIDEOS['638'].en) }, /638 en: 0 lines/)
  fires(d => { d.spotify = d.spotify.filter(r => r.sage !== '684') }, /684: 0 Spotify lines/)
  fires(d => { d.youtube.find(r => r.id === VIDEOS['680'].ru)!.line = d.youtube.find(r => r.id === VIDEOS['680'].ru)!.line.replace('/ru/', '/en/') }, /leads elsewhere/)
  fires(d => { d.youtube.find(r => r.id === VIDEOS['683'].en)!.claims.kind = 'm' }, /speaks of the sage as m/)
  fires(d => { d.spotify.find(r => r.sage === '681')!.episode = 'https://open.spotify.com/episode/other' }, /the line is for episode/)
  fires(d => { d.youtube.find(r => r.id === VIDEOS['685'].en)!.sage = '684' }, /the line is for sage 684/)
  fires(d => { d.spotify.find(r => r.sage === '682')!.line = d.spotify.find(r => r.sage === '682')!.line.replace('utm_source=spotify', 'utm_source=x') }, /Spotify line leads elsewhere/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
