-- ============================================================================
-- SUPABASE MIGRATION: Personal Area Milestone 1 (SECURITY REVISED)
-- Database Schema for User Authentication & Quota Management
-- ============================================================================
--
-- Security Audit Completion (v2.0):
-- - Separated authenticated vs anonymous functions
-- - Trigger-based profile creation (not client INSERT)
-- - Idempotency via usage_reservations table
-- - Reduced user_profiles columns (data minimization)
-- - Complete function security definitions
-- - Explicit role privileges and REVOKE statements
--
-- Status: PROPOSAL ONLY (not applied remotely)
-- ============================================================================

-- ============================================================================
-- PART 1: PROFILE CREATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create profile when user signs up
  -- Trigger has SECURITY DEFINER, so runs with postgres privileges
  INSERT INTO public.user_profiles (
    id,
    email_verified,
    language,
    theme,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email_confirmed_at IS NOT NULL,
    'he',  -- Default: Hebrew
    'light',  -- Default: Light theme
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke public execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 2: USER_PROFILES TABLE (MINIMAL, NO NEW COLUMNS)
-- ============================================================================

-- Existing table schema (v3 baseline):
-- CREATE TABLE public.user_profiles (
--   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--   display_name TEXT,
--   email_verified BOOLEAN DEFAULT FALSE,
--   language TEXT DEFAULT 'he',
--   theme TEXT DEFAULT 'light',
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- NO COLUMNS ADDED (data minimization for MVP)
-- Future columns (deferred to Milestone 2+):
--   email_verified_at, language_support, ui_notifications, first_login_at, last_activity_at

-- Update RLS policies for user_profiles

-- Drop old policy
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.user_profiles;

-- Prevent browser INSERT (trigger handles creation)
CREATE POLICY "users_cannot_insert_own_profile" ON public.user_profiles
  FOR INSERT WITH CHECK (false);

-- Allow SELECT own profile
CREATE POLICY "users_read_own_profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow UPDATE only approved fields (display_name, language, theme)
CREATE POLICY "users_update_own_profile_limited" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Prevent DELETE (only via cascade from auth.users)
CREATE POLICY "prevent_user_delete_own_profile" ON public.user_profiles
  FOR DELETE USING (false);

-- ============================================================================
-- PART 3: ANONYMOUS_SESSIONS TABLE (ENHANCED WITH LIFECYCLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session token hash (raw token NEVER stored)
  -- Computed server-side: hash = SHA256(raw_token)
  session_token_hash TEXT UNIQUE NOT NULL,

  -- Quota tracking
  questions_limit INT DEFAULT 3,
  questions_used INT DEFAULT 0,
  questions_reserved INT DEFAULT 0,

  -- Linkage to registered account (when user registers)
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Session lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  retention_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Privacy & abuse detection (optional, can be removed in production)
  ip_address INET,
  user_agent TEXT,

  -- Constraints
  CONSTRAINT valid_quota CHECK (
    questions_used >= 0 AND
    questions_used <= questions_limit AND
    questions_reserved >= 0 AND
    questions_reserved + questions_used <= questions_limit
  )
);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_token_hash
  ON public.anonymous_sessions(session_token_hash);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_linked_user
  ON public.anonymous_sessions(linked_user_id);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_expired
  ON public.anonymous_sessions(retention_expires_at)
  WHERE linked_user_id IS NULL;  -- Index unlinked sessions for cleanup

-- RLS: No direct browser access (server-only via API)
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anonymous_sessions_no_select"
  ON public.anonymous_sessions FOR SELECT USING (false);

CREATE POLICY "anonymous_sessions_no_insert"
  ON public.anonymous_sessions FOR INSERT WITH CHECK (false);

CREATE POLICY "anonymous_sessions_no_update"
  ON public.anonymous_sessions FOR UPDATE USING (false);

CREATE POLICY "anonymous_sessions_no_delete"
  ON public.anonymous_sessions FOR DELETE USING (false);

-- ============================================================================
-- PART 4: USAGE_PERIODS TABLE (QUOTA PER BILLING PERIOD)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Period metadata
  source_type TEXT NOT NULL,

  -- Time range
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ,

  -- Quota
  question_limit INT NOT NULL,
  questions_used INT DEFAULT 0,
  questions_reserved INT DEFAULT 0,

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_source_type CHECK (source_type IN (
    'trial_anonymous', 'trial_registered', 'monthly_subscription', 'annual_subscription'
  )),
  CONSTRAINT valid_dates CHECK (period_end IS NULL OR period_end > period_start),
  CONSTRAINT valid_quota CHECK (
    questions_used >= 0 AND
    questions_reserved >= 0 AND
    questions_used + questions_reserved <= question_limit
  )
);

CREATE INDEX IF NOT EXISTS idx_usage_periods_user
  ON public.usage_periods(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_periods_active
  ON public.usage_periods(user_id, period_end DESC)
  WHERE period_end IS NULL OR period_end > NOW();

CREATE INDEX IF NOT EXISTS idx_usage_periods_source
  ON public.usage_periods(source_type);

-- Database-level uniqueness constraint for trial_registered
-- Ensures at most one registered trial per user
CREATE UNIQUE INDEX idx_trial_registered_once_per_user
  ON public.usage_periods (user_id)
  WHERE source_type = 'trial_registered';

-- RLS: Users can read, but not modify
ALTER TABLE public.usage_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_usage_periods"
  ON public.usage_periods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_cannot_insert_usage_periods"
  ON public.usage_periods FOR INSERT
  WITH CHECK (false);

CREATE POLICY "users_cannot_update_usage_periods"
  ON public.usage_periods FOR UPDATE
  USING (false);

CREATE POLICY "users_cannot_delete_usage_periods"
  ON public.usage_periods FOR DELETE
  USING (false);

-- ============================================================================
-- PART 5: USAGE_RESERVATIONS TABLE (STATE MACHINE FOR IDEMPOTENCY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Idempotency key (required at reservation time)
  request_id TEXT UNIQUE NOT NULL,

  -- User context (one must be set)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_session_id UUID REFERENCES public.anonymous_sessions(id) ON DELETE CASCADE,

  -- Which period/session this reservation references
  period_id UUID NOT NULL,

  -- Reservation state
  state TEXT NOT NULL DEFAULT 'reserved',

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_state CHECK (state IN ('reserved', 'confirmed', 'released')),
  CONSTRAINT user_or_session_required CHECK (
    (user_id IS NOT NULL AND anonymous_session_id IS NULL) OR
    (user_id IS NULL AND anonymous_session_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_reservations_request_id
  ON public.usage_reservations(request_id);

CREATE INDEX IF NOT EXISTS idx_reservations_user_state
  ON public.usage_reservations(user_id, state)
  WHERE state = 'reserved';

CREATE INDEX IF NOT EXISTS idx_reservations_session_state
  ON public.usage_reservations(anonymous_session_id, state)
  WHERE state = 'reserved';

-- RLS: Users can read own reservations
ALTER TABLE public.usage_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_reservations"
  ON public.usage_reservations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_cannot_modify_reservations"
  ON public.usage_reservations FOR INSERT
  WITH CHECK (false);

-- ============================================================================
-- PART 6: USAGE_EVENTS TABLE (IMMUTABLE AUDIT LOG)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request tracking
  request_id TEXT NOT NULL,  -- References usage_reservations(request_id)

  -- User context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_session_id UUID REFERENCES public.anonymous_sessions(id) ON DELETE SET NULL,

  -- Event type
  event_type TEXT NOT NULL,

  -- AI provider metadata (nullable for MVP)
  provider TEXT,
  model TEXT,

  -- Token usage (nullable for MVP, set by server after provider response)
  input_tokens BIGINT,
  output_tokens BIGINT,
  cached_input_tokens BIGINT DEFAULT 0,

  -- Cost tracking (nullable for MVP)
  estimated_cost NUMERIC(15, 8),  -- Supports up to $999,999,999.99999999
  currency TEXT DEFAULT 'USD',

  -- Error tracking (server-sanitized, no PII)
  error_code TEXT,
  error_message TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'question_reserved', 'question_released', 'question_confirmed',
    'quota_granted', 'quota_refund'
  )),
  CONSTRAINT user_or_session_required CHECK (
    (user_id IS NOT NULL) OR (anonymous_session_id IS NOT NULL)
  ),
  CONSTRAINT positive_tokens CHECK (
    (input_tokens IS NULL OR input_tokens >= 0) AND
    (output_tokens IS NULL OR output_tokens >= 0) AND
    (cached_input_tokens IS NULL OR cached_input_tokens >= 0)
  ),
  CONSTRAINT cost_non_negative CHECK (
    estimated_cost IS NULL OR estimated_cost >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user
  ON public.usage_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_session
  ON public.usage_events(anonymous_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_request_id
  ON public.usage_events(request_id);

CREATE INDEX IF NOT EXISTS idx_usage_events_type
  ON public.usage_events(event_type);

-- RLS: Users can read own events
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_usage_events"
  ON public.usage_events FOR SELECT
  USING (
    (auth.uid() = user_id) OR
    (user_id IS NULL AND anonymous_session_id IN (
      SELECT id FROM public.anonymous_sessions WHERE linked_user_id = auth.uid()
    ))
  );

CREATE POLICY "users_cannot_modify_usage_events"
  ON public.usage_events FOR INSERT
  WITH CHECK (false);

-- ============================================================================
-- PART 7: AUTHENTICATED QUOTA FUNCTIONS (MODEL A: Direct RPC)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reserve_authenticated_question(
  p_request_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  reservation_id UUID,
  period_id UUID,
  remaining_questions INT,
  error_msg TEXT
) AS $$
DECLARE
  v_existing_reservation UUID;
  v_existing_period_id UUID;
  v_new_reservation_id UUID;
  v_period_id UUID;
  v_remaining INT;
BEGIN
  -- Step 1: Check if request already reserved (idempotency)
  SELECT id, period_id INTO v_existing_reservation, v_existing_period_id
  FROM public.usage_reservations
  WHERE request_id = p_request_id AND state = 'reserved';

  IF v_existing_reservation IS NOT NULL THEN
    -- Return existing reservation
    SELECT (question_limit - questions_used - questions_reserved)
    INTO v_remaining FROM public.usage_periods WHERE id = v_existing_period_id;

    RETURN QUERY SELECT true, v_existing_reservation, v_existing_period_id, v_remaining, NULL::TEXT;
    RETURN;
  END IF;

  -- Step 2: Find active usage_period for this user (uses auth.uid(), immutable)
  SELECT id INTO v_period_id
  FROM public.usage_periods
  WHERE user_id = auth.uid()
    AND (period_end IS NULL OR period_end > NOW())
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_period_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 0, 'No active usage period'::TEXT;
    RETURN;
  END IF;

  -- Step 3: Check quota (atomically locked)
  SELECT (question_limit - questions_used - questions_reserved)
  INTO v_remaining
  FROM public.usage_periods
  WHERE id = v_period_id
  FOR UPDATE;

  IF v_remaining <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, v_period_id, 0, 'Quota exhausted'::TEXT;
    RETURN;
  END IF;

  -- Step 4: Create reservation atomically
  INSERT INTO public.usage_reservations (request_id, user_id, period_id, state)
  VALUES (p_request_id, auth.uid(), v_period_id, 'reserved')
  RETURNING id INTO v_new_reservation_id;

  -- Step 5: Update quota
  UPDATE public.usage_periods
  SET questions_reserved = questions_reserved + 1,
      updated_at = NOW()
  WHERE id = v_period_id;

  -- Step 6: Return success
  RETURN QUERY SELECT true, v_new_reservation_id, v_period_id, v_remaining - 1, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.reserve_authenticated_question(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_authenticated_question(TEXT) TO authenticated;

-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_authenticated_question(
  p_request_id TEXT,
  p_provider TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_input_tokens BIGINT DEFAULT NULL,
  p_output_tokens BIGINT DEFAULT NULL,
  p_estimated_cost NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  event_id UUID,
  error_msg TEXT
) AS $$
DECLARE
  v_event_id UUID;
  v_period_id UUID;
  v_reservation_id UUID;
BEGIN
  -- Step 1: Find reservation (check exists and state = 'reserved')
  SELECT id, period_id INTO v_reservation_id, v_period_id
  FROM public.usage_reservations
  WHERE request_id = p_request_id AND user_id = auth.uid() AND state = 'reserved';

  IF v_reservation_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Reservation not found or already processed'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Confirm usage (move questions_used, release questions_reserved)
  UPDATE public.usage_periods
  SET questions_used = questions_used + 1,
      questions_reserved = GREATEST(questions_reserved - 1, 0),
      updated_at = NOW()
  WHERE id = v_period_id;

  -- Step 3: Update reservation state
  UPDATE public.usage_reservations
  SET state = 'confirmed',
      updated_at = NOW()
  WHERE id = v_reservation_id;

  -- Step 4: Log event (immutable)
  INSERT INTO public.usage_events (
    request_id, user_id, event_type,
    provider, model, input_tokens, output_tokens, estimated_cost
  )
  VALUES (
    p_request_id, auth.uid(), 'question_confirmed',
    p_provider, p_model, p_input_tokens, p_output_tokens, p_estimated_cost
  )
  RETURNING id INTO v_event_id;

  -- Step 5: Return success
  RETURN QUERY SELECT true, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.confirm_authenticated_question(TEXT, TEXT, TEXT, BIGINT, BIGINT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_authenticated_question(TEXT, TEXT, TEXT, BIGINT, BIGINT, NUMERIC) TO authenticated;

-- ============================================================================

CREATE OR REPLACE FUNCTION public.release_authenticated_question(
  p_request_id TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  event_id UUID,
  error_msg TEXT
) AS $$
DECLARE
  v_event_id UUID;
  v_period_id UUID;
  v_reservation_id UUID;
BEGIN
  -- Step 1: Find reservation
  SELECT id, period_id INTO v_reservation_id, v_period_id
  FROM public.usage_reservations
  WHERE request_id = p_request_id AND user_id = auth.uid() AND state = 'reserved';

  IF v_reservation_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Reservation not found'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Release reservation
  UPDATE public.usage_periods
  SET questions_reserved = GREATEST(questions_reserved - 1, 0),
      updated_at = NOW()
  WHERE id = v_period_id;

  -- Step 3: Update reservation state
  UPDATE public.usage_reservations
  SET state = 'released',
      updated_at = NOW()
  WHERE id = v_reservation_id;

  -- Step 4: Log event
  INSERT INTO public.usage_events (
    request_id, user_id, event_type,
    error_code, error_message
  )
  VALUES (
    p_request_id, auth.uid(), 'question_released',
    p_error_code, p_error_message
  )
  RETURNING id INTO v_event_id;

  RETURN QUERY SELECT true, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.release_authenticated_question(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_authenticated_question(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- PART 8: ANONYMOUS QUOTA FUNCTIONS (MODEL B: SERVER-ONLY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reserve_anonymous_question(
  p_session_token_hash TEXT,
  p_request_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  session_id UUID,
  period_id UUID,
  remaining_questions INT,
  error_msg TEXT
) AS $$
DECLARE
  v_session_id UUID;
  v_remaining INT;
  v_reservation_id UUID;
BEGIN
  -- Step 1: Check if request already reserved (idempotency)
  SELECT anonymous_session_id INTO v_session_id
  FROM public.usage_reservations
  WHERE request_id = p_request_id AND state = 'reserved' LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    -- Return existing
    SELECT (questions_limit - questions_used - questions_reserved)
    INTO v_remaining FROM public.anonymous_sessions WHERE id = v_session_id;

    RETURN QUERY SELECT true, v_session_id, v_session_id, v_remaining, NULL::TEXT;
    RETURN;
  END IF;

  -- Step 2: Look up session by hash (not ID)
  SELECT id INTO v_session_id
  FROM public.anonymous_sessions
  WHERE session_token_hash = p_session_token_hash
    AND retention_expires_at > NOW()
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 0, 'Session not found or expired'::TEXT;
    RETURN;
  END IF;

  -- Step 3: Check quota
  SELECT (questions_limit - questions_used - questions_reserved)
  INTO v_remaining
  FROM public.anonymous_sessions
  WHERE id = v_session_id
  FOR UPDATE;

  IF v_remaining <= 0 THEN
    RETURN QUERY SELECT false, v_session_id, v_session_id, 0, 'Quota exhausted'::TEXT;
    RETURN;
  END IF;

  -- Step 4: Create reservation atomically
  INSERT INTO public.usage_reservations (request_id, anonymous_session_id, period_id, state)
  VALUES (p_request_id, v_session_id, v_session_id, 'reserved')
  RETURNING id INTO v_reservation_id;

  -- Step 5: Update quota
  UPDATE public.anonymous_sessions
  SET questions_reserved = questions_reserved + 1,
      last_used_at = NOW()
  WHERE id = v_session_id;

  RETURN QUERY SELECT true, v_session_id, v_session_id, v_remaining - 1, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.reserve_anonymous_question(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_anonymous_question(TEXT, TEXT) TO service_role;

-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_anonymous_question(
  p_session_token_hash TEXT,
  p_request_id TEXT,
  p_provider TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_input_tokens BIGINT DEFAULT NULL,
  p_output_tokens BIGINT DEFAULT NULL,
  p_estimated_cost NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  event_id UUID,
  error_msg TEXT
) AS $$
DECLARE
  v_event_id UUID;
  v_session_id UUID;
  v_reservation_id UUID;
BEGIN
  -- Step 1: Look up session by hash
  SELECT id INTO v_session_id
  FROM public.anonymous_sessions
  WHERE session_token_hash = p_session_token_hash;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Session not found'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Find reservation
  SELECT id INTO v_reservation_id
  FROM public.usage_reservations
  WHERE request_id = p_request_id AND anonymous_session_id = v_session_id AND state = 'reserved';

  IF v_reservation_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Reservation not found'::TEXT;
    RETURN;
  END IF;

  -- Step 3: Confirm usage
  UPDATE public.anonymous_sessions
  SET questions_used = questions_used + 1,
      questions_reserved = GREATEST(questions_reserved - 1, 0),
      last_used_at = NOW()
  WHERE id = v_session_id;

  -- Step 4: Update reservation state
  UPDATE public.usage_reservations
  SET state = 'confirmed',
      updated_at = NOW()
  WHERE id = v_reservation_id;

  -- Step 5: Log event
  INSERT INTO public.usage_events (
    request_id, anonymous_session_id, event_type,
    provider, model, input_tokens, output_tokens, estimated_cost
  )
  VALUES (
    p_request_id, v_session_id, 'question_confirmed',
    p_provider, p_model, p_input_tokens, p_output_tokens, p_estimated_cost
  )
  RETURNING id INTO v_event_id;

  RETURN QUERY SELECT true, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.confirm_anonymous_question(TEXT, TEXT, TEXT, TEXT, BIGINT, BIGINT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_anonymous_question(TEXT, TEXT, TEXT, TEXT, BIGINT, BIGINT, NUMERIC) TO service_role;

-- ============================================================================

CREATE OR REPLACE FUNCTION public.transfer_anonymous_quota(
  p_new_user_id UUID,
  p_session_token_hash TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  registered_period_id UUID,
  transferred_questions INT,
  error_msg TEXT
) AS $$
DECLARE
  v_remaining_questions INT;
  v_new_period_id UUID;
  v_session_id UUID;
BEGIN
  -- Step 1: Look up session by hash (not ID)
  SELECT id, (questions_limit - questions_used)
  INTO v_session_id, v_remaining_questions
  FROM public.anonymous_sessions
  WHERE session_token_hash = p_session_token_hash
    AND linked_user_id IS NULL
    AND retention_expires_at > NOW()
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Session not found, already linked, or expired'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Check if user already has registered trial (prevent duplicate)
  IF EXISTS (
    SELECT 1 FROM public.usage_periods
    WHERE user_id = p_new_user_id AND source_type = 'trial_registered'
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'User already has registered trial'::TEXT;
    RETURN;
  END IF;

  -- Step 3: Create registered trial period
  INSERT INTO public.usage_periods (
    user_id, source_type, period_start, period_end,
    question_limit, questions_used, questions_reserved
  )
  VALUES (
    p_new_user_id, 'trial_registered', NOW(), NULL,
    7 + v_remaining_questions,  -- 7 base + transferred
    0, 0
  )
  RETURNING id INTO v_new_period_id;

  -- Step 4: Link anonymous session to user
  UPDATE public.anonymous_sessions
  SET linked_user_id = p_new_user_id,
      retention_expires_at = NOW() + INTERVAL '30 days'
  WHERE id = v_session_id;

  -- Step 5: Log transfer event
  INSERT INTO public.usage_events (
    request_id, user_id, anonymous_session_id, event_type
  )
  VALUES (
    gen_random_uuid()::TEXT, p_new_user_id, v_session_id, 'quota_granted'
  );

  RETURN QUERY SELECT true, v_new_period_id, v_remaining_questions, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.transfer_anonymous_quota(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_anonymous_quota(UUID, TEXT) TO service_role;

-- ============================================================================
-- PART 9: ROLE PRIVILEGES
-- ============================================================================

-- Authenticated users (browser)
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.usage_periods TO authenticated;
GRANT SELECT ON public.usage_events TO authenticated;
GRANT SELECT ON public.usage_reservations TO authenticated;

GRANT UPDATE (display_name, language, theme) ON public.user_profiles TO authenticated;

-- Prevent authenticated users from:
REVOKE INSERT, DELETE ON public.user_profiles FROM authenticated;
REVOKE ALL ON public.anonymous_sessions FROM authenticated;

-- Anonymous (no access to quota tables)
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.anonymous_sessions FROM anon;
REVOKE ALL ON public.usage_periods FROM anon;
REVOKE ALL ON public.usage_events FROM anon;
REVOKE ALL ON public.usage_reservations FROM anon;

-- Service role (server-side)
GRANT ALL ON public.anonymous_sessions TO service_role;
GRANT ALL ON public.usage_periods TO service_role;
GRANT ALL ON public.usage_events TO service_role;
GRANT ALL ON public.usage_reservations TO service_role;

-- ============================================================================
-- END OF MIGRATION (REVISED v2.0)
-- ============================================================================
-- Security improvements:
-- ✅ Trigger-based profile creation (not client INSERT)
-- ✅ Separated authenticated vs anonymous functions
-- ✅ Model A/B RPC access patterns explicit
-- ✅ Idempotency via usage_reservations table
-- ✅ Reduced user_profiles columns (MVP minimalism)
-- ✅ Function security matrix defined
-- ✅ Token/cost field types corrected
-- ✅ Trial uniqueness enforced by UNIQUE index
--
-- This is a PROPOSAL and has not been applied to the remote database.
