/**
 * "Listen to the research" (components/sages/ListenResearch.tsx reads what lib/speech.ts gives it):
 * what is read aloud, in which language, and in pieces short enough for every browser's voice.
 */
import assert from 'node:assert/strict'
import { parseResearchDoc } from '../lib/researchParse'
import { docLang, speakableText, speechItems, splitSentences } from '../lib/speech'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const hebrew = parseResearchDoc({
  title: 'הרמב"ם',
  content: [
    'הרמב"ם: חייו ומשנתו',
    'רבי משה בן מימון נולד בקורדובה בשנת 1138.[1, 2] הוא כתב את **משנה תורה**. ראו https://example.org/rambam לפרטים.',
    'מפעליו העיקריים',
    '1. משנה תורה – קודקס הלכתי.',
    '2. מורה נבוכים – חיבור פילוסופי.',
    '---',
    'מקורות',
    '1. ספר כלשהו, ירושלים 2001.',
  ].join('\n'),
})

test('citation markers, URLs and markdown are not read aloud', () => {
  assert.equal(speakableText('נולד בשנת 1138.[1, 2] ראו https://example.org/x לפרטים, ו**משנה תורה**.'),
    'נולד בשנת 1138. ראו לפרטים, ומשנה תורה.')
  assert.equal(speakableText('see [cite: 3, 4] here'), 'see here')
})

test('the paper is read in order: title, headings, paragraphs and list items, never the sources', () => {
  const items = speechItems([hebrew], ['הרמב"ם: חייו ומשנתו'])
  const text = items.map(i => i.text).join(' | ')
  assert.ok(items[0].target === 'title', 'the title comes first')
  assert.ok(text.includes('נולד בקורדובה'), text)
  assert.ok(text.includes('משנה תורה – קודקס הלכתי'), text)
  assert.ok(!text.includes('ספר כלשהו'), 'the sources list is not read')
  assert.ok(!/\[\d/.test(text) && !text.includes('http'), text)
  for (const it of items) assert.equal(it.lang, 'he')
  assert.ok(items.some(i => /^\d+\.\d+$/.test(i.target)), 'list items have their own targets')
})

test('every target is a block the reader renders with data-speak', () => {
  const items = speechItems([hebrew])
  for (const it of items) {
    if (it.target === 'title') continue
    const bi = Number(it.target.split('.')[0])
    assert.ok(['heading', 'paragraph', 'quote', 'list'].includes(hebrew.blocks[bi].kind), it.target)
  }
})

test('the language comes from the letters: Hebrew, English, Russian', () => {
  const en = parseResearchDoc({ title: 'x', content: 'Maimonides was born in Cordoba. He wrote the Mishneh Torah.' })
  const ru = parseResearchDoc({ title: 'x', content: 'Маймонид родился в Кордове. Он написал «Мишне Тора».' })
  assert.equal(docLang(hebrew), 'he')
  assert.equal(docLang(en), 'en')
  assert.equal(docLang(ru), 'ru')
})

test('long text is cut into sentences no longer than the limit', () => {
  const long = Array.from({ length: 12 }, (_, i) => `זהו משפט מספר ${i + 1} שמתאר את פועלו של החכם בפירוט רב`).join('. ') + '.'
  const parts = splitSentences(long, 120)
  assert.ok(parts.length > 1)
  for (const p of parts) assert.ok(p.length <= 120, `${p.length}: ${p}`)
  assert.equal(parts.join(' ').replace(/\s+/g, ' '), long.replace(/\s+/g, ' '))
  const run = 'מילה '.repeat(100).trim()
  for (const p of splitSentences(run, 80)) assert.ok(p.length <= 80)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
