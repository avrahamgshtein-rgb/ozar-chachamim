-- ============================================================================
-- SUPABASE MIGRATION: Fix two bugs in the authenticated quota RPCs
-- (Milestone 1) found while validating the Stage-3 chat API against a
-- local test database
-- ============================================================================
--
-- Bug 1 — ambiguous column, reserve_authenticated_question only:
-- its RETURNS TABLE declares an OUT parameter named `period_id`, which
-- PL/pgSQL treats as an implicit variable for the whole function body. Its
-- first query, `SELECT id, period_id INTO ... FROM public.usage_reservations
-- WHERE request_id = p_request_id ...`, also selects usage_reservations
-- .period_id — Postgres can't tell whether `period_id` means the OUT
-- parameter or the table column and raises "column reference ambiguous" on
-- every call. Fixed by aliasing the queried tables and qualifying the
-- column references. The other four Milestone-1 RPCs don't have this
-- particular collision (checked each one's OUT parameter list against
-- every table it queries).
--
-- Bug 2 — wrong SECURITY mode on all three authenticated RPCs:
-- reserve/confirm/release_authenticated_question were declared SECURITY
-- INVOKER (run with the *caller's* privileges), but Milestone 1's own
-- privilege grants only gave the `authenticated` role SELECT on
-- usage_periods/usage_reservations/usage_events — no UPDATE, no INSERT.
-- Since these functions are only ever GRANTed EXECUTE to `authenticated`,
-- every real call (reserve, confirm, and release) failed with "permission
-- denied for table usage_periods" the moment it reached its first UPDATE.
-- The Milestone 1 security test suite ran as the Postgres superuser
-- locally, which bypasses grants entirely, so this never surfaced until
-- reserve_authenticated_question was exercised with `SET ROLE authenticated`
-- tonight. Fixed by switching all three to SECURITY DEFINER (matching the
-- pattern already used correctly by handle_new_user() and
-- touch_chat_session_on_message()) — the function body now runs with the
-- owner's privileges while auth.uid() still reflects the real caller, and
-- the EXECUTE grant continues to gate who may call it at all.
--
-- Status: PROPOSAL ONLY (not applied remotely)
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
  SELECT ur.id, ur.period_id INTO v_existing_reservation, v_existing_period_id
  FROM public.usage_reservations ur
  WHERE ur.request_id = p_request_id AND ur.state = 'reserved';

  IF v_existing_reservation IS NOT NULL THEN
    -- Return existing reservation
    SELECT (question_limit - questions_used - questions_reserved)
    INTO v_remaining FROM public.usage_periods WHERE id = v_existing_period_id;

    RETURN QUERY SELECT true, v_existing_reservation, v_existing_period_id, v_remaining, NULL::TEXT;
    RETURN;
  END IF;

  -- Step 2: Find active usage_period for this user (uses auth.uid(), immutable)
  SELECT up.id INTO v_period_id
  FROM public.usage_periods up
  WHERE up.user_id = auth.uid()
    AND (up.period_end IS NULL OR up.period_end > NOW())
  ORDER BY up.created_at DESC
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
  SELECT ur.id, ur.period_id INTO v_reservation_id, v_period_id
  FROM public.usage_reservations ur
  WHERE ur.request_id = p_request_id AND ur.user_id = auth.uid() AND ur.state = 'reserved';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
  SELECT ur.id, ur.period_id INTO v_reservation_id, v_period_id
  FROM public.usage_reservations ur
  WHERE ur.request_id = p_request_id AND ur.user_id = auth.uid() AND ur.state = 'reserved';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.release_authenticated_question(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_authenticated_question(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
