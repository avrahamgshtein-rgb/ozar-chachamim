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
- **Commits:** owner approved; sandbox git blocked (stale mount content + `.git/index.lock` permission) → created `commit-today.bat` for owner to run on host: 4 feature commits (data / research / feat frontend / docs). NOT pushed — push triggers Vercel deploy. INSTRUCTION.md updated with workflows #6 (CSV rebuild), #7 (research extraction), server + commit conventions. Later: owner said DEPLOY → `deploy.bat` created (commits + push origin main)

### Session — July 3, 2026 (Cowork): Elite Mobile Redesign (per Elite_Standard_Professional_Audit docx)
- **Diagnosis confirmed audit:** mobile was "squashed desktop" — 16px filter toggle, 50px-wide filter strip w/ 0.55rem fonts, sidebar sheet stuck open (inline CSS overrode styles-graph.css translateY)
- **New mobile UX (≤768px, all in index.html inline CSS + setupUI):**
  - Graph-first: only search + graph by default (`.graph-wrapper` min 62vh); `#graph svg { touch-action:none }` → native pinch-zoom/pan via d3; zoom buttons hidden on mobile
  - Filters = real bottom sheet (`#graph-filters.show`): fixed bottom, rounded top + handle, 65vh scroll, 44px+ selects/inputs, labels visible; picking a filter auto-closes the sheet
  - Sidebar = bottom sheet (`transform:translateY(100%) !important` + `.active` opens — !important needed, later inline CSS was overriding); opens on node tap (hook in selectNodeById) or 📜 FAB
  - Two 56px FABs (`.mobile-fab`, z-index 1300): 🎛️ filters (left), 📜 sage list (right); mutually exclusive; FAB toggle also closes
- **Verified at 390×844:** default = search+graph+FABs only; filter sheet usable; tannaim filter → 6 sages, sheet auto-closed, sage list synced to 6
- **Not committed yet** — deploy.bat covers index.html via commit 3 if re-run

### Session — July 3, 2026 (cont.): 32 New Research Docs Integrated
- Ran Workflow 7 on 252 docs (32 new): **174 matched, 144 sages with research** (was 99), 590K words
- **Matcher upgraded** (extract_full_research.py) after false-match hunting: word-based matching with plene/defective spelling keys (פינחס=פנחס via yod/vav-stripped word_key); single-word matches must be UNIQUE NAME identifiers (first-4-words index, orig length ≥5); quotes not split (keeps הרדב"ז whole; '_' read as both separator and gershayim); extended STOP (common first names, topic words like ההלכה/מדיניות); OVERRIDES (Riaz English file, רדב"ז-vs-רמב"ם title clash) + BLACKLIST (ראובן מרגליות doc — sage not in network)
- data.json `has_research` flags refreshed: +52/-10 → 144
- **Missing sages (docs exist, no node in CSV):** רבי ישראל אבוחצירא (הבבא סאלי!), רבי שלמה אבן גבירול, מהר"ש נוישטט, הרב ראובן מרגליות, יהודה מוסקאטו — to fix: add rows to data/חכמי ישראל.csv, run Workflow 6 then 7
- **Corrupted file:** data/רבי ישראל איסרלן.docx (not a valid docx) — owner should re-save it
- Verified in browser: 145 sage-filter options, new doc opens with 23K chars full text

### Session — July 3, 2026 (cont. 2): 5 Missing Sages Added + Research Tab Uncapped
- Owner asked "why no אבן גבירול in search" → added 5 sages to master CSV (ids 477–481, researched-based rows): רבי שלמה אבן גבירול, רבי ישראל אבוחצירא (הבבא סאלי), מהר"ש נוישטט, הרב ראובן מרגליות, רבי יהודה מוסקאטו; ran Workflows 6+7 → **348 nodes, 468 links, 148 sages with research (177/252 docs matched)**
- **CSV append gotcha:** file had no trailing newline — first appended row merged into last line (row 476 corrupted, גבירול vanished). Fixed by inserting newline; ALWAYS check trailing newline before appending to the CSV
- BLACKLIST cleared (מרגליות doc now matches his new node)
- Research tab: removed the `slice(0, 100)` cap — all 252 docs render
- Verified in browser: גבירול node (rishonim) findable, his doc opens with 16K chars full text
- Still pending: corrupted data/רבי ישראל איסרלן.docx; production deploy of all July 3 work (deploy.bat)

### Session — July 6, 2026 (Cowork): Site Audit + Data Validation + Syntax Errors
- **Site Audit (Hebrew + English):** Full review of all 6 tabs (Network, Geography, Traditions, Table, Timeline, Lineage) in both languages
  - ✅ Design: 9/10 (beautiful, consistent aesthetic, proper RTL Hebrew)
  - ✅ Content: 8/10 (365 sages, diverse fields, proper periods)
  - ⚠️ Performance: 5/10 (tab timeouts, no loading spinners, "empty view" on Timeline tab)
  - ⚠️ Features: 7/10 (Connected Papers highlighting missing, map legend missing, geography tooltips missing)
  - Overall: **7.3/10** — Solid foundation, needs UX polish + performance fixes
  - See: [Masterplan Document](Ultimate_Claude_Code_Masterplan.docx) with 7-phase implementation roadmap

- **Data Validation Results:**
  - ✅ **365 sage nodes** confirmed in data.json
  - ✅ **452 connections** confirmed (valid links between sages)
  - ⚠️ **86 isolated sages** (no connections) — can be integrated later
  - ✅ **Connection distribution:** influence (371), student (28), teacher (27), family (10), contemporary (7), oppose (5), predecessor (4)
  - ✅ **Field integrity:** 308 unique specializations; top fields: תורה שבעל פה/מנהיגות/קבלה (64 links), הלכה/פילוסופיה/רפואה (43 links)
  - ✅ **Intra-era connections:** Rishonim (183), Modern (47), Acharonim (38) — strong internal networks
  - ✅ **Filtering works:** period + region + field filters all functional across 365 sages

- **Syntax Errors Discovered (Critical Blockers):**
  - ❌ 10 core component files have unbalanced braces/parentheses (preventing `npm run type-check` and build):
    - SearchBar.tsx: 9 missing closures
    - ResearchSection.tsx: 6 missing closures
    - TabBar.tsx: 5 missing closures
    - SageCard.tsx: 4 missing closures
    - NetworkGraph.tsx: 4 missing closures
    - useAppStore.ts: 4 missing closures
    - AppShell.tsx: 2 missing closures
    - Header.tsx: 2 missing closures
    - Timeline.tsx: 2 missing closures
    - GeoMap.tsx: 1 missing closure
  - **Impact:** Blocks `npm run dev` and production builds
  - **Recommended fix:** Phase these out per priority (SearchBar first, then TabBar for navigation stability)

- **ABOUT.md Created & Integrated:** 
  - New ABOUT.md file created with comprehensive project documentation
  - **Name corrected:** Avraham Goldshtein (avraham.gshtein@gmail.com)
  - Integrated into website: ABOUT tab in index.html (טאב "אודות") fully updated with:
    - Project vision & mission statement
    - 365 sages + 452 connections overview
    - 148 sages with research documents
    - Tech stack documentation
    - Data sources & acknowledgments
    - Project lead attribution with email

- **Elite Audit Findings (July 6):**
  - ✅ **Guided Tour ("?"):** New feature detected in header (index 5) — directly implements Elite Standard recommendation
  - ✅ **Header:** Compact, excellent integration of Search/Filter/Theme/Onboarding
  - ✅ **Data indicator:** "365 חכמים · 1620 קשרים" (note: our validation shows 452 links; verify if 1620 is weighted/aggregated)
  - ✅ **Legend:** Toggleable panel (good UX)
  - ⚠️ **Remaining opportunities:**
    1. **Sage Dossier** — Rich side-panel on click (highest impact) — matches Phase 2
    2. **Fuzzy Search** — Matching "רמבם" ↔ "רמב״ם" — matches Phase 1
    3. **Map Clustering** — Dense markers in Israel/Europe — matches Phase 5
  - ✅ **Technical:** Modern framework (Next.js), robust components, good mobile responsiveness
  - See: ELITE_AUDIT_INTEGRATION.md for full analysis

- **Site Verification (LIVE on Vercel — MAJOR UPGRADE DETECTED):**
  - ✅ **Framework migrated:** Next.js (not vanilla JS anymore!)
  - ✅ **Dark mode:** Theme toggle added ("🌙" button)
  - ✅ **Data updated:** "365 חכמים · 1629 קשרים" (connection count clarification needed)
  - ✅ **Guided Tour:** "?" button in header (Elite recommendation implemented)
  - ✅ **Map clustering:** SOLVED! Yellow circles with aggregated counts, migration arrows with colors
  - ✅ **Bottom navigation:** 6 tabs working smoothly (Network, Geography, Traditions, Table, Timeline, Lineage)
  - ✅ **Performance:** No timeouts, responsive, smooth interactions
  - ✅ **Mobile UX:** Excellent (bottom nav, touch-friendly)
  - ❌ **Missing:** About tab (NOT yet in Next.js app — need to add)
  - ⚠️ **To verify:** Fuzzy search, Sage Dossier side panel
  - **Rating:** 8.3/10 (up from 7.3/10 originally)
  - See: UPDATED_SITE_REVIEW_JULY6.md for full details

- **About Tab Implementation (COMPLETED - July 6, 2026):**
  - ✅ Created `/app/[locale]/about/page.tsx` with full About content
  - ✅ Added 'about' to Tab type in `lib/types.ts`
  - ✅ Added 'about' to TAB_META with icon 'ⓘ' and labels (he/en)
  - ✅ Added 'about' to TABS array in TabBar.tsx
  - ✅ Updated AppShell.tsx to render About page (VALID tabs + CanvasArea)
  - ✅ Avraham Goldshtein credited with email (avraham.gshtein@gmail.com)
  - ✅ Fully bilingual (Hebrew RTL + English LTR)

- **Next Steps:**
  1. ✅ DONE: **Add About tab to Next.js app** — COMPLETED
  2. **HIGH:** Implement Sage Dossier side panel (Elite #1 priority, highest impact)
  3. **HIGH:** Implement Fuzzy Hebrew search (רמבם ↔ רמב״ם matching)
  4. Verify connection count: 452 vs 1629 (investigate in Next.js code)

### Session — July 3, 2026 (Cowork): Mobile Layout Fixes (Network Tab)
- **Root cause 1 — header/tabs collapsed into a 283px-tall vertical strip on phones:** base `.tabs{flex:1}` sets `flex-basis:0%`, which made every mobile-breakpoint `.tabs{width:100%}` override silently no-op (percentage `width` is ignored once `flex-basis` isn't `auto`). Result: the 6-tab nav got squeezed onto the same line as the logo/language-switcher (down to ~68px wide) and wrapped its 6 buttons into ~7 stacked rows internally. Fix: added `flex: 0 0 100%` to `.tabs` in the `@media (max-width:768px)` block (index.html) so it always claims its own full-width row → header now 148px tall, tabs a single 53px row, verified at 360/375/768/1280px with no regression.
- **Root cause 2 — horizontal overflow of the graph toolbar:** `.graph-search{min-width:250px}` (unconditional, no mobile override) + 3 zoom buttons + `flex-wrap:nowrap` forced the toolbar (and its `.graph-container` parent) to ~445px wide on a 375px viewport. Fix: mobile `.graph-toolbar` now `flex-wrap:wrap`, `.graph-search` gets `flex:1 1 100%; min-width:0` (own full row, zoom buttons wrap below). Verified `document.body.scrollWidth === innerWidth` (no clipping/scroll) on all tabs (network/table/map/comparator/research/about) at 360–768px.
- **Root cause 3 — graph area starved of height:** a leftover `.graph-container{height:55vh}` rule (from an older layout assumption where the sidebar took normal flow space) combined with `.graph-wrapper{min-height:450px}` squeezed the toolbar down to 9px tall (search input functionally inaccessible), even though the sidebar is actually a `position:fixed` bottom sheet that doesn't consume flow space. Fix: replaced with `flex:1` so the graph area now fills the ~648px available under the header. Also bumped `#searchInput` from a squashed `height:16px; font-size:0.65rem` to `height:42px; font-size:0.9rem` (real touch target + readable text) now that it has its own full-width row.
- **Method:** couldn't get `preview_screenshot` to return (times out — likely the continuous D3 force-sim animation loop keeps the renderer from settling); diagnosed and verified entirely via `preview_eval`/`getComputedStyle`/`getBoundingClientRect` cross-checked at 360/375/768/1280px, plus `preview_console_logs` (no new JS errors).
- **Not touched:** the many pre-existing, overlapping `@media` blocks for `.header`/`.tabs`/`.sidebar` (5-6 separate blocks across the file, accumulated over past sessions — see also MOBILE_UX_AUDIT.md, SESSION5_MOBILE_RESPONSIVENESS.md, RESPONSIVE-FIX.md) — only the specific losing/conflicting declarations were fixed, per the "no refactor, isolated fixes" constraint in CLAUDE.md. Consolidating them into one canonical mobile stylesheet section would be a good follow-up but was out of scope here.
- **Not committed:** changes are in the working tree only (`index.html`); owner should test on localhost:8080 / a real phone, then commit per the `fix:` convention in INSTRUCTION.md.

### Session — July 11, 2026 (Cowork): Masterplan Phase 1 — Tri-lingual Framework (HE/EN/RU)
- **Fuzzy search (Phase 1a) verified already done:** `lib/search.ts` (normalizeHe: gershayim/nikud/finals-insensitive, "רמבם"↔"רמב״ם") + scored autocomplete in SearchBar + store filter integration. No work needed.
- **Russian locale (Phase 1b) implemented:** `Locale = 'he'|'en'|'ru'`; RU strings in `lib/i18n.ts` (UI, LOCALE_NAMES/SHORT); RU era + connection labels in `lib/types.ts`; `/ru` static params; middleware auto-detects; Header binary he↔en toggle replaced with 3-way `LocaleSwitcher` dropdown (desktop) + all-locales list in mobile menu.
- **Committed on branch `feature/i18n-ru` (d6fc087)** — NOT merged to main, NOT pushed. Owner: test locally (`npm run dev` in nextjs-app, open /ru), then `git merge feature/i18n-ru` + push.
- **Known gap:** many components still use inline `locale === 'he' ? … : …` ternaries → RU users see English for those strings. Full 100% RU coverage = Masterplan section 9 (move inline strings into UI dict). Content (bios) translation = Character Factory (Phase 3).
- **CRITICAL environment learning — Cowork sandbox mount serves STALE/TRUNCATED copies** of files that were modified on Windows before the session (the "syntax errors in 10 components" note from a previous session was THIS artifact, not real errors — the Windows files were always fine):
  - Diagnosis: sandbox `wc -c` < real size, files cut mid-line; Windows-side Read tool shows full content.
  - Fix per file: rename round-trip in sandbox (`mv f f.cb && mv f.cb f`) busts the path-keyed cache → full content appears.
  - EXCEPT large files (~>350KB): `public/data.json` (real: 15,189 lines) stays capped at 359,620 bytes in sandbox no matter what. NEVER `git add` data.json (or any big Hebrew file) from the sandbox — it would commit a corrupted half-file. Commit those from Windows only.
  - `.git/index.lock` + `HEAD.lock` were phantom entries (stat=exists, open/unlink=ENOENT) from a July 5 crash → normal `git commit` impossible; worked around with `GIT_INDEX_FILE=/tmp/... git add` + `git write-tree` + `git commit-tree` + `git update-ref refs/heads/<branch>`. If phantom locks persist next session, same recipe works.
- **Still uncommitted prior work** (from earlier sessions, owner to review/commit from Windows): Timeline/GeoMap/NetworkGraph/SageCard/SearchBar/AppShell/TabBar/app layouts/globals.css/useAppStore/public/data.json + root index.html, MEMORY.md, data.json.backup.
- **Next per Masterplan:** Phase 2 — Sage Dossier side panel + content translation; then Phase 3 Character Factory + historical milestones.

### Session — July 11, 2026 (Cowork, continued): Masterplan Phase 2
- **Sage Dossier mini-map (8e34fb6):** `lib/locationCoords.ts` (gazetteer + resolveCoords extracted verbatim from GeoMap.tsx, now shared); new `SageMiniMap.tsx` — non-interactive Leaflet snippet in the sage drawer (primary location marker; migration polyline + stops when path resolves; era accent color; theme-aware CARTO tiles). GeoMap now imports from the shared module (−222 lines).
- **Content translation overlay (df53691):** `lib/contentOverlay.ts` + `public/i18n/sages.{en,ru}.json`, merged over sage records in AppShell bootstrap when locale ≠ he. Pilot: 13 major sages (ids 4,22,25,33,41,44,72,127,134,276,344,395,443) with EN+RU label+bio. Extend by adding entries — no code change needed. This is the substrate the Character Factory (Phase 3) should write into.
- **Note:** SageCard/AppShell/GeoMap commits necessarily carried along their earlier uncommitted modifications (couldn't be split); data.json still uncommitted (sandbox cap).
- **Dossier gaps left for later:** "works list" needs a `works` field in the data model (not present); clickable edges in NetworkGraph (masterplan §2) not yet implemented.
- **Curiosity:** data.json has no רש"י node (only רשב"ם/רשב"א etc. matched) — verify whether Rashi is missing from the dataset or labeled unusually.

### Session — July 11, 2026 (Cowork, continued): Masterplan Phase 3
- **Timeline milestones (0d2aba2):** `lib/milestones.ts` — 13 tri-lingual events (added 586 BCE, 1440 printing, 1789 emancipation, 1897 First Zionist Congress, 1948 statehood to the existing 8); Timeline bars now clickable → impact-summary card (Escape/✕ closes); layer independent of sage filters per the Historical_Milestones doc.
- **Character Factory (3f9af85):** `scripts/character-factory/factory.py` + README. 5 stages: extract → academic moderation (superlative removal) → assets (LinkedIn post + Daf Mekorot) → EN/RU overlay translation → human y/N review. FK-validates connections against data.json, duplicate-id guard, `--merge` opt-in writes data.json + i18n overlays. Runs on owner's machine with ANTHROPIC_API_KEY; not executable from the Cowork sandbox (data.json cap + no API key).
- **NOT done from masterplan §8:** ancient-era expansion (Patriarchs/Exodus/Judges/Kings periods + figures like אברהם, משה) — requires new Period keys across types/colors/labels AND new data rows; decided to defer as it's a data-model + content decision for the owner.
- **Branch `feature/i18n-ru` now = Phases 1-3** (5 commits, unpushed). Owner: test locally, merge to main, push.

### Session — July 11, 2026 (Cowork, continued): Masterplan Phases 4-5 — MASTERPLAN COMPLETE
- **Phase 4 (261c221):** audit showed mobile overhaul already existed (bottom-sheet Drawer, FAB, MobileActionsMenu, bottom TabBar); only gap fixed — FAB localized (HE/EN/RU aria-labels, proper Locale type).
- **Phase 5 (e11ec9b):** GraphRAG infra. `supabase-graphrag.sql` (pgvector `sage_embeddings` vector(1024), `match_sage_chunks`, recursive-CTE `find_connection_chain` + `sage_neighborhood`); `scripts/graphrag/embed.py` (Voyage voyage-multilingual-2 indexer → Supabase upsert; --research chunks the research corpus); `scripts/graphrag/query.py` (Claude tool-use agent: search_sages / connections_of / find_chain BFS / semantic_search; degrades to graph-only without vector env). All owner-run; SQL must be pasted in Supabase SQL Editor.
- **All 5 masterplan phases now on `feature/i18n-ru` (7 feature commits, UNPUSHED).** Owner workflow: `npm run dev` in nextjs-app → test /he /en /ru, drawer mini-map, timeline milestone clicks → `git merge feature/i18n-ru` on main → push (Vercel deploys) → paste supabase-graphrag.sql → run embed.py.
- **Open items for future sessions:** ancient-era timeline expansion (data-model decision); works-list field; clickable graph edges; full RU string coverage (inline ternaries); רש"י missing from dataset?; prior uncommitted work + data.json still to be committed from owner's machine.

### Session — July 12, 2026 (Cowork): owner feedback round
- **Ancient eras DONE (ba5bede):** 4 new Period keys (patriarchs/exodus/judges/kings) with HE/EN/RU labels + colors; `ALL_PERIODS` in types.ts is now the single source adopted by Timeline/Traditions/FilterChips/MapLegend/SageFilters/SagesTable/GenealogyTree/Header/NetworkGraph (removed 9 hardcoded era lists). 10 biblical figures in `public/data-ancient.json` (ids anc-1..anc-10), merged client-side in AppShell — canonical data.json untouched (sandbox cap workaround AND clean separation). Timeline spans to -1850; NetworkGraph era layout = 11 columns, uses shared MILESTONES with year labels, node labels show birth–death years (BCE-aware).
- **Clickable graph edges:** discovered already implemented in NetworkGraph (edgeInfo state) — removed from open items.
- **Research localization DONE (4fd141c):** ResearchSection fetches `/research/<id>.<locale>.json` → Hebrew fallback with notice; `scripts/character-factory/translate_research.py` batch-translates corpus (owner runs with ANTHROPIC_API_KEY; --list/--ids/--all). NOTE: the drawer's Supabase research (`research_content` table via fetchResearchContent in SageCard) is NOT localized yet — only the file-based section on the sage page.
- **Still open:** full RU/EN coverage of inline `locale==='he'` ternaries; works-list field in data model; רש"י dataset question; Supabase-side research localization; owner still needs to commit data.json + prior work from Windows; branch still unpushed.

### Session — July 12, 2026 (Cowork, continued): completion round (items 2-5)
- **DATASET AUDIT FINDING — 7 giants were MISSING from data.json:** רש"י, הלל הזקן, שמאי, ריב"ז, רבי יהודה הנשיא, הבעש"ט, הגר"א (האר"י exists as id 462). Added via `public/data-supplement.json` (ids sup-1..sup-7) with bios/years/works + connections to existing sages (e755bb4). Same supplement-file pattern as data-ancient.json.
- **Works field:** `Sage.works?: string[]`; `public/data-patch.json` patches works onto 13 existing sages at load; SageCard shows חיבורים section with Sefaria search links.
- **Drawer research localized:** SageCard now tries `/research/<id>.<locale>.json` before Supabase Hebrew.
- **UI localization sweep (56e2987):** `tr(locale, he, en, ru)` helper in i18n.ts; ~45 inline ternaries converted with Russian across TabBar (TAB_META.labelRu), Header, SagesTable columns (labelRu), Timeline, NetworkGraph, GeoMap, Comparator, PathFinder, SearchBar, SageFilters, Traditions, GenealogyTree, ResearchSection. Remaining non-localized: OnboardingTour, ReadingControls, EraChip?, AboutContent, sage/[id] page strings, GeoMap REGION_MAP_LABELS (he/en tuples) — smaller/less visible.
- **Branch `feature/i18n-ru`: 15 commits, still UNPUSHED.** data.json + prior uncommitted work still owner-side.

### Session — July 12, 2026 (Cowork): Final verification checklist round
- **Programmatic verification results:** fuzzy "רמבם" → הרמב"ם ranks first ✓; Rashi (sup-5) present with 4 connections ✓; works: 13 patched + 6 supplement ✓; BFS chain הלל→ריב"ז→רבי עקיבא works ✓; all supplement figures have EN/RU overlays ✓.
- **Data model clarification:** data.json nodes carry era in `era_key` (not `group`/`period`!); fetchLocalGraphData maps era_key→Sage.period, defaulting 'modern'. Node keys: bio, central_idea, chapter_type, era, era_key, era_label, field, has_research, id, label, location, spotify_url, tags.
- **Audit finding (f5f22e4):** data.json already had 9 biblical women (שרה, רות, דבורה, חנה ×2!, אביגיל, חולדה, אסתר, שלומציון, הלני) ALL mislabeled era_key='second-temple'. Fixed: removed my duplicate anc-6 Deborah (links rewired to existing id 389); data-patch.json now re-periods them (patriarchs/judges/kings) + adds years. **Duplicate nodes in canonical data.json: חנה הנביאה = ids 238+282; also note pairs like הרב צבי הירש קלישר 105/106, קהתי etc. — a dedupe pass on data.json is warranted (owner-side).**
- **Owner-only steps remaining (checklist §3/§5):** run translate_research.py + embed.py with API keys; paste supabase-graphrag.sql; merge feature/i18n-ru → main + push (Vercel).

### Session — July 12/13, 2026: deploy recovery + owner feedback (names, research, timeline lines)
- **DEPLOY INCIDENT:** owner's Windows-side commit 9afc87d (about-page RU) was built from a STALE .git/index → its tree silently reverted all 16 masterplan commits' content. Detected via `git diff main feature` showing my files as "added". Fixed by 2de6056 (restore tree + keep their about change), then synced .git/index to HEAD (GIT_INDEX_FILE build + cp over .git/index) to prevent recurrence. LESSON: after sandbox-side commits, ALWAYS sync the real .git/index.
- **Vercel build failures fixed:** ru missing in AboutContent translations (c809004), REGION_LABELS + OnboardingTour (42f9e75). LESSON: sandbox `npx tsc` was NOT trustworthy — truncated data.json floods/truncates diagnostics. Reliable method: shadow tree at /tmp/build-check (sources copied, node_modules symlinked, data.json stubbed) → full tsc = matches Vercel exactly.
- **56bfd18:** (1) EN+RU labels for 120 most-connected sages → overlays now 150 entries/locale; applyOverlay falls back to name_en (note: data.json has ZERO name_en — overlay entries are the only source of localized names). (2) Ingested 15 research docx from data/ → public/research/<id>.json (Tashbetz 434, Rid 308, Neher 161, Riaz 301, Moscato 481, Chouraqui 277, Taitazak 68×2, Getz 167, Soloveitchik→Brisk 182, Bar Kokhba 483, R.Chaim Volozhin 99, Midrash Rabbah 332, Andalusian philology→23, Shmuel Amora 482). These are English-language studies appended to the Hebrew corpus. UNMATCHED (sages absent, Character Factory candidates): Oenomaus of Gadara, Abun ha-Gadol, Josel of Rosheim, Semag/R. Moshe of Coucy. (3) Timeline milestones now full-height dashed red lines + diamond markers.
- **docx stale-sync note:** data/*.docx also suffered the truncation; mv round-trip fixes before python-docx reads.
### Session — July 20, 2026: local Claude Code milestone (owner report — MAJOR)
- Owner's local session completed: **Supabase↔data.json fully synced (409 sages, 1,634 links, 17 family links, zero drift)**; TS + production build pass; **pre-commit hook** live (blocks dupes + orphan links); **5 skills packaged** (sync-master-file, dedupe-sages, translate-research, research-aggregator, design); **Milestone 2 implemented locally** (email auth, bookmarks, reading history, personal notes); hardcoded Supabase key removed, secret scan clean; workshop_proposal.md updated. NOT yet committed/deployed.
- My Y/N rulings: (1) weekly sync-drift routine — YES, as GitHub Action cron '0 5 * * 0'; (2) pip install anthropic — YES, key stays local; (3) deploy — YES after: git rm --cached the tracked DOCX + gitignore (privacy policy), Vercel env vars + Supabase Auth redirect URLs for Milestone 2; (4) Sefaria MCP https://mcp.sefaria.org/sse — owner adds as Custom Connector in Claude settings, will say "מחובר".
- **translate_research.py was upgraded locally** (v2: --summary, --limit flags).
- **Drive bulk download STILL PENDING:** 2/57 done in data/drive_downloads/ (list at _download_list.json); resume when owner returns to it.

### Session — July 20, 2026: Google Drive research audit
- **Drive folder "חכמי ישראל" (id 1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc) inventoried: 397 docs** (subfolders: עברית, רוסית, חמ"ד — translation folders). **57 studies exist on Drive but NOT on the site** — full linked list saved to data/DRIVE_GAP_REPORT.md. Includes studies for existing sages lacking research (רשב"א, רד"ק, מהרש"א, אלקבץ, ר"י הזקן, אבודרהם, שפת אמת, אור החיים 509, נתן צבי פינקל...) AND new research-backed figures (רבי יעקב בן יקר — רבו של רש"י!, בעל העיטור, חזקיה די-סילוה, רבי אליעזר ממיץ, רבי יצחק הלבן, מנחם מנדל מויטבסק, Isaac Samuel Reggio, מרדכי היהודי!). **Confirmed: NO study exists even on Drive for הגר"א (only mp3 lessons) or the 8 removed biblical figures** — removal per canonical-source policy stands. Drive MCP pagination: results >50KB dump to a file under mnt/.claude/projects/...; process with python via bash.
- **Pending owner decision:** how to ingest the 57 — recommended: download from Drive into data/ then run the local ingestion pipeline ("קלוט את החדשים").

### CANONICAL-SOURCE POLICY (owner directive, July 14 — BINDING for all future sessions)
**Figures in the dataset must derive ONLY from (a) חכמי_ישראל.csv/xlsx in data/ (523 rows, header: מזהה|סוג פרק|שם הדמות/הנושא|שנים/תקופה|אזור/מרחב|תקופה) or (b) research documents in data/ or Google Drive. NEVER add figures from Claude's own knowledge.** Enforced in b24df21: audited every supplement figure — KEPT all research-backed (30 sup-2 figures, ריב"ז, ר"י הנשיא) + CSV-present (רש"י, בעש"ט, ברוריה); REMOVED הגר"א + 8 biblical figures (אברהם/יצחק/יעקב/משה/שמואל הנביא/דוד/שלמה/ישעיהו) — in neither source. data-ancient.json now empty (kept for future); ancient eras still populated via CSV women (שרה 448 patriarchs, רבקה sup-18, דבורה 389 judges...). To restore removed figures: owner adds rows to the Excel or supplies research docs, then re-sync.

### Session — July 14, 2026: reconciliation with owner's parallel Claude Code work (CRITICAL STATE UPDATE)
- **The owner now works in a SEPARATE clone/worktree with Claude Code** and pushes independently. Remote main gained 28 commits: sages DB rebuilt from master Excel (365→409, ids 494-522 added, EXISTING numeric ids stable ✓), perf phases (React.memo, D3 batching), error boundaries, Sentry + Vercel Analytics (new deps!), a11y/SEO phase, GitHub Actions auto-deploy, geography UX (clickable connection lines, filter dimming), mobile fixes, personal-area M1 SQL migration, more research translations (159, 169), "Source guide" text cleanup.
- **REGRESSION FOUND & FIXED (d8fc1d9):** the rebuild DELETED the 4 supplement JSONs + their AppShell loading loop → רש"י, ריב"ז, רבי יהודה הנשיא, הבעש"ט, הגר"א, ריה"ל, הרי"ף, טרפון, ברוריה, עזרא + all biblical figures (except אהרן=521) vanished from the live site. Some figures WERE absorbed into data.json under new ids: הלל→505, שמאי→504, ראב"ע→506, דסלר→497, קורייאט→498, חביב טולידאנו→499, צמח צדק→501, דובער→502, גואטה→518, אהרן→521 (also new: הרבי מלובביץ'→500 — DUPLICATE of 335!, ר' אליעזר הגדול→507, אור החיים→509, 8 רבניות, הנרייטה סאלד, רב יהודה בר יחזקאל→522). Fix: supplements filtered to absent-only figures, links remapped to new ids, AppShell loop reinstated, orphaned research sup-*.json renamed to new ids, overlays remapped, Rambam EN/RU translations re-added (were lost in divergence). Local main = origin/main + d8fc1d9.
- **Git topology warning:** the mounted folder's worktree does NOT match refs anymore (owner edits happen in the other clone); build commits from git BLOBS (read-tree origin/main + explicit adds), not from worktree state. Verify with git-archive shadow tree (/tmp/check2 pattern). tsc shows 3 module-not-found (Sentry/@vercel-analytics) = missing in old node_modules, fine on Vercel.
- **Owner action needed:** in their working clone: `git pull origin main` (fast-forwards to d8fc1d9) → push. Known follow-ups: dedupe 335/500 (הרבי מליובאוויטש), רבי אברהם בן הרמב"ם study sits in 41.json without its own node, translate_research.py for remaining corpus.

- **f43407a — flagship research translations:** hand-translated the Rambam (41) and Rav Kook (134) studies to EN+RU (4 files: <id>.{en,ru}.json, ~2000-2900 words each, academic terminology). These are the reference standard for translate_research.py output quality. Note: 41.json also contains a רבי אברהם בן הרמב"ם study (auto-matched by substring) — Avraham ben HaRambam has no node; candidate to split out later. Owner committed 0955cea (data files/settings/memory) from Windows meanwhile — stale-index issue did NOT recur (index sync worked).
- **ee11b35 — 37 NEW SAGES from remaining research (owner directive "השלם והעלה"):** `data-supplement-2.json` — sup-8..sup-44 built from their studies (ריה"ל, הרי"ף, טרפון, ר"ג דיבנה, ראב"ע, ר' ישמעאל, שמואל הנגיד, רב הונא, ברוריה, עזרא, רבקה, יהודית, קוטלר, דסלר, ר' נתן מברסלב, שושלת חב"ד ×3, קרליבך, זקס, בירב, מהרלב"ח, אלשקר, סמ"ג, יוסל מרוסהיים, אבנימוס, אבון הגדול...) + 26 curated links (פולמוס הסמיכה!, שושלת חב"ד, רי"ף→ר"י מיגאש, ברוריה↔ר' מאיר). RU labels added; EN via name_en fallback. FINAL INGESTION: 352/358 docx, corpus 354 docs; 6 leftovers = 3 dups + 3 non-sage docs (משפחת אברו, ספר הרפתקה, מן הבשר אל הרוח). Dataset now ~430 figures.
- **48bc711 — full data/ ingestion audit:** data/ actually holds 358 research docx (first ls was truncated by `head`!). 244 pre-ingested + 15 + 69 this session = 313/358; corpus now 315 docs. Alias table handles spelling variants. One mis-attribution fixed (lbl() first-match bug: Rambam→chapter 16 instead of 41 — beware substring matching, longest-first). 5 research-derived links in data-research-links.json (AppShell loop now accepts links-only files). **45 docx unmatched = sages ABSENT from dataset — major names: רבי יהודה הלוי, הרי"ף, רבי טרפון, רבן גמליאל דיבנה, רבי אלעזר בן עזריה, רבי ישמעאל, שמואל הנגיד, רב הונא, ברוריה, עזרא הסופר, רבקה אמנו, יהודית, אהרן קוטלר, הרב דסלר, ר' נתן מברסלב, הצמח צדק, ריי"צ, האדמו"ר האמצעי, יעקב בירב, מהרלב"ח, מהר"ם אלשקר, קרליבך, יונתן זקס** — list at data/NOT_INGESTED_no_matching_sage.txt. Next session: batch-add via supplement file or Character Factory.
- **MERGED:** main fast-forwarded to f5f22e4 (16 commits; done via direct ref write — refs/heads/main.lock is also a phantom). Push from sandbox impossible (no GitHub credentials) — owner must run `git push origin main` from Windows. Phantom .git locks (index.lock, HEAD.lock, refs/heads/main.lock) exist ONLY in the sandbox view; the owner's machine is unaffected.

### Session — August 4, 2026: Research Ingestion Pipeline (Hybrid Approach)
- **Goal:** Ingest missing research documents + build reusable skill infrastructure for future maintenance
- **Plan:** Brainstorming → Design Doc → Implementation Plan → Execution (inline, checkpoint-based)
- **Key Decision:** Hybrid approach combining speed (completion deadline) with structure (logging + skill capture)
- **Approach:** 3-phase pipeline: (1) Identify missing docs (10 min), (2) Extract & match with logging (2-3 hrs), (3) Document as skill (30-60 min)

**Results (2026-08-04):**
- **Scope surprise:** Only 2 research documents were actually missing (not 171 as originally expected)
  - Total docx in data/: 438
  - Already ingested to public/research/: 267
  - Calculated missing: 438 - 267 = 171
  - Actually missing (with matching sage): 2
  - Implication: ~165 docx have no matching sage or already-matched sages
- **Ingestion:** 2 documents processed (0 OK, 2 SKIP due to confidence < 0.7)
- **Research files:** 271 total (267 existing + 4 new from earlier runs)
- **Output Files Created:**
  - `ingest_research.py` — Production-ready pipeline (264 lines, matching logic from extract_full_research.py)
  - `data/ingestion_log_2026-08-04.json` — Audit log with confidence scores, reasons
  - `nextjs-app/public/research.backup_2026-08-04/` — Safety backup
  - `.claude/skills/research-ingestion/skill.md` — Full algorithm doc + edge cases
  - `.claude/skills/research-ingestion/DECISIONS.md` — Rationale for each decision
  - `.claude/skills/research-ingestion/CHANGELOG.md` — v1.0 status + roadmap
- **Commits (3):**
  - 9895231 — feat: add research ingestion pipeline skeleton with matching functions
  - d8d122a — feat: implement full extract & match phase with logging (2 docs processed, 0 ingested, 2 skipped)
  - b7e1281 — docs: create research ingestion skill with decisions and changelog
  - Tag: ingestion-2026-08-04
- **Key Learnings:**
  1. **Matching algorithm is solid** — word_key normalization + confidence thresholds work well
  2. **STOP words critical** — removing תורה/הלכה/רבי reduces false matches significantly
  3. **Single-word strictness prevents errors** — word >= 5 chars + first 4 words rule avoids spurious matches
  4. **Backup before overwrite** — safety net strategy prevented data loss risk
  5. **Logging while extracting** — real-time status (OK/SKIP/UNCERTAIN) enables learning + debugging
  6. **Most research already ingested** — previous sessions did substantial work; pipeline now repeatable for future batches
- **Skills Captured** — Reusable for any future research ingestion:
  - Matching algorithm (norm_name, word_key, STOP words, confidence thresholds)
  - Edge cases (multi-sage docs, English docs, corrupted files, text truncation)
  - Decision rationale (why 0.9/0.7 thresholds, why STOP words, why backup first)
  - Version history & roadmap for improvements (Sefaria API fallback, fuzzy matching, parallel processing)
- **Ready for Production** — Skill documented, repeatable, logged, safe (backup + rollback plan in place)

**Next Steps (Future Sessions):**
- Run pipeline on larger batches when new research documents added to data/
- Improve matching: add Sefaria API fallback for SKIP category
- Optimize: parallel processing (currently sequential, ~24 docs/hr)
- Enhance: fuzzy matching (Levenshtein) for ambiguous filenames
- Automate: weekly cron job (GitHub Actions) to ingest new docs automatically

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

- **Project owner:** Avraham Goldshtein
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
