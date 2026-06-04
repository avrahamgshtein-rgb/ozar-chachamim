# 🏛️ PROJECT_CLAUDE.md — אוצר חכמים

**פרויקט:** אוצר חכמים — בסיס ידע אינטראקטיבי על חכמי ישראל לדורותיהם
**שפה:** Hebrew + English (bilingual, RTL)
**Repository:** Local (C:\Users\User\Desktop\ozar-chachamim)
**Owner:** Avraham Gshtein (avraham.gshtein@gmail.com)

---

## 📊 **PROJECT OVERVIEW**

### **Mission**
Create an interactive, structured knowledge base of 323 Jewish sages across 7 historical periods, with:
- D3.js network visualization (graph, map, traditions, ideas, timeline)
- Supabase backend (PostgreSQL + RLS)
- Automated research enrichment from local files & Google Drive
- Real-time AI chat integration on website

### **Current Status: Session 3 Complete ✅ + Session 4 In Progress 🚀**

**Session 1-2:** Foundation Complete
- ✅ 323 sages in Supabase
- ✅ 5 interactive tabs (graph, map, traditions, ideas, timeline)
- ✅ Skills: extract-sage-from-local-file, enrich-sage-in-supabase
- ✅ Plugin: research-enrichment-plugin (orchestrator)
- ✅ Website live on Vercel (https://ozar-chachamim.vercel.app/)

**Session 3:** Automation Layer Complete
- ✅ Slash commands (/extract, /enrich, /watch, /sync-drive, /status, /list-sages, /help)
- ✅ Hooks & Routines: on-file-upload.js (instant enrichment) + schedule-enrichment.js (Sunday 2 AM)
- ✅ npm scripts for all operations (watch, schedule, enrich, agent)
- ✅ Full audit trail logging

**Session 4:** Intelligent Automation (In Progress)
- ✅ Claude in Chrome integration setup & guide
- ✅ Agent framework (agent-enrichment.js) with Plan Mode
- [ ] Full Claude in Chrome implementation (requires extension)
- [ ] AI Chat UI component
- [ ] Advanced automation (n8n/Zapier integration)

---

## 🗂️ **ARCHITECTURE**

### **Frontend Stack**
- **HTML/CSS/JS**: Single-page app (index.html, responsive design)
- **D3.js v7**: Force-directed network graph (sages + connections)
- **Leaflet.js**: Geographic map (migration paths, locations)
- **Search**: Semantic search index (323 sages × key terms)
- **Styling**: Hebrew RTL support, dark mode ready
- **Hosting:** Vercel / GitHub Pages (planned)

### **Backend Stack**
- **Supabase**: PostgreSQL database
  - `sages` table (323 rows: id, label, bio, period, location, tags, etc.)
  - `connections` table (25 validated relationships: student, teacher, influence, etc.)
  - `audit_log` table (track all enrichments)
  - RLS policies (public read, authenticated write)
- **Authentication**: JWT via Supabase Auth
- **API Access**: Supabase REST API (anon key + service role key)

### **Data Pipeline**
```
Local Files (data/ folder)           Google Drive (research docs)
       ↓                                      ↓
extract-sage-from-local-file.js      (same as local)
       ↓
Structured JSON {bio, works, ideas, related_sages, locations}
       ↓
enrich-sage-in-supabase.js
       ↓
Supabase UPDATE/INSERT
       ↓
Website updated in real-time (D3 graph refresh)
```

### **Automation**
- **Watch Mode**: `npm run watch:start` (continuous monitoring of /data/)
- **One-Time**: `npm run watch:once` (single batch process)
- **Scheduled**: n8n / cron job (every Sunday 2 AM)
- **Manual**: `/enrich` slash command (on-demand)

---

## 📁 **DIRECTORY STRUCTURE**

```
ozar-chachamim/
│
├── 📋 DOCUMENTATION
│   ├── CLAUDE.md                      ← Global rules & architecture
│   ├── MEMORY.md                      ← Project context (323 sages, schemas)
│   ├── INSTRUCTION.md                 ← Recurring workflows (5 tasks)
│   ├── PROJECT_CLAUDE.md              ← This file (project overview)
│   ├── SESSION2_INTEGRATION_PLAN.md   ← Google Drive + Skills strategy
│   ├── SESSION2_IMPLEMENTATION_README.md
│   ├── SESSION2_FILE_GUIDE.md
│   ├── LOCAL_FOLDER_WATCH_GUIDE.md
│   └── PROGRESS_REPORT_CLAUDE_WORKSHOP.md
│
├── 🔧 SKILLS (Reusable Tasks)
│   ├── extract-sage-from-google-doc.js       (Google Docs only)
│   ├── extract-sage-from-local-file.js       (docx, txt, md)
│   ├── enrich-sage-in-supabase.js            (UPDATE sages + INSERT connections)
│   └── README.md                             (how to use skills)
│
├── 🤖 PLUGINS (Orchestrators)
│   ├── research-enrichment-plugin.js         (reads files → extract → enrich)
│   └── README.md
│
├── 🔌 CONNECTORS
│   ├── GOOGLE_DRIVE_CONNECTOR_SETUP.md       (setup guide)
│   └── google-drive-connector.js             (read from Google Drive API)
│
├── ⚙️ AUTOMATION
│   ├── watch-local-folder.js                 (continuous monitoring)
│   ├── run-enrichment.js                     (main CLI entry point)
│   ├── hooks/
│   │   ├── on-file-upload.js                 (trigger on new file - Session 3)
│   │   ├── schedule-enrichment.js            (cron job: Sunday 2 AM - Session 3)
│   │   └── README.md                         (hooks documentation)
│   ├── commands/
│   │   └── slash-commands.js                 (7 CLI commands - Session 3)
│   └── agent-enrichment.js                   (intelligent agent - Session 4)
│
├── 📊 DATA
│   ├── data/                                 (user research files)
│   │   ├── processed/                        (successful enrichments)
│   │   └── failed/                           (manual review needed)
│   ├── sages/                                (markdown profiles - archival)
│   ├── notes/                                (detailed lesson plans - 5 sages)
│   └── sources/                              (research documents - 54 files)
│
├── 🌐 WEBSITE
│   ├── index.html                            (main SPA)
│   ├── supabase-client.js                    (database client)
│   ├── graph.js                              (D3.js visualization)
│   ├── styles-graph.css                      (responsive styling)
│   ├── config.example.js                     (Supabase credentials template)
│   └── [other frontend files]
│
├── 📦 CONFIG
│   ├── package.json                          (dependencies + npm scripts)
│   ├── .env.example                          (environment variables)
│   ├── .gitignore                            (exclude secrets)
│   └── [Supabase schema SQL files]
│
└── 🎓 SESSIONS
    ├── Session 1: CLAUDE.md + MEMORY.md + INSTRUCTION.md (foundations)
    ├── Session 2: Skills + Plugins + Connectors (automation)
    ├── Session 3: Slash commands + Hooks + Deployment (this)
    └── Session 4: Claude in Chrome + Agentic workflows
```

---

## 🎯 **KEY FILES & THEIR PURPOSES**

| File | Purpose | Status |
|------|---------|--------|
| **CLAUDE.md** | Global rules for all projects | ✅ Session 1 |
| **MEMORY.md** | Project context (facts, schemas, periods) | ✅ Session 1 |
| **INSTRUCTION.md** | 5 recurring workflows | ✅ Session 1 |
| **PROJECT_CLAUDE.md** | Project-specific overview | ✅ Session 3 |
| **LOCAL_FOLDER_WATCH_GUIDE.md** | Local file watching setup | ✅ Session 2 |
| **SESSION3_HOOKS_IMPLEMENTATION.md** | Hooks & routines guide | ✅ Session 3 |
| **SESSION3_PROGRESS_SUMMARY.md** | Session 3 completion report | ✅ Session 3 |
| **CLAUDE_IN_CHROME_SETUP.md** | Browser automation guide | 🆕 Session 4 |
| **commands/slash-commands.js** | 7 CLI commands | ✅ Session 3 |
| **hooks/on-file-upload.js** | Auto-enrich on file upload | ✅ Session 3 |
| **hooks/schedule-enrichment.js** | Sunday 2 AM sync daemon | ✅ Session 3 |
| **agent-enrichment.js** | Intelligent automation agent | 🆕 Session 4 |
| **Skills/** | Reusable extraction & enrichment | ✅ Session 2 |
| **Plugins/** | Orchestrator for skills | ✅ Session 2 |
| **Website/** | D3.js + Supabase frontend | ✅ Vercel Live |

---

## ⚙️ **RUNNING THE PROJECT**

### **Development Mode**
```bash
# Install dependencies
npm install

# Configure Supabase credentials
cp .env.example .env
# Edit .env with your Supabase URL + keys

# Start local file watcher
npm run watch:start

# In another terminal: start web server
npm run dev    # or: python -m http.server 8080

# Open browser: http://localhost:8080
```

### **Enrichment (Manual)**
```bash
# Preview changes (safe, no execution)
npm run enrich:preview

# Preview with first 3 files
npm run enrich:test

# Execute enrichment
npm run enrich:apply
```

### **Scheduled Automation (Optional)**
```bash
# Setup: every Sunday 2 AM, auto-sync Google Drive
npm run schedule:start

# Stop scheduler
npm run schedule:stop

# View logs
npm run schedule:logs
```

---

## 📚 **SAGE DATA SCHEMA (Supabase)**

### **Sages Table (323 rows)**
```sql
id              INTEGER PK
label           TEXT (e.g., "Rabbi Meir — רבי מאיר")
period          TEXT (tannaim, amoraim, geonim, rishonim, acharonim, modern)
location        TEXT (ארץ ישראל, ספרד, בבל, etc.)
field           TEXT (Halacha, Philosophy, Kabbala, etc.)
bio             TEXT (full biography, 500-2000 chars)
era             TEXT (normalized period)
period_order    INTEGER (for timeline sorting)
core_concept    TEXT (main idea/contribution)
tags            TEXT[] (e.g., ['period:rishonim', 'location:egypt', 'speciality:philosophy'])
main_works      JSONB (e.g., ["Mishneh Torah", "Guide for Perplexed"])
coordinates     JSONB (lat/lng for map)
migration_path  JSONB (from → to → intermediate cities)
research_enriched_at TIMESTAMP (when last updated)
```

### **Connections Table (25+ rows)**
```sql
id          INTEGER PK
source_id   INTEGER FK → sages.id
target_id   INTEGER FK → sages.id
type        TEXT (student, teacher, influence, colleague, contemporary, oppose, predecessor)
```

### **Audit Log Table (track changes)**
```sql
id          INTEGER PK
action      TEXT (enrich_from_local_file, enrich_from_google_drive, etc.)
sage_name   TEXT (who was enriched)
source_file TEXT (which file)
timestamp   TIMESTAMP
```

---

## 🔑 **CRITICAL CONSTRAINTS**

### **Privacy First (Session 1 Pattern)**
- ✅ Research documents in `sources/` are read-only
- ✅ No full-text export without approval
- ✅ Extract structured data only (dates, locations, works)
- ✅ Audit trail: log all changes to `audit_log`

### **Data Integrity**
- ✅ Validate FK constraints before INSERT/UPDATE
- ✅ Check for duplicates (no duplicate connections)
- ✅ Confirm all periods/locations are valid (see MEMORY.md)
- ✅ Bilingual labels: "Rambam — הרמב״ם" (never English-only)

### **Context Management**
- ✅ CLAUDE.md file per project (Claude reads it first)
- ✅ Never assume state; always read CLAUDE.md
- ✅ Token budget: 5-10K per task; break large tasks into sub-tasks
- ✅ Use MEMORY.md for long-term facts (323 sages, 7 periods, etc.)

### **Hebrew RTL & Bilingual**
- ✅ All labels bilingual: "Rambam — הרמב״ם"
- ✅ Proper gematria marks (״ for abbreviations): "ש״ס", not "SHS"
- ✅ RTL support in CSS (right borders, proper direction)

---

## 📋 **SESSION 3 TASKS (This Week)**

### **TASK 1: Slash Commands** (Day 1-2)
- [ ] Create `commands/slash-commands.js`
- [ ] Implement: `/extract`, `/enrich`, `/watch`, `/sync-drive`
- [ ] Add to Claude Code (slash command integration)
- [ ] Test each command manually

### **TASK 2: Hooks & Routines** (Day 2-3)
- [ ] Create `hooks/on-file-upload.js`
- [ ] Auto-trigger enrichment when file added to `/data/`
- [ ] Setup cron job: Sunday 2 AM (auto-sync Google Drive)
- [ ] Test with sample files

### **TASK 3: AI Chat Component** (Day 3-4)
- [ ] Build chatbot UI (HTML + CSS)
- [ ] Connect to Claude API (conversational Q&A about sages)
- [ ] Show sage profiles in chat responses
- [ ] Test on website

### **TASK 4: Deployment** (Day 4-5)
- [ ] Setup GitHub repository
- [ ] Configure Vercel / GitHub Pages
- [ ] Add authentication (Supabase Auth)
- [ ] Deploy live

---

## 🎓 **LEARNING RESOURCES**

From Session 3 transcript:
- **CLAUDE.md importance**: Saves tokens by summarizing project state
- **Terminal/CLI power**: `claude init`, `claude run`, `claude plan`, `claude agent`, etc.
- **VS Code + Claude**: Best IDE for Claude Code (see `commands/slash-commands.js`)
- **Plan Mode**: Preview before executing (safer)
- **Andrew Karpathy's principles**: Keep it simple, reusable, testable

---

## ✅ **DEFINITION OF DONE (Session 3)**

By end of this session:
- ✅ PROJECT_CLAUDE.md created (this file)
- ✅ Slash commands implemented (`/extract`, `/enrich`, `/watch`, `/sync-drive`)
- ✅ Hooks & Routines working (auto-trigger on file upload + scheduled)
- ✅ AI Chat component on website (Q&A with sages)
- ✅ Live deployment (GitHub + Vercel + custom domain)
- ✅ Full automation (no manual SQL, everything via CLI)

---

## 📞 **CONTACT & NOTES**

- **Owner:** Avraham Gshtein (avraham.gshtein@gmail.com)
- **Last Updated:** June 5, 2026
- **Session:** 3 of 4 (Claude Code: Build, Customize, Ship)
- **Next:** Session 4 — Claude in Chrome + Agentic automation

**Links:**
- CLAUDE.md — Global rules & architecture
- MEMORY.md — 323 sages, 7 periods, Supabase schema
- INSTRUCTION.md — 5 recurring workflows
- SESSION2_INTEGRATION_PLAN.md — Google Drive + Skills strategy

---

**זה המסמך שם Claude תחפש כשיפתח את הפרויקט!** 🚀
