/**
 * Sefaria links: public/data-sefaria.json is keyed by sage id, and ids are exactly
 * what drifts between data sets (see CLAUDE.md). Each entry therefore carries the
 * roster label it was matched against, and these tests fail when an id now belongs
 * to a different sage, so the file is regenerated instead of linking a sage to
 * somebody else's books. Imports the real production modules.
 */
import assert from 'node:assert/strict'
import graph from '../public/data.json'
import {
  getSefaria, sefariaEntries, sefariaEntryCount, sefariaTopicUrl, sefariaWorkUrl,
} from '../lib/sefaria'

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

console.log('\ndata-sefaria.json')

test('the file is not empty or truncated', () => {
  assert.ok(sefariaEntryCount() >= 50, `only ${sefariaEntryCount()} entries`)
})

test('every id is a sage on the roster, and still carries the label it was matched on', () => {
  const drifted = sefariaEntries()
    .filter(([id, e]) => labels.get(id) !== e.label)
    .map(([id, e]) => `${id}: file says "${e.label}", roster says "${labels.get(id)}"`)
  assert.deepEqual(drifted, [], 'regenerate with scripts/build_sefaria_links.py')
})

test('every entry has a Sefaria slug and a known kind', () => {
  for (const [id, e] of sefariaEntries()) {
    assert.match(e.slug, /^[A-Za-z0-9()'\-]+$/, `${id}: bad slug "${e.slug}"`)
    assert.ok(e.kind === 'author' || e.kind === 'person', `${id}: kind "${e.kind}"`)
  }
})

test('an author has works to show; a person may have none', () => {
  for (const [id, e] of sefariaEntries()) {
    if (e.kind === 'author') assert.ok(e.works.length > 0, `${id} (${e.slug}) is an author with no works`)
    assert.ok(e.total >= e.works.length, `${id}: total ${e.total} < shown ${e.works.length}`)
  }
})

test('work links are paths on sefaria.org, with a title in some language', () => {
  for (const [id, e] of sefariaEntries()) {
    for (const w of e.works) {
      assert.ok(w.url.startsWith('/'), `${id}: "${w.url}" is not a path`)
      assert.ok(w.he || w.en, `${id}: ${w.url} has no title`)
    }
  }
})

test('no two sages share a Sefaria author page', () => {
  const seen = new Map<string, string>()
  for (const [id, e] of sefariaEntries()) {
    assert.ok(!seen.has(e.slug), `${e.slug} is used by both ${seen.get(e.slug)} and ${id}`)
    seen.set(e.slug, id)
  }
})

console.log('\nurls')

test('Rashi (594) links to his own page and to commentary paths with spaces encoded', () => {
  const e = getSefaria('594')
  assert.ok(e, 'no entry for 594')
  assert.equal(sefariaTopicUrl(e.slug), 'https://www.sefaria.org/topics/rashi')
  assert.equal(
    sefariaWorkUrl('/texts/Tanakh/Rishonim on Tanakh/Rashi'),
    'https://www.sefaria.org/texts/Tanakh/Rishonim%20on%20Tanakh/Rashi',
  )
})

test('a sage with no match has no entry', () => {
  assert.equal(getSefaria('does-not-exist'), undefined)
})

console.log(`\n${'='.repeat(50)}\nTests: ${passed} passed, ${failed} failed\n${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
