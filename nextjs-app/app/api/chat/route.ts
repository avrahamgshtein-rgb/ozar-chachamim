import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase-auth/server'
import { createServiceRoleClient } from '@/lib/supabase-auth/serviceRole'
import {
  ANON_SESSION_COOKIE, generateSessionToken, hashSessionToken, getOrCreateAnonymousSession,
} from '@/lib/rag/anonymousSession'
import { buildRagContext, sageIdsFromHistory } from '@/lib/rag/buildContext'
import { buildSystemPrompt } from '@/lib/rag/systemPrompt'
import { callClaude, estimateCost, ClaudeApiError, type ChatMessage } from '@/lib/rag/claude'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export const runtime = 'nodejs'

const MAX_HISTORY_MESSAGES = 10
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days — matches anonymous_sessions.retention_expires_at
const MAX_MESSAGE_LENGTH = 10000  // Maximum message length to prevent abuse
const MIN_MESSAGE_LENGTH = 1

interface ChatRequestBody {
  message: string
  sessionId?: string
  locale?: Locale
}

// Validate that a value is a valid UUID
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// Read-only quota check — lets the chat widget show "X questions left"
// before the visitor sends anything, without creating an anonymous_sessions
// row or touching a reservation.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: periods } = await supabase
      .from('usage_periods')
      .select('question_limit, questions_used, questions_reserved, period_end')
      .eq('user_id', user.id)
    const active = (periods ?? []).filter(p => !p.period_end || new Date(p.period_end) > new Date())
    const limit = active.reduce((sum, p) => sum + p.question_limit, 0)
    const used = active.reduce((sum, p) => sum + p.questions_used + p.questions_reserved, 0)
    return NextResponse.json({ authenticated: true, quota: { limit, remaining: Math.max(limit - used, 0) } })
  }

  const existingToken = request.cookies.get(ANON_SESSION_COOKIE)?.value
  if (existingToken) {
    const serviceClient = createServiceRoleClient()
    const { data: session } = await serviceClient
      .from('anonymous_sessions')
      .select('questions_limit, questions_used, questions_reserved, linked_user_id')
      .eq('session_token_hash', hashSessionToken(existingToken))
      .maybeSingle()
    if (session && !session.linked_user_id) {
      const remaining = Math.max(session.questions_limit - session.questions_used - session.questions_reserved, 0)
      return NextResponse.json({ authenticated: false, quota: { limit: session.questions_limit, remaining } })
    }
  }

  // No cookie yet, or it's already linked to a registered account — either
  // way report the default trial allowance (mirrors anonymous_sessions.
  // questions_limit's DEFAULT 3 in the M1 migration; keep these in sync).
  return NextResponse.json({ authenticated: false, quota: { limit: 3, remaining: 3 } })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Validate request body shape
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 })
  }

  const bodyObj = body as Record<string, unknown>

  // Validate message field
  if (typeof bodyObj.message !== 'string') {
    return NextResponse.json({ error: 'message_required' }, { status: 400 })
  }

  const message = bodyObj.message.trim()
  if (message.length < MIN_MESSAGE_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: 'message_length_invalid', detail: `Must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 }
    )
  }

  // Validate and default locale
  let locale: Locale = 'he'
  if (bodyObj.locale !== undefined) {
    if (typeof bodyObj.locale !== 'string' || !isValidLocale(bodyObj.locale)) {
      return NextResponse.json({ error: 'invalid_locale' }, { status: 400 })
    }
    locale = bodyObj.locale
  }

  // Validate sessionId if explicitly provided (null/undefined means new conversation)
  if (bodyObj.sessionId !== null && bodyObj.sessionId !== undefined) {
    if (typeof bodyObj.sessionId !== 'string' || !isValidUUID(bodyObj.sessionId)) {
      return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 })
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    return user
      ? await handleAuthenticated(supabase, user.id, message, bodyObj.sessionId as string | undefined, locale)
      : await handleAnonymous(request, message, locale)
  } catch (err) {
    // Catches failures before either flow's own reservation/release try-catch
    // takes over (e.g. a missing service-role key, a DB connection error) —
    // without this, such errors bubble up as an empty-body 500 instead of
    // the JSON shape the chat widget expects.
    console.error('[api/chat] unhandled error:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

// ── Authenticated flow — persists full chat history ────────────────────────
async function handleAuthenticated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  message: string,
  bodySessionId: string | undefined,
  locale: Locale,
) {
  const requestId = randomUUID()
  const { data: reservation, error: reserveError } = await supabase
    .rpc('reserve_authenticated_question', { p_request_id: requestId })
    .single()

  if (reserveError || !reservation || !(reservation as any).success) {
    const errorMsg = (reservation as any)?.error_msg ?? reserveError?.message ?? 'reserve_failed'
    const isQuotaExhausted = errorMsg === 'Quota exhausted'
    return NextResponse.json(
      { error: isQuotaExhausted ? 'quota_exhausted' : 'reserve_failed', detail: errorMsg },
      { status: isQuotaExhausted ? 402 : 500 },
    )
  }

  try {
    let sessionId = bodySessionId
    if (sessionId) {
      const { data: existing, error: lookupError } = await supabase
        .from('chat_sessions').select('id').eq('id', sessionId).eq('user_id', userId).maybeSingle()
      if (lookupError) throw new Error(`session_lookup_failed: ${lookupError.message}`)
      if (!existing) sessionId = undefined
    }
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions').insert({ user_id: userId }).select('id').single()
      if (sessionError || !newSession) throw new Error(`session_create_failed: ${sessionError?.message}`)
      sessionId = newSession.id
    }

    // Insert user message
    const { error: userMsgError } = await supabase.from('chat_messages').insert({
      session_id: sessionId, role: 'user', content: message, request_id: requestId,
    })
    if (userMsgError) throw new Error(`user_message_insert_failed: ${userMsgError.message}`)

    // Retrieve history for context
    const { data: historyRows, error: historyError } = await supabase
      .from('chat_messages').select('role, content').eq('session_id', sessionId)
      .order('created_at', { ascending: false }).limit(MAX_HISTORY_MESSAGES)
    if (historyError) throw new Error(`history_retrieval_failed: ${historyError.message}`)

    const history: ChatMessage[] = (historyRows ?? []).reverse()
      .map(r => ({ role: r.role as 'user' | 'assistant', content: r.content }))

    // Call LLM with complete history. Passing the sages named in earlier user
    // turns lets a follow-up like "and his students?" stay on the same subject.
    const ragContext = await buildRagContext(message, {
      locale,
      conversationSageIds: sageIdsFromHistory(history),
    })
    const systemPrompt = buildSystemPrompt(ragContext, locale)
    const response = await callClaude(systemPrompt, history)

    // Insert assistant response
    const { error: assistantMsgError } = await supabase.from('chat_messages').insert({
      session_id: sessionId, role: 'assistant', content: response.text, request_id: requestId,
    })
    if (assistantMsgError) throw new Error(`assistant_message_insert_failed: ${assistantMsgError.message}`)

    // Confirm usage and verify success to ensure quota is properly accounted
    const { data: confirmResult, error: confirmError } = await supabase
      .rpc('confirm_authenticated_question', {
        p_request_id: requestId,
        p_provider: 'anthropic', p_model: response.model,
        p_input_tokens: response.inputTokens, p_output_tokens: response.outputTokens,
        p_estimated_cost: estimateCost(response.inputTokens, response.outputTokens),
      })
      .single()

    if (confirmError || !confirmResult || !(confirmResult as any).success) {
      const errorMsg = String((confirmResult as any)?.error_msg ?? confirmError?.message ?? 'confirm_failed')
      const safeMsg = errorMsg.slice(0, 300)
      console.error('[api/chat] confirm_authenticated_question failed (requestId=%s):', requestId, errorMsg)
      // Attempt to release reservation; does not distinguish between definite rejection and uncertain outcome
      // TODO: verify usage_events UNIQUE(request_id) and transaction semantics to implement proper reconciliation
      const { data: releaseResult, error: releaseError } = await supabase
        .rpc('release_authenticated_question', {
          p_request_id: requestId,
          p_error_code: 'confirm_failed',
          p_error_message: safeMsg,
        })
        .single()
      if (releaseError) {
        console.error('[api/chat] release transport failed (requestId=%s):', requestId, releaseError.message)
      } else if (!releaseResult || !(releaseResult as any).success) {
        const releaseMsg = String((releaseResult as any)?.error_msg ?? 'release_returned_false')
        console.error('[api/chat] release_authenticated_question returned false (requestId=%s):', requestId, releaseMsg)
      }
      return NextResponse.json({ error: 'internal_error', detail: 'Failed to confirm usage' }, { status: 500 })
    }

    return NextResponse.json({
      sessionId,
      reply: response.text,
      matchedSages: ragContext.matchedSages.map(s => ({ id: s.sage.id, label: s.sage.label })),
      citations: ragContext.passages.map(p => ({
        id: p.citationId, sourceKind: p.sourceKind, sageId: p.sageId, sageLabel: p.sageLabel,
        docTitle: p.docTitle, charStart: p.charStart, charEnd: p.charEnd, score: p.score,
      })),
      insufficientEvidence: ragContext.insufficientEvidence,
      ambiguous: ragContext.ambiguous,
      noMatch: ragContext.noMatch,
      quota: null, // authenticated quota isn't surfaced turn-by-turn yet — Stage 4 UI follow-up
    })
  } catch (err) {
    const isClaudeError = err instanceof ClaudeApiError
    // The reservation is released below either way; a timeout is reported
    // distinctly so "provider too slow" is diagnosable from "provider refused".
    const errorCode = isClaudeError
      ? ((err as ClaudeApiError).timedOut ? 'llm_timeout' : 'llm_error')
      : 'internal_error'
    const errorMsg = String(err instanceof Error ? err.message : 'unknown error').slice(0, 300)
    console.error('[api/chat] authenticated flow failed (requestId=%s, code=%s):', requestId, errorCode, err)

    const { data: releaseResult, error: releaseError } = await supabase
      .rpc('release_authenticated_question', {
        p_request_id: requestId,
        p_error_code: errorCode,
        p_error_message: errorMsg,
      })
      .single()

    if (releaseError) {
      console.error('[api/chat] release transport failed on error path (requestId=%s):', requestId, releaseError.message)
    } else if (!releaseResult || !(releaseResult as any).success) {
      const releaseMsg = String((releaseResult as any)?.error_msg ?? 'release_returned_false')
      console.error('[api/chat] release returned false on error path (requestId=%s):', requestId, releaseMsg)
    }

    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

// ── Anonymous flow — stateless single-turn (no chat_sessions row, since
// that table requires a real user_id); quota lives in anonymous_sessions,
// gated behind the service-role client because its RLS is USING (false)
// for every operation from the browser. ─────────────────────────────────
async function handleAnonymous(request: NextRequest, message: string, locale: Locale) {
  const existingToken = request.cookies.get(ANON_SESSION_COOKIE)?.value
  const rawToken = existingToken ?? generateSessionToken()
  const isNewCookie = !existingToken

  const quota = await getOrCreateAnonymousSession(rawToken, {
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  })

  if (!quota) {
    // Either a genuine DB error, or this token already belongs to a
    // registered account (transfer_anonymous_quota linked it) — either way
    // the visitor should sign in rather than keep using this cookie.
    return NextResponse.json({ error: 'session_invalid' }, { status: 401 })
  }

  const serviceClient = createServiceRoleClient()
  const tokenHash = hashSessionToken(rawToken)
  const requestId = randomUUID()

  const { data: reservation, error: reserveError } = await serviceClient
    .rpc('reserve_anonymous_question', { p_session_token_hash: tokenHash, p_request_id: requestId })
    .single()

  if (reserveError || !reservation || !(reservation as any).success) {
    const errorMsg = (reservation as any)?.error_msg ?? reserveError?.message ?? 'reserve_failed'
    const isQuotaExhausted = errorMsg === 'Quota exhausted'
    const res = NextResponse.json(
      {
        error: isQuotaExhausted ? 'quota_exhausted' : 'reserve_failed',
        detail: errorMsg,
        quota: { limit: quota.questionsLimit, remaining: quota.remaining },
      },
      { status: isQuotaExhausted ? 402 : 500 },
    )
    if (isNewCookie) setAnonCookie(res, rawToken)
    return res
  }

  try {
    // No conversation history for anonymous visitors — each message is its
    // own grounded turn. Full history starts once they register.
    const ragContext = await buildRagContext(message, { locale })
    const systemPrompt = buildSystemPrompt(ragContext, locale)
    const response = await callClaude(systemPrompt, [{ role: 'user', content: message }])

    // Confirm usage and verify success to ensure quota is properly accounted
    const { data: confirmResult, error: confirmError } = await serviceClient
      .rpc('confirm_anonymous_question', {
        p_session_token_hash: tokenHash,
        p_request_id: requestId,
        p_provider: 'anthropic', p_model: response.model,
        p_input_tokens: response.inputTokens, p_output_tokens: response.outputTokens,
        p_estimated_cost: estimateCost(response.inputTokens, response.outputTokens),
      })
      .single()

    if (confirmError || !confirmResult || !(confirmResult as any).success) {
      const errorMsg = String((confirmResult as any)?.error_msg ?? confirmError?.message ?? 'confirm_failed')
      const safeMsg = errorMsg.slice(0, 300)
      console.error('[api/chat] confirm_anonymous_question failed (requestId=%s):', requestId, errorMsg)
      // Attempt to release reservation; does not distinguish between definite rejection and uncertain outcome
      // TODO: verify usage_events UNIQUE(request_id) and transaction semantics to implement proper reconciliation
      const { data: releaseResult, error: releaseError } = await serviceClient
        .rpc('release_anonymous_question', {
          p_session_token_hash: tokenHash,
          p_request_id: requestId,
          p_error_code: 'confirm_failed',
          p_error_message: safeMsg,
        })
        .single()
      if (releaseError) {
        console.error('[api/chat] release transport failed (requestId=%s):', requestId, releaseError.message)
      } else if (!releaseResult || !(releaseResult as any).success) {
        const releaseMsg = String((releaseResult as any)?.error_msg ?? 'release_returned_false')
        console.error('[api/chat] release_anonymous_question returned false (requestId=%s):', requestId, releaseMsg)
      }
      const res = NextResponse.json({ error: 'internal_error', detail: 'Failed to confirm usage' }, { status: 500 })
      setAnonCookie(res, rawToken)
      return res
    }

    const res = NextResponse.json({
      sessionId: null,
      reply: response.text,
      matchedSages: ragContext.matchedSages.map(s => ({ id: s.sage.id, label: s.sage.label })),
      citations: ragContext.passages.map(p => ({
        id: p.citationId, sourceKind: p.sourceKind, sageId: p.sageId, sageLabel: p.sageLabel,
        docTitle: p.docTitle, charStart: p.charStart, charEnd: p.charEnd, score: p.score,
      })),
      insufficientEvidence: ragContext.insufficientEvidence,
      ambiguous: ragContext.ambiguous,
      noMatch: ragContext.noMatch,
      quota: { limit: quota.questionsLimit, remaining: reservation ? (reservation as any).remaining_questions : quota.remaining - 1 },
    })
    setAnonCookie(res, rawToken)
    return res
  } catch (err) {
    const isClaudeError = err instanceof ClaudeApiError
    // The reservation is released below either way; a timeout is reported
    // distinctly so "provider too slow" is diagnosable from "provider refused".
    const errorCode = isClaudeError
      ? ((err as ClaudeApiError).timedOut ? 'llm_timeout' : 'llm_error')
      : 'internal_error'
    const errorMsg = String(err instanceof Error ? err.message : 'unknown error').slice(0, 300)
    console.error('[api/chat] anonymous flow failed (requestId=%s, code=%s):', requestId, errorCode, err)

    const { data: releaseResult, error: releaseError } = await serviceClient
      .rpc('release_anonymous_question', {
        p_session_token_hash: tokenHash,
        p_request_id: requestId,
        p_error_code: errorCode,
        p_error_message: errorMsg,
      })
      .single()

    if (releaseError) {
      console.error('[api/chat] release transport failed on error path (requestId=%s):', requestId, releaseError.message)
    } else if (!releaseResult || !(releaseResult as any).success) {
      const releaseMsg = String((releaseResult as any)?.error_msg ?? 'release_returned_false')
      console.error('[api/chat] release returned false on error path (requestId=%s):', requestId, releaseMsg)
    }

    const res = NextResponse.json({ error: 'internal_error' }, { status: 500 })
    setAnonCookie(res, rawToken)
    return res
  }
}

function setAnonCookie(res: NextResponse, rawToken: string) {
  res.cookies.set(ANON_SESSION_COOKIE, rawToken, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: ANON_COOKIE_MAX_AGE, path: '/',
  })
}
