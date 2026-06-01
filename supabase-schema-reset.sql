-- ============================================================================
-- RESET & RECREATE SCHEMA (Drop existing tables first)
-- ============================================================================

-- Drop existing tables (in correct order for FK dependencies)
DROP TABLE IF EXISTS public.view_history CASCADE;
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.research_content CASCADE;
DROP TABLE IF EXISTS public.connections CASCADE;
DROP TABLE IF EXISTS public.sages CASCADE;

-- Drop views
DROP VIEW IF EXISTS public.sages_with_stats CASCADE;
DROP VIEW IF EXISTS public.connections_with_names CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_sage_search_vector() CASCADE;
DROP FUNCTION IF EXISTS public.log_view_history(UUID, TEXT, TEXT) CASCADE;

-- ============================================================================
-- Now create everything fresh
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sages (
  id TEXT PRIMARY KEY,
  name_he TEXT NOT NULL,
  name_en TEXT,
  chapter_type TEXT,
  era TEXT NOT NULL,
  era_key TEXT,
  years_range TEXT,
  period_order INTEGER,
  region TEXT,
  coordinates JSONB,
  migration_path TEXT,
  primary_field TEXT,
  tags TEXT,
  summary TEXT,
  core_concept TEXT,
  spotify_url TEXT,
  wikipedia_url TEXT,
  other_sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_for_search BOOLEAN DEFAULT FALSE,
  CONSTRAINT name_required CHECK (name_he IS NOT NULL OR name_en IS NOT NULL)
);

CREATE INDEX idx_sages_era ON public.sages(era);
CREATE INDEX idx_sages_region ON public.sages(region);
CREATE INDEX idx_sages_period ON public.sages(period_order);
CREATE INDEX idx_sages_field ON public.sages(primary_field);
CREATE INDEX idx_sages_name_he ON public.sages(name_he);

ALTER TABLE public.sages ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX idx_sages_search ON public.sages USING GIN (search_vector);

-- ============================================================================
-- CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connections (
  id BIGSERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES public.sages(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES public.sages(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL,
  historical_period TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_nodes CHECK (source_id != target_id),
  CONSTRAINT valid_connection_type CHECK (
    connection_type IN ('student', 'influence', 'oppose', 'colleague', 'predecessor', 'teacher', 'contemporary')
  )
);

CREATE INDEX idx_connections_source ON public.connections(source_id);
CREATE INDEX idx_connections_target ON public.connections(target_id);
CREATE INDEX idx_connections_type ON public.connections(connection_type);
CREATE INDEX idx_connections_both ON public.connections(source_id, target_id);

-- ============================================================================
-- RESEARCH CONTENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.research_content (
  id BIGSERIAL PRIMARY KEY,
  sage_id TEXT NOT NULL UNIQUE REFERENCES public.sages(id) ON DELETE CASCADE,
  content_type TEXT,
  content_text TEXT,
  content_summary TEXT,
  source_file TEXT,
  source_path TEXT,
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  CONSTRAINT content_exists CHECK (content_text IS NOT NULL OR source_path IS NOT NULL)
);

CREATE INDEX idx_research_sage ON public.research_content(sage_id);

-- ============================================================================
-- USER FEATURES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'he',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sage_id TEXT NOT NULL REFERENCES public.sages(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sage_id)
);

CREATE INDEX idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_sage ON public.bookmarks(sage_id);

CREATE TABLE IF NOT EXISTS public.view_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sage_id TEXT NOT NULL REFERENCES public.sages(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  context TEXT,
  CONSTRAINT valid_context CHECK (context IN ('graph', 'search', 'map', 'traditions', 'ideas', 'direct'))
);

CREATE INDEX idx_history_user ON public.view_history(user_id, viewed_at DESC);
CREATE INDEX idx_history_sage ON public.view_history(sage_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.sages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_sages" ON public.sages FOR SELECT USING (true);
CREATE POLICY "anyone_read_connections" ON public.connections FOR SELECT USING (true);
CREATE POLICY "anyone_read_research" ON public.research_content FOR SELECT USING (true);

CREATE POLICY "users_read_own_profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_read_own_bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_history" ON public.view_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_history" ON public.view_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_sage_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('hebrew', COALESCE(NEW.name_he, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.name_en, '')), 'A') ||
    setweight(to_tsvector('hebrew', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.primary_field, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS trg_update_sage_search_vector ON public.sages;
CREATE TRIGGER trg_update_sage_search_vector
  BEFORE INSERT OR UPDATE ON public.sages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sage_search_vector();

CREATE OR REPLACE FUNCTION public.log_view_history(
  p_user_id UUID,
  p_sage_id TEXT,
  p_context TEXT DEFAULT 'direct'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.view_history (user_id, sage_id, context)
  VALUES (p_user_id, p_sage_id, p_context)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.sages_with_stats AS
SELECT
  s.id,
  s.name_he,
  s.era,
  s.region,
  s.primary_field,
  s.spotify_url,
  (SELECT COUNT(*) FROM public.connections
   WHERE source_id = s.id OR target_id = s.id) as connection_count,
  (SELECT COUNT(*) FROM public.research_content
   WHERE sage_id = s.id) as has_research,
  (SELECT COUNT(*) FROM public.bookmarks
   WHERE sage_id = s.id) as bookmark_count
FROM public.sages s;

CREATE OR REPLACE VIEW public.connections_with_names AS
SELECT
  c.id,
  c.source_id,
  s1.name_he as source_name,
  c.target_id,
  s2.name_he as target_name,
  c.connection_type,
  c.historical_period
FROM public.connections c
JOIN public.sages s1 ON c.source_id = s1.id
JOIN public.sages s2 ON c.target_id = s2.id;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON public.sages TO anon;
GRANT SELECT ON public.connections TO anon;
GRANT SELECT ON public.research_content TO anon;
GRANT SELECT ON public.sages_with_stats TO anon;
GRANT SELECT ON public.connections_with_names TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT SELECT, INSERT ON public.view_history TO authenticated;
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;

-- ============================================================================
-- DONE!
-- ============================================================================
