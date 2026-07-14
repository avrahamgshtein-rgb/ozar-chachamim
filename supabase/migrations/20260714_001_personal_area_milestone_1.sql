-- ============================================================================
-- SUPABASE MIGRATION: Personal Area Milestone 1
-- Database Schema for User Authentication & Quota Management
-- ============================================================================
--
-- This migration PROPOSES (does not apply) the following:
-- 1. Extend user_profiles table with new columns
-- 2. Create anonymous_sessions table (server-only access)
-- 3. Create usage_periods table (quota per billing period)
-- 4. Create usage_events table (immutable audit log)
-- 5. RLS policies for all tables
-- 6. PostgreSQL functions for atomic quota operations
-- 7. Indexes for query performance
--
-- DO NOT apply without review and approval.
-- ============================================================================

-- ============================================================================
-- PART 1: EXTEND user_profiles TABLE
-- ============================================================================

ALTER TABLE IF EXISTS public.user_profiles
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS language_support TEXT DEFAULT 'he',
  CHECK (language_support ~ '^[a-z]{2}(,[a-z]{2})*$'),
ADD COLUMN IF NOT EXISTS ui_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Update RLS policy for user_profiles (add WITH CHECK clause)
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow INSERT (needed for server-side profile creation)
CREATE POLICY IF NOT EXISTS "users_insert_own_profile" ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Prevent DELETE (only cascade via auth.users deletion)
CREATE POLICY IF NOT EXISTS "prevent_user_delete_own_profile" ON public.user_profiles
  FOR DELETE
  USING (false);

-- ============================================================================
-- PART 2: CREATE anonymous_sessions TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session token hash (raw token NEVER stored, only hash)
  session_token_hash TEXT UNIQUE NOT NULL,

  -- Quota
  questions_limit INT DEFAULT 3,
  questions_used INT DEFAULT 0,
  questions_reserved INT DEFAULT 0,

  -- Linkage to registered account (when user registers)
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Session lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  retention_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Privacy & abuse detection
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

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_created
  ON public.anonymous_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_expired
  ON public.anonymous_sessions(retention_expires_at);

-- RLS: No direct browser access
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "anonymous_sessions_no_select"
  ON public.anonymous_sessions FOR SELECT USING (false);

CREATE POLICY IF NOT EXISTS "anonymous_sessions_no_insert"
  ON public.anonymous_sessions FOR INSERT WITH CHECK (false);

CREATE POLICY IF NOT EXISTS "anonymous_sessions_no_update"
  ON public.anonymous_sessions FOR UPDATE USING (false);

CREATE POLICY IF NOT EXISTS "anonymous_sessions_no_delete"
  ON public.anonymous_sessions FOR DELETE USING (false);

-- ============================================================================
-- PART 3: CREATE usage_periods TABLE
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

-- RLS: Users can read, but not modify
ALTER TABLE public.usage_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users_read_own_usage_periods"
  ON public.usage_periods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "users_cannot_insert_usage_periods"
  ON public.usage_periods FOR INSERT
  USING (false);

CREATE POLICY IF NOT EXISTS "users_cannot_update_usage_periods"
  ON public.usage_periods FOR UPDATE
  USING (false);

CREATE POLICY IF NOT EXISTS "users_cannot_delete_usage_periods"
  ON public.usage_periods FOR DELETE
  USING (false);

-- ============================================================================
-- PART 4: CREATE usage_events TABLE (IMMUTABLE AUDIT LOG)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request tracking (idempotency)
  request_id TEXT UNIQUE NOT NULL,

  -- User context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_session_id UUID REFERENCES public.anonymous_sessions(id) ON DELETE SET NULL,

  -- Event type
  event_type TEXT NOT NULL,

  -- AI provider metadata
  provider TEXT,
  model TEXT,

  -- Token usage
  input_tokens INT,
  output_tokens INT,
  cached_input_tokens INT DEFAULT 0,

  -- Cost tracking
  estimated_cost DECIMAL(10, 8),

  -- Error tracking
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
    (output_tokens IS NULL OR output_tokens >= 0)
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

-- RLS: Users can read own events, but not modify
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users_read_own_usage_events"
  ON public.usage_events FOR SELECT
  USING (
    (auth.uid() = user_id) OR
    (user_id IS NULL AND anonymous_session_id IN (
      SELECT id FROM public.anonymous_sessions WHERE linked_user_id = auth.uid()
    ))
  );

CREATE POLICY IF NOT EXISTS "users_cannot_modify_usage_events"
  ON public.usage_events FOR INSERT
  USING (false);

-- ============================================================================
-- PART 5: ATOMIC QUOTA RESERVATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reserve_question(
  p_user_id UUID DEFAULT NULL,
  p_anonymous_session_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  period_id UUID,
  remaining_questions INT,
  error_msg TEXT
) AS $$
DECLARE
  v_period_id UUID;
  v_remaining INT;
  v_is_usage_period BOOLEAN;
BEGIN
  -- Step 1: Validate input
  IF p_user_id IS NULL AND p_anonymous_session_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'User ID or session ID required'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Identify active usage period or session
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_period_id
    FROM public.usage_periods
    WHERE user_id = p_user_id
      AND (period_end IS NULL OR period_end > NOW())
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE; -- Lock to prevent race condition

    IF v_period_id IS NULL THEN
      RETURN QUERY SELECT false, NULL::UUID, 0, 'No active usage period'::TEXT;
      RETURN;
    END IF;

    v_is_usage_period := TRUE;
  ELSE
    -- Anonymous session
    SELECT id INTO v_period_id
    FROM public.anonymous_sessions
    WHERE id = p_anonymous_session_id
      AND retention_expires_at > NOW()
    FOR UPDATE;

    IF v_period_id IS NULL THEN
      RETURN QUERY SELECT false, NULL::UUID, 0, 'Anonymous session expired or not found'::TEXT;
      RETURN;
    END IF;

    v_is_usage_period := FALSE;
  END IF;

  -- Step 3: Check quota
  IF v_is_usage_period THEN
    SELECT (question_limit - questions_used - questions_reserved)
    INTO v_remaining
    FROM public.usage_periods
    WHERE id = v_period_id
    FOR UPDATE;
  ELSE
    SELECT (questions_limit - questions_used - questions_reserved)
    INTO v_remaining
    FROM public.anonymous_sessions
    WHERE id = v_period_id
    FOR UPDATE;
  END IF;

  IF v_remaining <= 0 THEN
    RETURN QUERY SELECT false, v_period_id, 0, 'Quota exhausted'::TEXT;
    RETURN;
  END IF;

  -- Step 4: Reserve atomically
  IF v_is_usage_period THEN
    UPDATE public.usage_periods
    SET questions_reserved = questions_reserved + 1,
        updated_at = NOW()
    WHERE id = v_period_id;
  ELSE
    UPDATE public.anonymous_sessions
    SET questions_reserved = questions_reserved + 1,
        last_used_at = NOW()
    WHERE id = v_period_id;
  END IF;

  -- Step 5: Return success
  RETURN QUERY SELECT true, v_period_id, v_remaining - 1, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users (optional, for future use)
GRANT EXECUTE ON FUNCTION public.reserve_question(UUID, UUID) TO authenticated;

-- ============================================================================
-- PART 6: CONFIRM QUESTION USAGE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_question(
  p_period_id UUID,
  p_request_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_anonymous_session_id UUID DEFAULT NULL,
  p_provider TEXT DEFAULT 'anthropic',
  p_model TEXT DEFAULT 'claude-sonnet-5',
  p_input_tokens INT DEFAULT 0,
  p_output_tokens INT DEFAULT 0,
  p_estimated_cost DECIMAL DEFAULT 0
)
RETURNS TABLE(
  success BOOLEAN,
  event_id UUID,
  error_msg TEXT
) AS $$
DECLARE
  v_event_id UUID;
  v_is_usage_period BOOLEAN;
BEGIN
  -- Step 1: Check if already confirmed (idempotency)
  SELECT id INTO v_event_id
  FROM public.usage_events
  WHERE request_id = p_request_id
    AND event_type = 'question_confirmed'
  LIMIT 1;

  IF v_event_id IS NOT NULL THEN
    RETURN QUERY SELECT true, v_event_id, 'Already confirmed'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Determine if usage_period or anonymous_session
  v_is_usage_period := (p_user_id IS NOT NULL);

  -- Step 3: Confirm usage and release reservation
  IF v_is_usage_period THEN
    UPDATE public.usage_periods
    SET questions_used = questions_used + 1,
        questions_reserved = GREATEST(questions_reserved - 1, 0),
        updated_at = NOW()
    WHERE id = p_period_id;
  ELSE
    UPDATE public.anonymous_sessions
    SET questions_used = questions_used + 1,
        questions_reserved = GREATEST(questions_reserved - 1, 0),
        last_used_at = NOW()
    WHERE id = p_period_id;
  END IF;

  -- Step 4: Log event (immutable)
  INSERT INTO public.usage_events (
    request_id, user_id, anonymous_session_id, event_type,
    provider, model, input_tokens, output_tokens, estimated_cost
  )
  VALUES (
    p_request_id, p_user_id, p_anonymous_session_id, 'question_confirmed',
    p_provider, p_model, p_input_tokens, p_output_tokens, p_estimated_cost
  )
  RETURNING id INTO v_event_id;

  RETURN QUERY SELECT true, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.confirm_question(UUID, TEXT, UUID, UUID, TEXT, TEXT, INT, INT, DECIMAL) TO authenticated;

-- ============================================================================
-- PART 7: RELEASE QUESTION FUNCTION (ON FAILURE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.release_question(
  p_period_id UUID,
  p_request_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_anonymous_session_id UUID DEFAULT NULL,
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
  v_is_usage_period BOOLEAN;
BEGIN
  -- Step 1: Determine if usage_period or anonymous_session
  v_is_usage_period := (p_user_id IS NOT NULL);

  -- Step 2: Release reservation
  IF v_is_usage_period THEN
    UPDATE public.usage_periods
    SET questions_reserved = GREATEST(questions_reserved - 1, 0),
        updated_at = NOW()
    WHERE id = p_period_id;
  ELSE
    UPDATE public.anonymous_sessions
    SET questions_reserved = GREATEST(questions_reserved - 1, 0),
        last_used_at = NOW()
    WHERE id = p_period_id;
  END IF;

  -- Step 3: Log event (for audit trail)
  INSERT INTO public.usage_events (
    request_id, user_id, anonymous_session_id, event_type,
    error_code, error_message
  )
  VALUES (
    p_request_id, p_user_id, p_anonymous_session_id, 'question_released',
    p_error_code, p_error_message
  )
  RETURNING id INTO v_event_id;

  RETURN QUERY SELECT true, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.release_question(UUID, TEXT, UUID, UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- PART 8: TRANSFER ANONYMOUS QUOTA FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transfer_anonymous_quota(
  p_new_user_id UUID,
  p_anonymous_session_id UUID
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
BEGIN
  -- Step 1: Verify anonymous session exists and not already linked
  SELECT (questions_limit - questions_used)
  INTO v_remaining_questions
  FROM public.anonymous_sessions
  WHERE id = p_anonymous_session_id
    AND linked_user_id IS NULL
    AND retention_expires_at > NOW()
  FOR UPDATE;

  IF v_remaining_questions IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Session not found, already linked, or expired'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Create registered trial period
  INSERT INTO public.usage_periods (
    user_id, source_type, period_start, period_end,
    question_limit, questions_used, questions_reserved
  )
  VALUES (
    p_new_user_id, 'trial_registered', NOW(), NULL,
    7 + v_remaining_questions,
    0, 0
  )
  RETURNING id INTO v_new_period_id;

  -- Step 3: Link anonymous session to user (audit trail)
  UPDATE public.anonymous_sessions
  SET linked_user_id = p_new_user_id,
      retention_expires_at = NOW() + INTERVAL '30 days'
  WHERE id = p_anonymous_session_id;

  -- Step 4: Log transfer event
  INSERT INTO public.usage_events (
    request_id, user_id, anonymous_session_id, event_type
  )
  VALUES (
    gen_random_uuid()::TEXT, p_new_user_id, p_anonymous_session_id, 'quota_granted'
  );

  RETURN QUERY SELECT true, v_new_period_id, v_remaining_questions, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.transfer_anonymous_quota(UUID, UUID) TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- No data was modified.
-- All changes are additive to existing schema v3.
-- RLS policies prevent unauthorized access.
-- This is a PROPOSAL and has not been applied to the remote database.
