-- ============================================================================
-- SECURITY TEST SUITE: Personal Area Milestone 2, Stage 1 (Chat Schema)
-- ============================================================================
--
-- Validates RLS isolation and constraint enforcement for chat_sessions /
-- chat_messages. Assumes migration 20260727_003 has been applied locally
-- on top of 20260714_002 (chat_sessions.user_id references auth.users, and
-- this suite reuses the same two mock users pattern as the Milestone 1
-- suite). Do NOT run against production.
--
-- Expected: All tests PASS (raise NOTICE on success, RAISE EXCEPTION would
-- surface a real failure).
-- ============================================================================

BEGIN;

DO $$
DECLARE
  user1_id UUID := '11111111-1111-1111-1111-111111111111';
  user2_id UUID := '22222222-2222-2222-2222-222222222222';
  intruder_id UUID := '99999999-9999-9999-9999-999999999999';
  session1_id UUID;
  session2_id UUID;
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (user1_id, 'user1@test.com', 'mock', NOW(), NOW(), NOW())
  ON CONFLICT DO NOTHING;
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (user2_id, 'user2@test.com', 'mock', NOW(), NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- ── TEST 1: FK rejects a session for a user that doesn't exist ──────────
  BEGIN
    INSERT INTO public.chat_sessions (user_id) VALUES (intruder_id);
    RAISE EXCEPTION 'TEST 1 FAILED: session created for nonexistent user';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'TEST 1 PASSED: nonexistent user_id rejected';
  END;

  -- Real sessions for the isolation tests below
  INSERT INTO public.chat_sessions (id, user_id) VALUES (gen_random_uuid(), user1_id)
    RETURNING id INTO session1_id;
  INSERT INTO public.chat_sessions (id, user_id) VALUES (gen_random_uuid(), user2_id)
    RETURNING id INTO session2_id;
  INSERT INTO public.chat_messages (session_id, role, content) VALUES (session1_id, 'user', 'test message user1');
  INSERT INTO public.chat_messages (session_id, role, content) VALUES (session2_id, 'user', 'test message user2');

  -- ── TEST 2: FK rejects a message for a session that doesn't exist ───────
  BEGIN
    INSERT INTO public.chat_messages (session_id, role, content) VALUES (intruder_id, 'user', 'hi');
    RAISE EXCEPTION 'TEST 2 FAILED: message created for nonexistent session';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'TEST 2 PASSED: nonexistent session_id rejected';
  END;

  -- ── TEST 3: role/content CHECK constraints ──────────────────────────────
  BEGIN
    INSERT INTO public.chat_messages (session_id, role, content) VALUES (session1_id, 'admin', 'hi');
    RAISE EXCEPTION 'TEST 3a FAILED: invalid role accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 3a PASSED: invalid role rejected';
  END;

  BEGIN
    INSERT INTO public.chat_messages (session_id, role, content) VALUES (session1_id, 'user', '   ');
    RAISE EXCEPTION 'TEST 3b FAILED: blank content accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 3b PASSED: blank content rejected';
  END;

  -- ── TEST 4: bookkeeping trigger updates the parent session ──────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = session1_id AND last_message_at IS NOT NULL AND updated_at = last_message_at
  ) THEN
    RAISE EXCEPTION 'TEST 4 FAILED: touch_chat_session_on_message trigger did not fire';
  END IF;
  RAISE NOTICE 'TEST 4 PASSED: session timestamps updated on message insert';

  PERFORM set_config('test.session1_id', session1_id::TEXT, false);
  PERFORM set_config('test.session2_id', session2_id::TEXT, false);
END;
$$;

-- ── TEST 5: user1 cannot see user2's sessions ──────────────────────────────
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.chat_sessions WHERE user_id = '22222222-2222-2222-2222-222222222222'
  ) THEN
    RAISE EXCEPTION 'TEST 5 FAILED: user1 can see user2 sessions through RLS';
  END IF;
  RAISE NOTICE 'TEST 5 PASSED: user1 cannot see user2 sessions';
END;
$$;

-- ── TEST 6: user1 cannot read user2's messages via session_id ─────────────
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM public.chat_messages
  WHERE session_id::TEXT = current_setting('test.session2_id', true);
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 6 FAILED: user1 read % of user2 messages', v_count;
  END IF;
  RAISE NOTICE 'TEST 6 PASSED: user1 cannot read user2 messages';
END;
$$;

-- ── TEST 7: user1 cannot insert a message into user2's session ────────────
DO $$
BEGIN
  BEGIN
    INSERT INTO public.chat_messages (session_id, role, content)
    VALUES (current_setting('test.session2_id', true)::UUID, 'user', 'sneaky insert');
    RAISE EXCEPTION 'TEST 7 FAILED: cross-user message insert succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST 7 PASSED: cross-user message insert rejected by RLS';
  END;
END;
$$;

-- ── TEST 8: user1 can update the title on their own session ───────────────
DO $$
BEGIN
  UPDATE public.chat_sessions SET title = 'my session'
  WHERE id::TEXT = current_setting('test.session1_id', true);
  RAISE NOTICE 'TEST 8 PASSED: own-session title update succeeded';
END;
$$;

-- ── TEST 9: user1 cannot reassign user_id (column-level GRANT) ─────────────
DO $$
BEGIN
  BEGIN
    UPDATE public.chat_sessions SET user_id = '22222222-2222-2222-2222-222222222222'
    WHERE id::TEXT = current_setting('test.session1_id', true);
    RAISE EXCEPTION 'TEST 9 FAILED: user1 reassigned session ownership';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST 9 PASSED: user_id column not writable by authenticated';
  END;
END;
$$;

RESET ROLE;

-- ── TEST 10: anon has zero access ──────────────────────────────────────────
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.chat_sessions LIMIT 1;
    RAISE EXCEPTION 'TEST 10 FAILED: anon could query chat_sessions';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST 10 PASSED: anon has no access to chat_sessions';
  END;
END;
$$;
RESET ROLE;

ROLLBACK;  -- Discard all test data
