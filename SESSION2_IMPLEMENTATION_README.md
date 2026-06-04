# 🚀 Session 2 Implementation — Quick Start Guide

This guide walks you through implementing the 4-step Session 2 workflow for automated research enrichment.

---

## 📋 Overview: What You're Building

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Extract Sage from Google Doc                    │
│ (Skill: extract-sage-from-google-doc.js)                │
│ Input: Google Doc text                                  │
│ Output: JSON {bio, works, ideas, related_sages, locs}  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Enrich Sage in Supabase                         │
│ (Skill: enrich-sage-in-supabase.js)                     │
│ Input: JSON from Step 1                                 │
│ Output: Updated Supabase + new connections              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Research Enrichment Plugin (orchestrate Steps 1+2) │
│ (Plugin: research-enrichment-plugin.js)                 │
│ Reads Google Drive → extracts → enriches → reports      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Automation (Schedule to run every Sunday)       │
│ (schedule-enrichment.js)                                │
│ Cron job: Sunday 2 AM → run full pipeline              │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Files Created

All files are in your project folder: `C:\Users\User\Desktop\ozar-chachamim\`

```
├── skills/
│   ├── extract-sage-from-google-doc.js    ← Skill 1
│   └── enrich-sage-in-supabase.js         ← Skill 2
│
├── plugins/
│   └── research-enrichment-plugin.js      ← Skill 3 (orchestrator)
│
├── connectors/
│   └── GOOGLE_DRIVE_CONNECTOR_SETUP.md    ← Instructions for Google Drive
│
├── run-enrichment.js                      ← Main entry point (Step 4)
├── schedule-enrichment.js                 ← Optional: Weekly automation
│
├── .env.example                           ← Environment variables template
└── SESSION2_IMPLEMENTATION_README.md      ← This file
```

---

## ⚡ Quick Start (5 minutes)

### 1️⃣ Install Dependencies

```bash
cd C:\Users\User\Desktop\ozar-chachamim

# Install npm packages
npm install @supabase/supabase-js dotenv googleapis readline-sync
```

### 2️⃣ Configure Supabase

```bash
# 1. Go to: https://app.supabase.com → Your Project
# 2. Settings > API
# 3. Copy:
#    - Project URL → SUPABASE_URL
#    - Service Role Key → SUPABASE_SERVICE_ROLE_KEY
#    - Anon Public Key → for frontend

# 4. Create .env file:
cp .env.example .env

# 5. Edit .env and paste your Supabase credentials
```

### 3️⃣ Set Up Google Drive (See Full Guide Below)

Follow: `connectors/GOOGLE_DRIVE_CONNECTOR_SETUP.md` (steps 1–5)

### 4️⃣ Test the Workflow

```bash
# Preview mode (no changes, just preview)
node run-enrichment.js --dryrun

# If preview looks good, execute:
node run-enrichment.js --apply
```

---

## 📖 Detailed Setup

### Step 1: Install Dependencies

```bash
npm install \
  @supabase/supabase-js \
  dotenv \
  googleapis \
  readline-sync \
  node-cron
```

**What each does:**
- `@supabase/supabase-js` — Supabase database client
- `dotenv` — Load environment variables from `.env`
- `googleapis` — Google Drive API
- `readline-sync` — Interactive command-line prompts
- `node-cron` — Schedule tasks (for weekly automation)

### Step 2: Configure Supabase

**Get credentials:**
1. Go to: https://app.supabase.com
2. Select your project (אוצר חכמים)
3. Settings → API
4. Copy these values:

| Variable | From | Where |
|----------|------|-------|
| `SUPABASE_URL` | Project URL | Main settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key | API keys section |
| `VITE_SUPABASE_ANON_KEY` | Anon Public | API keys section (for frontend) |

**Create .env file:**
```bash
cp .env.example .env
# Edit .env in your text editor, paste values
```

**Verify connection:**
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('sages').select('count(*)').limit(1).then(r => {
  console.log(r.error ? '❌ Error: ' + r.error.message : '✅ Connected!');
}).catch(e => console.error('❌', e.message));
"
```

### Step 3: Set Up Google Drive

**Follow this guide:** `connectors/GOOGLE_DRIVE_CONNECTOR_SETUP.md`

**Quick summary:**
1. Create Google Cloud Project
2. Enable Google Drive API
3. Create Service Account + download JSON key
4. Share your research folder with service account email
5. Save JSON key as `google-drive-service-account.json` (in .gitignore)

### Step 4: Test & Execute

**Preview changes (safe, no execution):**
```bash
node run-enrichment.js --dryrun

# Output:
# ✅ Connecting to Supabase...
# 🔌 Connecting to Google Drive...
# 🤖 Initializing Research Enrichment Plugin...
# 🔍 PREVIEW MODE (DRY RUN)
# [... files listed ...]
# Would enrich: 12 sages
# Would create: 8 connections
```

**Execute enrichment (after reviewing preview):**
```bash
node run-enrichment.js --apply

# Prompts for confirmation, then:
# 🚀 Executing enrichment...
# ✅ Enriched sage: Rambam
# ✅ Enriched sage: Rashi
# [... more sages ...]
# ✅ EXECUTION COMPLETE
# Sages enriched: 12
# Connections created: 8
```

---

## 🔧 Advanced: Understanding Each Component

### Component 1: `extract-sage-from-google-doc.js` (Skill 1)

**What it does:** Reads a Google Doc and extracts structured data

**Input:**
```javascript
const googleDocContent = "רבי מאיר היה תנא מהדור הרביעי...";
const sageName = "rabbi-meir";
```

**Output:**
```javascript
{
  sage_name_english: "rabbi-meir",
  bio: "Rabbi Meir was a tanna of the 4th generation...",
  main_works: [
    "Stam Mishnah (סתם משנה)",
    "Megillat Taanit (מגילת תעניות)"
  ],
  key_ideas: [
    "חייש למיעוטא - he worried about rare possibilities",
    "דינא דגרמי - liability for indirect damage"
  ],
  related_sages: [
    { name: "Elisha ben Abuyah", relation: "teacher" },
    { name: "Judah the Prince", relation: "influenced" }
  ],
  locations: ["ארץ ישראל", "טבריה"],
  extracted_at: "2026-06-05T12:34:56Z"
}
```

**Usage:**
```javascript
const { extractSageData } = require('./skills/extract-sage-from-google-doc.js');

const result = await extractSageData(docContent, sageName);
console.log(result.bio);        // "Rabbi Meir was..."
console.log(result.main_works); // ["Stam Mishnah", ...]
```

---

### Component 2: `enrich-sage-in-supabase.js` (Skill 2)

**What it does:** Takes JSON from Skill 1 and updates Supabase

**Input:** JSON object from Component 1

**Output:**
```javascript
{
  success: true,
  sage_id: 45,
  updated_fields: ["bio", "core_concept", "main_works", "tags"],
  connections_created: 2,
  timestamp: "2026-06-05T12:34:56Z"
}
```

**Safety:**
- ✅ Validates sage exists before updating
- ✅ Checks FK constraints on related sages
- ✅ Skips duplicate connections
- ✅ Logs all changes to audit trail

**Usage:**
```javascript
const { enrichSageInSupabase } = require('./skills/enrich-sage-in-supabase.js');

const result = await enrichSageInSupabase(
  extractedData,      // from Component 1
  supabaseClient,     // authenticated client
  sageId              // sage to update
);
console.log(result);  // { success: true, sage_id: 45, ... }
```

---

### Component 3: `research-enrichment-plugin.js` (Plugin)

**What it does:** Orchestrates Components 1 + 2 + Google Drive Connector

**Workflow:**
1. List files from Google Drive
2. For each file:
   - Read Google Doc
   - Extract data (Component 1)
   - Match to existing sage
   - Enrich Supabase (Component 2)
   - Log progress
3. Report results

**Safety:**
- ✅ **Dry-run mode** by default (preview without executing)
- ✅ Validates FK constraints before INSERT/UPDATE
- ✅ Logs all changes to audit trail
- ✅ Requires human approval before execution

**Usage:**
```javascript
const { ResearchEnrichmentPlugin } = require('./plugins/research-enrichment-plugin.js');

const plugin = new ResearchEnrichmentPlugin(supabaseClient, googleDriveConnector);

// Preview mode
const preview = await plugin.execute({
  mode: 'dryrun',  // Just show what would happen
  limit: 5         // Test with 5 files
});

// Execute mode
const result = await plugin.execute({
  mode: 'apply',   // Actually make changes
  limit: null      // Process all files
});
```

---

### Component 4: `run-enrichment.js` (Main Entry Point)

**What it does:** Ties everything together with CLI interface

**Usage:**
```bash
# Preview (safe)
node run-enrichment.js --dryrun

# Test with 5 files
node run-enrichment.js --test

# Execute (with confirmation prompt)
node run-enrichment.js --apply

# Execute without prompts (be careful!)
node run-enrichment.js --apply --force

# Limit to 10 files
node run-enrichment.js --apply --limit=10
```

**Process:**
1. Reads `.env` for configuration
2. Connects to Supabase
3. Connects to Google Drive
4. Runs plugin in chosen mode
5. Prints summary report

---

## 📊 Example Workflow

### Run 1: Preview

```bash
$ node run-enrichment.js --dryrun --limit=3

🚀 OZAR CHACHAMIM — RESEARCH ENRICHMENT WORKFLOW

📊 Connecting to Supabase...
✅ Connected to Supabase

🔌 Connecting to Google Drive...
✅ Connected to Google Drive

🤖 Initializing Research Enrichment Plugin...

🔍 PREVIEW MODE (DRY RUN)

📂 Step 1: Listing files from Google Drive...
  ✅ Found 12 files

[1/3] Processing: רבי מאיר - מחקר עמוק.docx
  ➜ Extracting data from: רבי מאיר - מחקר עמוק.docx
  ✓ [DRYRUN] Would enrich sage: Rabbi Meir — רבי מאיר

[2/3] Processing: רמב״ם - חייו ופעולו.docx
  ➜ Extracting data from: רמב״ם - חייו ופעולו.docx
  ✓ [DRYRUN] Would enrich sage: Rambam — הרמב״ם

[3/3] Processing: רשי - פירוש התורה.docx
  ➜ Extracting data from: רשי - פירוש התורה.docx
  ✓ [DRYRUN] Would enrich sage: Rashi — רשי

============================================================
PREVIEW SUMMARY
============================================================
Would enrich: 3 sages
Would create: 0 connections (already exist)
Errors: 0

📋 Sample enrichments (first 3):

  1. Rabbi Meir — רבי מאיר
     Bio: Rabbi Meir was a tanna of the 4th generation...
     Works: 3 found
     Ideas: 5 found

  2. Rambam — הרמב״ם
     Bio: Moses Maimonides was born in 1138 in Córdoba...
     Works: 8 found
     Ideas: 4 found

  3. Rashi — רשי
     Bio: Rabbi Solomon ben Isaac lived in 11th century France...
     Works: 12 found
     Ideas: 6 found

============================================================
✅ Ready to execute? (type "yes" to proceed):
```

### Run 2: Execute

```bash
✅ Ready to execute? (type "yes" to proceed): yes

🚀 Executing enrichment...

============================================================
🤖 RESEARCH ENRICHMENT PLUGIN — APPLY
============================================================

📂 Step 1: Listing files from Google Drive...
  ✅ Found 12 files

[1/3] Processing: רבי מאיר - מחקר עמוק.docx
  ➜ Extracting data...
  ✅ Updated sage: Rabbi Meir — רבי מאיר
  ✅ Created connection: 45 → 23 (student)

[2/3] Processing: רמב״ם - חייו ופעולו.docx
  ➜ Extracting data...
  ✅ Updated sage: Rambam — הרמב״ם
  ✅ Created connection: 67 → 45 (influenced)

[3/3] Processing: רשי - פירוש התורה.docx
  ➜ Extracting data...
  ✅ Updated sage: Rashi — רשי
  ✅ Created connection: 89 → 67 (teacher)

============================================================
📊 SUMMARY
============================================================
Files found:         3
Files processed:     3
Sages enriched:      3
Connections created: 3
Errors:              0

✅ EXECUTION COMPLETE. Database updated.

✅ Done! Your Ozar Chachamim sages are now enriched.
```

---

## 🔐 Security Checklist

✅ **Environment variables:**
```bash
# Add .env to .gitignore (already done)
echo ".env" >> .gitignore
```

✅ **Sensitive files:**
```bash
# google-drive-service-account.json contains your API key
# Add to .gitignore
echo "google-drive-service-account.json" >> .gitignore
```

✅ **Never commit:**
- `.env` file
- `google-drive-service-account.json`
- Any file with API keys or credentials

✅ **Use service account, not personal account:**
- Service Account = restricted, can't access personal Google Drive
- Personal credentials = full access to everything (dangerous)

---

## ⏰ Optional: Schedule Weekly Automation

After testing manually, you can schedule this to run automatically every Sunday at 2 AM.

### Setup:

```bash
# 1. Create schedule file (already provided: schedule-enrichment.js)
# 2. Install PM2 (process manager)
npm install -g pm2

# 3. Start scheduler
pm2 start schedule-enrichment.js --name "ozar-enrichment"

# 4. Persist across reboots
pm2 save
pm2 startup

# 5. Check status
pm2 status
pm2 logs ozar-enrichment
```

### Windows Task Scheduler Alternative:

```
1. Open Task Scheduler
2. Create Basic Task
3. Name: "Ozar Chachamim Research Enrichment"
4. Trigger: Weekly, Sunday 2:00 AM
5. Action: Start program
   Program: C:\Program Files\nodejs\node.exe
   Arguments: C:\Users\User\Desktop\ozar-chachamim\run-enrichment.js --apply --force
6. Save
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module '@supabase/supabase-js'" | Run `npm install` |
| "SUPABASE_URL is undefined" | Check `.env` file exists and has values |
| "Permission denied: google-drive-service-account.json" | Check file permissions. Run: `chmod 600 google-drive-service-account.json` |
| "Sage not found in database" | Verify sage name in Google Doc filename matches database. Use fuzzy matching. |
| "Connection already exists" | Plugin skips duplicates automatically. This is safe. |
| "Timeout after 30 seconds" | Google Drive API can be slow. Increase timeout in connector. |

---

## 📞 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Set up `.env` with Supabase credentials
3. ✅ Follow: `connectors/GOOGLE_DRIVE_CONNECTOR_SETUP.md` (5-15 minutes)
4. ✅ Test: `node run-enrichment.js --dryrun --test`
5. ✅ Review preview results
6. ✅ Execute: `node run-enrichment.js --apply`
7. ⏰ (Optional) Schedule: `pm2 start schedule-enrichment.js`

---

## 📚 For More Details

- **MEMORY.md** — Project context (323 sages, Supabase schema, locations)
- **INSTRUCTION.md** — Recurring workflows (add sage, lesson plan, migration paths)
- **SESSION2_INTEGRATION_PLAN.md** — Architecture and design decisions
- **connectors/GOOGLE_DRIVE_CONNECTOR_SETUP.md** — Detailed Google Drive setup

---

**כשתשלים את כל השלבים — הודעה לי!** שזה יעבוד בצורה אוטומטית, והאתר יהיה עדכני עם כל מחקר חדש שתוסיף לגוגל דרייב. 🎉
