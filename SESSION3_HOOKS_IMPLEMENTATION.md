# 🎣 SESSION 3: Hooks & Routines Implementation Guide

**Status:** ✅ TASK 2 COMPLETE  
**Date:** June 5, 2026  
**Files Created:** 3 files + 1 updated

---

## 📋 What We Built

### **2 Hooks (Automated Triggers)**

1. **`hooks/on-file-upload.js`** — Local File Auto-Enrichment
   - Triggered when file dropped in `/data/` folder
   - Extracts sage data → enriches Supabase → logs changes → moves file
   - Integration: Called by `watch-local-folder.js`

2. **`hooks/schedule-enrichment.js`** — Weekly Google Drive Sync
   - Runs every Sunday 2:00 AM via cron
   - Syncs Google Drive research → processes `/data/` → enriches Supabase
   - Integration: Runs as pm2 background daemon

### **Supporting Files**

- **`hooks/README.md`** — Complete documentation with examples, troubleshooting, setup
- **`package.json`** — Updated npm scripts: `schedule:start`, `schedule:stop`, `schedule:logs`, `schedule:test`

---

## 🔄 Complete Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO 1: IMMEDIATE (User drops file in /data/)              │
└─────────────────────────────────────────────────────────────────┘

User drops file → data/רבי-מאיר.docx
      ↓
npm run watch:start
      ↓
watch-local-folder.js (detects every 5 sec)
      ↓
on-file-upload.js HOOK executes
      ├─ Extract sage data from file
      ├─ Find sage in Supabase
      ├─ Enrich database (bio, works, connections)
      ├─ Log to audit_log
      └─ Move to data/processed/
      ↓
Website updates in real-time
(D3 graph refreshes, new connections visible)


┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO 2: SCHEDULED (Every Sunday 2 AM)                       │
└─────────────────────────────────────────────────────────────────┘

npm run schedule:start
      ↓
Daemon waits (pm2 manages)
      ↓
⏰ Sunday 2:00 AM triggers
      ↓
schedule-enrichment.js HOOK executes
      ├─ Sync Google Drive research files
      ├─ Process /data/ folder files
      ├─ Enrich Supabase with all data
      ├─ Log statistics to audit_log
      └─ Continue watching...
      ↓
Website updated with all new research
(No manual intervention needed)
```

---

## 🚀 Setup Instructions

### **Step 1: Install Dependencies**

```bash
cd C:\Users\User\Desktop\ozar-chachamim

# Already installed in package.json:
# - @supabase/supabase-js (for database access)
# - node-cron (for scheduled tasks)
# - pm2 (for daemon management)

npm install
```

### **Step 2: Configure Environment**

```bash
# Verify .env has:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_...

# Optional (for Google Drive sync):
GOOGLE_DRIVE_FOLDER_ID=1a2b3c...
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

### **Step 3: Create Data Folders**

```bash
# Folders auto-created by hooks, but you can create them manually:
mkdir -p data/processed
mkdir -p data/failed
```

### **Step 4: Test Hooks Individually**

```bash
# Test local file upload hook
node hooks/on-file-upload.js data/test-file.docx

# Test schedule enrichment (single run)
node hooks/schedule-enrichment.js
```

---

## 📖 Usage Patterns

### **Pattern 1: Continuous Watching (Recommended)**

Best for: Regular research document uploads during week

```bash
# Terminal 1: Watch /data/ folder continuously
npm run watch:start

# Terminal 2: Start web server
npm run dev

# Now whenever you:
# 1. Copy file to data/
# 2. File auto-enriches within 5 seconds
# 3. Website updates live
# 4. File moves to processed/

# To stop: Press Ctrl+C in Terminal 1
```

**Example workflow:**
```bash
# You finish researching Rabbi Meir
cp ~/Documents/rabbi-meir-research.docx data/

# watch-local-folder.js detects it (5 sec scan)
# on-file-upload.js processes it (2-3 sec)
# Website shows updated graph with connections
# File moves to data/processed/

# ✅ Done! No manual database updates needed.
```

---

### **Pattern 2: Scheduled Sync (Background)**

Best for: Automated Sunday 2 AM Google Drive sync

```bash
# Setup (one time)
npm run schedule:start

# Daemon runs in background
# Every Sunday 2:00 AM:
#   ✓ Syncs Google Drive research files
#   ✓ Processes /data/ folder
#   ✓ Enriches Supabase
#   ✓ Website updates overnight

# To monitor:
npm run schedule:logs

# To stop:
npm run schedule:stop
```

**Why Sunday 2 AM?**
- Low server load
- No user interruptions
- Weekly research compiled
- All changes audited

---

### **Pattern 3: Full Integration (Both + Manual CLI)**

Best for: Maximum automation with manual control

```bash
# Terminal 1: Watch local files (continuous)
npm run watch:start

# Terminal 2: Scheduled sync (background)
npm run schedule:start

# Terminal 3: Web server
npm run dev

# Terminal 4: Manual CLI commands
node commands/slash-commands.js "/help"
node commands/slash-commands.js "/status"
node commands/slash-commands.js "/list-sages --filter=rishonim"

# Now you have:
# ✅ Auto-enrichment from local files
# ✅ Auto-enrichment from Google Drive (Sunday 2 AM)
# ✅ Manual override via slash commands
# ✅ Live website with all updates
```

---

## 🎯 Integration Points

### **on-file-upload.js** ← Calls

```
Input:
  - filePath: string (e.g., "data/rambam.docx")
  - options: {silent, logLevel}

Calls:
  ├─ ../skills/extract-sage-from-local-file.js
  │  └─ Extracts: {bio, main_works, key_ideas, related_sages, locations}
  │
  ├─ Supabase: SELECT * FROM sages (find matching sage)
  │
  ├─ ../skills/enrich-sage-in-supabase.js
  │  └─ Updates: sages table + creates connections
  │
  └─ Supabase: INSERT INTO audit_log

Output:
  {
    success: boolean,
    sageId: number,
    sageLabel: string,
    fieldsUpdated: string[],
    connectionsCreated: number,
    duration: milliseconds
  }

Called by:
  - watch-local-folder.js (automatic)
  - schedule-enrichment.js (batch via onFileUploadBatch)
  - Manual: node hooks/on-file-upload.js <filepath>
```

---

### **schedule-enrichment.js** ← Calls

```
Trigger:
  - Cron: "0 2 * * 0" (Sunday 2:00 AM)
  - Manual: node hooks/schedule-enrichment.js
  - Via npm: npm run schedule:test

Calls:
  ├─ ../plugins/research-enrichment-plugin.js
  │  └─ Syncs Google Drive research files
  │
  ├─ ./on-file-upload.js (batch)
  │  └─ Processes all files in /data/ folder
  │
  ├─ Supabase: COUNT queries (statistics)
  │
  └─ Supabase: INSERT INTO audit_log (completion status)

Output:
  - Console logs with timing
  - Audit trail updated
  - Website data refreshed

Runs as:
  - pm2 daemon (npm run schedule:start)
  - Single execution (npm run schedule:test)
  - Manual: node hooks/schedule-enrichment.js
```

---

### **watch-local-folder.js** ← Existing

```
Already exists: C:\...\watch-local-folder.js

What it does:
  - Scans /data/ folder every 5 seconds
  - Detects new .docx, .txt, .md files
  - Calls on-file-upload.js for each file
  - Moves files to processed/ or failed/

Integration:
  - Called via: npm run watch:start
  - Uses: on-file-upload.js hook
  - Logs to: audit_log table

No changes needed — works with new hooks!
```

---

## 📊 Database Impact

### **New Audit Trail Entries**

When hooks run, audit_log gets new entries:

```sql
-- After on-file-upload.js processes file
INSERT INTO audit_log VALUES (
  'enrich_from_local_file',
  'Rambam — רמב״ם',
  'rambam-research.docx',
  '2026-06-05T14:30:00Z'
);

-- After schedule-enrichment.js completes
INSERT INTO audit_log VALUES (
  'scheduled_enrichment_complete',
  'SYSTEM',
  'schedule-enrichment.js (duration: 47s)',
  '2026-06-05T02:00:47Z'
);
```

### **Tables Modified**

| Table | Operation | Frequency |
|-------|-----------|-----------|
| `sages` | UPDATE (bio, core_concept, main_works) | Per file |
| `connections` | INSERT (student, teacher, contemporary) | Per related sage found |
| `audit_log` | INSERT (enrichment action, source, timestamp) | Per file + schedule completion |

---

## ✅ Testing Checklist

### **Test 1: Local File Upload Hook**

```bash
# 1. Create test file
echo "Rambam was a medieval sage..." > data/rambam-test.txt

# 2. Run hook manually
node hooks/on-file-upload.js data/rambam-test.txt

# Expected output:
# 🔔 [Hook] Processing: rambam-test.txt
# ✓ Extracted: rambam
# ✓ Found sage: Rambam — רמב״ם (ID: 12)
# ✓ Enriched: bio, core_concept, main_works
# ✓ Created 2 connection(s)
# ✓ Moved to: processed/
# ✅ [Hook] Complete in XXXms
```

✅ **Pass** if: File moved to `processed/`, Supabase updated, no errors

---

### **Test 2: Scheduled Enrichment Hook**

```bash
# 1. Run schedule-enrichment.js once
npm run schedule:test

# Expected output:
# ============================================================
# ⏰ SCHEDULED ENRICHMENT STARTED
# ============================================================
#
# 🔌 Connecting to Supabase...
# ✓ Connected. 323 sages in database.
#
# 📂 Syncing Google Drive...
# ✓ Processed X files
#
# 📁 Processing /data/ folder...
# ✓ Processed X local files
#
# 📊 Database statistics:
#   • Sages: 323
#   • Connections: XX
#   • Audit log entries: XXX
#
# ✅ SCHEDULED ENRICHMENT COMPLETED
# ⏱️  Duration: XXs
```

✅ **Pass** if: All steps complete, no errors, audit_log updated

---

### **Test 3: Continuous Watch Mode**

```bash
# 1. Start watch
npm run watch:start

# 2. In another terminal, add file
cp data/test.txt data/rashi-research.docx

# Expected: watch-local-folder detects within 5 seconds
# Expected: on-file-upload processes it
# Expected: File moves to processed/

# 3. Stop watch: Ctrl+C
```

✅ **Pass** if: File processes automatically, no manual intervention needed

---

### **Test 4: Schedule Daemon**

```bash
# 1. Start daemon
npm run schedule:start

# 2. Check logs
npm run schedule:logs

# Expected: Daemon running in background

# 3. For testing immediate run:
node hooks/schedule-enrichment.js --daemon --immediate

# 4. Stop daemon
npm run schedule:stop

# Expected: Graceful shutdown
```

✅ **Pass** if: Daemon starts, logs show activity, stops cleanly

---

## 🐛 Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "File not found" | Wrong filepath | Use full path: `data/filename.docx` |
| "Sage not found in database" | Filename doesn't match sage | File must start with sage name: `rambam-...docx` |
| "Permission denied" | Supabase credentials | Check `.env`: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY |
| File goes to `failed/` | Error during processing | Check console output for detailed error |
| Schedule not running | pm2 not installed | `npm install -g pm2` then `npm run schedule:start` |
| No output from watch | Watch not running | Check Terminal 1: `npm run watch:start` must be active |
| "Unsupported file type" | Wrong file extension | Use only: `.docx`, `.txt`, or `.md` |

---

## 📈 Monitoring

### **View Recent Enrichments**

```bash
# Via Supabase Studio (web interface)
# 1. Go to https://app.supabase.com
# 2. Select your project
# 3. Navigate to "audit_log" table
# 4. Sort by timestamp DESC

# Via CLI
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('audit_log').select('*').order('timestamp', {ascending: false}).limit(10).then(({data}) => console.table(data));
"
```

### **File Processing Status**

```bash
# See what's been processed
ls data/processed/     # Successful enrichments
ls data/failed/        # Need manual review

# Count files
echo "Processed: $(ls -1 data/processed/ | wc -l) files"
echo "Failed: $(ls -1 data/failed/ | wc -l) files"
```

### **Schedule Logs**

```bash
# View daemon logs
npm run schedule:logs

# View specific number of lines
npm run schedule:logs -- --lines 50

# View in real-time
npm run schedule:logs -- --lines 100 --follow
```

---

## 🎓 Next Steps (Session 3 Continuation)

We've completed **TASK 2: Hooks & Routines** ✅

Remaining Session 3 tasks:

- [ ] **TASK 3**: AI Chat Component (Q&A on website)
- [ ] **TASK 4**: Deployment Pipeline (GitHub → Vercel)

---

## 📞 Quick Reference

```bash
# Start all automation
npm run watch:start          # Terminal 1: Local file watching
npm run schedule:start       # Terminal 2: Sunday 2 AM sync
npm run dev                  # Terminal 3: Web server

# Test individual hooks
npm run schedule:test                          # Test scheduler
node hooks/on-file-upload.js data/test.docx   # Test file hook

# Monitor
npm run schedule:logs        # View daemon logs
ls data/processed/           # See processed files
ls data/failed/              # See failed files

# Stop
Ctrl+C (watch)
npm run schedule:stop        # Stop scheduler daemon
```

---

**Hooks & Routines are now LIVE!** 🎉

Your automation pipeline:
- ✅ Drops files in `/data/` → auto-enriched
- ✅ Every Sunday 2 AM → Google Drive synced
- ✅ All changes logged to audit trail
- ✅ Website updates in real-time
