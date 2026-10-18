/**
 * The sage chain on the real corpus (lib/chainServer.ts, with lib/chain.ts, lib/connect.ts and the two screens
 * components/connect/ConnectPicker.tsx and ChainGame.tsx): the pairs a day may be about (two sages of the
 * riddle's fame pool, 3 to 5 links apart, the cheapest chain as short as the fewest links), the pair of each
 * day (the same for every visitor, never the riddle's answer, every pair once a cycle), the route and the
 * hints' fields in the page's language, a whole game won and lost through the rules, the share text without a
 * name, the size of what the page ships, and the screens' wiring. No network, no browser: the screens are
 * rendered to markup, the interaction is run in Chromium by the lead.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as ReactNS from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getSageById } from '../lib/serverData'
import { dayNumber } from '../lib/today'
import { RIDDLE_EPOCH, hasHebrew } from '../lib/riddle'
import { riddleOn, riddlePoolIds } from '../lib/riddleServer'
import { connectGraph, connectNet, connectPathFor } from '../lib/connectServer'
import { graphFromNet, hopDistancesFrom, linkBetween, shortestPath, type ConnectNet } from '../lib/connect'
import {
  CHAIN_MAX_BEST, CHAIN_MIN_BEST, CHAIN_STORE_KEY, CHAIN_TITLE, MAX_MISSES, applyMove, chainHints, chainNumber, chainShareText, chainSteps,
  dailyPair, emptyChainState, parseChainState, startChainDay,
  type ChainDay, type ChainState,
} from '../lib/chain'
import { chainCandidates, chainDay, chainOn, connectPageData } from '../lib/chainServer'
import { ConnectPicker } from '../components/connect/ConnectPicker'
import { ChainGame } from '../components/connect/ChainGame'
import type { Locale } from '../lib/types'

// the component files are transformed with the classic JSX runtime here (Next uses the automatic one)
;(globalThis as { React?: unknown }).React = ReactNS

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const app = path.join(__dirname, '..')
const read = (rel: string) => fs.readFileSync(path.join(app, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const D0 = RIDDLE_EPOCH
/** Noon UTC of day `d` is inside the Israeli day `d` all year round. */
const dateOf = (d: number) => new Date(d * 86_400_000 + 12 * 3_600_000)
const DAYS = 400

const pool = new Set(riddlePoolIds())
const candidates = chainCandidates()
const graph = connectGraph()

console.log(`\nthe candidates: ${candidates.length} pairs of the ${pool.size} sages of the pool`)

test('the candidates are pairs of pool sages, a before b, none twice, each 3 to 5 links apart on the cheapest chain too', () => {
  assert.ok(candidates.length >= 1000, `only ${candidates.length} pairs: a game with so few repeats within a few years`)
  const seen = new Set<string>()
  for (const p of candidates) {
    assert.ok(pool.has(p.a) && pool.has(p.b), `${p.a}-${p.b} holds a sage outside the pool`)
    assert.ok(Number(p.a) < Number(p.b), `${p.a}-${p.b} is not in id order`)
    assert.ok(!seen.has(`${p.a}-${p.b}`), `${p.a}-${p.b} twice`)
    seen.add(`${p.a}-${p.b}`)
    assert.ok(p.best >= CHAIN_MIN_BEST && p.best <= CHAIN_MAX_BEST, `${p.a}-${p.b} best ${p.best}`)
  }
})

test('best is the fewest links (breadth first) and the cheapest chain, the one the tower page flies, uses exactly that many', () => {
  for (const p of candidates) {
    assert.equal(hopDistancesFrom(graph, p.a).get(p.b), p.best, `${p.a}-${p.b}: fewest links`)
    const path = shortestPath(graph, p.a, p.b)
    assert.ok(path, `${p.a}-${p.b} has no path`)
    assert.equal(path.links, p.best, `${p.a}-${p.b}: the cheapest chain uses ${path.links} links, the fewest are ${p.best}`)
    assert.equal(path.steps.length, p.best + 1)
  }
})

test('every pair of the pool that is 3 to 5 links apart with a matching cheapest chain is a candidate (nothing is left out)', () => {
  const ids = [...pool].sort((x, y) => Number(x) - Number(y))
  let expected = 0
  for (let i = 0; i < ids.length; i++) {
    const hops = hopDistancesFrom(graph, ids[i])
    for (let j = i + 1; j < ids.length; j++) {
      const h = hops.get(ids[j])
      if (h !== undefined && h >= CHAIN_MIN_BEST && h <= CHAIN_MAX_BEST && shortestPath(graph, ids[i], ids[j])?.links === h) expected++
    }
  }
  assert.equal(candidates.length, expected)
  assert.equal(chainCandidates(), candidates, 'cached')
  const spread = [3, 4, 5].map(b => candidates.filter(p => p.best === b).length)
  assert.ok(spread.every(n => n >= 100), `a length is rare: ${spread}`)
})

console.log('\nthe pair of the day')

test('chain #1 is 15 October 2026 in Israel, the riddle\'s day; the day turns at Israeli midnight', () => {
  assert.equal(chainOn(dateOf(D0)).number, 1)
  assert.equal(chainOn(dateOf(D0 + 9)).number, 10)
  assert.equal(chainOn(new Date('2026-10-14T20:59:00Z')).number, 0) // 23:59 on the 14th in Israel
  assert.equal(chainOn(new Date('2026-10-14T21:01:00Z')).number, 1) // 00:01 on the 15th
  assert.deepEqual(chainOn(new Date('2026-10-14T21:01:00Z')).pair, chainOn(new Date('2026-10-15T20:59:00Z')).pair)
})

test(`${DAYS} days: the same pair for every visitor, both ends in the pool, 3 to 5 links, never the riddle's answer, the route is the cheapest chain`, () => {
  let clashes = 0
  for (let d = D0; d < D0 + DAYS; d++) {
    const date = dateOf(d)
    const a = chainDay('he', date)
    const again = chainDay('he', new Date(date.getTime() + 5 * 3_600_000)) // later the same Israeli day
    assert.deepEqual(a, again, `day ${d}: not the same all day`)
    assert.equal(a.day, d)
    assert.equal(dayNumber(date), d)
    assert.equal(a.number, chainNumber(d))
    assert.ok(pool.has(a.a) && pool.has(a.b), `day ${d}: ${a.a}-${a.b} outside the pool`)
    assert.ok(a.best >= CHAIN_MIN_BEST && a.best <= CHAIN_MAX_BEST, `day ${d}: best ${a.best}`)
    const answer = riddleOn(date).sage.id
    assert.ok(a.a !== answer && a.b !== answer, `day ${d}: the riddle's answer ${answer} is an end`)
    const raw = dailyPair(candidates, d)!
    if (raw.a !== a.a || raw.b !== a.b) clashes++
    const p = shortestPath(graph, a.a, a.b)!
    assert.deepEqual(a.route, p.steps.map(s => s.id), `day ${d}: the route is not the cheapest chain`)
    assert.equal(a.route.length, a.best + 1)
    assert.equal(a.route[0], a.a)
    assert.equal(a.route[a.route.length - 1], a.b)
    assert.deepEqual(chainOn(date).pair, { a: a.a, b: a.b, best: a.best })
  }
  // the avoid rule only bends the walk where the riddle's answer is an end: a few days in a hundred at most
  assert.ok(clashes < DAYS * 0.2, `${clashes} of ${DAYS} days differ from the plain walk`)
  console.log(`       (${clashes} of ${DAYS} days moved on by the riddle's answer)`)
})

test('the plain walk visits every candidate once in a cycle, and a new pair every day for the next year', () => {
  const n = candidates.length
  const seen = new Set<string>()
  for (let k = 0; k < n; k++) {
    const p = dailyPair(candidates, D0 + k)!
    seen.add(`${p.a}-${p.b}`)
  }
  assert.equal(seen.size, n, `${seen.size} different pairs in a cycle of ${n}`)
  const year = new Set<string>()
  for (let d = D0; d < D0 + 365; d++) { const p = chainOn(dateOf(d)).pair; year.add(`${p.a}-${p.b}`) }
  assert.ok(year.size >= 365 - 40, `${year.size} different pairs in 365 days`)
})

test('the pair of the day is shuffled, not an id-ordered list: the first week does not share an end', () => {
  const firstWeek = Array.from({ length: 7 }, (_, k) => chainOn(dateOf(D0 + k)).pair)
  assert.ok(new Set(firstWeek.map(p => p.a)).size >= 4, JSON.stringify(firstWeek))
})

console.log('\nwhat the page ships')

test('the day carries only the route and the fields of the sages between, in the page\'s language', () => {
  for (const l of LOCALES) {
    for (let d = D0; d < D0 + DAYS; d += 3) {
      const day = chainDay(l, dateOf(d))
      assert.deepEqual(Object.keys(day).sort(), ['a', 'b', 'best', 'day', 'fields', 'number', 'route'])
      assert.deepEqual(Object.keys(day.fields).sort(), day.route.slice(1, -1).sort(), `day ${d} ${l}: fields are the interior sages`)
      for (const [id, field] of Object.entries(day.fields)) {
        assert.ok(field.length > 0 && field.length < 120, `day ${d} ${l}: sage ${id}'s field is "${field}"`)
        if (l === 'he') assert.equal(field, (getSageById(id)!.field ?? '').trim())
        else assert.ok(!hasHebrew(field), `day ${d} ${l}: sage ${id}'s field is still Hebrew: ${field}`)
      }
    }
  }
})

test('the net (Hebrew) and the day together are at most 28 000 bytes, on every day of the test', () => {
  const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v), 'utf8')
  const net = connectNet('he')
  let most = 0
  for (let d = D0; d < D0 + DAYS; d++) most = Math.max(most, bytes(net) + bytes(chainDay('he', dateOf(d))))
  console.log(`       net ${bytes(net)} + largest day ${most - bytes(net)} = ${most} bytes (he); en ${bytes(connectNet('en'))} + ${bytes(chainDay('en', dateOf(D0)))}, ru ${bytes(connectNet('ru'))} + ${bytes(chainDay('ru', dateOf(D0)))}`)
  // 25 000 until the 50 sages of Shem HaGedolim (roster 459 -> 509, 78 more links) took the Hebrew net from 22.8 to 25.5 KB
  assert.ok(most <= 28_000, `${most} bytes`)
  const page = connectPageData('he', dateOf(D0))
  assert.deepEqual(Object.keys(page).sort(), ['day', 'net'])
  assert.equal(page.net, net)
  assert.deepEqual(page.day, chainDay('he', dateOf(D0)))
  assert.ok(bytes(page) <= 28_000, `the page's data is ${bytes(page)} bytes`)
})

test('the route in the browser (the net\'s graph) is the route on the server and the one the tower page flies', () => {
  for (const l of LOCALES) {
    const g = graphFromNet(connectNet(l))
    for (let d = D0; d < D0 + DAYS; d += 2) {
      const day = chainDay(l, dateOf(d))
      assert.deepEqual(shortestPath(g, day.a, day.b)!.steps.map(s => s.id), day.route, `day ${d} ${l}`)
      assert.deepEqual(connectPathFor(l, day.a, day.b)!.map(v => v.id), day.route, `day ${d} ${l}: the tower page`)
      assert.deepEqual(connectPathFor(l, day.b, day.a)!.map(v => v.id), [...day.route].reverse(), `day ${d} ${l}: reversed`)
    }
  }
})

test('both ends of every day are in the net (the game can name them) and have links', () => {
  for (const l of LOCALES) {
    const ids = new Set(connectNet(l).sages.map(s => s[0]))
    for (let d = D0; d < D0 + DAYS; d += 5) {
      const day = chainDay(l, dateOf(d))
      for (const id of day.route) assert.ok(ids.has(id), `day ${d} ${l}: ${id} is not in the net`)
    }
  }
})

console.log('\ngames on the real days')

const linkedIn = (g: ReturnType<typeof graphFromNet>) => (x: string, y: string) => linkBetween(g, x, y) !== null

/** A whole game from the day's route: every hop is a hit, the last wins. */
function playWin(day: ChainDay, linked: (x: string, y: string) => boolean): ChainState {
  let s = startChainDay(emptyChainState(), day.day, day.a)
  for (const id of day.route.slice(1)) {
    const r = applyMove(s, id, day, linked)
    assert.equal(r.outcome, 'hit', `${id} on the route of day ${day.day}`)
    s = r.state
  }
  return s
}

test(`a win on each of ${DAYS} days takes exactly "best" steps along the route and ends on B`, () => {
  const linked = linkedIn(graphFromNet(connectNet('he')))
  for (let d = D0; d < D0 + DAYS; d++) {
    const day = chainDay('he', dateOf(d))
    const s = playWin(day, linked)
    assert.equal(s.done, true)
    assert.equal(s.won, true)
    assert.deepEqual(s.chain, day.route)
    assert.equal(chainSteps(s), day.best)
    assert.equal(s.misses, 0)
    assert.equal(s.moves, 'h'.repeat(day.best))
    assert.deepEqual([s.stats.played, s.stats.won, s.stats.streak], [1, 1, 1])
    // no shortcut: nobody on the route but its neighbours is linked to A or reaches B faster (fewest links = best)
    assert.equal(hopDistancesFrom(graph, day.a).get(day.b), day.best)
  }
})

test('a loss: five sages who are not linked to the end are five misses, the hints come at the 2nd and the 4th, and the game stops', () => {
  const net = connectNet('he')
  const linked = linkedIn(graphFromNet(net))
  for (let d = D0; d < D0 + 60; d += 7) {
    const day = chainDay('he', dateOf(d))
    const strangers = net.sages.map(s => s[0]).filter(id => id !== day.a && id !== day.b && !linked(day.a, id)).slice(0, 8)
    assert.ok(strangers.length >= 6)
    let s = startChainDay(emptyChainState(), day.day, day.a)
    const seen: number[] = []
    for (let i = 0; i < MAX_MISSES; i++) {
      assert.equal(s.done, false)
      const r = applyMove(s, strangers[i], day, linked)
      assert.equal(r.outcome, 'miss')
      s = r.state
      seen.push(chainHints(s, day).length)
    }
    assert.deepEqual(seen, [0, 1, 1, 2, 2])
    assert.equal(s.done, true)
    assert.equal(s.won, false)
    assert.equal(s.misses, MAX_MISSES)
    assert.equal(s.moves, 'm'.repeat(MAX_MISSES))
    assert.deepEqual([s.stats.played, s.stats.won, s.stats.streak], [1, 0, 0])
    assert.equal(applyMove(s, strangers[5], day, linked).outcome, 'refused')
    const [era, field] = chainHints(s, day)
    assert.deepEqual([era.kind, field.kind], ['era', 'field'])
    assert.equal(era.id, day.route[1])
    assert.ok(day.fields[field.id], `the field hint of day ${d} has a text`)
  }
})

test('a game restored from storage (JSON round trip) is the game that was saved, won or lost', () => {
  const linked = linkedIn(graphFromNet(connectNet('he')))
  const day = chainDay('he', dateOf(D0 + 3))
  const won = playWin(day, linked)
  assert.deepEqual(parseChainState(JSON.stringify(won)), won)
  assert.deepEqual(startChainDay(parseChainState(JSON.stringify(won)), day.day, day.a), won)
  // the next day starts over at its A and keeps the stats
  const next = chainDay('he', dateOf(D0 + 4))
  const fresh = startChainDay(parseChainState(JSON.stringify(won)), next.day, next.a)
  assert.deepEqual(fresh.chain, [next.a])
  assert.equal(fresh.done, false)
  assert.equal(fresh.stats.played, 1)
  assert.equal(CHAIN_STORE_KEY, 'ozar-chain')
})

test('the share text of games on 200 days in three languages has the shape of the design and no name or id', () => {
  const nets = Object.fromEntries(LOCALES.map(l => [l, connectNet(l)])) as Record<Locale, ConnectNet>
  const linkedBy = Object.fromEntries(LOCALES.map(l => [l, linkedIn(graphFromNet(nets[l]))])) as Record<Locale, ReturnType<typeof linkedIn>>
  for (let d = D0; d < D0 + 200; d++) {
    for (const l of LOCALES) {
      const day = chainDay(l, dateOf(d))
      const linked = linkedBy[l]
      const names = day.route.map(id => nets[l].sages.find(s => s[0] === id)![1])
      const url = `https://example.org/${l}/connect`
      const check = (text: string, won: boolean, hits: number, misses: number) => {
        const lines = text.split('\n')
        assert.equal(lines.length, 3, text)
        const num = day.number >= 1 ? ` #${day.number}` : ''
        assert.equal(lines[0], `${CHAIN_TITLE[l]}${num} 🔗 ${won ? hits : '✗'}/${day.best}`)
        assert.match(lines[1], /^[🟩⬜🎯]+$/u)
        assert.equal([...lines[1]].length, hits + misses)
        assert.equal(lines[2], url)
        assert.equal(lines[1].includes('🎯'), won)
        for (const n of names) assert.ok(!text.includes(n), `${n} is in the share text`)
        for (const id of day.route) assert.ok(!new RegExp(`(?<![\\d#/])${id}(?![\\d/])`).test(text.replace(url, '').replace(lines[0], '')), `id ${id} is in the share text`)
      }
      // a win, with a miss in the middle on some days
      let s = startChainDay(emptyChainState(), day.day, day.a)
      const stranger = nets[l].sages.map(x => x[0]).find(id => id !== day.a && id !== day.b && !linked(day.a, id))!
      let misses = 0
      for (const [k, id] of day.route.slice(1).entries()) {
        if (k === 1 && d % 2 === 0) { s = applyMove(s, stranger, day, linked).state; misses++ }
        s = applyMove(s, id, day, linked).state
      }
      assert.ok(s.won)
      check(chainShareText({ locale: l, number: day.number, url, moves: s.moves, won: true, best: day.best }), true, day.best, misses)
      // a loss
      let lost = startChainDay(emptyChainState(), day.day, day.a)
      const others = nets[l].sages.map(x => x[0]).filter(id => id !== day.a && id !== day.b && !linked(day.a, id)).slice(0, MAX_MISSES)
      for (const id of others) lost = applyMove(lost, id, day, linked).state
      assert.ok(lost.done && !lost.won)
      check(chainShareText({ locale: l, number: day.number, url, moves: lost.moves, won: false, best: day.best }), false, 0, MAX_MISSES)
    }
  }
})

console.log('\nthe screens')

const PAGE_URL = 'https://example.org/he/connect'
const gameHtml = (l: Locale, d = D0) => renderToStaticMarkup(ReactNS.createElement(ChainGame, { locale: l, net: connectNet(l), day: chainDay(l, dateOf(d)), pageUrl: PAGE_URL.replace('/he/', `/${l}/`) }))
const pickerHtml = (l: Locale) => renderToStaticMarkup(ReactNS.createElement(ConnectPicker, { locale: l, net: connectNet(l) }))

test('the game renders a fresh day in each language: title and number, A, the open slot, B as the target, the input, no end screen', () => {
  for (const l of LOCALES) {
    const day = chainDay(l, dateOf(D0 + 1))
    const net = connectNet(l)
    // React writes the roster's ASCII quote in an acronym (מהר"י בירב) as &quot; in the markup
    const name = (id: string) => net.sages.find(s => s[0] === id)![1].replace(/"/g, '&quot;')
    const html = gameHtml(l, D0 + 1)
    assert.ok(html.includes(CHAIN_TITLE[l]), l)
    assert.ok(html.includes(`#${day.number}`), l)
    assert.ok(html.includes(name(day.a)), `${l}: A`)
    assert.ok(html.includes(name(day.b)), `${l}: B`)
    assert.ok(html.includes(`href="/${l}/sage/${day.a}"`), `${l}: A links to his page`)
    assert.ok(html.includes('data-testid="chain-input"'), l)
    assert.ok(html.includes('data-testid="chain-confirm"'), l)
    assert.ok(html.includes('data-testid="chain-list"'), l)
    assert.ok(!html.includes('data-testid="chain-end"'), `${l}: no end screen on a fresh game`)
    assert.ok(!html.includes('data-testid="chain-hint"'), `${l}: no hint before a miss`)
    assert.ok(!html.includes(`href="/${l}/sage/${day.route[1]}"`), `${l}: the next sage on the route is not given away`)
    assert.ok(html.includes(l === 'he' ? 'טעויות: 0 מתוך 5' : l === 'en' ? 'Misses: 0 of 5' : 'Ошибки: 0 из 5'), l)
    assert.ok(html.includes(`🎯`), `${l}: the target mark`)
  }
})

test('the picker renders in each language: two fields with their test ids, a disabled button, the note, no result yet', () => {
  for (const l of LOCALES) {
    const html = pickerHtml(l)
    assert.ok(html.includes('data-testid="connect-from"') && html.includes('data-testid="connect-to"'), l)
    assert.match(html, /data-testid="connect-find"[^>]*disabled|disabled=""[^>]*data-testid="connect-find"/, `${l}: the button waits for two sages`)
    assert.ok(!html.includes('data-testid="connect-fly"'), `${l}: no fly link before a path`)
    assert.ok(!html.includes('data-testid="connect-result"'), l)
  }
})

const srcGame = read('components/connect/ChainGame.tsx')
const srcPicker = read('components/connect/ConnectPicker.tsx')
const srcServer = read('lib/chainServer.ts')

test('the test ids of the Chromium run are in the sources', () => {
  for (const id of ['chain-input', 'chain-hint', 'chain-end', 'chain-share-text', 'chain-confirm', 'chain-fly']) assert.ok(srcGame.includes(`"${id}"`), id)
  for (const id of ['connect-from', 'connect-to', 'connect-fly', 'connect-find']) assert.ok(srcPicker.includes(`"${id}"`), id)
})

test('the fly links are plain anchors to the tower path page with the via tag; no next/link anywhere in the screens', () => {
  assert.match(srcPicker, /flightHref\(locale, outcome\.from, outcome\.to\)\}\?via=picker/)
  assert.match(srcGame, /flightHref\(locale, day\.a, day\.b\)\}\?via=game/)
  for (const src of [srcPicker, srcGame]) {
    assert.ok(!/next\/link/.test(src))
    assert.ok(!/router\.(push|replace)/.test(src))
  }
  assert.ok(/<a\s[^>]*data-testid="connect-fly"/.test(srcPicker) || /<a\s+data-testid="connect-fly"/.test(srcPicker))
})

test('the screens import no server module, and the game keeps its state through lib/chain only (try/catch around every storage access)', () => {
  for (const src of [srcPicker, srcGame]) {
    assert.ok(!/from '@\/lib\/(serverData|connectServer|chainServer|riddleServer|todayServer|towerServer)/.test(src))
    assert.ok(!/from 'node:/.test(src))
  }
  assert.ok(!srcGame.includes("'ozar-chain'"), 'the key comes from lib/chain')
  assert.ok(srcGame.includes('CHAIN_STORE_KEY'))
  for (const src of [srcPicker, srcGame]) {
    const uses = [...src.matchAll(/localStorage\.|history\.replaceState/g)].length
    const guarded = [...src.matchAll(/try \{[^}]*(localStorage\.|history\.replaceState)/g)].length
    assert.equal(guarded, uses, 'every storage / address access sits in a try')
  }
  assert.ok(!srcGame.includes('sessionStorage'))
})

test('the screens track only the closed analytics names, with coarse props (no name, id, guess)', () => {
  const calls = [...(srcPicker + srcGame).matchAll(/track\('([a-z_]+)', (\{[^}]*\})\)/g)]
  const allowed: Record<string, string[]> = {
    connect_path: ['locale', 'steps'], chain_start: ['locale'], chain_complete: ['locale', 'won', 'steps', 'best'], chain_share: ['locale', 'method'],
  }
  assert.ok(calls.length >= 5)
  for (const [, name, props] of calls) {
    assert.ok(name in allowed, `unexpected event ${name}`)
    const keys = props.replace(/[{}]/g, '').split(',').map(k => k.split(':')[0].trim()).filter(Boolean)
    for (const k of keys) assert.ok(allowed[name].includes(k), `${name} carries ${k}`)
  }
  assert.ok(!/track\('connect_fly'/.test(srcPicker + srcGame), 'connect_fly is sent by the tower page, once')
})

test('the server module imports the pure rules, the riddle\'s pool and the graph, and no client module', () => {
  assert.match(srcServer, /riddlePoolIds/)
  assert.match(srcServer, /riddleOn/)
  assert.match(srcServer, /dailyPair/)
  assert.ok(!/components\//.test(srcServer))
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
