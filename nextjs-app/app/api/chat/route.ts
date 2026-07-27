import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase-auth/server'
import { buildRagContext } from '@/lib/rag/buildContext'
import { buildSystemPrompt } from '@/lib/rag/systemPrompt'
import { callClaude, estimateCost, ClaudeApiError, type ChatMessage } from '@/lib/rag/claude'
import type { Locale } from '@/lib/types'

export const runtime = 'nodejs'

const MAX_HISTORY_MESSAGES = 10

interface ChatRequestBody {
  message: string
  sessionId?: string
  locale?: Locale
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: ChatRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 })
  }
  const locale: Locale = body.locale ?? 'he'

  // ── Quota: reserve before doing any expensive work ──────────────────────
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
    // ── Session: reuse if provided (and owned by this user), else create ──
    let sessionId = body.sessionId
    if (sessionId) {
      const { data: existing } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!existing) sessionId = undefined
    }
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id })
        .select('id')
        .single()
      if (sessionError || !newSession) throw new Error(`session_create_failed: ${sessionError?.message}`)
      sessionId = newSession.id
    }

    // ── Save the user's message ─────────────────────────────────────────
    await supabase.from('chat_messages').insert({
      session_id: sessionId, role: 'user', content: message, request_id: requestId,
    })

    // ── Recent history for conversational context ───────────────────────
    const { data: historyRows } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_MESSAGES)
    const history: ChatMessage[] = (historyRows ?? [])
      .reverse()
      .map(r => ({ role: r.role as 'user' | 'assistant', content: r.content }))

    // ── RAG: gather grounded context, build the system prompt ──────────
    const ragContext = await buildRagContext(message, locale)
    const systemPrompt = buildSystemPrompt(ragContext, locale)

    // ── Call the LLM ─────────────────────────────────────────────────────
    const response = await callClaude(systemPrompt, history)

    // ── Save the assistant's reply ──────────────────────────────────────
    await supabase.from('chat_messages').insert({
      session_id: sessionId, role: 'assistant', content: response.text, request_id: requestId,
    })

    // ── Confirm quota usage (moves reserved → used, logs cost) ──────────
    await supabase.rpc('confirm_authenticated_question', {
      p_request_id: requestId,
      p_provider: 'anthropic',
      p_model: response.model,
      p_input_tokens: response.inputTokens,
      p_output_tokens: response.outputTokens,
      p_estimated_cost: estimateCost(response.inputTokens, response.outputTokens),
    })

    return NextResponse.json({
      sessionId,
      reply: response.text,
      matchedSages: ragContext.matchedSages.map(s => ({ id: s.sage.id, label: s.sage.label })),
      noMatch: ragContext.noMatch,
    })
  } catch (err) {
    // Anything failed after the reservation — release the quota hold so
    // the user isn't charged for a question they never got an answer to.
    const isClaudeError = err instanceof ClaudeApiError
    await supabase.rpc('release_authenticated_question', {
      p_request_id: requestId,
      p_error_code: isClaudeError ? 'llm_error' : 'internal_error',
      p_error_message: err instanceof Error ? err.message.slice(0, 300) : 'unknown error',
    })
    console.error('[api/chat] failed:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
