/**
 * "Six Steps" around the packages (lib/connect.ts, lib/connectFlight.ts, lib/chain.ts, the two pages): the entry
 * points of the feature, the pages' rules (what is a 404, what is indexed), the analytics names and that their
 * properties carry no name, id or guess, and that the documentation and the test script know the feature.
 * The unit tests are tests/connect.test.ts, chain.test.ts, connectFlight.test.ts and chainServer.test.ts; this
 * one reads the shared files the packages do not own. Runs on the real corpus, with no network.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getAllSages } from '../lib/serverData'
import { connectGraph, connectPathFor } from '../lib/connectServer'
import { degreeOf } from '../lib/connect'
import { buildFlight, connectHref, flightHref } from '../lib/connectFlight'
import { towerData } from '../lib/towerServer'
import { riddlePoolIds } from '../lib/riddleServer'
import { ABOUT_COPY } from '../components/about/aboutCopy'
import sitemap from '../app/sitemap'
import type { Locale } from '../lib/types'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const app = path.join(__dirname, '..')
const read = (rel: string) => fs.readFileSync(path.join(app, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const sages = getAllSages()
const byLabel = (label: string) => {
  const s = sages.find(x => x.label === label)
  assert.ok(s, `no sage labelled ${label}`)
  return s
}
const RASHI = 'רש"י (רבי שלמה יצחקי)'

console.log('\nthe pages')

test('the tower path page: unknown id, the same sage twice and a pair with no path give nothing to fly (a 404)', () => {
  const rashi = byLabel(RASHI)
  assert.equal(connectPathFor('he', rashi.id, '999999'), null)
  assert.equal(connectPathFor('he', '999999', rashi.id), null)
  assert.equal(connectPathFor('he', rashi.id, rashi.id), null)
  // a sage with no link at all is in no component with anyone
  const g = connectGraph()
  const alone = sages.find(s => degreeOf(g, s.id) === 0)
  assert.ok(alone, 'every sage has a link: the no-path case needs another example')
  assert.equal(connectPathFor('he', rashi.id, alone.id), null)
  assert.equal(connectPathFor('he', alone.id, rashi.id), null)
})

test('a pair with a path gives a flight in every language, one station per sage, ending where the path ends', () => {
  const rashi = byLabel(RASHI)
  const rambam = byLabel('הרמב"ם')
  for (const loc of LOCALES) {
    const views = connectPathFor(loc, rashi.id, rambam.id)
    assert.ok(views && views.length >= 2, `${loc}: no path`)
    const flight = buildFlight(towerData(loc), loc, views)
    assert.ok(flight, `${loc}: nothing to fly`)
    assert.equal(flight.points.length, views.length)
    assert.equal(flight.from, rashi.id)
    assert.equal(flight.to, rambam.id)
    assert.equal(flight.href, flightHref(loc, rashi.id, rambam.id))
    assert.equal(flight.href, `/${loc}/tower/path/${rashi.id}/${rambam.id}`)
    assert.equal(flight.connectHref, connectHref(loc, rashi.id, rambam.id))
    assert.equal(flight.stations[0].caption, null)
    assert.ok(flight.stations.slice(1).every(s => s.caption), `${loc}: a station without a caption`)
  }
})

test('every pair of the riddle pool that has a path can be flown (no null from buildFlight)', () => {
  const pool = riddlePoolIds().slice(0, 40)
  let flown = 0
  for (const a of pool) for (const b of pool) {
    if (a >= b) continue
    const views = connectPathFor('en', a, b)
    if (!views) continue
    assert.ok(buildFlight(towerData('en'), 'en', views), `${a} -> ${b}`)
    flown++
  }
  assert.ok(flown > 100, `only ${flown} pairs flown`)
})

test('the pages: /connect is rebuilt every half hour with the game above the picker; the path page is not indexed, has no static params and 404s', () => {
  const connect = read('app/[locale]/connect/page.tsx')
  assert.match(connect, /export const revalidate = 1800/)
  assert.match(connect, /<SiteTopBar locale=\{loc\} path="\/connect" \/>/)
  assert.match(connect, /pageUrl=\{`\$\{SITE_URL\}\/\$\{loc\}\/connect`\}/)
  assert.ok(connect.indexOf('<ChainGame') > 0 && connect.indexOf('<ChainGame') < connect.indexOf('<ConnectPicker'), 'the game comes first')
  assert.match(connect, /<Toaster \/>/)
  const tower = read('app/[locale]/tower/path/[from]/[to]/page.tsx')
  assert.match(tower, /export function generateStaticParams\(\) \{\s*return \[\]\s*\}/)
  assert.match(tower, /robots: \{ index: false, follow: true \}/)
  assert.match(tower, /if \(!views\) notFound\(\)/)
  assert.match(tower, /if \(!flight\) notFound\(\)/)
  assert.match(tower, /loc === 'he' \? '←' : '→'/)
  assert.match(tower, /<TowerScene data=\{data\} locale=\{loc\} flight=\{flight\} \/>/)
})

console.log('\nentry points')

test('the mobile menu has the item, once, and the desktop header gets no new icon', () => {
  const header = read('components/layout/Header.tsx')
  const hits = [...header.matchAll(/\/\$\{locale\}\/connect/g)]
  assert.equal(hits.length, 1, 'one link to /connect in Header.tsx')
  assert.ok(hits[0].index! > header.indexOf('function MobileActionsMenu'), 'it is in the mobile menu')
  assert.match(header, /CONNECT_MENU: Record<Locale, string> = \{ he: 'שרשרת החכמים', en: 'Sage Chain', ru: 'Цепочка мудрецов' \}/)
})

test('the About page lists it in all three languages and links to /connect', () => {
  for (const loc of LOCALES) {
    const c = ABOUT_COPY[loc]
    assert.ok(c.connectTitle && c.connectBody && c.connectCta, loc)
  }
  const about = read('components/about/AboutContent.tsx')
  assert.match(about, /href: `\/\$\{locale\}\/connect`/)
})

test('the sage page links to /connect?from=<id>, beside the tower link, as a plain link', () => {
  const page = read('app/[locale]/sage/[id]/page.tsx')
  assert.match(page, /import \{ connectHref \} from '@\/lib\/connectFlight'/)
  assert.match(page, /<a href=\{connectHref\(loc, raw\.id\)\}/)
  assert.ok(page.indexOf('connectHref(loc, raw.id)') > page.indexOf('towerPath(loc, raw.id)'))
  assert.equal(connectHref('he', '594'), '/he/connect?from=594')
  assert.equal(connectHref('en', '594', '41'), '/en/connect?from=594&to=41')
  assert.equal(connectHref('ru'), '/ru/connect')
})

test('the tower\'s chosen-sage panel links to /connect?from=<id>', () => {
  const scene = read('components/tower/TowerScene.tsx')
  assert.match(scene, /<a href=\{connectHref\(locale, sel\.id\)\}/)
})

test('the riddle\'s end screen offers the game', () => {
  const game = read('components/riddle/RiddleGame.tsx')
  assert.match(game, /data-testid="riddle-other-game"/)
  assert.match(game, /<a href=\{`\/\$\{locale\}\/connect`\}/)
  assert.match(game, /otherGame: \{ he: 'משחק נוסף: שרשרת החכמים'/)
})

test('the picker and the game send a flight to the tower with where it came from; the sitemap holds /connect in three languages and no path page', () => {
  assert.match(read('components/connect/ConnectPicker.tsx'), /\$\{flightHref\(locale, outcome\.from, outcome\.to\)\}\?via=picker/)
  assert.match(read('components/connect/ChainGame.tsx'), /\$\{flightHref\(locale, day\.a, day\.b\)\}\?via=game/)
  const urls = sitemap().map(e => e.url)
  for (const l of LOCALES) assert.ok(urls.some(u => u.endsWith(`/${l}/connect`)), `${l}/connect missing`)
  assert.ok(!urls.some(u => u.includes('/tower/path')))
})

console.log('\nanalytics')

/** `track('name', { ... })` calls in a source, with the property keys of the object. */
function trackCalls(source: string): Array<{ name: string; keys: string[]; body: string }> {
  const out: Array<{ name: string; keys: string[]; body: string }> = []
  for (const m of source.matchAll(/track\('(\w+)'(?:, \{)?/g)) {
    if (!m[0].endsWith('{')) { out.push({ name: m[1], keys: [], body: '' }); continue }
    let depth = 1, i = m.index! + m[0].length
    const start = i
    while (i < source.length && depth > 0) { if (source[i] === '{') depth++; else if (source[i] === '}') depth--; i++ }
    const body = source.slice(start, i - 1)
    // top-level keys only: a key is a word at the start of a property, before ":" or "," or the end
    const keys: string[] = []
    let level = 0, token = ''
    const flush = () => { const k = /^\s*(\w+)\s*(?::|$)/.exec(token); if (k) keys.push(k[1]); token = '' }
    for (const ch of body) {
      if (ch === '(' || ch === '[' || ch === '{') level++
      if (ch === ')' || ch === ']' || ch === '}') level--
      if (ch === ',' && level === 0) flush()
      else token += ch
    }
    flush()
    out.push({ name: m[1], keys, body })
  }
  return out
}

test('the five names are in AnalyticsEvent and each is sent only with the coarse properties the list gives', () => {
  const analytics = read('lib/analytics.ts')
  const allowed: Record<string, string[]> = {
    connect_path: ['locale', 'steps'],
    connect_fly: ['locale', 'from'],
    chain_start: ['locale'],
    chain_complete: ['locale', 'won', 'steps', 'best'],
    chain_share: ['locale', 'method'],
  }
  for (const name of Object.keys(allowed)) assert.match(analytics, new RegExp(`\\| '${name}'`), name)
  const files = ['components/connect/ConnectPicker.tsx', 'components/connect/ChainGame.tsx', 'components/tower/TowerScene.tsx']
  const seen = new Map<string, number>()
  for (const f of files) {
    for (const call of trackCalls(read(f))) {
      const ok = allowed[call.name]
      if (!ok) continue
      seen.set(call.name, (seen.get(call.name) ?? 0) + 1)
      for (const k of call.keys) assert.ok(ok.includes(k), `${f}: ${call.name} carries "${k}"`)
      assert.deepEqual([...call.keys].sort(), [...ok].sort(), `${f}: ${call.name} keys`)
      assert.doesNotMatch(call.body, /\bnames?\b|\.id\b|\bid:|guess|query|question|label/, `${f}: ${call.name} holds a name, id or guess`)
    }
  }
  for (const name of Object.keys(allowed)) assert.ok(seen.has(name), `${name} is never sent`)
  // chain_share is sent for each way of sharing, connect_fly once
  assert.equal(seen.get('chain_share'), 3)
  assert.equal(seen.get('connect_fly'), 1)
})

test('the other files do not send the five names (no stray call)', () => {
  const dirs = ['components', 'app', 'lib']
  const walk = (dir: string): string[] => fs.readdirSync(path.join(app, dir), { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(tsx?|ts)$/.test(e.name) ? [path.join(dir, e.name)] : [])
  const owners = new Set(['components/connect/ConnectPicker.tsx', 'components/connect/ChainGame.tsx', 'components/tower/TowerScene.tsx', 'lib/analytics.ts'])
  for (const f of dirs.flatMap(walk)) {
    if (owners.has(f.replace(/\\/g, '/'))) continue
    assert.doesNotMatch(read(f), /track\('(?:connect_path|connect_fly|chain_start|chain_complete|chain_share)'/, f)
  }
})

console.log('\nthe script and the notes')

test('npm test runs the five test files of the feature', () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
  const files: Record<string, string> = {
    'test:connect': 'tests/connect.test.ts', 'test:chain': 'tests/chain.test.ts', 'test:connectflight': 'tests/connectFlight.test.ts',
    'test:chainserver': 'tests/chainServer.test.ts', 'test:connectpages': 'tests/connectPages.test.ts',
  }
  for (const [script, file] of Object.entries(files)) {
    assert.equal(pkg.scripts[script], `tsx ${file}`, script)
    assert.ok(pkg.scripts.test.includes(`npm run ${script}`), `${script} is not in npm test`)
    assert.ok(fs.existsSync(path.join(app, file)), file)
  }
})

test('CLAUDE.md describes the feature: its section, the five events and the tests', () => {
  const notes = fs.readFileSync(path.join(app, '..', 'CLAUDE.md'), 'utf8')
  assert.match(notes, /### Six Steps \("שישה צעדים", `\/\[locale\]\/connect`/)
  for (const name of ['connect_path', 'connect_fly', 'chain_start', 'chain_complete', 'chain_share']) assert.ok(notes.includes(`\`${name}\``), name)
  for (const t of ['connect', 'chain', 'connect flight', 'chain server', 'connect pages']) assert.ok(notes.includes(t), `the test line lacks "${t}"`)
  assert.match(notes, /`TowerScene` has a `flight` prop beside `tour`/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
