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
import { buildRagContext } from '../lib/rag/buildContext'
import { buildSystemPrompt } from '../lib/rag/systemPrompt'

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
    // Mirrors exactly what app/api/chat/route.ts serialises.
    const citations = ctx.passages.map(p => ({
      id: p.citationId, sourceKind: p.sourceKind, sageId: p.sageId, sageLabel: p.sageLabel,
      docTitle: p.docTitle, charStart: p.charStart, charEnd: p.charEnd, score: p.score,
    }))
    assert.ok(citations.length > 0, 'payload is non-empty')
    for (const c of citations) {
      assert.equal(typeof c.id, 'string')
      assert.equal(typeof c.docTitle, 'string')
      assert.ok(c.charEnd > c.charStart, 'range is non-empty')
      assert.equal(typeof c.score, 'number')
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
