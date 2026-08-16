-- ============================================================================
-- ROLLBACK: Personal Area Milestone 1 (REVISED v2.0)
-- ============================================================================
--
-- This script REVERSES all changes from the forward migration.
-- Applied in reverse dependency order.
--
-- WARNING: This removes all tables and functions created in Milestone 1.
-- Ensure data is backed up before running.
--
-- ============================================================================

-- ============================================================================
-- PART 1: DROP FUNCTIONS (reverse dependency order)
-- ============================================================================

DROP FUNCTION IF EXISTS public.transfer_anonymous_quota(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.reserve_anonymous_question(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.confirm_anonymous_question(TEXT, TEXT, TEXT, TEXT, BIGINT, BIGINT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.release_authenticated_question(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.confirm_authenticated_question(TEXT, TEXT, TEXT, BIGINT, BIGINT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.reserve_authenticated_question(TEXT) CASCADE;

-- Trigger and function for profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================================
-- PART 2: DROP TABLES (reverse dependency order)
-- ============================================================================

DROP TABLE IF EXISTS public.usage_events CASCADE;
DROP TABLE IF EXISTS public.usage_reservations CASCADE;
DROP TABLE IF EXISTS public.usage_periods CASCADE;
DROP TABLE IF EXISTS public.anonymous_sessions CASCADE;

-- ============================================================================
-- PART 3: RESTORE user_profiles RLS POLICIES
-- ============================================================================

-- Remove new RLS policies
DROP POLICY IF EXISTS "users_cannot_insert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile_limited" ON public.user_profiles;
DROP POLICY IF EXISTS "prevent_user_delete_own_profile" ON public.user_profiles;

-- Restore original RLS policies (v3 baseline)
CREATE POLICY "users_read_own_profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
-- All Milestone 1 changes have been reversed.
-- user_profiles table restored to original v3 state.
-- Remote schema returned to baseline (pre-Milestone 1).
-- No data was deleted (as tables were empty at migration time).
