# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout — read this first

This repo contains **two generations of the same project**. Only one is live:

- **`nextjs-app/`** — the active, deployed app (Next.js 15 + React 19). `.github/workflows/deploy.yml` builds and deploys *this* directory to Vercel on every push to `main`. All feature work happens here.
- **Repo root** (everything outside `nextjs-app/`) — a legacy vanilla-JS/Supabase prototype (`index.html`, `graph.js`, `styles-graph.css`, dozens of one-off `*.md` status reports, migration scripts, scratch JSON exports). It is **not deployed** (its `vercel.json`/`package.json` are stale) and should be treated as historical reference only, not a place to add features.
- **`data/`** (repo root) — source-of-truth spreadsheet: `חכמי ישראל.csv` / `.xlsx`, plus `sources/**/*.docx` research documents. This is where a human updates sage data; `nextjs-app/public/data.json` is *generated/curated from* this file, not the other way around.
- **`supabase/`** (repo root) — SQL migrations for a separate "Personal Area" feature (user profiles, quotas). `migrations/` is applied by the Supabase CLI in filename order; `rollbacks/` and `tests/` are kept out of the migrations directory on purpose so the CLI doesn't auto-run them. As of this writing only Milestone 1 (schema + RLS) exists — no API routes or UI consume it yet.

Everything below refers to `nextjs-app/` unless stated otherwise.

## Commands

Run from `nextjs-app/`:

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build         # production build — do this before pushing anything touching data.json,
                      # AppShell.tsx, or the viz components; it catches type errors tsc alone can miss
npm run start         # serve the production build locally (useful for testing Leaflet/Supabase fallback timing)
npm run type-check    # tsc --noEmit
```

There is no test suite or linter wired up (`eslint: { ignoreDuringBuilds: true }` in `next.config.ts`, no jest/vitest/playwright in `package.json`). `npm run build` + `npm run type-check` are the only automated checks — treat a clean build as the bar for "done."

Deployment is automatic: push to `main` → GitHub Action (`.github/workflows/deploy.yml`) builds `nextjs-app/` and deploys to Vercel. There's no staging branch; `main` is production.

## Architecture

### Data pipeline: CSV → data.json → app

1. **`data/חכמי ישראל.csv`** is the canonical source. Each row has a `מזהה` (id) column — **this id is the stable identity key across the entire system**: it's reused verbatim as the sage's `id` in `data.json`, the filename for research docs (`public/research/<id>.json`), and the key in `data-patch.json`. Never renumber an existing id when regenerating data — that breaks research file links and any external references. The same CSV id can appear on multiple rows (one person can have several "episode" rows with different content angles); dedupe by name, not by id, when rebuilding.
2. **`public/data.json`** (`{ nodes: Sage[], links: Connection[] }`) is the canonical dataset consumed by the app. Raw node fields (`era`, `era_key`, `era_label`, `central_idea`, `chapter_type`, comma-string `tags`) get remapped to the `Sage` type by `lib/serverData.ts` (server) and `lib/supabase.ts::fetchLocalGraphData` (client) — the two mappers must stay in sync if you add a field.
3. **`era_key`** must be one of the 11 `Period` values in `lib/types.ts` (`patriarchs…modern`). In practice almost everything pre-rabbinic gets bucketed into `second-temple` — there's no dedicated UI treatment for `patriarchs`/`exodus`/`judges`/`kings` in the main dataset; those only appear via per-id overrides in `data-patch.json` (see below). When mapping a new/free-text era label to a key, check `data.json` first for an existing `era_label → era_key` precedent before guessing.
4. **`data-patch.json`** applies small field overrides (works lists, more precise `period`/`birth_year`/`death_year` for a handful of biblical figures) *client-side only*, in `AppShell.tsx`. It is **not** applied by `lib/serverData.ts`, so the individual sage page and the graph/map/timeline tabs can show slightly different period classifications for the same person — this is a known asymmetry, not a bug to silently "fix" by cross-wiring the two loaders.
5. `data-supplement*.json`, `data-ancient.json`, and `data-research-links.json` **do not exist anymore** — they held sages added by hand in past sessions without a source row in the CSV, and were deleted when the dataset was rebuilt from the master file. Do not recreate this pattern; every sage must trace back to a CSV row.
6. Research documents: `public/research/<id>.json` (Hebrew, canonical) plus optional `<id>.en.json` / `<id>.ru.json` translations, each an array of `{ title, source_file, word_count, content }`. Served two ways: `ResearchSection.tsx` fetches `/research/<id>.<locale>.json` directly (static file, falls back to Hebrew on 404), and `app/api/research/[id]/route.ts` exists as an alternate lazy-loading path with a 1-day cache header. Translations are produced by an offline script against the Claude API (see the `nextjs-app/public/research/` directory) — never invent a translation by hand-editing content, and never delete/gitignore a translation file without explicit approval, since the two locale files are the deliverable of a paid batch job.

### Client data loading has two independent sources that can disagree

`AppShell.tsx`'s bootstrap effect fetches from **Supabase first** (`sages_with_stats` / `connections_with_names` tables), and only falls back to the static `data.json` when Supabase returns fewer than 300 sages or 100 connections. In practice Supabase has historically lagged behind `data.json` (fewer sages/connections than the file), so the fallback fires and `data.json` wins — this is intentional graceful-degradation, not a race condition to "fix" by removing the Supabase call. If you change the sage/connection count meaningfully in `data.json`, remember Supabase is a *separate, independently-populated* datastore that this logic does not write back to.

The individual sage page (`app/[locale]/sage/[id]/page.tsx`) is server-rendered and reads **only** `data.json` via `lib/serverData.ts` (bundled at build time, not fetched over HTTP — `public/` isn't readable via `fs` in Vercel's serverless functions). It never touches Supabase.

### Locale routing

Three locales (`he`/`en`/`ru`), Hebrew is canonical/default. `middleware.ts` redirects bare paths to `/<locale>/...` based on `Accept-Language`, and passes through anything already locale-prefixed. `app/[locale]/layout.tsx` sets `lang`/`dir` and locale-specific metadata. Non-Hebrew content is an **overlay**, not a translation of the dataset: `lib/contentOverlay.ts` fetches `public/i18n/sages.<locale>.json` and merges translated fields (`label`, `bio`, `core_concept`, `field`, `location`) over the Hebrew `Sage` objects at load time; sages without an overlay entry silently keep their Hebrew label unless a `name_en` exists.

### Visualization tabs

`AppShell.tsx` orchestrates seven tabs (`Tab` type in `lib/types.ts`): network graph, geography map, traditions, table, timeline, genealogy tree, about. Two different mounting strategies are in play — worth knowing before debugging a "tab shows nothing" report:
- **Graph and map tabs stay mounted permanently**, just toggled via a `hidden`/`block` CSS class, so their data-loading `useEffect`s fire once on initial app load regardless of which tab is active.
- **Traditions, timeline, table, genealogy, about are conditionally rendered** (`{activeTab === 'x' && <Component/>}`) — they mount fresh each time the user switches to them.

`GeoMap.tsx` (Leaflet) depends on its container having non-zero size at init; because it's always-mounted it can initialize while `display:none`, so it explicitly calls `map.invalidateSize()` on an `activeTab`-change effect to recover. `GenealogyTree.tsx` and `NetworkGraph.tsx` drive their D3 force simulations manually (`sim.stop()` + explicit `sim.tick()` in an RAF loop, not the automatic timer) for main-thread-friendly batching — if you touch simulation code here, remember `d3-force` only dispatches its `'tick'` event when the simulation runs its own timer, **not** on manual `.tick()` calls, so any per-tick DOM update must be invoked directly, not just registered via `.on('tick', …)`.

### State

Single Zustand store (`store/useAppStore.ts`): sages/connections/sageMap, selection, active tab, theme (persisted to `localStorage`), and filter state (period/region/field/free-text search via `lib/search.ts`'s Hebrew-aware fuzzy matcher — nikud/gershayim/final-letter insensitive). Filtering is recomputed into `filteredSages` on every filter-setter call rather than derived lazily.

### Content conventions (data, not code, but frequently touched together)

- **Period keys**: `patriarchs, exodus, judges, kings, second-temple, tannaim, amoraim, geonim, rishonim, acharonim, modern` (`lib/types.ts::ALL_PERIODS`, chronological order — this order drives the timeline and genealogy-tree band layout).
- **Connection types**: `student, teacher, colleague, influence, oppose, predecessor, contemporary, family`.
- **Region keys**: `ashkenaz, east-europe, tsarfat, provence, sefarad, italy, north-africa, mizrach, eretz-israel, other` — derived from free-text `location` via `lib/regions.ts::regionsOf` (keyword matching), not stored directly on most sages.
- Hebrew is written with proper גרשיים (e.g. `רמב״ם`, not `רמבם`), and RTL is the default direction; English/Russian content is LTR overlay only.

## Research Document Ingestion Workflow

When adding research documents from Google Drive to existing sages:

### Setup
1. **Manifest file**: Create or update a JSON manifest at `/tmp/claude-0/-home-user/4ee6b46b-17bb-58f3-a062-e7061ae6d87c/scratchpad/approved_46_minus_7.json` with an array of objects:
   ```json
   [
     {
       "title": "Research title",
       "sage_id": "123",
       "sage_label": "Hebrew sage name",
       "spotify": "https://open.spotify.com/episode/...",
       "drive_id": "Google Drive document ID"
     }
   ]
   ```

2. **Output format**: Each research document is written to `nextjs-app/public/research/<sage_id>.json` as:
   ```json
   [
     {
       "title": "Document title",
       "source_file": "Google Docs: [original title]",
       "word_count": 12345,
       "content": "Full text content of the document..."
     }
   ]
   ```
   If multiple documents exist for the same sage_id, they are appended to the array.

### Process
1. **Triage**: Categorize documents from Google Drive folder into matching sages vs. new candidates
2. **Filter**: Remove sages that don't exist in the data.json (validate FK constraints)
3. **Ingest**: For each approved document:
   - Download Google Doc via Drive API (requires authentication)
   - Extract text content
   - Count words
   - Write JSON file to output directory
   - Append to existing files if sage already has research
4. **Validate**: Verify all JSON files are valid and properly formatted

### Google Drive API Authentication
- Requires Google Drive connector enabled in Claude Code session
- Uses service account or OAuth credentials
- Downloads via `google.drive.files.export` (converts Google Docs to plain text)

### Common Issues
- **API Timeout**: If processing many documents, batch in groups of 10-15 to avoid timeouts
- **Missing Sage**: Validate sage_id exists in `nextjs-app/public/data.json` before ingestion
- **Duplicate Entries**: Check if research already exists for a sage_id; append rather than replace
- **Word Count**: Use simple split on whitespace; emoji/special chars may inflate count slightly

### Environment Variables (`.claude/settings.json`)
- `RESEARCH_MANIFEST_PATH`: Path to approved documents manifest
- `RESEARCH_OUTPUT_DIR`: Target directory for research JSON files (relative to repo root)
