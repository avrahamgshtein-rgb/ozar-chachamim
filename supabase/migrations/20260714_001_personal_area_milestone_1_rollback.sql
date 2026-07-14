-- ============================================================================
-- ROLLBACK: Personal Area Milestone 1
-- ============================================================================
--
-- This script REVERSES all changes from the forward migration:
-- - Drops new tables (cascading)
-- - Drops all functions
-- - Drops new columns from user_profiles
-- - Restores original RLS policies
--
-- IMPORTANT: This is a PROPOSAL and has not been applied.
-- Only apply after successful forward migration if rollback is needed.
-- ============================================================================

-- ============================================================================
-- PART 1: DROP FUNCTIONS (in reverse dependency order)
-- ============================================================================

DROP FUNCTION IF EXISTS public.transfer_anonymous_quota(UUID, UUID);
DROP FUNCTION IF EXISTS public.release_question(UUID, TEXT, UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.confirm_question(UUID, TEXT, UUID, UUID, TEXT, TEXT, INT, INT, DECIMAL);
DROP FUNCTION IF EXISTS public.reserve_question(UUID, UUID);

-- ============================================================================
-- PART 2: DROP TABLES (in reverse dependency order)
-- ============================================================================

DROP TABLE IF EXISTS public.usage_events CASCADE;
DROP TABLE IF EXISTS public.usage_periods CASCADE;
DROP TABLE IF EXISTS public.anonymous_sessions CASCADE;

-- ============================================================================
-- PART 3: RESTORE user_profiles TABLE
-- ============================================================================

-- Remove new columns added in forward migration
ALTER TABLE IF EXISTS public.user_profiles
DROP COLUMN IF EXISTS email_verified_at CASCADE,
DROP COLUMN IF EXISTS language_support CASCADE,
DROP COLUMN IF EXISTS ui_notifications CASCADE,
DROP COLUMN IF EXISTS first_login_at CASCADE,
DROP COLUMN IF EXISTS last_activity_at CASCADE;

-- Restore original RLS policies
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "prevent_user_delete_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

-- Recreate original UPDATE policy (without WITH CHECK, as per original schema v3)
CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
-- All forward migration changes have been reversed.
-- user_profiles table is restored to original state.
-- No data was deleted (as tables were empty).
