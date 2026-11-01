/**
 * The path between two sages (lib/connect.ts, lib/connectServer.ts): one edge per pair keeping the strongest
 * kind, the cheapest chain (a teacher link is the surest road, an influence link a leap; ties go to fewer
 * links), a path read backwards from the other end, captions that say the right thing in the right direction
 * in three languages, and the compact net the browser holds. Synthetic graphs for the rules, the real corpus
 * for the data (sages are found by label, never by id). No network.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getAllConnections, getAllSages } from '../lib/serverData'
import { connectGraph, connectNet, connectPathFor } from '../lib/connectServer'
import {
  CONNECT_KINDS, KIND_WEIGHT, buildConnectGraph, degreeOf, describePath, graphFromNet, hopDistancesFrom, linkBetween,
  netFromGraph, shortestPath, shortestPathsFrom, stepCaption,
  type ConnectGraph, type ConnectKind, type ConnectPath, type ConnectVia, type StepDir,
} from '../lib/connect'
import { ALL_PERIODS } from '../lib/types'
import type { Connection, ConnectionType, Locale } from '../lib/types'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const app = path.join(__dirname, '..')
const read = (rel: string) => fs.readFileSync(path.join(app, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const conn = (source: string, target: string, type: ConnectionType): Connection => ({ source, target, type })
const idsOf = (p: ConnectPath) => p.steps.map(s => s.id)
/** A repeatable stream of numbers in [0, 1). */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

console.log('\nthe rules, on small graphs')

test('a teacher route beats an influence route, however many steps it has, while it costs less', () => {
  // A influenced B directly (4); A to B through three teacher links costs 3
  const three = buildConnectGraph(['A', 'B', 'C', 'D'], [
    conn('A', 'B', 'influence'), conn('A', 'C', 'teacher'), conn('C', 'D', 'teacher'), conn('D', 'B', 'teacher'),
  ])
  const p = shortestPath(three, 'A', 'B')!
  assert.deepEqual(idsOf(p), ['A', 'C', 'D', 'B'])
  assert.equal(p.weight, 3)
  assert.equal(p.links, 3)
  assert.ok(p.steps.slice(1).every(s => s.via!.kind === 'teacher'))
  // four teacher links cost as much as the leap (4): the leap has fewer links and wins the tie
  const four = buildConnectGraph(['A', 'B', 'C', 'D', 'E'], [
    conn('A', 'B', 'influence'), conn('A', 'C', 'teacher'), conn('C', 'D', 'teacher'), conn('D', 'E', 'teacher'), conn('E', 'B', 'teacher'),
  ])
  assert.deepEqual(idsOf(shortestPath(four, 'A', 'B')!), ['A', 'B'])
  // five teacher links cost more than the leap
  const five = buildConnectGraph(['A', 'B', 'C', 'D', 'E', 'F'], [
    conn('A', 'B', 'influence'), conn('A', 'C', 'teacher'), conn('C', 'D', 'teacher'), conn('D', 'E', 'teacher'), conn('E', 'F', 'teacher'), conn('F', 'B', 'teacher'),
  ])
  assert.deepEqual(idsOf(shortestPath(five, 'A', 'B')!), ['A', 'B'])
})

test('weights: teacher 1, family 2, predecessor 2, colleague 2.5, disputant 3, influence 4; equal cost goes to fewer links', () => {
  assert.deepEqual({ ...KIND_WEIGHT }, { teacher: 1, family: 2, predecessor: 2, colleague: 2.5, oppose: 3, influence: 4 })
  assert.deepEqual([...CONNECT_KINDS], ['teacher', 'family', 'predecessor', 'colleague', 'oppose', 'influence'])
  // a relative (2) or two teacher links (1 + 1): the same cost, the relative has fewer links
  const tie = buildConnectGraph(['A', 'B', 'C'], [conn('A', 'B', 'family'), conn('A', 'C', 'teacher'), conn('C', 'B', 'teacher')])
  assert.deepEqual(idsOf(shortestPath(tie, 'A', 'B')!), ['A', 'B'])
  assert.deepEqual(idsOf(shortestPath(tie, 'B', 'A')!), ['B', 'A'])
  // a colleague (2.5) loses to two teacher links (2)
  const colleague = buildConnectGraph(['A', 'B', 'C'], [conn('A', 'B', 'colleague'), conn('A', 'C', 'teacher'), conn('C', 'B', 'teacher')])
  assert.deepEqual(idsOf(shortestPath(colleague, 'A', 'B')!), ['A', 'C', 'B'])
  // a disputant (3) ties three teacher links and has fewer links, loses to two
  const oppose = buildConnectGraph(['A', 'B', 'C', 'D'], [conn('A', 'B', 'oppose'), conn('A', 'C', 'teacher'), conn('C', 'D', 'teacher'), conn('D', 'B', 'teacher')])
  assert.deepEqual(idsOf(shortestPath(oppose, 'A', 'B')!), ['A', 'B'])
  const oppose2 = buildConnectGraph(['A', 'B', 'C', 'D'], [conn('A', 'B', 'oppose'), conn('A', 'C', 'teacher'), conn('C', 'B', 'teacher')])
  assert.deepEqual(idsOf(shortestPath(oppose2, 'A', 'B')!), ['A', 'C', 'B'])
})

test('one edge per pair keeping the strongest kind; student is a teacher link the other way round; contemporary, self and outside links are dropped', () => {
  const g = buildConnectGraph(['1', '2', '3', '4', '5'], [
    conn('1', '2', 'influence'), conn('1', '2', 'family'), conn('2', '1', 'teacher'),   // a pair with three kinds: the teacher link
    conn('3', '4', 'student'),                                                          // 3 is the student of 4
    conn('3', '5', 'contemporary'),                                                     // not a relation
    conn('5', '5', 'teacher'),                                                          // himself
    conn('5', '99', 'teacher'),                                                         // not on the roster
  ])
  assert.deepEqual(linkBetween(g, '1', '2'), { kind: 'teacher', dir: 'down' })          // 2 taught 1: going 1 to 2, the previous sage is the student
  assert.deepEqual(linkBetween(g, '2', '1'), { kind: 'teacher', dir: 'up' })
  assert.deepEqual(linkBetween(g, '4', '3'), { kind: 'teacher', dir: 'up' })            // 4 taught 3
  assert.deepEqual(linkBetween(g, '3', '4'), { kind: 'teacher', dir: 'down' })
  assert.equal(linkBetween(g, '3', '5'), null)
  assert.equal(linkBetween(g, '5', '99'), null)
  assert.equal(linkBetween(g, '5', '5'), null)
  assert.equal(degreeOf(g, '5'), 0)
  assert.equal(degreeOf(g, '1'), 1)
  assert.equal(degreeOf(g, 'nobody'), 0)
  assert.equal(shortestPath(g, '3', '5'), null)
  // a stronger kind stored first, a weaker one after: the strong one stays
  const g2 = buildConnectGraph(['1', '2'], [conn('1', '2', 'teacher'), conn('2', '1', 'influence'), conn('1', '2', 'student')])
  assert.deepEqual(linkBetween(g2, '1', '2'), { kind: 'teacher', dir: 'up' })
})

test('the direction of each kind: the source is the teacher / the elder / the influencer / the predecessor', () => {
  const g = buildConnectGraph(['1', '2', '3', '4', '5', '6'], [
    conn('1', '2', 'teacher'), conn('1', '3', 'family'), conn('1', '4', 'influence'), conn('1', '5', 'predecessor'),
    conn('1', '6', 'colleague'), conn('2', '3', 'oppose'),
  ])
  const going = (x: string, y: string): ConnectVia => linkBetween(g, x, y)!
  assert.deepEqual(going('1', '2'), { kind: 'teacher', dir: 'up' })
  assert.deepEqual(going('2', '1'), { kind: 'teacher', dir: 'down' })
  assert.deepEqual(going('1', '3'), { kind: 'family', dir: 'up' })
  assert.deepEqual(going('3', '1'), { kind: 'family', dir: 'down' })
  assert.deepEqual(going('1', '4'), { kind: 'influence', dir: 'up' })
  assert.deepEqual(going('4', '1'), { kind: 'influence', dir: 'down' })
  assert.deepEqual(going('1', '5'), { kind: 'predecessor', dir: 'up' })
  assert.deepEqual(going('5', '1'), { kind: 'predecessor', dir: 'down' })
  assert.deepEqual(going('1', '6'), { kind: 'colleague', dir: 'none' })
  assert.deepEqual(going('6', '1'), { kind: 'colleague', dir: 'none' })
  assert.deepEqual(going('2', '3'), { kind: 'oppose', dir: 'none' })
})

test('different components, unknown sages and one sage twice', () => {
  const g = buildConnectGraph(['1', '2', '3', '4', '5'], [conn('1', '2', 'teacher'), conn('3', '4', 'family')])
  assert.equal(shortestPath(g, '1', '3'), null)
  assert.equal(shortestPath(g, '3', '1'), null)
  assert.equal(shortestPath(g, '1', '5'), null)
  assert.equal(shortestPath(g, '1', 'nobody'), null)
  assert.equal(shortestPath(g, 'nobody', '1'), null)
  assert.deepEqual(shortestPath(g, '1', '1'), { steps: [{ id: '1' }], weight: 0, links: 0 })
  assert.deepEqual(idsOf(shortestPath(g, '1', '2')!), ['1', '2'])
  assert.deepEqual(shortestPath(g, '1', '2')!.steps[0], { id: '1' })
})

test('the first step has no link; each other step says how he is linked to the one before', () => {
  const g = buildConnectGraph(['1', '2', '3'], [conn('1', '2', 'teacher'), conn('3', '2', 'student')])
  // 3 is the student of 2: 1 taught 2, and 2 taught 3
  const p = shortestPath(g, '1', '3')!
  assert.deepEqual(p.steps, [
    { id: '1' },
    { id: '2', via: { kind: 'teacher', dir: 'up' } },
    { id: '3', via: { kind: 'teacher', dir: 'up' } },
  ])
  assert.equal(p.weight, 2)
  const back = shortestPath(g, '3', '1')!
  assert.deepEqual(back.steps, [
    { id: '3' },
    { id: '2', via: { kind: 'teacher', dir: 'down' } },
    { id: '1', via: { kind: 'teacher', dir: 'down' } },
  ])
})

test('the path from b to a is the path from a to b read backwards, ties included (a grid where many routes cost the same)', () => {
  const ids: string[] = []
  const links: Connection[] = []
  const side = 5
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    ids.push(String(y * side + x + 1))
    if (x + 1 < side) links.push(conn(String(y * side + x + 1), String(y * side + x + 2), 'teacher'))
    if (y + 1 < side) links.push(conn(String(y * side + x + 1), String((y + 1) * side + x + 1), x % 2 ? 'teacher' : 'student'))
  }
  const g = buildConnectGraph(ids, links)
  for (const a of ids) for (const b of ids) {
    if (a === b) continue
    const ab = shortestPath(g, a, b)!
    const ba = shortestPath(g, b, a)!
    assert.deepEqual(idsOf(ba), idsOf(ab).reverse(), `${a} to ${b}`)
    assert.equal(ba.weight, ab.weight)
    assert.equal(ba.links, ab.links)
    // every link, seen from the other side
    for (let k = 1; k < ab.steps.length; k++) {
      assert.deepEqual(linkBetween(g, ab.steps[k - 1].id, ab.steps[k].id), ab.steps[k].via)
      assert.deepEqual(linkBetween(g, ab.steps[k].id, ab.steps[k - 1].id), ba.steps[ab.steps.length - k].via)
    }
  }
})

test('the search is exact: weight and links match Floyd-Warshall on random graphs of every kind', () => {
  const rand = rng(7)
  for (let round = 0; round < 12; round++) {
    const n = 9 + Math.floor(rand() * 6)
    const ids = Array.from({ length: n }, (_, i) => String(i + 1))
    const types: ConnectionType[] = ['teacher', 'student', 'family', 'predecessor', 'colleague', 'oppose', 'influence', 'contemporary']
    const links: Connection[] = []
    for (let e = 0; e < n * 1.3; e++) {
      const a = ids[Math.floor(rand() * n)], b = ids[Math.floor(rand() * n)]
      links.push(conn(a, b, types[Math.floor(rand() * types.length)]))
    }
    const g = buildConnectGraph(ids, links)
    // the oracle: cost = [weight, links] compared lexicographically, over the edges the graph itself holds
    const INF = Infinity
    const w = ids.map(() => ids.map(() => INF)), l = ids.map(() => ids.map(() => INF))
    ids.forEach((a, i) => {
      w[i][i] = 0; l[i][i] = 0
      ids.forEach((b, j) => {
        const v = i === j ? null : linkBetween(g, a, b)
        if (v) { w[i][j] = KIND_WEIGHT[v.kind]; l[i][j] = 1 }
      })
    })
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const nw = w[i][k] + w[k][j], nl = l[i][k] + l[k][j]
      if (nw < w[i][j] || (nw === w[i][j] && nl < l[i][j])) { w[i][j] = nw; l[i][j] = nl }
    }
    ids.forEach((a, i) => ids.forEach((b, j) => {
      const p = shortestPath(g, a, b)
      if (w[i][j] === INF) return assert.equal(p, null, `${a} to ${b}`)
      assert.ok(p, `${a} to ${b}`)
      assert.equal(p.weight, w[i][j], `${a} to ${b}: weight`)
      assert.equal(p.links, l[i][j], `${a} to ${b}: links`)
      assert.equal(new Set(idsOf(p)).size, p.steps.length, `${a} to ${b}: a sage twice`)
      let sum = 0
      for (let k = 1; k < p.steps.length; k++) sum += KIND_WEIGHT[p.steps[k].via!.kind]
      assert.equal(sum, p.weight)
    }))
  }
})

test('shortestPathsFrom gives shortestPath for everyone he reaches; hopDistancesFrom counts the fewest links', () => {
  const g = buildConnectGraph(['1', '2', '3', '4', '5', '6'], [
    conn('1', '2', 'teacher'), conn('2', '3', 'teacher'), conn('3', '4', 'influence'), conn('1', '4', 'influence'), conn('5', '6', 'family'),
  ])
  const all = shortestPathsFrom(g, '3')
  assert.deepEqual([...all.keys()].sort(), ['1', '2', '4'])
  for (const [id, p] of all) assert.deepEqual(p, shortestPath(g, '3', id))
  assert.deepEqual(shortestPathsFrom(g, 'nobody'), new Map())
  const hops = hopDistancesFrom(g, '3')
  assert.deepEqual([...hops].sort(), [['1', 2], ['2', 1], ['3', 0], ['4', 1]])
  assert.equal(hops.has('5'), false)
  assert.deepEqual(hopDistancesFrom(g, 'nobody'), new Map())
  // the cheapest path may use more links than the fewest: one influence link (4) or three teacher links (3)
  const detour = buildConnectGraph(['A', 'B', 'C', 'D'], [conn('A', 'B', 'influence'), conn('A', 'C', 'teacher'), conn('C', 'D', 'teacher'), conn('D', 'B', 'teacher')])
  assert.equal(hopDistancesFrom(detour, 'A').get('B'), 1)
  assert.equal(shortestPath(detour, 'A', 'B')!.links, 3)
})

test('the net round trip: the same sages and paths from the browser\'s graph as from the server\'s', () => {
  const links = [
    conn('10', '2', 'teacher'), conn('2', '30', 'family'), conn('30', '4', 'colleague'), conn('10', '4', 'influence'), conn('50', '30', 'student'),
  ]
  const g = buildConnectGraph(['2', '4', '10', '30', '50', '60'], links)   // 60 has no link
  const info = (id: string) => ({ name: `n${id}`, period: ALL_PERIODS[Number(id) % ALL_PERIODS.length], woman: id === '4' })
  const net = netFromGraph(g, info)
  assert.deepEqual(net.sages.map(s => s[0]), ['2', '4', '10', '30', '50'])
  assert.deepEqual(net.sages.map(s => s.length), [3, 4, 3, 3, 3])
  assert.equal(net.sages[1][3], 1)
  assert.equal(net.edges.length, 5)
  const back = graphFromNet(JSON.parse(JSON.stringify(net)))
  for (const a of ['2', '4', '10', '30', '50']) for (const b of ['2', '4', '10', '30', '50']) {
    assert.deepEqual(shortestPath(back, a, b), shortestPath(g, a, b), `${a} to ${b}`)
    assert.deepEqual(linkBetween(back, a, b), linkBetween(g, a, b))
  }
  assert.equal(degreeOf(back, '30'), degreeOf(g, '30'))
  assert.equal(shortestPath(back, '2', '60'), null)
  // the data's direction survives: the first end of a teacher edge is the teacher
  const e = net.edges.find(([a, b]) => net.sages[a][0] === '10' && net.sages[b][0] === '2')
  assert.ok(e, 'the teacher edge 10 to 2 keeps its direction')
  assert.equal(CONNECT_KINDS[e[2]], 'teacher')
  // a net with an edge to nowhere or an unknown kind is tolerated
  const odd = graphFromNet({ sages: [['1', 'a', 0], ['2', 'b', 0]], edges: [[0, 5, 0], [0, 1, 99], [1, 1, 0], [0, 1, 0]] })
  assert.deepEqual(idsOf(shortestPath(odd, '1', '2')!), ['1', '2'])
})

test('describePath: names and eras from the net, a caption on every step but the first, dotted where the way in is an influence', () => {
  const g = buildConnectGraph(['1', '2', '3'], [conn('1', '2', 'teacher'), conn('2', '3', 'influence')])
  const net = netFromGraph(g, id => ({ name: `Sage ${id}`, period: ALL_PERIODS[Number(id)], woman: id === '2' }))
  const view = describePath(net, shortestPath(g, '1', '3')!, 'en')
  assert.deepEqual(view, [
    { id: '1', name: 'Sage 1', period: ALL_PERIODS[1], caption: null, dotted: false },
    { id: '2', name: 'Sage 2', period: ALL_PERIODS[2], caption: 'Student of Sage 1', dotted: false },
    { id: '3', name: 'Sage 3', period: ALL_PERIODS[3], caption: 'Influenced by Sage 2', dotted: true },
  ])
  assert.equal(describePath(net, shortestPath(g, '1', '2')!, 'he')[1].caption, 'תלמידתו של Sage 1')
  assert.throws(() => describePath(net, { steps: [{ id: '404' }], weight: 0, links: 0 }, 'en'), /404/)
})

console.log('\nthe captions')

test('every caption, exactly: both genders, every kind and direction, three languages', () => {
  const say = (kind: ConnectKind, dir: StepDir, l: Locale, f = false) => stepCaption({ kind, dir }, 'X', l, f)
  const table: Array<[ConnectKind, StepDir, Record<Locale, [string, string]>]> = [
    ['teacher', 'up', { he: ['תלמידו של X', 'תלמידתו של X'], en: ['Student of X', 'Student of X'], ru: ['Учился у: X', 'Училась у: X'] }],
    ['teacher', 'down', { he: ['רבו של X', 'מורתו של X'], en: ['Teacher of X', 'Teacher of X'], ru: ['Учил: X', 'Учила: X'] }],
    ['family', 'up', { he: ['בן משפחתו של X', 'בת משפחתו של X'], en: ['Relative of X', 'Relative of X'], ru: ['Родственник: X', 'Родственница: X'] }],
    ['family', 'down', { he: ['בן משפחתו של X', 'בת משפחתו של X'], en: ['Relative of X', 'Relative of X'], ru: ['Родственник: X', 'Родственница: X'] }],
    ['predecessor', 'up', { he: ['ממשיכו של X', 'ממשיכתו של X'], en: ['Successor of X', 'Successor of X'], ru: ['Преемник: X', 'Преемница: X'] }],
    ['predecessor', 'down', { he: ['קודמו של X', 'קודמתו של X'], en: ['Predecessor of X', 'Predecessor of X'], ru: ['Предшественник: X', 'Предшественница: X'] }],
    ['colleague', 'none', { he: ['חברו של X', 'חברתו של X'], en: ['Colleague of X', 'Colleague of X'], ru: ['Коллега: X', 'Коллега: X'] }],
    ['oppose', 'none', { he: ['בר־פלוגתא של X', 'בת־פלוגתא של X'], en: ['Disputant of X', 'Disputant of X'], ru: ['Оппонент: X', 'Оппонент: X'] }],
    ['influence', 'up', { he: ['הושפע מ־X', 'הושפעה מ־X'], en: ['Influenced by X', 'Influenced by X'], ru: ['Под влиянием: X', 'Под влиянием: X'] }],
    ['influence', 'down', { he: ['השפיע על X', 'השפיעה על X'], en: ['Influenced X', 'Influenced X'], ru: ['Повлиял на: X', 'Повлияла на: X'] }],
  ]
  for (const [kind, dir, words] of table) for (const l of LOCALES) {
    assert.equal(say(kind, dir, l), words[l][0], `${kind}/${dir}/${l}`)
    assert.equal(say(kind, dir, l, true), words[l][1], `${kind}/${dir}/${l}/feminine`)
  }
  // the default is masculine
  assert.equal(stepCaption({ kind: 'teacher', dir: 'up' }, 'רש"י', 'he'), 'תלמידו של רש"י')
})

console.log('\nthe real corpus')

const sages = getAllSages()
const rawLinks = getAllConnections()
const g = connectGraph()
const byLabel = (label: string) => {
  const s = sages.find(x => x.label === label)
  assert.ok(s, `no sage labelled ${label}`)
  return s.id
}
const RASHI = byLabel('רש"י (רבי שלמה יצחקי)')
const RABBEINU_TAM = byLabel('רבנו תם (ר׳ יעקב בן מאיר) – מהפכן השיטה התוספתית')
const RAMBAM = byLabel('הרמב"ם')

/** What the stored links say about a pair: each as [kind, direction going prev to cur]. */
function stored(prev: string, cur: string): Array<[ConnectKind, StepDir]> {
  const out: Array<[ConnectKind, StepDir]> = []
  for (const c of rawLinks) {
    const ends = [c.source, c.target]
    if (!ends.includes(prev) || !ends.includes(cur) || prev === cur) continue
    if (c.type === 'contemporary') continue
    const kind = (c.type === 'student' ? 'teacher' : c.type) as ConnectKind
    const upper = c.type === 'student' ? c.target : c.source   // the teacher / elder / influencer / predecessor
    out.push([kind, !(['teacher', 'family', 'predecessor', 'influence'] as const).includes(kind as never) ? 'none' : upper === prev ? 'up' : 'down'])
  }
  return out
}

/** Every step of a path is a link the data stores, of the strongest kind stored for the pair and in its direction. */
function assertReal(p: ConnectPath, what: string) {
  assert.equal(new Set(idsOf(p)).size, p.steps.length, `${what}: a sage twice`)
  assert.equal(p.links, p.steps.length - 1)
  let weight = 0
  for (let k = 1; k < p.steps.length; k++) {
    const via = p.steps[k].via!
    const all = stored(p.steps[k - 1].id, p.steps[k].id)
    assert.ok(all.length > 0, `${what}: no stored link between ${p.steps[k - 1].id} and ${p.steps[k].id}`)
    const strongest = Math.min(...all.map(([kind]) => CONNECT_KINDS.indexOf(kind)))
    assert.equal(CONNECT_KINDS.indexOf(via.kind), strongest, `${what}: step ${k} is not the strongest kind stored`)
    assert.ok(all.some(([kind, dir]) => kind === via.kind && dir === via.dir), `${what}: step ${k} says ${via.kind}/${via.dir}; the data holds ${JSON.stringify(all)}`)
    weight += KIND_WEIGHT[via.kind]
  }
  assert.equal(weight, p.weight, `${what}: weight`)
}

/** `n` distinct pairs of linked sages (repeatable) that have a path. */
function samplePairs(n: number): Array<[string, string]> {
  const linked = connectNet('he').sages.map(s => s[0])
  const rand = rng(2026)
  const out: Array<[string, string]> = []
  for (let guard = 0; out.length < n && guard < 5000; guard++) {
    const a = linked[Math.floor(rand() * linked.length)], b = linked[Math.floor(rand() * linked.length)]
    if (a !== b && shortestPath(g, a, b)) out.push([a, b])
  }
  return out
}

test('Rashi to Rabbeinu Tam is one family step', () => {
  const p = shortestPath(g, RASHI, RABBEINU_TAM)!
  assert.ok(p)
  assert.deepEqual(p.steps, [{ id: RASHI }, { id: RABBEINU_TAM, via: { kind: 'family', dir: 'up' } }])
  assert.equal(p.weight, 2)
  assert.deepEqual(shortestPath(g, RABBEINU_TAM, RASHI)!.steps, [{ id: RABBEINU_TAM }, { id: RASHI, via: { kind: 'family', dir: 'down' } }])
  assertReal(p, 'Rashi to Rabbeinu Tam')
})

test('Rashi to the Rambam exists; every step is a stored link, no sage twice, and the reverse path is the reverse', () => {
  const p = shortestPath(g, RASHI, RAMBAM)!
  assert.ok(p, 'no path')
  assert.equal(p.steps[0].id, RASHI)
  assert.equal(p.steps[p.steps.length - 1].id, RAMBAM)
  assert.ok(p.steps.length >= 2)
  assertReal(p, 'Rashi to the Rambam')
  const back = shortestPath(g, RAMBAM, RASHI)!
  assert.deepEqual(idsOf(back), idsOf(p).reverse())
  assert.equal(back.weight, p.weight)
  assertReal(back, 'the Rambam to Rashi')
  console.log(`       (Rashi to the Rambam: ${p.links} links, cost ${p.weight})`)
})

test('300 real pairs: every step a stored link of the strongest kind in its stored direction; b to a is a to b reversed', () => {
  for (const [a, b] of samplePairs(300)) {
    const p = shortestPath(g, a, b)!
    assertReal(p, `${a} to ${b}`)
    const back = shortestPath(g, b, a)!
    assert.deepEqual(idsOf(back), idsOf(p).reverse(), `${a} to ${b}`)
    assert.equal(back.weight, p.weight)
    assert.equal(back.links, p.links)
  }
})

test('sages in different components have no path, and neither has a sage with no link', () => {
  // components by the fewest-links walk
  const seen = new Set<string>()
  const comps: string[][] = []
  for (const id of g.ids) {
    if (seen.has(id)) continue
    const comp = [...hopDistancesFrom(g, id).keys()]
    comp.forEach(x => seen.add(x))
    comps.push(comp)
  }
  comps.sort((p, q) => q.length - p.length)
  assert.ok(comps.length >= 2, 'the roster is one component')
  const main = comps[0]
  assert.ok(main.includes(RASHI) && main.includes(RAMBAM), 'Rashi and the Rambam are in the largest component')
  for (const other of comps.slice(1, 6)) {
    assert.equal(shortestPath(g, main[0], other[0]), null)
    assert.equal(shortestPath(g, other[0], RASHI), null)
    assert.equal(connectPathFor('he', other[0], RASHI), null)
  }
  const lone = g.ids.find(id => degreeOf(g, id) === 0)
  assert.ok(lone, 'every sage has a link')
  assert.equal(shortestPath(g, lone, RASHI), null)
  assert.equal(connectPathFor('en', RASHI, lone), null)
  console.log(`       (${comps.length} components; the largest has ${main.length} of ${g.ids.length} sages; ${comps.filter(c => c.length === 1).length} stand alone)`)
})

test('shortestPathsFrom and hopDistancesFrom agree with shortestPath on the real graph', () => {
  const all = shortestPathsFrom(g, RASHI)
  const hops = hopDistancesFrom(g, RASHI)
  assert.equal(hops.get(RASHI), 0)
  assert.equal(all.size, hops.size - 1)
  for (const [id, p] of all) {
    assert.deepEqual(p, shortestPath(g, RASHI, id))
    assert.ok(hops.get(id)! <= p.links, `${id}: ${hops.get(id)} hops, ${p.links} links`)
  }
})

test('50 sampled paths in each language: every caption says what the stored link says, in its direction', () => {
  const READ: Record<Locale, Array<[RegExp, ConnectKind, StepDir | 'any']>> = {
    he: [
      [/^תלמיד(?:ו|תו) של /, 'teacher', 'up'], [/^(?:רבו|מורתו) של /, 'teacher', 'down'], [/^(?:בן|בת) משפחתו של /, 'family', 'any'],
      [/^ממשיכ(?:ו|תו) של /, 'predecessor', 'up'], [/^קודמ(?:ו|תו) של /, 'predecessor', 'down'], [/^חבר(?:ו|תו) של /, 'colleague', 'any'],
      [/^ב[רת]־פלוגתא של /, 'oppose', 'any'], [/^הושפע(?:ה)? מ־/, 'influence', 'up'], [/^השפיע(?:ה)? על /, 'influence', 'down'],
    ],
    en: [
      [/^Student of /, 'teacher', 'up'], [/^Teacher of /, 'teacher', 'down'], [/^Relative of /, 'family', 'any'],
      [/^Successor of /, 'predecessor', 'up'], [/^Predecessor of /, 'predecessor', 'down'], [/^Colleague of /, 'colleague', 'any'],
      [/^Disputant of /, 'oppose', 'any'], [/^Influenced by /, 'influence', 'up'], [/^Influenced (?!by )/, 'influence', 'down'],
    ],
    ru: [
      [/^Учился у: |^Училась у: /, 'teacher', 'up'], [/^Учил: |^Учила: /, 'teacher', 'down'], [/^Родственни(?:к|ца): /, 'family', 'any'],
      [/^Преемни(?:к|ца): /, 'predecessor', 'up'], [/^Предшественни(?:к|ца): /, 'predecessor', 'down'], [/^Коллега: /, 'colleague', 'any'],
      [/^Оппонент: /, 'oppose', 'any'], [/^Под влиянием: /, 'influence', 'up'], [/^Повлиял[а]? на: /, 'influence', 'down'],
    ],
  }
  const pairs = samplePairs(50)
  assert.equal(pairs.length, 50)
  const seenKinds = new Set<string>()
  for (const l of LOCALES) {
    const net = connectNet(l)
    const nameOf = new Map(net.sages.map(s => [s[0], s[1]]))
    for (const [a, b] of pairs) {
      const view = connectPathFor(l, a, b)!
      const p = shortestPath(g, a, b)!
      assert.equal(view.length, p.steps.length)
      assert.equal(view[0].caption, null)
      for (let k = 1; k < view.length; k++) {
        const via = p.steps[k].via!
        const caption = view[k].caption!
        const hit = READ[l].filter(([rx]) => rx.test(caption))
        assert.equal(hit.length, 1, `${l} ${a}-${b} step ${k}: "${caption}" reads as ${hit.length} phrases`)
        const [, kind, dir] = hit[0]
        assert.equal(kind, via.kind, `${l} ${a}-${b} step ${k}: "${caption}" is not a ${via.kind} step`)
        if (dir !== 'any') assert.equal(dir, via.dir, `${l} ${a}-${b} step ${k}: "${caption}" has the direction ${dir}, the link says ${via.dir}`)
        // and the link as the data stores it, going from the previous sage to this one
        assert.ok(stored(p.steps[k - 1].id, p.steps[k].id).some(([sk, sd]) => sk === kind && (dir === 'any' ? sd === via.dir : sd === dir)), `${l} ${a}-${b} step ${k}: "${caption}" is not what the data stores`)
        assert.ok(caption.endsWith(nameOf.get(p.steps[k - 1].id)!), `${l}: "${caption}" does not end with the previous sage's name`)
        assert.equal(view[k].dotted, via.kind === 'influence')
        assert.equal(view[k].name, nameOf.get(p.steps[k].id))
        seenKinds.add(`${via.kind}/${via.dir}`)
      }
    }
  }
  assert.ok(seenKinds.size >= 7, `the sample only held ${[...seenKinds]}`)
})

test('a step from a teacher to his student says "student of <teacher>"; from the student back, "teacher of"; Rashi to Rabbeinu Tam says relative', () => {
  const pair = rawLinks.find(c => c.type === 'teacher' && sages.some(s => s.id === c.source) && sages.some(s => s.id === c.target) && linkBetween(g, c.source, c.target)?.kind === 'teacher')!
  for (const l of LOCALES) {
    const down = connectPathFor(l, pair.source, pair.target)!
    const net = connectNet(l)
    const teacherName = net.sages.find(s => s[0] === pair.source)![1]
    const studentName = net.sages.find(s => s[0] === pair.target)![1]
    assert.equal(down.length, 2)
    assert.equal(down[1].caption, stepCaption({ kind: 'teacher', dir: 'up' }, teacherName, l, !!net.sages.find(s => s[0] === pair.target)![3]))
    const up = connectPathFor(l, pair.target, pair.source)!
    assert.equal(up[1].caption, stepCaption({ kind: 'teacher', dir: 'down' }, studentName, l, !!net.sages.find(s => s[0] === pair.source)![3]))
  }
  assert.equal(connectPathFor('he', RASHI, RABBEINU_TAM)![1].caption, 'בן משפחתו של רש"י')
  assert.equal(connectPathFor('en', RASHI, RABBEINU_TAM)![1].caption, 'Relative of Rashi')
  assert.match(connectPathFor('ru', RASHI, RABBEINU_TAM)![1].caption!, /^Родственник: /)
})

test('the net: only sages with a link, in id order, named in the language, eras and edges in range, a woman marked', () => {
  const linkedIds = g.ids.filter(id => degreeOf(g, id) > 0)
  for (const l of LOCALES) {
    const net = connectNet(l)
    assert.deepEqual(net.sages.map(s => s[0]), linkedIds, l)
    assert.deepEqual(net.sages.map(s => s[0]), [...net.sages.map(s => s[0])].sort((x, y) => Number(x) - Number(y)))
    for (const [id, name, period, woman] of net.sages) {
      assert.ok(name.trim() && !name.includes(' – ') && !/\([^)]*\)/.test(name), `${l} ${id}: name "${name}"`)
      assert.ok(Number.isInteger(period) && period >= 0 && period < ALL_PERIODS.length)
      assert.ok(woman === undefined || woman === 1)
      if (l !== 'he') assert.ok(!/[֐-׿]/.test(name), `${l} ${id}: Hebrew in "${name}"`)
    }
    assert.equal(net.edges.length, g.edges.length)
    for (const [a, b, kind] of net.edges) {
      assert.ok(a >= 0 && b >= 0 && a < net.sages.length && b < net.sages.length && a !== b)
      assert.ok(kind >= 0 && kind < CONNECT_KINDS.length)
    }
    assert.strictEqual(connectNet(l), net, 'cached')
  }
  const he = connectNet('he')
  const rashi = he.sages.find(s => s[0] === RASHI)!
  assert.deepEqual(rashi, [RASHI, 'רש"י', ALL_PERIODS.indexOf('rishonim')])
  assert.equal(connectNet('en').sages.find(s => s[0] === RASHI)![1], 'Rashi')
  const deborah = he.sages.find(s => s[0] === byLabel('דבורה הנביאה'))!
  assert.equal(deborah[3], 1, 'Deborah the prophetess is marked as a woman')
  assert.equal(rashi[3], undefined)
  assert.equal(he.sages.filter(s => s[3] === 1).length, sages.filter(s => s.tags?.includes('נשים') && degreeOf(g, s.id) > 0).length)
  // the browser's graph answers like the server's
  const back = graphFromNet(JSON.parse(JSON.stringify(he)))
  for (const [a, b] of samplePairs(100)) assert.deepEqual(shortestPath(back, a, b), shortestPath(g, a, b), `${a} to ${b}`)
})

// Six women the roster left without the 'נשים' tag until 2026-10-25, by name (ids drift, names do not).
const WOMEN_ONCE_UNTAGGED = ['הרבנית חיה מושקא שניאורסון', 'גאולה כהן', 'לאה אמנו', "סוליקא חג'ואל", 'אימא שלום', 'מרים הנביאה']

test('the six women once left untagged are women in the net, and a Hebrew caption that describes one is in the feminine', () => {
  const he = connectNet('he')
  let described = 0
  for (const label of WOMEN_ONCE_UNTAGGED) {
    const id = byLabel(label)
    assert.ok(sages.find(s => s.id === id)!.tags?.includes('נשים'), `${id} ${label} lacks the 'נשים' tag`)
    const row = he.sages.find(s => s[0] === id)
    assert.equal(!!row, degreeOf(g, id) > 0, `${label}: in the net exactly when she has a recorded link`)
    if (!row) continue
    assert.equal(row[3], 1, `${id} ${label} is not marked as a woman in the net`)
    for (const { id: prev } of sages) {
      const via = linkBetween(g, prev, id)
      if (!via) continue
      const prevName = he.sages.find(s => s[0] === prev)![1]
      const caption = describePath(he, { steps: [{ id: prev }, { id, via }], weight: 0, links: 1 }, 'he')[1].caption!
      assert.equal(caption, stepCaption(via, prevName, 'he', true), `${id} ${label} from ${prev}`)
      assert.notEqual(caption, stepCaption(via, prevName, 'he', false), `${id} ${label} from ${prev}: the masculine caption`)
      described++
    }
  }
  assert.ok(described >= 1, 'no caption describes any of them')
})

test('the Hebrew net fits the page\'s budget (the whole payload, net and the game\'s day, is under 28 KB)', () => {
  const bytes = (l: Locale) => Buffer.byteLength(JSON.stringify(connectNet(l)), 'utf8')
  console.log(`       (net bytes: he ${bytes('he')}, en ${bytes('en')}, ru ${bytes('ru')})`)
  // room is left for the day's route and hints; every name is kept. 23 500 until the roster grew from 459 to 509 sages; 26 500 until the owner's
  // 13 papers of 18 October brought sages 515 -> 528 with 46 new sourced links (the net was 25 914 bytes, now 27 081): a true link is never dropped to fit
  assert.ok(bytes('he') <= 28_000, `the Hebrew net is ${bytes('he')} bytes`)
})

test('connectPathFor: the chain in a language, or null for an unknown sage, the same sage twice, or no chain', () => {
  for (const l of LOCALES) {
    const view = connectPathFor(l, RASHI, RAMBAM)!
    assert.ok(view.length >= 2)
    assert.equal(view[0].id, RASHI)
    assert.equal(view[view.length - 1].id, RAMBAM)
    assert.equal(view[0].caption, null)
    assert.ok(view.slice(1).every(v => v.caption && v.caption.length > 4))
    assert.ok(view.every(v => ALL_PERIODS.includes(v.period)))
  }
  assert.equal(connectPathFor('he', RASHI, RASHI), null)
  assert.equal(connectPathFor('he', RASHI, '999999'), null)
  assert.equal(connectPathFor('he', 'nobody', RASHI), null)
  assert.equal(connectPathFor('he', '', ''), null)
  // the same chain, other way: the views are each other's reverse
  assert.deepEqual(connectPathFor('en', RAMBAM, RASHI)!.map(v => v.id), connectPathFor('en', RASHI, RAMBAM)!.map(v => v.id).reverse())
})

test('lib/connect.ts is pure: it imports no server module, dataset or DOM', () => {
  const src = read('lib/connect.ts')
  const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map(m => m[1])
  assert.deepEqual(imports.sort(), ['./types', './types'])
  assert.doesNotMatch(src, /\bfs\b|window|document|localStorage|require\(/)
  // contemporary is not a relation
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''), /contemporary/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
