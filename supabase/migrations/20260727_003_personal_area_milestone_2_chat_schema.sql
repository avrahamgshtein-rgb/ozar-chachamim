-- ============================================================================
-- SUPABASE MIGRATION: Personal Area Milestone 2, Stage 1 — Chat Schema Only
-- ============================================================================
--
-- Scope: DATABASE SCHEMA ONLY. No API routes, no LLM integration, no
-- payment/paywall wiring — those are later stages of Milestone 2 and are
-- explicitly out of scope for this migration.
--
-- Quota tracking is intentionally NOT duplicated here: Milestone 1 already
-- built a provider/model-agnostic quota system (usage_periods,
-- usage_reservations, usage_events with provider/model/token/cost columns)
-- via reserve_authenticated_question / confirm_authenticated_question /
-- release_authenticated_question. The future chat API should call those
-- existing RPCs around each LLM request rather than introduce a second,
-- parallel "user_quotas" table.
--
-- Status: PROPOSAL ONLY (not applied remotely)
-- ============================================================================

-- ============================================================================
-- PART 1: CHAT_SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Set by the client/API once the first exchange completes; NULL until then
  title TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,

  CONSTRAINT title_not_blank CHECK (title IS NULL OR length(btrim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
  ON public.chat_sessions(user_id, updated_at DESC);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_chat_sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_chat_sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the title may change from the client; timestamps are server-managed
-- (updated_at via trigger below, last_message_at via the message trigger).
CREATE POLICY "users_update_own_chat_session_title"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_chat_sessions"
  ON public.chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 2: CHAT_MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,

  role TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Correlates this message to a Milestone-1 usage_reservations/usage_events
  -- row once the (future) chat API wires up quota + cost tracking. Nullable
  -- because user-role messages never consume quota themselves.
  request_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system')),
  CONSTRAINT content_not_blank CHECK (length(btrim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session
  ON public.chat_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_request_id
  ON public.chat_messages(request_id);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Ownership is via the parent session, not a denormalized user_id column.
CREATE POLICY "users_read_own_chat_messages"
  ON public.chat_messages FOR SELECT
  USING (
    session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "users_insert_own_chat_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid())
  );

-- Messages are append-only history — no UPDATE policy (none granted below),
-- no DELETE policy; removing a conversation happens by deleting the parent
-- chat_sessions row (ON DELETE CASCADE removes its messages).

-- ============================================================================
-- PART 3: BOOKKEEPING TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.touch_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.touch_chat_session_on_message() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_chat_message_insert ON public.chat_messages;
CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_chat_session_on_message();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_chat_session_update ON public.chat_sessions;
CREATE TRIGGER on_chat_session_update
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- PART 4: ROLE PRIVILEGES
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON public.chat_sessions TO authenticated;
GRANT UPDATE (title) ON public.chat_sessions TO authenticated;

GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

REVOKE ALL ON public.chat_sessions FROM anon;
REVOKE ALL ON public.chat_messages FROM anon;

GRANT ALL ON public.chat_sessions TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- This is a PROPOSAL and has not been applied to the remote database.
-- Deliberately out of scope (future Milestone 2 stages):
--   - API route(s) to create sessions/messages and call the LLM
--   - Entity extraction / RAG retrieval against Supabase + Sefaria + Wikipedia
--   - Streaming chat UI
--   - Paywall enforcement + Stripe/PayPal webhook
