/**
 * The Today page (lib/today.ts): the Hebrew date in Israel, which hillulot fall on it, the sage of the
 * day, and the death dates in public/data-yahrzeit.json, each still the date its sage's own paper gives.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ENCODER_CANDIDATES, VIDEO, nameSize, phase, wrapWords } from '../lib/todayVideo'
import {
  dayNumber, formatHebrewDate, hebrewDate, hebrewNumeral, HEBREW_MONTHS, isLeapYear, isYahrzeitOn, sageOfTheDay, YAHRZEITS,
} from '../lib/today'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${(e as Error).message}`) }
}

const at = (iso: string) => new Date(`${iso}T09:00:00Z`)

test('the Hebrew date in Israel', () => {
  const d = hebrewDate(at('2024-01-01'))
  assert.deepEqual([d.day, d.month, d.year], [20, 'Tevet', 5784])
  const late = hebrewDate(new Date('2024-01-01T22:30:00Z')) // already 2 January in Israel
  assert.equal(late.day, 21)
})

test('leap years follow the 19-year cycle', () => {
  assert.ok(isLeapYear(5784))
  assert.ok(!isLeapYear(5785))
  assert.ok(isLeapYear(5787))
  assert.equal(hebrewDate(at('2024-03-01')).month, 'Adar I')
})

test('a yahrzeit falls on its day; Adar moves to Adar II in a leap year, Adar I/II to Adar in a common one', () => {
  const tevet20 = hebrewDate(at('2024-01-01'))
  assert.ok(isYahrzeitOn({ day: 20, month: 'Tevet' }, tevet20))
  assert.ok(!isYahrzeitOn({ day: 21, month: 'Tevet' }, tevet20))
  const adarII7 = hebrewDate(at('2024-03-17')) // 7 Adar II 5784
  assert.deepEqual([adarII7.day, adarII7.month], [7, 'Adar II'])
  assert.ok(isYahrzeitOn({ day: 7, month: 'Adar' }, adarII7))
  const adar7 = hebrewDate(at('2025-03-07')) // 7 Adar 5785
  assert.deepEqual([adar7.day, adar7.month], [7, 'Adar'])
  assert.ok(isYahrzeitOn({ day: 7, month: 'Adar II' }, adar7))
  assert.ok(isYahrzeitOn({ day: 7, month: 'Adar I' }, adar7))
})

test('a yahrzeit on the 30th is kept on the 29th of a month that has no 30th', () => {
  // find a 29th that is the last day of its month
  let d = at('2024-01-01')
  for (let i = 0; i < 400; i++) {
    const h = hebrewDate(d)
    if (h.day === 29 && h.lastDayIs29) {
      assert.ok(isYahrzeitOn({ day: 30, month: h.month }, h))
      return
    }
    d = new Date(d.getTime() + 86_400_000)
  }
  assert.fail('no 29-day month found')
})

test('the sage of the day is stable for a day, changes the next day, and visits everyone in a cycle', () => {
  const ids = Array.from({ length: 50 }, (_, i) => String(i + 1))
  const today = dayNumber(at('2026-10-13'))
  assert.equal(sageOfTheDay(ids, today), sageOfTheDay([...ids].reverse(), today))
  assert.notEqual(sageOfTheDay(ids, today), sageOfTheDay(ids, today + 1))
  const seen = new Set(Array.from({ length: 50 }, (_, k) => sageOfTheDay(ids, today + k)))
  assert.equal(seen.size, 50)
  assert.equal(sageOfTheDay([], today), null)
})

test('Hebrew numerals and the written date', () => {
  assert.equal(hebrewNumeral(2), 'ב׳')
  assert.equal(hebrewNumeral(15), 'ט״ו')
  assert.equal(hebrewNumeral(16), 'ט״ז')
  assert.equal(hebrewNumeral(20), 'כ׳')
  assert.equal(hebrewNumeral(787), 'תשפ״ז')
  assert.equal(formatHebrewDate(at('2026-10-13'), 'he'), 'ב׳ בחשוון התשפ״ז')
})

test('every death date is still its sage\'s, and the words are still in his paper', () => {
  const app = path.join(__dirname, '..')
  const labels = new Map<string, string>()
  for (const f of ['data.json', 'data-supplement.json', 'data-supplement-2.json', 'data-ancient.json']) {
    const p = path.join(app, 'public', f)
    if (!fs.existsSync(p)) continue
    for (const n of JSON.parse(fs.readFileSync(p, 'utf8')).nodes ?? []) if (!labels.has(String(n.id))) labels.set(String(n.id), n.label)
  }
  const norm = (s: string) => s.replace(/״/g, '"').replace(/׳/g, "'").replace(/\s+/g, ' ')
  for (const [id, y] of Object.entries(YAHRZEITS)) {
    assert.equal(labels.get(id), y.label, `${id} now belongs to another sage: rebuild with scripts/build_yahrzeit.py`)
    assert.ok((HEBREW_MONTHS as readonly string[]).includes(y.month), `${id}: month ${y.month}`)
    assert.ok(y.day >= 1 && y.day <= 30, `${id}: day ${y.day}`)
    const paper = JSON.parse(fs.readFileSync(path.join(app, 'public', 'research', `${id}.json`), 'utf8'))
    const text = norm(paper.map((d: { content?: string }) => d.content ?? '').join(' '))
    assert.ok(text.includes(norm(y.quote)), `${id}: the quote is no longer in the paper`)
  }
})

console.log('\nthe video for a status')

test('twelve seconds, 1080×1920, and every encoder tried is H.264 (what WhatsApp plays)', () => {
  assert.deepEqual([VIDEO.width, VIDEO.height, VIDEO.seconds], [1080, 1920, 12])
  assert.ok(ENCODER_CANDIDATES.every(c => c.codec.startsWith('avc1.')))
  assert.ok(ENCODER_CANDIDATES.every(c => c.height / c.width === 16 / 9))
})

test('the timeline eases from 0 to 1 and holds; long lines wrap and a very long text is cut with an ellipsis', () => {
  assert.equal(phase(0, 1, 1), 0)
  assert.equal(phase(2.5, 1, 1), 1)
  assert.ok(phase(1.5, 1, 1) > 0.5 && phase(1.5, 1, 1) < 1)
  const measure = (s: string) => s.length * 10
  assert.deepEqual(wrapWords('אחת שתיים שלוש ארבע', 100, measure), ['אחת שתיים', 'שלוש ארבע'])
  const many = wrapWords('מילה '.repeat(80), 100, measure, 3)
  assert.equal(many.length, 3)
  assert.ok(many[2].endsWith('…'))
  assert.ok(nameSize('רש״י') > nameSize('רבי אלכסנדרי זוסלין הכהן (המהרא״ך) מפרנקפורט ומקרקוב'))
})

test('the Today page offers the video beside the image, made in the browser and never on the server', () => {
  const page = fs.readFileSync(path.join(__dirname, '../app/[locale]/today/page.tsx'), 'utf8')
  assert.match(page, /<ShareToday [^>]*card=\{card\}/)
  const comp = fs.readFileSync(path.join(__dirname, '../components/today/TodayVideo.tsx'), 'utf8')
  assert.match(comp, /^'use client'/)
  // the muxer loads only when a video is made
  assert.match(comp, /await import\('mp4-muxer'\)/)
  assert.doesNotMatch(comp, /^import .* from 'mp4-muxer'/m)
  // no encoder: record the canvas; neither: no button
  assert.match(comp, /MediaRecorder/)
  assert.match(comp, /if \(!can\) return null/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
