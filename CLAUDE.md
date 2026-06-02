# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# אוצר חכמים — Ozar Chachamim

## Project Purpose

**English:** A structured knowledge base about Jewish sages — their worlds, thought, historical context, and relationships — with an interactive network visualization website serving yeshiva students and graduates.

**Hebrew:** בסיס ידע מובנה על חכמי ישראל לדורותיהם — עם אתר ויזואליזציה דינמית של קשרים בין חכמים — המיועד לתלמידי ישיבות ובוגריהן.

## Quick Start: Running the Website (Supabase Backend)

**Setup (First Time Only)**:
```bash
# 1. Create Supabase project: https://app.supabase.com
# 2. Run SQL schema in Supabase SQL Editor:
#    → supabase-schema-v3.sql
# 3. Import 323 sages:
python migrate_to_supabase_v3.py
```

**Run Development Server**:
```bash
# Start server
python -m http.server 8080

# Open browser:
# http://localhost:8080
```

**Check Console (F12)**:
```
✓ Loaded 323 sages from Supabase
✓ Loaded 25 connections (FK-validated)
✅ Supabase ready: 323 nodes + 25 edges
```

## Project Architecture

### Frontend Stack
- **UI**: `index.html` - Single-page app with 5 tabs (responsive design, Hebrew RTL)
  - Tab 1: **רשת קשרים** (Graph) — D3.js force-directed network
  - Tab 2: **גיאוגרפיה** (Map) — Leaflet.js with sage markers + migration paths
  - Tab 3: **מסורות** (Traditions) — Sage groupings by era
  - Tab 4: **רעיונות** (Ideas) — Thematic clustering
  - Tab 5: **שלשלת הקבלה** (Timeline) — Chronological view by era bands
- **Visualization**: D3.js v7 (force-directed graph, dashed migration polylines, timeline bands)
- **Maps**: Leaflet.js (geographic markers by coordinates, multi-point migration paths)
- **Data**: 323 sages loaded from Supabase + 18 with geographic migration paths
- **Styling**: `styles-graph.css` + inline CSS in `index.html` + responsive breakpoints (desktop → tablet → mobile with scroll support)

### Data Files
- **`data.json`** - Master dataset: `nodes[]` (sages) + `links[]` (relationships). Update here for new sages/connections.
- **`site-data/חכמי ישראל.xlsx`** - Excel source (992 sage candidates). Used to generate `data.json` via `export_excel.py`.
- **`sages/*.md`** - Markdown profiles for 44 sages (canonical source for bios). Not currently used by website; kept for archival.
- **`notes/<sage-slug>/`** - Rich structured notes (lesson_plan, questions, related_figures) for 5 sages.

### Backend (Future: Supabase)
- **`import_to_supabase.py`** (or `import_simple.py`) - Import `data.json` to Supabase REST API
- **`supabase-schema-v2.sql`** - Database schema (5 tables: sages, research_content, user_history, bookmarks, profiles)
- See "Supabase Integration" section below.

## Common Development Tasks

### Update Sage Data
To add or modify a sage in the network:

1. Edit `data.json` directly (add node with `id`, `label`, `group`, `period`, `location`, `field`, `bio`)
2. Add relationships by extending `links[]` array (source → target + type)
3. Refresh browser — changes load immediately

Example node:
```json
{
  "id": "45",
  "label": "רבי דוד דיכובסקי",
  "group": "modern",
  "period": "1920-1995",
  "location": "Eretz Israel",
  "field": "Ethics",
  "bio": "20th-century ethicist..."
}
```

### Export Data from Excel
If updating from `site-data/חכמי ישראל.xlsx`:

```bash
python export_excel.py
# Generates updated sages.json (992 rows)

python export_research.py
# Extracts text from *.docx research files → research.json
```

Then manually merge relevant rows into `data.json`.

### Update Front End
- **Layout/Typography**: Edit inline `<style>` in `index.html`
- **Tab Navigation**: Modify `.tab-btn` section and corresponding `.main-area` divs
- **Sidebar Details**: Adjust `.sidebar-content` HTML structure in JavaScript `selectNode()` function

## Supabase Integration (LIVE — Phase 2 Complete)

### Setup (First Time)
```bash
# 1. Create project at https://supabase.com

# 2. Run SQL schema in Supabase SQL Editor:
# Paste contents of supabase-schema-v3.sql

# 3. Import 323 sages + 25 connections:
python migrate_to_supabase_v3.py
# This validates FK constraints and imports from "חכמי ישראל.xlsx"

# 4. Frontend automatically loads from Supabase
# supabase-client.js handles all data loading
```

### Data Flow
```
index.html (DOMContentLoaded)
  ↓
supabase-client.js module (import)
  ↓
initializeApp()
  ├─ loadSages() → SELECT * FROM sages (323 rows with coordinates + migration_path JSONB)
  ├─ loadConnections() → SELECT * FROM connections (25 rows)
  ├─ Validation (FK checks)
  └─ window.graphData ready → emit 'supabaseReady'
  ↓
Lazy initialization on tab click:
  ├─ graph.js → D3 force-directed network (click node → sidebar + PDF export)
  ├─ initMap() → Leaflet map with dashed migration polylines (multi-point waypoints)
  ├─ buildTraditions() → era-based sage groupings
  ├─ buildIdeas() → thematic sage clusters
  └─ buildTimeline() → שלשלת הקבלה chronological bands (130px per era, 3-row stagger)
  ↓
User sees 5 interactive tabs + search + PDF export per sage
```

### Credentials
- **Supabase URL & Anon Key**: Already in `supabase-client.js` (line 9-10)
- **Anon key is public** (safe in frontend, read-only via RLS)
- **RLS policies**: Enforce data access (sages public, user data private)

## Timeline View (שלשלת הקבלה)

The 5th tab shows all 323 sages in 7 horizontal era bands, positioned left=oldest → right=newest.

**Configuration** (in `index.html` `buildTimeline()` function):
- `LANE_HEIGHT: 130` — vertical space per era band (increased from 110 for better spacing)
- `STAGGER_ROWS: 3` — max 3 vertical rows per column bucket (prevents overlap)
- `MIN_SAGE_WIDTH: 3000` — minimum SVG width ensures ~107 columns × 3 rows = 321 slots for 323 sages
- Era colors match the graph view's color map

**Key features**:
- Hover reveals Hebrew name label + glow effect
- Click opens sidebar (same as graph view)
- Search filters dots by opacity
- Escape key closes sidebar
- RTL-aware (scroll starts at left = oldest)

## PDF Export

Clicking "הדפס / Export PDF" in the sidebar opens a new tab with the sage's complete profile formatted for printing.

**PDF includes**:
- Name, era, region, primary field
- Full biography + core concept
- Migration path (from → intermediate waypoints → to)
- Related sages with connection types (student, influence, colleague, etc.)
- Research text (if available in research_content table)
- Embedded print CSS (dark-brown aesthetic, Frank Ruhl Libre serif, Hebrew RTL)

**Implementation**: Uses `window.print()` — no external PDF library. Browser's "Save as PDF" button handles the output.

## Content Conventions

- **Sage slugs**: English snake_case (e.g., `rabbi-meir-tanna`, `rambam`)
- **Period keys**: `second-temple`, `tannaim`, `amoraim`, `geonim`, `rishonim`, `acharonim`, `modern`
- **Link types**: `student`, `influence`, `oppose`, `colleague`, `predecessor`, `teacher`, `contemporary`
- **Hebrew + English**: Site runs in RTL; all labels bilingual where possible
- **Era colors** (used in graph, map, timeline, and PDF):
  - second-temple: #8e44ad | tannaim: #e74c3c | amoraim: #e67e22
  - geonim: #f1c40f | rishonim: #27ae60 | acharonim: #2980b9 | modern: #1abc9c

## Periods Reference

| Period | Hebrew | Approx. Dates |
|---|---|---|
| Second Temple | בית שני | 516 BCE–70 CE |
| Tannaim | תנאים | 10–220 CE |
| Amoraim | אמוראים | 220–500 CE |
| Geonim | גאונים | 589–1038 CE |
| Rishonim | ראשונים | 1038–1563 CE |
| Acharonim | אחרונים | 1563–present |
| Modern | עת חדשה | 19th century+ |

## Browser Compatibility & Mobile

**Desktop**: Chrome/Edge 90+, Firefox 88+, Safari 14+
**Mobile**: iOS 12+, Android 5+

**Mobile optimizations** (viewport <768px):
- Tab bar scrolls horizontally with hidden icons (saves space)
- Sidebar slides up from bottom with animation (not fixed off-screen)
- Uses `100dvh` instead of `100vh` for proper viewport height on mobile
- RTL page direction preserved with proper right-border hover states

RTL support tested; Windows-1252 encoding issues in older IE (not supported).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Console shows "Failed to load graph data" | Check `supabase-schema-v3.sql` was run in Supabase. Check `migrate_to_supabase_v3.py` completed. Verify Supabase URL/key. |
| No nodes or edges display | Check browser console (F12). Look for "Loaded X sages" message. If 0 sages, migration didn't complete. |
| "node not found" error | Run `python migrate_to_supabase_v3.py` again. This validates FK constraints and imports 323 sages. |
| Sidebar doesn't open on node click | Check `window.graphData` exists. Verify node has `id` and `label` fields. |
| Map shows blank tiles | Verify Leaflet CSS/JS loaded from CDN. Check OpenStreetMap server status. |
| Search not filtering | Check `window.searchIndex` created. Verify search input propagates to `semanticSearch()`. |

## Completed Phases & Current Status

- [x] **Phase 1**: 323 sages + 25 connections with data integrity
- [x] **Phase 2**: Supabase backend (PostgreSQL, RLS, FK constraints)
- [x] **Phase 3**: User authentication (signup/login), bookmarks, view history, semantic search
- [x] **Phase 4**: Chronological timeline (שלשלת הקבלה) with 7 era bands + 3-row stagger
- [x] **Phase 4**: Migration path extraction (18 sages with geographic journeys)
- [x] **Phase 5**: PDF export of sage profiles (bio + connections + migration paths + research)
- [x] **Phase 5**: Frontend polish — mobile responsive, Escape key, RTL fixes, map waypoints
- [ ] **Phase 5+**: Full-text search via PostgreSQL `tsvector`
- [ ] **Phase 6**: Research document full integration + dedicated research view
- [ ] **Deployment**: Vercel, GitHub Pages, or custom server

## File Reference

### Core Frontend
- **`index.html`** — Main SPA (5 tabs: graph, map, traditions, ideas, timeline) + search + PDF export function
  - `buildTimeline()` — שלשלת הקבלה: 7 era bands, 130px LANE_HEIGHT, 3-row stagger, D3 SVG
  - `exportSagePDF(sageId)` — Opens print-ready HTML with sage profile (bio, connections, migration path)
  - Escape key handler for sidebar close
- **`supabase-client.js`** — Supabase data loading, authentication, bookmarks, search index
  - Loads `coordinates` (JSONB) and `migration_path` (TEXT) for all sages
- **`graph.js`** — D3.js force-directed network visualization
  - PDF export button in `selectNode()` sidebar HTML
  - Related sages with connection types enriched from graph links
- **`styles-graph.css`** — Responsive CSS (desktop 1024px, tablet 768px, mobile <768px)
  - Mobile: tab bar scrolls horizontally with icons hidden, sidebar slides up with animation (bottom -100% → 0)
  - RTL: `.related-sage:hover` uses right border/padding (not left)

### Supabase Backend
- **`supabase-schema-v3.sql`** — PostgreSQL schema (sages, connections, research, users, bookmarks, history) + RLS policies
- **`migrate_to_supabase_v3.py`** — Import 323 sages + 25 connections from Excel → Supabase (FK validated)
- **`IMPLEMENTATION_GUIDE.md`** — Step-by-step deployment guide

### Geographic & Migration Data
- **`location-coords.js`** — Hardcoded geographic coordinates for 28 locations (ירושלים, בבל, ספרד, etc.)
  - Used by map initialization and migration path rendering
- **`extract-all-migrations.py`** — Extracts migration paths from 54 Word files
  - Finds location names mentioned in text, creates `migration_path` JSONB for Supabase
  - Current: 18 sages with paths (from 45 extractions, some sages appear in multiple files)
- **`upload-migrations.py`** — Generates SQL UPDATE statements to populate `migration_path` column
- **Migration path format**: `{"from": "ירושלים", "to": "ספרד", "intermediate": ["מצרים"], "description": "..."}`

### Data & Utilities
- **`data.json`** — Fallback local dataset (44 sages, no longer used; Supabase is primary)
- **`site-data/חכמי ישראל.xlsx`** — Excel source (992 sage candidates, used for bulk imports)
- **`sages/*.md`** — Archival markdown profiles (not used by site, kept for reference)
- **`migrate_to_supabase_v3.py`** — Imports Excel data → Supabase (323 sages, 25 connections, validates FKs)
