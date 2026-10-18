/**
 * The 17 sages added with the owner's tier-A Shem HaGedolim research papers (ids 680-696), and the
 * papers themselves: data/shem-hagedolim-additions-2.json is the provenance of every new entry (the
 * Maarekhet Sefarim/Gedolim entry that names him, the sources read, the verbatim quote behind every
 * sentence of his bio and core idea in Hebrew, English and Russian, the links with their quotes). Ids
 * are what drift between data sets (see CLAUDE.md), so each record carries the label it was written
 * under, and so does this file: the tests fail when an id now belongs to someone else. Also that every
 * new place is on the map and in a region, that all 34 papers (the 17 new sages and the 17 sages
 * already on the roster) exist in Hebrew, English and Russian and are marked as having research.
 * Mirrors tests/shemHagedolim.test.ts for ids 630-679.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getAllConnections, getAllSages } from '../lib/serverData'
import { overlayEntry } from '../lib/serverDataTranslator'
import { regionsOf } from '../lib/regions'
import { resolveCoords } from '../lib/locationCoords'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ok  ${name}`); passed++ } catch (e) { console.log(`  FAIL ${name}\n       ${(e as Error).message}`); failed++ }
}

type Source = { kind: string; key?: string; url: string; ref?: string; paper?: string; quotes: string[] }
type Claim = { lang: 'he' | 'en' | 'ru'; field: 'bio' | 'core_concept'; text: string; quotes: Array<{ source: string; quote: string }> }
type Rec = {
  id: string; label: string; package: string
  shg: { ref: string; quote: string; names: string[] } | null
  sources: Source[]
  links: Array<{ a: string; b: string; type: string; quote: string; source: string }>
  claims: Claim[]
  notes: string
}
type Doc = { dropped_links: Array<{ a: string; b: string; type: string; reason: string }>; sages: Rec[] }

const PROVENANCE = join(__dirname, '../../data/shem-hagedolim-additions-2.json')
const RESEARCH = join(__dirname, '../public/research')

// The 17 new sages: id → [Hebrew, English, Russian] label, as agreed before they were written.
const NEW: Record<string, [string, string, string]> = {
  '680': ['רב יהודאי גאון', 'Rav Yehudai Gaon', 'Рав Йехудай-гаон'],
  '681': ['רב (אבא אריכא)', 'Rav (Abba Arikha)', 'Рав (Абба Арика)'],
  '682': ['רבי אברהם זכות (בעל ספר יוחסין)', 'Rabbi Avraham Zacut (the Sefer Yuchasin)', 'Рабби Авраам Закут («Сефер юхасин»)'],
  '683': ['רבי אברהם בן נתן הירחי (בעל ספר המנהיג)', 'Rabbi Avraham ben Natan HaYarchi (the Sefer HaManhig)', 'Рабби Авраам бен Натан а-Ярхи («Сефер а-Манхиг»)'],
  '684': ['רבי אהרן ברכיה ממודינה (בעל מעבר יבק)', 'Rabbi Aharon Berechia of Modena (the Maavar Yabbok)', 'Рабби Аарон Берехья из Модены («Маавар Явок»)'],
  '685': ['רב אחאי גאון (בעל השאילתות)', 'Rav Achai Gaon (the Sheiltot)', 'Рав Ахай-гаон («Шеилтот»)'],
  '686': ['רבי דוד אופנהיים', 'Rabbi David Oppenheim', 'Рабби Давид Оппенгейм'],
  '687': ['רבי ידידיה שלמה רפאל נורצי (בעל מנחת שי)', 'Rabbi Yedidya Shlomo Raphael Norzi (the Minchat Shai)', 'Рабби Едидья Шломо Рафаэль Норци («Минхат ши»)'],
  '688': ['רבי מאיר אייזנשטט (בעל פנים מאירות)', 'Rabbi Meir Eisenstadt (the Panim Meirot)', 'Рабби Меир Айзенштадт («Паним меирот»)'],
  '689': ['רבי מאיר שיף (המהר״ם שיף)', 'Rabbi Meir Schiff (the Maharam Schiff)', 'Рабби Меир Шиф (Махарам Шиф)'],
  '690': ['רב נסים גאון', 'Rav Nissim Gaon', 'Рав Нисим-гаон'],
  '691': ['רבי נתן נטע שפירא (בעל מגלה עמוקות)', 'Rabbi Natan Neta Shapira (the Megaleh Amukot)', 'Рабби Натан Нета Шапиро («Мегале амукот»)'],
  '692': ['רב עמרם גאון', 'Rav Amram Gaon', 'Рав Амрам-гаон'],
  '693': ['רבי צבי הירש אשכנזי (החכם צבי)', 'Rabbi Tzvi Hirsch Ashkenazi (the Chacham Tzvi)', 'Рабби Цви-Гирш Ашкенази (Хахам Цви)'],
  '694': ['רבי שמואל יפה אשכנזי (בעל יפה תואר)', 'Rabbi Shmuel Yaffe Ashkenazi (the Yefe Toar)', 'Рабби Шмуэль Яффе Ашкенази («Йефе тоар»)'],
  '695': ['רבי שמואל אבן תיבון', 'Rabbi Shmuel ibn Tibbon', 'Рабби Шмуэль ибн Тиббон'],
  '696': ['רבי שמשון בן אברהם משאנץ (הר״ש משאנץ)', 'Rabbi Shimshon ben Avraham of Sens (the Rash of Sens)', 'Рабби Шимшон бен Авраам из Санса (Раш из Санса)'],
}
const NEW_IDS = Object.keys(NEW)
// The 17 sages already on the roster (ids 630-679 and earlier) whose papers came with this batch.
const EXISTING_IDS = ['638', '646', '642', '669', '647', '648', '657', '641', '640', '660', '652', '636', '632', '635', '651', '639', '643']
const ALL_IDS = [...EXISTING_IDS, ...NEW_IDS]

const sages = getAllSages()
const byId = new Map(sages.map(s => [s.id, s]))
const norm = (s: string) => s.replace(/[״“”"]/g, '"').replace(/[׳’']/g, "'").replace(/[־‐‑–—]/g, '-').replace(/\s+/g, ' ').trim()
const HEBREW = /[א-ת]/
const LETTERS = 'Alef|Bet|Gimel|Dalet|He|Vav|Zayin|Chet|Tet|Yod|Kaf|Lamed|Mem|Nun|Samekh|Ayin|Peh|Tzadi|Kof|Resh|Shin|Tav'

let loadError = ''
let doc: Doc = { dropped_links: [], sages: [] }
try { doc = JSON.parse(readFileSync(PROVENANCE, 'utf8')) as Doc } catch (e) { loadError = (e as Error).message }
const need = () => { if (loadError) throw new Error(`data/shem-hagedolim-additions-2.json is not readable (${loadError}): run integrate_new_sages.py --apply`) }

console.log('\ndata/shem-hagedolim-additions-2.json')

test('the file holds exactly the ids 680-696, once each, in order', () => {
  need()
  assert.deepEqual(doc.sages.map(r => r.id), NEW_IDS)
})

test('every id is still the sage it was written for: the record, the roster and the agreed label say the same', () => {
  need()
  const drifted = doc.sages.flatMap(r => {
    const out: string[] = []
    if (r.label !== NEW[r.id]?.[0]) out.push(`${r.id}: file "${r.label}", agreed "${NEW[r.id]?.[0]}"`)
    if (byId.get(r.id)?.label !== NEW[r.id]?.[0]) out.push(`${r.id}: roster "${byId.get(r.id)?.label}", agreed "${NEW[r.id]?.[0]}"`)
    return out
  })
  assert.deepEqual(drifted, [], 'regenerate the provenance file, or fix the id')
})

test('each sage has a name, a period, a field, a place, a bio, a core idea and at least 4 tags', () => {
  const missing = NEW_IDS.flatMap(id => {
    const s = byId.get(id)
    if (!s) return [`${id}: not on the roster`]
    return (['label', 'period', 'field', 'location', 'bio', 'core_concept'] as const)
      .filter(f => !String(s[f] ?? '').trim()).map(f => `${id}: no ${f}`)
      .concat((s.tags?.length ?? 0) >= 4 ? [] : [`${id}: fewer than 4 tags`])
  })
  assert.deepEqual(missing, [])
})

test('the new sages carry no episode of the Spotify series (the owner wires those)', () => {
  for (const id of NEW_IDS) {
    const s = byId.get(id)!
    assert.equal(s.spotify_url ?? '', '', id)
  }
})

test('each sage has the Shem HaGedolim entry that names him, with a quote naming him, or the record explains why not', () => {
  need()
  const bad: string[] = []
  for (const r of doc.sages) {
    const shg = r.shg
    if (!shg) { if (!/Maarekhet|Gedolim|מערכת/.test(r.notes) || r.notes.length < 40) bad.push(`${r.id}: no entry and no explanation`); continue }
    if (!new RegExp(`^Shem HaGedolim, Maarekhet (Sefarim|Gedolim), Letter (${LETTERS}) \\d+(:\\d+)?$`).test(shg.ref)) bad.push(`${r.id}: ref "${shg.ref}"`)
    if (norm(shg.quote).length < 20) bad.push(`${r.id}: quote too short`)
    if (!shg.names.length || !shg.names.every(n => norm(shg.quote).replace(/["']/g, '').includes(norm(n).replace(/["']/g, '')))) bad.push(`${r.id}: names not in the quote`)
  }
  assert.deepEqual(bad, [])
})

test('every record has at least one source with a URL and a verbatim quote; a maarekhet source names its ref, a paper source its paper', () => {
  need()
  const bad = doc.sages.flatMap(r => {
    const withUrl = r.sources.filter(s => /^https:\/\//.test(s.url) && s.quotes.length > 0)
    const out = withUrl.length ? [] : [`${r.id}: no source with a URL and a quote`]
    for (const s of r.sources) if (s.kind === 'maarekhet' && !s.ref) out.push(`${r.id}: a maarekhet source without ref`)
    for (const s of r.sources) if (s.kind === 'paper' && !s.paper) out.push(`${r.id}: a paper source without the paper id`)
    if (r.shg && !r.sources.some(s => s.kind === 'maarekhet' && s.ref === r.shg!.ref)) out.push(`${r.id}: no maarekhet source for ${r.shg.ref}`)
    return out
  })
  assert.deepEqual(bad, [])
})

test('every sentence of the bio and the core idea, in Hebrew, English and Russian, is a claim with a source quote; together the claims are the whole text', () => {
  need()
  const bad: string[] = []
  for (const r of doc.sages) {
    const s = byId.get(r.id)
    if (!s) continue
    const text = (lang: 'he' | 'en' | 'ru', field: 'bio' | 'core_concept') =>
      lang === 'he' ? s[field] ?? '' : overlayEntry(r.id, lang)?.[field] ?? ''
    for (const lang of ['he', 'en', 'ru'] as const) for (const field of ['bio', 'core_concept'] as const) {
      const cl = r.claims.filter(c => c.lang === lang && c.field === field)
      if (!cl.length) { bad.push(`${r.id} ${lang}.${field}: no claim`); continue }
      let rest = text(lang, field)
      for (const c of cl) {
        if (!rest.includes(c.text)) bad.push(`${r.id} ${lang}.${field}: claim not in the text: ${c.text.slice(0, 40)}`)
        rest = rest.replace(c.text, ' ')
        if (!c.quotes.length) bad.push(`${r.id} ${lang}.${field}: a claim without a quote`)
        for (const q of c.quotes) {
          const src = r.sources.find(x => (x.key ?? x.kind) === q.source)
          if (!src) bad.push(`${r.id} ${lang}.${field}: a claim names the source "${q.source}" that the record does not have`)
          else if (!src.quotes.includes(q.quote)) bad.push(`${r.id} ${lang}.${field}: a claim quote that is in none of the record's source quotes: ${q.quote.slice(0, 40)}`)
        }
      }
      if (/[\p{L}\p{N}]/u.test(rest)) bad.push(`${r.id} ${lang}.${field}: sentences without a claim: ${rest.replace(/\s+/g, ' ').trim().slice(0, 60)}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('every recorded link is in the corpus (a pair of the sage and the other end), both ends are on the roster, unless the exact-date check dropped it', () => {
  need()
  const pairs = new Set(getAllConnections().flatMap(c => [`${c.source}|${c.target}`, `${c.target}|${c.source}`]))
  const dropped = new Set(doc.dropped_links.map(d => `${d.a}|${d.b}|${d.type}`))
  const missing = doc.sages.flatMap(r => r.links
    .filter(l => !dropped.has(`${l.a}|${l.b}|${l.type}`) && !pairs.has(`${l.a}|${l.b}`))
    .map(l => `${r.id}: ${l.a} ${l.type} ${l.b}`))
  assert.deepEqual(missing, [])
  for (const r of doc.sages) for (const l of r.links) {
    assert.ok(byId.has(l.a) && byId.has(l.b), `${r.id}: ${l.a}-${l.b} is not on the roster`)
    assert.ok(l.a === r.id || l.b === r.id, `${r.id}: ${l.a}-${l.b} does not involve him`)
    assert.ok(norm(l.quote).length >= 15 && /^https:\/\//.test(l.source), `${r.id}: a link without quote or source`)
  }
})

test("every new sage's place resolves to a region and to a point on the map", () => {
  const bad = NEW_IDS.flatMap(id => {
    const s = byId.get(id)
    if (!s) return [`${id}: not on the roster`]
    const out: string[] = []
    if (regionsOf(s.location).length === 0) out.push(`${id} ${s.location}: no region`)
    if (!resolveCoords(s)) out.push(`${id} ${s.location}: no coordinates`)
    return out
  })
  assert.deepEqual(bad, [], 'add the place to lib/locationCoords.ts and lib/regions.ts (whole words)')
})

test('English and Russian: the agreed label, a bio and a core idea for each, with no Hebrew left in them', () => {
  const bad: string[] = []
  for (const id of NEW_IDS) for (const [loc, k] of [['en', 1], ['ru', 2]] as const) {
    const e = overlayEntry(id, loc)
    if (e?.label !== NEW[id][k]) bad.push(`${id} ${loc}.label: "${e?.label}", agreed "${NEW[id][k]}"`)
    for (const f of ['label', 'bio', 'core_concept'] as const) {
      const t = e?.[f]?.trim()
      if (!t || HEBREW.test(t)) bad.push(`${id} ${loc}.${f}`)
    }
  }
  assert.deepEqual(bad, [])
})

console.log('\nthe 34 research papers')

type Paper = { title: string; source_file: string; word_count: number; content: string }
const readPaper = (id: string, x: string): Paper[] => JSON.parse(readFileSync(join(RESEARCH, `${id}${x}.json`), 'utf8'))

test('all 34 sages have a Hebrew, an English and a Russian research file', () => {
  const missing = ALL_IDS.flatMap(id => ['', '.en', '.ru'].filter(x => !existsSync(join(RESEARCH, `${id}${x}.json`))).map(x => `${id}${x}`))
  assert.deepEqual(missing, [])
})

test('each file is a list of {title, source_file, word_count, content}; word_count is the word count of the content; en and ru hold as many papers as the Hebrew', () => {
  const bad: string[] = []
  for (const id of ALL_IDS) {
    const he = readPaper(id, '')
    for (const x of ['', '.en', '.ru']) {
      const docs = readPaper(id, x)
      if (!Array.isArray(docs) || docs.length === 0) { bad.push(`${id}${x}: empty`); continue }
      if (docs.length !== he.length) bad.push(`${id}${x}: ${docs.length} papers, the Hebrew has ${he.length}`)
      for (const d of docs) {
        if (JSON.stringify(Object.keys(d).sort()) !== JSON.stringify(['content', 'source_file', 'title', 'word_count'])) bad.push(`${id}${x}: keys ${Object.keys(d)}`)
        if (!d.title?.trim() || !d.source_file?.trim() || !d.content?.trim()) bad.push(`${id}${x}: an empty field`)
        if (d.word_count !== d.content.split(/\s+/).filter(Boolean).length) bad.push(`${id}${x}: word_count ${d.word_count} != ${d.content.split(/\s+/).filter(Boolean).length}`)
      }
    }
  }
  assert.deepEqual(bad, [])
})

test('the Hebrew papers are clean: no markdown debris, no Arabic letters, no text-generator leftovers', () => {
  const bad: string[] = []
  for (const id of ALL_IDS) for (const d of readPaper(id, '')) {
    if (/\*\*|^#|\\\[|\\"/m.test(d.content)) bad.push(`${id}: markdown debris`)
    // 695 quotes one Arabic title (the Guide of the Perplexed) as the paper itself writes it
    const arabic = d.content.replace('"דלאלת אל-חאירין" (دلالة الحائرين)', '')
    if (/[؀-ۿݐ-ݿ]/.test(arabic)) bad.push(`${id}: Arabic letters`)
    if (/Starting Video Overview generation/.test(d.content)) bad.push(`${id}: generator leftover`)
    if (d.content.split('\n').length < 5) bad.push(`${id}: fewer than 5 lines`)
  }
  assert.deepEqual(bad, [])
})

test('the English papers hold no Hebrew sentence and the Russian ones no unfinished markers', () => {
  const bad: string[] = []
  for (const id of ALL_IDS) {
    // the numbered source list at the end keeps the Hebrew titles of the pages the paper cites
    for (const d of readPaper(id, '.en')) if ((d.content.split('\n').filter(l => !/^\d+\.\s/.test(l)).join('\n').match(/[א-ת]/g) ?? []).length > 40) bad.push(`${id}.en: Hebrew left`)
    for (const d of readPaper(id, '.ru')) if (/\(en only\)|TODO|XXX/.test(d.content)) bad.push(`${id}.ru: marker`)
  }
  assert.deepEqual(bad, [])
})

test('all 34 sages are marked as having research (the 17 already on the roster and the 17 new ones)', () => {
  const bad = ALL_IDS.filter(id => !byId.get(id)?.has_research)
  assert.deepEqual(bad, [])
})

test("657: the stray text 'אם רשאי רופא כהן' that sat before reference 25 is out of the Hebrew paper (reference 23's title keeps the phrase)", () => {
  // reference 23 is a page whose title is that phrase: it stays; the stray line before reference 25 is gone
  for (const d of readPaper('657', '')) {
    const lines = d.content.split('\n').filter(l => l.includes('אם רשאי רופא כהן'))
    assert.ok(lines.every(l => /^23\.\s/.test(l)), 'the stray text is still there')
    assert.ok(!d.content.includes('(see list)'), 'the stray (see list) is still there')
    assert.ok(/(^|\n)25\.\s[^\n]*Havot_Yair/.test(d.content), 'reference 25 should be the Havot Yair page')
  }
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
