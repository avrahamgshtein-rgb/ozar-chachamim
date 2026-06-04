# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# אוצר חכמים — Ozar Chachamim

## Project Purpose

**English:** A structured knowledge base about Jewish sages — their worlds, thought, historical context, and relationships — with an interactive network visualization website serving yeshiva students and graduates.

**Hebrew:** בסיס ידע מובנה על חכמי ישראל לדורותיהם — עם אתר ויזואליזציה דינמית של קשרים בין חכמים — המיועד לתלמידי ישיבות ובוגריהן.

## Quick Start: Running the Website (Live Supabase Backend)

**Step 1: Backend Setup (Supabase)**
```bash
# 1. Create project: https://app.supabase.com
# 2. Create tables: Paste supabase-schema-v3.sql in SQL Editor
# 3. Import data:
python migrate_to_supabase_v3.py
```

**Step 2: Frontend Configuration**
```bash
# 1. Copy template: cp config.example.js config.js
# 2. Get credentials from https://app.supabase.com
#    Settings > API > "Project URL" + "anon public" key
# 3. Paste into config.js
```

**Step 3: Run Development Server**
```bash
python -m http.server 8080
# Open http://localhost:8080
```

**Step 4: Verify Console (F12)**
```
✅ 🔌 [Supabase] Connecting to ulluacifirzywhmzkvkr.supabase.co
✅ 📚 Loading sages from Supabase...
✅ 🔗 Loading connections from Supabase...
✅ [AppInit] Single Source Ready: 323 nodes + 25 validated edges
✅ 🔍 [SearchIndex] Built index with 2,847 unique tokens
✅ Event: supabaseReady fired
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

## Context Budgeting: What Claude Can Access & Do

**This section clarifies exactly what Claude Code can read, write, and act on (from Session 1 of Claude Workshop).**

### Source Budget (What Claude may read)

| Source | Access | Notes |
|--------|--------|-------|
| `sages/*.md` | ✅ Full read | All 44 sage profiles |
| `notes/*/` | ✅ Full read | Lesson plans, questions, posts (5 sages) |
| `templates/` | ✅ Full read | Sage profile template |
| `site-data/חכמי ישראל.xlsx` | ✅ Metadata only | Excel headers, column names (not full content) |
| `sources/**/*.docx` | ⚠️ Excerpts only | Claude may read & summarize, NOT export full text |
| `CLAUDE.md`, `MEMORY.md`, `INSTRUCTION.md` | ✅ Full read | Project rules & workflows |
| `.gitignore`, `config.js` | ❌ No read | Security credentials (never expose) |

### Action Budget (What Claude may do)

| Action | Permission | When |
|--------|------------|------|
| Create markdown files | ✅ Yes | In `sages/`, `notes/*/` (you approve first) |
| Update markdown cross-references | ✅ Yes | Adding `[[sage-slug]]` links (you approve) |
| Query Supabase | ✅ Yes | SELECT only (read-only queries) |
| Insert sage to Supabase | ⚠️ With approval | Only after you explicitly approve |
| Update connections in Supabase | ⚠️ With approval | Only after you explicitly approve |
| Delete files | ❌ No | Never delete without your explicit instruction |
| Send research documents | ❌ No | Never email/export full research text |
| Modify config.js | ❌ No | Security risk |

### Output Budget (What Claude must produce)

| Output Type | Required Format | Notes |
|-------------|-----------------|-------|
| New sage profile | Markdown | Must follow `templates/sage-profile.md` |
| Lesson plan | Markdown + Hebrew | 45 min: 5 intro + 30 main + 10 discussion |
| Migration path | JSON | `{"from": "...", "to": "...", "intermediate": [...]}` |
| Connections | SQL INSERT | With human approval before executing |
| Markdown updates | Diff preview | Show changes before committing |

### Time/Token Budget (Estimated per task)

- **Add new sage:** 5,000–10,000 tokens (2–3 hours of work)
- **Generate lesson plan:** 3,000–5,000 tokens (1 hour of work)
- **Extract migration:** 2,000–3,000 tokens (30 min of work)
- **Create connection:** 1,000 tokens (15 min of work)

If a task exceeds budget, break into smaller steps and use MEMORY.md to resume.

---

## Privacy & Safety Rules (Session 1 Framework)

**Golden rule:** Privacy First — Always.

### The Four Principles

1. **Start read-only**
   - Before any action, assume you have NO write permissions
   - Ask: "May I read this file?"
   - Ask: "May I create this file?"

2. **Limit sources**
   - Specify exactly which files Claude may access
   - Don't say "use anything in sources/" — list specific files
   - For research documents: "Read only the migration section, not biographical details"

3. **Use demo data for practice**
   - Never load sensitive/personal research for testing
   - Practice with template files first

4. **Review before acting**
   - Before sending: Ask permission
   - Before deleting: Ask permission
   - Before editing: Ask permission
   - Before labeling: Ask permission
   - Before moving files: Ask permission
   - Before scheduling: Ask permission

### Specific to Research Documents (`sources/**/*.docx`)

**⚠️ Important:** Research files contain biographical research that may include sensitive information.

**Safe practices:**
- ✅ Claude can: Read, summarize, extract key facts (dates, locations, book titles)
- ✅ Claude can: Extract migration paths (from → to → intermediate waypoints)
- ⚠️ Claude should: For modern/living sages, treat personal details as sensitive
- ❌ Claude cannot: Export full biographical text
- ❌ Claude cannot: Archive research documents to external services
- ❌ Claude cannot: Send full text via email/cloud storage

**Before Claude extracts research:**
- Confirm: "Extract ONLY: dates, locations, major works, migration paths. No personal details or full-text export."

### Specific to Supabase (`sages` table, `connections` table)

**Data integrity rules:**
- Before INSERT: Validate all FK constraints (referenced sages must exist)
- Before INSERT: Check for duplicates (is this sage already in database?)
- Before UPDATE: Confirm the sage ID exists
- Before DELETE: Ask for explicit human approval

**Valid values (must match these exactly):**
- `period`: second-temple, tannaim, amoraim, geonim, rishonim, acharonim, modern
- `connection_type`: student, influence, oppose, colleague, predecessor, teacher, contemporary

### Specific to Hebrew RTL

**Bilingual requirement:**
- All labels must include Hebrew + English: "Rambam — הרמב״ם"
- Use proper Hebrew abbreviations: "ר״י" (Rabbi Yitzhak), NOT "RI"
- Gematria marks (גרשיים) for abbreviations: "ש״ס" (Shas), not "SHS"
- Never assume English names match Hebrew transliteration

---

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

## Supabase Integration (LIVE — Full Dynamic Backend)

### Setup (First Time)

**Backend Database Setup:**
```bash
# 1. Create Supabase project at https://app.supabase.com
# 2. Go to SQL Editor and run supabase-schema-v3.sql
# 3. Import 323 sages + 25 connections:
python migrate_to_supabase_v3.py
# This validates FK constraints and imports from "חכמי ישראל.xlsx"
```

**Frontend Configuration:**
```bash
# 1. Get your credentials from https://app.supabase.com
#    → Select your project → Settings > API
#    → Copy "Project URL" and "anon public" key

# 2. Set up local config:
cp config.example.js config.js

# 3. Edit config.js and paste your credentials:
# export const SUPABASE_CONFIG = {
#   url: 'https://your-project.supabase.co',
#   anonKey: 'sb_publishable_...'
# }

# ⚠️ config.js is in .gitignore — never commit it

# 4. Start server:
python -m http.server 8080

# 5. Open browser:
# http://localhost:8080
# 
# Check browser console (F12) for:
# ✅ 🔌 [Supabase] Connecting to...
# ✅ 📚 Loading sages from Supabase...
# ✅ 🔗 Loading connections from Supabase...
# ✅ [AppInit] Single Source Ready: 323 nodes + 25 validated edges
```

### Data Flow (Live Supabase)
```
1. Browser loads index.html
   ↓
2. index.html imports supabase-client.js
   - supabase-client.js imports config.js (credentials)
   - Supabase client initialized with URL + anon key
   ↓
3. DOMContentLoaded event fires
   - Calls initializeApp() from supabase-client.js
   ↓
4. initializeApp() executes:
   ├─ loadSages() → SELECT * FROM sages_with_stats
   │  └─ Returns 992 sages (if available) with era, period_order, tags, core_concept
   │
   ├─ loadConnections() → SELECT * FROM connections_with_names
   │  └─ Returns all relationships (source_id → target_id)
   │
   ├─ Defensive Validation:
   │  ├─ Build Set<sageId> from loaded sages
   │  ├─ Filter connections: discard any where source/target not in Set
   │  └─ Log invalid connections as warnings
   │
   ├─ Transform to window.graphData:
   │  ├─ nodes[] = 323+ sages with all fields
   │  ├─ links[] = 25+ validated connections
   │  └─ sageMap = Map<id, sage> for O(1) lookup
   │
   └─ Emit 'supabaseReady' event
      ↓
5. All 5 tabs listen for 'supabaseReady':
   ├─ graph.js initializes D3 force graph
   ├─ initMap() loads Leaflet map with markers
   ├─ buildTraditions() creates era-based groups
   ├─ buildIdeas() builds thematic clusters
   └─ buildTimeline() renders שלשלת הקבלה chronological view
```

### Configuration Files

**`config.example.js`** (Template)
- Copy this to `config.js` and fill in your credentials
- Includes detailed comments about security
- Shows where to find Supabase credentials

**`config.js`** (Production — NOT in git)
- Contains your actual Supabase URL and anon key
- Added to `.gitignore` to prevent accidental commits
- Must be created before running the app

**`.env.example`** (Documentation only)
- Shows Vite environment variable format for future migration
- Not used by current plain HTML/JS app
- Reference if migrating to Vite/Next.js/React

### Security & RLS

**Anon Key Philosophy:**
- The anonymous key is intentionally public (meant for browser clients)
- All access control happens server-side via Row-Level Security (RLS)

**RLS Policies (PostgreSQL):**
```sql
-- Public: Anyone can read sages + connections
SELECT on sages, connections, research_content → ✅ Public

-- Authenticated only: Bookmarks + history
INSERT/UPDATE on bookmarks, view_history → ✅ If user_id matches

-- Never exposed:
SELECT on secrets, api_keys, admin_tables → ❌ Forbidden
```

**Safe to Expose:**
✅ Anon key in frontend code (read-only via RLS)
✅ Supabase project URL in frontend code (public info)

**Never Expose:**
❌ Secret key (admin role) — keep on backend only
❌ Service role key — never in browser code
❌ Master password — keep in secure vault only

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
