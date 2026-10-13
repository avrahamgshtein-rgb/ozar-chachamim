/**
 * Teacher and family links the research papers state: public/data-paper-links.json, built by
 * scripts/build_paper_links.py from data/links-from-research.json. Each link carries the paper's
 * own words and the roster labels of both ends; these tests fail when a quote is no longer in its
 * paper or an id now belongs to someone else. Also the rule that holds across every link file: no
 * pair where each is named the other's teacher.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import graph from '../public/data.json'
import paper from '../public/data-paper-links.json'
import catalog from '../public/data-catalog-links.json'
import research from '../public/data-research-links.json'
import ancient from '../public/data-ancient.json'
import supplement from '../public/data-supplement.json'
import supplement2 from '../public/data-supplement-2.json'
import { getAllConnections } from '../lib/serverData'

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

type Node = { id: string; label: string; birth_year?: number; death_year?: number; date_precision?: string }
type Link = { source: string; target: string; type: string }
type Entry = Link & { relation?: string; quotes: Array<{ paper: string; quote: string }>; source_label: string; target_label: string; evidence_source: string }
const nodes = new Map((graph.nodes as Node[]).map(n => [n.id, n]))
const links = (paper as { links: Entry[] }).links
const exact = (n: Node) => n.date_precision === 'exact' && n.birth_year != null && n.death_year != null && n.death_year - n.birth_year >= 20
const norm = (s: string) => s.replace(/״/g, '"').replace(/׳/g, "'").split(/\s+/).filter(Boolean).join(' ')
const paperText = new Map<string, string>()
const textOf = (id: string) => {
  if (!paperText.has(id)) {
    const docs = JSON.parse(readFileSync(new URL(`../public/research/${id}.json`, import.meta.url), 'utf8')) as Array<{ content?: string }>
    paperText.set(id, norm(docs.map(d => d.content ?? '').join(' ')))
  }
  return paperText.get(id)!
}

console.log('\ndata-paper-links.json')

test('the file is not empty or truncated', () => {
  assert.ok(links.length >= 100, `only ${links.length} links`)
  assert.deepEqual((paper as { nodes: unknown[] }).nodes, [])
})

test('both ends are sages on the roster, still under the labels the papers were read under', () => {
  const drifted = links.flatMap(l => [[l.source, l.source_label], [l.target, l.target_label]])
    .filter(([id, label]) => nodes.get(id)?.label !== label)
    .map(([id, label]) => `${id}: file says "${label}", roster says "${nodes.get(id)?.label}"`)
  assert.deepEqual([...new Set(drifted)], [], 'regenerate with scripts/build_paper_links.py')
})

test("each link is about its paper's own sage, and every quote is still in that paper", () => {
  const bad: string[] = []
  for (const l of links) {
    if (!['teacher', 'family'].includes(l.type) || l.source === l.target) bad.push(`${l.source}->${l.target} ${l.type}`)
    if (!l.quotes.length || !l.evidence_source) bad.push(`${l.source}->${l.target} has no quote`)
    for (const { paper: pid, quote } of l.quotes) {
      if (pid !== l.source && pid !== l.target) bad.push(`paper ${pid} is not an end of ${l.source}->${l.target}`)
      if (!textOf(pid).includes(norm(quote))) bad.push(`quote not in paper ${pid}: ${quote.slice(0, 60)}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('no teacher is younger than his student, and no elder relative younger, where both dates are exact', () => {
  const bad = links.filter(l => l.type === 'teacher' || /father|mother|grand|uncle|aunt|ancestor/.test(l.relation ?? ''))
    .filter(l => { const a = nodes.get(l.source)!, b = nodes.get(l.target)!; return exact(a) && exact(b) && a.birth_year! > b.birth_year! })
    .map(l => `${l.source_label} -> ${l.target_label}`)
  assert.deepEqual(bad, [])
})

console.log('\nall link files together')

const every: Link[] = [graph, ancient, supplement, supplement2, research, catalog, paper]
  .flatMap(f => (f as { links?: Link[] }).links ?? [])
const lesson = (l: Link) => (l.type === 'teacher' ? `${l.source}>${l.target}` : `${l.target}>${l.source}`)

test('nobody is both the teacher and the student of the same sage', () => {
  const taught = new Set(every.filter(l => l.type === 'teacher' || l.type === 'student').map(lesson))
  const both = [...taught].filter(k => { const [a, b] = k.split('>'); return a < b && taught.has(`${b}>${a}`) })
  assert.deepEqual(both, [])
})

test('the server path merges the file', () => {
  const have = new Set(getAllConnections().map(c => `${c.source}>${c.target}:${c.type}`))
  const missing = links.filter(l => !have.has(`${l.source}>${l.target}:${l.type}`)).map(l => `${l.source_label} -> ${l.target_label}`)
  assert.deepEqual(missing, [])
})

test('the browser path fetches the file', () => {
  assert.match(readFileSync(new URL('../lib/appShellDataLoader.ts', import.meta.url), 'utf8'), /'\/data-paper-links\.json'/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
