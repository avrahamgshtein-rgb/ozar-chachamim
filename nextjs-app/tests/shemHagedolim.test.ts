/**
 * The 50 sages added from the Chida's "Shem HaGedolim" and the owner's own material (ids 630-679):
 * data/shem-hagedolim-additions.json is the provenance of every new entry (the Maarekhet Sefarim entry
 * that names him or his book, the sources read for his bio, the links with their quotes). Ids are what
 * drift between data sets (see CLAUDE.md), so each record carries the label it was written under and
 * these tests fail when an id now belongs to someone else. Also that every new place is on the map and
 * in a region, that the owner's four episodes and three papers are wired, and that sage 61 holds his own
 * paper and no longer his son's.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getAllConnections, getAllSages } from '../lib/serverData'
import { overlayEntry } from '../lib/serverDataTranslator'
import { regionsOf } from '../lib/regions'
import { resolveCoords } from '../lib/locationCoords'
import { sageVideos } from '../lib/youtube'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ok  ${name}`); passed++ } catch (e) { console.log(`  FAIL ${name}\n       ${(e as Error).message}`); failed++ }
}

type Source = { kind: string; url: string; ref?: string; paper?: string; quotes: string[] }
type Rec = {
  id: string; label: string; package: string
  reserve?: { planned: string; name: string; reason: string }
  shg: { ref: string; quote: string; names: string[] } | null
  sources: Source[]
  links: Array<{ a: string; b: string; type: string; quote: string; source: string }>
}
type Doc = { dropped_links: Array<{ a: string; b: string; type: string; reason: string }>; sages: Rec[] }

const doc = JSON.parse(readFileSync(join(__dirname, '../../data/shem-hagedolim-additions.json'), 'utf8')) as Doc
const sages = getAllSages()
const byId = new Map(sages.map(s => [s.id, s]))
const IDS = Array.from({ length: 50 }, (_, i) => String(630 + i))
const norm = (s: string) => s.replace(/[״“”"]/g, '"').replace(/[׳’']/g, "'").replace(/\s+/g, ' ').trim()
const HEBREW = /[א-ת]/
const LETTERS = 'Alef|Bet|Gimel|Dalet|He|Vav|Zayin|Chet|Tet|Yod|Kaf|Lamed|Mem|Nun|Samekh|Ayin|Peh|Tzadi|Kof|Resh|Shin|Tav'
const EPISODES: Record<string, string> = {
  '630': '7xXl4sOy18MABmQdtXzrQu', '631': '6Umixwtvl1Jh3iq0E1sCHW', '632': '0V7vkwok6itxSw9niOhmW0', '633': '6VBVggnMCgZu86mq2JMniv',
  // 638 (the Sma) and 660 (Reischer) were added here without an episode and gained theirs, and a paper, with the owner's batch of 2026-10-27
  // (data/owner-additions-2026-10.json, tests/ownerAdditions.test.ts)
  '638': '3sBHDuG9aT7dx4zmtYyDjH', '660': '0mmLEt5P6cWWmeGViach5r',
}
// the owner's papers: 630, 631 and 634 with this batch, 638 and 660 with the one of 2026-10-27
const WITH_PAPER = ['630', '631', '634', '638', '660']

console.log('\ndata/shem-hagedolim-additions.json')

test('the file holds exactly the ids 630-679, once each, in order', () => {
  assert.deepEqual(doc.sages.map(r => r.id), IDS)
})

test('every id is still the sage the record was written for (the label it carries)', () => {
  const drifted = doc.sages.filter(r => byId.get(r.id)?.label !== r.label).map(r => `${r.id}: file "${r.label}", roster "${byId.get(r.id)?.label}"`)
  assert.deepEqual(drifted, [], 'regenerate the provenance file, or fix the id')
})

test('each sage has a name, a period, a field, a place, a bio, a core idea and tags', () => {
  const missing = IDS.flatMap(id => {
    const s = byId.get(id)
    if (!s) return [`${id}: not on the roster`]
    return (['label', 'period', 'field', 'location', 'bio', 'core_concept'] as const)
      .filter(f => !String(s[f] ?? '').trim()).map(f => `${id}: no ${f}`)
      .concat((s.tags?.length ?? 0) >= 4 ? [] : [`${id}: fewer than 4 tags`])
  })
  assert.deepEqual(missing, [])
})

test('each sage of the Chida\'s book has the Maarekhet Sefarim entry that names him or his book, with a quote naming him; 634 (modern) has none', () => {
  const bad: string[] = []
  for (const r of doc.sages) {
    if (r.id === '634') { if (r.shg !== null) bad.push('634 must have no shg'); continue }
    const shg = r.shg
    if (!shg) { bad.push(`${r.id}: no Maarekhet Sefarim entry`); continue }
    if (!new RegExp(`^Shem HaGedolim, Maarekhet Sefarim, Letter (${LETTERS}) \\d+(:\\d+)?$`).test(shg.ref)) bad.push(`${r.id}: ref "${shg.ref}"`)
    if (norm(shg.quote).length < 20) bad.push(`${r.id}: quote too short`)
    if (!shg.names.length || !shg.names.every(n => norm(shg.quote).replace(/["']/g, '').includes(norm(n).replace(/["']/g, '')))) bad.push(`${r.id}: names not in the quote`)
  }
  assert.deepEqual(bad, [])
})

test('a planned sage with no entry in Maarekhet Sefarim was replaced by a reserve, and the record says why', () => {
  const reserves = doc.sages.filter(r => r.reserve)
  assert.ok(reserves.length >= 1)
  for (const r of reserves) {
    assert.ok(r.reserve!.planned && r.reserve!.name && r.reserve!.reason.length > 40, `${r.id}: incomplete reserve`)
    assert.ok(HEBREW.test(r.reserve!.planned), `${r.id}: planned name`)
  }
  assert.equal(new Set(reserves.map(r => r.reserve!.name)).size, reserves.length, 'a reserve used twice')
})

test('every record has at least one source with a URL and a verbatim quote, and the maarekhet source names its ref', () => {
  const bad = doc.sages.flatMap(r => {
    const withUrl = r.sources.filter(s => /^https:\/\//.test(s.url) && s.quotes.length > 0)
    const out = withUrl.length ? [] : [`${r.id}: no source with a URL and a quote`]
    for (const s of r.sources) if (s.kind === 'maarekhet' && !s.ref) out.push(`${r.id}: a maarekhet source without ref`)
    for (const s of r.sources) if (s.kind === 'paper' && !s.paper) out.push(`${r.id}: a paper source without the paper id`)
    return out
  })
  assert.deepEqual(bad, [])
})

test('every recorded link is in the corpus (a pair of the sage and the other end), unless the exact-date check dropped it', () => {
  const pairs = new Set(getAllConnections().flatMap(c => [`${c.source}|${c.target}`, `${c.target}|${c.source}`]))
  const dropped = new Set(doc.dropped_links.map(d => `${d.a}|${d.b}|${d.type}`))
  const missing = doc.sages.flatMap(r => r.links
    .filter(l => !dropped.has(`${l.a}|${l.b}|${l.type}`) && !pairs.has(`${l.a}|${l.b}`))
    .map(l => `${r.id}: ${l.a} ${l.type} ${l.b}`))
  assert.deepEqual(missing, [])
  for (const r of doc.sages) for (const l of r.links) assert.ok(byId.has(l.a) && byId.has(l.b), `${r.id}: ${l.a}-${l.b} is not on the roster`)
  assert.ok(doc.sages.filter(r => r.links.length > 0).length >= 40, 'most of the 50 are linked to a sage on the roster')
})

test('every new sage\'s place resolves to a region and to a point on the map', () => {
  const bad = IDS.flatMap(id => {
    const s = byId.get(id)!
    const out: string[] = []
    if (regionsOf(s.location).length === 0) out.push(`${id} ${s.location}: no region`)
    if (!resolveCoords(s)) out.push(`${id} ${s.location}: no coordinates`)
    return out
  })
  assert.deepEqual(bad, [], 'add the place to lib/locationCoords.ts and lib/regions.ts (whole words)')
})

test('English and Russian: a label, a bio and a core idea for each, with no Hebrew left in them', () => {
  const bad: string[] = []
  for (const id of IDS) for (const loc of ['en', 'ru'] as const) {
    const e = overlayEntry(id, loc)
    for (const f of ['label', 'bio', 'core_concept'] as const) {
      const t = e?.[f]?.trim()
      if (!t || HEBREW.test(t)) bad.push(`${id} ${loc}.${f}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('the owner\'s episodes are wired to 630-633 (and, since 2026-10-27, 638 and 660) and to no other sage of this batch', () => {
  for (const id of IDS) {
    const want = EPISODES[id]
    assert.equal(byId.get(id)!.spotify_url ?? '', want ? `https://open.spotify.com/episode/${want}` : '', id)
  }
})

test('the owner\'s papers: 630, 631, 634 (and, since 2026-10-27, 638 and 660) have a Hebrew, English and Russian research file; the other sages of this batch have none', () => {
  const dir = join(__dirname, '../public/research')
  for (const id of IDS) {
    const files = ['', '.en', '.ru'].map(x => existsSync(join(dir, `${id}${x}.json`)))
    const has = WITH_PAPER.includes(id)
    assert.deepEqual(files, has ? [true, true, true] : [false, false, false], id)
    assert.equal(Boolean(byId.get(id)!.has_research), has, `${id} has_research`)
  }
})

test('the owner\'s six new videos: 630, 631 and 632 each have one English and one Russian video, and the Hebrew page shows none', () => {
  const want: Record<string, { en: string; ru: string }> = {
    '630': { en: 'Rdy9VriKVYM', ru: 'S-9dUr1Xpq4' },
    '631': { en: 'RtVP5AZW_J4', ru: 'KTKuiDElfCY' },
    '632': { en: 'PutNe8nmaFM', ru: 'zLJxc3eEdCU' },
  }
  for (const [id, v] of Object.entries(want)) {
    assert.deepEqual(sageVideos(id, 'en').map(x => x.id), [v.en], `${id} en`)
    assert.deepEqual(sageVideos(id, 'ru').map(x => x.id), [v.ru], `${id} ru`)
    assert.deepEqual(sageVideos(id, 'he'), [], `${id} he`)
  }
})

test('sage 61 (R. Yisrael Alnakawa) holds the paper about himself, not the paper about his son (58)', () => {
  const dir = join(__dirname, '../public/research')
  for (const x of ['', '.en', '.ru']) {
    const a = JSON.parse(readFileSync(join(dir, `61${x}.json`), 'utf8'))[0]
    const b = JSON.parse(readFileSync(join(dir, `58${x}.json`), 'utf8'))[0]
    assert.notEqual(a.content, b.content, `61${x}.json is a copy of 58${x}.json`)
    assert.notEqual(a.source_file, b.source_file, `61${x}.json is 58's document`)
  }
  const he = JSON.parse(readFileSync(join(dir, '61.json'), 'utf8'))[0]
  assert.ok(he.title.includes('אלנקוה') && !he.title.includes('אפרים'), he.title)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
