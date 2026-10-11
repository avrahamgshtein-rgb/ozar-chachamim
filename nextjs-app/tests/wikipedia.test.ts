/**
 * Wikipedia and Wikisource links: public/data-wikipedia.json is keyed by sage id, and
 * ids are exactly what drifts between data sets (see CLAUDE.md). Each entry therefore
 * carries the roster label it was matched against, and these tests fail when an id now
 * belongs to a different sage, so the file is regenerated instead of linking a sage to
 * somebody else's article. Imports the real production modules.
 */
import assert from 'node:assert/strict'
import graph from '../public/data.json'
import { getSefaria } from '../lib/sefaria'
import { wikiEntries, wikiLinks, wikipediaUrl, wikisourceUrl } from '../lib/wikipedia'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok  ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL ${name}`)
    console.log(`       ${(e as Error).message}`)
    failed++
  }
}

const labels = new Map((graph.nodes as Array<{ id: string; label: string }>).map(n => [n.id, n.label]))

console.log('\ndata-wikipedia.json')

test('the file is not empty or truncated', () => {
  assert.ok(wikiEntries().length >= 100, `only ${wikiEntries().length} entries`)
})

test('every id is a sage on the roster, and still carries the label it was matched on', () => {
  const drifted = wikiEntries()
    .filter(([id, e]) => labels.get(id) !== e.label)
    .map(([id, e]) => `${id}: file says "${e.label}", roster says "${labels.get(id)}"`)
  assert.deepEqual(drifted, [], 'regenerate with scripts/build_wikidata_links.py')
})

test('every entry is a Wikidata item with at least one article to link to', () => {
  for (const [id, e] of wikiEntries()) {
    assert.match(e.qid, /^Q\d+$/, `${id}: bad item "${e.qid}"`)
    assert.ok(e.how === 'years' || e.how === 'name', `${id}: how "${e.how}"`)
    assert.ok(e.he || e.en || e.wikisource, `${id} has nothing to link to`)
  }
})

test('no two sages share a Wikidata item', () => {
  const seen = new Map<string, string>()
  for (const [id, e] of wikiEntries()) {
    assert.ok(!seen.has(e.qid), `${e.qid} is used by both ${seen.get(e.qid)} and ${id}`)
    seen.set(e.qid, id)
  }
})

console.log('\nurls')

test('Hebrew titles are percent-encoded, spaces become underscores, a namespace colon stays', () => {
  assert.equal(wikipediaUrl('he', 'רש"י'), 'https://he.wikipedia.org/wiki/%D7%A8%D7%A9%22%D7%99')
  assert.equal(wikipediaUrl('en', 'Jacob Emden'), 'https://en.wikipedia.org/wiki/Jacob_Emden')
  assert.equal(wikisourceUrl('מחבר:רש"י'), 'https://he.wikisource.org/wiki/%D7%9E%D7%97%D7%91%D7%A8:%D7%A8%D7%A9%22%D7%99')
})

test('Sefaria\'s Wikipedia titles fill in where Wikidata found no match', () => {
  const sefaria = getSefaria('594')
  assert.ok(sefaria?.wiki?.he, 'Rashi (594) should carry a Wikipedia title from Sefaria')
  assert.ok(wikiLinks('594', sefaria).he, 'wikiLinks should return it')
  assert.deepEqual(wikiLinks('does-not-exist'), { he: undefined, en: undefined, wikisource: undefined })
})

console.log(`\n${'='.repeat(50)}\nTests: ${passed} passed, ${failed} failed\n${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
