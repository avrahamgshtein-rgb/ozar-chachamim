-- ============================================================================
-- SUPABASE MIGRATION: add release_anonymous_question (missing from M1)
-- ============================================================================
--
-- Milestone 1 added reserve_anonymous_question and
-- confirm_anonymous_question but never a release counterpart — needed now
-- that the chat API actually serves anonymous visitors (per the agent
-- plan's "try before you register" freemium flow): if the LLM call fails
-- after a reservation, there was no way to give the question back, so a
-- failed anonymous request would permanently burn part of that visitor's
-- 3-question trial.
--
-- Mirrors release_authenticated_question's shape and SECURITY DEFINER mode
-- (this session's fix to the ambiguous-column/wrong-security-mode bugs in
-- the authenticated versions).
--
-- Status: PROPOSAL ONLY (not applied remotely)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.release_anonymous_question(
  p_session_token_hash TEXT,
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
  v_session_id UUID;
  v_reservation_id UUID;
BEGIN
  SELECT id INTO v_session_id
  FROM public.anonymous_sessions
  WHERE session_token_hash = p_session_token_hash;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Session not found'::TEXT;
    RETURN;
  END IF;

  SELECT ur.id INTO v_reservation_id
  FROM public.usage_reservations ur
  WHERE ur.request_id = p_request_id AND ur.anonymous_session_id = v_session_id AND ur.state = 'reserved';

  IF v_reservation_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Reservation not found'::TEXT;
    RETURN;
  END IF;

  UPDATE public.anonymous_sessions
  SET questions_reserved = GREATEST(questions_reserved - 1, 0),
      last_used_at = NOW()
  WHERE id = v_session_id;

  UPDATE public.usage_reservations
  SET state = 'released',
      updated_at = NOW()
  WHERE id = v_reservation_id;

  INSERT INTO public.usage_events (
    request_id, anonymous_session_id, event_type,
    error_code, error_message
  )
  VALUES (
    p_request_id, v_session_id, 'question_released',
    p_error_code, p_error_message
  )
  RETURNING id INTO v_event_id;

  RETURN QUERY SELECT true, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.release_anonymous_question(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_anonymous_question(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
