-- ============================================================================
-- COMPREHENSIVE DATABASE STATE CHECK
-- Run this in Supabase SQL Editor to verify all Phase 4 changes
-- ============================================================================

-- 1. CHECK COLUMNS EXIST IN SAGES TABLE
-- ============================================================================
SELECT
  'COLUMN CHECK' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sages'
  AND column_name IN ('coordinates', 'migration_path')
ORDER BY column_name;

-- 2. CHECK DATA POPULATION
-- ============================================================================
SELECT
  'COORDINATES STATS' as check_type,
  COUNT(*) as total_sages,
  COUNT(CASE WHEN coordinates IS NOT NULL THEN 1 END) as with_coordinates,
  ROUND(100.0 * COUNT(CASE WHEN coordinates IS NOT NULL THEN 1 END) / COUNT(*), 2) as percent_with_coords
FROM public.sages;

SELECT
  'MIGRATION_PATH STATS' as check_type,
  COUNT(*) as total_sages,
  COUNT(CASE WHEN migration_path IS NOT NULL THEN 1 END) as with_migration_path,
  ROUND(100.0 * COUNT(CASE WHEN migration_path IS NOT NULL THEN 1 END) / COUNT(*), 2) as percent_with_migration
FROM public.sages;

-- 3. CHECK RLS POLICIES ON SAGES
-- ============================================================================
SELECT
  'RLS POLICIES - SAGES' as check_type,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sages'
ORDER BY policyname;

-- 4. CHECK RLS POLICIES ON RESEARCH_CONTENT
-- ============================================================================
SELECT
  'RLS POLICIES - RESEARCH' as check_type,
  policyname,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'research_content'
ORDER BY policyname;

-- 5. SAMPLE DATA - SAGES WITH COORDINATES
-- ============================================================================
SELECT
  'SAMPLE COORDINATES' as check_type,
  id,
  name_he,
  region,
  coordinates::text as coord_value,
  era
FROM public.sages
WHERE coordinates IS NOT NULL
LIMIT 5;

-- 6. SAMPLE DATA - SAGES WITH MIGRATION PATHS
-- ============================================================================
SELECT
  'SAMPLE MIGRATION PATHS' as check_type,
  id,
  name_he,
  region,
  migration_path,
  era
FROM public.sages
WHERE migration_path IS NOT NULL
LIMIT 5;

-- 7. TABLE STRUCTURE SUMMARY
-- ============================================================================
SELECT
  'TABLE SUMMARY' as check_type,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('sages', 'connections', 'research_content')
ORDER BY tablename;
