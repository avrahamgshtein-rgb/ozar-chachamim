/**
 * Phase 3 (2026-11-07): the owner's eight new episodes and sixteen new videos of sages already on the roster, and six
 * NotebookLM papers appended as second documents to sages whose site paper is an older one.
 * data/owner-papers-2026-11.json is the record. Sages are named by label (ids drift, names do not).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..')
const rd = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))
let passed = 0
let failed = 0
function t(name: string, fn: () => void) {
  try { fn(); passed++; console.log('  ok  ' + name) } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e as Error).message) }
}

const rec = rd('data/owner-papers-2026-11.json')
const nodes: any[] = rd('nextjs-app/public/data.json').nodes
const label = (id: string) => nodes.find(n => n.id === id)?.label as string
const EPISODES = rec.episodes as Record<string, string>
const LABELS: Record<string, string> = {
  '669': 'אברהם סבע', '639': 'המהרשד', '640': 'יוסף בן לב', '691': 'מאיר בן יעקב שיף', '643': 'פייבוש', '635': 'ספורנו', '686': 'שמשון בן אברהם משאנץ', '696': 'אברהם זכות',
  '472': 'פראנק', '470': 'האדר', '583': 'סגן לויה', '277': 'שוראקי', '161': 'נהר', '68': 'טאיטצאק',
}
t('every sage of the batch is still the man the record means', () => {
  for (const [id, part] of Object.entries(LABELS)) assert.ok(label(id).replace(/[״"׳']/g, '').includes(part.replace(/[״"׳']/g, '')), `${id}: ${label(id)}`)
})
t('the eight episodes are the nodes\' spotify_url, in both copies of data.json', () => {
  const root: any[] = rd('data.json').nodes
  for (const [id, ep] of Object.entries(EPISODES)) {
    for (const ns of [nodes, root]) assert.equal(ns.find(n => n.id === id).spotify_url, 'https://open.spotify.com/episode/' + ep)
  }
  assert.equal(Object.keys(EPISODES).length, 8)
})
t('the sixteen videos are mapped by row, each pair one Russian and one English video of the sage', () => {
  const map = rd('data/youtube-sage-map.json').sages as Record<string, number[]>
  const rows = new Map<number, string[]>(readFileSync(join(ROOT, 'data/youtube-playlist.tsv'), 'utf8').split('\n').filter(Boolean).map(l => { const p = l.split('\t'); return [Number(p[0]), p] as [number, string[]] }))
  for (const [id, rs] of Object.entries(rec.videos.rows as Record<string, number[]>)) {
    assert.deepEqual(map[id], rs)
    assert.deepEqual(rs.map(r => rows.get(r)![3]).sort(), ['en', 'ru'], id)
  }
  assert.equal(rows.size, 762)
})
t('the youtube data holds those videos', () => {
  const yt = rd('nextjs-app/public/data-youtube.json')
  const sages = yt.sages ?? yt
  for (const id of Object.keys(EPISODES)) assert.ok(sages[id] && (sages[id].en?.length || sages[id].videos), id)
})
t('portraits: six kept with a crop, two left out with a reason', () => {
  const r = rd('data/portraits-review.json')
  for (const id of ['669', '640', '691', '643', '635', '696']) { assert.equal(r.portraits[id].kind, 'illustration'); assert.equal(r.portraits[id].episode, EPISODES[id]) }
  assert.equal(r._left_out['639'].reason, 'text')
  assert.equal(r._left_out['686'].reason, 'quality')
  const dp = rd('nextjs-app/public/data-portraits.json')
  for (const id of ['669', '640', '691', '643', '635', '696']) assert.ok(dp[id])
  for (const id of ['639', '686']) assert.ok(!dp[id])
})
t('each of the six papers is a NEW last document, with its Word file attributed, and the translations are line-aligned', () => {
  const attr = rd('data/research_attribution.json').documents as any[]
  for (const p of rec.papers) {
    const he = rd(`nextjs-app/public/research/${p.id}.json`)
    const last = he[he.length - 1]
    assert.equal(last.source_file, p.source_file)
    assert.equal(last.word_count, p.word_count)
    assert.equal(he.length, p.earlier_documents.length + 1)
    assert.ok(attr.some(a => a.file === p.source_file && a.sage_label === label(p.id)), p.id)
    for (const lang of ['en', 'ru']) {
      const tr = rd(`nextjs-app/public/research/${p.id}.${lang}.json`)
      assert.equal(tr.length, he.length, `${p.id}.${lang}`)
      assert.equal(tr[tr.length - 1].content.split('\n').length, last.content.split('\n').length, `${p.id}.${lang} lines`)
      assert.ok(!/[֐-׿]{3}/.test(tr[tr.length - 1].content.split('\n').filter((l: string) => !/https?:/.test(l)).join('\n')), `${p.id}.${lang} Hebrew left`)
    }
  }
})
t('paper 68 carries the two Arabic repairs and no Arabic letters', () => {
  const he = rd('nextjs-app/public/research/68.json')
  const c: string = he[he.length - 1].content
  assert.ok(!/[؀-ۿ]/.test(c))
  for (const r of rec.repairs) assert.ok(c.includes(r.after) && !c.includes(r.before))
})
t('the death dates: 470 and 68 have one, 472 keeps its older entry, 583 / 277 / 161 have none', () => {
  const y = rd('nextjs-app/public/data-yahrzeit.json')
  assert.deepEqual([y['470'].day, y['470'].month], [3, 'Adar I'])
  assert.deepEqual([y['68'].day, y['68'].month], [21, 'Sivan'])
  assert.deepEqual([y['472'].day, y['472'].month], [21, 'Kislev'])
  for (const id of ['583', '277', '161']) assert.ok(!y[id], id)
})
t('the new brother-in-law link of 472 is in the paper links', () => {
  const pl = rd('nextjs-app/public/data-paper-links.json')
  const list: any[] = pl.links ?? pl
  assert.ok(list.some(l => l.type === 'family' && l.relation === 'brother-in-law' && new Set([l.source, l.target]).size === 2 && [l.source, l.target].every(x => x === '472' || x === '140')))
})
console.log(`ownerPhase3: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
