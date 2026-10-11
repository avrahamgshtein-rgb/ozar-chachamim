/**
 * The automatic answer and the search box's "ask the assistant":
 *  - referralAnswer says who the sage is in a sentence and sends the reader on (page, research,
 *    episode, video, writings, relatives); it quotes nothing and never calls itself a stand-in;
 *  - looksLikeQuestion decides when the search box offers the assistant first;
 *  - the sage matcher finds a sage by his English or Russian name, not only the Hebrew one.
 * Imports the real production modules; no network, no provider.
 */
import assert from 'node:assert/strict'
import { buildRagContext, localNamesFor } from '../lib/rag/buildContext'
import { extractMentionedSages } from '../lib/rag/entityExtraction'
import { quoteOf, referralAnswer } from '../lib/rag/referralAnswer'
import { citationPayload } from '../lib/rag/citations'
import { getAllSages } from '../lib/serverData'
import { getSefaria } from '../lib/sefaria'
import { wikiLinks } from '../lib/wikipedia'
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

const ask = (q: string, locale: 'he' | 'en' | 'ru') => buildRagContext(q, { locale, external: false })

async function main() {
  console.log('\nautomatic answer: a referral')

  await test('a question about a sage names him, says who he is in a sentence and cites one research passage', async () => {
    const ctx = await ask('מי היה רש״י ומה הרעיון המרכזי שלו?', 'he')
    const { text } = referralAnswer(ctx, 'he')
    assert.match(text, /^\*\*רש"י/, 'the answer starts with the sage’s name')
    assert.ok(text.length < 400, `not minimal: ${text.length} characters`)
    // the handle is one of the route's citations, so the widget can number and link it
    const parsed = parseAnswer(text, citationPayload(ctx.passages))
    assert.equal(parsed.sources.length, 1, 'exactly one source')
    assert.equal(parsed.sources[0].citation.sageId, '594')
  })

  await test('it quotes nothing and does not call itself a stand-in', async () => {
    for (const [q, locale] of [['מי היה רש״י?', 'he'], ['who was Maimonides?', 'en'], ['Кто такой Маймонид?', 'ru']] as const) {
      const { text } = referralAnswer(await ask(q, locale), locale)
      assert.ok(!/—\s*[«"“]/.test(text), `the summary is wrapped as a quote: ${text}`)
      assert.ok(!/אוטומטי|לא זמין|automatic|unavailable|not available|автоматическ|недоступ/i.test(text), `apologises: ${text}`)
      assert.ok(!/\[cite:/i.test(text) && !/^#/m.test(text), 'markup leaked')
    }
  })

  await test('the links lead to the sections the sage page really has', async () => {
    const he = referralAnswer(await ask('מי היה רש״י?', 'he'), 'he').links
    const byKind = (links: typeof he, kind: string) => links.filter(l => l.kind === kind)
    assert.deepEqual(byKind(he, 'page').map(l => l.href), ['/he/sage/594'])
    assert.deepEqual(byKind(he, 'research').map(l => l.href), ['/he/sage/594#research'])
    assert.equal(byKind(he, 'listen').length, 0, 'Rashi has no episode, so no chip for one')
    assert.ok(byKind(he, 'related').length >= 1 && byKind(he, 'related').every(l => /^\/he\/sage\/\d+$/.test(l.href)), 'relatives link to their pages')
    // the Rambam has an episode, and a Sefaria or Wikisource page decides the writings chip
    const rambam = referralAnswer(await ask('מי היה הרמב״ם?', 'he'), 'he').links
    assert.deepEqual(byKind(rambam, 'listen').map(l => l.href), ['/he/sage/41#listen'])
    const hasWritings = !!getSefaria('41') || !!wikiLinks('41', getSefaria('41')).wikisource
    assert.equal(byKind(rambam, 'writings').length, hasWritings ? 1 : 0)
    // the video chip follows the page’s language: the Maharal (72) has English and Russian videos, none in Hebrew
    assert.equal(byKind(referralAnswer(await ask('מי היה המהר״ל?', 'he'), 'he').links, 'video').length, 0)
    const en = referralAnswer(await ask('who was the Maharal?', 'en'), 'en').links
    assert.ok(en.some(l => l.kind === 'video' && l.href === '/en/sage/72#video'), 'English page has the video chip')
    assert.ok(en.every(l => l.href.startsWith('/en/')), 'links stay in the question’s language')
  })

  await test('a sage added from the owner’s Drive is answered like any other', async () => {
    const { text, links } = referralAnswer(await ask('מי הייתה אימא שלום?', 'he'), 'he')
    assert.match(text, /^\*\*אימא שלום/)
    assert.ok(links.some(l => l.kind === 'research' && l.href === '/he/sage/624#research'))
    assert.ok(links.some(l => l.kind === 'listen' && l.href === '/he/sage/624#listen'))
    assert.ok(links.some(l => l.kind === 'related' && l.href === '/he/sage/591'), 'her brother, Rabban Gamliel')
  })

  await test('a question naming nobody says so and sends no one anywhere, in the question’s language', async () => {
    const he = referralAnswer(await ask('מזג האוויר מחר', 'he'), 'he')
    const en = referralAnswer(await ask('tomorrow weather', 'en'), 'en')
    assert.match(he.text, /לא זיהיתי/)
    assert.match(en.text, /could not tell which sage/)
    assert.deepEqual(he.links, [])
  })

  await test('an English or Russian question gets the sage’s name and summary in that language', async () => {
    const en = referralAnswer(await ask('who was Maimonides?', 'en'), 'en').text
    assert.match(en, /Maimonides/)
    assert.ok(!/מהפכן כפול/.test(en), 'the Hebrew summary was shown to an English reader')
    const ru = referralAnswer(await ask('Кто такой Маймонид?', 'ru'), 'ru').text
    assert.match(ru, /Маймонид/)
    assert.ok(!/מהפכן כפול/.test(ru), 'the Hebrew summary was shown to a Russian reader')
  })

  await test('a pair question names both sages and links both pages', async () => {
    const { text, links } = referralAnswer(await ask('מה הקשר בין רש״י והרמב״ם?', 'he'), 'he')
    assert.match(text, /רש"י/)
    assert.match(text, /הרמב"ם/)
    const pages = links.filter(l => l.kind === 'page').map(l => l.href)
    assert.ok(pages.includes('/he/sage/594') && pages.includes('/he/sage/41'), pages.join(' '))
  })

  await test('the summary is cut at a sentence end, with no headings or bold', () => {
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
