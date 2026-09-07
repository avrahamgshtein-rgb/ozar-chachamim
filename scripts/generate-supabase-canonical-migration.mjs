#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const graphPath = resolve(repoRoot, 'nextjs-app/public/data.json')
const outputPath = resolve(repoRoot, 'supabase-canonical-sync-2026-07-21.sql')
const graph = JSON.parse(await readFile(graphPath, 'utf8'))
const periodOrder = new Map([
  ['second-temple', 0],
  ['tannaim', 1],
  ['amoraim', 2],
  ['geonim', 3],
  ['rishonim', 4],
  ['acharonim', 5],
  ['modern', 6],
])

function textOrNull(value) {
  if (value == null) return null
  if (Array.isArray(value)) return value.join(', ')
  const text = String(value).trim()
  return text || null
}

const sages = graph.nodes.map(node => ({
  id: String(node.id),
  name_he: textOrNull(node.label),
  name_en: textOrNull(node.name_en),
  chapter_type: textOrNull(node.chapter_type),
  era: textOrNull(node.era_key) || 'modern',
  era_key: textOrNull(node.era_key) || 'modern',
  years_range: textOrNull(node.era),
  period_order: periodOrder.get(node.era_key) ?? 6,
  region: textOrNull(node.location),
  migration_path: node.migration_path == null
    ? null
    : (typeof node.migration_path === 'string' ? node.migration_path : JSON.stringify(node.migration_path)),
  primary_field: textOrNull(node.field),
  tags: textOrNull(node.tags),
  summary: textOrNull(node.bio),
  core_concept: textOrNull(node.central_idea),
  spotify_url: textOrNull(node.spotify_url),
  birth_year: Number.isFinite(Number(node.birth_year)) ? Number(node.birth_year) : null,
  death_year: Number.isFinite(Number(node.death_year)) ? Number(node.death_year) : null,
}))

const connections = graph.links.map(link => {
  const metadata = Object.fromEntries(
    Object.entries(link).filter(([key, value]) =>
      !['source', 'target', 'type', 'period'].includes(key) && value != null && value !== ''),
  )
  return {
    source_id: String(link.source),
    target_id: String(link.target),
    connection_type: textOrNull(link.type) || 'colleague',
    historical_period: textOrNull(link.period),
    notes: Object.keys(metadata).length ? JSON.stringify(metadata) : null,
  }
})

const sageJson = JSON.stringify(sages)
const connectionJson = JSON.stringify(connections)
for (const payload of [sageJson, connectionJson]) {
  if (payload.includes('$canonical_json$')) throw new Error('Unexpected SQL dollar-quote marker in payload')
}

const sql = `-- Ozar Chachamim canonical graph sync — generated 2026-07-21
-- Source: nextjs-app/public/data.json (${sages.length} sages, ${connections.length} connections)
-- Safety model: preserve legacy tables and user foreign keys; switch only the public read views.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(hashtext('ozar-chachamim-canonical-sync'));

-- One-time recoverable snapshots of the legacy app state.
CREATE TABLE IF NOT EXISTS public.sync_backup_sages_20260721 AS TABLE public.sages WITH DATA;
CREATE TABLE IF NOT EXISTS public.sync_backup_connections_20260721 AS TABLE public.connections WITH DATA;
CREATE TABLE IF NOT EXISTS public.sync_backup_research_content_20260721 AS TABLE public.research_content WITH DATA;

ALTER TABLE public.sync_backup_sages_20260721 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_backup_connections_20260721 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_backup_research_content_20260721 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sync_backup_sages_20260721 FROM anon, authenticated;
REVOKE ALL ON public.sync_backup_connections_20260721 FROM anon, authenticated;
REVOKE ALL ON public.sync_backup_research_content_20260721 FROM anon, authenticated;

-- Canonical tables are deliberately separate: legacy IDs and their user references stay intact.
CREATE TABLE IF NOT EXISTS public.canonical_sages (
  id TEXT PRIMARY KEY,
  name_he TEXT,
  name_en TEXT,
  chapter_type TEXT,
  era TEXT,
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
  birth_year INTEGER,
  death_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT canonical_sage_name_required CHECK (name_he IS NOT NULL OR name_en IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.canonical_connections (
  id BIGSERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES public.canonical_sages(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES public.canonical_sages(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL,
  historical_period TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT canonical_connections_different_nodes CHECK (source_id <> target_id),
  CONSTRAINT canonical_connections_valid_type CHECK (
    connection_type IN ('student', 'influence', 'oppose', 'colleague', 'predecessor', 'teacher', 'contemporary', 'family')
  ),
  CONSTRAINT canonical_connections_unique UNIQUE (source_id, target_id, connection_type)
);

ALTER TABLE public.canonical_sages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canonical_sages FROM anon, authenticated;
REVOKE ALL ON public.canonical_connections FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS canonical_sages_period_idx ON public.canonical_sages(period_order);
CREATE INDEX IF NOT EXISTS canonical_sages_era_idx ON public.canonical_sages(era_key);
CREATE INDEX IF NOT EXISTS canonical_connections_source_idx ON public.canonical_connections(source_id);
CREATE INDEX IF NOT EXISTS canonical_connections_target_idx ON public.canonical_connections(target_id);
CREATE INDEX IF NOT EXISTS canonical_connections_type_idx ON public.canonical_connections(connection_type);

CREATE TEMP TABLE _canonical_sages_stage ON COMMIT DROP AS
SELECT *
FROM jsonb_to_recordset($canonical_json$${sageJson}$canonical_json$::jsonb) AS row(
  id TEXT,
  name_he TEXT,
  name_en TEXT,
  chapter_type TEXT,
  era TEXT,
  era_key TEXT,
  years_range TEXT,
  period_order INTEGER,
  region TEXT,
  migration_path TEXT,
  primary_field TEXT,
  tags TEXT,
  summary TEXT,
  core_concept TEXT,
  spotify_url TEXT,
  birth_year INTEGER,
  death_year INTEGER
);

INSERT INTO public.canonical_sages (
  id, name_he, name_en, chapter_type, era, era_key, years_range, period_order,
  region, migration_path, primary_field, tags, summary, core_concept, spotify_url,
  birth_year, death_year, updated_at
)
SELECT
  id, name_he, name_en, chapter_type, era, era_key, years_range, period_order,
  region, migration_path, primary_field, tags, summary, core_concept, spotify_url,
  birth_year, death_year, NOW()
FROM _canonical_sages_stage
ON CONFLICT (id) DO UPDATE SET
  name_he = EXCLUDED.name_he,
  name_en = EXCLUDED.name_en,
  chapter_type = EXCLUDED.chapter_type,
  era = EXCLUDED.era,
  era_key = EXCLUDED.era_key,
  years_range = EXCLUDED.years_range,
  period_order = EXCLUDED.period_order,
  region = EXCLUDED.region,
  migration_path = EXCLUDED.migration_path,
  primary_field = EXCLUDED.primary_field,
  tags = EXCLUDED.tags,
  summary = EXCLUDED.summary,
  core_concept = EXCLUDED.core_concept,
  spotify_url = EXCLUDED.spotify_url,
  birth_year = EXCLUDED.birth_year,
  death_year = EXCLUDED.death_year,
  updated_at = NOW();

DELETE FROM public.canonical_connections;
DELETE FROM public.canonical_sages
WHERE id NOT IN (SELECT id FROM _canonical_sages_stage);

INSERT INTO public.canonical_connections (
  source_id, target_id, connection_type, historical_period, notes
)
SELECT source_id, target_id, connection_type, historical_period, notes
FROM jsonb_to_recordset($canonical_json$${connectionJson}$canonical_json$::jsonb) AS row(
  source_id TEXT,
  target_id TEXT,
  connection_type TEXT,
  historical_period TEXT,
  notes TEXT
);

CREATE OR REPLACE VIEW public.sages_with_stats AS
SELECT
  s.id,
  s.name_he,
  s.name_en,
  s.era,
  s.era_key,
  s.period_order,
  s.region,
  s.primary_field,
  s.tags,
  s.summary,
  s.core_concept,
  s.spotify_url,
  s.coordinates,
  s.migration_path,
  (SELECT COUNT(*) FROM public.canonical_connections c
   WHERE c.source_id = s.id OR c.target_id = s.id) AS connection_count,
  (SELECT COUNT(*) FROM public.research_content r WHERE r.sage_id = s.id) AS has_research,
  (SELECT COUNT(*) FROM public.bookmarks b WHERE b.sage_id = s.id) AS bookmark_count
FROM public.canonical_sages s;

CREATE OR REPLACE VIEW public.connections_with_names AS
SELECT
  c.id,
  c.source_id,
  source.name_he AS source_name,
  c.target_id,
  target.name_he AS target_name,
  c.connection_type,
  c.historical_period
FROM public.canonical_connections c
JOIN public.canonical_sages source ON source.id = c.source_id
JOIN public.canonical_sages target ON target.id = c.target_id;

GRANT SELECT ON public.sages_with_stats TO anon, authenticated;
GRANT SELECT ON public.connections_with_names TO anon, authenticated;

DO $validation$
DECLARE
  sage_count INTEGER;
  connection_count INTEGER;
  family_count INTEGER;
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sage_count FROM public.sages_with_stats;
  SELECT COUNT(*) INTO connection_count FROM public.connections_with_names;
  SELECT COUNT(*) INTO family_count FROM public.canonical_connections WHERE connection_type = 'family';
  SELECT COUNT(*) INTO orphan_count
  FROM public.canonical_connections c
  LEFT JOIN public.canonical_sages source ON source.id = c.source_id
  LEFT JOIN public.canonical_sages target ON target.id = c.target_id
  WHERE source.id IS NULL OR target.id IS NULL;

  IF sage_count <> ${sages.length} THEN
    RAISE EXCEPTION 'Canonical sage count mismatch: %', sage_count;
  END IF;
  IF connection_count <> ${connections.length} THEN
    RAISE EXCEPTION 'Canonical connection count mismatch: %', connection_count;
  END IF;
  IF family_count <> ${connections.filter(connection => connection.connection_type === 'family').length} THEN
    RAISE EXCEPTION 'Canonical family count mismatch: %', family_count;
  END IF;
  IF orphan_count <> 0 THEN
    RAISE EXCEPTION 'Canonical orphan connection count: %', orphan_count;
  END IF;
END;
$validation$;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Verification after commit:
SELECT
  (SELECT COUNT(*) FROM public.sages_with_stats) AS sages,
  (SELECT COUNT(*) FROM public.connections_with_names) AS connections,
  (SELECT COUNT(*) FROM public.canonical_connections WHERE connection_type = 'family') AS family_connections;
`

await writeFile(outputPath, sql, 'utf8')
process.stdout.write(`Generated ${outputPath}\n`)
