# 📚 MEMORY.md — אוצר חכמים Project Context

*This file helps Claude Code maintain consistent knowledge across sessions. Updated: June 2026.*

---

## 🎯 What This Project Is

**In Hebrew:** בסיס ידע מובנה על חכמי ישראל לדורותיהם — עם אתר ויזואליזציה דינמית של קשרים בין חכמים המיועד לתלמידי ישיבות ובוגריהן.

**In English:** A structured knowledge base of 323 Jewish sages across 7 historical eras, with an interactive D3 network visualization website serving yeshiva students.

---

## 📊 Core Facts

### Sage Distribution
| Era | Hebrew | Years | Count | Color |
|-----|--------|-------|-------|-------|
| Second Temple | בית שני | 516 BCE–70 CE | ~15 | #8e44ad |
| Tannaim | תנאים | 10–220 CE | ~25 | #e74c3c |
| Amoraim | אמוראים | 220–500 CE | ~40 | #e67e22 |
| Geonim | גאונים | 589–1038 CE | ~35 | #f1c40f |
| Rishonim | ראשונים | 1038–1563 CE | ~130 | #27ae60 |
| Acharonim | אחרונים | 1563–present | ~70 | #2980b9 |
| Modern | עת חדשה | 19th century+ | ~8 | #1abc9c |
| **TOTAL** | | | **323** | — |

### Key Numbers
- **Database:** 323 sages + 25 validated connections in Supabase
- **Research documents:** 54 Word files in `sources/` (biographical research)
- **Structured notes:** 5 sages with detailed profiles in `notes/<slug>/`
- **Geographic data:** 18 sages with migration paths (from → to → intermediate waypoints)
- **Frontend:** Single-page app with 5 tabs (graph, map, traditions, ideas, timeline)

---

## 🗂️ How the Project Is Organized

### Root-Level Structure
```
ozar-chachamim/
├── CLAUDE.md                  # Rules & architecture (main reference)
├── MEMORY.md                  # This file (context for Claude)
├── INSTRUCTION.md             # Reusable workflows
├── 
├── sages/                     # Main profiles (44 sages in markdown)
│   ├── rabbi-meir-tanna.md
│   ├── rambam.md
│   ├── ramban.md
│   └── ... (40+ more)
│
├── notes/                     # Detailed teaching materials (5 sages)
│   ├── rabbi-meir-tanna/
│   │   ├── summary.md
│   │   ├── lesson_plan.md     # 45-minute teaching plan
│   │   ├── questions.md       # Discussion questions
│   │   ├── post.md            # Blog post (800 words)
│   │   └── related_figures.md # Cross-references
│   ├── maggid-mishneh/
│   ├── pinchas-kehati/
│   ├── rabbeinu-bachya-ben-asher/
│   └── rabbi-yosef-bechor-shor/
│
├── sources/                   # Research documents (54 Word files)
│   ├── rabbi-meir-tanna/
│   │   ├── מאור הגולה- פועלו, משנתו...docx
│   │   └── [short title].docx
│   ├── rambam/
│   ├── ramban/
│   └── ... (45+ more sages)
│
├── site-data/
│   └── חכמי ישראל.xlsx        # Master Excel sheet (992 candidates)
│
├── templates/
│   └── sage-profile.md        # Markdown template for new sages
│
├── data.json                  # Fallback local dataset (44 sages, legacy)
└── [Website code]             # Frontend files not listed here
    ├── index.html
    ├── graph.js
    ├── supabase-client.js
    └── ...
```

---

## 📖 Sage Profile Structure

### Main Profile (`sages/<slug>.md`)

Each sage has a markdown file with this structure:

```markdown
# Rabbi Name — Hebrew Name

## Overview
[1-paragraph intro + why they matter]

## Period & Location
- Period: (e.g., Tannaim / Rishonim)
- Dates: (e.g., 100–180 CE)
- Location: (e.g., ארץ ישראל, ספרד)
- Historical context: [brief backdrop]

## Main Works
| Title | Hebrew | Subject | Notes |
| ... | ... | ... | ... |

## Core Ideas & Worldview
[2-3 paragraphs on unique contributions]

## Key Relationships
- Teachers: [[slug-of-teacher]]
- Students: [[slug-of-student]]
- Contemporaries & debates: [list with cross-refs]

## Famous Sayings
> "Quote here"
> — Source (Talmud, work, chapter)

## Further Reading
- See `notes/<slug>/` for teaching materials
- See `sources/<slug>/` for research documents

## Tags
`period:tannaim` `location:israel` `speciality:halacha`
```

### Detailed Notes (`notes/<slug>/`)

For 5 sages, we maintain:

1. **`summary.md`** — 2-3 page executive summary
2. **`lesson_plan.md`** — 45-minute teaching plan with:
   - Introduction (5 min)
   - Main content (30 min)
   - Discussion (10 min)
3. **`questions.md`** — 5–10 discussion questions in Hebrew
4. **`post.md`** — 800-word blog post for web/email
5. **`related_figures.md`** — 3–5 sages with why they matter + connection types

---

## 🗄️ Backend: Supabase

### Primary Tables

**`sages`**
- id (int, PK)
- label (text, e.g., "רבי מאיר בעל הנס")
- period (text, e.g., "tannaim")
- location (text, e.g., "ארץ ישראל")
- field (text, e.g., "Halacha, Mishnah")
- bio (text, full biography)
- era (text, normalized period)
- period_order (int, for timeline sorting)
- tags (text array)
- core_concept (text, one-liner essence)
- coordinates (JSONB, if geographic)
- migration_path (JSONB, if sage traveled)

**`connections`**
- id (int, PK)
- source_id (int, FK → sages.id)
- target_id (int, FK → sages.id)
- type (text, e.g., "student", "influence", "colleague")

**`research_content`** (optional)
- id (int, PK)
- sage_id (int, FK → sages.id)
- title (text, research document title)
- content (text, extracted text from docx)

### Validation Rules
- All sage IDs must exist before creating connections
- `period` must be one of: second-temple, tannaim, amoraim, geonim, rishonim, acharonim, modern
- `link_type` must be one of: student, influence, oppose, colleague, predecessor, teacher, contemporary

---

## 🔐 Privacy & Safety Rules

### Research Documents Sensitivity

**⚠️ Important:** Research files in `sources/` contain potentially sensitive biographical material.

**Safe practices:**
- ✅ Claude reads and summarizes research (stays in chat)
- ✅ Claude extracts structured facts: dates, periods, book titles, migration info
- ⚠️ For modern/living sages: Treat biographical details as sensitive
- ❌ Claude never exports full text of research documents
- ❌ Claude never archives research files to external services
- ✅ User manually copies interesting quotes if needed

**Before Claude extracts research:**
- Confirm: "Extract only: dates, locations, major works, migration paths. No full-text export."

### Data Integrity
- Before INSERT/UPDATE to Supabase: Validate FK constraints
- Before creating new connection: Confirm both sages exist in database
- Before updating sage: Check for duplicate entries (Excel may have dupes)

---

## 🌍 Geographic & Migration Data

### 28 Locations (Hardcoded in `location-coords.js`)

| Location | Hebrew | Latitude | Longitude | Era(s) |
|----------|--------|----------|-----------|--------|
| Jerusalem | ירושלים | 31.77 | 35.23 | All |
| Babylon | בבל | 32.54 | 44.42 | Amoraim–Geonim |
| Spain | ספרד | 40.00 | -3.75 | Rishonim–Acharonim |
| Safed | צפת | 32.97 | 35.49 | Acharonim (Kabbalists) |
| Egypt | מצרים | 26.82 | 30.80 | Second Temple–Modern |
| France | צרפת | 46.23 | 2.21 | Rishonim (Tosafists) |
| Germany | גרמניה | 51.17 | 10.45 | Acharonim (Ashkenazi) |
| Poland | פולין | 51.92 | 19.15 | Acharonim (Hasidim) |
| [... 20 more] | | | | |

### Migration Paths (18 sages)

Format in Supabase `migration_path` column:
```json
{
  "from": "ירושלים",
  "to": "ספרד",
  "intermediate": ["מצרים"],
  "description": "Fleeing Roman persecution after Bar Kokhba, traveled to Egypt then Spain"
}
```

Examples:
- Rabbi Meir: Eretz Israel → Babylonia (fled persecutions)
- Rambam: Córdoba (Spain) → Fez (Morocco) → Cairo (Egypt)
- Vilna Gaon: Lithuania → brief journeys to Eretz Israel

---

## 💡 Teaching Philosophy

**Audience:** Yeshiva students and graduates

**Goals:**
1. Understand each sage's unique **contributions** (not just memorize names)
2. See **connections** between sages (student → teacher, influences, debates)
3. Grasp **historical context** (why they thought what they thought)
4. Appreciate **diversity** (different periods, geographies, specialties)

**Content approach:**
- Hebrew-first (original names, sources), English translations provided
- Cross-references everywhere (click on related sage names)
- Mix of serious scholarship + accessible storytelling
- Always cite sources (Talmud, medieval commentaries, modern research)

---

## 📋 Recurring Tasks (See INSTRUCTION.md for Details)

1. **Add New Sage** — Create profile, lesson plan, notes (2–3 hours)
2. **Generate Lesson Plan** — 45-minute teaching material (1 hour)
3. **Extract Migration Path** — From research document (30 min)
4. **Update Connections** — When you discover a sage taught another (15 min)

---

## 🎬 Current Phase

- ✅ **Phase 1–6:** Core features complete (sages, connections, visualization, search, PDF export, mobile)
- ✅ **Phase 7:** Power features implemented (comparator, connection metadata, research viewer)
- ✅ **Phase 8:** Enhanced UX with tooltips, metadata, and 7-tab interface
- 📦 **Deployment:** Website live on Vercel + working locally on port 8080

### Latest Session Status (June 19, 2026 — Continued)
- **Current working version:** Commit 47994ec (`feat: research viewer + connection metadata`)
- **Vercel deployment:** ✅ Live (auto-deploys on `git push origin main`)
- **Localhost:** ✅ Running on port 8080 via `python -m http.server 8080`
- **GitHub:** Synced with Vercel; both versions identical
- **Frontend:** All 7 tabs functional:
  - 1️⃣ רשת קשרים (Graph - D3.js force-directed network)
  - 2️⃣ טבלה (Table view)
  - 3️⃣ מפה (Leaflet.js interactive map)
  - 4️⃣ 🔍 השוואה (NEW: Sage Comparator - 2-3 side-by-side comparison)
  - 5️⃣ 📚 מחקר (NEW: Research Document Viewer - 128 documents searchable)
  - 6️⃣ אודות (About)
- **Data:** 364 sages + 25 connections with rich metadata (strength 1-5, period, context_he, evidence_source)
- **Research:** 128 document summaries indexed, linked to 24 sages
- **Lesson Plans:** 5 sages with detailed 45-min lesson plans integrated
- **New features this session:**
  - Connection metadata tooltips on graph edge hover
  - Sage Comparator with mutual connection detection
  - Research Document Viewer with search/filter by sage
  - Enhanced comparator showing connection strength ratings
  - All metadata integrated into UI

### Session — July 1, 2026 (Cowork): Quick Wins from Optimization Blueprint
- **Input:** Technical_Analysis_and_Optimization_Opportunities.docx (generated by `website-optimization-blueprint.skill`, Manus)
- **Decision:** Implement only low-risk quick wins; skip Next.js/React migration (conflicts with CLAUDE.md "no refactor" constraints)
- **Changes:**
  - `styles-graph.css`: era + connection colors added as CSS variables in `:root` (`--era-*`, `--conn-*`) — single source of truth
  - `index.html`: `initColorTokens()` IIFE builds `window.ERA_COLORS` / `window.CONNECTION_COLORS` from CSS vars, with Hebrew aliases (תנאים, ראשונים…); 3 duplicated `eraColors` objects replaced with references
  - `graph.js`: `Object.assign` merges unified colors (fallback kept); new `_measureContainer()` sizes graph from `.graph-wrapper` instead of `window.innerWidth - 320`; SVG uses `viewBox` + 100% → auto-scales on resize; `_jitter()` (id-hash) replaces `Math.random()` → stable layouts
  - `map.js`: `eraColors` merges `window.ERA_COLORS`
  - **Bug fixed:** `@media (max-width: 1024px)` set `.sidebar { width: 320px }`, overriding `width: 0` → sidebar permanently open on tablets. Now `.sidebar.active`
- **Findings / blockers:**
  - ⚠️ `data.json`: 992 nodes, **0 links**, 669 nodes with `era_key: "unknown"`, rest ~80 free-text Hebrew era values (not the 7 canonical keys). Needs normalization (with approval) — most nodes render grey, no edges, if this data is used
  - Sandbox mount caches stale file sizes after host-side edits → verify via Read tool / standalone snippet checks, not mounted `node --check`
- **Not committed:** pre-existing uncommitted changes (data.json, merge_data.py…) — owner to test on localhost:8080 first, then per-feature commits
- **Skill:** `website-optimization-blueprint.skill` exists in project root; not yet installed in Cowork

### Session — July 1, 2026 (Cowork, continued): Data Rebuild from CSV
- **Root cause found:** `merge_data.py` (Jul 1) rebuilt data.json from broken `sages.json` (992 rows: 669 completely empty, many duplicates) and "kept" links from an already-empty file → 992 nodes / 0 links / 669 grey
- **Localhost issue:** server was launched from `C:\Users\User` (home dir) instead of project folder → directory listing instead of site. Fix: `cd` to project first. Also: `supabase-client.js` actually loads from **data.json**, not Supabase (log line is misleading)
- **Rebuild (`rebuild_data_from_csv.py`, new script in root):**
  - Master source: `data/חכמי ישראל.csv` (656 rows → 343 unique sages after name-normalized dedupe, keeping most complete row)
  - era_key normalized to canonical 7 keys via keyword rules + year parsing (0 unknown; biblical figures bucketed as second-temple, פיוט קדום → geonim — approximations)
  - Links: 259 from CSV 'דמויות/השפעות קשורות' (type=influence) + 204 recovered from `data.json.backup_v4` (non-colleague, with strength/context) = **463 links**
  - 134 influence links re-directed by chronology (earlier sage → later sage)
  - 102 nodes flagged `has_research` (matched to research_summaries.json); 3 empty bios filled from research summaries
  - Backup: `data.json.backup_pre_rebuild`
- **Verified in browser:** console `343 nodes + 463 validated edges`, graph renders with colored typed edges
- **Note:** `data/חכמי ישראל.xlsx` is corrupt as zip (openpyxl can't open); CSV is the usable source
- **TODO:** push rebuilt data to Supabase (needs approval + service key); git commits still pending

### Session — July 2, 2026 (Cowork, continued): Combined Filters, Map & Full Research
- **Combined filtering (`applyCombinedFilters` in index.html):** era+region+field now intersect (were overriding each other; region filter was an empty stub; region dropdown was built from nonexistent `n.region` field). Matched nodes cluster to center with labels; links between matched shown/added on demand. Legend buttons & presets delegate into the engine. Verified: rishonim=139/185 links; +קבלה=14/10; +ספרד=1; צפת alone=7/3
- **Geography tab fixed (map.js):** (1) location split regex included a bare 'ו' — split every word containing vav (ירושלים → never matched!); (2) colors used `sage.era` (now years-text) → all grey; fixed to era_key with fallback; (3) added containment matching + 9 missing coords (פרובאנס, וולוז'ין, פרשבורג…). Result: 337/343 sages on map, colored by era
- **Research tab fixed:** (1) research.json was capped at 5,000 chars/doc — re-extracted FULL texts via `extract_full_research.py` (221 docs, 523K words, 5.6MB); (2) code bug: `doc.file` vs actual field `doc.filename` → full text never found on click; (3) research_by_sage.json rebuilt keyed by current node ids (94 sages). Verified: doc opens with 2,648 words full text
- **Perf:** `_getCurvedPath` now uses Map lookup (was O(n) find per link)
- **Gotcha:** browser caches JSON/JS aggressively on localhost — verify fixes with `fetch(url, {cache:'reload'})` + reload; compare `fn.toString()` (live) vs served source
- **Known cosmetic issue:** map-tab era legend shows 0 counts (separate legend builder, counts by old era values) — low priority

### Session — July 2, 2026 (Cowork, continued): Connected Papers Redesign
- **Layout (graph.js `_computeLayout`):** d3.forceLink added (organic clusters by actual connections) + weak forceX to era anchor (preserves time axis) + charge/collide; 150 ticks; final positions RESCALED into viewport (not clamped — clamping piled nodes on borders)
- **Visuals:** node radius by degree (`_r()`: 4+√deg·2.4, cap 24); labels always visible (9px, 17 chars + ellipsis); edges default subtle grey `#c9c3b8`, colored-by-type + thickened only on hover/selection (CP style)
- **Interaction:** `_hoverHighlight/_hoverClear` — hover spotlights node + direct neighbors via `_adj` adjacency map, dims rest; respects selection state and active combined filter; selectNode colors its edges by type and dims labels of non-neighbors
- **Sage list panel (`buildSageList` in index.html):** ranked-by-degree list in #sidebarContent (like CP's papers list) — era dot + name + connection count; click = `focusSageFromList` → selects in graph + opens details; syncs with combined filters; restored on deselect. Top: רבי עקיבא 84, רמב"ם 59, ר"י קארו 29
- **Verified in browser:** organic cloud layout, list click → highlight + details panel
- **Gotchas:** a tab froze during verification (CDP timeouts) — new tab fixed it; sandbox mount stale-size issue persists — verify via Read tool or served files via browser fetch
- **Filter layout (no overlaps):** filtered subset gets its own force layout (link+charge+collide with `_r(d)+16` for label space) and is NOT squeezed into the viewport — `net.zoomToFit(nodes)` (new in graph.js, zoom scaleExtent widened to 0.15) frames the spread. Verified: 139 rishonim, 0 overlapping pairs. Reset re-frames full network
- **Commits:** owner approved; sandbox git blocked (stale mount content + `.git/index.lock` permission) → created `commit-today.bat` for owner to run on host: 4 feature commits (data / research / feat frontend / docs). NOT pushed — push triggers Vercel deploy. INSTRUCTION.md updated with workflows #6 (CSV rebuild), #7 (research extraction), server + commit conventions

---

## 🤖 Rules for Claude Code Using This Project

1. **Respect this MEMORY.md** — Re-read it each session
2. **Always check INSTRUCTION.md** — For safe, repeatable workflows
3. **Confirm the 3-level prompt** before acting:
   - Goal: What exactly should happen?
   - Constraints: What may I NOT do?
   - Definition of done: How do we know it's complete?
4. **Privacy first** — Research documents stay read-only unless explicitly approved for export
5. **Data integrity** — Always validate FK constraints before Supabase INSERT/UPDATE
6. **Bilingual output** — Use Hebrew + English, proper punctuation (גרשיים for abbreviations)

---

## 📞 Contact & Metadata

- **Project owner:** Avraham
- **Email:** avraham.gshtein@gmail.com
- **Repository:** Local desktop (C:\Users\User\Desktop\ozar-chachamim)
- **Last updated:** June 2026
- **Status:** Active development

---

## Quick Links (in CLAUDE.md)

- **Architecture overview:** CLAUDE.md → "Project Architecture"
- **Common tasks:** CLAUDE.md → "Common Development Tasks"
- **Supabase setup:** CLAUDE.md → "Supabase Integration"
- **Troubleshooting:** CLAUDE.md → "Troubleshooting"

---

**EOF**
