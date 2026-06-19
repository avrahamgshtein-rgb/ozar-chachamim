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

- ✅ **Phase 1–5:** Core features complete (sages, connections, visualization, search, PDF export, mobile)
- ✅ **Phase 6:** Network graph redesigned (Connected Papers style + tooltips + connection labels)
- 📦 **Deployment:** Website live on Vercel + working locally on port 8080

### Latest Session Status (June 2026)
- **Current working version:** Commit 18afa2a (`feat: redesign network graph to match Connected Papers + add tooltips and connection labels`)
- **Vercel deployment:** ✅ Operational (auto-deploys on `git push origin main`)
- **Localhost:** ✅ Running on port 8080 via `python -m http.server 8080`
- **GitHub:** Synced with Vercel; both versions identical
- **Frontend:** All 5 tabs functional (graph, map, traditions, ideas, timeline)
- **Data:** 323 sages + 25 validated connections loaded from Supabase or fallback data.json
- **Issue resolved:** Vercel config error fixed (removed invalid `"public": true` from vercel.json)

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
