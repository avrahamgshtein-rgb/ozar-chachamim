/**
 * Phase 4 (2026-11-16): the owner's five new episodes and ten new videos of sages already on the roster.
 * data/owner-papers-2026-11b.json is the record. Sages are named by label (ids drift, names do not).
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

const rec = rd('data/owner-papers-2026-11b.json')
const nodes: any[] = rd('nextjs-app/public/data.json').nodes
const EPISODES = rec.episodes as Record<string, string>
const ids = Object.keys(EPISODES)
// phase 5 (2026-11-24) put thirteen more uploads at the top, so the rows of this batch moved by 13
const SHIFT_P5 = 13

t('every sage of the batch is still the man the record means', () => {
  for (const id of ids) assert.equal(nodes.find(n => n.id === id)?.label, rec.labels[id], id)
})
t('the five episodes are the nodes\' spotify_url, in both copies of data.json', () => {
  const root: any[] = rd('data.json').nodes
  for (const [id, ep] of Object.entries(EPISODES)) {
    for (const ns of [nodes, root]) assert.equal(ns.find(n => n.id === id).spotify_url, 'https://open.spotify.com/episode/' + ep)
  }
  assert.equal(ids.length, 5)
  assert.equal(readFileSync(join(ROOT, 'data.json'), 'utf8'), readFileSync(join(ROOT, 'nextjs-app/public/data.json'), 'utf8'))
})
t('the sheet holds the five episodes in cell L of the sage\'s row', () => {
  const xml = require('node:child_process').execFileSync('unzip', ['-p', join(ROOT, 'data/חכמי_ישראל.xlsx'), 'xl/worksheets/sheet1.xml'], { maxBuffer: 1 << 28 }).toString('utf8')
  for (const [id, ep] of Object.entries(EPISODES)) {
    const row = new RegExp(`<row r="(\\d+)"[^>]*>(?:(?!</row>).)*?<c r="A\\1"[^>]*><is><t>${id}</t></is></c>`, 's').exec(xml)
    assert.ok(row, id)
    assert.ok(xml.includes(`<c r="L${row![1]}"`) && new RegExp(`<c r="L${row![1]}"[^>]*><is><t>https://open.spotify.com/episode/${ep}</t></is></c>`).test(xml), id)
  }
})
t('the ten videos are mapped by row, each pair one Russian and one English video of the sage', () => {
  const map = rd('data/youtube-sage-map.json').sages as Record<string, number[]>
  const rows = new Map<number, string[]>(readFileSync(join(ROOT, 'data/youtube-playlist.tsv'), 'utf8').split('\n').filter(Boolean).map(l => { const p = l.split('\t'); return [Number(p[0]), p] as [number, string[]] }))
  for (const [id, rs] of Object.entries(rec.videos.rows as Record<string, number[]>)) {
    assert.deepEqual(map[id], rs.map(r => r + SHIFT_P5))
    assert.deepEqual(rs.map(r => rows.get(r + SHIFT_P5)![3]).sort(), ['en', 'ru'], id)
  }
  assert.ok(rows.size >= 772 + SHIFT_P5)
})
t('the youtube data holds those videos, one per language, in the playlist\'s ids', () => {
  const yt = rd('nextjs-app/public/data-youtube.json')
  const sages = yt.sages ?? yt
  const lines = readFileSync(join(ROOT, 'data/youtube-playlist.tsv'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'))
  const text = JSON.stringify(sages)
  for (const [id, rs] of Object.entries(rec.videos.rows as Record<string, number[]>)) {
    assert.ok(sages[id], id)
    for (const r of rs) assert.ok(text.includes(lines[r + SHIFT_P5 - 1][1]), `${id} row ${r}`)
  }
})
t('portraits: four kept with a crop and the episode, 641 left out with a reason', () => {
  const r = rd('data/portraits-review.json')
  const dp = rd('nextjs-app/public/data-portraits.json')
  for (const [id, crop] of Object.entries(rec.portraits.kept_illustration as Record<string, number[]>)) {
    assert.equal(r.portraits[id].kind, 'illustration')
    assert.equal(r.portraits[id].episode, EPISODES[id])
    assert.deepEqual(r.portraits[id].crop, crop)
    assert.ok(dp[id], id)
    assert.ok(!r._left_out[id], id)
  }
  assert.equal(r._left_out['641'].reason, 'quality')
  assert.equal(r._left_out['641'].episode, EPISODES['641'])
  assert.ok(!dp['641'])
})
console.log(`ownerPhase4: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
