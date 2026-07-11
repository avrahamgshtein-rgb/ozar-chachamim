-- ============================================================
-- GraphRAG infrastructure — Masterplan Phase 5 §10
-- Run in the Supabase SQL Editor AFTER supabase-schema-v3.sql.
-- Vector store (pgvector) + graph traversal for complex queries.
-- ============================================================

-- 1. pgvector extension
create extension if not exists vector;

-- 2. Embedding chunks — bios, core concepts and research passages.
--    Dimension 1024 = voyage-3 / voyage-multilingual-2 (Hebrew-capable).
--    If you use another embedder, adjust the dimension here AND in embed.py.
create table if not exists sage_embeddings (
  id         bigserial primary key,
  sage_id    text not null,
  source     text not null check (source in ('bio','core_concept','research')),
  chunk_idx  int  not null default 0,
  content    text not null,
  embedding  vector(1024) not null,
  created_at timestamptz not null default now(),
  unique (sage_id, source, chunk_idx)
);

create index if not exists sage_embeddings_ivfflat
  on sage_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RLS: public read (embeddings contain no secrets), writes via service role only
alter table sage_embeddings enable row level security;
drop policy if exists "public read embeddings" on sage_embeddings;
create policy "public read embeddings" on sage_embeddings
  for select using (true);

-- 3. Semantic search RPC — cosine similarity
create or replace function match_sage_chunks(
  query_embedding vector(1024),
  match_count     int   default 8,
  min_similarity  float default 0.3
)
returns table (
  sage_id    text,
  source     text,
  content    text,
  similarity float
)
language sql stable as $$
  select
    e.sage_id,
    e.source,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from sage_embeddings e
  where 1 - (e.embedding <=> query_embedding) >= min_similarity
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- 4. Graph traversal RPC — chains of influence/transmission
--    ("show the chain from the Maharal to the students of the Besht").
--    NOTE: assumes connections(source_id, target_id, connection_type);
--    adjust column names if your schema differs.
create or replace function find_connection_chain(
  start_id  text,
  end_id    text,
  max_depth int default 6
)
returns table (
  depth int,
  path  text[]
)
language sql stable as $$
  with recursive walk as (
    select 1 as depth,
           array[c.source_id, c.target_id] as path,
           c.target_id as frontier
    from connections c
    where c.source_id = start_id

    union all

    select w.depth + 1,
           w.path || c.target_id,
           c.target_id
    from walk w
    join connections c on c.source_id = w.frontier
    where w.depth < max_depth
      and not c.target_id = any(w.path)   -- no cycles
  )
  select depth, path
  from walk
  where frontier = end_id
  order by depth
  limit 5;
$$;

-- 5. Neighborhood RPC — all sages within N hops (for comparison queries)
create or replace function sage_neighborhood(
  center_id text,
  hops      int default 2
)
returns table (sage_id text, depth int)
language sql stable as $$
  with recursive walk as (
    select center_id as sage_id, 0 as depth
    union
    select case when c.source_id = w.sage_id then c.target_id else c.source_id end,
           w.depth + 1
    from walk w
    join connections c
      on (c.source_id = w.sage_id or c.target_id = w.sage_id)
    where w.depth < hops
  )
  select sage_id, min(depth) as depth
  from walk
  group by sage_id;
$$;
