/**
 * The automatic answer and the search box's "ask the assistant":
 *  - extractiveAnswer quotes the research with citation handles the chat widget already understands,
 *    and says so plainly when it has nothing to quote;
 *  - looksLikeQuestion decides when the search box offers the assistant first;
 *  - the sage matcher finds a sage by his English or Russian name, not only the Hebrew one.
 * Imports the real production modules; no network, no provider.
 */
import assert from 'node:assert/strict'
import { buildRagContext, localNamesFor } from '../lib/rag/buildContext'
import { extractMentionedSages } from '../lib/rag/entityExtraction'
import { extractiveAnswer, quoteOf } from '../lib/rag/extractiveAnswer'
import { citationPayload } from '../lib/rag/citations'
import { getAllSages } from '../lib/serverData'
import { looksLikeQuestion, parseAnswer } from '../components/chat/askAbout'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`  ok  ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL ${name}`)
    console.log(`       ${(e as Error).message}`)
    failed++
  }
}

async function main() {
  console.log('\nautomatic answer')

  await test('a question about a sage with research is answered with cited quotes', async () => {
    const ctx = await buildRagContext('מי היה רש״י ומה הרעיון המרכזי שלו?', { locale: 'he', external: false })
    const text = extractiveAnswer(ctx, 'he')
    assert.ok(ctx.passages.length > 0, 'retrieval found nothing for Rashi')
    // every handle in the text is one of the route's citations, so the widget can number and link it
    const parsed = parseAnswer(text, citationPayload(ctx.passages))
    assert.ok(parsed.sources.length >= 1, 'no citation survived parsing')
    assert.ok(parsed.sources.every(s => s.citation.sageId === '594'), 'a quote came from another sage')
    assert.match(text, /אוטומטית/)
  })

  await test('the answer never contains markup the widget would misread', async () => {
    const ctx = await buildRagContext('מי היה רש״י?', { locale: 'he', external: false })
    const text = extractiveAnswer(ctx, 'he')
    assert.ok(!/\[cite:/i.test(text), 'research citation markers leaked into the quote')
    assert.ok(!/^#/m.test(text), 'a markdown heading leaked into the quote')
  })

  await test('a question naming nobody says so, in the question\'s language', async () => {
    const he = extractiveAnswer(await buildRagContext('מזג האוויר מחר', { locale: 'he', external: false }), 'he')
    const en = extractiveAnswer(await buildRagContext('tomorrow weather', { locale: 'en', external: false }), 'en')
    assert.match(he, /לא זיהיתי/)
    assert.match(en, /could not tell which sage/)
  })

  await test('an English or Russian question gets the sage\'s name and summary in that language', async () => {
    const en = extractiveAnswer(await buildRagContext('who was Maimonides?', { locale: 'en', external: false }), 'en')
    assert.match(en, /Maimonides/)
    assert.ok(!/מהפכן כפול/.test(en), 'the Hebrew summary was shown to an English reader')
    const ru = extractiveAnswer(await buildRagContext('Кто такой Маймонид?', { locale: 'ru', external: false }), 'ru')
    assert.match(ru, /Маймонид/)
    assert.ok(!/מהפכן כפול/.test(ru), 'the Hebrew summary was shown to a Russian reader')
  })

  await test('the quote is cut at a sentence end, with no headings or bold', () => {
    const long = '## כותרת\n\n' + 'משפט ראשון **מודגש** כאן. '.repeat(40)
    const q = quoteOf(long, 120)
    assert.ok(q.length <= 130, `too long: ${q.length}`)
    assert.ok(!q.includes('#') && !q.includes('**'))
    assert.ok(q.endsWith('…'))
    assert.equal(quoteOf('קצר'), 'קצר')
  })

  console.log('\nsearch box: question or name')

  await test('questions are recognised in the three languages', () => {
    for (const q of ['מי היה רש״י', 'מה הרעיון של הרמב״ם?', 'who taught Rashi', 'what did the Rambam write', 'Кто такой Раши', 'как учил Маймонид', 'רש״י?', 'Rashi?']) {
      assert.ok(looksLikeQuestion(q), `"${q}" should read as a question`)
    }
  })

  await test('names and fragments are not questions', () => {
    for (const q of ['רש״י', 'הרמב"ם', 'Rabbi Akiva', 'Maimonides', 'мудрецы Прованса', 'מי', 'who is', 'ab', '', '  ']) {
      assert.ok(!looksLikeQuestion(q), `"${q}" should stay a search`)
    }
  })

  console.log('\nsage names in English and Russian')

  const sages = getAllSages()
  const names = (locale: 'en' | 'ru') => localNamesFor(sages, locale)
  const idsFor = (q: string, locale: 'he' | 'en' | 'ru') => extractMentionedSages(q, sages, localNamesFor(sages, locale)).map(m => m.sage.id)

  await test('the overlays supply names for a good part of the roster', () => {
    assert.ok(names('en').size >= 100, `only ${names('en').size} English names`)
    assert.ok(names('ru').size >= 100, `only ${names('ru').size} Russian names`)
  })

  await test('an English question finds the sage by his English name', () => {
    assert.ok(idsFor('who was Maimonides and what did he teach?', 'en').includes('41'), 'Maimonides (41)')
    assert.ok(idsFor('what did Rabbi Akiva ben Yosef teach?', 'en').includes('4'), 'Rabbi Akiva (4)')
    assert.ok(idsFor('tell me about Hillel the Elder', 'en').includes('505'), 'Hillel (505)')
  })

  await test('a Russian question finds the sage, also in a case ending', () => {
    assert.ok(idsFor('Кто такой Маймонид?', 'ru').includes('41'), 'Маймонид (41)')
    assert.ok(idsFor('Что учил Маймонид', 'ru').includes('41'))
    assert.ok(idsFor('Расскажите о Рабби Акиве', 'ru').includes('4'), 'Рабби Акива (4), "о Рабби Акиве"')
  })

  await test('particles and question words are not names', () => {
    assert.deepEqual(idsFor('who was the ben and the bar of the rabbi', 'en'), [])
    assert.deepEqual(idsFor('кто был рабби', 'ru'), [])
  })

  await test('the Hebrew matching is unchanged', async () => {
    assert.ok(idsFor('מי היה רש״י?', 'he').includes('594'))
    assert.ok(idsFor('מה לימד הרמב״ם', 'he').includes('41'))
  })

  console.log(`\n${'='.repeat(50)}\nTests: ${passed} passed, ${failed} failed\n${'='.repeat(50)}`)
  if (failed > 0) process.exit(1)
}

main()
