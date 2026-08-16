-- ============================================================================
-- SUPABASE MIGRATION: Personal Area Milestone 2 — initial trial quota grant
-- ============================================================================
--
-- Gap found while wiring up the chat API (Stage 3): Milestone 1's
-- handle_new_user() trigger creates a user_profiles row on signup but never
-- creates a usage_periods row, so reserve_authenticated_question() always
-- returns "No active usage period" for a brand-new user — the "5 free
-- questions on signup" freemium model from the agent plan was never
-- actually wired up.
--
-- This adds a second trigger (kept separate from handle_new_user() so a
-- failure in one doesn't block the other) that grants a 5-question
-- trial_registered usage_period right after the profile row is created.
-- The existing idx_trial_registered_once_per_user unique index (from
-- Milestone 1) already prevents this from ever running twice for the same
-- user, so this trigger doesn't need its own idempotency check.
--
-- Status: PROPOSAL ONLY (not applied remotely)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_initial_trial()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_periods (
    user_id, source_type, period_start, period_end, question_limit
  )
  VALUES (
    NEW.id, 'trial_registered', NOW(), NULL, 5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.grant_initial_trial() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_profile_created_grant_trial ON public.user_profiles;
CREATE TRIGGER on_profile_created_grant_trial
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_initial_trial();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
