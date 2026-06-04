# 🌐 Claude in Chrome Integration Guide

**Status:** Session 4 — Interactive Automation  
**Date:** June 5, 2026  
**Purpose:** Use Claude directly in browser to automate Google Drive sync + Supabase enrichment

---

## 🎯 What is Claude in Chrome?

Claude in Chrome (also called "Open Claw" in Session 4) lets Claude **control your browser like a human would**:

- ✅ Click buttons, fill forms
- ✅ Read & screenshot web pages
- ✅ Navigate between sites
- ✅ Upload/download files
- ✅ Execute JavaScript in page
- ✅ Extract data from DOM (visual + text)

**Advantage over API:**
- No authentication tokens needed
- Visual understanding (sees actual layout)
- Can interact with any website (even without API)
- Human-like behavior (good for 2FA, complex forms)

---

## 📋 Architecture: Claude in Chrome + Agent

```
┌──────────────────────────────────────────────┐
│ USER: "Sync my research"                     │
└──────────────────────────────────┬───────────┘
                                   ↓
┌──────────────────────────────────────────────┐
│ agent-enrichment.js (Agent in Plan Mode)     │
│ - Thinks step-by-step                        │
│ - Decides what to do                         │
│ - Delegates to Claude in Chrome              │
└──────────────────────────────────┬───────────┘
                                   ↓
┌──────────────────────────────────────────────┐
│ Claude in Chrome (Browser Automation)        │
├──────────────────────────────────────────────┤
│ 1. Navigate to Google Drive                  │
│ 2. Find research files in folder             │
│ 3. Download each file                        │
│ 4. Navigate to Supabase                      │
│ 5. Extract data from files                   │
│ 6. Fill Supabase forms                       │
│ 7. Create connections                        │
│ 8. Log audit trail                           │
└──────────────────────────────────┬───────────┘
                                   ↓
┌──────────────────────────────────────────────┐
│ Result:                                      │
│ ✅ 15 files synced                           │
│ ✅ 45 sages enriched                         │
│ ✅ 28 connections created                    │
│ ✅ All logged to audit_log                   │
└──────────────────────────────────────────────┘
```

---

## 🔧 Setup Instructions

### **Step 1: Install Claude in Chrome Extension**

1. Go to [chrome://extensions/](chrome://extensions/)
2. Enable "Developer mode" (top right)
3. Install Claude in Chrome extension (from Chrome Web Store or manually)
4. Pin it to toolbar
5. Verify in Cowork mode tools list (should see `mcp__Claude_in_Chrome__*`)

### **Step 2: Grant Permissions**

When you first use Claude in Chrome tools, grant:
- ✅ Browser control (click, type, screenshot)
- ✅ File access (upload/download)
- ✅ Network access (to Google, Supabase)

### **Step 3: Setup Your Accounts**

**Google Drive:**
- Open https://drive.google.com
- Create folder: `/Ozar Chachamim Research/`
- Note the folder ID from URL: `https://drive.google.com/drive/folders/{FOLDER_ID}`
- Store in `.env`: `GOOGLE_DRIVE_FOLDER_ID={FOLDER_ID}`

**Supabase:**
- Already configured in `config.js`
- Keep browser tab open or bookmark: `https://your-project.supabase.co/`

---

## 🤖 Agent-Based Workflow

### **What is an Agent?**

An agent is a Claude process that:
1. **Understands goals** — You say "Sync research"
2. **Makes plans** — Agent decides steps (Plan Mode)
3. **Executes autonomously** — Delegates to Claude in Chrome
4. **Recovers from errors** — Retries, asks for help
5. **Learns from feedback** — Updates CLAUDE.md with lessons

### **Agent vs. Script**

| Aspect | Script | Agent |
|--------|--------|-------|
| **Control Flow** | Predetermined | Dynamic (thinks) |
| **Error Recovery** | Try-catch only | Asks human, retries |
| **Complexity** | Simple task | Multi-step, uncertain |
| **Adaptability** | Fixed logic | Learns & adapts |
| **Time** | Predictable | Variable |

**For Ozar Chachamim:** Agent is **better** because enrichment can vary (different file types, sage names, document structures).

---

## 📁 Files Created (Session 4, Option B+C)

### **New Files**

1. **`agent-enrichment.js`** (~500 lines)
   - Main agent orchestrator
   - Uses Claude in Chrome tools
   - Plan Mode → Execute → Learn
   - Callable: `npm run agent:enrich` or `claude run agent-enrichment.js`

2. **`CLAUDE_IN_CHROME_SETUP.md`** (this file)
   - Integration guide
   - Permissions & setup
   - Troubleshooting

3. **Updated `package.json`**
   - New scripts: `agent:enrich`, `agent:plan`, `agent:interactive`

4. **Updated `PROJECT_CLAUDE.md`**
   - Session 4 plans documented
   - Agent architecture added

---

## 🚀 Usage Patterns

### **Pattern 1: Guided Manual Run (Safest)**

```bash
# Start interactive agent
npm run agent:interactive

# Agent will ask you:
# 1. "Sync from Google Drive?" (Y/N)
# 2. "How many files?" (number)
# 3. "Auto-create connections?" (Y/N)
# 4. Review plan before executing

# Agent executes step-by-step
# You can approve each step
```

### **Pattern 2: Autonomous Run**

```bash
# Agent in auto-pilot mode
npm run agent:enrich

# Agent will:
# 1. Read CLAUDE.md for context
# 2. Check Google Drive for new files
# 3. Process each file (extract → enrich → log)
# 4. Update CLAUDE.md with results
# 5. Return summary

# No approval needed (trusted after first run)
```

### **Pattern 3: Plan-Only Mode**

```bash
# Agent creates plan but doesn't execute
npm run agent:plan

# Output:
# PLAN (not executed):
# Step 1: Navigate to Google Drive
# Step 2: List files in /Ozar Chachamim Research/
# Step 3: Filter new files (not in audit_log)
# Step 4: For each file:
#   - Download file
#   - Extract sage data
#   - Find sage in Supabase
#   - Enrich database
#   - Create connections
# Step 5: Log results
# 
# Approve this plan? (Y/N)
```

---

## 💻 Agent Code Structure

### **agent-enrichment.js Overview**

```javascript
class OzarEnrichmentAgent {
  // 1. INITIALIZATION
  async initialize() {
    // Read CLAUDE.md
    // Load context (323 sages, schema, rules)
    // Verify Supabase connection
    // List browser tabs
  }

  // 2. PLANNING (Plan Mode)
  async makePlan(goal, constraints) {
    // Goal: "Sync research from Google Drive"
    // Constraints: "Max 20 files, only .docx"
    // Output: Step-by-step plan
  }

  // 3. EXECUTION
  async executeStep(step) {
    // Navigate to Google Drive (Claude in Chrome)
    // OR Fill Supabase form (Claude in Chrome)
    // OR Extract file (Claude in Chrome)
    // Verify success
  }

  // 4. LEARNING & LOGGING
  async learnAndLog(results) {
    // Update CLAUDE.md with new insights
    // Add lessons to MEMORY.md
    // Log to audit_log
  }
}
```

### **Available Claude in Chrome Tools**

In `agent-enrichment.js`, you can use:

```javascript
// Navigation
await mcp__Claude_in_Chrome__navigate('https://drive.google.com');

// Get page content
const text = await mcp__Claude_in_Chrome__get_page_text();

// Take screenshot
const screenshot = await mcp__Claude_in_Chrome__screenshot();

// Find element & interact
await mcp__Claude_in_Chrome__find('button:contains("Download")');
await mcp__Claude_in_Chrome__left_click(); // Click element

// Type into form
await mcp__Claude_in_Chrome__form_input('#sage-name', 'Rabbi Meir');

// Upload file
await mcp__Claude_in_Chrome__file_upload('input[type="file"]', './data/rambam.docx');

// Execute JavaScript
const result = await mcp__Claude_in_Chrome__javascript_tool('return document.title');
```

---

## 🔒 Security & Best Practices

### **Permissions Management**

✅ **Safe:**
- Claude in Chrome can see anything on your screen
- Approve permissions once per session
- All actions logged to audit_log

⚠️ **Be Careful:**
- Don't run agent while working on sensitive docs
- Close password managers before agent runs
- Don't store credentials in browser

### **Plan Mode (Recommended)**

Always use Plan Mode first:
```bash
npm run agent:plan
# Review plan
# Press "Y" to execute
# Agent runs with your approval
```

**Why?**
- You see exactly what agent will do
- You can modify/reject plan
- Safer than fully autonomous

---

## 🧪 Testing

### **Test 1: Basic Navigation**

```bash
# Can Claude in Chrome navigate?
npm run agent:test:navigate

# Expected output:
# ✅ Navigated to Google Drive
# ✅ Found "My Drive" sidebar
# ✅ Screenshot captured
```

### **Test 2: Google Drive Integration**

```bash
# Can agent find research files?
npm run agent:test:drive

# Expected output:
# ✅ Folder found: /Ozar Chachamim Research/
# ✅ 12 files detected
# ✅ File types: docx (8), txt (3), pdf (1)
```

### **Test 3: Supabase Integration**

```bash
# Can agent interact with Supabase?
npm run agent:test:supabase

# Expected output:
# ✅ Navigated to Supabase dashboard
# ✅ Found sages table (323 rows)
# ✅ Found audit_log table
```

### **Test 4: Full Enrichment (Single File)**

```bash
# End-to-end test with 1 file
npm run agent:test:enrich

# Expected output:
# ✅ Downloaded file: rambam-research.docx
# ✅ Extracted data: {bio: "...", works: [...]}
# ✅ Found sage: Rambam — רמב״ם (ID: 12)
# ✅ Updated Supabase: 3 fields modified
# ✅ Created connections: 2
# ✅ Logged to audit_log
```

---

## 📊 Monitoring Agent Activity

### **View Agent Logs**

```bash
# View last 50 lines
tail -50 logs/agent.log

# View real-time
tail -f logs/agent.log

# Search for errors
grep "ERROR" logs/agent.log

# View by timestamp
grep "2026-06-05" logs/agent.log
```

### **View CLAUDE.md Updates**

Agent auto-updates `CLAUDE.md` after each run:

```bash
# See what changed
git diff CLAUDE.md

# View recent updates
head -200 CLAUDE.md
```

### **View Audit Trail**

In Supabase:
```sql
SELECT * FROM audit_log
WHERE action LIKE 'agent%'
ORDER BY timestamp DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Claude in Chrome not found" | Extension not installed | Install from Chrome Web Store |
| "Permission denied" | Didn't grant permissions | Click "Allow" in approval dialog |
| "Can't find Google Drive files" | Wrong folder ID | Check `GOOGLE_DRIVE_FOLDER_ID` in `.env` |
| "Supabase form fill fails" | Field selector wrong | Update form_input selector in agent |
| "Agent crashes mid-run" | Browser tab closed | Keep tabs open, or agent will reopen |
| "Too many API calls" | Rate limiting | Add `--delay=1000` flag (1s between files) |

---

## 🎯 Comparison: Methods for Syncing Research

| Method | Speed | Reliability | Cost | Setup |
|--------|-------|-------------|------|-------|
| **Local file watch** | ⚡ Fast | ✅ Reliable | Free | ✅ Done |
| **CLI commands** | ⚡ Fast | ✅ Reliable | Free | ✅ Done |
| **Claude in Chrome** | 🐌 Slow | ⚠️ Variable | Free | 🔧 Now |
| **Agent** | 🐌 Slow | ✅ Reliable | Free | 🔧 Now |
| **n8n workflow** | ⚡ Fast | ✅ Reliable | $$ | ❌ Not yet |
| **Vercel Functions** | ⚡ Fast | ✅ Reliable | $ | ❌ Not yet |

**Recommendation:**
- **Now:** Keep `watch:start` + `schedule:start` (fastest)
- **Experiment:** Add `agent:interactive` (learn how agents work)
- **Later:** Consider n8n if you need speed + advanced workflows

---

## 📝 Example Session

### **Goal:** Sync 5 research files from Google Drive

**Step 1: Start agent**
```bash
npm run agent:interactive
```

**Agent response:**
```
🤖 Agent initialized
✅ CLAUDE.md loaded (323 sages, 25 connections)
✅ Supabase connected
✅ Google Drive accessible

Goal: Sync research from Google Drive
Constraints: Interactive mode, max 5 files

PLAN:
1. Navigate to Google Drive
2. Open folder: /Ozar Chachamim Research/
3. Find new files (not in audit_log)
4. For each file (max 5):
   a. Download file
   b. Extract sage data
   c. Find sage in Supabase
   d. Update database
   e. Create connections
   f. Log to audit_log
5. Report results

Approve this plan? (Y/N)
```

**Step 2: User approves**
```
Y
```

**Agent executes:**
```
⏳ Step 1: Navigating to Google Drive...
✅ Opened Google Drive

⏳ Step 2: Opening /Ozar Chachamim Research/...
✅ Found folder (12 files total)

⏳ Step 3: Filtering new files...
✅ 5 new files found (not in audit_log)
   - rambam-research.docx
   - rabbi-meir-bio.txt
   - maimonides-works.docx
   - rashi-commentary.md
   - ramban-philosophy.docx

⏳ Processing file 1/5: rambam-research.docx
  → Downloading...
  → Extracting data...
  → Found: Rambam — רמב״ם (ID: 12)
  → Updated: bio, core_concept, main_works
  → Created: 2 connections (teacher, influence)
  → Logged to audit_log
  ✅ Complete (2.3s)

[... repeat for files 2-5 ...]

✅ ALL FILES PROCESSED

RESULTS:
- Files synced: 5
- Sages enriched: 5
- Connections created: 8
- Duration: 14.2s

UPDATED CLAUDE.md:
- New insight: "maimonides-works.docx has detailed philosophy section"
- Lesson: "File extraction is fast with docx parsing"
- Next time: "Try batch processing with delays"

Save to CLAUDE.md? (Y/N)
```

**Step 3: User confirms**
```
Y
```

**Result:**
```
✅ Session complete!
- CLAUDE.md updated with insights
- audit_log shows all 5 enrichments
- Website refreshes with new data
- Agent learned for next time
```

---

## 🚀 Next Steps

1. **Install Claude in Chrome extension** — Required
2. **Test navigation** — `npm run agent:test:navigate`
3. **Review agent-enrichment.js code** — Understand logic
4. **Run agent:plan** — See what it would do
5. **Run agent:interactive** — Guided execution
6. **Compare results** — Check Supabase for updates

---

**Claude in Chrome is now ready!** 🌐

Your automation stack:
- ✅ Local file watch (instant)
- ✅ Scheduled sync (Sunday 2 AM)
- ✅ CLI commands (manual control)
- 🆕 Claude in Chrome + Agent (intelligent automation)
