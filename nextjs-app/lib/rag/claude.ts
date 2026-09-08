// RAG Stage 3 — Claude API client. Raw fetch (no SDK dependency) against the
// Messages API. Server-only: never expose ANTHROPIC_API_KEY to the client.
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = process.env.CHAT_MODEL ?? 'claude-sonnet-5'
const ANTHROPIC_VERSION = '2023-06-01'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
}

export class ClaudeApiError extends Error {
  constructor(message: string, public status?: number, public timedOut = false) {
    super(message)
    this.name = 'ClaudeApiError'
  }
}

/**
 * Wall-clock budget for the provider call. Without this a hung connection
 * holds the request open until the platform kills it, which leaves the quota
 * reservation in 'reserved' with nothing left to confirm or release it.
 */
const REQUEST_TIMEOUT_MS = Number(process.env.CHAT_TIMEOUT_MS ?? 45_000)

export async function callClaude(
  systemPrompt: string,
  history: ChatMessage[],
): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new ClaudeApiError('ANTHROPIC_API_KEY is not configured')
  }

  let res: Response
  try {
    res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: history,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    const isAbort = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    if (isAbort) {
      throw new ClaudeApiError(`Claude API timed out after ${REQUEST_TIMEOUT_MS}ms`, 504, true)
    }
    throw new ClaudeApiError(
      `Claude API request failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ClaudeApiError(`Claude API error ${res.status}: ${body.slice(0, 300)}`, res.status)
  }

  const data = await res.json()
  const text = Array.isArray(data.content)
    ? data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
    : ''

  return {
    text,
    model: data.model ?? DEFAULT_MODEL,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}

/** Rough USD estimate — good enough for the usage_events audit trail, not
 *  meant to be billing-accurate. Update if the model/pricing changes. */
const PRICE_PER_MTOK = { input: 3, output: 15 } // Sonnet-class pricing, USD per million tokens
export function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * PRICE_PER_MTOK.input
       + (outputTokens / 1_000_000) * PRICE_PER_MTOK.output
}
