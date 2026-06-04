# 📑 Session 2 Implementation — File Guide & Architecture

This document maps out all the files created for Session 2 and how they fit together.

---

## 🗺️ Project Structure

```
ozar-chachamim/
│
├── 📋 SETUP & DOCUMENTATION
│   ├── SESSION2_IMPLEMENTATION_README.md    ← START HERE (5-min quickstart)
│   ├── SESSION2_INTEGRATION_PLAN.md         ← Architecture & design (detailed)
│   ├── SESSION2_FILE_GUIDE.md               ← This file
│   ├── .env.example                         ← Configuration template
│   ├── package.json                         ← Updated with dependencies
│   └── .gitignore                           ← Secrets to exclude from git
│
├── 🔧 SKILLS (Reusable Components)
│   └── skills/
│       ├── extract-sage-from-google-doc.js  ← Skill 1: Extract structured data from doc
│       └── enrich-sage-in-supabase.js       ← Skill 2: Update Supabase with enriched data
│
├── 🤖 PLUGINS (Orchestrators)
│   └── plugins/
│       └── research-enrichment-plugin.js    ← Plugin: Runs both skills + Google Drive
│
├── 🔌 CONNECTORS (External Service Integration)
│   └── connectors/
│       └── GOOGLE_DRIVE_CONNECTOR_SETUP.md  ← Setup guide for Google Drive API
│       └── google-drive-connector.js        ← (You'll create this following the guide)
│
├── ⚙️ SCRIPTS (Execution & Automation)
│   ├── run-enrichment.js                    ← Main entry point (CLI interface)
│   └── schedule-enrichment.js               ← Optional: Weekly automation
│
├── 📚 EXISTING PROJECT FILES
│   ├── CLAUDE.md                            ← Project rules & architecture (Session 1)
│   ├── MEMORY.md                            ← Project context (Session 1)
│   ├── INSTRUCTION.md                       ← Recurring workflows (Session 1)
│   ├── sages/                               ← Sage profiles (markdown)
│   ├── notes/                               ← Teaching materials
│   ├── sources/                             ← Research documents (Google Docs, Word)
│   └── [Website code]                       ← Frontend (index.html, graph.js, etc.)
```

---

## 🔗 How Files Connect

### Information Flow (The 4-Step Pipeline)

```
┌─────────────────────────────────────────────────────────────────┐
│ Google Drive (Your Research Documents)                          │
│ └─ Shared with Service Account                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
       [google-drive-connector.js — from GOOGLE_DRIVE_CONNECTOR_SETUP.md]
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ research-enrichment-plugin.js (Orchestrator)                    │
│ ├─ Lists all files                                              │
│ ├─ For each file:                                               │
│ │  ├─ Read Google Doc                                           │
│ │  ├─ Extract data (Skill 1)                                    │
│ │  ├─ Match to sage                                             │
│ │  ├─ Enrich in Supabase (Skill 2)                              │
│ │  └─ Log changes                                               │
│ └─ Report results                                               │
└─────────────────────────────────────────────────────────────────┘
   ↓                        ↓
[extract-sage-      [enrich-sage-
 from-google-doc]   in-supabase]
   ↓                        ↓
[Extracted JSON]     [Supabase Updated]
                            ↓
                    ┌────────────────────┐
                    │ Supabase Database  │
                    │ ├─ sages table     │
                    │ ├─ connections tbl │
                    │ └─ audit_log table │
                    └────────────────────┘
                            ↓
                    ┌────────────────────┐
                    │ Website (Live!)     │
                    │ D3 graph updated    │
                    └────────────────────┘
```

### Execution Flow (How to Run)

```
┌──────────────────────────────────────────┐
│ npm install                              │
│ (Install all dependencies)               │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ Create .env                              │
│ (Copy .env.example → .env)               │
│ ├─ SUPABASE_URL                          │
│ ├─ SUPABASE_SERVICE_ROLE_KEY             │
│ └─ GOOGLE_DRIVE_FOLDER_ID                │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ Follow GOOGLE_DRIVE_CONNECTOR_SETUP.md   │
│ Create google-drive-service-account.json │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ run-enrichment.js --dryrun --test        │
│ (Preview changes, safe)                  │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ run-enrichment.js --apply                │
│ (Execute, creates/updates in Supabase)   │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│ (Optional) schedule-enrichment.js        │
│ (Automate: Sunday 2 AM, every week)      │
└──────────────────────────────────────────┘
```

---

## 📄 File Descriptions

### 🎯 **Documentation & Setup**

| File | Purpose | Read When |
|------|---------|-----------|
| `SESSION2_IMPLEMENTATION_README.md` | 5-minute quickstart + example workflows | First (before anything else) |
| `SESSION2_INTEGRATION_PLAN.md` | Detailed architecture & design decisions | Understanding the "why" |
| `SESSION2_FILE_GUIDE.md` | This file — maps all files and connections | Navigating the codebase |
| `.env.example` | Template for environment variables | Before running anything |

### 💻 **Code Files**

| File | Type | Purpose | Status |
|------|------|---------|--------|
| `skills/extract-sage-from-google-doc.js` | Skill 1 | Parse Google Doc → extract JSON | ✅ Ready |
| `skills/enrich-sage-in-supabase.js` | Skill 2 | JSON → update Supabase + connections | ✅ Ready |
| `plugins/research-enrichment-plugin.js` | Plugin | Orchestrate Skills 1+2 + Google Drive | ✅ Ready |
| `connectors/google-drive-connector.js` | Connector | Read files from Google Drive (template) | 📝 Create by following guide |
| `run-enrichment.js` | Script | Main entry point (CLI, dryrun, apply) | ✅ Ready |
| `schedule-enrichment.js` | Script | Weekly automation (optional) | ✅ Ready |

### 📖 **Setup Guides**

| File | What to Do | Time |
|------|-----------|------|
| `connectors/GOOGLE_DRIVE_CONNECTOR_SETUP.md` | Set up Google Cloud API + Service Account | 15–20 min |
| `.env.example` → `.env` | Configure Supabase credentials | 5 min |
| `npm install` | Install dependencies | 1–2 min |

---

## 🚀 Typical Usage Patterns

### Pattern 1: First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy & edit .env
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Follow Google Drive setup
# See: connectors/GOOGLE_DRIVE_CONNECTOR_SETUP.md
# Creates: google-drive-service-account.json

# 4. Test with preview
node run-enrichment.js --dryrun --test

# 5. If preview looks good, execute
node run-enrichment.js --apply --limit=5

# 6. Once comfortable, run full enrichment
node run-enrichment.js --apply
```

### Pattern 2: Regular Execution

```bash
# Preview
npm run enrich:preview

# Test
npm run enrich:test

# Execute
npm run enrich:apply

# Force execution (no prompts)
npm run enrich:force
```

### Pattern 3: Scheduled Automation

```bash
# Start weekly scheduler (every Sunday 2 AM)
npm run schedule:start

# View logs
npm run schedule:logs

# Stop scheduler
npm run schedule:stop
```

---

## 🔐 Security Files (Keep Secret!)

These files contain sensitive credentials. Add them to `.gitignore`:

```
.env                                    ← Supabase service role key
google-drive-service-account.json       ← Google API credentials
config.js                               ← Frontend Supabase config
```

**Never commit these to git!** They're already in `.gitignore`, but double-check.

---

## 📊 Data Flow Summary

### Input Data (Google Drive)

```
Google Drive Folder
├── רבי מאיר - מחקר עמוק.docx
├── רמב״ם - חייו ופעולו.docx
└── רשי - פירוש התורה.docx
```

### Processing (run-enrichment.js)

```
For each file:
  1. Read Google Doc (google-drive-connector.js)
  2. Extract {bio, works, ideas, related_sages, locations}
     (skills/extract-sage-from-google-doc.js)
  3. Match to existing sage in Supabase
  4. Update Supabase: bio, core_concept, tags, main_works
     (skills/enrich-sage-in-supabase.js)
  5. Create connections between related sages
  6. Log to audit_log table
```

### Output (Supabase & Website)

```
Supabase tables updated:
├── sages
│   ├── bio (enriched)
│   ├── core_concept (from key ideas)
│   ├── main_works (JSON array)
│   ├── tags (from locations)
│   └── research_enriched_at (timestamp)
├── connections (new relationships)
└── audit_log (all changes logged)

Website impact:
├── D3 graph shows new connections
├── Sidebar displays enriched bio
├── PDF export includes research data
└── Search index includes new content
```

---

## 🎯 When to Use Each File

### I want to...

| Goal | File(s) to Use |
|------|---|
| **Understand the whole system** | SESSION2_IMPLEMENTATION_README.md |
| **Set up for the first time** | `.env.example`, `GOOGLE_DRIVE_CONNECTOR_SETUP.md`, `npm install` |
| **Preview changes before executing** | `node run-enrichment.js --dryrun` |
| **Execute enrichment once** | `node run-enrichment.js --apply` |
| **Schedule weekly automation** | `npm run schedule:start` |
| **Test with limited files** | `node run-enrichment.js --test` |
| **Understand how extraction works** | `skills/extract-sage-from-google-doc.js` |
| **Understand how updates work** | `skills/enrich-sage-in-supabase.js` |
| **Understand the orchestration** | `plugins/research-enrichment-plugin.js` |

---

## ✅ Pre-Flight Checklist

Before running `run-enrichment.js`, verify:

- [ ] Node.js 18+ installed: `node --version`
- [ ] Dependencies installed: `npm install` completed
- [ ] `.env` file created and filled in
- [ ] Supabase credentials valid (can you connect?)
- [ ] Google Drive API enabled (Google Cloud Console)
- [ ] `google-drive-service-account.json` created
- [ ] Google Drive folder shared with service account
- [ ] Research documents in Google Drive folder

---

## 🔍 Debugging Tips

### Check Supabase connection:
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('sages').select('count(*)').then(r => console.log(r)).catch(e => console.error(e));
"
```

### Check Google Drive connection:
```bash
node -e "
const GoogleDriveConnector = require('./connectors/google-drive-connector.js');
const c = new GoogleDriveConnector('./google-drive-service-account.json', process.env.GOOGLE_DRIVE_FOLDER_ID);
c.listFiles().then(f => console.log(f.length + ' files found')).catch(e => console.error(e));
"
```

### View recent changes:
```sql
-- In Supabase SQL Editor
SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 10;
```

---

## 🎓 Related Documentation

For broader context, see:

- **CLAUDE.md** — Project rules, architecture, and constraints (Session 1)
- **MEMORY.md** — Project context (323 sages, schemas, periods) (Session 1)
- **INSTRUCTION.md** — Recurring workflows (add sage, lesson plans) (Session 1)

---

## 💬 Quick Reference

### Command Aliases (from package.json)

```bash
npm run enrich:preview    # Preview changes
npm run enrich:test       # Test with 5 files
npm run enrich:apply      # Execute
npm run enrich:force      # Execute without prompts
npm run schedule:start    # Start weekly automation
npm run schedule:stop     # Stop automation
npm run schedule:logs     # View logs
```

### Manual Commands

```bash
node run-enrichment.js --dryrun           # Preview
node run-enrichment.js --apply            # Execute
node run-enrichment.js --test             # Test (5 files)
node run-enrichment.js --apply --limit=10 # Limit to 10 files
node run-enrichment.js --apply --force    # No confirmation
```

---

**Ready to start?** → Open `SESSION2_IMPLEMENTATION_README.md` and follow the 5-minute quickstart! 🚀
