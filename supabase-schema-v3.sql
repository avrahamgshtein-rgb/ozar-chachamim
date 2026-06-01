-- ============================================================================
-- SUPABASE SCHEMA v3: Ozar Chachamim
-- Full Backend for Yeshiva Research Platform
-- ============================================================================

-- ============================================================================
-- PART 1: CORE SAGE DATA (from "חכמי ישראל.xlsx")
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sages (
  id TEXT PRIMARY KEY,

  -- Basic Identity
  name_he TEXT NOT NULL,
  name_en TEXT,
  chapter_type TEXT, -- 'טקסט יסוד', 'דמות', etc.

  -- Historical Context
  era TEXT NOT NULL, -- 'Second Temple', 'Tannaim', 'Rishonim', etc.
  era_key TEXT, -- Lowercase key: 'second-temple', 'tannaim'
  years_range TEXT, -- e.g., "סביב 190 לפנה״ס"
  period_order INTEGER, -- Chronological order (0=ancient, 6=modern)

  -- Geography
  region TEXT, -- e.g., "ירושלים", "אלכסנדריה"
  coordinates JSONB, -- {lat: 31.768, lng: 35.214}
  migration_path TEXT, -- For historical migration tracking

  -- Content & Fields
  primary_field TEXT, -- Main field of expertise
  tags TEXT, -- Comma-separated tags
  summary TEXT, -- Biography (2-3 sentences)
  core_concept TEXT, -- Central innovation ("רעיון מרכזי")

  -- External Links
  spotify_url TEXT,
  wikipedia_url TEXT,
  other_sources JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_for_search BOOLEAN DEFAULT FALSE,

  -- Constraints
  CONSTRAINT name_required CHECK (name_he IS NOT NULL OR name_en IS NOT NULL)
);

-- Indexes for fast queries
CREATE INDEX idx_sages_era ON public.sages(era);
CREATE INDEX idx_sages_region ON public.sages(region);
CREATE INDEX idx_sages_period ON public.sages(period_order);
CREATE INDEX idx_sages_field ON public.sages(primary_field);
CREATE INDEX idx_sages_name_he ON public.sages(name_he);

-- Full-text search index (PostgreSQL)
ALTER TABLE public.sages ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX idx_sages_search ON public.sages USING GIN (search_vector);

-- ============================================================================
-- PART 2: RELATIONSHIPS & CONNECTIONS (prevents "node not found" errors)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.connections (
  id BIGSERIAL PRIMARY KEY,

  -- Source & Target (with FK validation)
  source_id TEXT NOT NULL REFERENCES public.sages(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES public.sages(id) ON DELETE CASCADE,

  -- Relationship Type
  connection_type TEXT NOT NULL, -- 'student', 'influence', 'oppose', 'colleague', 'predecessor'

  -- Metadata
  historical_period TEXT, -- When this relationship existed
  notes TEXT, -- Additional context

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT different_nodes CHECK (source_id != target_id),
  CONSTRAINT valid_connection_type CHECK (
    connection_type IN ('student', 'influence', 'oppose', 'colleague', 'predecessor', 'teacher', 'contemporary')
  )
);

-- Indexes for fast relationship queries
CREATE INDEX idx_connections_source ON public.connections(source_id);
CREATE INDEX idx_connections_target ON public.connections(target_id);
CREATE INDEX idx_connections_type ON public.connections(connection_type);
CREATE INDEX idx_connections_both ON public.connections(source_id, target_id);

-- ============================================================================
-- PART 3: RESEARCH CONTENT (Word docs -> Supabase Storage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.research_content (
  id BIGSERIAL PRIMARY KEY,

  -- Reference to sage
  sage_id TEXT NOT NULL UNIQUE REFERENCES public.sages(id) ON DELETE CASCADE,

  -- Content Storage
  content_type TEXT, -- 'word_doc', 'markdown', 'html'
  content_text TEXT, -- Full research text (plain or markdown)
  content_summary TEXT, -- Key points summary

  -- Source Tracking
  source_file TEXT, -- Original filename (e.g., "הרשב״ם.docx")
  source_path TEXT, -- Supabase Storage path
  word_count INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,

  CONSTRAINT content_exists CHECK (content_text IS NOT NULL OR source_path IS NOT NULL)
);

CREATE INDEX idx_research_sage ON public.research_content(sage_id);

-- ============================================================================
-- PART 4: USER FEATURES (Authentication via Supabase Auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  display_name TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'he', -- 'he' or 'en'
  theme TEXT DEFAULT 'light', -- 'light' or 'dark'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id BIGSERIAL PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sage_id TEXT NOT NULL REFERENCES public.sages(id) ON DELETE CASCADE,

  note TEXT, -- User's personal note
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicates
  UNIQUE(user_id, sage_id)
);

CREATE INDEX idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_sage ON public.bookmarks(sage_id);

-- User History (what they viewed)
CREATE TABLE IF NOT EXISTS public.view_history (
  id BIGSERIAL PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sage_id TEXT NOT NULL REFERENCES public.sages(id) ON DELETE CASCADE,

  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  context TEXT, -- Where they came from (graph, search, map, etc.)

  CONSTRAINT valid_context CHECK (context IN ('graph', 'search', 'map', 'traditions', 'ideas', 'direct'))
);

CREATE INDEX idx_history_user ON public.view_history(user_id, viewed_at DESC);
CREATE INDEX idx_history_sage ON public.view_history(sage_id);

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.sages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_history ENABLE ROW LEVEL SECURITY;

-- Sages: Everyone can read (public data)
CREATE POLICY "anyone_read_sages" ON public.sages
  FOR SELECT USING (true);

-- Connections: Everyone can read
CREATE POLICY "anyone_read_connections" ON public.connections
  FOR SELECT USING (true);

-- Research: Everyone can read
CREATE POLICY "anyone_read_research" ON public.research_content
  FOR SELECT USING (true);

CREATE POLICY "anyone_insert_research" ON public.research_content
  FOR INSERT WITH CHECK (true);

-- Profiles: Users can only read their own
CREATE POLICY "users_read_own_profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Bookmarks: Users can only see their own
CREATE POLICY "users_read_own_bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- History: Users can only see their own
CREATE POLICY "users_read_own_history" ON public.view_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_history" ON public.view_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PART 6: HELPER FUNCTIONS
-- ============================================================================

-- Function to update search vector when sage is created/updated
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

-- Trigger for search vector updates
DROP TRIGGER IF NOT EXISTS trg_update_sage_search_vector ON public.sages;
CREATE TRIGGER trg_update_sage_search_vector
  BEFORE INSERT OR UPDATE ON public.sages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sage_search_vector();

-- Function to log view history
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
-- PART 7: VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Sage with connection count
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

-- Connection with sage names
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
-- PART 8: GRANTS
-- ============================================================================

-- Public read access to core tables
GRANT SELECT ON public.sages TO anon;
GRANT SELECT ON public.connections TO anon;
GRANT SELECT ON public.research_content TO anon;
GRANT SELECT ON public.sages_with_stats TO anon;
GRANT SELECT ON public.connections_with_names TO anon;

-- Authenticated users can manage their own data
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT SELECT, INSERT ON public.view_history TO authenticated;
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.sages IS 'Master sage data from "חכמי ישראל.xlsx". 992 potential sages with metadata.';
COMMENT ON TABLE public.connections IS 'Relationships between sages. Foreign keys ensure data integrity (no "node not found" errors).';
COMMENT ON TABLE public.research_content IS 'Deep research papers converted from Word docs to text.';
COMMENT ON TABLE public.user_profiles IS 'User account metadata (language, theme preferences).';
COMMENT ON TABLE public.bookmarks IS 'User-saved favorite sages for study.';
COMMENT ON TABLE public.view_history IS 'Tracks what sages users have researched (for recommendations, history).';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
