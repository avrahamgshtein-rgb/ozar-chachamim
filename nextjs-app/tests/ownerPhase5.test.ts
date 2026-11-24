/**
 * Phase 5 (2026-11-24): what the owner published 16-24 November 2026: three papers (667's first document, two new sages 699 and 700),
 * two new sages without a paper (701, 702), three episodes of sages already on the roster, 13 new videos.
 * data/owner-phase5-2026-11.json is the record. Sages are named by label (ids drift, names do not).
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = join(__dirname, '..', '..')
const rd = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))
let passed = 0
let failed = 0
function t(name: string, fn: () => void) {
  try { fn(); passed++; console.log('  ok  ' + name) } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e as Error).message) }
}

const rec = rd('data/owner-phase5-2026-11.json')
const nodes: any[] = rd('nextjs-app/public/data.json').nodes
const links: any[] = rd('nextjs-app/public/data.json').links
const node = (id: string) => nodes.find(n => n.id === id)
const NEW = ['699', '700', '701', '702']
const EPISODES = rec.episodes as Record<string, string>
const ARABIC = /[؀-ۿݐ-ݿ]/
const norm = (s: string) => s.replace(/\s+/g, ' ')

t('the four new sages and the three old ones are still the men the record means', () => {
  for (const id of NEW) assert.equal(node(id)?.label, rec.sages[id].label, id)
  for (const [id, label] of Object.entries(rec.episode_labels as Record<string, string>)) assert.equal(node(id)?.label, label, id)
})
t('the two copies of data.json are byte-identical, and the new nodes carry what the record says', () => {
  assert.equal(readFileSync(join(ROOT, 'data.json'), 'utf8'), readFileSync(join(ROOT, 'nextjs-app/public/data.json'), 'utf8'))
  for (const id of NEW) {
    const s = rec.sages[id]
    assert.equal(node(id).bio, s.sentences.bio.map((x: any) => x.he).join(' '), id)
    assert.equal(node(id).central_idea, s.sentences.core_idea.map((x: any) => x.he).join(' '), id)
    assert.equal(node(id).era, s.era, id)
    assert.equal(node(id).era_key, 'geonim' === node(id).era_key ? 'geonim' : node(id).era_key)
  }
  assert.equal(node('701').era_key, 'acharonim')
  for (const id of ['699', '700', '702']) assert.equal(node(id).era_key, 'geonim', id)
})
t('the episodes are the nodes\' spotify_url (the Nachshon duplicate and the Rav Huna episode are linked nowhere)', () => {
  for (const [id, ep] of Object.entries(EPISODES)) assert.equal(node(id).spotify_url, 'https://open.spotify.com/episode/' + ep, id)
  assert.equal(Object.keys(EPISODES).length, 5)
  const all = JSON.stringify(rd('nextjs-app/public/data.json'))
  assert.ok(!all.includes('1E8h317NNYQm7AgcagjWqm'))
  assert.ok(!all.includes('220soVS89CD4qz2zYdQlSh'))
  assert.equal(node('576').spotify_url, '')
  assert.equal(node('699').spotify_url, '')
  assert.equal(node('700').spotify_url, '')
})
t('the sheet holds the episodes in cell L and the four new rows', () => {
  const xml = execFileSync('unzip', ['-p', join(ROOT, 'data/חכמי_ישראל.xlsx'), 'xl/worksheets/sheet1.xml'], { maxBuffer: 1 << 28 }).toString('utf8')
  for (const [id, ep] of Object.entries(EPISODES)) {
    const row = new RegExp(`<row r="(\\d+)"[^>]*>(?:(?!</row>).)*?<c r="A\\1"[^>]*><is><t>${id}</t></is></c>`, 's').exec(xml)
    assert.ok(row, id)
    assert.ok(new RegExp(`<c r="L${row![1]}"[^>]*><is><t>https://open.spotify.com/episode/${ep}</t></is></c>`).test(xml), id)
  }
  for (const id of NEW) assert.ok(new RegExp(`<c r="A\\d+"[^>]*><is><t>${id}</t></is></c>`).test(xml), id)
})
t('the papers of 667, 699 and 700: the Hebrew is the Drive text, no Arabic letter is left, the two approved repairs are in', () => {
  for (const [id, p] of Object.entries(rec.papers as Record<string, any>)) {
    const docs = rd(`nextjs-app/public/research/${id}.json`)
    const d = docs[docs.length - 1]
    assert.equal(d.source_file, p.source_file, id)
    assert.equal(d.word_count, p.word_count, id)
    for (const x of docs) assert.ok(!ARABIC.test(x.content), `${id}: an Arabic letter is left`)
    assert.equal(d.content.split('\n').length, p.lines, id)
    assert.ok(existsSync(join(ROOT, 'data', p.source_file)), p.source_file)
    assert.equal(node(id).has_research, true, id)
  }
  assert.equal(rd('nextjs-app/public/research/667.json').length, 1, '667 has his first document only')
  for (const r of rec.repairs) {
    const lines = rd(`nextjs-app/public/research/${r.paper}.json`).slice(-1)[0].content.split('\n')
    assert.ok(lines[r.line - 1].includes(r.after), `${r.paper} line ${r.line}`)
    assert.ok(!lines[r.line - 1].includes(r.before), `${r.paper} line ${r.line}: the damaged text is gone`)
    assert.equal(r.approval, 'owner 2026-11-24')
  }
  assert.equal(rec.repairs.length, 2)
})
t('every quote the record takes from the owner\'s papers is in the paper', () => {
  for (const id of ['699', '700']) {
    const text = norm(rd(`nextjs-app/public/research/${id}.json`)[0].content)
    for (const part of ['bio', 'core_idea']) for (const s of rec.sages[id].sentences[part]) for (const sup of s.support) {
      if (rec.sages[id].sources[sup.src].kind === 'paper') assert.ok(text.includes(norm(sup.quote)), `${id}: ${sup.quote.slice(0, 40)}`)
    }
    for (const l of rec.sages[id].links) if (l.source.includes('docs.google.com')) assert.ok(text.includes(norm(l.quote)), `${id} link: ${l.quote.slice(0, 40)}`)
  }
})
t('every sentence of the four records has a source and a quote, in three languages', () => {
  for (const id of NEW) for (const part of ['bio', 'core_idea']) for (const s of rec.sages[id].sentences[part]) {
    assert.ok(s.he && s.en && s.ru, id)
    assert.ok(s.support.length >= 1 && s.support.every((x: any) => x.quote && rec.sages[id].sources[x.src]), id)
  }
})
t('the recorded links are in the corpus with their evidence, and 699 and 700 link only as the paper says', () => {
  for (const id of NEW) for (const l of rec.sages[id].links) {
    const found = links.find(k => k.source === l.a && k.target === l.b && k.type === l.type)
    assert.ok(found, `${l.a}-${l.b}`)
    assert.ok(found.evidence_source, `${l.a}-${l.b}`)
  }
  assert.equal(links.filter(k => k.source === '702' || k.target === '702').length, 0)
})
t('the thirteen videos: rows 1-13 mapped, Rav Huna\'s two rows left out with the owner\'s reason, the old 772 are rows 14-785', () => {
  const map = rd('data/youtube-sage-map.json')
  const rows = readFileSync(join(ROOT, 'data/youtube-playlist.tsv'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'))
  assert.equal(rows.length, 785)
  for (const [id, rs] of Object.entries(rec.videos.rows as Record<string, number[]>)) {
    assert.deepEqual(map.sages[id], rs, id)
    const want = id === '614' ? ['en'] : ['en', 'ru']
    assert.deepEqual(rs.map(r => rows[r - 1][3]).sort(), want, id)
  }
  assert.ok(String(map._left_out['3-4']).includes('owner 2026-11-24'))
  assert.ok(!Object.values(map.sages as Record<string, number[]>).flat().some(r => r === 3 || r === 4))
  assert.ok(rows[2][4].includes('Хуна') && rows[3][4].includes('Huna'))
})
t('portraits: 614 kept as an illustration, 667, 646, 701 and 702 left out with a reason', () => {
  const r = rd('data/portraits-review.json')
  const dp = rd('nextjs-app/public/data-portraits.json')
  assert.equal(r.portraits['614'].kind, 'illustration')
  assert.equal(r.portraits['614'].episode, EPISODES['614'])
  assert.deepEqual(r.portraits['614'].crop, rec.portraits.kept_illustration['614'])
  assert.ok(dp['614'])
  for (const id of ['667', '646', '701', '702']) { assert.ok(r._left_out[id].reason === 'text' || r._left_out[id].reason === 'quality', id); assert.ok(!dp[id], id) }
  for (const id of ['699', '700']) assert.equal(r._left_out[id].reason, 'no-episode', id)
})
t('the places: Tomaszow has a point and a region, so 701 stands in Eastern Europe', () => {
  const coords = readFileSync(join(__dirname, '..', 'lib', 'locationCoords.ts'), 'utf8')
  assert.ok(/'טומשוב':\s*\{ lat: 50\.45/.test(coords))
  assert.ok(readFileSync(join(__dirname, '..', 'lib', 'regions.ts'), 'utf8').includes("['טומשוב', 'east-europe']"))
})
console.log(`ownerPhase5: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
