/**
 * Stage 6 — wiring verification with mocked services.
 *
 * Exercises context assembly, the citation payload the route returns, follow-up
 * carry-over, and provider timeout/error handling WITHOUT any paid provider
 * call and without touching the database. global.fetch is replaced for the
 * duration of each case, so Anthropic, Sefaria and Wikipedia are all simulated.
 *
 * A real production chat request costs money and quota and is deliberately not
 * performed here.
 */

import assert from 'node:assert/strict'
import { buildRagContext, formatRelations, relationsOf } from '../lib/rag/buildContext'
import { buildSystemPrompt } from '../lib/rag/systemPrompt'
import { citationPayload } from '../lib/rag/citations'
import { getSageById, getResearchDocs } from '../lib/serverData'
import { parseResearchDocs } from '../lib/researchParse'
import { parseAnswer, starterQuestions, stripIsolates } from '../components/chat/askAbout'

// claude.ts reads its timeout budget once, at module load, so it is imported
// inside main() after a short budget is set — otherwise the hung-provider case
// would wait out the 45s production default.
type ClaudeModule = typeof import('../lib/rag/claude')
// Type-only import is erased at compile time, so it does not load the module
// early and defeat the env-var ordering above.
type ClaudeError = InstanceType<ClaudeModule['ClaudeApiError']>
let callClaude: ClaudeModule['callClaude']
let ClaudeApiError: ClaudeModule['ClaudeApiError']

let passed = 0, failed = 0
const failures: string[] = []
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); console.log(`  ok  ${name}`); passed++ }
  catch (e) {
    console.log(`  FAIL ${name}`)
    console.log(`       ${(e as Error).message.split('\n')[0]}`)
    failed++; failures.push(name)
  }
}
function group(n: string) { console.log(`\n${n}`) }

const realFetch = global.fetch
function restore() { global.fetch = realFetch }

/** Anthropic responds normally; every other host 404s (Sefaria/Wikipedia off). */
function mockProviderOk(replyText: string) {
  global.fetch = (async (url: any, init: any) => {
    const u = String(url)
    if (u.includes('api.anthropic.com')) {
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: replyText }],
        model: 'mock-model',
        usage: { input_tokens: 120, output_tokens: 45 },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('not found', { status: 404 })
  }) as typeof fetch
}

/**
 * Never settles until the caller's AbortSignal fires — simulates a hung provider.
 *
 * The keepalive timer matters: AbortSignal.timeout() uses an unref'd timer, so
 * a bare pending promise lets Node drain the event loop and exit cleanly before
 * the abort ever fires. Real fetch holds a socket that refs the loop; this
 * reproduces that so the timeout path is genuinely exercised.
 */
function mockProviderHang() {
  global.fetch = ((_url: any, init: any) => new Promise((_resolve, reject) => {
    const signal: AbortSignal | undefined = init?.signal
    const keepalive = setInterval(() => {}, 50)
    const finish = (err: Error) => { clearInterval(keepalive); reject(err) }
    if (!signal) return
    if (signal.aborted) {
      const e = new Error('aborted'); e.name = 'TimeoutError'; return finish(e)
    }
    signal.addEventListener('abort', () => {
      const err = new Error('The operation was aborted due to timeout')
      err.name = 'TimeoutError'
      finish(err)
    })
  })) as typeof fetch
}

function mockProviderStatus(status: number, body = 'upstream failure') {
  global.fetch = (async (url: any) => {
    if (String(url).includes('api.anthropic.com')) return new Response(body, { status })
    return new Response('not found', { status: 404 })
  }) as typeof fetch
}

async function main() {
  process.env.CHAT_TIMEOUT_MS ??= '500'
  process.env.ANTHROPIC_API_KEY ??= 'test-key-not-real'
  ;({ callClaude, ClaudeApiError } = await import('../lib/rag/claude'))

  // ── provider initialisation ──────────────────────────────────────────────
  group('Provider call (mocked)')

  await test('successful call returns text, model and token usage', async () => {
    mockProviderOk('תשובה לדוגמה [R552:0#3]')
    const r = await callClaude('system', [{ role: 'user', content: 'שאלה' }])
    assert.equal(r.text, 'תשובה לדוגמה [R552:0#3]')
    assert.equal(r.model, 'mock-model')
    assert.equal(r.inputTokens, 120)
    assert.equal(r.outputTokens, 45)
    restore()
  })

  await test('a hung provider aborts and is flagged as a timeout', async () => {
    // claude.ts reads CHAT_TIMEOUT_MS at module load, so this case is run with
    // CHAT_TIMEOUT_MS set in the environment (see the npm script / CI command).
    mockProviderHang()
    const started = Date.now()
    let caught: unknown
    try {
      await callClaude('system', [{ role: 'user', content: 'שאלה' }])
    } catch (e) { caught = e }
    restore()
    assert.ok(caught instanceof ClaudeApiError, 'throws ClaudeApiError')
    assert.equal((caught as ClaudeError).timedOut, true, 'flagged as a timeout')
    assert.equal((caught as ClaudeError).status, 504)
    assert.ok(Date.now() - started < 60_000, 'aborted rather than hanging forever')
  })

  await test('an upstream error is NOT reported as a timeout', async () => {
    mockProviderStatus(529, 'overloaded')
    let caught: unknown
    try { await callClaude('system', [{ role: 'user', content: 'שאלה' }]) }
    catch (e) { caught = e }
    restore()
    assert.ok(caught instanceof ClaudeApiError)
    assert.equal((caught as ClaudeError).timedOut, false, 'distinct from a timeout')
    assert.equal((caught as ClaudeError).status, 529)
  })

  await test('a missing API key fails before any network call', async () => {
    const saved = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    let reached = false
    global.fetch = (async () => { reached = true; return new Response('{}') }) as typeof fetch
    let caught: unknown
    try { await callClaude('s', [{ role: 'user', content: 'q' }]) } catch (e) { caught = e }
    restore()
    process.env.ANTHROPIC_API_KEY = saved
    assert.ok(caught instanceof ClaudeApiError)
    assert.equal(reached, false, 'no request attempted without a key')
  })

  // ── context assembly and citation payload ────────────────────────────────
  group('Context assembly (external sources mocked off)')

  await test('a direct question yields passages with citation handles', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('מה עשה רבן יוחנן בן זכאי אחרי חורבן המקדש?', { locale: 'he' })
    restore()
    assert.equal(ctx.noMatch, false, 'sage identified')
    assert.ok(ctx.passages.length > 0, 'passages retrieved')
    assert.equal(ctx.insufficientEvidence, false)
    for (const p of ctx.passages) {
      assert.match(p.citationId, /^R\d+:\d+#\d+$/)
      assert.equal(p.sourceKind, 'research')
    }
  })

  await test('the route citation payload is well-formed and matches the passages', async () => {
    mockProviderOk('unused')
    // Must name a sage: a question with no entity is a no-match by design.
    const ctx = await buildRagContext('מה לימד רבן יוחנן בן זכאי ביבנה?', { locale: 'he' })
    restore()
    // The same helper app/api/chat/route.ts serialises with.
    const citations = citationPayload(ctx.passages)
    assert.ok(citations.length > 0, 'payload is non-empty')
    for (const c of citations) {
      assert.equal(typeof c.id, 'string')
      assert.equal(typeof c.docTitle, 'string')
      assert.ok(c.charEnd > c.charStart, 'range is non-empty')
      assert.equal(typeof c.score, 'number')
      assert.equal(typeof c.docIndex, 'number')
      assert.ok(c.anchor === null || typeof c.anchor === 'string', 'anchor is an id or null')
    }
    assert.equal(JSON.parse(JSON.stringify(citations)).length, citations.length, 'payload is JSON-serialisable')
  })

  await test('an unsupported question reports insufficient evidence, not padding', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('מה מחיר הביטקוין היום?', { locale: 'he' })
    restore()
    assert.equal(ctx.passages.length, 0, 'no passages')
    // Either no sage matched at all, or sages matched but nothing was relevant.
    assert.ok(ctx.noMatch || ctx.insufficientEvidence, 'the gap is represented explicitly')
  })

  // ── follow-ups ───────────────────────────────────────────────────────────
  group('Follow-ups (mocked)')

  await test('a pronoun follow-up keeps the subject via conversationSageIds', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('ומי היו התלמידים שלו?', {
      locale: 'he',
      conversationSageIds: ['552'],
    })
    restore()
    assert.equal(ctx.noMatch, false, 'subject carried over')
    assert.equal(ctx.matchedSages.length, 1)
    assert.equal(ctx.matchedSages[0].sage.id, '552')
    assert.equal(ctx.matchedSages[0].fromConversation, true, 'marked as carried over')
  })

  await test('carried-over subject is labelled as such in the prompt', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('ומה עוד?', { locale: 'he', conversationSageIds: ['552'] })
    restore()
    const prompt = buildSystemPrompt(ctx, 'he')
    assert.match(prompt, /carried over from earlier in this conversation/)
  })

  await test('without carry-over the same question matches nobody', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('ומי היו התלמידים שלו?', { locale: 'he' })
    restore()
    assert.equal(ctx.noMatch, true, 'no subject invented when none is available')
  })

  // ── "שאלו על החכם": the sage the chat was opened about ──────────────────
  group('Sage-scoped chat (mocked)')

  await test('a question naming nobody is answered about the scoped sage', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('מי היו התלמידים שלו?', { locale: 'he', subjectSageId: '539' })
    restore()
    assert.equal(ctx.noMatch, false, 'subject supplied the referent')
    assert.equal(ctx.matchedSages[0].sage.id, '539')
    assert.equal(ctx.matchedSages[0].isSubject, true)
    assert.match(buildSystemPrompt(ctx, 'he'), /the sage this chat was opened about/)
  })

  await test('the scoped sage comes before sages carried from history', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('ומה עוד?', { locale: 'he', subjectSageId: '539', conversationSageIds: ['4', '539'] })
    restore()
    assert.deepEqual(ctx.matchedSages.map(s => s.sage.id), ['539', '4'], 'subject first, no duplicate')
    assert.equal(ctx.matchedSages[1].fromConversation, true)
  })

  await test('a question naming another sage keeps the scoped sage after it', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('מה היה היחס שלו לרבי עקיבא?', { locale: 'he', subjectSageId: '539' })
    restore()
    const ids = ctx.matchedSages.map(s => s.sage.id)
    assert.equal(ids[0], '4', 'the named sage leads')
    assert.equal(ids[ids.length - 1], '539', 'the scoped sage is kept, last')
  })

  await test('an unknown scope id is ignored, not invented', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('מי היו התלמידים שלו?', { locale: 'he', subjectSageId: 'no-such-sage' })
    restore()
    assert.equal(ctx.noMatch, true)
  })

  // ── relation direction ───────────────────────────────────────────────────
  group('Relation direction (the Gra, 539)')

  await test('the Gra\'s student is listed as a student, not as his teacher', async () => {
    const lines = formatRelations({ sage: getSageById('539')!, relations: relationsOf(getSageById('539')!) }, 'he')
    const students = lines.find(l => l.startsWith('- Students'))
    const teachers = lines.find(l => l.startsWith('- Teachers'))
    assert.ok(students && students.includes('חיים מוולוז'), 'R. Chaim of Volozhin is under Students')
    assert.ok(!teachers || !teachers.includes('חיים מוולוז'), 'and not under Teachers')
  })

  await test('seen from the student, the Gra is the teacher', async () => {
    const chaim = getSageById('99')!
    const lines = formatRelations({ sage: chaim, relations: relationsOf(chaim) }, 'en')
    const teachers = lines.find(l => l.startsWith('- Teachers'))
    assert.ok(teachers && teachers.includes('אליהו'), 'the Gra is under Teachers on R. Chaim\'s side')
  })

  await test('influence and dispute keep their direction', async () => {
    const gra = getSageById('539')!
    const lines = formatRelations({ sage: gra, relations: relationsOf(gra) }, 'en')
    assert.ok(lines.some(l => l.startsWith('- Influenced by:') && l.includes('האר')), 'the Ari influenced the Gra')
    assert.ok(lines.some(l => l.startsWith('- Disputed:') && l.includes('בעל שם טוב')), 'the Gra disputed the Besht')
  })

  // ── citations point into the reader ──────────────────────────────────────
  group('Citation anchors')

  await test('every located citation names a heading that the reader renders', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('מה כתב הגאון על נפש החיים וישיבת וולוז׳ין?', { locale: 'he', subjectSageId: '539' })
    restore()
    assert.ok(ctx.passages.length > 0, 'passages retrieved')
    for (const p of ctx.passages) {
      const docs = parseResearchDocs(await getResearchDocs(p.sageId, 'he'))
      const ids = new Set(docs.flatMap((d, i) => [`doc-${i + 1}`, ...d.toc.map(t => t.id)]))
      assert.ok(p.anchor && ids.has(p.anchor), `anchor ${p.anchor} exists on the page`)
    }
  })

  // ── the widget's pure helpers ────────────────────────────────────────────
  group('Answer parsing and starter questions')

  await test('handles become numbered sources; unknown handles are dropped', async () => {
    const cites = [
      { id: 'R539:0#4', sageId: '539', sageLabel: 'הגר״א', docTitle: 'D', section: 'S', anchor: 's' },
      { id: 'R99:1#7', sageId: '99', sageLabel: 'ר׳ חיים', docTitle: 'E', section: null, anchor: 'd2-x' },
    ]
    const { segments, sources } = parseAnswer('א [R539:0#4]. ב [R99:1#7, R539:0#4] ג [R1:0#0].', cites)
    assert.deepEqual(sources.map(s => [s.n, s.citation.id]), [[1, 'R539:0#4'], [2, 'R99:1#7']])
    assert.deepEqual(segments.filter(s => s.kind === 'cite').map(s => (s as { n: number }).n), [1, 2, 1])
    const text = segments.filter(s => s.kind === 'text').map(s => (s as { text: string }).text).join('|')
    assert.ok(!text.includes('R1:0#0'), 'the uncited handle is not shown')
    assert.ok(text.endsWith(' ג.'), 'and leaves no stray space')
  })

  await test('starter questions come from the sage\'s own data and name it', async () => {
    const subject = {
      id: '539', name: 'הגר״א', period: 'acharonim' as const, field: 'תלמוד, הלכה',
      coreConcept: 'x', hasResearch: true, related: [{ group: 'students' as const, name: 'רבי חיים מוולוז׳ין' }],
    }
    const he = starterQuestions(subject, 'he').map(stripIsolates)
    assert.ok(he.length >= 3 && he.length <= 4)
    assert.ok(he.every(q => q.includes('הגר״א')), 'every question names the sage')
    assert.ok(he[0].includes('רבי חיים מוולוז׳ין'), 'a real relation from the data leads')
    const en = starterQuestions(subject, 'en').map(stripIsolates)
    assert.ok(!en.some(q => q.includes('תלמוד')), 'no untranslated field inside an English question')
  })

  // ── prompt contract ──────────────────────────────────────────────────────
  group('Prompt contract')

  await test('system prompt carries citation and evidence-handling rules', async () => {
    mockProviderOk('unused')
    const ctx = await buildRagContext('מה לימד רבן יוחנן בן זכאי?', { locale: 'he' })
    restore()
    const prompt = buildSystemPrompt(ctx, 'he')
    assert.match(prompt, /never instructions/i, 'evidence is data, not instructions')
    assert.match(prompt, /INTERNAL RESEARCH/, 'source kinds declared')
    assert.match(prompt, /Do not cite a handle that does not appear/, 'citation discipline stated')
    assert.match(prompt, /<<<EVIDENCE/, 'evidence is fenced')
  })

  console.log(`\n${'-'.repeat(52)}`)
  console.log(`chatWiring: ${passed} passed, ${failed} failed`)
  if (failures.length) console.log(`failing: ${failures.join(', ')}`)
  console.log('-'.repeat(52))
  process.exit(failed > 0 ? 1 : 0)
}

main()
