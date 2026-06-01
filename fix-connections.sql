-- Drop and recreate connections table with proper RLS
DROP TABLE IF EXISTS public.connections CASCADE;

CREATE TABLE public.connections (
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

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Allow public READ and INSERT
CREATE POLICY "anyone_read_connections" ON public.connections FOR SELECT USING (true);
CREATE POLICY "anyone_insert_connections" ON public.connections FOR INSERT WITH CHECK (true);
