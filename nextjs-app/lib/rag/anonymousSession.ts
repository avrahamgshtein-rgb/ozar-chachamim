// Anonymous chat quota — lets a visitor try the chat before registering,
// per the agent plan's freemium model. anonymous_sessions has zero direct
// client access (RLS is `USING (false)` for every operation), so all of
// this runs server-side with the service-role client; the browser only
// ever holds an opaque random cookie value, never anything that unlocks
// database access on its own.
import { createHash, randomBytes } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase-auth/serviceRole'

export const ANON_SESSION_COOKIE = 'ozar_anon_session'

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export interface AnonymousQuotaStatus {
  sessionId: string
  questionsLimit: number
  questionsUsed: number
  questionsReserved: number
  remaining: number
}

/** Look up (or create) the anonymous_sessions row for a raw cookie token.
 *  Returns null only on a genuine DB error — a brand-new token always
 *  results in a freshly created row. */
export async function getOrCreateAnonymousSession(
  rawToken: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<AnonymousQuotaStatus | null> {
  const supabase = createServiceRoleClient()
  const hash = hashSessionToken(rawToken)

  const { data: existing } = await supabase
    .from('anonymous_sessions')
    .select('id, questions_limit, questions_used, questions_reserved, linked_user_id')
    .eq('session_token_hash', hash)
    .maybeSingle()

  if (existing) {
    if (existing.linked_user_id) return null // already converted to a registered account
    return {
      sessionId: existing.id,
      questionsLimit: existing.questions_limit,
      questionsUsed: existing.questions_used,
      questionsReserved: existing.questions_reserved,
      remaining: existing.questions_limit - existing.questions_used - existing.questions_reserved,
    }
  }

  const { data: created, error } = await supabase
    .from('anonymous_sessions')
    .insert({ session_token_hash: hash, ip_address: meta?.ip, user_agent: meta?.userAgent })
    .select('id, questions_limit, questions_used, questions_reserved')
    .single()

  if (error || !created) {
    console.error('[anonymousSession] failed to create session:', error)
    return null
  }

  return {
    sessionId: created.id,
    questionsLimit: created.questions_limit,
    questionsUsed: created.questions_used,
    questionsReserved: created.questions_reserved,
    remaining: created.questions_limit - created.questions_used - created.questions_reserved,
  }
}
