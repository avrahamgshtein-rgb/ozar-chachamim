# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# אוצר חכמים — Ozar Chachamim

## Project Purpose

**English:** A structured knowledge base about Jewish sages — their worlds, thought, historical context, and relationships — with an interactive network visualization website serving yeshiva students and graduates.

**Hebrew:** בסיס ידע מובנה על חכמי ישראל לדורותיהם — עם אתר ויזואליזציה דינמית של קשרים בין חכמים — המיועד לתלמידי ישיבות ובוגריהן.

## Quick Start: Running the Website

```bash
# Start local development server (macOS/Linux)
python -m http.server 8080

# Windows users can run the same command or
python3 -m http.server 8080

# Then open browser to:
# http://localhost:8080
```

The site loads from `data.json` (local file). To use Supabase backend later, update the fetch in `index.html` (see "Supabase Integration" below).

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

## Supabase Integration (Phase 2)

### Prerequisites
1. Create Supabase project: https://supabase.com
2. Get Project URL + Anon Key from Settings → API

### Setup
```bash
# 1. Run SQL schema in Supabase SQL Editor
# Paste contents of supabase-schema-v2.sql

# 2. Import data
python import_simple.py
# Enter: Project URL, Anon Key
# Imports sages.json + research.json to database

# 3. Update index.html
# Replace placeholder credentials in fetch() call
# Change: const response = await fetch('data.json');
# To: const data = await fetchFromSupabase();
```

### Credentials Management
- Store Supabase URL + Anon Key as environment variables or `.env` (never in git)
- Anon key is safe to embed in frontend (public, read-only)
- Service Role key goes nowhere near the frontend

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
| Network graph doesn't render | Check browser console (F12). Verify `data.json` loads and is valid JSON. |
| Sidebar doesn't open on node click | Ensure `selectNode()` function is called. Check z-index of `.sidebar` (should be 999+). |
| Map shows blank tiles | Verify Leaflet CSS/JS loaded from CDN. Check OpenStreetMap tile server status. |
| Search not filtering | Check input value propagation to D3 selection. Ensure node/link opacity styles are applied. |

## Future Work (Phase 3+)

- [ ] Finish Supabase import (992 sages from Excel)
- [ ] Add user authentication (profiles table)
- [ ] Implement bookmarks + history tracking
- [ ] Full-text search via Supabase PostgreSQL `tsvector`
- [ ] PDF export of sage profiles
- [ ] API endpoint for research access
- [ ] Timeline view (chronological layout)
- [ ] Tradition filter UI (Ashkenazi, Sephardic, Hasidic, etc.)

## File Reference

- **`index.html`** — Main SPA (4 tabs: graph, map, traditions, ideas)
- **`data.json`** — Master dataset for website (44 sages + links)
- **`export_excel.py`** — Extract Excel → JSON
- **`export_research.py`** — Extract .docx → JSON (fuzzy matching)
- **`import_simple.py`** — Import JSON → Supabase REST API
- **`supabase-schema-v2.sql`** — Database DDL
- **`sages/*.md`** — Archival markdown profiles (not used by site)
- **`site-data/חכמי ישראל.xlsx`** — Excel source (992 candidates)
