-- ============================================================================
-- ROLLBACK: Personal Area Milestone 2, Stage 1 (Chat Schema)
-- ============================================================================
--
-- Reverses 20260727_003_personal_area_milestone_2_chat_schema.sql only.
-- Does NOT touch Milestone 1 tables (user_profiles, usage_periods, etc.) —
-- those have their own rollback script.
--
-- WARNING: This deletes all chat history. Ensure data is backed up first.
-- ============================================================================

-- ============================================================================
-- PART 1: DROP TRIGGERS AND FUNCTIONS
-- ============================================================================

DROP TRIGGER IF EXISTS on_chat_session_update ON public.chat_sessions;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

DROP TRIGGER IF EXISTS on_chat_message_insert ON public.chat_messages;
DROP FUNCTION IF EXISTS public.touch_chat_session_on_message() CASCADE;

-- ============================================================================
-- PART 2: DROP TABLES (reverse dependency order)
-- ============================================================================

DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
