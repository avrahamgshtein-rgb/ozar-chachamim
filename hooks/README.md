# 🎣 Hooks & Routines — אוטומציה מובנית

Hooks are automated triggers that run when specific events occur. This folder contains the automation layer for Ozar Chachamim.

---

## 🎯 Available Hooks

### 1. **on-file-upload.js** — Local File Enrichment
Triggered when a file is added to `/data/` folder.

**What it does:**
- Detects new `.docx`, `.txt`, or `.md` files
- Extracts sage data (bio, works, ideas, locations)
- Finds matching sage in Supabase
- Enriches database with new information
- Moves file to `processed/` or `failed/`
- Logs all changes to `audit_log`

**Usage:**
```bash
# Manual trigger
node hooks/on-file-upload.js data/rambam-research.docx

# Called automatically by watch-local-folder.js
npm run watch:start
```

**Return value:**
```json
{
  "success": true,
  "message": "✅ Enriched: Rambam — רמב״ם",
  "sageId": 12,
  "sageLabel": "Rambam — רמב״ם",
  "fileName": "rambam-research.docx",
  "fieldsUpdated": ["bio", "core_concept", "main_works"],
  "connectionsCreated": 2,
  "duration": 1250
}
```

---

### 2. **schedule-enrichment.js** — Scheduled Google Drive Sync
Runs automatically every **Sunday at 2:00 AM**.

**What it does:**
- Syncs research files from Google Drive
- Processes local `/data/` folder files
- Enriches Supabase with all new information
- Logs statistics and completion status
- Runs as a background daemon (via pm2)

**Setup:**
```bash
# Start daemon (runs every Sunday 2 AM)
npm run schedule:start

# View logs
npm run schedule:logs

# Stop daemon
npm run schedule:stop
```

**Manual run (for testing):**
```bash
# Single run
node hooks/schedule-enrichment.js

# Run with daemon (immediate + scheduled)
node hooks/schedule-enrichment.js --daemon --immediate
```

**Cron expression:** `0 2 * * 0` (Sunday 2:00 AM)

---

## 🔄 Full Workflow

```
📁 /data/ folder (user drops files here)
    ↓
watch-local-folder.js (detects new file every 5 seconds)
    ↓
on-file-upload.js (HOOK executes)
    ├─ Extract sage data from file
    ├─ Find sage in Supabase
    ├─ Enrich database
    ├─ Create connections
    ├─ Log to audit_log
    └─ Move file to processed/ or failed/
    ↓
Website updates in real-time (D3 graph refreshes)
```

**OR** (Scheduled)

```
⏰ Every Sunday 2:00 AM
    ↓
schedule-enrichment.js (HOOK daemon wakes up)
    ├─ Sync Google Drive research files
    ├─ Process /data/ folder files
    ├─ Enrich Supabase
    ├─ Log statistics
    └─ Update audit trail
    ↓
Website updated with all new research
```

---

## 📋 Integration with Other Components

| File | Calls | Called by |
|------|-------|-----------|
| **on-file-upload.js** | extract-sage-from-local-file.js<br>enrich-sage-in-supabase.js | watch-local-folder.js<br>schedule-enrichment.js |
| **schedule-enrichment.js** | research-enrichment-plugin.js<br>on-file-upload.js (batch) | cron daemon (npm run schedule:start)<br>Manual trigger |
| **watch-local-folder.js** | on-file-upload.js | Manual: `npm run watch:start` |

---

## ⚙️ Configuration

### `.env` Variables

```bash
# Supabase (required for all hooks)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_...

# Google Drive (optional, for schedule-enrichment.js)
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

### Folder Structure

```
ozar-chachamim/
├── data/                  ← Drop files here
│   ├── processed/         ← Successful files (auto-created)
│   └── failed/            ← Failed files (auto-created)
├── hooks/
│   ├── on-file-upload.js
│   ├── schedule-enrichment.js
│   └── README.md (this file)
├── skills/
│   ├── extract-sage-from-local-file.js
│   └── enrich-sage-in-supabase.js
└── watch-local-folder.js
```

---

## 🚀 Quick Start

### Option 1: Manual Local Files (Immediate)
```bash
# Add a file to /data/
cp "my-research.docx" data/

# Run watch once
npm run watch:once

# File processed automatically
# Supabase updated
# Website refreshed
```

### Option 2: Continuous Watching (Recommended)
```bash
# Start watching /data/ folder
npm run watch:start

# Leave terminal open
# Add files anytime — they'll process automatically

# Stop with Ctrl+C
```

### Option 3: Scheduled Sync (Background)
```bash
# Start daemon (runs every Sunday 2 AM)
npm run schedule:start

# Logs are saved by pm2
npm run schedule:logs

# Stop when done
npm run schedule:stop
```

### Option 4: Full Integration (All of the above)
```bash
# Terminal 1: Watch local files
npm run watch:start

# Terminal 2: Start scheduler daemon
npm run schedule:start

# Terminal 3: Start web server
npm run dev

# Now everything works:
# - Drop files → auto-enriched
# - Every Sunday 2 AM → Google Drive synced
# - Website live with all updates
```

---

## 📊 Monitoring & Logging

### View Recent Enrichments

```javascript
// In browser console (on website)
const { data } = await supabase
  .from('audit_log')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(10);

console.table(data);
```

### Check File Processing Status

```bash
# See processed files
ls data/processed/

# See failed files (needs manual review)
ls data/failed/
```

### Monitor Daemon Logs

```bash
# View schedule-enrichment.js logs (last 100 lines)
npm run schedule:logs

# View logs in real-time
npm run schedule:logs -- --lines 100 --follow
```

---

## 🔍 Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| File not processed | `watch:start` not running | Run `npm run watch:start` in terminal |
| "Sage not found" error | Sage name doesn't match | File name must start with sage name (e.g., `rambam-research.docx`) |
| Permission denied | Supabase credentials | Check `.env` — SUPABASE_SERVICE_ROLE_KEY should be set |
| Files go to `failed/` | Invalid file format or extract error | Check `/data/failed/` folder and fix file content |
| Schedule not running | pm2 not installed | Run `npm install -g pm2` then `npm run schedule:start` |
| "Unsupported file type" | Wrong extension | Use `.docx`, `.txt`, or `.md` only |

---

## 🔐 Security Notes

✅ **Safe:**
- Only reads files from designated `/data/` folder
- Uses service account (not personal OAuth)
- All changes logged to `audit_log`
- Sensitive research stays in `/data/failed/` for manual review

❌ **Not safe:**
- Don't put passwords in research files
- Don't commit `.env` file to git (it's in `.gitignore`)
- Don't share `/data/failed/` folder with untrusted users

---

## 📝 Examples

### Example 1: Enrich Rambam Profile

```bash
# 1. Create/edit file
echo "Rambam was a 12th-century sage..." > data/rambam-research.txt

# 2. Run watch
npm run watch:once

# Output:
# 🔔 [Hook] Processing: rambam-research.txt
#   ✓ Extracted: rambam
#   ✓ Found sage: Rambam — רמב״ם (ID: 12)
#   ✓ Enriched: bio, core_concept, main_works
#   ✓ Created 2 connection(s)
#   ✓ Moved to: processed/
# ✅ [Hook] Complete in 523ms

# 3. Website automatically updates
# - Rambam's profile shows new bio
# - Connection links visible in graph
# - Timeline updated
```

### Example 2: Batch Processing Multiple Files

```bash
# Drop multiple research files
cp research/rabbi-meir.docx data/
cp research/rashi.docx data/
cp research/ramban.docx data/

# Run watch once (processes all)
npm run watch:once

# Output:
# 🔔 [Hook] Processing: rabbi-meir.docx
# ✅ Enriched: Rabbi Meir — רבי מאיר
# 🔔 [Hook] Processing: rashi.docx
# ✅ Enriched: Rashi — רשי
# 🔔 [Hook] Processing: ramban.docx
# ✅ Enriched: Ramban — רמבן
```

### Example 3: Scheduled Google Drive Sync

```bash
# Setup (one time)
npm run schedule:start

# Wait for Sunday 2 AM...
# Or test immediately:
node hooks/schedule-enrichment.js

# Output:
# ============================================================
# ⏰ SCHEDULED ENRICHMENT STARTED
# ============================================================
#
# 🔌 Connecting to Supabase...
# ✓ Connected. 323 sages in database.
#
# 📂 Syncing Google Drive...
# ✓ Processed 15 files from Google Drive
# ✓ Created 28 enrichments
#
# 📁 Processing /data/ folder...
# ✓ Processed 3 local files
#
# 📊 Database statistics:
#   • Sages: 323
#   • Connections: 52
#   • Audit log entries: 1,247
#
# ✅ SCHEDULED ENRICHMENT COMPLETED
# ⏱️  Duration: 47s
```

---

## 📞 Support

If hooks fail:
1. Check `.env` is set correctly
2. Run manually: `node hooks/on-file-upload.js data/file.docx`
3. Review logs in `/data/failed/`
4. Check console output for error messages

For debugging, add `--verbose` flag or set `verbose: true` in function options.

---

**זה הכל! Hooks are now active.** 🎉

Your automation pipeline is ready:
- Drop files → auto-enriched ✅
- Every Sunday 2 AM → Google Drive synced ✅
- All changes logged ✅
- Website updated live ✅
