-- Supabase Schema for Ozar Chachamim
-- Copy-paste into SQL Editor at https://supabase.com

-- 1. User profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  created_at timestamptz default now()
);

-- 2. Research history
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

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.user_history enable row level security;
alter table public.bookmarks enable row level security;

create policy "own profile" on public.profiles
  using (auth.uid() = id);

create policy "own history" on public.user_history
  using (auth.uid() = user_id);

create policy "own bookmarks" on public.bookmarks
  using (auth.uid() = user_id);
