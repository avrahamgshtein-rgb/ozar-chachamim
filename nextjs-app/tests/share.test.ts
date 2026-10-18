/**
 * The share card (app/[locale]/sage/[id]/opengraph-image.tsx). Satori draws every line left to right,
 * so Hebrew is handed to it word by word in visual order: these tests pin that order, and that the
 * card's fonts are in the repository and traced into the deployment.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { clipWords, isRtlText, rtlWords, visualWord } from '../lib/ogText'
import nextConfig from '../next.config'
import * as React from 'react'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

test('a Hebrew word is drawn with its letters reversed', () => {
  assert.equal(visualWord('שלום'), 'םולש')
  assert.equal(visualWord('הרמב"ם'), 'ם"במרה')
})

test('brackets in Hebrew are mirrored, so they still face the text', () => {
  assert.equal(visualWord('(רבי'), 'יבר)')
  assert.equal(visualWord('מנוישטט)'), '(טטשיונמ')
})

test('numbers and Latin inside a Hebrew line stay left to right', () => {
  assert.equal(visualWord('ה-16'), '16-ה')
  assert.equal(visualWord('1138–1204'), '1204–1138') // an en dash separates two numbers, as in a browser
  assert.equal(visualWord('1138-1204'), '1138-1204') // a hyphen joins them into one number
  assert.equal(visualWord('(Rambam)'), '(Rambam)')
})

test('a line is split into words in reading order', () => {
  assert.deepEqual(rtlWords('רבי  משה בן מימון'), ['יבר', 'השמ', 'ןב', 'ןומימ'])
})

test('Hebrew is detected; English and Russian are not', () => {
  assert.ok(isRtlText('אוצר חכמים'))
  assert.ok(!isRtlText('Maimonides'))
  assert.ok(!isRtlText('Маймонид'))
})

test('a long subtitle is cut at a word, with an ellipsis', () => {
  const s = clipWords('one two three four five six seven', 20)
  assert.ok(s.length <= 20 && s.endsWith('…'), s)
  assert.ok(!s.includes('fou…'), s)
  assert.equal(clipWords('short', 20), 'short')
})

test('the card\'s fonts and medallion are in the repository and traced into the deployment', () => {
  const card = fs.readFileSync(path.join(__dirname, '..', 'lib/ogCard.tsx'), 'utf8')
  const files = [...card.matchAll(/asset\('([^']+)'\)/g)].map(m => m[1])
  assert.ok(files.length >= 5, 'expected fonts and the medallion')
  for (const f of files) assert.ok(fs.existsSync(path.join(__dirname, '..', f)), `missing ${f}`)
  const includes = (nextConfig.outputFileTracingIncludes ?? {})['/[locale]/sage/[id]/opengraph-image'] ?? []
  assert.ok(includes.includes('./assets/og/**'), 'assets/og must be traced for the card route')
  const story = (nextConfig.outputFileTracingIncludes ?? {})['/[locale]/today/story'] ?? []
  assert.ok(story.includes('./assets/og/**'), 'assets/og must be traced for the status image route')
})

// The route itself, as the CDN calls it: a sage's card in each language must come out as a PNG. English and
// Russian lines are not right-to-left, and a style key set to undefined there (justifyContent) made Satori throw
// ".trim() of undefined" for every card in those two languages while Hebrew still worked.
async function renderCards() {
  process.chdir(path.join(__dirname, '..'))
  // tsx compiles the route's JSX with the classic runtime (React.createElement); Next uses the automatic one
  ;(globalThis as unknown as { React: unknown }).React = React
  const route = (await import('../app/[locale]/sage/[id]/opengraph-image')).default
  for (const locale of ['he', 'en', 'ru']) {
    try {
      const res = await route({ params: Promise.resolve({ locale, id: '594' }) })
      const bytes = new Uint8Array(await res.arrayBuffer())
      assert.equal(res.status, 200, `${locale}: status`)
      assert.equal(res.headers.get('content-type'), 'image/png', `${locale}: content type`)
      assert.deepEqual([...bytes.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${locale}: a PNG`)
      assert.ok(bytes.length > 5_000 && bytes.length < 300_000, `${locale}: ${bytes.length} bytes`)
      passed++; console.log(`  ok  the share card of Rashi renders in ${locale} (${bytes.length} bytes)`)
    } catch (e) {
      failed++; console.log(`  FAIL the share card of Rashi in ${locale}\n       ${(e as Error).message}`)
    }
  }
}

renderCards().then(() => {
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
})
