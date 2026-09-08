# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout — read this first

This repo contains **two generations of the same project**. Only one is live:

- **`nextjs-app/`** — the active, deployed app (Next.js 15 + React 19). `.github/workflows/deploy.yml` builds and deploys *this* directory to Vercel on every push to `main`. All feature work happens here.
- **Repo root** (everything outside `nextjs-app/`) — a legacy vanilla-JS/Supabase prototype (`index.html`, `graph.js`, `styles-graph.css`, dozens of one-off `*.md` status reports, migration scripts, scratch JSON exports). It is **not deployed** (its `vercel.json`/`package.json` are stale) and should be treated as historical reference only, not a place to add features.
- **`data/`** (repo root) — source-of-truth spreadsheet: **`חכמי_ישראל.xlsx`** (522+ rows, the file a human edits), plus `*.docx` research documents. `nextjs-app/public/data.json` is *generated from* the xlsx, not the other way around. Note there are two similarly-named workbooks: `חכמי_ישראל.xlsx` (underscore) is the master; `חכמי ישראל.xlsx` (space) is an older 405-row subset with 14 empty columns. The `.csv` is a corrupted derivative — see the pipeline section.
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

### Data pipeline: XLSX → data.json → app

1. **`data/חכמי_ישראל.xlsx` is the canonical source**, read directly by `rebuild_data_from_csv.py` via openpyxl. The sibling `.csv` is **not** a valid source and is no longer a build input: it was produced by merging this file's rows into a different sheet's column layout, and that merge reassigned ids — of 364 sages present in both, 348 ended up with different ids. Building from it silently attached the wrong research documents to ~91% of sage pages.

   Each row has a `מזהה` (id) column — **this id is the stable identity key across the entire system**: it's reused verbatim as the sage's `id` in `data.json`, the filename for research docs (`public/research/<id>.json`), the key in `data-patch.json`, and the key in `data/sage-id-aliases-*.json`. Never renumber an existing id — that breaks all four at once, silently, with no build error. When you must reconcile two datasets, **join on name, not on id**: names are stable across id spaces, ids are exactly what drifts. The same id can appear on multiple rows (one person can have several "episode" rows); dedupe by name, not by id, when rebuilding.
2. **`public/data.json`** (`{ nodes: Sage[], links: Connection[] }`) is the canonical dataset consumed by the app. Raw node fields (`era`, `era_key`, `era_label`, `central_idea`, `chapter_type`, comma-string `tags`) get remapped to the `Sage` type by `lib/serverData.ts` (server) and `lib/supabase.ts::fetchLocalGraphData` (client) — the two mappers must stay in sync if you add a field.
3. **`era_key`** must be one of the 11 `Period` values in `lib/types.ts` (`patriarchs…modern`). All 11 are now populated. `rebuild_data_from_csv.py` checks `BIBLICAL_RULES` *before* the general `RULES`, against the era label and the years column joined, because the spreadsheet often puts the generic label in `תקופה` ("תנ״ך") and the actual sub-period in `שנים/תקופה` ("תקופת השופטים"). Those rules key on **period phrases only, never bare personal names** — a bare name misfiles later rabbis, since רבי דוד קמחי is not King David and רבי ישעיה די טראני is not the prophet. Keep that constraint if you extend them. When mapping a new free-text era label, check `data.json` for an existing `era_label → era_key` precedent before guessing.
4. **`data-patch.json`** applies small per-id field overrides. It is applied on **both** paths — client-side in `AppShell.tsx` and server-side in `lib/serverData.ts` (which imports it and calls `applyPatches`). An earlier version of this file claimed the patch was client-only; that was wrong, and the error hid a real corruption for months: the patch held `period`/`birth_year` overrides keyed to a dead id space, forcing the Kaliver Rebbe (1923–2019) into `judges` with `birth_year: -1110` on every surface. Because ids are the join key, **any per-id side file becomes actively harmful the moment the id space shifts.** Audit this file whenever ids move.
5. `data-supplement.json`, `data-supplement-2.json`, and `data-ancient.json` **do exist** and are merged over `data.json` at load time (~21 extra sages, so the app shows more than `data.json` alone contains). A previous version of this file declared them deleted; they were not. They are the reason the live sage count exceeds the master count. New sages should still go in the master spreadsheet rather than here.
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

`GeoMap.tsx` (Leaflet) depends on its container having non-zero size at init; because it's always-mounted it can initialize while `display:none`, so it explicitly calls `map.invalidateSize()` on an `activeTab`-change effect to recover. `GenealogyTree.tsx` drives its D3 force simulation manually (`sim.stop()` + explicit `sim.tick()` in an RAF loop) for main-thread-friendly batching. There, remember `d3-force` only dispatches its `'tick'` event when the simulation runs its own timer, **not** on manual `.tick()` calls, so any per-tick DOM update must be invoked directly rather than registered via `.on('tick', …)`. **`NetworkGraph.tsx` does not use that pattern** — it runs d3's internal timer, so its `.on('tick')` handler fires normally. An earlier version of this file attributed the manual pattern to both; verify which you're in before restructuring simulation code.

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
