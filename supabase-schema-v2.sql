-- Supabase Schema v2 — Ozar Chachamim with 992 Sages + Research Content
-- Copy-paste into SQL Editor at https://supabase.com

-- 1. User profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

-- 2. Research history (what user viewed)
create table public.user_history (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  sage_id text not null,
  viewed_at timestamptz default now(),
  note text
);
create index on user_history(user_id, sage_id);

-- 3. Bookmarks
create table public.bookmarks (
  user_id uuid references auth.users(id) on delete cascade,
  sage_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, sage_id)
);

-- 4. Sages Master Data (992 entries from Excel)
create table public.sages (
  id bigserial primary key,
  sage_id text unique not null,         -- Unique identifier (e.g. "1", "رمب״ם", etc.)
  name_he text not null,                -- Hebrew name
  name_en text,                         -- English name (if available)
  chapter_type text,                    -- Chapter type from Excel
  years text,                           -- Approximate years/dates
  area text,                            -- Geographic area
  period_key text,                      -- Period: second-temple, tannaim, rishonim, acharonim, modern
  main_field text,                      -- Main field/topic (הלכה, קבלה, etc.)
  tags text,                            -- Comma-separated tags
  summary text,                         -- Brief summary
  central_idea text,                    -- Key idea/innovation
  related_sages text,                   -- Comma-separated related sage IDs
  spotify_link text,                    -- Podcast/audio link if available

  -- UI metadata for website
  origin_country text,                  -- Country of origin
  migration_path text,                  -- Migration history (comma-separated)
  geo_region text,                      -- Geographic region (land-of-israel, spain, etc.)
  custom_tradition text,                -- Tradition/school

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for fast queries
create index on sages(period_key);
create index on sages(geo_region);
create index on sages(name_he);
create index on sages(sage_id);
create index on sages(main_field);

-- 5. Research Content (full research articles for ~40 sages)
create table public.research_content (
  id bigserial primary key,
  sage_id text unique not null references sages(sage_id) on delete cascade,
  content text,                         -- Full research content (markdown)
  source_file text,                     -- Original Word filename
  word_count int,                       -- Number of words
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on research_content(sage_id);

-- 6. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.user_history enable row level security;
alter table public.bookmarks enable row level security;
alter table public.sages enable row level security;
alter table public.research_content enable row level security;

-- 7. RLS Policies - Profiles (users can only see their own)
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "users_update_own_profile" on public.profiles
  for update using (auth.uid() = id);

-- 8. RLS Policies - User History (users see only their own)
create policy "users_read_own_history" on public.user_history
  for select using (auth.uid() = user_id);

create policy "users_insert_own_history" on public.user_history
  for insert with check (auth.uid() = user_id);

-- 9. RLS Policies - Bookmarks (users see only their own)
create policy "users_read_own_bookmarks" on public.bookmarks
  for select using (auth.uid() = user_id);

create policy "users_insert_own_bookmarks" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "users_delete_own_bookmarks" on public.bookmarks
  for delete using (auth.uid() = user_id);

-- 10. RLS Policies - Sages (everyone can read, no sensitive data)
create policy "anyone_read_sages" on public.sages
  for select using (true);

-- 11. RLS Policies - Research Content (everyone can read)
create policy "anyone_read_research" on public.research_content
  for select using (true);

-- 12. Optionally: Full-text search index (advanced feature for later)
-- create index on sages using gin (to_tsvector('hebrew', name_he || ' ' || coalesce(summary, '')));
