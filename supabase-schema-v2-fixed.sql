-- Supabase Schema v2 — Ozar Chachamim with 992 Sages + Research Content

-- 1. User profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Research history
CREATE TABLE public.user_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sage_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);
CREATE INDEX ON user_history(user_id, sage_id);

-- 3. Bookmarks
CREATE TABLE public.bookmarks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sage_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, sage_id)
);

-- 4. Sages Master Data (992 entries)
CREATE TABLE public.sages (
  id BIGSERIAL PRIMARY KEY,
  sage_id TEXT UNIQUE NOT NULL,
  name_he TEXT NOT NULL,
  name_en TEXT,
  chapter_type TEXT,
  years TEXT,
  area TEXT,
  period_key TEXT,
  main_field TEXT,
  tags TEXT,
  summary TEXT,
  central_idea TEXT,
  related_sages TEXT,
  spotify_link TEXT,
  origin_country TEXT,
  migration_path TEXT,
  geo_region TEXT,
  custom_tradition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON sages(period_key);
CREATE INDEX ON sages(geo_region);
CREATE INDEX ON sages(name_he);
CREATE INDEX ON sages(sage_id);
CREATE INDEX ON sages(main_field);

-- 5. Research Content
CREATE TABLE public.research_content (
  id BIGSERIAL PRIMARY KEY,
  sage_id TEXT UNIQUE NOT NULL REFERENCES sages(sage_id) ON DELETE CASCADE,
  content TEXT,
  source_file TEXT,
  word_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON research_content(sage_id);

-- 6. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_content ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - Profiles
CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 8. RLS Policies - User History
CREATE POLICY "users_read_own_history" ON public.user_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_history" ON public.user_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. RLS Policies - Bookmarks
CREATE POLICY "users_read_own_bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- 10. RLS Policies - Sages (public read)
CREATE POLICY "anyone_read_sages" ON public.sages
  FOR SELECT USING (true);

-- 11. RLS Policies - Research (public read)
CREATE POLICY "anyone_read_research" ON public.research_content
  FOR SELECT USING (true);
