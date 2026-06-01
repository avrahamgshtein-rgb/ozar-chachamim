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
- **UI**: `index.html` - Single-page app with 4 tabs (responsive design, Hebrew RTL)
- **Visualization**: D3.js v7 (force-directed graph, draggable nodes)
- **Maps**: Leaflet.js (geographic markers by sage location)
- **Data**: `data.json` - 44 sage nodes + relationship links (source → target type)
- **Styling**: Inline CSS + responsive breakpoints (desktop → tablet → mobile)

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
  ├─ loadSages() → SELECT * FROM sages (323 rows)
  ├─ loadConnections() → SELECT * FROM connections (25 rows)
  ├─ Validation (FK checks)
  └─ window.graphData ready → emit 'supabaseReady'
  ↓
graph.js, initMap(), buildTraditions(), buildIdeas()
  ↓
User sees 4 interactive tabs + search
```

### Credentials
- **Supabase URL & Anon Key**: Already in `supabase-client.js` (line 9-10)
- **Anon key is public** (safe in frontend, read-only via RLS)
- **RLS policies**: Enforce data access (sages public, user data private)

## Content Conventions

- **Sage slugs**: English snake_case (e.g., `rabbi-meir-tanna`, `rambam`)
- **Period keys**: `second-temple`, `tannaim`, `amoraim`, `rishonim`, `acharonim`, `modern`
- **Links types**: `student`, `influence`, `oppose`, `colleague`, `predecessor`
- **Hebrew + English**: Site runs in RTL; all labels bilingual where possible

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

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile: iOS 12+, Android 5+

RTL support tested; note Windows-1252 encoding issues in older IE (not supported).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Console shows "Failed to load graph data" | Check `supabase-schema-v3.sql` was run in Supabase. Check `migrate_to_supabase_v3.py` completed. Verify Supabase URL/key. |
| No nodes or edges display | Check browser console (F12). Look for "Loaded X sages" message. If 0 sages, migration didn't complete. |
| "node not found" error | Run `python migrate_to_supabase_v3.py` again. This validates FK constraints and imports 323 sages. |
| Sidebar doesn't open on node click | Check `window.graphData` exists. Verify node has `id` and `label` fields. |
| Map shows blank tiles | Verify Leaflet CSS/JS loaded from CDN. Check OpenStreetMap server status. |
| Search not filtering | Check `window.searchIndex` created. Verify search input propagates to `semanticSearch()`. |

## Future Work (Phase 3+)

- [x] **Phase 1**: 323 sages + 25 connections with data integrity
- [x] **Phase 2**: Supabase backend (PostgreSQL, RLS, FK constraints)
- [x] **Phase 3**: User authentication (signup/login)
- [x] **Phase 3**: Bookmarks + view history
- [x] **Phase 3**: Semantic search (cross-tab filtering)
- [ ] **Phase 4**: Full-text search via PostgreSQL `tsvector`
- [ ] **Phase 4**: Research document integration (Word → Markdown)
- [ ] **Phase 5**: Chronological force layout (שלשלת הקבלה)
- [ ] **Phase 5**: PDF export of sage profiles
- [ ] **Phase 5**: Timeline view by era
- [ ] **Deployment**: Vercel, GitHub Pages, or custom server

## File Reference

### Core Frontend
- **`index.html`** — Main SPA (4 tabs: graph, map, traditions, ideas) + search
- **`supabase-client.js`** — Supabase data loading, authentication, bookmarks, search index
- **`graph.js`** — D3.js force-directed network visualization
- **`styles-graph.css`** — Responsive CSS for all views

### Supabase Backend
- **`supabase-schema-v3.sql`** — PostgreSQL schema (sages, connections, research, users, bookmarks, history) + RLS policies
- **`migrate_to_supabase_v3.py`** — Import 323 sages + 25 connections from Excel → Supabase (FK validated)
- **`IMPLEMENTATION_GUIDE.md`** — Step-by-step deployment guide

### Data & Utilities
- **`data.json`** — Fallback local dataset (44 sages, no longer used)
- **`site-data/חכמי ישראל.xlsx`** — Excel source (992 sage candidates)
- **`location-mapping.js`** — Geographic coordinates for sage regions
- **`sages/*.md`** — Archival markdown profiles (not used by site)
